import { ATTRACTION_STORE, database } from './project-store.ts';
import type { Attraction } from './attractions-types.ts';
import {cloudEnabled,deleteCloudRecords,loadCloudRecords,saveCloudRecords} from './cloud-store.ts';

const PENDING_KEY='maple-studio-attractions-pending-v1';
type PendingAttraction={kind:'upsert';item:Attraction};
export class AttractionCloudSaveError extends Error{
 readonly savedLocally=true;
 constructor(cause:unknown){super(`已保存在本机，但云端同步失败，稍后可重试：${cause instanceof Error?cause.message:String(cause)}`);this.name='AttractionCloudSaveError';}
}
export class AttractionCloudLoadError extends Error{
 readonly cachedItems:Attraction[];
 constructor(cause:unknown,cachedItems:Attraction[]){super(`云端资源读取失败：${cause instanceof Error?cause.message:String(cause)}${cachedItems.length?`；已显示本机缓存的 ${cachedItems.length} 条资源`:''}`);this.name='AttractionCloudLoadError';this.cachedItems=cachedItems;}
}
export const cachedAttractionsFromError=(error:unknown):Attraction[]|undefined=>error instanceof AttractionCloudLoadError?error.cachedItems:undefined;
function pendingItems():PendingAttraction[]{try{const value=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');return Array.isArray(value)?value.filter((x):x is PendingAttraction=>x?.kind==='upsert'&&x.item?.id):[]}catch{return[]}}
function writePending(items:PendingAttraction[]){localStorage.setItem(PENDING_KEY,JSON.stringify(items));}
function markPending(items:Attraction[]){const pending=new Map(pendingItems().map(x=>[x.item.id,x]));for(const item of items)pending.set(item.id,{kind:'upsert',item:structuredClone(item)});writePending([...pending.values()]);}
function clearPending(ids:string[]){const remove=new Set(ids);writePending(pendingItems().filter(x=>!remove.has(x.item.id)));}

function transact<T>(mode:IDBTransactionMode, work:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(error:Error)=>void)=>void):Promise<T>{
  return database().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(ATTRACTION_STORE,mode);
    work(tx.objectStore(ATTRACTION_STORE),resolve,reject);
    tx.onerror=()=>reject(tx.error||new Error('景点库保存失败'));
    tx.onabort=()=>reject(tx.error||new Error('景点库操作中断'));
  }));
}
export function loadLocalAttractions():Promise<Attraction[]>{return transact('readonly',(store,resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve((request.result as Attraction[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error||new Error('无法读取景点库'));});}
export async function loadAttractions():Promise<Attraction[]>{
 if(!cloudEnabled)return loadLocalAttractions();
 const local=await loadLocalAttractions();
 let remote:Attraction[];
 try{remote=await loadCloudRecords<Attraction>('studio_attractions')}catch(error){throw new AttractionCloudLoadError(error,local)}
 const pending=pendingItems();
 for(let index=0;index<pending.length;index+=5){
  const batch=pending.slice(index,index+5);
  try{await saveCloudRecords('studio_attractions',batch.map(x=>x.item));clearPending(batch.map(x=>x.item.id));}
  catch{/* retain local edits for an explicit retry on the next refresh */}
 }
 const merged=new Map(remote.map(item=>[item.id,item]));
 // Keep this tab's latest local draft visible even if its retry just succeeded;
 // the first remote snapshot was taken before that retry.
 for(const {item} of pending)merged.set(item.id,item);
 const items=[...merged.values()];
 await saveAttractionsLocal(items);
 return items.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
function saveAttractionsLocal(items:Attraction[]):Promise<void>{return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const item of items)store.put(item);tx.oncomplete=()=>resolve();});}
export async function saveAttraction(item:Attraction):Promise<'cloud'|'local'>{const updated={...item,updatedAt:new Date().toISOString()};await saveAttractionsLocal([updated]);if(!cloudEnabled)return'local';markPending([updated]);try{await saveCloudRecords('studio_attractions',[updated]);clearPending([updated.id]);return'cloud'}catch(error){throw new AttractionCloudSaveError(error)}}
export async function saveAttractions(items:Attraction[]):Promise<'cloud'|'local'>{await saveAttractionsLocal(items);if(!cloudEnabled)return'local';markPending(items);try{await saveCloudRecords('studio_attractions',items);clearPending(items.map(item=>item.id));return'cloud'}catch(error){throw new AttractionCloudSaveError(error)}}
export async function deleteAttractions(ids:string[]):Promise<void>{if(cloudEnabled)await deleteCloudRecords('studio_attractions',ids);return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const id of ids)store.delete(id);tx.oncomplete=()=>resolve();});}
export async function backupAttractions():Promise<Blob>{const items=await loadAttractions();return new Blob([JSON.stringify({format:'maple-leaf-attractions',version:1,createdAt:new Date().toISOString(),items},null,2)],{type:'application/json'});}
export async function restoreAttractions(file:File):Promise<{count:number;status:'cloud'|'local'}>{
  const raw=JSON.parse(await file.text());
  if(raw?.format!=='maple-leaf-attractions'||!Array.isArray(raw.items))throw new Error('备份文件格式不正确');
  for(const item of raw.items)if(!item.id||!Array.isArray(item.images)||typeof item.nameEn!=='string')throw new Error('备份内容缺少必要字段');
  const status=await saveAttractions(raw.items);
  return {count:raw.items.length,status};
}
