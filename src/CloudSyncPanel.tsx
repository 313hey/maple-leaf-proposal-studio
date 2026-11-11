import {useEffect,useState} from 'react';
import {ArrowUpFromLine,Cloud,RefreshCw} from 'lucide-react';
import {cloudCounts,cloudEnabled,cloudMigrationComplete,markCloudMigrationComplete,migrateMissingRecords} from './cloud-store';
import {loadLocalAttractions} from './attractions-store';
import {loadLocalClassTemplates} from './class-template-store';
import {loadLocalProjects} from './project-store';

type Counts={projects:number;attractions:number;classTemplates:number};
const zero:Counts={projects:0,attractions:0,classTemplates:0};
export function CloudSyncPanel(){
 const [local,setLocal]=useState<Counts>(zero),[cloud,setCloud]=useState<Counts|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[migrationDone,setMigrationDone]=useState(cloudMigrationComplete());
 const refresh=async()=>{setError('');try{const [projects,attractions,classTemplates,remote]=await Promise.all([loadLocalProjects(),loadLocalAttractions(),loadLocalClassTemplates(),cloudEnabled?cloudCounts():Promise.resolve(null)]);setLocal({projects:projects.length,attractions:attractions.length,classTemplates:classTemplates.length});setCloud(remote)}catch(e){setError(e instanceof Error?e.message:String(e))}};
 useEffect(()=>{void refresh()},[]);
 const upload=async()=>{
  if(!cloudEnabled)return;
  if(!window.confirm(`将本机的 ${local.projects} 个方案、${local.attractions} 个景点和 ${local.classTemplates} 份课表模板加入共享云端。相同 ID 已存在时保留云端版本，不覆盖。云端内容可由任何网站访客查看、修改和删除。继续？`))return;
  setBusy(true);setError('');setMessage('');
  try{
   const [projects,attractions,classTemplates]=await Promise.all([loadLocalProjects(),loadLocalAttractions(),loadLocalClassTemplates()]);
   const [p,a,c]=await Promise.all([migrateMissingRecords('studio_projects',projects),migrateMissingRecords('studio_attractions',attractions),migrateMissingRecords('studio_class_templates',classTemplates)]);
   markCloudMigrationComplete();setMigrationDone(true);setMessage(`已新增 ${p} 个方案、${a} 个景点、${c} 份课表模板；原有云端记录未覆盖。`);await refresh();
   if(p+a+c)window.setTimeout(()=>window.location.reload(),1200);
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 };
 return <section className="cloud-sync-panel" aria-label="云端同步">
  <h3><Cloud size={16}/> 共享云端</h3>
  {!cloudEnabled?<><p>尚未连接云端；当前仍保存在本机浏览器。</p><p>连接 Supabase 后，这里可将项目、景点、课表模板及图片同步到网站共享库。</p><small>配置步骤见项目 README 的「云端同步」部分。</small></>:<>
   <p>公开共享模式：任何访客都能查看、修改和删除云端数据。</p>
   {cloud&&<p className="cloud-counts">本机 {local.projects} 个方案 · {local.attractions} 个景点 · {local.classTemplates} 份课表模板<br/>云端 {cloud.projects} 个方案 · {cloud.attractions} 个景点 · {cloud.classTemplates} 份课表模板</p>}
   <div className="cloud-actions"><button disabled={busy} onClick={()=>void refresh()}><RefreshCw size={14}/> 刷新状态</button><button className="primary" disabled={busy||migrationDone} onClick={()=>void upload()}><ArrowUpFromLine size={14}/>{busy?'正在同步…':migrationDone?'本机数据已同步':'上传本机数据'}</button></div>
   {migrationDone&&<small>本机已完成首次迁移；后续编辑会自动保存到云端。</small>}
  </>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
