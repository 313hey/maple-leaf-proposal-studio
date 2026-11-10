import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyAttraction,snapshotAttraction} from '../src/attractions-types.ts';
import {imagePosition,learningDisplay,planAttractionPages} from '../src/attraction-layout.ts';
import {blankProject} from '../src/project-store.ts';
import {parseProjectBackup} from '../src/project-backup.ts';

test('短标签沿用完整结构化条目；长句原文不截取、不自动改写，展示覆盖仅属于项目副本',()=>{
 const source={...emptyAttraction(),learningEn:'Cultural Heritage — Discover the historical roots and traditional architecture.\nUrban Regeneration — Explore how old streets become creative cultural spaces.'};
 const copy=snapshotAttraction(source),before=structuredClone(source);
 const original=learningDisplay(copy,'en');assert.equal(original.needsEditing,true);assert.deepEqual(original.tags,[]);assert.equal(original.text,source.learningEn);
 copy.presentation={highlightsEn:['Lingnan Heritage','Regional History','Urban Regeneration']};
 assert.deepEqual(learningDisplay(copy,'en').tags,copy.presentation.highlightsEn);assert.equal(copy.learningEn,source.learningEn);assert.deepEqual(source,before);
 copy.presentation.highlightsEn=['A long complete learning sentence that must stay readable instead of being cut in half.'];assert.equal(learningDisplay(copy,'en').text,copy.presentation.highlightsEn[0]);
 const dapeng={...emptyAttraction(),learningEn:'Ming Dynasty Coastal Defence\nHistoric Fortification Design\nOrigins of “Pengcheng”'};assert.equal(learningDisplay(dapeng,'en').tags.length,3);
 assert.equal(learningDisplay({...emptyAttraction(),learningZh:'岭南文化\n区域历史\n城市更新'},'zh').tags.length,3);
});

test('先正常双页布局，再压缩间距，超出时转为单页；按内容分配剩余空间并保留顺序',()=>{
 const items=Array.from({length:5},(_,i)=>({...emptyAttraction(),id:String(i),nameEn:`Site ${i}`}));
 const result=planAttractionPages(items,{normal:[245,245,300,260,310],compact:[230,230,269,245,290],available:530,gap:16});
 assert.deepEqual(result.pages.map(p=>p.items.map(a=>a.id)),[['0','1'],['2','3'],['4']]);assert.deepEqual(result.pages.map(p=>p.compact),[false,true,false]);
 for(const page of result.pages)assert.ok(Math.abs(page.heights.reduce((a,b)=>a+b,0)+(page.items.length-1)*16-530)<.01);
 assert.deepEqual(result.pages.map(p=>p.offset),[0,2,4]);assert.deepEqual(result.errors,[]);
 const fallback=planAttractionPages(items.slice(0,3),{normal:[380,260,240],compact:[350,245,230],available:530,gap:16});assert.deepEqual(fallback.pages.map(p=>p.items.length),[1,2]);assert.deepEqual(fallback.pages.map(p=>p.offset),[0,1]);
 const oversize=planAttractionPages(items.slice(0,1),{normal:[800],compact:[720],available:530,gap:16});assert.match(oversize.errors[0],/Site 0/);assert.equal(oversize.pages[0].heights[0],720);
});

test('旧项目默认居中裁切；展示标签和裁切位置随备份保留，无效位置拒绝恢复',()=>{
 const item=snapshotAttraction({...emptyAttraction(),images:['original-photo']});assert.deepEqual(imagePosition(item),{x:50,y:50});
 item.presentation={highlightsEn:['History','Architecture'],imagePosition:{x:25,y:80}};
 const project={...blankProject(),attractions:[item]};
 const backup=()=>JSON.stringify({format:'maple-leaf-projects',version:1,projects:[project]});
 assert.deepEqual(parseProjectBackup(backup())[0].attractions[0].presentation,item.presentation);assert.deepEqual(item.images,['original-photo']);
 item.presentation.imagePosition.x=150;assert.throws(()=>parseProjectBackup(backup()),/景点资料无效/);assert.equal(imagePosition(item).x,100);
});
