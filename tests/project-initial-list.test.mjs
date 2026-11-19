import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {blankProject,hasPendingProject,loadAllProjectsForBackup,loadLocalProjects,loadProjectDetail,loadProjectList,projectListItem,saveProjectLocally} from '../src/project-store.ts';
import {pendingSyncDecision,reconcileProjectDirectory} from '../src/project-reconcile.ts';

test('历史方案目录只显示摘要，完整图片和报价仍留在本机方案中',async()=>{
 const project={...blankProject(),name:'Historical programme',programmeType:'school',coverImage:'data:image/png;base64,preserved',fee:'8200',days:[{title:'',morning:'Campus',afternoon:'',evening:''}]};
 await saveProjectLocally(project);
 const cached=await loadLocalProjects();
 const list=await loadProjectList(cached);
 const row=list.find(item=>item.id===project.id);
 assert.equal(row.name,project.name);
 assert.equal(row.programmeType,'school');
 assert.equal(row.summaryOnly,true);
 assert.equal(row.coverImage,'');
 assert.equal(row.fee,'');
 assert.deepEqual(await loadProjectDetail(project.id),project);
});

test('方案摘要对象不包含其他项目的内容',()=>{
 const first={...blankProject(),name:'First',coverImage:'first-image'};
 const second={...blankProject(),name:'Second',coverImage:'second-image'};
 assert.equal(projectListItem(first).coverImage,'');
 assert.equal(projectListItem(second).coverImage,'');
 assert.notEqual(projectListItem(first).id,projectListItem(second).id);
});

test('云端已删除的旧方案从目录移除，但未同步的本机编辑与新方案保留',()=>{
 const old={...blankProject(),name:'Deleted remotely'};
 const edited={...blankProject(),name:'Pending offline edit',coverImage:'data:image/png;base64,kept'};
 const created={...blankProject(),name:'Created offline'};
 const result=reconcileProjectDirectory([old,edited,created],[],new Set([edited.id,created.id]),new Set([old.id,edited.id]),true);
 assert.deepEqual(result.remoteDeletedIds,[old.id]);
 assert.deepEqual(new Set(result.items.map(item=>item.id)),new Set([edited.id,created.id]));
 assert.equal(result.items.find(item=>item.id===edited.id).coverImage,edited.coverImage);
});

test('远端更新不能覆盖本机待同步版本；旧本机数据在首次迁移前保留',()=>{
 const local={...blankProject(),updatedAt:'2026-11-19T10:00:00.000Z',title:'Offline version'};
 const summary={id:local.id,updatedAt:'2026-11-19T11:00:00.000Z',name:'Cloud version',title:'Cloud version',destination:'',createdAt:local.createdAt,programmeType:'',isDemo:false};
 const pending=reconcileProjectDirectory([local],[summary],new Set([local.id]),new Set([local.id]),true);
 assert.equal(pending.items[0].title,'Offline version');
 const clean=reconcileProjectDirectory([local],[summary],new Set(),new Set([local.id]),true);
 assert.equal(clean.items[0].title,'Cloud version');
 const legacy=reconcileProjectDirectory([local],[],new Set(),new Set(),false);
 assert.equal(legacy.items[0].id,local.id);
 assert.deepEqual(reconcileProjectDirectory([local],[],new Set(),new Set(),true).remoteDeletedIds,[local.id]);
});

test('远端删除只隐藏本机缓存，完整备份仍可恢复原项目和图片',async()=>{
 const project={...blankProject(),name:'Recoverable deleted cloud record',coverImage:'data:image/png;base64,preserved'};
 await saveProjectLocally(project);
 const values=new Map([['maple-leaf-remote-deleted-project-ids-v1',JSON.stringify([project.id])]]);
 const previous=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 try{
  assert.equal((await loadLocalProjects()).some(item=>item.id===project.id),false);
  const backup=await loadAllProjectsForBackup();
  assert.equal(backup.find(item=>item.id===project.id)?.coverImage,project.coverImage);
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous}
});

test('空库离线创建可在本机保存，并留下待同步记录',async()=>{
 const project={...blankProject(),name:'Offline starter',title:'Edited while offline'};
 await saveProjectLocally(project,true);
 assert.equal((await loadLocalProjects()).find(item=>item.id===project.id)?.title,'Edited while offline');
 assert.equal(await hasPendingProject(project.id),true);
});

test('重连时仅安全版本可自动同步；远端删除与并发修改保留本机待处理副本',()=>{
 assert.equal(pendingSyncDecision(undefined,undefined,false),'insert');
 assert.equal(pendingSyncDecision('2026-11-19T09:00:00Z','2026-11-19T09:00:00Z',false),'update');
 assert.equal(pendingSyncDecision('2026-11-19T09:00:00Z',undefined,false),'conflict');
 assert.equal(pendingSyncDecision('2026-11-19T09:00:00Z','2026-11-19T10:00:00Z',false),'conflict');
 assert.equal(pendingSyncDecision(undefined,'2026-11-19T10:00:00Z',false),'conflict');
 assert.equal(pendingSyncDecision(undefined,undefined,true),'conflict');
});
