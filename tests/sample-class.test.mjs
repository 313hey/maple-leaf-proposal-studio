import test from 'node:test';
import assert from 'node:assert/strict';
import {classColumns,addClassColumn,removeClassColumn,moveClassColumn,copyClassDay,duplicateClassRow,copyPreviousClassRow} from '../src/sample-class-data.ts';
import {blankProject} from '../src/project-store.ts';
import {parseProjectBackup,planRestore} from '../src/project-backup.ts';
const legacy=()=>({title:'Schedule',notes:['User note'],rows:[{time:'09:00',cells:['A','B','C','D','E']},{time:'10:00',cells:['Shared'],fullSpan:true}]});
test('旧五列课表无需迁移；新增列为空，重排与删除跟随原课程且不改原对象',()=>{
 const old=legacy();assert.deepEqual(classColumns(old),['Monday','Tuesday','Wednesday','Thursday','Friday']);
 const six=addClassColumn(old);assert.equal(six.rows[0].cells[5],'');assert.equal(six.rows[1].fullSpan,false);assert.deepEqual(six.rows[1].cells,['Shared','Shared','Shared','Shared','Shared','']);
 const moved=moveClassColumn(six,0,1);assert.deepEqual(moved.rows[0].cells.slice(0,2),['B','A']);assert.deepEqual(moved.columns.slice(0,2),['Tuesday','Monday']);
 const removed=removeClassColumn(moved,1);assert.deepEqual(removed.rows[0].cells,['B','C','D','E','']);assert.deepEqual(old,legacy());
 assert.throws(()=>removeClassColumn({...old,columns:['Only']},0));assert.throws(()=>addClassColumn({...old,columns:Array(7).fill('Day')}));
});
test('复制整天仅替换目标列，跨列内容保留；复制行是独立副本，上一行不覆盖时段时间',()=>{
 const old=legacy(),copy=copyClassDay(old,0,3);assert.deepEqual(copy.rows[0].cells,['A','B','C','A','E']);assert.deepEqual(copy.rows[1],old.rows[1]);assert.deepEqual(old,legacy());
 const duplicated=duplicateClassRow(old,0);duplicated.rows[1].cells[0]='Changed';assert.equal(duplicated.rows[0].cells[0],'A');assert.equal(old.rows.length,2);
 const previous=copyPreviousClassRow(old,1);assert.equal(previous.rows[1].time,'10:00');assert.deepEqual(previous.rows[1].cells,old.rows[0].cells);assert.equal(previous.rows[1].fullSpan,undefined);
});
test('自定义课表列随完整备份恢复，旧备份仍可读取，损坏列设置拒绝恢复',()=>{
 const p=blankProject();p.sampleClass={...legacy(),columns:['Day A','Day B','Day C']};
 const encode=p=>JSON.stringify({format:'maple-leaf-projects',version:1,projects:[p]});
 const restored=planRestore(parseProjectBackup(encode(p)),[p],'copy');assert.deepEqual(restored[0].sampleClass,p.sampleClass);assert.notEqual(restored[0].id,p.id);
 const old=blankProject();old.sampleClass=legacy();assert.equal(classColumns(parseProjectBackup(encode(old))[0].sampleClass).length,5);
 for(const columns of [[],[10],Array(8).fill('X'),'Monday'])assert.throws(()=>parseProjectBackup(encode({...p,sampleClass:{...p.sampleClass,columns}})));
});
