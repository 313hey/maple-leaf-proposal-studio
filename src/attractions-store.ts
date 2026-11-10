import { ATTRACTION_STORE, database } from './project-store.ts';
import type { Attraction } from './attractions-types.ts';

function transact<T>(mode:IDBTransactionMode, work:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(error:Error)=>void)=>void):Promise<T>{
  return database().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(ATTRACTION_STORE,mode);
    work(tx.objectStore(ATTRACTION_STORE),resolve,reject);
    tx.onerror=()=>reject(tx.error||new Error('景点库保存失败'));
    tx.onabort=()=>reject(tx.error||new Error('景点库操作中断'));
  }));
}
export function loadAttractions():Promise<Attraction[]>{return transact('readonly',(store,resolve,reject)=>{const request=store.getAll();request.onsuccess=()=>resolve((request.result as Attraction[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error||new Error('无法读取景点库'));});}
export function saveAttraction(item:Attraction):Promise<void>{return transact('readwrite',(store,resolve)=>{store.put({...item,updatedAt:new Date().toISOString()});store.transaction.oncomplete=()=>resolve();});}
export function saveAttractions(items:Attraction[]):Promise<void>{return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const item of items)store.put(item);tx.oncomplete=()=>resolve();});}
export function deleteAttractions(ids:string[]):Promise<void>{return transact('readwrite',(store,resolve)=>{const tx=store.transaction;for(const id of ids)store.delete(id);tx.oncomplete=()=>resolve();});}
export async function backupAttractions():Promise<Blob>{const items=await loadAttractions();return new Blob([JSON.stringify({format:'maple-leaf-attractions',version:1,createdAt:new Date().toISOString(),items},null,2)],{type:'application/json'});}
export async function restoreAttractions(file:File):Promise<number>{
  const raw=JSON.parse(await file.text());
  if(raw?.format!=='maple-leaf-attractions'||!Array.isArray(raw.items))throw new Error('备份文件格式不正确');
  for(const item of raw.items)if(!item.id||!Array.isArray(item.images)||typeof item.nameEn!=='string')throw new Error('备份内容缺少必要字段');
  await saveAttractions(raw.items);
  return raw.items.length;
}
