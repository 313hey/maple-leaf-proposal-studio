import {useState} from 'react';
import {emptyAttraction,type Attraction} from './attractions-types';
import {loadAttractions,saveAttractions} from './attractions-store';
import {findAttractionDuplicates,recommendAttraction} from './attraction-recommend';
// Batch names is a secondary library view, not a second single-resource editor.
export function QuickAddDialog({onClose,onSaved}:{onClose:()=>void;onSaved:(message:string)=>void}){
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 return <div className="bulk-attraction-names"><p>每行一个景点，或使用「中文名称 | English name」。已有名称会跳过。</p><textarea aria-label="批量景点名称" value={text} onChange={e=>setText(e.target.value)} placeholder={'深圳湾公园 | Shenzhen Bay Park\nShanghai Museum'}/>{error&&<p role="alert">{error}</p>}<footer><span>{lines.length} 个名称</span><button disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy||!lines.length} onClick={async()=>{setBusy(true);setError('');try{const existing=await loadAttractions(),accepted:Attraction[]=[];let skipped=0;for(const line of lines){const item=emptyAttraction(),parts=line.split('|').map(s=>s.trim());if(parts.length>1){item.nameZh=parts[0];item.nameEn=parts.slice(1).join(' | ')}else if(/[\u3400-\u9fff]/.test(line))item.nameZh=line;else item.nameEn=line;if(!item.nameEn&&!item.nameZh){skipped++;continue}Object.assign(item,recommendAttraction(line));if(findAttractionDuplicates(item,[...existing,...accepted]).some(match=>match.kind==='exact'))skipped++;else accepted.push(item)}await saveAttractions(accepted);onSaved(`已建立 ${accepted.length} 条资源${skipped?`，跳过 ${skipped} 条重复或空白名称`:''}。`)}catch(e){setError(String(e))}finally{setBusy(false)}}}>{busy?'保存中…':'建立资源'}</button></footer></div>;
}
