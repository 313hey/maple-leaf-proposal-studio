import { ATTRACTION_STORE, database } from './project-store.ts';
import type { Attraction } from './attractions-types.ts';
import {nextAttractionUpdatedAt} from './attraction-sync.ts';
import {cloudEnabled,deleteCloudRecords,loadCloudAttractionDetails,loadCloudAttractionSummaries,loadCloudRecords,saveCloudAttractionIfUnchanged,saveCloudRecords,CloudRecordConflictError,type AttractionCloudSummary} from './cloud-store.ts';

const PENDING_KEY='maple-studio-attractions-pending-v1';
type PendingAttraction={kind:'upsert';id?:string;updatedAt?:string;expectedUpdatedAt?:string|null;item?:Attraction};
export class AttractionCloudSaveError extends Error{
 readonly savedLocally=true;
 constructor(cause:unknown){super(`已保存在本机，但云端同步失败，稍后可重试：${cause instanceof Error?cause.message:String(cause)}`);this.name='AttractionCloudSaveError';}
}
export class AttractionCloudLoadError extends Error{
 readonly cachedItems:Attraction[];
 constructor(cause:unknown,cachedItems:Attraction[]){super(`云端资源读取失败：${cause instanceof Error?cause.message:String(cause)}${cachedItems.length?`；已显示本机缓存的 ${cachedItems.length} 条资源`:''}`);this.name='AttractionCloudLoadError';this.cachedItems=cachedItems;}
}
export class AttractionCloudConflictError extends Error{
 readonly savedLocally=true;
 constructor(){super('已保留本机修改，但云端版本更新得更晚。请重新打开该景点，核对后再保存。');this.name='AttractionCloudConflictError';}
}
export const cachedAttractionsFromError=(error:unknown):Attraction[]|undefined=>error instanceof AttractionCloudLoadError?error.cachedItems:undefined;
function pendingItems():PendingAttraction[]{try{const value=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');return Array.isArray(value)?value.filter((x):x is PendingAttraction=>x?.kind==='upsert'&&(x.item?.id||x.id)):[]}catch{return[]}}
function writePending(items:PendingAttraction[]){localStorage.setItem(PENDING_KEY,JSON.stringify(items));}
function markPending(items:Attraction[],expectedUpdatedAt?:string|null){const pending=new Map(pendingItems().map(x=>[x.item?.id||x.id!,x]));for(const item of items)pending.set(item.id,{kind:'upsert',id:item.id,updatedAt:item.updatedAt,expectedUpdatedAt});writePending([...pending.values()]);}
function markPendingFull(items:Attraction[]){const pending=new Map(pendingItems().map(x=>[x.item?.id||x.id!,x]));for(const item of items)pending.set(item.id,{kind:'upsert',item:structuredClone(item),id:item.id,updatedAt:item.updatedAt});writePending([...pending.values()]);}
function clearPending(ids:string[],updatedAt?:string){const remove=new Set(ids);writePending(pendingItems().filter(x=>!remove.has(x.item?.id||x.id!)||(updatedAt&&x.updatedAt!==updatedAt)));}
export function hasPendingAttraction(id:string):boolean{return pendingItems().some(item=>(item.item?.id||item.id)===id);}

function transact<T>(mode:IDBTransactionMode, work:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(error:Error)=>void)=>void):Promise<T>{
  return database().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(ATTRACTION_STORE,mode);
    work(tx.objectStore(ATTRACTION_STORE),resolve,reject);
    tx.onerror=()=>reject(tx.error||new Error('景点库保存失败'));
    tx.onabort=()=>reject(tx.error||new Error('景点库操作中断'));
  }));
}
export function loadLocalAttractions():Promise<Attraction[]>{return transact('readonly',(store,resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve((request.result as Attraction[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error||new Error('无法读取景点库'));});}
export function loadLocalAttraction(id:string):Promise<Attraction|undefined>{return transact('readonly',(store,resolve,reject)=>{const request=store.get(id);request.onsuccess=()=>resolve(request.result as Attraction|undefined);request.onerror=()=>reject(request.error||new Error('无法读取景点详情'));});}
export async function loadAttractionDetails(ids:string[],refreshCloud=true):Promise<Attraction[]>{
 const local=await loadLocalAttractions(),byId=new Map(local.map(item=>[item.id,item]));
 const requested=cloudEnabled&&refreshCloud?ids:ids.filter(id=>!byId.has(id));
 if(cloudEnabled&&requested.length){const remote=await loadCloudAttractionDetails(requested);await saveAttractionsLocal(remote);for(const item of remote)byId.set(item.id,item);}
 return ids.map(id=>byId.get(id)).filter((item):item is Attraction=>Boolean(item));
}
export async function loadAttractionSummaries():Promise<AttractionCloudSummary[]>{return loadCloudAttractionSummaries();}
export async function loadAttractions():Promise<Attraction[]>{
 if(!cloudEnabled)return loadLocalAttractions();
 const local=await loadLocalAttractions();
 let remote:Attraction[];
 try{remote=await loadCloudRecords<Attraction>('studio_attractions')}catch(error){throw new AttractionCloudLoadError(error,local)}
 try{await retryPendingAttractions()}catch{/* retain local edits and report only through explicit sync actions */}
 const pending=pendingItems();
 const merged=new Map(remote.map(item=>[item.id,item]));
 for(const item of local){const cloud=merged.get(item.id);if(!cloud||item.updatedAt>cloud.updatedAt)merged.set(item.id,item);}
 // Keep this tab's latest local draft visible even if its retry just succeeded;
 // the first remote snapshot was taken before that retry.
 for(const queued of pending){const item=queued.item||local.find(candidate=>candidate.id===queued.id);if(item)merged.set(item.id,item)}
 const items=[...merged.values()];
 await saveAttractionsLocal(items);
 return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
function saveAttractionsLocal(items:Attraction[]):Promise<void>{return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const item of items)store.put(item);tx.oncomplete=()=>resolve();});}
export async function saveAttraction(item:Attraction,expectedUpdatedAt:string|null=null):Promise<'cloud'|'local'>{
 const updatedAt=nextAttractionUpdatedAt(expectedUpdatedAt,item.updatedAt);
 const updated={...item,updatedAt};await saveAttractionsLocal([updated]);if(!cloudEnabled)return'local';
 try{await saveCloudAttractionIfUnchanged(updated,expectedUpdatedAt);clearPending([updated.id]);return'cloud'}
 catch(error){if(error instanceof CloudRecordConflictError)throw new AttractionCloudConflictError();markPending([updated],expectedUpdatedAt);throw new AttractionCloudSaveError(error)}
}
export async function saveAttractions(items:Attraction[]):Promise<'cloud'|'local'>{await saveAttractionsLocal(items);if(!cloudEnabled)return'local';markPendingFull(items);try{await saveCloudRecords('studio_attractions',items);clearPending(items.map(item=>item.id));return'cloud'}catch(error){throw new AttractionCloudSaveError(error)}}
export async function deleteAttractions(ids:string[]):Promise<void>{if(cloudEnabled)await deleteCloudRecords('studio_attractions',ids);return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const id of ids)store.delete(id);tx.oncomplete=()=>resolve();});}
export async function deleteLocalAttraction(id:string):Promise<void>{return transact('readwrite',(store,resolve)=>{const tx=store.transaction;store.delete(id);tx.oncomplete=()=>resolve();});}
export async function retryPendingAttractions():Promise<void>{
 if(!cloudEnabled)return;
 let hasConflict=false;
 for(const queued of pendingItems()){
  const item=queued.item||await loadLocalAttraction(queued.id||'');if(!item||queued.updatedAt&&item.updatedAt!==queued.updatedAt)continue;
  try{
   if(queued.item)await saveCloudRecords('studio_attractions',[item]);
   else await saveCloudAttractionIfUnchanged(item,queued.expectedUpdatedAt??null);
   clearPending([item.id],queued.updatedAt);
  }catch(error){if(error instanceof CloudRecordConflictError){hasConflict=true;continue}throw error;}
 }
 if(hasConflict)throw new AttractionCloudConflictError();
}
export async function backupAttractions():Promise<Blob>{const items=await loadAttractions();return new Blob([JSON.stringify({format:'maple-leaf-attractions',version:1,createdAt:new Date().toISOString(),items},null,2)],{type:'application/json'});}
export async function restoreAttractions(file:File):Promise<{count:number;status:'cloud'|'local'}>{
  const raw=JSON.parse(await file.text());
  if(raw?.format!=='maple-leaf-attractions'||!Array.isArray(raw.items))throw new Error('备份文件格式不正确');
  for(const item of raw.items)if(!item.id||!Array.isArray(item.images)||typeof item.nameEn!=='string')throw new Error('备份内容缺少必要字段');
  const status=await saveAttractions(raw.items);
  return {count:raw.items.length,status};
}
