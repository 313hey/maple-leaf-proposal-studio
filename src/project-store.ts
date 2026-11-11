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
export const ATTRACTION_STORE='attractions';
const ACTIVE_KEY='maple-leaf-active-project';
let connection:Promise<IDBDatabase>|undefined;
let pendingMutation:Promise<unknown>=Promise.resolve();

function enqueue<T>(operation:()=>Promise<T>):Promise<T> {
  const result=pendingMutation.then(operation,operation);
  pendingMutation=result.catch(()=>undefined);
  return result;
}

export function database():Promise<IDBDatabase> {
  if(!connection)connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,2);
    request.onupgradeneeded=()=>{for(const name of [STORE,ATTRACTION_STORE])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
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
  const remote=await loadCloudRecords<ProjectData>('studio_projects');
  if(!remote.length)return loadLocalProjects();
  if(cloudMigrationComplete()){await saveLocalProjects(remote,true);return remote.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
  const merged=new Map((await loadLocalProjects()).map(item=>[item.id,item]));for(const item of remote)merged.set(item.id,item);
  return [...merged.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

async function writeProject(project:ProjectData):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(project);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('无法保存项目'));
    tx.onabort=()=>reject(tx.error||new Error('项目保存中断'));
  });
}

export function saveProject(project:ProjectData):Promise<void> {return enqueue(async()=>{await writeProject(project);if(cloudEnabled)await saveCloudRecords('studio_projects',[project]);});}

async function eraseProject(id:string):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error||new Error('无法删除项目'));
  });
}

export function removeProject(id:string):Promise<void> {return enqueue(async()=>{if(cloudEnabled)await deleteCloudRecords('studio_projects',[id]);await eraseProject(id);});}

export function getActiveProjectId():string|null {return localStorage.getItem(ACTIVE_KEY);}
export function setActiveProjectId(id:string):void {localStorage.setItem(ACTIVE_KEY,id);}

async function saveLocalProjects(items:ProjectData[],replace=false):Promise<void>{const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);if(replace)store.clear();for(const item of items)store.put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('恢复失败，未保存任何项目'));tx.onabort=()=>reject(tx.error||new Error('恢复中断，未保存任何项目'));});}
export function saveProjects(items:ProjectData[]):Promise<void>{return enqueue(async()=>{await saveLocalProjects(items);if(cloudEnabled)await saveCloudRecords('studio_projects',items);});}
