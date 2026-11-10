import {useState} from 'react';
import {BookOpen,CalendarDays,FileText,X} from 'lucide-react';
import type {ProjectData} from './project-store';
import type {Clause,ClauseKind} from './clauses';
import {FeePresetPicker} from './FeePresetPicker';

export function ContentLibrary({project,onAttractions,onClassTemplates,onChangeClauses,onClose}:{project:ProjectData;onAttractions:()=>void;onClassTemplates:()=>void;onChangeClauses:(kind:ClauseKind,items:Clause[])=>void;onClose:()=>void}) {
 const [kind,setKind]=useState<ClauseKind|null>(null);
 return <><div className="studio-settings-backdrop" onClick={onClose}><section className="content-library" role="dialog" aria-modal="true" aria-label="内容资源库" onClick={e=>e.stopPropagation()}><header><div><span>CONTENT LIBRARY</span><h2>资源库</h2></div><button aria-label="关闭内容资源库" onClick={onClose}><X size={18}/></button></header><button className="library-entry" onClick={onAttractions}><BookOpen size={21}/><span><strong>景点与体验</strong><small>浏览、搜索与编辑景点资料。</small></span><span>打开 →</span></button><button className="library-entry" onClick={onClassTemplates}><CalendarDays size={21}/><span><strong>课程表模板</strong><small>预览、插入或维护可重复使用的完整课表。</small></span><span>打开 →</span></button><details className="library-fees"><summary><FileText size={19}/> 常用费用与文案</summary><p>添加到「{project.name}」，原有内容保留。</p><div>{([['included','费用包含'],['excluded','费用不包含及重要说明'],['notes','报价备注']] as const).map(([key,label])=><button key={key} onClick={()=>setKind(key)}>{label} <span>选择条目 →</span></button>)}</div></details><p className="library-scope">各类资源独立保存。加入项目后生成副本，原始资料保持独立。</p></section></div>{kind&&<div className="content-fee-picker"><FeePresetPicker kind={kind} items={project.clauses[kind]} days={project.days} nights={project.nights} onAdd={items=>onChangeClauses(kind,items)} onClose={()=>setKind(null)}/></div>}</>;
}
