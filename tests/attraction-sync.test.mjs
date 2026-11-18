import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAttraction} from '../src/attractions-types.ts';
import {mergeAttractionSummary,nextAttractionUpdatedAt,preferLocalAttraction,upsertAttractionSummary} from '../src/attraction-sync.ts';

const summary=(id,updatedAt,overrides={})=>({id,updatedAt,nameEn:`Place ${id}`,nameZh:'',city:'Shanghai',category:'Culture',tags:['Culture'],aliases:[],...overrides});

test('本次写入时间严格晚于所依据的云端版本，避免同毫秒保存绕过并发保护',()=>{
 const base='2026-11-18T10:00:00.000Z';assert.equal(nextAttractionUpdatedAt(base,base,Date.parse(base)), '2026-11-18T10:00:00.001Z');
});

test('本机较新的完整景点优先于较旧云端摘要，图片及正文不丢失',()=>{
 const local={...emptyAttraction(),id:'one',updatedAt:'2026-11-18T10:00:00.000Z',nameEn:'Local newer title',descriptionEn:'Offline edit',images:['data:image/png;base64,kept']};
 const merged=mergeAttractionSummary(summary('one','2026-11-18T09:00:00.000Z',{nameEn:'Old cloud title'}),local);
 assert.equal(merged.nameEn,'Local newer title');assert.equal(merged.descriptionEn,'Offline edit');assert.deepEqual(merged.images,local.images);
});

test('较新云端摘要只更新目录字段，不抹掉已缓存详情和图片',()=>{
 const local={...emptyAttraction(),id:'one',updatedAt:'2026-11-18T09:00:00.000Z',nameEn:'Old title',descriptionEn:'Kept until detail opens',images:['cover']};
 const merged=mergeAttractionSummary(summary('one','2026-11-18T10:00:00.000Z',{nameEn:'Updated title'}),local);
 assert.equal(merged.nameEn,'Updated title');assert.equal(merged.descriptionEn,'Kept until detail opens');assert.deepEqual(merged.images,['cover']);assert.equal(merged.summaryOnly,true);
});

test('Realtime 事件仅替换对应景点；重复或较旧事件不触碰其他卡片',()=>{
 const first={...emptyAttraction(),id:'one',nameEn:'Old',updatedAt:'2026-11-18T09:00:00.000Z'},other={...emptyAttraction(),id:'two',nameEn:'Unchanged',updatedAt:'2026-11-18T09:00:00.000Z'},items=[first,other];
 const next=upsertAttractionSummary(items,summary('one','2026-11-18T10:00:00.000Z',{nameEn:'New'}));
 assert.equal(next[0].nameEn,'New');assert.equal(next[1],other);assert.equal(upsertAttractionSummary(next,summary('one','2026-11-18T09:30:00.000Z')),next);
});

test('详情读取保留较新的本机编辑及尚未同步的版本',()=>{
 const local={...emptyAttraction(),id:'one',updatedAt:'2026-11-18T10:00:00.000Z',descriptionEn:'Local edit',images:['local image']};
 const remote={...local,updatedAt:'2026-11-18T09:00:00.000Z',descriptionEn:'Old cloud',images:['old image']};
 assert.equal(preferLocalAttraction(local,remote),local);
 assert.equal(preferLocalAttraction(local,{...remote,updatedAt:'2026-11-18T11:00:00.000Z'},true),local);
 assert.equal(preferLocalAttraction(local,{...remote,updatedAt:'2026-11-18T11:00:00.000Z'}).descriptionEn,'Old cloud');
});
