import type {AttractionSnapshot} from './attractions-types.ts';

export type AttractionLanguage='en'|'zh';
export type AttractionPagePlan={items:AttractionSnapshot[];heights:number[];offset:number;compact:boolean};
export type AttractionMeasurements={normal:number[];compact:number[];available:number;gap:number};

export function learningDisplay(item:AttractionSnapshot,language:AttractionLanguage){
  const original=(language==='zh'?item.learningZh||item.learningEn:item.learningEn||item.learningZh).trim();
  const override=language==='zh'?item.presentation?.highlightsZh:item.presentation?.highlightsEn;
  const lines=(override??original.split(/\r?\n/)).map(line=>line.replace(/^\s*[-•·]\s*/, '').trim()).filter(Boolean);
  const short=lines.length<=3&&lines.every(line=>line.length<=48&&line.split(/\s+/).length<=7&&!/[。.!?！？]/.test(line));
  // Long source sentences remain intact. Never infer labels by truncating or rewriting them.
  return {tags:short?lines:[],text:short?'':(override?lines.join('\n'):original),needsEditing:!short&&lines.length>0,original};
}

export function imagePosition(item:AttractionSnapshot){
  const position=item.presentation?.imagePosition;
  const safe=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,v)):50;
  return {x:safe(position?.x),y:safe(position?.y)};
}

export function planAttractionPages(items:AttractionSnapshot[],measure:AttractionMeasurements):{pages:AttractionPagePlan[];errors:string[]}{
  const pages:AttractionPagePlan[]=[],errors:string[]=[];
  const available=measure.available;
  for(let i=0;i<items.length;){
    let count=1,compact=false;
    const normal=measure.normal[i],dense=measure.compact[i];
    if(i+1<items.length){
      if(normal+measure.normal[i+1]+measure.gap<=available)count=2;
      else if(dense+measure.compact[i+1]+measure.gap<=available){count=2;compact=true;}
    }
    if(count===1&&normal>available){compact=true;if(dense>available)errors.push(`「${items[i].nameEn||items[i].nameZh||'未命名景点'}」内容超过单页容量，请精简介绍或展示标签后导出。`);}
    const minimum=(compact?measure.compact:measure.normal).slice(i,i+count);
    const usable=available-measure.gap*(count-1);
    const first=count===2?Math.max(minimum[0],Math.min(usable/2,usable-minimum[1])):Math.max(minimum[0],usable);
    pages.push({items:items.slice(i,i+count),heights:count===2?[first,usable-first]:[first],offset:i,compact});i+=count;
  }
  return {pages,errors};
}

export function validPresentation(value:unknown):boolean{
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const p=value as Record<string,unknown>;
  if(!['highlightsEn','highlightsZh'].every(key=>p[key]===undefined||(Array.isArray(p[key])&&(p[key] as unknown[]).every(v=>typeof v==='string'))))return false;
  if(p.imagePosition!==undefined){const xy=p.imagePosition as Record<string,unknown>;if(!xy||Array.isArray(xy)||!['x','y'].every(k=>typeof xy[k]==='number'&&Number.isFinite(xy[k])&&Number(xy[k])>=0&&Number(xy[k])<=100))return false;}
  return true;
}
