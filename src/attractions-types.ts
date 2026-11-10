export type Attraction = {
  id:string; nameZh:string; nameEn:string; city:string; country:string; category:string;
  descriptionZh:string; descriptionEn:string; learningZh:string; learningEn:string;
  images:string[]; coverIndex:number; tags:string[]; sourceFile?:string; sourcePage?:number;
  aliases?:string[];
  createdAt:string; updatedAt:string;
};
// Presentation overrides belong to a proposal, never to the source library record.
export type AttractionPresentation = {
  highlightsEn?:string[]; highlightsZh?:string[];
  imagePosition?:{x:number;y:number};
};
export type AttractionSnapshot = Attraction & {libraryId?:string;presentation?:AttractionPresentation};
export const emptyAttraction=():Attraction=>{
  const now=new Date().toISOString();
  return {id:crypto.randomUUID(),nameZh:'',nameEn:'',city:'',country:'',category:'',descriptionZh:'',descriptionEn:'',learningZh:'',learningEn:'',images:[],coverIndex:0,tags:[],createdAt:now,updatedAt:now};
};
export const snapshotAttraction=(item:Attraction):AttractionSnapshot=>({...structuredClone(item),id:crypto.randomUUID(),libraryId:item.id});
export const attractionPages=(items:AttractionSnapshot[])=>Array.from({length:Math.ceil(items.length/2)},(_,index)=>items.slice(index*2,index*2+2));
export const imageFor=(item:Attraction)=>item.images[item.coverIndex]||item.images[0]||'';
