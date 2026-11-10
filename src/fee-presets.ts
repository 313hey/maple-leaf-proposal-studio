import type {Clause,ClauseKind} from './clauses';
import type {DayData} from './itinerary';
export type QuantityKey='nights'|'breakfasts'|'lunches'|'dinners';
export type FeePreset={id:string;kind:ClauseKind;label:string;en:string;zh:string;quantities?:{key:QuantityKey;label:string;example:number}[];matchEn?:RegExp;matchZh?:RegExp};
export const FEE_PRESETS:FeePreset[]=[
 {id:'school-dormitory',kind:'included',label:'学校宿舍住宿',en:'Accommodation: {nights} nights of School Dormitory accommodation',zh:'住宿：{nights} 晚学校宿舍住宿',quantities:[{key:'nights',label:'住宿晚数',example:13}],matchEn:/^accommodation:.*school\s+dormitory/i,matchZh:/^住宿[：:].*学校宿舍/},
 {id:'breakfasts',kind:'included',label:'早餐',en:'Breakfast: {breakfasts} breakfasts',zh:'早餐：{breakfasts} 次',quantities:[{key:'breakfasts',label:'早餐次数',example:13}],matchEn:/^breakfast:\s*\d+\s+breakfasts/i,matchZh:/^早餐[：:]/},
 {id:'meals',kind:'included',label:'午餐与晚餐',en:'Meals: {lunches} lunches, {dinners} dinners as specified in the itinerary',zh:'餐食：行程所列 {lunches} 次午餐、{dinners} 次晚餐',quantities:[{key:'lunches',label:'午餐次数',example:12},{key:'dinners',label:'晚餐次数',example:10}],matchEn:/^meals:/i,matchZh:/^餐食[：:]/},
 {id:'private-coach',kind:'included',label:'专用巴士及机场接送',en:'Transportation: Private coach transportation, including airport pick-up and drop-off',zh:'交通：专用巴士交通服务，含机场接送',matchEn:/^transportation:\s*private\s+coach/i,matchZh:/^交通[：:].*(专用巴士|包车)/},
 {id:'educational-activities',kind:'included',label:'插班课程及教育活动',en:'Educational Activities: School immersion classes, and other scheduled educational activities',zh:'教育活动：学校插班课程及其他已安排的教育活动',matchEn:/^educational activities:/i,matchZh:/^教育活动[：:]/},
 {id:'admission-activity-fees',kind:'included',label:'门票、活动及课程费用',en:'Admission & Activity Fees: Entrance tickets, activity fees, tuition fees, and other programme-related costs as specified in the itinerary',zh:'门票及活动费：行程所列门票、活动费、学费及其他项目相关费用',matchEn:/^admission\s*(?:and|&)\s*activity fees:/i,matchZh:/^门票及活动费[：:]/},
 {id:'english-guide',kind:'included',label:'全程英语导游',en:'Guide Service: English-speaking tour guide throughout the programme',zh:'导游服务：项目全程英语导游',matchEn:/^(?:guide service:.*english[-\s]speaking|english[-\s]speaking guide service)/i,matchZh:/^(?:导游服务[：:].*英语|英语导游服务)/},
 {id:'international-airfare',kind:'excluded',label:'国际机票',en:'International airfare',zh:'国际机票'},
 {id:'visa-fees',kind:'excluded',label:'签证费',en:'Visa fees (if applicable)',zh:'签证费（如适用）'},
 {id:'personal-expenses',kind:'excluded',label:'个人开支',en:'Personal expenses, including shopping and meals not included in the itinerary',zh:'个人开支，包括购物及行程未包含的餐食',matchEn:/^personal expenses[,：:]/i,matchZh:/^个人开支/},
 {id:'travel-insurance',kind:'excluded',label:'个人旅行保险',en:'Personal Travel Insurance: All participants are required to arrange their own travel insurance in their home country, with coverage valid in China.',zh:'个人旅行保险：所有参加者须在本国自行安排在中国境内有效的旅行保险。',matchEn:/^personal travel insurance\b/i,matchZh:/^个人旅行保险/},
 {id:'school-confirmation',kind:'notes',label:'学校安排确认',en:'Final arrangements are subject to school confirmation.',zh:'最终安排以学校确认为准。'},
];
const normalize=(s:string)=>s.toLocaleLowerCase().replace(/[\s\p{P}]+/gu,'');
export function presetPresent(items:Clause[],preset:FeePreset):boolean{
 const example=renderFeePreset(preset,Object.fromEntries((preset.quantities||[]).map(q=>[q.key,q.example])));
 return items.some(c=>c.id.startsWith(`preset:${preset.id}:`)||normalize(c.en)===normalize(example.en)||normalize(c.zh)===normalize(example.zh)||Boolean(preset.matchEn?.test(c.en.trim()))||Boolean(preset.matchZh?.test(c.zh.trim())));
}
export function renderFeePreset(preset:FeePreset,values:Partial<Record<QuantityKey,number|string>>):{en:string;zh:string}{
 const fill=(template:string)=>template.replace(/\{(\w+)\}/g,(_,key:QuantityKey)=>{const value=values[key];if(value===undefined||(typeof value==='string'&&!/^\d+$/.test(value.trim()))||!Number.isInteger(Number(value))||Number(value)<0||Number(value)>999)throw new Error('请填写并核对有效数量（0–999 的整数）。');return String(Number(value))});return {en:fill(preset.en),zh:fill(preset.zh)};
}
export function mealSuggestions(days:DayData[]){
 return Object.fromEntries((['breakfast','lunch','dinner'] as const).map((key,i)=>{let included=0,unknown=0;for(const d of days){const value=d[key];if(value==='Included'||value==='包含')included++;else if(!['At Own Expense','Not Included','自理','未安排'].includes(value||''))unknown++;}return [(['breakfasts','lunches','dinners'] as const)[i],{included,unknown,suggested:included>0||unknown===0?String(included):''}]})) as Record<Exclude<QuantityKey,'nights'>,{included:number;unknown:number;suggested:string}>;
}
export function addFeePresets(items:Clause[],selected:FeePreset[],values:Partial<Record<QuantityKey,number|string>>,confirmed:boolean):Clause[]{
 const next=[...items];for(const preset of selected){if(presetPresent(next,preset))continue;if(preset.quantities?.length&&!confirmed)throw new Error('请先确认住宿及餐食数量。');const text=renderFeePreset(preset,values);next.push({id:`preset:${preset.id}:${crypto.randomUUID()}`,...text});}return next;
}
