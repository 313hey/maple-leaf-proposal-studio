import { BrandLogo } from './BrandLogo';
import React,{useState} from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import './sample-class.css';

import {classColumns,addClassColumn,removeClassColumn,moveClassColumn,copyClassDay,duplicateClassRow,copyPreviousClassRow,classTimeWarnings,type ClassRow,type SampleClassData} from './sample-class-data';
export type {ClassRow,SampleClassData} from './sample-class-data';
export {initialSampleClass} from './sample-class-seed';

export function SampleClassEditor({data,onChange,onInsertTemplate,onSaveTemplate}:{data:SampleClassData;onChange:(next:SampleClassData)=>void;onInsertTemplate?:()=>void;onSaveTemplate?:()=>void}) {
  const empty=data.rows.length===0&&Boolean(onInsertTemplate),warnings=classTimeWarnings(data);
  const columns=classColumns(data),[source,setSource]=useState(0),[target,setTarget]=useState(1);
  const safeSource=Math.min(source,columns.length-1),safeTarget=Math.min(target,columns.length-1);
  const updateRow=(index:number,patch:Partial<ClassRow>)=>onChange({...data,rows:data.rows.map((row,i)=>i===index?{...row,...patch}:row)});
  const moveRow=(index:number,delta:number)=>{const next=index+delta;if(next<0||next>=data.rows.length)return;const rows=[...data.rows];[rows[index],rows[next]]=[rows[next],rows[index]];onChange({...data,rows})};
  const copyDay=()=>{const overwritten=data.rows.some(row=>!row.fullSpan&&row.cells[safeTarget]?.trim()&&row.cells[safeTarget]!==row.cells[safeSource]);if(overwritten&&!window.confirm('目标列已有课程，确认用来源列覆盖？时间和其他列保持不变。'))return;onChange(copyClassDay(data,safeSource,safeTarget));};
  return <div className="sample-class-editor">
    {onInsertTemplate&&<div className="class-template-actions"><button className="primary" onClick={onInsertTemplate}>从课表库插入</button>{onSaveTemplate&&<button aria-label="保存为课表模板" onClick={onSaveTemplate}>保存为模板</button>}</div>}
    {warnings.length>0&&<div className="class-time-warning" role="status">{warnings.map(w=><p key={w}>{w}</p>)}<small>仅提示核对，不自动修改时间。</small></div>}
    {empty?<div className="class-editor-empty"><h3>尚未添加课程表</h3><p>你可以从模板库选择，或手动创建。</p><div><button onClick={onInsertTemplate}>选择已有模板</button><button onClick={()=>onChange({...data,rows:[{time:'',cells:Array(columns.length).fill('')}]})}>创建空白课表</button></div></div>:<>
    <label className="field-label">页面标题</label><input className="line-input" aria-label="课表页面标题" value={data.title} onChange={e=>onChange({...data,title:e.target.value})}/>
    <details className="advanced-options class-column-settings"><summary>星期与列设置 · {columns.length} 列</summary><p className="helper">最多 7 列，可使用星期、日期或自定义名称；新增列为空。</p>{columns.map((label,i)=><div className="class-column-config" key={i}><input aria-label={`课程列 ${i+1} 名称`} maxLength={40} value={label} onChange={e=>onChange({...data,columns:columns.map((name,n)=>n===i?e.target.value:name)})}/><button aria-label={`左移课程列 ${i+1}`} disabled={i===0} onClick={()=>onChange(moveClassColumn(data,i,-1))}>←</button><button aria-label={`右移课程列 ${i+1}`} disabled={i===columns.length-1} onClick={()=>onChange(moveClassColumn(data,i,1))}>→</button><button aria-label={`删除课程列 ${i+1}`} disabled={columns.length===1} onClick={()=>{if(data.rows.some(row=>!row.fullSpan&&row.cells[i]?.trim())&&!window.confirm('此列已有课程，删除后将移除该列课程。是否继续？'))return;onChange(removeClassColumn(data,i))}}><Trash2 size={13}/></button></div>)}<button className="class-add" disabled={columns.length>=7} onClick={()=>onChange(addClassColumn(data))}><Plus size={14}/> 添加课程列</button></details>
    <details className="advanced-options class-copy-day"><summary>复制一天课程</summary><div><label>来源<select aria-label="复制课程来源列" value={safeSource} onChange={e=>setSource(Number(e.target.value))}>{columns.map((name,i)=><option key={i} value={i}>{name||`列 ${i+1}`}</option>)}</select></label><span>→</span><label>目标<select aria-label="复制课程目标列" value={safeTarget} onChange={e=>setTarget(Number(e.target.value))}>{columns.map((name,i)=><option key={i} value={i}>{name||`列 ${i+1}`}</option>)}</select></label><button disabled={safeSource===safeTarget||!data.rows.length} onClick={copyDay}>复制课程</button></div></details>
    {data.rows.map((row,index)=><div className="class-row-editor" key={index}>
      <div className="class-row-tools"><strong>时段 {String(index+1).padStart(2,'0')}</strong><div><button aria-label={`复制时段 ${index+1}`} title="复制此时段" onClick={()=>onChange(duplicateClassRow(data,index))}><Copy size={14}/></button><details className="class-row-menu" onClick={e=>{if((e.target as HTMLElement).closest('button'))e.currentTarget.open=false}}><summary aria-label={`时段 ${index+1} 更多操作`}><MoreHorizontal size={16}/></summary><div><button disabled={index===0} onClick={()=>{if(row.cells.some(c=>c.trim())&&!window.confirm('确认沿用上一行课程？当前时段的时间保持不变。'))return;onChange(copyPreviousClassRow(data,index))}}>沿用上一行课程</button><button disabled={index===0} onClick={()=>moveRow(index,-1)}>上移时段</button><button disabled={index===data.rows.length-1} onClick={()=>moveRow(index,1)}>下移时段</button><button onClick={()=>{if(row.cells.some(c=>c.trim())&&!window.confirm('删除此时段及课程？'))return;onChange({...data,rows:data.rows.filter((_,i)=>i!==index)})}}>删除时段</button></div></details></div></div>
      <div className="class-time-line"><input aria-label={`时段 ${index+1} 时间`} value={row.time} onChange={e=>updateRow(index,{time:e.target.value})}/><label><input type="checkbox" checked={Boolean(row.fullSpan)} onChange={e=>{if(e.target.checked&&row.cells.some(c=>c.trim()&&c!==row.cells[0])&&!window.confirm('将使用第一列课程统一所有日期，确认继续？'))return;updateRow(index,{fullSpan:e.target.checked,cells:e.target.checked?[row.cells[0]||'']:Array.from({length:columns.length},()=>row.cells[0]||'')})}}/> 所有日期相同</label></div>
      {row.fullSpan?<input className="class-cell-full" aria-label={`时段 ${index+1} 课程`} value={row.cells[0]||''} onChange={e=>updateRow(index,{cells:[e.target.value]})}/>:<div className="class-cell-grid" style={{gridTemplateColumns:`repeat(${columns.length},minmax(80px,1fr))`}}>{columns.map((day,dayIndex)=><label key={dayIndex}><span>{day||`列 ${dayIndex+1}`}</span><input aria-label={`时段 ${index+1} ${day||`列 ${dayIndex+1}`}`} value={row.cells[dayIndex]||''} onChange={e=>updateRow(index,{cells:Array.from({length:columns.length},(_,i)=>i===dayIndex?e.target.value:row.cells[i]||'')})}/></label>)}</div>}
    </div>)}
    <div className="class-bottom-actions"><button className="class-add" onClick={()=>onChange({...data,rows:[...data.rows,{time:'',cells:Array(columns.length).fill('')}]})}><Plus size={15}/> 增加时段</button><details className="advanced-options class-notes-settings"><summary>课表说明 · {data.notes.filter(Boolean).length} 条</summary><div className="class-notes">{data.notes.map((note,index)=><label key={index}>说明 {index+1}<textarea value={note} onChange={e=>onChange({...data,notes:data.notes.map((item,i)=>i===index?e.target.value:item)})}/><button aria-label={`删除课表说明 ${index+1}`} onClick={()=>onChange({...data,notes:data.notes.filter((_,i)=>i!==index)})}>删除</button></label>)}</div><button className="class-add" onClick={()=>onChange({...data,notes:[...data.notes,'']})}><Plus size={15}/> 增加说明</button></details></div>
    </>}
  </div>;
}

export function SampleClassPage({data,documentPage=5}:{data:SampleClassData;documentPage?:number}) {
  const weekdays=classColumns(data);
  const columnStyle={gridTemplateColumns:`95px repeat(${weekdays.length},minmax(0,1fr))`};
  return <div className="sample-class-page">
    <div className="program-top"><div className="doc-masthead"><BrandLogo/></div><span>ILLUSTRATIVE TIMETABLE</span></div>
    <div className="sample-page-heading"><div className="doc-kicker">04 / SCHOOL IMMERSION</div><h1>Sample Class Schedule</h1><p>{data.title}</p></div>
    <div className="class-table"><div className="class-table-head" style={columnStyle}><span>TIME</span>{weekdays.map((day,i)=><span key={i}>{day.toUpperCase()||'—'}</span>)}</div>
      {data.rows.map((row,index)=><div className="class-table-row" style={columnStyle} key={index}><strong>{row.time}</strong>{row.fullSpan?<span className="class-wide-cell" style={{gridColumn:`span ${weekdays.length}`}}>{row.cells[0]}</span>:weekdays.map((_,i)=><span key={i}>{row.cells[i]}</span>)}</div>)}
    </div>
    <div className="sample-class-note"><b>PLEASE NOTE</b>{data.notes.filter(Boolean).map((note,i)=><p key={i}>{note}</p>)}</div>
    <div className="program-footer">MAPLE LEAF EDU-TRAVEL <span>SAMPLE CLASS SCHEDULE · {String(documentPage).padStart(2,'0')}</span></div>
  </div>;
}
