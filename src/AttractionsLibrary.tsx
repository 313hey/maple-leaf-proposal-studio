import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,Copy,ImagePlus,MoreHorizontal,Plus,Search,Trash2,X} from 'lucide-react';
import {emptyAttraction,imageFor,type Attraction} from './attractions-types';
import {backupAttractions,deleteAttractions,loadAttractions,restoreAttractions,saveAttraction} from './attractions-store';
import {attractionNameKey,findAttractionDuplicates,type AttractionMatch} from './attraction-recommend';
import {AttractionDuplicateNotice} from './AttractionDuplicateNotice';
import {AttractionFields} from './AttractionFields';
import {QuickAddDialog} from './QuickAddDialog';
export {AttractionFields} from './AttractionFields';
import './attractions.css';
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
export function AttractionsLibrary({onClose,onAdd,mode='manage'}:{onClose:()=>void;onAdd?:(items:Attraction[])=>void;mode?:'manage'|'select'|'replace'}){
 const selecting=mode!=='manage';const editingBase=useRef('');const nameCheckTimer=useRef<number|undefined>(undefined);
 const [duplicate,setDuplicate]=useState<{match:AttractionMatch;nameKey:string;again:boolean}|null>(null);
 const [items,setItems]=useState<Attraction[]>([]),[selected,setSelected]=useState<string[]>([]),[editing,setEditing]=useState<Attraction|null>(null),[batch,setBatch]=useState(false),[bulk,setBulk]=useState(false),[query,setQuery]=useState(''),[city,setCity]=useState(''),[category,setCategory]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mediaBusy,setMediaBusy]=useState(false);
 const refresh=async()=>setItems(await loadAttractions());
 useEffect(()=>{void refresh().catch(e=>setError(String(e)))},[]);
 const visible=items.filter(a=>[a.nameEn,a.nameZh,a.city,a.category,a.descriptionEn,a.descriptionZh,a.learningEn,a.learningZh,...a.tags].join(' ').toLowerCase().includes(query.trim().toLowerCase())&&(!city||a.city===city)&&(!category||a.category===category));
 const isNew=Boolean(editing&&!items.some(a=>a.id===editing.id));
 const back=()=>{if(busy||mediaBusy)return;if(editing&&JSON.stringify(editing)!==editingBase.current&&!window.confirm('返回景点库？尚未保存的修改将丢弃。'))return;setEditing(null);setBatch(false);setError('')};
 const close=()=>{if(busy||mediaBusy)return;if(editing&&JSON.stringify(editing)!==editingBase.current&&!window.confirm('关闭编辑？尚未保存的修改将丢弃。'))return;onClose()};
 const create=()=>{const draft={...emptyAttraction(),city};editingBase.current=JSON.stringify(draft);setEditing(draft);setError('');setMessage('')};
 useEffect(()=>{
  window.clearTimeout(nameCheckTimer.current);setDuplicate(null);
  if(!editing||!editingBase.current||attractionNameKey(editing)===attractionNameKey(JSON.parse(editingBase.current)))return;
  // Only changed names trigger a live hint. Editing descriptions/photos does not.
  nameCheckTimer.current=window.setTimeout(()=>{const match=findAttractionDuplicates(editing,items)[0];setDuplicate(match?{match,nameKey:attractionNameKey(editing),again:false}:null)},350);
  return ()=>window.clearTimeout(nameCheckTimer.current);
 },[editing?.id,editing?.nameEn,editing?.nameZh]);
 const save=async(again=false,confirmed=false)=>{
  if(!editing||busy||mediaBusy)return;
  if(!editing.nameEn.trim()&&!editing.nameZh.trim()){setError('请填写英文或中文名称。');return}
  window.clearTimeout(nameCheckTimer.current);
  const draft=structuredClone(editing),nameKey=attractionNameKey(draft);
  const accepted=confirmed&&duplicate?.nameKey===nameKey;
  setBusy(true);setError('');
  try{
   // Confirmed saves go straight to the existing ID-based store; no second duplicate gate.
   const match=accepted?undefined:findAttractionDuplicates(draft,await loadAttractions())[0];
   if(match?.kind==='exact'){setDuplicate({match,nameKey,again});return}
   await saveAttraction(draft);await refresh();
   setMessage(`已保存到景点库，当前筛选已保留。${match?.kind==='similar'?`发现可能相似的资源：${match.item.nameEn||match.item.nameZh}（仅供参考）。`:''}`);
   const next=again?{...emptyAttraction(),city}:null;editingBase.current=JSON.stringify(next);setDuplicate(null);setEditing(next);
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 };
 const remove=async(ids:string[])=>{if(!ids.length||!window.confirm(`删除 ${ids.length} 个景点？已加入方案的副本不受影响。`))return;setBusy(true);setError('');try{await deleteAttractions(ids);await refresh();setSelected([]);setMessage('已删除所选资源。')}catch(e){setError(String(e))}finally{setBusy(false)}};
 const toggle=(id:string)=>setSelected(old=>mode==='replace'?(old[0]===id?[]:[id]):old.includes(id)?old.filter(v=>v!==id):[...old,id]);
 return <div className="attraction-backdrop" onClick={close}><section className={`attraction-library asset-library ${selecting?'selecting-resources':'managing-resources'}`} role="dialog" aria-modal="true" aria-label={selecting?(mode==='replace'?'替换景点':'选择景点'):'景点资源库'} onClick={e=>e.stopPropagation()}>
 <header><div>{(editing||batch)&&<button className="asset-back" disabled={busy||mediaBusy} onClick={back}><ArrowLeft size={14}/> 返回景点库</button>}<h2>{editing?(isNew?'新建景点':'编辑景点'):batch?'批量建立名称':selecting?(mode==='replace'?'替换景点':'选择景点'):'景点与研学资源库'}</h2></div><button className="attraction-close" aria-label="关闭景点库" disabled={busy||mediaBusy} onClick={close}><X size={19}/></button></header>
 {error&&<p className="asset-message error" role="alert">{error}</p>}{message&&<p className="asset-message" role="status">{message}</p>}
 {editing?<><div className="asset-edit-body"><fieldset className="asset-edit-fields" disabled={busy}><AttractionFields key={editing.id} item={editing} onChange={setEditing} recommend={isNew} onBusy={setMediaBusy}/></fieldset></div>{duplicate&&<AttractionDuplicateNotice key={duplicate.match.item.id} match={duplicate.match} disabled={busy||mediaBusy} onSave={()=>void save(duplicate.again,true)}/>}<footer className="asset-edit-footer"><button disabled={busy||mediaBusy} onClick={back}>取消</button>{isNew&&<button disabled={busy||mediaBusy} onClick={()=>void save(true)}>保存并继续新建</button>}<button className="primary" disabled={busy||mediaBusy} onClick={()=>void save()}>{busy?'保存中…':'保存景点'}</button></footer></>:batch?<QuickAddDialog onClose={back} onSaved={message=>{setBatch(false);setMessage(message);void refresh()}}/>:<>
 <div className="asset-toolbar"><label className="asset-search"><Search size={16}/><input aria-label="搜索景点" placeholder="搜索景点、城市" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="城市筛选" value={city} onChange={e=>setCity(e.target.value)}><option value="">全部城市</option>{[...new Set(items.map(a=>a.city).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select>{!selecting&&<><button className="primary asset-new" onClick={create}><Plus size={15}/> 新建景点</button><details className="library-more asset-more" onClick={e=>{if((e.target as HTMLElement).closest('button'))e.currentTarget.open=false}}><summary aria-label="景点库更多操作"><MoreHorizontal size={19}/></summary><div><button onClick={()=>{setBatch(true);setError('');setMessage('')}}>批量建立名称</button><button onClick={()=>{setBulk(true);setSelected([])}}>批量管理</button><details><summary>类别筛选{category?' · 已启用':''}</summary><select aria-label="类别筛选" value={category} onChange={e=>setCategory(e.target.value)}><option value="">全部类别</option>{[...new Set(items.map(a=>a.category).filter(Boolean))].sort().map(c=><option key={c}>{c}</option>)}</select></details><button onClick={async()=>{try{download(await backupAttractions(),'Maple_Leaf_Attractions_Backup.json');setMessage('备份已下载。')}catch(e){setError(String(e))}}}>备份资源库</button><label>恢复资源库<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!window.confirm('将备份加入资源库，相同 ID 会更新。确认恢复？'))return;try{const n=await restoreAttractions(file);await refresh();setMessage(`已恢复 ${n} 条资源。`)}catch(e){setError(String(e))}}}/></label></div></details></>}</div>
 {!selecting&&bulk&&<div className="asset-bulk-bar"><span>批量管理 · 已选 {selected.length} 个</span><button disabled={!selected.length||busy} onClick={()=>void remove(selected)}><Trash2 size={13}/> 删除所选</button><button onClick={()=>{setBulk(false);setSelected([])}}>退出批量管理</button></div>}
 <div className="attraction-list asset-grid">{!visible.length&&<div className="attraction-empty">没有匹配景点，请调整搜索或筛选。{!selecting&&'也可以新建景点。'}</div>}{visible.map(item=><article key={item.id} className={`attraction-card ${selected.includes(item.id)?'is-selected':''}`}><button className="attraction-card-open" aria-label={`${selecting?(mode==='replace'?'替换为':'选择'):bulk?'勾选':'编辑'} ${item.nameEn||item.nameZh}`} aria-pressed={selecting||bulk?selected.includes(item.id):undefined} onClick={()=>{if(selecting||bulk)toggle(item.id);else{editingBase.current=JSON.stringify(item);setEditing(structuredClone(item));setError('');setMessage('')}}}>{imageFor(item)?<img src={imageFor(item)} alt=""/>:<div className="attraction-placeholder"><ImagePlus size={25}/></div>}<div className="asset-card-copy"><strong>{item.nameEn||item.nameZh}</strong>{item.nameEn&&item.nameZh&&<span className="asset-card-zh">{item.nameZh}</span>}<small>{item.city||'未填写城市'}</small>{item.category&&<span className="asset-card-category">{item.category}</span>}</div>{selecting&&<span className="asset-choice" aria-hidden="true">{selected.includes(item.id)&&<Check size={16}/>}</span>}</button>{!selecting&&bulk&&<label className="asset-bulk-check"><input type="checkbox" aria-label={`批量选择 ${item.nameEn||item.nameZh}`} checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/></label>}{!selecting&&!bulk&&<details className="card-menu asset-card-menu" onClick={e=>{if((e.target as HTMLElement).closest('button'))e.currentTarget.open=false}}><summary aria-label={`管理 ${item.nameEn||item.nameZh}`}><MoreHorizontal size={16}/></summary><div><button onClick={()=>{const draft={...structuredClone(item),id:crypto.randomUUID(),nameEn:item.nameEn?`${item.nameEn} Copy`:'',nameZh:item.nameZh?`${item.nameZh} 副本`:'',createdAt:new Date().toISOString()};editingBase.current=JSON.stringify(draft);setEditing(draft);setError('')}}><Copy size={13}/> 复制</button><button onClick={()=>void remove([item.id])}><Trash2 size={13}/> 删除</button></div></details>}</article>)}</div>
 {selecting&&<footer className="asset-selection-footer"><span>已选 {selected.length} 个{mode==='replace'?' · 单选替换':''}</span><button disabled={!selected.length} className="primary" onClick={()=>{onAdd?.(selected.map(id=>items.find(a=>a.id===id)!).filter(Boolean));onClose()}}>{mode==='replace'?'替换当前景点':`添加 ${selected.length} 个景点`}</button></footer>}</>}
 </section></div>;
}
