import {createClient} from '@supabase/supabase-js';
import type {Attraction} from './attractions-types.ts';

type CloudRecord={id:string;payload:unknown;updated_at:string};
type CloudTable='studio_projects'|'studio_attractions'|'studio_class_templates';
export type AttractionCloudSummary={id:string;updatedAt:string;nameEn:string;nameZh:string;city:string;category:string;tags:string[];aliases:string[]};
export type CloudTableChange={eventType:'INSERT'|'UPDATE'|'DELETE';new?:CloudRecord;old?:{id?:string}};
const env=import.meta.env ?? {};
const url=env.VITE_SUPABASE_URL?.trim()||'';
const key=env.VITE_SUPABASE_ANON_KEY?.trim()||'';
export const cloudEnabled=Boolean(url&&key);
const MIGRATION_KEY='maple-studio-cloud-migration-v1-complete';
export const cloudMigrationComplete=()=>localStorage.getItem(MIGRATION_KEY)==='yes';
export const markCloudMigrationComplete=()=>localStorage.setItem(MIGRATION_KEY,'yes');
const client=cloudEnabled?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;

function requireClient(){if(!client)throw new Error('云端存储尚未连接。请配置 Supabase 项目后重新部署。');return client;}
async function retryCloudQuery<T>(operation:()=>PromiseLike<{data:T|null;error:{message?:string}|null}>,label:string,attempts=3):Promise<T>{
 let last:unknown;
 for(let attempt=0;attempt<attempts;attempt++){
  try{const {data,error}=await operation();if(!error)return data as T;last=new Error(error.message||'云端查询失败');}
  catch(error){last=error}
  const message=last instanceof Error?last.message:String(last);
  if(attempt+1>=attempts||!/(timeout|timed out|fetch failed|temporar|connection reset)/i.test(message))throw new Error(`${label}：${message}`);
  await new Promise(resolve=>setTimeout(resolve,200*(attempt+1)));
 }
 throw new Error(`${label}：${String(last)}`);
}
export async function loadCloudRecords<T>(table:CloudTable):Promise<T[]>{
 const db=requireClient();
 // Attraction records can contain large embedded images. Fetching the whole
 // table in one PostgREST statement can exceed Supabase's statement timeout.
 const {data:keys,error:keyError}=await db.from(table).select('id').order('id',{ascending:true});
 if(keyError)throw new Error(`读取云端${table}失败：${keyError.message}`);
 const ids=((keys||[]) as Array<{id:string}>).map(row=>row.id);
 const rows:CloudRecord[]=[];
 // Keep each response small so large image payloads do not time out.
 // Proposal rows can contain several megabytes of embedded images. Limit the
 // number of large payloads fetched at once to avoid Supabase statement timeouts.
 const pageSize=1,pagesPerBatch=2;
 for(let index=0;index<ids.length;index+=pageSize*pagesPerBatch){
  const pages=Array.from({length:pagesPerBatch},(_,page)=>ids.slice(index+page*pageSize,index+(page+1)*pageSize)).filter(page=>page.length);
  const results=await Promise.all(pages.map(page=>db.from(table).select('id,payload,updated_at').in('id',page)));
  for(const {data,error} of results){
   if(error)throw new Error(`读取云端${table}失败：${error.message}`);
   rows.push(...((data||[]) as CloudRecord[]));
  }
 }
 return rows.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).map(row=>row.payload as T);
}
const attractionSummarySelect='id,updated_at,nameEn:payload->>nameEn,nameZh:payload->>nameZh,city:payload->>city,category:payload->>category,tags:payload->tags,aliases:payload->aliases';
function attractionSummary(row:any):AttractionCloudSummary{return {id:String(row.id),updatedAt:String(row.updated_at||''),nameEn:String(row.nameEn||''),nameZh:String(row.nameZh||''),city:String(row.city||''),category:String(row.category||''),tags:Array.isArray(row.tags)?row.tags.filter((x:unknown)=>typeof x==='string'):[],aliases:Array.isArray(row.aliases)?row.aliases.filter((x:unknown)=>typeof x==='string'):[]};}
let attractionSummaryInFlight:Promise<AttractionCloudSummary[]>|undefined;
export function loadCloudAttractionSummaries():Promise<AttractionCloudSummary[]>{
 if(attractionSummaryInFlight)return attractionSummaryInFlight;
 const request=(async()=>{const db=requireClient(),pageSize=500,all:AttractionCloudSummary[]=[];
  for(let from=0;;from+=pageSize){
   const data=await retryCloudQuery(()=>db.from('studio_attractions').select(attractionSummarySelect).order('id',{ascending:true}).range(from,from+pageSize-1),'读取云端景点摘要失败');
   const rows=(data||[]).map(attractionSummary);all.push(...rows);if(rows.length<pageSize)break;
  }
  return all;
 })();
 attractionSummaryInFlight=request.finally(()=>{attractionSummaryInFlight=undefined});return attractionSummaryInFlight;
}
export async function loadCloudAttractionSummary(id:string):Promise<AttractionCloudSummary|undefined>{
 const data=await retryCloudQuery(()=>requireClient().from('studio_attractions').select(attractionSummarySelect).eq('id',id).maybeSingle(),'读取云端景点摘要失败');return data?attractionSummary(data):undefined;
}
const attractionImageRequests=new Map<string,Promise<string>>();
const attractionImageCache=new Map<string,string>();
export function invalidateCloudAttractionImage(id:string){attractionImageCache.delete(id);}
export async function loadCloudAttractionImage(id:string):Promise<string>{
 if(attractionImageCache.has(id))return attractionImageCache.get(id)!;
 const existing=attractionImageRequests.get(id);if(existing)return existing;
 const request=(async()=>{const data=await retryCloudQuery<{images:unknown;coverIndex:unknown}>(()=>requireClient().from('studio_attractions').select('images:payload->images,coverIndex:payload->>coverIndex').eq('id',id).maybeSingle(),'读取景点图片失败');const images=Array.isArray(data?.images)?data.images:[];const index=Number(data?.coverIndex)||0;return String(images[index]||images[0]||'')})();
 attractionImageRequests.set(id,request);try{const image=await request;attractionImageCache.set(id,image);return image}finally{attractionImageRequests.delete(id)}
}
export async function loadCloudAttractionDetails(ids:string[]):Promise<Attraction[]>{
 // Kept separate from the summary path: callers request full payloads only for selected/opened records.
 if(!ids.length)return [];
 const data=await retryCloudQuery(()=>requireClient().from('studio_attractions').select('id,payload,updated_at').in('id',ids),'读取景点详情失败');
 return ((data||[]) as CloudRecord[]).map(row=>({...row.payload as Attraction,updatedAt:row.updated_at}));
}
export async function loadCloudRecordIds(table:CloudTable):Promise<string[]>{const {data,error}=await requireClient().from(table).select('id');if(error)throw new Error(`检查云端数据失败：${error.message}`);return (data||[]).map((row:{id:string})=>row.id);}
export async function saveCloudRecords<T extends {id:string;updatedAt?:string;createdAt?:string}>(table:CloudTable,items:T[]):Promise<void>{
 if(!items.length)return;
 const rows=items.map(item=>({id:item.id,payload:item,updated_at:item.updatedAt||new Date().toISOString()}));
 const {error}=await requireClient().from(table).upsert(rows,{onConflict:'id'});
 if(error)throw new Error(`保存至云端失败：${error.message}`);
}
export class CloudRecordConflictError extends Error{constructor(){super('云端景点已被其他同事更新，请先重新加载最新内容再保存。');this.name='CloudRecordConflictError';}}
export async function saveCloudAttractionIfUnchanged<T extends {id:string;updatedAt?:string}>(item:T,expectedUpdatedAt:string|null):Promise<void>{
 const db=requireClient(),updatedAt=item.updatedAt||new Date().toISOString(),row={id:item.id,payload:item,updated_at:updatedAt};
 if(expectedUpdatedAt===null){
  const {error}=await db.from('studio_attractions').insert(row);
  if(error){if(error.code==='23505')throw new CloudRecordConflictError();throw new Error(`保存至云端失败：${error.message}`)}
  return;
 }
 const {data,error}=await db.from('studio_attractions').update({payload:item,updated_at:updatedAt}).eq('id',item.id).eq('updated_at',expectedUpdatedAt).select('id');
 if(error)throw new Error(`保存至云端失败：${error.message}`);
 if(!data?.length)throw new CloudRecordConflictError();
}
export async function deleteCloudRecords(table:CloudTable,ids:string[]):Promise<void>{
 if(!ids.length)return;
 const {error}=await requireClient().from(table).delete().in('id',ids);
 if(error)throw new Error(`删除云端记录失败：${error.message}`);
}
export function subscribeCloudTable(table:CloudTable,onChange:(change:CloudTableChange)=>void):()=>void{
 if(!client)return()=>{};
 const channel=client.channel(`maple-studio-${table}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table},(payload:any)=>onChange(payload as CloudTableChange)).subscribe();
 return()=>{void client!.removeChannel(channel)};
}
export async function cloudCounts(){
 const db=requireClient();
 const count=async(table:CloudTable)=>{const {count,error}=await db.from(table).select('id',{count:'exact',head:true});if(error)throw new Error(`检查云端数据失败：${error.message}`);return count||0};
 const [projects,attractions,classTemplates]=await Promise.all([count('studio_projects'),count('studio_attractions'),count('studio_class_templates')]);
 return {projects,attractions,classTemplates};
}
export async function migrateMissingRecords<T extends {id:string;updatedAt?:string;createdAt?:string}>(table:CloudTable,items:T[]):Promise<number>{
 const db=requireClient();const {data,error}=await db.from(table).select('id');
 if(error)throw new Error(`检查云端记录失败：${error.message}`);
 const existing=new Set((data||[]).map((row:{id:string})=>row.id));
 const missing=items.filter(item=>!existing.has(item.id));
 for(let index=0;index<missing.length;index+=5)await saveCloudRecords(table,missing.slice(index,index+5));
 return missing.length;
}
