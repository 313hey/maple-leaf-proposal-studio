import type {ProjectData} from './project-store.ts';
import type {ProjectCloudSummary} from './cloud-store.ts';

export function reconcileProjectDirectory(
 cached:ProjectData[],
 cloud:ProjectCloudSummary[],
 pendingIds:ReadonlySet<string>,
 knownCloudIds:ReadonlySet<string>,
 migrated:boolean,
):{items:(ProjectData|ProjectCloudSummary)[];remoteDeletedIds:string[];newerLocal:ProjectData[]}{
 const remote=new Map(cloud.map(item=>[item.id,item]));
 const items:(ProjectData|ProjectCloudSummary)[]=cloud.map(item=>item);
 const remoteDeletedIds:string[]=[];
 const newerLocal:ProjectData[]=[];
 for(const local of cached){
  const index=items.findIndex(item=>item.id===local.id);
  const match=remote.get(local.id);
  if(match){
   if(pendingIds.has(local.id)||local.updatedAt>match.updatedAt){
    items[index]=local;
    if(!pendingIds.has(local.id))newerLocal.push(local);
   }
  }else if(pendingIds.has(local.id))items.push(local);
  else if(knownCloudIds.has(local.id)||migrated)remoteDeletedIds.push(local.id);
  else items.push(local); // Legacy local-only data stays recoverable; never upload it implicitly.
 }
 return {items,remoteDeletedIds,newerLocal};
}

export function pendingSyncDecision(
 baseline:string|undefined,
 cloudVersion:string|undefined,
 remotelyDeleted:boolean,
):'insert'|'update'|'conflict'{
 if(remotelyDeleted)return 'conflict';
 if(baseline)return cloudVersion===baseline?'update':'conflict';
 return cloudVersion===undefined?'insert':'conflict';
}
