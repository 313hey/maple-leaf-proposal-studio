import React, { useState } from 'react';
import { Copy, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { ProjectData } from './project-store';
import './projects.css';

export function ProjectListDialog({projects,activeId,search,setSearch,onOpen,onNew,onRename,onCopy,onDelete,onClose}:{projects:ProjectData[];activeId:string;search:string;setSearch:(value:string)=>void;onOpen:(project:ProjectData)=>void;onNew:()=>void;onRename:(id:string,name:string)=>void;onCopy:(id:string)=>void;onDelete:(id:string)=>void;onClose:()=>void}) {
  const [editingId,setEditingId]=useState<string|null>(null);
  const [draftName,setDraftName]=useState('');
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const visible=projects.filter(item=>`${item.name} ${item.title} ${item.destination}`.toLowerCase().includes(search.trim().toLowerCase()));
  const saveName=()=>{if(editingId&&draftName.trim()){onRename(editingId,draftName.trim());setEditingId(null);}};
  return <div className="projects-backdrop" role="presentation" onClick={onClose}><div className="projects-dialog" role="dialog" aria-modal="true" aria-label="所有项目" onClick={event=>event.stopPropagation()}>
    <div className="projects-dialog-head"><div><span className="eyebrow">MY PROJECTS</span><h2>所有项目</h2><p>选择项目继续编辑，或创建一份空白方案。</p></div><button className="projects-close" aria-label="关闭项目列表" onClick={onClose}><X size={17}/></button></div>
    <div className="projects-dialog-tools"><label><Search size={15}/><input aria-label="搜索项目" placeholder="搜索项目名称或目的地" value={search} onChange={event=>setSearch(event.target.value)}/></label><button onClick={onNew}><Plus size={15}/> 新建方案</button></div>
    <div className="projects-list">{visible.length===0?<p className="projects-empty">没有找到项目。</p>:visible.map(item=><div className={`projects-list-item ${item.id===activeId?'active':''}`} key={item.id}>
      {editingId===item.id?<div className="projects-rename"><input aria-label="新项目名称" value={draftName} onChange={event=>setDraftName(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')saveName();if(event.key==='Escape')setEditingId(null)}} autoFocus/><button onClick={saveName}>保存名称</button><button onClick={()=>setEditingId(null)}>取消</button></div>:<><button className="projects-open" onClick={()=>onOpen(item)}><span className="projects-item-thumb">✦</span><span><strong>{item.name||'未命名项目'}</strong><small>{item.title||'尚未填写方案名称'} · {new Date(item.updatedAt).toLocaleDateString('zh-CN')}</small></span></button>
      <div className="projects-row-actions"><button aria-label={`重命名 ${item.name}`} title="重命名" onClick={()=>{setEditingId(item.id);setDraftName(item.name)}}><Pencil size={15}/></button><button aria-label={`复制 ${item.name}`} title="复制" onClick={()=>onCopy(item.id)}><Copy size={15}/></button><button aria-label={`删除 ${item.name}`} title="删除" onClick={()=>setDeleteId(item.id)}><Trash2 size={15}/></button></div></>}
    </div>)}</div>
    {deleteId&&<div className="projects-delete-confirm" role="alertdialog" aria-label="确认删除项目"><span>确定删除「{projects.find(item=>item.id===deleteId)?.name}」吗？此操作无法撤销。</span><button onClick={()=>setDeleteId(null)}>取消</button><button onClick={()=>{onDelete(deleteId);setDeleteId(null)}}>确认删除</button></div>}
  </div></div>;
}
