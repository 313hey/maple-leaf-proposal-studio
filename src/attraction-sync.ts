import {emptyAttraction,type Attraction} from './attractions-types.ts';
import type {AttractionCloudSummary} from './cloud-store.ts';

export type AttractionSyncItem=Attraction&{summaryOnly?:boolean;cloudUpdatedAt?:string;previewImage?:string};
export function preferLocalAttraction(local:Attraction|undefined,remote:Attraction,pending=false):Attraction{
 if(!local)return remote;
 return pending||local.updatedAt>remote.updatedAt?local:remote;
}
export function nextAttractionUpdatedAt(expectedUpdatedAt:string|null,itemUpdatedAt:string,now=Date.now()):string{
 const previous=Date.parse(expectedUpdatedAt||itemUpdatedAt);
 return new Date(Math.max(now,Number.isFinite(previous)?previous+1:0)).toISOString();
}
export function mergeAttractionSummary(summary:AttractionCloudSummary,previous?:AttractionSyncItem):AttractionSyncItem{
 if(previous&&(previous.updatedAt||'')>=summary.updatedAt)return {...previous,cloudUpdatedAt:summary.updatedAt};
 return {...(previous||emptyAttraction()),id:summary.id,nameEn:summary.nameEn,nameZh:summary.nameZh,city:summary.city,category:summary.category,tags:summary.tags,aliases:summary.aliases,updatedAt:summary.updatedAt,cloudUpdatedAt:summary.updatedAt,summaryOnly:true};
}
export function upsertAttractionSummary(items:AttractionSyncItem[],summary:AttractionCloudSummary):AttractionSyncItem[]{
 const index=items.findIndex(item=>item.id===summary.id),previous=index<0?undefined:items[index];
 if(previous&&(previous.cloudUpdatedAt||previous.updatedAt)>=summary.updatedAt)return items;
 const next=mergeAttractionSummary(summary,previous);
 return index<0?[next,...items]:items.map((item,i)=>i===index?next:item);
}
