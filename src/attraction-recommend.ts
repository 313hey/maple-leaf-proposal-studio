export function recommendAttraction(text:string){
  const cities=[['Shenzhen','深圳'],['Hong Kong','香港'],['Shanghai','上海'],['Suzhou','苏州'],['Chengdu','成都'],['Chongqing','重庆'],['Beijing','北京'],['Dalian','大连']];
  const match=cities.find(([en,zh])=>new RegExp(en,'i').test(text)||text.includes(zh));
  const city=match?.[0]||'';
  const category=/museum|博物馆|heritage|历史|文化/.test(text.toLowerCase())?'Culture':/school|university|campus|学校|大学|校园/.test(text.toLowerCase())?'Education':/park|garden|mountain|coastal|公园|园林|山|海岸/.test(text.toLowerCase())?'Nature':/technology|innovation|dji|byd|科技|创新|无人机/.test(text.toLowerCase())?'Technology':'';
  return {city,category,tags:[city,category].filter(Boolean)};
}
import type { Attraction } from './attractions-types.ts';
export type AttractionMatch={item:Attraction;kind:'exact'|'similar';via:'name'|'alias'};
export const normalizeAttractionName=(s:string)=>s.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[^\p{L}\p{N}]/gu,'');
const aliases=(item:Attraction)=>Array.isArray(item.aliases)?item.aliases.filter(value=>typeof value==='string'):[];
const names=(item:Attraction)=>[item.nameZh,item.nameEn,...aliases(item)].map(normalizeAttractionName).filter(Boolean);
export const attractionNameKey=(item:Attraction)=>JSON.stringify([item.nameEn,item.nameZh,aliases(item)]);
const generic=new Set('museum museums exhibition exhibitions center centre park parks ancient city cities town old historic historical scenic area attraction attractions site the of and a an national international garden gardens copy shenzhen shanghai suzhou beijing chengdu chongqing dalian hong kong district'.split(' '));
const words=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('en-US').match(/[a-z0-9]+/g)||[];
function similarNames(a:Attraction,b:Attraction){
  // City/type words never establish identity. Only distinctive complete tokens count.
  const ignored=new Set([...generic,...words(a.city),...words(b.city)]);
  const tokens=(text:string)=>new Set(words(text).filter(word=>!ignored.has(word)&&word.length>2));
  for(const left of [a.nameEn,...aliases(a)])for(const right of [b.nameEn,...aliases(b)]){
    const fullLeft=normalizeAttractionName(left),fullRight=normalizeAttractionName(right);
    if(!fullLeft||!fullRight||(!fullLeft.includes(fullRight)&&!fullRight.includes(fullLeft)))continue;
    const x=tokens(left),y=tokens(right),shared=[...x].filter(word=>y.has(word));
    if(shared.some(word=>word.length>=5)&&shared.length/new Set([...x,...y]).size>=.8)return true;
  }
  return false;
}
export function findAttractionDuplicates(item:Attraction,existing:Attraction[]):AttractionMatch[]{
  const full=names(item),primary=[item.nameZh,item.nameEn].map(normalizeAttractionName).filter(Boolean);
  return existing.filter(other=>other.id!==item.id).flatMap<AttractionMatch>(other=>{
    const otherFull=names(other),exact=full.some(name=>otherFull.includes(name));
    if(exact){const primaryMatch=[other.nameZh,other.nameEn].map(normalizeAttractionName).some(name=>name&&primary.includes(name));return [{item:other,kind:'exact',via:primaryMatch?'name':'alias'}];}
    return similarNames(item,other)?[{item:other,kind:'similar',via:'name'}]:[];
  }).sort((a,b)=>Number(b.kind==='exact')-Number(a.kind==='exact'));
}
// Compatibility for callers that only need a possible match. Saving never throws on it.
export function possibleDuplicate(item:Attraction,existing:Attraction[]):Attraction|undefined{return findAttractionDuplicates(item,existing)[0]?.item;}
