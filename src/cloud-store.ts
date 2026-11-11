import {createClient} from '@supabase/supabase-js';

type CloudRecord={id:string;payload:unknown;updated_at:string};
type CloudTable='studio_projects'|'studio_attractions'|'studio_class_templates';
const env=import.meta.env ?? {};
const url=env.VITE_SUPABASE_URL?.trim()||'';
const key=env.VITE_SUPABASE_ANON_KEY?.trim()||'';
export const cloudEnabled=Boolean(url&&key);
const MIGRATION_KEY='maple-studio-cloud-migration-v1-complete';
export const cloudMigrationComplete=()=>localStorage.getItem(MIGRATION_KEY)==='yes';
export const markCloudMigrationComplete=()=>localStorage.setItem(MIGRATION_KEY,'yes');
const client=cloudEnabled?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;

function requireClient(){if(!client)throw new Error('云端存储尚未连接。请配置 Supabase 项目后重新部署。');return client;}
export async function loadCloudRecords<T>(table:CloudTable):Promise<T[]>{
 const {data,error}=await requireClient().from(table).select('id,payload,updated_at').order('updated_at',{ascending:false});
 if(error)throw new Error(`读取云端${table}失败：${error.message}`);
 return ((data||[]) as CloudRecord[]).map(row=>row.payload as T);
}
export async function loadCloudRecordIds(table:CloudTable):Promise<string[]>{const {data,error}=await requireClient().from(table).select('id');if(error)throw new Error(`检查云端数据失败：${error.message}`);return (data||[]).map((row:{id:string})=>row.id);}
export async function saveCloudRecords<T extends {id:string;updatedAt?:string;createdAt?:string}>(table:CloudTable,items:T[]):Promise<void>{
 if(!items.length)return;
 const rows=items.map(item=>({id:item.id,payload:item,updated_at:item.updatedAt||new Date().toISOString()}));
 const {error}=await requireClient().from(table).upsert(rows,{onConflict:'id'});
 if(error)throw new Error(`保存至云端失败：${error.message}`);
}
export async function deleteCloudRecords(table:CloudTable,ids:string[]):Promise<void>{
 if(!ids.length)return;
 const {error}=await requireClient().from(table).delete().in('id',ids);
 if(error)throw new Error(`删除云端记录失败：${error.message}`);
}
export function subscribeCloudTable(table:CloudTable,onChange:()=>void):()=>void{
 if(!client)return()=>{};
 const channel=client.channel(`maple-studio-${table}-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table},onChange).subscribe();
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
