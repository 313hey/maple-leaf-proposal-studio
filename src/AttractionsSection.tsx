import React,{useState} from 'react';
import { ArrowDown, ArrowUp, BookOpen, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { AttractionFields } from './AttractionFields';
import { emptyAttraction, imageFor, type AttractionSnapshot } from './attractions-types';
import { saveAttraction } from './attractions-store';
import './attractions.css';
import {imagePosition,learningDisplay} from './attraction-layout';
export {AttractionsPage} from './AttractionsPage';

export function AttractionsSection({items,onChange,onOpenLibrary,onReplace,placement,onPlacement}:{items:AttractionSnapshot[];onChange:(items:AttractionSnapshot[])=>void;onOpenLibrary:()=>void;onReplace:(id:string)=>void;placement:string;onPlacement:(value:'afterHighlights'|'afterItinerary'|'beforePricing')=>void}){
  const [expanded,setExpanded]=useState<string|null>(null),[message,setMessage]=useState('');
  const update=(id:string,item:AttractionSnapshot)=>onChange(items.map(value=>value.id===id?item:value));
  const move=(index:number,offset:number)=>{const target=index+offset;if(target<0||target>=items.length)return;const next=[...items];[next[index],next[target]]=[next[target],next[index]];onChange(next);};
  return <div className="attraction-section"><div className="card-top"><div><div className="eyebrow">ATTRACTIONS & EXPERIENCES</div><h2>景点与研学体验</h2></div><span className="step">双景点模板</span></div><p className="helper">每页两个景点，项目内编辑不影响资源库。</p>
    <div className="attraction-section-actions"><button onClick={onOpenLibrary}><BookOpen size={16}/> 从资源库添加</button><button onClick={()=>{const item=emptyAttraction();onChange([...items,item]);setExpanded(item.id);}}><Plus size={16}/> 手动新增</button><details className="advanced-options"><summary>页面设置</summary><label>页面位置<select value={placement} onChange={event=>onPlacement(event.target.value as 'afterHighlights'|'afterItinerary'|'beforePricing')}><option value="afterHighlights">项目亮点之后</option><option value="afterItinerary">每日行程之后</option><option value="beforePricing">报价之前</option></select></label></details></div>
    {message&&<p className="attraction-message" role="status">{message}</p>}
    {items.length===0&&<div className="attraction-empty">当前方案还没有景点。可以从资源库选择，也可以新建。</div>}
    {items.map((item,index)=><div className="attraction-project-card" key={item.id}><div className="attraction-project-summary">{imageFor(item)?<img src={imageFor(item)} alt=""/>:<div className="attraction-placeholder"><ImagePlus size={18}/></div>}<button className="attraction-project-title" onClick={()=>setExpanded(expanded===item.id?null:item.id)}><small>{String(index+1).padStart(2,'0')} · {item.city||'未填写城市'}</small><strong>{item.nameEn||item.nameZh||'未命名景点'}</strong><span>{expanded===item.id?'收起编辑':'编辑景点文案与图片'}</span></button><button title="从资源库替换" onClick={()=>onReplace(item.id)}><BookOpen size={15}/></button><button title="上移" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/></button><button title="下移" disabled={index===items.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/></button><button title="移除" onClick={()=>{if(window.confirm('从当前方案移除此景点？资源库不会受影响。'))onChange(items.filter(value=>value.id!==item.id));}}><Trash2 size={15}/></button></div>
      {expanded===item.id&&<div className="attraction-project-edit"><AttractionFields item={item} onChange={value=>update(item.id,value)}/><AttractionPresentationEditor item={item} onChange={value=>update(item.id,value)}/><button onClick={async()=>{try{const {presentation,libraryId,...resource}=item;await saveAttraction({...resource,id:crypto.randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});setMessage('已作为新资源保存到景点库');}catch(error){setMessage(String(error));}}}>另存为景点库资源</button></div>}
    </div>)}
  </div>;
}


function AttractionPresentationEditor({item,onChange}:{item:AttractionSnapshot;onChange:(item:AttractionSnapshot)=>void}){
 const position=imagePosition(item);
 const setLabels=(language:'en'|'zh',value:string)=>{const key=language==='en'?'highlightsEn':'highlightsZh';const presentation={...item.presentation};if(value.trim())presentation[key]=value.split('\n');else delete presentation[key];onChange({...item,presentation})};
 const setPosition=(axis:'x'|'y',value:number)=>onChange({...item,presentation:{...item.presentation,imagePosition:{...position,[axis]:value}}});
 return <section className="attraction-presentation"><h3>方案展示</h3><p>仅用于当前方案，不修改资源库原文。短标签每行一项，建议 2–3 项。</p>
 <label>英文展示标签<textarea aria-label="英文展示标签" rows={3} placeholder="填写完整的简短标签；留空沿用原文" value={item.presentation?.highlightsEn?.join('\n')||''} onChange={e=>setLabels('en',e.target.value)}/></label>
 {learningDisplay(item,'en').needsEditing&&<p role="status">原研学亮点为长句或超过三项。请填写展示用短标签；未填写时完整显示原文，可能自动拆页。</p>}
 <details><summary>中文展示标签</summary><label>中文展示标签<textarea aria-label="中文展示标签" rows={3} value={item.presentation?.highlightsZh?.join('\n')||''} onChange={e=>setLabels('zh',e.target.value)}/></label></details>
 {imageFor(item)&&<div className="attraction-crop-controls"><img src={imageFor(item)} alt="图片裁切预览" style={{objectPosition:`${position.x}% ${position.y}%`}}/><div><label>图片裁切 · 水平<input aria-label="图片裁切水平位置" type="range" min={0} max={100} value={position.x} onChange={e=>setPosition('x',Number(e.target.value))}/></label><label>图片裁切 · 垂直<input aria-label="图片裁切垂直位置" type="range" min={0} max={100} value={position.y} onChange={e=>setPosition('y',Number(e.target.value))}/></label><p>保留原图，仅调整方案中的取景位置。</p></div></div>}
 </section>;
}
