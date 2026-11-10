export type ClassRow={time:string;cells:string[];fullSpan?:boolean};
export type SampleClassData={title:string;notes:string[];rows:ClassRow[];columns?:string[]};
export const DEFAULT_CLASS_COLUMNS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
export const MAX_CLASS_COLUMNS=7;
export const classColumns=(data:SampleClassData):string[]=>data.columns===undefined?[...DEFAULT_CLASS_COLUMNS]:[...data.columns];
export const hasClassContent=(data:SampleClassData)=>[data.title,...data.notes,...data.rows.flatMap(row=>[row.time,...row.cells])].some(value=>value.trim());
export function classTimeWarnings(data:SampleClassData):string[]{
 const range=(text:string)=>{const m=text.trim().match(/^(\d{1,2}):(\d{2})\s*[–—\-~至]\s*(\d{1,2}):(\d{2})$/);if(!m)return null;const [h,mn,h2,mn2]=m.slice(1).map(Number);if(h>23||h2>23||mn>59||mn2>59)return null;const start=h*60+mn,end=h2*60+mn2;return end>start?{start,end}:null};
 const warnings:string[]=[];data.rows.forEach((row,i)=>{const a=range(row.time);if(!a)return;data.rows.slice(i+1).forEach((other,j)=>{const b=range(other.time);if(b&&a.start<b.end&&b.start<a.end)warnings.push(`时段 ${i+1}（${row.time}）与时段 ${i+j+2}（${other.time}）重叠，请核对。`)})});return warnings;
}
export function isSampleClassData(value:unknown):value is SampleClassData{
 if(!value||typeof value!=='object')return false;const d=value as SampleClassData;
 return typeof d.title==='string'&&Array.isArray(d.notes)&&d.notes.every(n=>typeof n==='string')&&Array.isArray(d.rows)&&d.rows.every(r=>r&&typeof r.time==='string'&&Array.isArray(r.cells)&&r.cells.every(c=>typeof c==='string')&&(r.fullSpan===undefined||typeof r.fullSpan==='boolean'))&&(d.columns===undefined||(Array.isArray(d.columns)&&d.columns.length>0&&d.columns.length<=MAX_CLASS_COLUMNS&&d.columns.every(c=>typeof c==='string')));
}
function validIndex(data:SampleClassData,index:number){if(!Number.isInteger(index)||index<0||index>=classColumns(data).length)throw new Error('课程列不存在。')}
export function addClassColumn(data:SampleClassData):SampleClassData{
 const columns=classColumns(data);if(columns.length>=MAX_CLASS_COLUMNS)throw new Error('最多支持七列课程。');
 // A new date is unconfirmed, even when existing dates share one merged course.
 return {...data,columns:[...columns,`Day ${columns.length+1}`],rows:data.rows.map(row=>({...row,fullSpan:false,cells:[...Array.from({length:columns.length},(_,i)=>row.fullSpan?row.cells[0]||'':row.cells[i]||''),'']}))};
}
export function removeClassColumn(data:SampleClassData,index:number):SampleClassData{
 validIndex(data,index);const columns=classColumns(data);if(columns.length===1)throw new Error('至少保留一列课程。');
 return {...data,columns:columns.filter((_,i)=>i!==index),rows:data.rows.map(row=>({...row,cells:row.fullSpan?[...row.cells]:Array.from({length:columns.length},(_,i)=>row.cells[i]||'').filter((_,i)=>i!==index)}))};
}
export function moveClassColumn(data:SampleClassData,index:number,delta:number):SampleClassData{
 validIndex(data,index);validIndex(data,index+delta);const columns=classColumns(data);[columns[index],columns[index+delta]]=[columns[index+delta],columns[index]];
 return {...data,columns,rows:data.rows.map(row=>{const cells=Array.from({length:columns.length},(_,i)=>row.cells[i]||'');if(!row.fullSpan)[cells[index],cells[index+delta]]=[cells[index+delta],cells[index]];return {...row,cells:row.fullSpan?[...row.cells]:cells}})};
}
export function copyClassDay(data:SampleClassData,source:number,target:number):SampleClassData{
 validIndex(data,source);validIndex(data,target);if(source===target)return data;
 return {...data,rows:data.rows.map(row=>{if(row.fullSpan)return {...row,cells:[...row.cells]};const cells=Array.from({length:classColumns(data).length},(_,i)=>row.cells[i]||'');cells[target]=cells[source];return {...row,cells}})};
}
export function duplicateClassRow(data:SampleClassData,index:number):SampleClassData{
 if(!data.rows[index])throw new Error('课程时段不存在。');const rows=[...data.rows];rows.splice(index+1,0,structuredClone(rows[index]));return {...data,rows};
}
export function copyPreviousClassRow(data:SampleClassData,index:number):SampleClassData{
 if(index<1||!data.rows[index])throw new Error('没有上一行课程。');const previous=data.rows[index-1];return {...data,rows:data.rows.map((row,i)=>i===index?{...row,cells:[...previous.cells],fullSpan:previous.fullSpan}:row)};
}
