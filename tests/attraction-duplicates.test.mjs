import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {emptyAttraction,snapshotAttraction} from '../src/attractions-types.ts';
import {findAttractionDuplicates,normalizeAttractionName} from '../src/attraction-recommend.ts';
import {loadAttractions,loadAttractionDetails,pendingAttractionExpectedVersion,saveAttraction,saveAttractions} from '../src/attractions-store.ts';
import {blankProject,loadProjects,saveProject} from '../src/project-store.ts';
const resource=(en,zh='',city='Shanghai')=>({...emptyAttraction(),nameEn:en,nameZh:zh,city});

test('上海博物馆与城市规划展示馆互不匹配；城市和通用类型词不能建立资源身份',()=>{
 const museum=resource('Shanghai Museum','上海博物馆'),planning=resource('Shanghai Urban Planning Exhibition Center','上海城市规划展示馆');
 assert.deepEqual(findAttractionDuplicates(museum,[planning]),[]);assert.deepEqual(findAttractionDuplicates(planning,[museum]),[]);
 const nantou=resource('Nantou Ancient City','南头古城','Shenzhen');
 for(const en of ['Dapeng Ancient City','Qingyan Ancient City','Ancient City Park','Shenzhen Museum','Shenzhen Exhibition Center'])assert.deepEqual(findAttractionDuplicates(nantou,[resource(en,'','Shenzhen')]),[]);
 assert.deepEqual(findAttractionDuplicates(resource('Shanghai History Museum'),[resource('Shanghai Science Museum')]),[]);
 // Even an English city name absent from the known-city list cannot link different venue types.
 assert.deepEqual(findAttractionDuplicates(resource('Guangzhou Museum','','广州'),[resource('Guangzhou Park','','广州')]),[]);
});

test('根据ID排除自己；介绍修改不影响名称检测，也不把部分名称当作完全同名',()=>{
 const existing=resource('Shanghai Museum','上海博物馆');
 assert.deepEqual(findAttractionDuplicates({...existing,descriptionEn:'Changed introduction'},[existing]),[]);
 assert.deepEqual(findAttractionDuplicates(resource('Shanghai'),[existing]),[]);
 assert.deepEqual(findAttractionDuplicates(resource('Shanghai Museum East Branch'),[existing]),[]);
});

test('完整中英文名称规范化及明确别名优先匹配；不同ID的完全同名给出提醒',()=>{
 const museum=resource('Shanghai Museum','上海博物馆');
 assert.equal(normalizeAttractionName(' ＳＨＡＮＧＨＡＩ  Museum '),normalizeAttractionName(museum.nameEn));
 assert.equal(findAttractionDuplicates(resource('SHANGHAI  MUSEUM'),[museum])[0].kind,'exact');
 assert.equal(findAttractionDuplicates(resource('Other English Name','上海博物馆'),[museum])[0].kind,'exact');
 const aliases={...museum,aliases:['Shanghai Municipal Museum','上博']};
 const match=findAttractionDuplicates(resource('Shanghai Municipal Museum'),[aliases])[0];assert.equal(match.kind,'exact');assert.equal(match.via,'alias');
 assert.equal(findAttractionDuplicates(resource('','上博'),[aliases])[0].item.id,museum.id);
 assert.deepEqual(findAttractionDuplicates(resource('Museum'),[resource('Art Exhibition')]),[]);
});

test('相似提醒需要有辨识度的共同完整词；精确同名排序在相似项之前',()=>{
 const short=resource('Sanxingdui','','Chengdu'),museum=resource('Sanxingdui Museum','','Chengdu'),exact=resource('Sanxingdui','','Chengdu');
 assert.equal(findAttractionDuplicates(short,[museum])[0].kind,'similar');
 assert.deepEqual(findAttractionDuplicates(short,[museum,exact]).map(m=>m.kind),['exact','similar']);
 assert.deepEqual(findAttractionDuplicates(resource('Shanghai Park'),[resource('Shanghai Exhibition Center')]),[]);
});

test('保存使用资源ID，不合并其他同名项；确认同名后可持久写入，项目副本与原图不受影响',async()=>{
 const museum={...resource('Shanghai Museum','上海博物馆'),images:['data:image/png;base64,original'],descriptionEn:'Original introduction'},planning=resource('Shanghai Urban Planning Exhibition Center','上海城市规划展示馆');
 await saveAttractions([museum,planning]);
 const project={...blankProject(),attractions:[snapshotAttraction(museum)]};await saveProject(project);
 const beforePlanning=(await loadAttractions()).find(a=>a.id===planning.id);
 await saveAttraction({...museum,descriptionEn:'Revised introduction'});
 const duplicate={...resource('Shanghai Museum','上海博物馆'),descriptionEn:'A separate, explicitly confirmed resource',images:['another-image']};
 assert.equal(findAttractionDuplicates(duplicate,await loadAttractions())[0].kind,'exact');
 // The UI supplies the explicit confirmation; storage has no additional name-based veto.
 await saveAttraction(duplicate);
 const reopened=await loadAttractions();assert.equal(reopened.filter(a=>a.nameEn==='Shanghai Museum').length,2);assert.equal(reopened.find(a=>a.id===duplicate.id).descriptionEn,duplicate.descriptionEn);
 assert.equal(reopened.find(a=>a.id===museum.id).descriptionEn,'Revised introduction');assert.deepEqual(reopened.find(a=>a.id===museum.id).images,museum.images);assert.deepEqual(reopened.find(a=>a.id===planning.id),beforePlanning);
 assert.deepEqual((await loadProjects()).find(p=>p.id===project.id),project);
});

test('未配置云端时，单条及批量保存明确返回本机状态',async()=>{
 const item=resource('Local-only Attraction');
 assert.equal(await saveAttraction(item),'local');
 assert.equal(await saveAttractions([{...resource('Local-only Batch')}]),'local');
});

test('旧备份不能覆盖本机较新的景点及原图，离线详情可读取完整缓存',async()=>{
 const original={...resource('Offline Saved Place'),images:['data:image/png;base64,preserved'],descriptionEn:'Current text'};
 await saveAttraction(original);
 const current=(await loadAttractionDetails([original.id]))[0];
 assert.deepEqual(current.images,original.images);
 await assert.rejects(saveAttractions([{...original,descriptionEn:'Old backup',updatedAt:'2020-01-01T00:00:00.000Z'}]),/本机已有较新的景点版本/);
 const reopened=(await loadAttractionDetails([original.id]))[0];
 assert.equal(reopened.descriptionEn,'Current text');
 assert.deepEqual(reopened.images,original.images);
});

test('离线队列保留原云端版本，重试编辑时可以使用该版本进行条件写入',()=>{
 const previous=globalThis.localStorage;
 globalThis.localStorage={getItem:key=>key==='maple-studio-attractions-pending-v1'?JSON.stringify([{kind:'upsert',id:'pending-one',updatedAt:'2026-11-18T10:00:01.000Z',expectedUpdatedAt:'2026-11-18T10:00:00.000Z'},{kind:'upsert',id:'pending-new',updatedAt:'2026-11-18T10:00:01.000Z',expectedUpdatedAt:null}]):null};
 try{assert.equal(pendingAttractionExpectedVersion('pending-one'),'2026-11-18T10:00:00.000Z');assert.equal(pendingAttractionExpectedVersion('pending-new'),null);assert.equal(pendingAttractionExpectedVersion('other'),undefined)}
 finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous}
});
