import {isSampleClassData,type SampleClassData} from './sample-class-data.ts';

export type ClassTemplate={id:string;name:string;city:string;data:SampleClassData;createdAt:string;updatedAt:string};
export function newClassTemplate(name='',city='',data:SampleClassData={title:'',notes:[],rows:[]}):ClassTemplate{
 const now=new Date().toISOString();return {id:crypto.randomUUID(),name,city,data:structuredClone(data),createdAt:now,updatedAt:now};
}
export const classTemplateSnapshot=(template:ClassTemplate)=>structuredClone(template.data);
function validTemplate(value:unknown):value is ClassTemplate{
 if(!value||typeof value!=='object')return false;const t=value as ClassTemplate;
 return ['id','name','city','createdAt','updatedAt'].every(k=>typeof t[k as keyof ClassTemplate]==='string')&&Boolean(t.id.trim()&&t.name.trim())&&isSampleClassData(t.data);
}
let connection:Promise<IDBDatabase>|undefined;
// An independent IndexedDB keeps project and attraction storage unchanged.
function database():Promise<IDBDatabase>{
 if(!connection)connection=new Promise((resolve,reject)=>{const request=indexedDB.open('maple-leaf-class-templates',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('templates',{keyPath:'id'});};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined};resolve(db)};
  request.onerror=()=>{connection=undefined;reject(request.error||new Error('无法打开课表库。'))};
 });return connection;
}
export async function loadClassTemplates():Promise<ClassTemplate[]>{
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('templates');const r=tx.objectStore('templates').getAll();r.onsuccess=()=>resolve((r.result as ClassTemplate[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));r.onerror=()=>reject(r.error||new Error('无法读取课表模板。'));tx.onabort=()=>reject(tx.error||new Error('读取课表库中断。'))});
}
async function write(items:ClassTemplate[],remove?:string):Promise<void>{
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('templates','readwrite');const store=tx.objectStore('templates');if(remove)store.delete(remove);for(const item of items)store.put(structuredClone(item));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('课表库保存失败。'));tx.onabort=()=>reject(tx.error||new Error('课表库保存中断。'))});
}
export async function saveClassTemplate(template:ClassTemplate):Promise<void>{if(!validTemplate(template))throw new Error('请填写模板名称，并检查课程表格式。');await write([{...template,updatedAt:new Date().toISOString()}]);}
export const deleteClassTemplate=(id:string)=>write([],id);
export async function backupClassTemplates():Promise<Blob>{const items=await loadClassTemplates();return new Blob([JSON.stringify({format:'maple-leaf-class-templates',version:1,createdAt:new Date().toISOString(),items},null,2)],{type:'application/json'});}
export function parseClassTemplateBackup(text:string):ClassTemplate[]{
 const raw=JSON.parse(text);const unsafe=(v:unknown):boolean=>Boolean(v&&typeof v==='object'&&Object.entries(v).some(([k,value])=>['__proto__','constructor','prototype'].includes(k)||unsafe(value)));
 if(unsafe(raw)||raw?.format!=='maple-leaf-class-templates'||raw.version!==1||!Array.isArray(raw.items)||!raw.items.every(validTemplate))throw new Error('不是有效的课表模板备份。');
 if(new Set(raw.items.map((t:ClassTemplate)=>t.id)).size!==raw.items.length)throw new Error('备份含有重复模板 ID。');return structuredClone(raw.items);
}
export async function restoreClassTemplates(items:ClassTemplate[],policy:'copy'|'skip'|'replace'):Promise<number>{
 if(!items.every(validTemplate))throw new Error('课表模板格式无效。');const existing=await loadClassTemplates();const ids=new Set(existing.map(t=>t.id));const now=new Date().toISOString();
 const incoming=items.filter(t=>policy!=='skip'||!ids.has(t.id)).map(t=>({...structuredClone(t),...(policy==='copy'?{id:crypto.randomUUID(),name:`${t.name} 恢复副本`,createdAt:now}:{}),updatedAt:now}));await write(incoming);return incoming.length;
}
