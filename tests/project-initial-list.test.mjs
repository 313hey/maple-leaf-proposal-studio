import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {blankProject,loadLocalProjects,loadProjectDetail,loadProjectList,projectListItem,saveProjectLocally} from '../src/project-store.ts';

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
