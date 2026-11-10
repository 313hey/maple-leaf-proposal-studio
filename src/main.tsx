import { BrandLogo } from './BrandLogo';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Copy, FileDown, FileText, Globe2, ImagePlus, LayoutTemplate, MapPin, MoreHorizontal, PanelLeftClose, Plus, Search, Settings2, Sparkles, Type, Users, WandSparkles, ZoomIn, ZoomOut } from 'lucide-react';
import './style.css';
import './program.css';
import './responsive.css';
import './meal.css';
import './studio-fields.css';
import './itinerary.css';
import './clauses.css';
import './overrides.css';
import { buildItineraryPages, ItinerarySheet, resolvedLayout, type DayData, type DayLayout } from './itinerary';
import { ClauseEditor, StructuredPricingPage, type ClauseKind, type ClauseLanguage } from './clauses';
import { DateField } from './DateField';
import { SampleClassEditor, SampleClassPage } from './sample-class';
import type { ExportData } from './export';
import { ExportDialog } from './ExportDialog';
import { ProjectListDialog } from './ProjectListDialog';
import { AttractionsLibrary } from './AttractionsLibrary';
import {applyAttractionSelection} from './attraction-selection';
import { AttractionsSection, AttractionsPage } from './AttractionsSection';
import { snapshotAttraction } from './attractions-types';
import {useAttractionLayout} from './useAttractionLayout';
import {learningDisplay} from './attraction-layout';
import type { AttractionSnapshot } from './attractions-types';
import './attractions.css';
import type { Highlight } from './proposal-types';
import { blankProject, getActiveProjectId, loadProjects, removeProject, saveProjects, saveProject, setActiveProjectId, type ProjectData } from './project-store';
import './export.css';
import './studio-ui.css';
import './workflow-ui.css';
import {CreateProjectDialog,SectionManager} from './ProjectStructure';
import {SECTION_DEFS,visibleSections,exportSections,exportChecks,sectionOrder,type DocumentSection,type ProgrammeType} from './document-sections';
import {applyItineraryImport,type ItineraryImport,type ImportMode} from './itinerary-operations';
import { ItineraryManager } from './ItineraryManager';
import { ProjectBackupPanel } from './ProjectBackupPanel';
import { programPages } from './itinerary-data';
import './brand.css';
import './workspace.css';
import {ContentLibrary} from './ContentLibrary';
import {ClassTemplateLibrary,SaveClassTemplateDialog} from './ClassTemplateLibrary';
import {hasClassContent,type SampleClassData} from './sample-class-data';
import './class-library.css';
import './asset-library.css';
import './attraction-pages.css';
const NO_ATTRACTIONS:AttractionSnapshot[]=[];

type Section = 'Overview' | 'Highlights' | 'Attractions' | 'Learning objectives' | 'Daily itinerary' | 'Sample class' | 'Pricing & details';
type Day = DayData;
const starterProject=():ProjectData=>({...blankProject(),name:'新研学方案'});
const chapterFor:Record<DocumentSection,Section>={cover:'Overview',overview:'Overview',highlights:'Highlights',attractions:'Attractions',program:'Daily itinerary',itinerary:'Daily itinerary',sample:'Sample class',pricing:'Pricing & details'};
function App() {
  const [createOpen,setCreateOpen]=useState(false);
  const [structureOpen,setStructureOpen]=useState(false);
  const [durationNotice,setDurationNotice]=useState('');
  const [itineraryMode,setItineraryMode]=useState<'table'|'detail'>('table');
  const [compactWorkspace,setCompactWorkspace]=useState(()=>window.innerWidth<900);
  const [workspaceMode,setWorkspaceMode]=useState<'edit'|'split'|'preview'>(()=>{const saved=localStorage.getItem('maple-studio-workspace-mode');return saved==='edit'||saved==='preview'?saved:window.innerWidth<900?'edit':'split'});
  const [contentLibraryOpen,setContentLibraryOpen]=useState(false);
  const [classLibraryOpen,setClassLibraryOpen]=useState(false),[saveClassOpen,setSaveClassOpen]=useState(false),[classMessage,setClassMessage]=useState('');
  const projectMenu=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{const close=(event:PointerEvent)=>{if(projectMenu.current&&!projectMenu.current.contains(event.target as Node))projectMenu.current.open=false};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&projectMenu.current)projectMenu.current.open=false};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[]);
  useEffect(()=>{localStorage.setItem('maple-studio-workspace-mode',workspaceMode)},[workspaceMode]);
  useEffect(()=>{const media=window.matchMedia('(max-width:899px)');const update=()=>{setCompactWorkspace(media.matches);if(media.matches)setWorkspaceMode(mode=>mode==='split'?'edit':mode)};media.addEventListener('change',update);return ()=>media.removeEventListener('change',update)},[]);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [section, setSection] = useState<Section>('Overview');
  const [view, setView] = useState<'cover' | 'overview' | 'highlights' | 'attractions' | 'itinerary' | 'program' | 'sample' | 'pricing' | 'all'>('cover');
  const [project, setProject] = useState<ProjectData>(starterProject);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'loading'|'saving'|'saved'|'error'>('loading');
  const [projectListOpen, setProjectListOpen] = useState(false);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [libraryMode,setLibraryMode]=useState<'manage'|'select'|'replace'>('manage');
  const [replaceAttractionId,setReplaceAttractionId]=useState<string|null>(null);
  const [attractionLanguage,setAttractionLanguage]=useState<'en'|'zh'>('en');
  const [projectSearch, setProjectSearch] = useState('');
  const {title,subtitle,summary,destination,audience,overviewHeadline,learningIntent,overviewImage,featureValue,featureLabel,nights,showDates,startDate,highlights,coverImage,days,sampleClass,fee,currency,groupSize,groupSizeZh,clauses,pricingLanguage}=project;
  const field=<K extends keyof ProjectData>(key:K)=>(value:React.SetStateAction<ProjectData[K]>)=>setProject(current=>({
    ...current,
    [key]:typeof value==='function'?(value as (previous:ProjectData[K])=>ProjectData[K])(current[key]):value,
    updatedAt:new Date().toISOString(),
  }));
  const setTitle=field('title');
  const setSubtitle=field('subtitle');
  const setSummary=field('summary');
  const setDestination=field('destination');
  const setAudience=field('audience');
  const setOverviewHeadline=field('overviewHeadline');
  const setLearningIntent=field('learningIntent');
  const setOverviewImage=field('overviewImage');
  const setFeatureValue=field('featureValue');
  const setFeatureLabel=field('featureLabel');
  const setNights=field('nights');
  const setShowDates=field('showDates');
  const setStartDate=field('startDate');
  const setHighlights=field('highlights');
  const setCoverImage=field('coverImage');
  const setDays=field('days');
  const setSampleClass=field('sampleClass');
  const setFee=field('fee');
  const setCurrency=field('currency');
  const setGroupSize=field('groupSize');
  const setGroupSizeZh=field('groupSizeZh');
  const setClauses=field('clauses');
  const setPricingLanguage=field('pricingLanguage');
  const setAttractions=field('attractions');
  const dayArchive = useRef(project.archivedDays);
  const [selectedDay, setSelectedDay] = useState(0);
  const [zoom, setZoom] = useState(70);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<'pdf'|'docx'|null>(null);
  const [exportError, setExportError] = useState('');
  const exportStage=useRef<HTMLDivElement>(null);
  const previewCanvas=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let active=true;
    loadProjects().then(async stored=>{
      if(!active)return;
      const list=stored.length?stored:[starterProject()];
      if(!stored.length)await saveProject(list[0]);
      if(!active)return;
      const selected=list.find(item=>item.id===getActiveProjectId())||list[0];
      setProjects(list);setProject(selected);dayArchive.current=selected.archivedDays||selected.days;
      setActiveProjectId(selected.id);setHydrated(true);setSaveStatus('saved');
    }).catch(()=>{if(active){setSaveStatus('error');setHydrated(true);}});
    return ()=>{active=false};
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    let active=true;
    setSaveStatus('saving');
    setProjects(current=>[project,...current.filter(item=>item.id!==project.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    saveProject(project).then(()=>{if(active)setSaveStatus('saved')}).catch(()=>{if(active)setSaveStatus('error')});
    return ()=>{active=false};
  },[project,hydrated]);
  const change = (fn: () => void) => fn();
  const activateProject=(next:ProjectData)=>{
    if(projectMenu.current)projectMenu.current.open=false;
    setProject(next);dayArchive.current=next.archivedDays||next.days;
    const first=visibleSections(next)[0]||'cover';setSelectedDay(0);setSection(chapterFor[first]);setView(first);setActiveProjectId(next.id);setProjectListOpen(false);setDurationNotice('');setClassMessage('');
  };
  const createProject=()=>{if(projectMenu.current)projectMenu.current.open=false;if(hydrated){setProjectListOpen(false);setCreateOpen(true)}};
  const finishCreate=(name:string,type:ProgrammeType,sections:DocumentSection[])=>{const next={...blankProject(),name,title:name,programmeType:type,sectionOrder:sections,hiddenSections:[]};setProjects(current=>[next,...current]);activateProject(next);setCreateOpen(false);};
  const renameProject=(id:string,name:string)=>{
    const target=id===project.id?project:projects.find(item=>item.id===id);
    if(!target)return;
    if(!name.trim()||name===target.name)return;
    const updated={...target,name,updatedAt:new Date().toISOString()};
    setProjects(current=>current.map(item=>item.id===id?updated:item));
    if(id===project.id)setProject(updated);else void saveProject(updated).catch(()=>setSaveStatus('error'));
  };
  const copyProject=(id:string)=>{
    const target=id===project.id?project:projects.find(item=>item.id===id);
    if(!target)return;
    const now=new Date().toISOString();
    const copy:ProjectData={...structuredClone(target),id:crypto.randomUUID(),name:`${target.name} 副本`,createdAt:now,updatedAt:now,isDemo:false};
    setProjects(current=>[copy,...current]);activateProject(copy);
  };
  const deleteProject=async(id:string)=>{
    const target=id===project.id?project:projects.find(item=>item.id===id);
    if(!target)return;
    try {
      await removeProject(id);
      const remaining=projects.filter(item=>item.id!==id);
      setProjects(remaining);
      if(id===project.id){const next=remaining[0]||blankProject();if(!remaining.length)setProjects([next]);activateProject(next);}
    } catch {setSaveStatus('error');window.alert('删除失败，请重试。');}
  };
  const upload = (file: File | undefined, setter: (url: string) => void) => { if (!file) return; const reader = new FileReader(); reader.onload = () => change(() => setter(String(reader.result))); reader.readAsDataURL(file); };
  const resizeDays = (count:number)=>{if(!Number.isInteger(count)||count<1||count>90||count===days.length)return;const archive=[...days,...dayArchive.current.slice(days.length)];dayArchive.current=archive;setProject(current=>({...current,archivedDays:archive,days:Array.from({length:count},(_,i)=>current.days[i]??archive[i]??{title:'',morning:'',afternoon:'',evening:''}),nights:current.nights===current.days.length-1?count-1:Math.min(current.nights,count),updatedAt:new Date().toISOString()}));setSelectedDay(i=>Math.min(i,count-1));setDurationNotice('项目天数已变化；报价及条款均已保留，请重新核对价格、住宿和餐食。');};
  const importDays=(input:ItineraryImport,mode:ImportMode)=>{const updated=applyItineraryImport(project,input,mode);dayArchive.current=updated.archivedDays;setProject(updated);setSelectedDay(0);setItineraryMode('table');if(updated.days.length!==days.length)setDurationNotice('行程天数已变化；报价及全部费用条款均已保留，请重新核对。');};
  const restoreProjects=async(items:ProjectData[])=>{await saveProjects(items);const stored=await loadProjects();setProjects(stored);const updated=items.find(p=>p.id===project.id);if(updated)activateProject(updated);};
  const changeNights=(value:number)=>{const next=Math.min(days.length,Math.max(0,value));if(next!==nights){setNights(next);setDurationNotice('晚数已变化；费用条款已保留，请核对住宿和餐食。');}};
  const applyClassTemplate=(data:SampleClassData,name:string)=>{
    if(hasClassContent(sampleClass)&&!window.confirm('当前项目已有课程表。确认替换标题、星期列、时间段、课程和备注？其他项目内容及模板库不变。'))return false;
    const snapshot=structuredClone(data);
    setProject(current=>{const order=sectionOrder(current);return {...current,sampleClass:snapshot,sectionOrder:order.includes('sample')?order:[...order,'sample'],hiddenSections:(current.hiddenSections||[]).filter(id=>id!=='sample'),updatedAt:new Date().toISOString()}});
    setSection('Sample class');setView('sample');if(!compactWorkspace)setWorkspaceMode('split');setClassMessage(`已应用「${name}」的独立副本。`);return true;
  };
  const changeClause=(kind:ClauseKind,items:typeof clauses[ClauseKind])=>change(()=>setClauses(current=>({...current,[kind]:items})));
  const dateFor = (day: Day, index: number) => day.date || (startDate ? new Date(new Date(`${startDate}T12:00:00`).getTime()+index*86400000).toISOString().slice(0,10) : '');
  const itineraryPages = buildItineraryPages(days);
  const fullProgramPages=programPages(days);
  const attractions=project.attractions||NO_ATTRACTIONS;
  const attractionLayout=useAttractionLayout(attractions,attractionLanguage);
  const attractionSheets=attractionLayout.pages;
  const attractionPlacement=project.attractionPlacement||'afterHighlights';
  const selectedSections=visibleSections(project);
  const navigationSections=selectedSections.filter((id,i,array)=>!(id==='itinerary'&&array.includes('program')&&array.indexOf('program')<i)&&!(id==='program'&&array.includes('itinerary')&&array.indexOf('itinerary')<i));
  const activeNavigation=navigationSections.find(id=>id===view)||navigationSections.find(id=>chapterFor[id]===section);
  useEffect(()=>{const selected=visibleSections(project);if(view!=='all'&&!selected.includes(view)){const first=selected[0];setView(first||'all');if(first)setSection(chapterFor[first]);}},[project.sectionOrder,project.hiddenSections,project.id]);
  const documentSections=exportSections(project);
  const baseChecks=exportChecks(project);
  const checks={...baseChecks,errors:[...baseChecks.errors,...(documentSections.includes('attractions')?(!attractionLayout.ready?['景点页面正在排版，请稍候。']:attractionLayout.errors):[])]};
  const warnings=[...checks.warnings,...(documentSections.includes('attractions')&&attractions.some(a=>learningDisplay(a,attractionLanguage).needsEditing)?['部分研学亮点仍为长句；可在景点编辑中填写展示用短标签，当前会完整保留原文。']:[]),...(selectedSections.includes('itinerary')&&days.some(d=>d.imageSource==='sample'&&!d.hideImage)?['行程仍有示例图片']:[]),...(durationNotice?[durationNotice]:[])];
  const sectionPages:Record<DocumentSection,{landscape?:boolean;content:React.ReactNode}[]>={
    cover:[{content:<Cover title={title} subtitle={subtitle} destination={destination} days={days.length} nights={nights} image={coverImage}/>}],
    overview:[{content:<Overview headline={overviewHeadline} summary={summary} destination={destination} audience={audience} days={days.length} nights={nights} learningIntent={learningIntent} image={overviewImage} featureValue={featureValue} featureLabel={featureLabel}/>}],
    highlights:[{content:<Highlights highlights={highlights.filter(h=>h.title||h.text||h.image)}/>}],
    attractions:attractionSheets.map((page,i)=>({content:<AttractionsPage {...page} pageNumber={i+1} language={attractionLanguage}/>})),
    program:fullProgramPages.map(page=>({landscape:true,content:<ProgramItinerary days={page.days} offset={page.offset} totalDays={days.length} destination={destination} showDates={showDates} dateFor={dateFor} nights={nights}/>})),
    sample:[{landscape:true,content:<SampleClassPage data={sampleClass}/>}],
    itinerary:itineraryPages.map((page,i)=>({content:<ItinerarySheet page={page} pageNumber={6+i} dateFor={dateFor} showDates={showDates} destination={destination} showImageWarning={false}/>})),
    pricing:[{content:<StructuredPricingPage fee={fee} currency={currency} groupSize={pricingLanguage==='zh'?groupSizeZh:groupSize} clauses={clauses} language={pricingLanguage}/>}]
  };
  const orderedPages=documentSections.flatMap(id=>sectionPages[id].map((page,i)=>({...page,key:`${id}-${i}`,section:id}))).map((page,i)=>({...page,content:React.isValidElement<{documentPage?:number}>(page.content)?React.cloneElement(page.content,{documentPage:i+1}):page.content}));
  const previewPages=workspaceMode==='preview'||view==='all'?orderedPages:orderedPages.filter(page=>page.section===view);
  const fitPreviewWidth=()=>{const canvas=previewCanvas.current;if(!canvas||canvas.clientWidth===0||!previewPages.length)return;const style=getComputedStyle(canvas);const available=canvas.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-4;const width=previewPages.some(page=>page.landscape)?750:530;const height=previewPages.some(page=>!page.landscape)?750:530;const availableHeight=canvas.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-4;setZoom(Math.max(10,Math.min(100,Math.floor(Math.min(available/width,Math.max(120,availableHeight)/height)*72))));};
  useEffect(()=>{const canvas=previewCanvas.current;if(!canvas)return;const observer=new ResizeObserver(()=>{fitPreviewWidth();});observer.observe(canvas);fitPreviewWidth();return ()=>observer.disconnect();},[view,workspaceMode,project.id,previewPages.some(page=>page.landscape),Boolean(previewPages.length)]);
  const exportData=():ExportData=>({title,subtitle,destination,audience,days,nights,summary,overviewHeadline,learningIntent,featureValue,featureLabel,coverImage,overviewImage,highlights,sampleClass,fee,currency,groupSize:pricingLanguage==='zh'?groupSizeZh:groupSize,clauses,language:pricingLanguage,showDates,dateFor,attractions,attractionPlacement,attractionLanguage,attractionLayout:attractionSheets,documentSections});
  const runExport=async(format:'pdf'|'docx')=>{
    if(checks.errors.length){setExportError('请先修正阻止导出的问题。');return;}
    setExportBusy(format);setExportError('');
    try {
      const {createDocx,createPdf,download,fileBase}=await import('./export');
      const blob=format==='pdf'?await createPdf(exportStage.current!):await createDocx(exportData());
      download(blob,`${fileBase(title)}.${format==='pdf'?'pdf':'docx'}`);
      setExportOpen(false);
    } catch(error) {setExportError(error instanceof Error?error.message:String(error));}
    finally {setExportBusy(null);}
  };
  return <div className={`app-shell studio-shell mode-${workspaceMode}`}>
    <aside className="sidebar studio-rail">
      <div className="brand"><BrandLogo variant="sidebar"/></div>
      <nav aria-label="主导航"><button className="nav active" onClick={()=>setProjectListOpen(true)}><FileText size={19}/><span>我的方案</span></button><button className="nav" onClick={()=>{setReplaceAttractionId(null);setContentLibraryOpen(true)}}><BookOpen size={19}/><span>资源库</span></button><button className="nav" onClick={()=>setSettingsOpen(true)}><Settings2 size={19}/><span>设置</span></button></nav>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <details className="project-switcher" ref={projectMenu}><summary aria-label="切换项目"><strong>{project.name||'未命名项目'}</strong><ChevronDown size={14}/></summary><div><span>最近方案</span>{projects.slice(0,5).map(item=><button key={item.id} className={item.id===project.id?'current':''} onClick={()=>activateProject(item)}>{item.name||'未命名项目'}</button>)}<button onClick={createProject} disabled={!hydrated}><Plus size={14}/> 新建方案</button><button onClick={()=>{if(projectMenu.current)projectMenu.current.open=false;setProjectListOpen(true)}}>管理所有方案</button></div></details>
        <div className="workspace-modes" role="group" aria-label="工作空间模式">{([['edit','专注编辑',<PanelLeftClose size={14}/>],['split','分栏预览',<LayoutTemplate size={14}/>],['preview','全屏预览',<FileText size={14}/>]] as const).map(([id,label,icon])=><button key={id} aria-pressed={workspaceMode===id} disabled={id==='split'&&compactWorkspace} title={id==='split'&&compactWorkspace?'窄屏请使用专注编辑或全屏预览':label} onClick={()=>setWorkspaceMode(id)}>{icon}<span>{label}</span></button>)}</div>
        <div className="top-actions"><span className="save-state" role="status"><Check size={14}/>{saveStatus==='saved'?'已自动保存':saveStatus==='saving'?'正在保存…':saveStatus==='loading'?'正在读取项目…':'保存失败，请检查浏览器存储'}</span><details className="mobile-main-menu"><summary aria-label="主导航"><MoreHorizontal size={18}/></summary><div><button onClick={()=>setProjectListOpen(true)}>我的方案</button><button onClick={()=>setContentLibraryOpen(true)}>资源库</button><button onClick={()=>setSettingsOpen(true)}>设置</button></div></details><button className="export-primary" onClick={()=>{setExportError('');setExportOpen(true)}}><FileDown size={16}/> 导出方案</button></div>
      </header>
      <div className={`workspace mode-${workspaceMode} ${(section==='Daily itinerary'&&itineraryMode==='table')||section==='Sample class'?'wide-editor':''}`}>
        <nav className="chapter-nav" aria-label="方案章节"><span>方案内容</span>{navigationSections.map(id=><button key={id} className={activeNavigation===id?'selected':''} onClick={()=>{setSection(chapterFor[id]);setView(id)}}>{id==='program'||id==='itinerary'?'行程管理':id==='overview'?'项目概览':SECTION_DEFS.find(([key])=>key===id)![1]}</button>)}<button className="manage-sections" onClick={()=>setStructureOpen(true)}>＋ 管理内容板块</button></nav>
        <section className="editor">
          {project.isDemo&&<div className="sample-note"><Sparkles size={16}/><span>演示内容 · 发送前请核实活动、图片与费用。</span></div>}
          {durationNotice&&<div className="duration-notice" role="status">{durationNotice}<button aria-label="关闭时长提醒" onClick={()=>setDurationNotice('')}>×</button></div>}{selectedSections.length===0?<div className="empty-detail">所有板块均已隐藏。<button onClick={()=>setStructureOpen(true)}>恢复内容板块</button></div>:<div className="editor-card">
            {section === 'Overview' && <><div className="card-top"><div><div className="eyebrow">方案的第一印象</div><h2>项目基本信息与概览</h2></div><span className="step">01 / 06</span></div>
              <label className="field-label">项目名称（英文或中文）</label><input className="line-input title-input" value={title} onChange={e => change(() => setTitle(e.target.value))}/>
              <label className="field-label">封面副标题</label><input className="line-input" value={subtitle} onChange={e => change(() => setSubtitle(e.target.value))}/>
              <div className="settings-grid"><label>目的地<input value={destination} onChange={e=>change(()=>setDestination(e.target.value))}/></label><label>目标学生群体<input value={audience} onChange={e=>change(()=>setAudience(e.target.value))}/></label><label>天数（1–90）<input aria-label="天数" type="number" min="1" max="90" value={days.length} onChange={e=>resizeDays(Number(e.target.value))}/></label><label>晚数<input aria-label="晚数" type="number" min="0" max={days.length} value={nights} onChange={e=>changeNights(Number(e.target.value))}/></label></div>
              {selectedSections.includes('overview')&&<><label className="field-label">概览页标题</label><input className="line-input" value={overviewHeadline} onChange={e=>change(()=>setOverviewHeadline(e.target.value))}/>
              <label className="field-label">项目简介</label><textarea className="prose-input" value={summary} onChange={e => change(() => setSummary(e.target.value))}/>
              <label className="field-label">学习方向概述</label><textarea className="prose-input short" value={learningIntent} onChange={e=>change(()=>setLearningIntent(e.target.value))}/>
              <div className="settings-grid"><label>特色数据<input value={featureValue} onChange={e=>change(()=>setFeatureValue(e.target.value))}/></label><label>特色数据说明<input value={featureLabel} onChange={e=>change(()=>setFeatureLabel(e.target.value))}/></label></div>
              <button className="image-action" onClick={() => document.getElementById('overview-upload')?.click()}><ImagePlus size={16}/> {overviewImage?'替换概览图片':'上传概览图片'}</button><input id="overview-upload" type="file" accept="image/*" hidden onChange={e => upload(e.target.files?.[0], setOverviewImage)}/>
              </>}<button className="image-action" onClick={() => document.getElementById('cover-upload')?.click()}><ImagePlus size={16}/> {coverImage?'替换封面图片':'上传封面图片'}</button><input id="cover-upload" type="file" accept="image/*" hidden onChange={e => upload(e.target.files?.[0], setCoverImage)}/>
            </>}
            {section === 'Highlights' && <><div className="card-top"><div><div className="eyebrow">让学校记住的体验</div><h2>项目亮点</h2></div><span className="step">02 / 06</span></div><p className="helper">未提供合适图片的亮点会使用无图卡片。请上传与实际活动相符的照片。</p>{highlights.map((highlight,index) => <div className="highlight-editor" key={index}><label className="highlight-upload" title="上传亮点图片">{highlight.image?<img src={highlight.image} alt="亮点图片"/>:<span className="upload-placeholder"><ImagePlus size={19}/>上传</span>}<span><ImagePlus size={14}/>{highlight.image?'换图':'选图'}</span><input type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0],url=>setHighlights(current=>current.map((item,itemIndex)=>itemIndex===index?{...item,image:url}:item)))}/></label><div><span>亮点 {highlight.num}</span><input value={highlight.title} onChange={e => change(() => setHighlights(highlights.map((item,itemIndex) => itemIndex===index ? {...item,title:e.target.value}:item)))}/><textarea value={highlight.text} onChange={e => change(() => setHighlights(highlights.map((item,itemIndex) => itemIndex===index ? {...item,text:e.target.value}:item)))}/></div></div>)}<button className="image-action" onClick={()=>change(()=>setHighlights(current=>[...current,{num:String(current.length+1).padStart(2,'0'),title:'',text:''}]))}><Plus size={16}/> 新增项目亮点</button></>}
            {section === 'Attractions' && <>{attractionLayout.errors.map(error=><p key={error} className="attraction-layout-notice" role="alert">{error}</p>)}{attractionLayout.ready&&attractionSheets.some((p,i)=>p.items.length===1&&(i!==attractionSheets.length-1||attractions.length%2===0))&&<p className="attraction-layout-notice" role="status">部分内容超过双景点容量，已自动采用单景点页，文字完整保留。</p>}<AttractionsSection items={attractions} onChange={setAttractions} onOpenLibrary={()=>{setReplaceAttractionId(null);setLibraryMode('select');setLibraryOpen(true)}} onReplace={id=>{setReplaceAttractionId(id);setLibraryMode('replace');setLibraryOpen(true)}} placement={attractionPlacement} onPlacement={value=>{setProject(current=>{if(current.sectionOrder===undefined)return {...current,attractionPlacement:value,updatedAt:new Date().toISOString()};const next:DocumentSection[]=sectionOrder(current).filter(id=>id!=='attractions');const target=value==='afterHighlights'?'highlights':value==='afterItinerary'?'itinerary':'pricing';const i=next.indexOf(target);next.splice(i<0?next.length:value==='beforePricing'?i:i+1,0,'attractions');return {...current,attractionPlacement:value,sectionOrder:next,updatedAt:new Date().toISOString()};});setView('all');}}/></> }
            {section === 'Learning objectives' && <><div className="card-top"><div><div className="eyebrow">项目的教育价值</div><h2>学习目标</h2></div><span className="step">03 / 06</span></div><p className="helper">填写学习目标或学习方向，右侧项目概览会同步显示。</p><textarea className="prose-input tall" aria-label="学习目标内容" value={learningIntent} onChange={e=>change(()=>setLearningIntent(e.target.value))} placeholder="填写学习目标…"/></>}
            {section === 'Daily itinerary' && <><div className="card-top"><div><div className="eyebrow">逐日安排</div><h2>行程管理</h2></div><span className="step">04 / 06</span></div><ItineraryManager days={days} onChange={setDays} onImport={importDays} mode={itineraryMode} setMode={setItineraryMode} onSelect={setSelectedDay} onResize={resizeDays} dateFor={dateFor}/>{itineraryMode==='detail'&&<><div className="itinerary-date-options"><label className="date-toggle"><input type="checkbox" checked={showDates} onChange={e=>change(()=>setShowDates(e.target.checked))}/> 在完整行程表中显示日期</label>{showDates&&<DateField label="项目开始日期（可逐日修改）" value={startDate} onChange={value=>change(()=>setStartDate(value))}/>}</div><div className="day-select"><button onClick={() => setSelectedDay(Math.max(0,selectedDay-1))}><ChevronLeft size={16}/></button><span>第 {String(selectedDay+1).padStart(2,'0')} 天 <small>共 {days.length} 天 · 预览排为 {itineraryPages.length} 页</small></span><button onClick={() => setSelectedDay(Math.min(days.length-1,selectedDay+1))}><ChevronRight size={16}/></button></div><label className="field-label">当日城市</label><input className="line-input" value={days[selectedDay].city||''} onChange={e=>setDays(current=>current.map((d,i)=>i===selectedDay?{...d,city:e.target.value}:d))}/>{showDates&&<DateField label="当日日期" value={dateFor(days[selectedDay],selectedDay)} onChange={value=>change(()=>setDays(days.map((day,index)=>index===selectedDay?{...day,date:value}:day)))}/>}<label className="field-label">当日主题（英文或中文）</label><input className="line-input" value={days[selectedDay].title} onChange={e=>change(()=>setDays(days.map((day,index)=>index===selectedDay?{...day,title:e.target.value}:day)))}/><details className="advanced-options"><summary>行程版式设置</summary><label className="field-label">展示版式</label><select className="line-input" aria-label="展示版式" value={days[selectedDay].layout||'auto'} onChange={e=>change(()=>setDays(days.map((day,index)=>index===selectedDay?{...day,layout:e.target.value as DayLayout}:day)))}><option value="auto">智能选择（抵达／返程日紧凑）</option><option value="editorial">Editorial · 图文</option><option value="compact">Compact · 紧凑</option><option value="school">School Schedule · 校园课程</option></select><p className="helper">当前版式：{resolvedLayout(days[selectedDay],selectedDay,days.length)}。连续且内容相同的 School Schedule 会合并展示。</p></details>{(['morning','afternoon','evening'] as const).map((slot,index)=><React.Fragment key={slot}><label className="field-label">{['上午活动','下午活动','晚间活动'][index]}</label><input className="line-input" value={days[selectedDay][slot]} onChange={e=>change(()=>setDays(days.map((day,dayIndex)=>dayIndex===selectedDay?{...day,[slot]:e.target.value}:day)))}/></React.Fragment>)}<div className="meal-editors">{(['breakfast','lunch','dinner'] as const).map((meal,index)=><label key={meal}>{['早餐','午餐','晚餐'][index]}<select value={days[selectedDay][meal]||''} onChange={e=>change(()=>setDays(days.map((day,dayIndex)=>dayIndex===selectedDay?{...day,[meal]:e.target.value}:day)))}><option value="">未填写</option><option value="Included">提供</option><option value="At Own Expense">自费</option><option value="Not Included">不包含</option></select></label>)}</div><div className="day-image-editor"><div><strong>当日图片</strong><p>{days[selectedDay].image ? days[selectedDay].imageSource==='sample'?'示例图片 · 正式使用前需替换':'已上传图片':'无图排版 · 不自动填充'}</p></div>{days[selectedDay].image&&!days[selectedDay].hideImage&&<img src={days[selectedDay].image} alt="当日图片"/>}<label className="day-upload"><ImagePlus size={15}/> 上传／替换<input type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0],url=>setDays(current=>current.map((day,index)=>index===selectedDay?{...day,image:url,imageSource:'uploaded',hideImage:false}:day)))}/></label>{days[selectedDay].image&&<button onClick={()=>change(()=>setDays(current=>current.map((day,index)=>index===selectedDay?{...day,hideImage:!day.hideImage}:day)))}>{days[selectedDay].hideImage?'显示图片':'隐藏图片'}</button>}{days[selectedDay].image&&<button onClick={()=>change(()=>setDays(current=>current.map((day,index)=>index===selectedDay?{...day,image:undefined,imageSource:undefined,hideImage:false}:day)))}>移除</button>}</div><button className="image-action" onClick={()=>setView(selectedSections.includes('itinerary')?'itinerary':'program')}><FileText size={16}/> {selectedSections.includes('itinerary')?'查看自动分页效果':'查看完整行程表'}</button><label className="field-label">内部备注（不进入客户文件）</label><textarea className="prose-input" value={days[selectedDay].notes||''} onChange={e=>setDays(current=>current.map((d,i)=>i===selectedDay?{...d,notes:e.target.value}:d))}/></>}</>}
            {section === 'Sample class' && <><div className="card-top"><div><div className="eyebrow">校园课程示例</div><h2>示例课程表</h2></div><span className="step">05 / 06</span></div>{classMessage&&<p className="class-action-message" role="status">{classMessage}</p>}<SampleClassEditor data={sampleClass} onChange={next=>change(()=>setSampleClass(next))} onInsertTemplate={()=>{setClassMessage('');setClassLibraryOpen(true)}} onSaveTemplate={()=>setSaveClassOpen(true)}/></>}
            {section === 'Pricing & details' && <><div className="card-top"><div><div className="eyebrow">客户需要了解的细节</div><h2>报价与说明</h2></div><span className="step">06 / 06</span></div>{project.isDemo&&<div className="sample-note">演示报价 · 发送前请核对。</div>}<div className="settings-grid"><label>每生报价<input type="number" min="0" value={fee} onChange={e=>change(()=>setFee(e.target.value))}/></label><label>币种（不自动换算）<select value={currency} onChange={e=>change(()=>setCurrency(e.target.value))}><option>RMB</option><option>USD</option><option>THB</option><option>HKD</option><option>SGD</option></select></label></div><label className="field-label">团组人数与教师条件 · English</label><textarea className="prose-input short" value={groupSize} onChange={e=>change(()=>setGroupSize(e.target.value))}/><label className="field-label">团组人数与教师条件 · 中文</label><textarea className="prose-input short" value={groupSizeZh} onChange={e=>change(()=>setGroupSizeZh(e.target.value))}/><div className="fee-language"><span>费用页预览语言</span><button className={pricingLanguage==='en'?'active':''} onClick={()=>setPricingLanguage('en')}>English</button><button className={pricingLanguage==='zh'?'active':''} onClick={()=>setPricingLanguage('zh')}>中文</button></div>{(['notes','included','excluded'] as ClauseKind[]).map(kind=><ClauseEditor key={kind} kind={kind} items={clauses[kind]} days={days} nights={nights} onChange={items=>changeClause(kind,items)}/>)}</>}
          </div>}
        </section>
        <section className="preview">
          <div className="preview-toolbar"><div><span className="eyebrow">实时文档</span><h2>{workspaceMode==='preview'?'全案预览':'客户方案预览'}</h2></div><div className="preview-controls"><select aria-label="预览板块" hidden={workspaceMode==='preview'} value={view} onChange={e=>{const next=e.target.value as typeof view;setView(next);if(next!=='all')setSection(chapterFor[next])}}><option value="all">全案预览</option>{selectedSections.map(id=><option key={id} value={id}>{SECTION_DEFS.find(([key])=>key===id)![1]}</option>)}</select><button className="icon-button" aria-label="缩小" onClick={()=>setZoom(Math.max(10,zoom-10))}><ZoomOut size={17}/></button><button className="zoom-label fit-preview" aria-label="适应页面宽度" title="点击适应页面宽度" onClick={fitPreviewWidth}>{zoom}%</button><button className="icon-button" aria-label="放大" onClick={()=>setZoom(Math.min(100,zoom+10))}><ZoomIn size={17}/></button></div></div>
          <div className="canvas-scroll" ref={previewCanvas}>{previewPages.length===0?<div className="empty-detail">尚无可预览内容，空白或隐藏板块不会导出。</div>:<div className="all-document-pages">{previewPages.map(page=><div className="paper-wrap" data-section={page.section} key={page.key} style={{width:`${zoom/72*(page.landscape?750:530)}px`,height:`${zoom/72*(page.landscape?530:750)}px`}}><div className={`paper ${page.landscape?'landscape':''}`} style={{transform:`scale(${zoom/72})`}}>{page.content}</div></div>)}</div>}<span className="page-caption">{workspaceMode==='preview'?'全案预览':view==='program'?`${fullProgramPages.length} 页 · A4 横向`:view==='itinerary'?`${itineraryPages.length} 页 · A4 纵向`:view==='attractions'?`${attractionSheets.length} 页 · A4 纵向`:view==='sample'?'A4 横向':'A4 纵向'} · 全案 {orderedPages.length} 页</span></div>
          <div className="preview-footer"><span><span className="green-dot"/> 实时预览</span>{(view==='attractions'||workspaceMode==='preview')&&selectedSections.includes('attractions')&&<button className="attraction-lang-button" onClick={()=>setAttractionLanguage(attractionLanguage==='en'?'zh':'en')}>{attractionLanguage==='en'?'English · 切换中文':'中文 · Switch English'}</button>}</div>
        </section>
      </div>
    </main>
    {settingsOpen&&<div className="studio-settings-backdrop" onClick={()=>setSettingsOpen(false)}><section className="studio-settings" role="dialog" aria-modal="true" aria-label="设置" onClick={event=>event.stopPropagation()}><header><h2>设置与数据</h2><button onClick={()=>setSettingsOpen(false)}>关闭</button></header><h3>本地保存</h3><p>方案和景点保存在当前浏览器，不会自动同步到其他电脑。等待「已自动保存」后再关闭页面。</p><details><summary>项目备份与恢复</summary><ProjectBackupPanel projects={[project,...projects.filter(p=>p.id!==project.id)]} onRestore={restoreProjects}/></details><h3>资源库备份</h3><p>独立课表库请在「资源库 → 课程表模板 → 更多」备份。项目备份只包含项目内课表副本。</p><button onClick={()=>{setSettingsOpen(false);setClassLibraryOpen(true)}}>打开课表模板库</button><h3>景点资源备份</h3><p>在景点库右上角「更多」中导出或恢复包含图片的完整资源备份。恢复时会更新同 ID 资料。</p><button onClick={()=>{setSettingsOpen(false);setReplaceAttractionId(null);setLibraryMode('manage');setLibraryOpen(true)}}>打开景点资源库</button><details><summary>当前能力说明</summary><p>内容板块可在章节导航底部管理，隐藏不删除内容。数据保存在本地，尚无云端同步。</p><p>顶部可切换专注编辑、分栏预览和全屏预览；分栏时可拖动编辑区右边缘调整宽度。图片与文案较长时，请在导出前检查分页。</p></details></section></div>}
    {attractionLayout.probe}
    <div className="export-stage" ref={exportStage} data-attraction-layout-ready={attractionLayout.ready} aria-hidden="true">{orderedPages.map(page=><div key={page.key} data-section={page.section} className={`export-page ${page.landscape?'landscape':''}`}>{page.content}</div>)}</div>
    {createOpen&&<CreateProjectDialog onClose={()=>setCreateOpen(false)} onCreate={finishCreate}/>}
    {structureOpen&&<SectionManager project={project} onClose={()=>setStructureOpen(false)} onChange={(order,hidden)=>{setProject(current=>({...current,sectionOrder:order,hiddenSections:hidden,updatedAt:new Date().toISOString()}));const visible=order.filter(id=>!hidden.includes(id));const next=visible.find(id=>id===view)||visible.find(id=>chapterFor[id]===section)||visible[0];if(next){setSection(chapterFor[next]);setView(next)}else setView('all');}}/>}
    {classLibraryOpen&&<ClassTemplateLibrary onClose={()=>setClassLibraryOpen(false)} onApply={applyClassTemplate}/>}
    {saveClassOpen&&<SaveClassTemplateDialog data={sampleClass} projectName={project.name} onClose={()=>setSaveClassOpen(false)} onSaved={name=>{setSaveClassOpen(false);setClassMessage(`已保存为课表模板「${name}」。`);}}/>}
    {contentLibraryOpen&&<ContentLibrary project={project} onClose={()=>setContentLibraryOpen(false)} onAttractions={()=>{setContentLibraryOpen(false);setReplaceAttractionId(null);setLibraryMode('manage');setLibraryOpen(true)}} onClassTemplates={()=>{setContentLibraryOpen(false);setClassLibraryOpen(true)}} onChangeClauses={changeClause}/>}
    {libraryOpen&&<AttractionsLibrary mode={libraryMode} onClose={()=>{setLibraryOpen(false);setReplaceAttractionId(null)}} onAdd={items=>{setAttractions(current=>applyAttractionSelection(current||[],items,replaceAttractionId));setReplaceAttractionId(null)}}/> }
    {projectListOpen&&<ProjectListDialog projects={projects} activeId={project.id} search={projectSearch} setSearch={setProjectSearch} onOpen={activateProject} onNew={createProject} onRename={renameProject} onCopy={copyProject} onDelete={id=>{void deleteProject(id)}} onClose={()=>setProjectListOpen(false)}/>}
    {exportOpen&&<ExportDialog errors={checks.errors} warnings={warnings} busy={exportBusy} error={exportError} onClose={()=>setExportOpen(false)} onExport={runExport}/>}
  </div>;
}
function PaperFooter({page}:{page:string}) {return <div className="paper-footer"><span>MAPLE LEAF EDU-TRAVEL</span><span>STUDY TOUR PROPOSAL · {page}</span></div>}
function Cover({title,subtitle,destination,days,nights,image}:{title:string,subtitle:string,destination:string,days:number,nights:number,image:string}) {return <div className="cover-page">{image&&<img src={image} className="cover-image"/>}<div className="cover-shade"/><div className="cover-top"><div className="cover-logo"><BrandLogo variant="cover"/></div><span>STUDY TOUR PROPOSAL</span></div><div className="cover-middle"><div className="cover-rule"/><div className="cover-kicker">PROGRAMME PROPOSAL</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="cover-bottom"><div><span>DESTINATIONS</span><strong>{destination}</strong></div><div><span>DURATION</span><strong>{days} DAYS<br/>{nights} NIGHTS</strong></div></div></div>}
function Overview({headline,summary,destination,audience,days,nights,learningIntent,image,featureValue,featureLabel,documentPage=2}:{documentPage?:number;headline:string,summary:string,destination:string,audience:string,days:number,nights:number,learningIntent:string,image:string,featureValue:string,featureLabel:string}) {return <div className="paper-inner overview-page"><div className="doc-masthead"><BrandLogo/></div><div className="doc-kicker">01 / THE PROGRAMME</div><h1>{headline}</h1><p className="overview-lead">{summary}</p>{image&&<div className="overview-photo"><img src={image}/><span>{destination}</span></div>}<div className="overview-metrics"><div><b>{String(days).padStart(2,'0')}</b><span>DAYS OF DISCOVERY</span></div><div><b>{String(nights).padStart(2,'0')}</b><span>NIGHTS</span></div>{(featureValue||featureLabel)&&<div><b>{featureValue}</b><span>{featureLabel}</span></div>}</div><div className="overview-bottom"><div><span className="doc-kicker">AT A GLANCE</span><p>{destination}<br/>{days} days · {nights} nights<br/>For {audience}</p></div><div><span className="doc-kicker">LEARNING INTENT</span><p>{learningIntent}</p></div></div><PaperFooter page={String(documentPage).padStart(2,'0')}/></div>}
function Highlights({highlights,documentPage=3}:{highlights:Highlight[];documentPage?:number}) {return <div className="paper-inner highlights-page"><div className="doc-masthead"><BrandLogo/></div><div className="doc-kicker">02 / PROGRAMME HIGHLIGHTS</div><h1>Programme Highlights</h1><div className="highlight-grid">{highlights.map(h=><article className={h.image?'':'without-photo'} key={h.num}>{h.image&&<div className="highlight-photo"><img src={h.image} alt=""/><span>{h.num}</span></div>}<div className="highlight-body"><span className="highlight-number">{h.num}</span><h2>{h.title}</h2><p>{h.text}</p></div></article>)}</div><PaperFooter page={String(documentPage).padStart(2,'0')}/></div>}
function ProgramItinerary({days,destination,showDates,dateFor,nights,offset=0,totalDays=days.length,documentPage=4}:{days:Day[],destination:string,showDates:boolean,dateFor:(day:Day,index:number)=>string,nights:number,offset?:number,totalDays?:number,documentPage?:number}) {return <div className="program-page"><div className="program-top"><div className="doc-masthead"><BrandLogo/></div><span>{totalDays} DAYS / {nights} NIGHTS</span></div><div className="program-heading"><div><div className="doc-kicker">03 / AT A GLANCE</div><h1>Program Itinerary</h1></div><p>{destination}</p></div><div className={'program-table '+(showDates?'':'without-date')}><div className="program-row program-header"><span>DAY</span>{showDates&&<span>DATE</span>}<span>BREAKFAST</span><span>MORNING</span><span>LUNCH</span><span>AFTERNOON</span><span>DINNER</span><span>EVENING</span></div>{days.map((day,index)=><div className="program-row" key={index}><span className="day-cell">{String(offset+index+1).padStart(2,'0')}</span>{showDates&&<span className="pending-cell">{dateFor(day,offset+index)||'—'}</span>}<span>{day.breakfast||'—'}</span><span>{day.city&&<small className="program-city">{day.city}</small>}{day.morning}</span><span>{day.lunch||'—'}</span><span>{day.afternoon}</span><span>{day.dinner||'—'}</span><span>{day.evening}</span></div>)}</div><div className="program-footer">MAPLE LEAF EDU-TRAVEL <span>PROGRAM ITINERARY · {String(documentPage).padStart(2,'0')}</span></div></div>}

createRoot(document.getElementById('root')!).render(<App/>);
