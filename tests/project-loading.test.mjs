import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {blankProject,loadAllProjectsForBackup,loadLocalProjects,loadProjectDetail,loadProjectList,reconcileCloudProject,saveProjectLocally} from '../src/project-store.ts';
import {nextCloudProjectVersion} from '../src/cloud-store.ts';

const image='data:image/png;base64,project-cover-bytes';

test('proposal list, detail, and explicit backup preserve complete local content and images',async()=>{
 const project={...blankProject(),name:'Cached study tour',coverImage:image,days:[{title:'Day 1',morning:'Campus visit',afternoon:'Workshop',evening:'',image}]};
 await saveProjectLocally(project);

 const list=await loadProjectList();
 assert.equal(list.length,1);
 assert.equal(list[0].name,project.name);
 // The project switcher receives metadata only, without image payloads.
 assert.equal(list[0].coverImage,'');
 const detail=await loadProjectDetail(project.id);
 assert.deepEqual(detail,project);

 const backup=await loadAllProjectsForBackup();
 assert.equal(backup.length,1);
 assert.equal(backup[0].coverImage,image);
 assert.equal(backup[0].days[0].image,image);
 assert.deepEqual(await loadLocalProjects(),[project]);
});

test('opening one cached proposal does not mutate or discard other cached proposals',async()=>{
 const first={...blankProject(),name:'First',coverImage:image};
 const second={...blankProject(),name:'Second',days:[{title:'Day 1',morning:'Preserve me',afternoon:'',evening:''}]};
 await saveProjectLocally(first);await saveProjectLocally(second);
 const opened=await loadProjectDetail(first.id);
 assert.equal(opened.coverImage,image);
 const list=await loadProjectList();
 const ids=new Set(list.map(item=>item.id));
 assert.ok(ids.has(first.id));assert.ok(ids.has(second.id));
 assert.equal((await loadLocalProjects()).find(item=>item.id===second.id).days[0].morning,'Preserve me');
});

test('a delayed older cloud event cannot replace newer local edits or embedded images',async()=>{
 const current={...blankProject(),name:'Local newer version',updatedAt:'2026-11-19T10:00:02.000Z',coverImage:image,summary:'Local unsynced text'};
 await saveProjectLocally(current);
 const stale={...current,name:'Stale cloud version',updatedAt:'2026-11-19T10:00:01.000Z',coverImage:'',summary:'Old text'};
 const selected=await reconcileCloudProject(stale);
 assert.equal(selected.name,current.name);
 assert.equal(selected.summary,current.summary);
 assert.equal(selected.coverImage,image);
 assert.deepEqual((await loadLocalProjects()).find(item=>item.id===current.id),current);
});

test('cloud compare-and-set version advances beyond the expected version even within one millisecond',()=>{
 const expected='2026-11-19T10:00:00.000Z';
 assert.equal(nextCloudProjectVersion(expected,expected,Date.parse(expected)),'2026-11-19T10:00:00.001Z');
 assert.equal(nextCloudProjectVersion('2026-11-19T10:00:05.000Z',expected,Date.parse(expected)),'2026-11-19T10:00:05.000Z');
 assert.equal(nextCloudProjectVersion(expected,null,Date.parse(expected)),expected);
});
