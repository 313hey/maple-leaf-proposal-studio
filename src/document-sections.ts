import {hasText,hasDayDetails,hasDaySchedule} from './itinerary-data.ts';
import type {ProjectData} from './project-store';
export const SECTION_DEFS=[['cover','封面'],['overview','项目概览与学习目标'],['highlights','项目亮点'],['attractions','景点与体验'],['program','完整行程表'],['itinerary','每日行程页'],['sample','示例课程表'],['pricing','报价与说明']] as const;
export type DocumentSection=typeof SECTION_DEFS[number][0];
export type ProgrammeType='school'|'study'|'business'|'blank';
export const RECOMMENDED:Record<ProgrammeType,DocumentSection[]>={school:['cover','overview','highlights','program','sample','itinerary','pricing'],study:['cover','overview','highlights','attractions','program','itinerary','pricing'],business:['cover','overview','attractions','program','pricing'],blank:['cover']};
const known=(s:string):s is DocumentSection=>SECTION_DEFS.some(([id])=>id===s);
export function sectionOrder(p:Pick<ProjectData,'sectionOrder'|'attractionPlacement'>):DocumentSection[]{
 if(p.sectionOrder!==undefined)return [...new Set(p.sectionOrder.filter(known))];
 const base:DocumentSection[]=['cover','overview','highlights','program','sample','itinerary','pricing'];base.splice(p.attractionPlacement==='afterItinerary'||p.attractionPlacement==='beforePricing'?6:3,0,'attractions');return base;
}
export function visibleSections(p:Pick<ProjectData,'sectionOrder'|'hiddenSections'|'attractionPlacement'>){return sectionOrder(p).filter(id=>!p.hiddenSections?.includes(id));}
export function hasSectionContent(p:ProjectData,id:DocumentSection):boolean{
 switch(id){
 case 'cover':return [p.title,p.subtitle,p.coverImage].some(hasText);
 case 'overview':return [p.summary,p.overviewHeadline,p.destination,p.audience,p.learningIntent,p.overviewImage,p.featureValue,p.featureLabel].some(hasText);
 case 'highlights':return p.highlights.some(h=>[h.title,h.text,h.image].some(hasText));
 case 'attractions':return (p.attractions||[]).some(a=>[a.nameEn,a.nameZh,a.descriptionEn,a.descriptionZh,a.learningEn,a.learningZh,...a.images].some(hasText));
 case 'program':return p.days.some(hasDaySchedule);
 case 'itinerary':return p.days.some(hasDayDetails);
 case 'sample':return [p.sampleClass.title,...p.sampleClass.notes,...p.sampleClass.rows.flatMap(r=>[r.time,...r.cells])].some(hasText);
 case 'pricing':return hasText(p.fee)||hasText(p.pricingLanguage==='zh'?p.groupSizeZh:p.groupSize)||Object.values(p.clauses).some(list=>list.some(c=>hasText(c[p.pricingLanguage])));
 }
}
export const exportSections=(p:ProjectData)=>visibleSections(p).filter(id=>hasSectionContent(p,id));
export function exportChecks(p:ProjectData):{errors:string[];warnings:string[]}{
 const errors:string[]=[],warnings:string[]=[];const active=exportSections(p);const has=(id:DocumentSection)=>active.includes(id);
 if(!active.length)errors.push('没有可导出的内容，请填写或恢复至少一个板块。');
 if(has('pricing')){if(!hasText(p.fee))warnings.push('报价尚未填写，请发送前核对。');else if(!Number.isFinite(Number(p.fee))||Number(p.fee)<0)errors.push('报价必须是有效的非负金额。');}
 if(has('cover')&&!p.title)warnings.push('封面名称尚未填写。');
 if(has('cover')&&!p.coverImage)warnings.push('封面未上传图片。');
 if(has('overview')&&!p.summary)warnings.push('项目简介尚未填写。');
 if((has('program')||has('itinerary'))&&p.showDates){if(p.days.some(d=>d.date&&!validDate(d.date))||(p.startDate&&!validDate(p.startDate)))errors.push('行程日期无效，请修正后导出。');else if(!p.startDate&&p.days.some(d=>!d.date))warnings.push('部分行程日期未填写。');}
 if((has('cover')||has('overview')||has('program'))&&(!Number.isInteger(p.nights)||p.nights<0||p.nights>p.days.length))errors.push('项目晚数无效。');
 const skipped=visibleSections(p).filter(id=>!hasSectionContent(p,id));if(skipped.length)warnings.push(`空白板块将跳过：${skipped.map(id=>SECTION_DEFS.find(([key])=>key===id)![1]).join('、')}。`);
 return {errors,warnings};
}
function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
