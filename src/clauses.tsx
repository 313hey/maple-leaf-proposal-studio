import { BrandLogo } from './BrandLogo';
import React,{useState} from 'react';
import type {DayData} from './itinerary';
import {FeePresetPicker} from './FeePresetPicker';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

export type Clause = { id: string; en: string; zh: string };
export type ClauseKind = 'notes' | 'included' | 'excluded';
export type ClauseLanguage = 'en' | 'zh';
export const initialClauses: Record<ClauseKind,Clause[]> = {
  notes: [],
  included: [],
  excluded: [],
};

const titles:Record<ClauseKind,string>={notes:'报价备注',included:'费用包含',excluded:'费用不包含及重要说明'};

export function ClauseEditor({kind,items,onChange,days,nights}:{kind:ClauseKind,items:Clause[],onChange:(items:Clause[])=>void;days:DayData[];nights:number}) {
  const [pickerOpen,setPickerOpen]=useState(false);
  const update=(index:number,field:'en'|'zh',value:string)=>onChange(items.map((item,itemIndex)=>itemIndex===index?{...item,[field]:value}:item));
  const add=(template?:Clause)=>onChange([...items,{id:crypto.randomUUID(),en:template?.en||'',zh:template?.zh||''}]);
  const move=(index:number,direction:number)=>{const next=[...items];const target=index+direction;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];onChange(next)};
  return <section className="clause-editor"><div className="clause-heading"><h3>{titles[kind]}</h3><span>{items.length} 项</span></div>
    {items.map((item,index)=><div className="clause-item" key={item.id}><span className="clause-index">{String(index+1).padStart(2,'0')}</span><div className="clause-fields"><label>English<textarea rows={2} aria-label={`${titles[kind]} 第${index+1}项 英文`} value={item.en} onChange={event=>update(index,'en',event.target.value)}/></label><label>中文<textarea rows={2} aria-label={`${titles[kind]} 第${index+1}项 中文`} value={item.zh} onChange={event=>update(index,'zh',event.target.value)}/></label></div><div className="clause-actions"><button aria-label="上移" title="上移" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="下移" title="下移" disabled={index===items.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button><button aria-label="删除" title="删除" onClick={()=>onChange(items.filter((_,itemIndex)=>itemIndex!==index))}><Trash2 size={13}/></button></div></div>)}
    <div className="clause-add"><button onClick={()=>add()}><Plus size={14}/> 新增条目</button><button className="preset-trigger" onClick={()=>setPickerOpen(true)}>添加常用条目</button></div>
    {pickerOpen&&<FeePresetPicker kind={kind} items={items} days={days} nights={nights} onAdd={onChange} onClose={()=>setPickerOpen(false)}/>}
  </section>;
}

export function StructuredPricingPage({fee,currency,groupSize,clauses,language,documentPage}:{documentPage?:number;fee:string,currency:string,groupSize:string,clauses:Record<ClauseKind,Clause[]>,language:ClauseLanguage}) {
  const chinese=language==='zh';
  const lists:(ClauseKind)[]=['notes','included','excluded'];
  return <div className="paper-inner pricing-page"><div className="doc-masthead"><BrandLogo/></div><div className="doc-kicker">04 / {chinese?'项目费用':'PROGRAMME FEE'}</div><h1>{chinese?'项目费用':'Programme Fee'}</h1><div className="pricing-hero"><div><span>{chinese?'每生报价':'QUOTATION'}</span><strong>{currency} {fee.trim() ? Number(fee).toLocaleString('en-US') : '—'}</strong><small>{chinese?'每名学生':'PER STUDENT'}</small></div><div><span>{chinese?'团组人数与条件':'GROUP SIZE & CONDITIONS'}</span><p>{groupSize}</p></div></div>{lists.map(kind=>{const visible=clauses[kind].filter(item=>item[language].trim());return visible.length>0&&<section key={kind}><h2>{chinese?titles[kind]:({notes:'Notes',included:'Proposed Services & Inclusions',excluded:'Exclusions & Important Notes'}[kind])}</h2><ul>{visible.map(item=><li key={item.id}>{item[language]}</li>)}</ul></section>})}<div className="paper-footer"><span>MAPLE LEAF EDU-TRAVEL</span><span>{chinese?'项目方案':'STUDY TOUR PROPOSAL'} · {documentPage?String(documentPage).padStart(2,'0'):'FEE'}</span></div></div>;
}
