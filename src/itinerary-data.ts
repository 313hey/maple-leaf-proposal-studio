import type { DayData } from './itinerary';
export const hasText=(value?:string)=>Boolean(value?.trim());
export const hasDaySchedule=(day:DayData)=>[day.city,day.morning,day.afternoon,day.evening,day.breakfast,day.lunch,day.dinner].some(hasText);
export const hasDayDetails=(day:DayData)=>hasText(day.title)||hasDaySchedule(day)||Boolean(day.image?.trim()&&!day.hideImage);
export function programPages(days:DayData[]):{days:DayData[];offset:number}[]{
 const pages:{days:DayData[];offset:number}[]=[];let page:DayData[]=[];let used=0;let offset=0;
 for(const day of days){const lines=Math.max(...[day.morning,day.afternoon,day.evening].map(s=>s.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/30)),0)));const meta=day.city?.trim()||'';const metaLines=meta?Math.ceil([...meta].reduce((n,c)=>n+(/[^\x00-\xff]/.test(c)?2:1),0)/35):0;const height=Math.max(23,lines*11+6+metaLines*9);
 if(page.length&&(used+height>345||page.length>=15)){pages.push({days:page,offset});offset+=page.length;page=[];used=0;}page.push(day);used+=height;}
 if(page.length)pages.push({days:page,offset});
 if(pages.length>1){const last=pages.at(-1)!;const previous=pages.at(-2)!;while(last.days.length<4&&previous.days.length>5){last.days.unshift(previous.days.pop()!);last.offset--;}}
 return pages;
}
