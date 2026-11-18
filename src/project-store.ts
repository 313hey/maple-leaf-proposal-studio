import type { DayData } from './itinerary';
import type { Clause, ClauseKind, ClauseLanguage } from './clauses';
import type { Highlight } from './proposal-types';
import type { SampleClassData } from './sample-class';
import type { AttractionSnapshot } from './attractions-types';
import {cloudEnabled,cloudMigrationComplete,deleteCloudRecords,loadCloudRecords,saveCloudRecords} from './cloud-store.ts';

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
let connection:Promise<IDBDatabase>|undefined;
let pendingMutation:Promise<unknown>=Promise.resolve();

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

function enqueue<T>(operation:()=>Promise<T>):Promise<T> {
  const result=pendingMutation.then(operation,operation);
  pendingMutation=result.catch(()=>undefined);
  return result;
}

export function database():Promise<IDBDatabase> {
  if(!connection)connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,3);
    request.onupgradeneeded=()=>{for(const name of [STORE,ATTRACTION_STORE,PENDING_PROJECTS])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};
    request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};
    request.onerror=()=>reject(request.error||new Error('无法打开项目存储'));
  });
  return connection;
}

export async function loadLocalProjects():Promise<ProjectData[]> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
    request.onsuccess=()=>resolve((request.result as ProjectData[]).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror=()=>reject(request.error||new Error('无法读取项目'));
  });
}
export async function loadProjects():Promise<ProjectData[]> {
  if(!cloudEnabled)return loadLocalProjects();
  const local=await loadLocalProjects();
  let remote:ProjectData[];
  try{remote=await loadCloudRecords<ProjectData>('studio_projects')}catch(error){throw new ProjectCloudLoadError(error,local)}
  if(!remote.length){
    const queued=await readPendingProjects();
    for(const item of queued.values())try{await saveCloudRecords('studio_projects',[item]);await clearProjectPending(item.id)}catch(error){throw new ProjectCloudLoadError(error,local)}
    return local;
  }
  const pending=await readPendingProjects();
  const merged=new Map(remote.map(item=>[item.id,item]));
  // Pending local versions and newer local edits must survive cloud refreshes.
  for(const item of local){
    const cloud=merged.get(item.id);
    if(pending.has(item.id)||(!cloud&&!cloudMigrationComplete())||(cloud&&item.updatedAt>cloud.updatedAt)){
      merged.set(item.id,item);
      if(!pending.has(item.id))await markProjectPending(item);
    }
  }
  const result=[...merged.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  // Update current cloud copies while retaining local-only rows as a recovery cache.
  try{await saveLocalProjects(result)}catch(error){throw new ProjectLoadError(`方案已从云端读取，但本机缓存写入失败：${error instanceof Error?error.message:String(error)}`,result)}
  // Retry queued local writes after the merged data is safely cached.
  const queued=await readPendingProjects();
  for(const item of queued.values()){
    try{await saveCloudRecords('studio_projects',[item]);await clearProjectPending(item.id)}catch(error){throw new ProjectCloudLoadError(error,result)}
  }
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
async function markProjectPending(project:ProjectData):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(PENDING_PROJECTS,'readwrite');tx.objectStore(PENDING_PROJECTS).put(project);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('无法记录待同步方案'))})}
async function clearProjectPending(id:string):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(PENDING_PROJECTS,'readwrite');tx.objectStore(PENDING_PROJECTS).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('无法清除待同步标记'))})}
export function saveProjectLocally(project:ProjectData):Promise<void>{return enqueue(()=>writeProject(project));}
export function saveProject(project:ProjectData):Promise<void> {return enqueue(async()=>{await writeProject(project);if(cloudEnabled)try{await saveCloudRecords('studio_projects',[project]);await clearProjectPending(project.id)}catch(error){throw new ProjectCloudSaveError(error)}});}

async function eraseProject(id:string):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('无法删除项目'));
  });
}

export function removeProject(id:string):Promise<void> {return enqueue(async()=>{if(cloudEnabled)await deleteCloudRecords('studio_projects',[id]);await eraseProject(id);await clearProjectPending(id);});}

export function getActiveProjectId():string|null {return localStorage.getItem(ACTIVE_KEY);}
export function setActiveProjectId(id:string):void {localStorage.setItem(ACTIVE_KEY,id);}

async function saveLocalProjects(items:ProjectData[],replace=false):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const stores=cloudEnabled?[STORE,PENDING_PROJECTS]:[STORE];const tx=db.transaction(stores,'readwrite');const store=tx.objectStore(STORE);if(replace)store.clear();for(const item of items){store.put(item);if(cloudEnabled)tx.objectStore(PENDING_PROJECTS).put(item)}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('恢复失败，未保存任何项目'));tx.onabort=()=>reject(tx.error||new Error('恢复中断，未保存任何项目'));});}
export function saveProjects(items:ProjectData[]):Promise<void>{return enqueue(async()=>{await saveLocalProjects(items);if(cloudEnabled)try{await saveCloudRecords('studio_projects',items);for(const item of items)await clearProjectPending(item.id)}catch(error){throw new ProjectCloudSaveError(error)}});}
