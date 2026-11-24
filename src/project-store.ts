import type { DayData } from './itinerary';
import type { Clause, ClauseKind, ClauseLanguage } from './clauses';
import type { Highlight } from './proposal-types';
import type { SampleClassData } from './sample-class';
import type { AttractionSnapshot } from './attractions-types';
import {cloudEnabled,cloudMigrationComplete,deleteCloudRecords,loadCloudRecords,saveCloudRecords,loadCloudProjectSummaries,loadCloudProjectDetail,saveCloudProjectIfUnchanged,type ProjectCloudSummary} from './cloud-store.ts';
import {pendingSyncDecision,reconcileProjectDirectory} from './project-reconcile.ts';

export type ProjectData = {
  id:string;
  name:string;
  createdAt:string;
  updatedAt:string;
  isDemo?:boolean;
  title:string;
  subtitle:string;
  summary:string;
  destination:string;
  audience:string;
  overviewHeadline:string;
  learningIntent:string;
  overviewImage:string;
  featureValue:string;
  featureLabel:string;
  nights:number;
  showDates:boolean;
  startDate:string;
  highlights:Highlight[];
  coverImage:string;
  days:DayData[];
  archivedDays:DayData[];
  sampleClass:SampleClassData;
  fee:string;
  currency:string;
  groupSize:string;
  groupSizeZh:string;
  clauses:Record<ClauseKind,Clause[]>;
  pricingLanguage:ClauseLanguage;
  attractions?:AttractionSnapshot[];
  sectionOrder?:string[];
  hiddenSections?:string[];
  programmeType?:string;
  attractionPlacement?:'afterHighlights'|'afterItinerary'|'beforePricing';
};

const blankDay=():DayData=>({title:'',morning:'',afternoon:'',evening:''});

export function blankProject():ProjectData {
  const now=new Date().toISOString();
  return {
    id:crypto.randomUUID(),name:'未命名项目',createdAt:now,updatedAt:now,
    title:'',subtitle:'',summary:'',destination:'',audience:'',overviewHeadline:'',learningIntent:'',overviewImage:'',
    featureValue:'',featureLabel:'',nights:0,showDates:false,startDate:'',highlights:[],coverImage:'',days:[blankDay()],archivedDays:[blankDay()],
    sampleClass:{title:'',notes:[],rows:[]},fee:'',currency:'RMB',groupSize:'',groupSizeZh:'',
    clauses:{notes:[],included:[],excluded:[]},pricingLanguage:'en',attractions:[],
  };
}

const DB_NAME='maple-leaf-proposal-studio';
const STORE='projects';
const PENDING_PROJECTS='pending-project-sync';
export const ATTRACTION_STORE='attractions';
const ACTIVE_KEY='maple-leaf-active-project';
const KNOWN_CLOUD_KEY='maple-leaf-known-cloud-project-versions-v1';
const REMOTE_DELETED_KEY='maple-leaf-remote-deleted-project-ids-v1';
// User-requested cleanup tombstones prevent stale browser sync queues from
// resurrecting these verified-empty drafts after deletion.
const REMOVED_EMPTY_DRAFT_IDS=new Set([
  '74704b17-b26e-4c4d-88b0-56cdcf7c0914','1662702e-d488-459e-857f-fc70b6ed6329',
  'dbe21089-4b25-4533-a1f7-13ea5c8e3538','d200566e-ccaa-4ad1-bca7-4c1b2fd846e6',
  'c60f9f49-ba73-49d8-a260-5b7cd2577d67','8f0e6534-01f9-487c-8de8-9e56fa5232eb',
  '962df3b5-0d81-4819-838b-f4537d44ea31','326961e5-ae85-4dc1-b972-014147478615',
]);
let connection:Promise<IDBDatabase>|undefined;
let pendingLocalMutation:Promise<unknown>=Promise.resolve();
let pendingCloudMutation:Promise<unknown>=Promise.resolve();
let pendingRetry:Promise<{synced:number;conflicts:number;failed:number}>|undefined;
let recentSummaries:ProjectCloudSummary[]|undefined;
let recentSummariesAt=0;
const cloudVersions=new Map<string,string>();
export type ProjectListItem=ProjectData&{summaryOnly?:boolean};

function storedVersions():Record<string,string>{
 try{const value=localStorage.getItem(KNOWN_CLOUD_KEY);const parsed=value?JSON.parse(value):{};return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch{return {}}
}
function storeVersions(value:Record<string,string>):void{try{localStorage.setItem(KNOWN_CLOUD_KEY,JSON.stringify(value))}catch{}}
function storedDeletedIds():Set<string>{
 try{const value=localStorage.getItem(REMOTE_DELETED_KEY);const parsed=value?JSON.parse(value):[];return new Set(Array.isArray(parsed)?parsed.filter((id):id is string=>typeof id==='string'):[])}catch{return new Set()}
}
function storeDeletedIds(ids:Set<string>):void{try{localStorage.setItem(REMOTE_DELETED_KEY,JSON.stringify([...ids]))}catch{}}
function rememberCloudVersion(id:string,updatedAt:string):void{const known=storedVersions();known[id]=updatedAt;storeVersions(known);cloudVersions.set(id,updatedAt)}

export class ProjectCloudSaveError extends Error{
  readonly savedLocally=true;
  constructor(cause:unknown){super(cause instanceof Error?cause.message:String(cause));this.name='ProjectCloudSaveError';}
}
export class ProjectLoadError extends Error{
  readonly cachedProjects:ProjectData[];
  constructor(message:string,cachedProjects:ProjectData[]){super(message);this.name='ProjectLoadError';this.cachedProjects=cachedProjects;}
}
export class ProjectCloudLoadError extends ProjectLoadError{
  constructor(cause:unknown,cachedProjects:ProjectData[]){super(`云端读取或同步失败${cachedProjects.length?`，已保留 ${cachedProjects.length} 个可恢复方案`:''}：${cause instanceof Error?cause.message:String(cause)}`,cachedProjects);this.name='ProjectCloudLoadError';}
}

function enqueue<T>(queue:'local'|'cloud',operation:()=>Promise<T>):Promise<T> {
  const current=queue==='local'?pendingLocalMutation:pendingCloudMutation;
  const result=current.then(operation,operation);
  if(queue==='local')pendingLocalMutation=result.catch(()=>undefined);else pendingCloudMutation=result.catch(()=>undefined);
  return result;
}
const enqueueLocal=<T,>(operation:()=>Promise<T>)=>enqueue('local',operation);
const enqueueCloud=<T,>(operation:()=>Promise<T>)=>enqueue('cloud',operation);

export function database():Promise<IDBDatabase> {
  if(!connection)connection=new Promise((resolve,reject)=>{
    let settled=false;
    let blockedTimer:number|undefined;
    const fail=(error:Error)=>{if(settled)return;settled=true;if(blockedTimer!==undefined)window.clearTimeout(blockedTimer);connection=undefined;reject(error)};
    const request=indexedDB.open(DB_NAME,3);
    request.onupgradeneeded=()=>{for(const name of [STORE,ATTRACTION_STORE,PENDING_PROJECTS])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};
    request.onblocked=()=>{if(blockedTimer===undefined)blockedTimer=window.setTimeout(()=>fail(new Error('本机存储被另一个打开的工作台占用。请关闭其他 Maple Leaf 标签页后重试；云端方案仍可读取。')),1500)};
    request.onsuccess=()=>{if(settled){request.result.close();return}settled=true;if(blockedTimer!==undefined)window.clearTimeout(blockedTimer);request.result.onversionchange=()=>request.result.close();resolve(request.result)};
    request.onerror=()=>fail(request.error||new Error('无法打开项目存储'));
  });
  return connection;
}

export async function loadLocalProjects():Promise<ProjectData[]> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([STORE,PENDING_PROJECTS],'readonly');
    const request=tx.objectStore(STORE).getAll();
    const pendingKeys=tx.objectStore(PENDING_PROJECTS).getAllKeys();
    tx.oncomplete=()=>{const deleted=storedDeletedIds(),pending=new Set(pendingKeys.result as string[]);resolve((request.result as ProjectData[]).filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id)&&(!deleted.has(item.id)||pending.has(item.id))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))};
    tx.onerror=()=>reject(tx.error||new Error('无法读取项目'));
  });
}
async function loadRawLocalProjects():Promise<ProjectData[]>{const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction(STORE,'readonly').objectStore(STORE).getAll();request.onsuccess=()=>resolve(request.result as ProjectData[]);request.onerror=()=>reject(request.error||new Error('无法读取本机项目备份'))})}
// A recovery export must include cached records hidden after a remote deletion.
// It never claims to contain proposals that have only ever existed in the cloud.
export async function loadLocalProjectsForBackup():Promise<ProjectData[]>{
 await pendingLocalMutation;
 return (await loadRawLocalProjects()).filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));
}
export function projectListItem(item:Pick<ProjectData,'id'|'name'|'title'|'destination'|'createdAt'|'updatedAt'> & Partial<Pick<ProjectData,'programmeType'|'isDemo'>>):ProjectListItem{
 return {...blankProject(),id:item.id,name:item.name,title:item.title,destination:item.destination,createdAt:item.createdAt,updatedAt:item.updatedAt,programmeType:item.programmeType,isDemo:item.isDemo,summaryOnly:true};
}
export async function loadProjectList(cached:ProjectData[]=[]):Promise<ProjectListItem[]>{
 if(!cloudEnabled)return cached.map(projectListItem);
 const summaries=(await loadCloudProjectSummaries()).filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));
 recentSummaries=summaries;recentSummariesAt=Date.now();
 const pending=await readPendingProjects();
 const known=storedVersions();
 const result=reconcileProjectDirectory(cached,summaries,new Set(pending.keys()),new Set(Object.keys(known)),cloudMigrationComplete());
 const deleted=storedDeletedIds();
 for(const id of result.remoteDeletedIds){deleted.add(id);cloudVersions.delete(id)}
 for(const item of summaries){deleted.delete(item.id);cloudVersions.set(item.id,item.updatedAt);if(!pending.has(item.id))known[item.id]=item.updatedAt}
 storeDeletedIds(deleted);storeVersions(known);
 for(const item of result.newerLocal)await enqueueLocal(()=>markProjectPending(item));
 return result.items.map(projectListItem).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export async function loadProjectDetail(id:string):Promise<ProjectData|undefined>{
 const db=await database();const read=(store:string)=>new Promise<ProjectData|undefined>((resolve,reject)=>{const request=db.transaction(store,'readonly').objectStore(store).get(id);request.onsuccess=()=>resolve(request.result as ProjectData|undefined);request.onerror=()=>reject(request.error)});
 const [cached,pending]=await Promise.all([read(STORE),read(PENDING_PROJECTS)]);
 if(storedDeletedIds().has(id)&&!pending)return undefined;
 if(!cloudEnabled||pending||cached&&(!cloudVersions.has(id)||cached.updatedAt>=cloudVersions.get(id)!))return cached;
 try{const remote=await loadCloudProjectDetail(id);if(!remote)return cached;return await enqueueLocal(async()=>{const [latest,queued]=await Promise.all([read(STORE),read(PENDING_PROJECTS)]);if(queued||latest&&latest.updatedAt>=remote.updatedAt)return latest;await saveLocalProjects([remote]);return remote})}catch(error){if(cached)return cached;throw error}
}
export async function loadAllProjectsForBackup():Promise<ProjectData[]>{
 await pendingLocalMutation;
 const [local,remote,pending]=await Promise.all([loadRawLocalProjects(),cloudEnabled?loadCloudRecords<ProjectData>('studio_projects'):Promise.resolve([]),readPendingProjects()]);
 const merged=new Map(remote.map(item=>[item.id,item]));
 for(const item of local){const cloud=merged.get(item.id);if(pending.has(item.id)||!cloud||item.updatedAt>cloud.updatedAt)merged.set(item.id,item)}
 return [...merged.values()].filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));
}
async function loadLocalProjectsQuickly():Promise<ProjectData[]>{let timer=0;return Promise.race([loadLocalProjects().catch(()=>[]),new Promise<ProjectData[]>(resolve=>{timer=window.setTimeout(()=>resolve([]),1200)})]).finally(()=>window.clearTimeout(timer))}
async function readPendingProjectsQuickly():Promise<Map<string,ProjectData>>{let timer=0;return Promise.race([readPendingProjects().catch(()=>new Map<string,ProjectData>()),new Promise<Map<string,ProjectData>>(resolve=>{timer=window.setTimeout(()=>resolve(new Map()),1200)})]).finally(()=>window.clearTimeout(timer))}
export async function loadProjects():Promise<ProjectData[]> {
  if(!cloudEnabled)return loadLocalProjects();
  let cloudRows:ProjectData[];
  try{cloudRows=await loadCloudRecords<ProjectData>('studio_projects')}catch(error){const local=(await loadLocalProjectsQuickly()).filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));throw new ProjectCloudLoadError(error,local)}
  const removedFromCloud=cloudRows.filter(item=>REMOVED_EMPTY_DRAFT_IDS.has(item.id)).map(item=>item.id);
  const remote=cloudRows.filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));
  const local=(await loadLocalProjectsQuickly()).filter(item=>!REMOVED_EMPTY_DRAFT_IDS.has(item.id));
  if(!remote.length){
    if(removedFromCloud.length)void enqueueLocal(()=>purgeProjectCache(removedFromCloud)).then(()=>Promise.all(removedFromCloud.map(id=>deleteCloudRecords('studio_projects',[id])))).catch(()=>undefined);
    return local;
  }
  const pending=new Map([...await readPendingProjectsQuickly()].filter(([id])=>!REMOVED_EMPTY_DRAFT_IDS.has(id)));
  const merged=new Map(remote.map(item=>[item.id,item]));
  const needsQueue:ProjectData[]=[];
  // Pending local versions and newer local edits must survive cloud refreshes.
  for(const item of local){
    const cloud=merged.get(item.id);
    if(pending.has(item.id)||(!cloud&&!cloudMigrationComplete())||(cloud&&item.updatedAt>cloud.updatedAt)){
      merged.set(item.id,item);
      if(!pending.has(item.id))needsQueue.push(item);
    }
  }
  const result=[...merged.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  // Never make cloud-loaded projects wait for IndexedDB reads/writes. Large
  // project images and a locked legacy tab must not leave the whole UI blank.
  void enqueueLocal(async()=>{await purgeProjectCache([...REMOVED_EMPTY_DRAFT_IDS]);for(const item of needsQueue)await markProjectPending(item);await saveLocalProjects(result)}).catch(()=>undefined);
  // Retry older offline edits in the background; their local copies are already
  // included in the returned list and remain available if the cloud is offline.
  void (async()=>{for(const id of removedFromCloud)try{await deleteCloudRecords('studio_projects',[id])}catch{}for(const item of pending.values())try{await saveCloudRecords('studio_projects',[item]);await clearProjectPending(item.id)}catch{return}})();
  return result;
}

async function writeProject(project:ProjectData,queueForCloud=cloudEnabled):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(queueForCloud?[STORE,PENDING_PROJECTS]:[STORE],'readwrite');
    tx.objectStore(STORE).put(project);
    if(queueForCloud)tx.objectStore(PENDING_PROJECTS).put(project);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('无法保存项目'));
    tx.onabort=()=>reject(tx.error||new Error('项目保存中断'));
  });
}

async function readPendingProjects():Promise<Map<string,ProjectData>>{const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction(PENDING_PROJECTS,'readonly').objectStore(PENDING_PROJECTS).getAll();request.onsuccess=()=>resolve(new Map((request.result as ProjectData[]).map(item=>[item.id,item])));request.onerror=()=>reject(request.error||new Error('无法读取待同步方案'))})}
export async function hasPendingProject(id:string):Promise<boolean>{const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction(PENDING_PROJECTS,'readonly').objectStore(PENDING_PROJECTS).getKey(id);request.onsuccess=()=>resolve(request.result!==undefined);request.onerror=()=>reject(request.error||new Error('无法检查方案同步状态'))})}
export function retryPendingProjects(summaries?:ProjectCloudSummary[]):Promise<{synced:number;conflicts:number;failed:number}>{
 if(!cloudEnabled)return Promise.resolve({synced:0,conflicts:0,failed:0});
 if(pendingRetry)return pendingRetry;
 pendingRetry=(async()=>{
  const queued=await readPendingProjects();if(!queued.size)return {synced:0,conflicts:0,failed:0};
  const directory=summaries||(recentSummaries&&Date.now()-recentSummariesAt<5000?recentSummaries:await loadCloudProjectSummaries());
  const remote=new Map(directory.map(item=>[item.id,item]));
  const known=storedVersions();let synced=0,conflicts=0,failed=0;
  for(const item of queued.values()){
   const cloud=remote.get(item.id),baseline=known[item.id];
   if(pendingSyncDecision(baseline,cloud?.updatedAt,storedDeletedIds().has(item.id))==='conflict'){
    conflicts++;continue; // Keep the full pending copy; never recreate a remotely deleted record.
   }
   try{
    await enqueueCloud(async()=>{
     const latest=(await readPendingProjects()).get(item.id);
     if(!latest)return;
     await saveCloudProjectIfUnchanged(latest,baseline||null);
     rememberCloudVersion(latest.id,latest.updatedAt);
     await clearProjectPending(latest.id,latest.updatedAt);
     synced++;
    });
   }catch{failed++} // The pending record remains available for another retry or manual recovery.
  }
  return {synced,conflicts,failed};
 })();
 void pendingRetry.finally(()=>{pendingRetry=undefined}).catch(()=>{});
 return pendingRetry;
}
async function markProjectPending(project:ProjectData):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(PENDING_PROJECTS,'readwrite');tx.objectStore(PENDING_PROJECTS).put(project);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('无法记录待同步方案'))})}
async function clearProjectPending(id:string,syncedUpdatedAt?:string):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(PENDING_PROJECTS,'readwrite');const store=tx.objectStore(PENDING_PROJECTS);if(syncedUpdatedAt===undefined)store.delete(id);else{const request=store.get(id);request.onsuccess=()=>{const pending=request.result as ProjectData|undefined;if(!pending||pending.updatedAt<=syncedUpdatedAt)store.delete(id)}}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('无法清除待同步标记'))})}
export function saveProjectLocally(project:ProjectData,queueForCloud=cloudEnabled):Promise<void>{return enqueueLocal(()=>writeProject(project,queueForCloud));}
export async function saveProject(project:ProjectData):Promise<void>{let localError:unknown;try{await enqueueLocal(()=>writeProject(project))}catch(error){localError=error}if(cloudEnabled)try{if(storedDeletedIds().has(project.id))throw new Error('此方案已在另一台设备删除，本机副本仍保留；请复制为新方案后同步。');await enqueueCloud(async()=>{const baseline=storedVersions()[project.id];if(baseline)await saveCloudProjectIfUnchanged(project,baseline);else await saveCloudRecords('studio_projects',[project]);rememberCloudVersion(project.id,project.updatedAt);await clearProjectPending(project.id,project.updatedAt)})}catch(error){throw new ProjectCloudSaveError(error)}if(localError)throw localError;}

async function eraseProject(id:string):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('无法删除项目'));
  });
}
async function purgeProjectCache(ids:string[]):Promise<void>{if(!ids.length)return;const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([STORE,PENDING_PROJECTS],'readwrite');for(const id of ids){tx.objectStore(STORE).delete(id);tx.objectStore(PENDING_PROJECTS).delete(id)}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('清理已删除草稿缓存失败'))})}

export async function removeProject(id:string):Promise<void>{if(cloudEnabled)await enqueueCloud(()=>deleteCloudRecords('studio_projects',[id]));const deleted=storedDeletedIds();deleted.add(id);storeDeletedIds(deleted);await enqueueLocal(async()=>{await eraseProject(id);await clearProjectPending(id)});}

export function getActiveProjectId():string|null {return localStorage.getItem(ACTIVE_KEY);}
export function setActiveProjectId(id:string):void {localStorage.setItem(ACTIVE_KEY,id);}

async function saveLocalProjects(items:ProjectData[],replace=false,queueForCloud=false):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const stores=queueForCloud&&cloudEnabled?[STORE,PENDING_PROJECTS]:[STORE];const tx=db.transaction(stores,'readwrite');const store=tx.objectStore(STORE);if(replace)store.clear();for(const item of items){store.put(item);if(queueForCloud&&cloudEnabled)tx.objectStore(PENDING_PROJECTS).put(item)}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('恢复失败，未保存任何项目'));tx.onabort=()=>reject(tx.error||new Error('恢复中断，未保存任何项目'));});}
export async function saveProjects(items:ProjectData[]):Promise<void>{await enqueueLocal(()=>saveLocalProjects(items,false,true));if(cloudEnabled)try{await enqueueCloud(async()=>{await saveCloudRecords('studio_projects',items);for(const item of items)await clearProjectPending(item.id,item.updatedAt)})}catch(error){throw new ProjectCloudSaveError(error)}}
