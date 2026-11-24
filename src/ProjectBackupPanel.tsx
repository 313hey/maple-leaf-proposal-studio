import React,{useState} from 'react';
import type {ProjectData} from './project-store';
import {makeProjectBackup,parseProjectBackup,planRestore,type ConflictPolicy} from './project-backup';
async function downloadBackup(projects:ProjectData[],filename:string):Promise<void>{
 const blob=await makeProjectBackup(projects);
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function ProjectBackupPanel({projects,onRestore,loadAllProjects,loadLocalProjects}:{projects:ProjectData[];onRestore:(p:ProjectData[])=>Promise<void>;loadAllProjects?:()=>Promise<ProjectData[]>;loadLocalProjects?:()=>Promise<ProjectData[]>}){
 const [pending,setPending]=useState<ProjectData[]>([]),[selected,setSelected]=useState<string[]>([]),[policy,setPolicy]=useState<ConflictPolicy>('copy'),[replaceConfirmed,setReplaceConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cloudReadFailed,setCloudReadFailed]=useState(false);
 const backupAll=async()=>{
  setBusy(true);setCloudReadFailed(false);setMessage('正在读取完整方案并打包图片…');
  let complete:ProjectData[];
  try{complete=loadAllProjects?await loadAllProjects():projects}
  catch(error){setCloudReadFailed(true);setMessage(`完整备份未生成：${String(error)}。可单独导出本机方案。`);setBusy(false);return}
  try{await downloadBackup(complete,'Maple_Leaf_Projects_Backup.json');setMessage(`已导出 ${complete.length} 个项目，包含图片。`)}
  catch(error){setMessage(`备份文件生成失败：${String(error)}`)}
  finally{setBusy(false)}
 };
 const backupLocal=async()=>{
  if(!loadLocalProjects)return;
  setBusy(true);setMessage('正在读取本机方案…');
  try{const local=await loadLocalProjects();if(!local.length){setMessage('本机暂无可备份方案。');return}await downloadBackup(local,'Maple_Leaf_Local_Projects_Backup.json');setMessage(`已导出本机 ${local.length} 个方案及图片；不包含尚未缓存到本机的云端方案。`)}
  catch(error){setMessage(`本机备份失败：${String(error)}`)}
  finally{setBusy(false)}
 };
 return <><h3>项目完整备份</h3><p>包含全部项目、图片、行程、报价、课程表和项目内景点副本。独立景点资源库仍需单独备份。</p><div className="backup-files"><button disabled={busy} onClick={backupAll}>备份全部项目</button><label>恢复项目备份<input type="file" accept=".json,application/json" disabled={busy} onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;setMessage('');try{const list=parseProjectBackup(await f.text());setPending(list);setSelected(list.map(p=>p.id));setPolicy('copy');setReplaceConfirmed(false)}catch(error){setMessage(String(error))}}}/></label></div>{message&&<p role="status">{message}</p>}{cloudReadFailed&&loadLocalProjects&&<p><button disabled={busy} onClick={backupLocal}>仅备份本机方案</button><br/>本机备份不包含尚未缓存到本机的云端方案，可用于故障时恢复已有副本。</p>}
 {pending.length>0&&<div className="import-backdrop"><section className="import-dialog" role="dialog" aria-modal="true" aria-label="确认恢复项目"><h2>核对并恢复项目</h2><p>备份包含 {pending.length} 个项目。默认生成独立副本，确认前不写入。</p><div className="backup-summary">{pending.map(p=><label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,p.id]:current.filter(id=>id!==p.id))}/><span>{p.name} · {p.days.length} 天 {projects.some(old=>old.id===p.id||old.name===p.name)?' · 已有同 ID 或同名项目':''}</span></label>)}</div><div className="backup-policy"><label>冲突处理 <select aria-label="恢复冲突处理" value={policy} onChange={e=>{setPolicy(e.target.value as ConflictPolicy);setReplaceConfirmed(false)}}><option value="copy">全部恢复为新副本（推荐）</option><option value="skip">跳过相同 ID 或同名项目</option><option value="replace">替换相同 ID，其余新增</option></select></label>{policy==='replace'&&<label><input type="checkbox" checked={replaceConfirmed} onChange={e=>setReplaceConfirmed(e.target.checked)}/> 我确认替换同 ID 项目，当前内容将被覆盖；建议先备份。</label>}</div><div className="backup-controls"><button disabled={busy} onClick={()=>setPending([])}>取消</button><button disabled={busy||!selected.length||(policy==='replace'&&!replaceConfirmed)} onClick={async()=>{setBusy(true);try{const list=planRestore(pending.filter(p=>selected.includes(p.id)),projects,policy);await onRestore(list);setMessage(`已恢复 ${list.length} 个项目，跳过 ${selected.length-list.length} 个。`);setPending([])}catch(e){setMessage(String(e))}finally{setBusy(false)}}}>{busy?'恢复中…':'确认恢复'}</button></div>{message&&<p role="alert">{message}</p>}</section></div>}
 </>;
}
