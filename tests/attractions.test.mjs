import test from 'node:test';
import assert from 'node:assert/strict';
import { attractionPages, emptyAttraction, snapshotAttraction } from '../src/attractions-types.ts';
import { possibleDuplicate, recommendAttraction } from '../src/attraction-recommend.ts';

test('六个和七个景点分别排成三页和四页，顺序不变',()=>{
  const items=Array.from({length:7},(_,index)=>({...emptyAttraction(),id:String(index)}));
  assert.deepEqual(attractionPages(items.slice(0,6)).map(page=>page.length),[2,2,2]);
  assert.deepEqual(attractionPages(items).map(page=>page.length),[2,2,2,1]);
  assert.deepEqual(attractionPages(items).flat().map(item=>item.id),items.map(item=>item.id));
});

test('从资源库加入方案后，文字和图片数组是独立副本',()=>{
  const original={...emptyAttraction(),nameEn:'BYD History Museum',images:['data:image/png;base64,AA==']};
  const snapshot=snapshotAttraction(original);
  snapshot.nameEn='Project wording';snapshot.images.push('second');
  assert.equal(original.nameEn,'BYD History Museum');assert.equal(original.images.length,1);
  assert.equal(snapshot.libraryId,original.id);assert.notEqual(snapshot.id,original.id);
});

test('搜索重复名称时提示潜在重复，推荐字段仍可由用户改写',()=>{
  const existing={...emptyAttraction(),nameEn:'Sanxingdui Museum'};
  assert.equal(possibleDuplicate({...emptyAttraction(),nameEn:'Sanxingdui'},[existing])?.id,existing.id);
  assert.equal(recommendAttraction('Shenzhen Lianhua Mountain Park').city,'Shenzhen');
  assert.equal(recommendAttraction('Shenzhen Lianhua Mountain Park').category,'Nature');
});

import {applyAttractionSelection} from '../src/attraction-selection.ts';
test('选景批量添加保持独立；替换必须单选且只改原位置，不追加其他景点',()=>{
 const a={...emptyAttraction(),nameEn:'Shanghai Museum',images:['original']},b={...emptyAttraction(),nameEn:'Shenzhen Bay Park'},c={...emptyAttraction(),nameEn:'The Bund'};
 const existing=applyAttractionSelection([], [a,b]);assert.equal(existing.length,2);const replaced=applyAttractionSelection(existing,[c],existing[0].id);assert.equal(replaced.length,2);assert.equal(replaced[0].nameEn,'The Bund');assert.equal(replaced[1],existing[1]);assert.equal(existing[0].nameEn,'Shanghai Museum');replaced[0].descriptionEn='Project only';assert.equal(c.descriptionEn,'');assert.throws(()=>applyAttractionSelection(existing,[b,c],existing[0].id));assert.throws(()=>applyAttractionSelection(existing,[c],'missing'));const added=applyAttractionSelection(existing,[c]);assert.equal(added.length,3);assert.equal(added[2].libraryId,c.id);
});
