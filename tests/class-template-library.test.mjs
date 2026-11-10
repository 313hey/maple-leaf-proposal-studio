import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSampleClass} from '../src/sample-class-seed.ts';
import {loadClassTemplates,saveClassTemplate,deleteClassTemplate,backupClassTemplates,parseClassTemplateBackup,restoreClassTemplates,newClassTemplate,classTemplateSnapshot} from '../src/class-template-store.ts';

test('公开版课表模板库以空白状态启动，创建、复制快照和备份恢复可用',async()=>{
 assert.deepEqual(initialSampleClass,{title:'',notes:[],rows:[]});
 assert.deepEqual(await loadClassTemplates(),[]);
 const data={title:'Editable sample',columns:['Mon','Tue'],notes:['Note'],rows:[{time:'09:00–10:00',cells:['Math','Science']},{time:'10:00–11:00',cells:['Lunch'],fullSpan:true}]};
 const template=newClassTemplate('Example','Shenzhen',data);await saveClassTemplate(template);
 const applied=classTemplateSnapshot(template);applied.rows[0].cells[0]='Project-only edit';
 assert.equal((await loadClassTemplates())[0].data.rows[0].cells[0],'Math');
 const backup=parseClassTemplateBackup(await (await backupClassTemplates()).text());assert.equal(backup.length,1);assert.deepEqual(backup[0].data,data);
 assert.equal(await restoreClassTemplates(backup,'copy'),1);assert.equal((await loadClassTemplates()).length,2);
 await deleteClassTemplate(template.id);assert.equal((await loadClassTemplates()).length,1);
});
