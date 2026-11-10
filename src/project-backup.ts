import type {ProjectData} from './project-store';
import {validPresentation} from './attraction-layout.ts';
export type ConflictPolicy='copy'|'skip'|'replace';
const string=(v:unknown)=>typeof v==='string';
export function parseProjectBackup(text:string):ProjectData[]{
 const raw=JSON.parse(text);if(raw?.format!=='maple-leaf-projects'||raw.version!==1||!Array.isArray(raw.projects)||!raw.projects.length)throw new Error('不是有效的项目完整备份。');
 const unsafe=(v:unknown):boolean=>!!v&&typeof v==='object'&&Object.entries(v).some(([k,value])=>['__proto__','constructor','prototype'].includes(k)||unsafe(value));if(unsafe(raw))throw new Error('备份包含无效字段。');
 const ids=new Set<string>();
 for(const p of raw.projects){
 if(!p||!['id','name','createdAt','updatedAt','title','subtitle','summary','destination','audience','overviewHeadline','learningIntent','overviewImage','featureValue','featureLabel','coverImage','fee','currency','groupSize','groupSizeZh','startDate'].every(k=>string(p[k]))||!p.id||ids.has(p.id))throw new Error('项目字段缺失、格式错误或 ID 重复。');ids.add(p.id);
 if(['sectionOrder','hiddenSections'].some(k=>p[k]!==undefined&&(!Array.isArray(p[k])||!p[k].every(string)))||(p.programmeType!==undefined&&!string(p.programmeType)))throw new Error('Invalid project section settings');
 const day=(d:Record<string,unknown>)=>d&&['title','morning','afternoon','evening'].every(k=>string(d[k]))&&['city','notes','date','breakfast','lunch','dinner','image','imageSource'].every(k=>d[k]===undefined||string(d[k]))&&(d.layout===undefined||['auto','editorial','compact','school'].includes(String(d.layout)))&&(d.hideImage===undefined||typeof d.hideImage==='boolean');
 if(!Array.isArray(p.days)||!p.days.length||p.days.length>90||!p.days.every(day)||!Number.isInteger(p.nights)||p.nights<0||p.nights>p.days.length||typeof p.showDates!=='boolean'||!['en','zh'].includes(p.pricingLanguage))throw new Error('行程、晚数或语言字段无效。');
 if(p.archivedDays===undefined)p.archivedDays=structuredClone(p.days);if(!Array.isArray(p.archivedDays)||!p.archivedDays.every(day))throw new Error('归档行程无效。');
 if(!Array.isArray(p.highlights)||!p.highlights.every((h:Record<string,unknown>)=>h&&['num','title','text'].every(k=>string(h[k]))&&(h.image===undefined||string(h.image))))throw new Error('项目亮点无效。');
 if(!p.sampleClass||!string(p.sampleClass.title)||!Array.isArray(p.sampleClass.notes)||!p.sampleClass.notes.every(string)||!Array.isArray(p.sampleClass.rows)||!p.sampleClass.rows.every((r:Record<string,unknown>)=>r&&string(r.time)&&Array.isArray(r.cells)&&r.cells.every(string)))throw new Error('示例课程表无效。');
 if(p.sampleClass.columns!==undefined&&(!Array.isArray(p.sampleClass.columns)||p.sampleClass.columns.length<1||p.sampleClass.columns.length>7||!p.sampleClass.columns.every(string)))throw new Error('课程列设置无效。');
 if(!p.clauses||!['notes','included','excluded'].every(k=>Array.isArray(p.clauses[k])&&p.clauses[k].every((c:Record<string,unknown>)=>c&&['id','en','zh'].every(key=>string(c[key])))))throw new Error('报价条款无效。');
 if(p.attractions!==undefined&&(!Array.isArray(p.attractions)||!p.attractions.every((a:Record<string,unknown>)=>a&&['id','nameEn','nameZh','city','country','category','descriptionZh','descriptionEn','learningZh','learningEn','createdAt','updatedAt'].every(k=>string(a[k]))&&Array.isArray(a.images)&&a.images.every(string)&&Array.isArray(a.tags)&&a.tags.every(string)&&Number.isInteger(a.coverIndex)&&validPresentation(a.presentation))))throw new Error('项目景点资料无效。');
 }
 return raw.projects;
}
export function planRestore(incoming:ProjectData[],existing:ProjectData[],policy:ConflictPolicy):ProjectData[]{
 const ids=new Set(existing.map(p=>p.id));const names=new Set(existing.map(p=>p.name));const now=new Date().toISOString();return incoming.flatMap(source=>{
 const p=structuredClone(source);if((ids.has(p.id)||names.has(p.name))&&policy==='skip')return [];
 if(policy==='copy'){p.id=crypto.randomUUID();p.name=`${p.name} 恢复副本`;p.createdAt=now;}
 // Replace is explicit and ID-based; a matching name alone never overwrites a different ID.
 p.updatedAt=now;return [p];});
}
export async function makeProjectBackup(projects:ProjectData[]):Promise<Blob>{
 const copies=structuredClone(projects);const cache=new Map<string,string>();
 const embed=async(src:string)=>{if(!src||src.startsWith('data:'))return src;if(cache.has(src))return cache.get(src)!;
 const response=await fetch(src);if(!response.ok)throw new Error('图片无法读取，备份未生成，请检查网络或重新上传图片。');const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error('图片格式无效，备份未生成。');const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('图片读取失败'));r.readAsDataURL(blob)});cache.set(src,data);return data;};
 for(const p of copies){p.coverImage=await embed(p.coverImage);p.overviewImage=await embed(p.overviewImage);for(const h of p.highlights)if(h.image)h.image=await embed(h.image);for(const d of [...p.days,...p.archivedDays])if(d.image)d.image=await embed(d.image);for(const a of p.attractions||[])a.images=await Promise.all(a.images.map(embed));}
 return new Blob([JSON.stringify({format:'maple-leaf-projects',version:1,createdAt:new Date().toISOString(),projects:copies})],{type:'application/json'});
}
