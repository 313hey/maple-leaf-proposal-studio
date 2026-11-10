import {snapshotAttraction,type Attraction,type AttractionSnapshot} from './attractions-types.ts';
export function applyAttractionSelection(existing:AttractionSnapshot[],selected:Attraction[],replaceId?:string|null):AttractionSnapshot[]{
 if(replaceId){if(selected.length!==1)throw new Error('替换时请选择一个景点。');if(!existing.some(a=>a.id===replaceId))throw new Error('原景点已移除，请重新选择。');return existing.map(a=>a.id===replaceId?snapshotAttraction(selected[0]):a)}
 return [...existing,...selected.map(snapshotAttraction)];
}
