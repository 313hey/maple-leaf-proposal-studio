import { BrandLogo } from './BrandLogo';
import React from 'react';
import {hasDayDetails} from './itinerary-data';

export type DayLayout = 'auto' | 'editorial' | 'compact' | 'school';
export type DayData = {
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  date?: string;
  city?: string;
  notes?: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  layout?: DayLayout;
  image?: string;
  imageSource?: 'sample' | 'uploaded';
  hideImage?: boolean;
};

type Entry = { start: number; end: number; day: DayData; endDay: DayData; layout: Exclude<DayLayout, 'auto'> };
export type ItineraryPage = { entries: Entry[] };

export function resolvedLayout(day: DayData, index: number, count: number): Exclude<DayLayout, 'auto'> {
  if (day.layout && day.layout !== 'auto') return day.layout;
  const text = `${day.title} ${day.morning} ${day.afternoon}`;
  return index === 0 || index === count - 1 || /arrival|departure|抵达|返程|离境/i.test(text) ? 'compact' : 'editorial';
}

function sameSchoolDay(left: DayData, right: DayData) {
  return ['title', 'morning', 'afternoon', 'evening', 'breakfast', 'lunch', 'dinner', 'image', 'hideImage', 'city'].every(key => left[key as keyof DayData] === right[key as keyof DayData]);
}

export function buildItineraryPages(days: DayData[]): ItineraryPage[] {
  const entries: Entry[] = [];
  for (let index = 0; index < days.length; index++) {
    if(!hasDayDetails(days[index]))continue;
    const layout = resolvedLayout(days[index], index, days.length);
    let end = index;
    if (layout === 'school') {
      while (end + 1 < days.length && resolvedLayout(days[end + 1], end + 1, days.length) === 'school' && sameSchoolDay(days[index], days[end + 1])) end++;
    }
    entries.push({ start: index, end, day: days[index], endDay:days[end], layout });
    index = end;
  }
  const pages: ItineraryPage[] = [];
  let current: ItineraryPage = { entries: [] };
  let used = 0;
  const entryHeight=(entry:Entry)=>{
    const image=entry.day.image&&!entry.day.hideImage;
    const textLength=[entry.day.title,entry.day.morning,entry.day.afternoon,entry.day.evening].join(' ').length;
    const extra=Math.max(0,Math.ceil(textLength/110)-1)*18;
    const meals=(entry.day.breakfast||entry.day.lunch||entry.day.dinner)?26:0;
    const multiline=Math.max(...[entry.day.morning,entry.day.afternoon,entry.day.evening].map(text=>text.split('\n').length-1))*12;
    return meals+multiline+(entry.layout==='editorial'?(image?270:145):entry.layout==='school'?(image?210:145):(image?160:100))+extra;
  };
  for (const entry of entries) {
    const height = entryHeight(entry);
    if (current.entries.length && used + height > 585) { pages.push(current); current = { entries: [] }; used = 0; }
    current.entries.push(entry);
    used += height;
  }
  if (current.entries.length) pages.push(current);
  if (pages.length > 1) {
    const last=pages[pages.length-1];
    const previous=pages[pages.length-2];
    while (last.entries.reduce((total,entry)=>total+entryHeight(entry),0)<370 && previous.entries.length>2) {
      const candidate=previous.entries[previous.entries.length-1];
      if (last.entries.reduce((total,entry)=>total+entryHeight(entry),0)+entryHeight(candidate)>585) break;
      last.entries.unshift(previous.entries.pop()!);
    }
  }
  return pages;
}

export function ItinerarySheet({page, pageNumber, dateFor, showDates, destination, showImageWarning=true,documentPage}:{documentPage?:number;page:ItineraryPage,pageNumber:number,dateFor:(day:DayData,index:number)=>string,showDates:boolean,destination:string,showImageWarning?:boolean}) {
  return <div className="itinerary-sheet">
    <div className="doc-masthead"><BrandLogo/></div>
    <div className="itinerary-sheet-head"><div className="doc-kicker">03 / THE JOURNEY</div><h1>Daily Itinerary</h1><p>{destination}</p></div>
    <div className="itinerary-entry-list">{page.entries.map(entry => {
      const {day,endDay,start,end,layout} = entry;
      const image = day.image && !day.hideImage;
      return <article className={`itinerary-entry ${layout} ${image ? 'has-image' : 'no-image'}`} key={start}>
        <div className="entry-heading"><span>DAY {String(start+1).padStart(2,'0')}{end>start ? `–${String(end+1).padStart(2,'0')}` : ''}</span>{showDates && <small>{dateFor(day,start)}{end>start ? ` – ${dateFor(endDay,end)}` : ''}</small>}</div>
        {(day.title||day.city) && <h2>{[day.title,day.city].filter(Boolean).join(" · ")}</h2>}
        {image && <div className="entry-image"><img src={day.image} alt=""/>{showImageWarning&&day.imageSource==='sample' && <span>ILLUSTRATIVE IMAGE · REPLACE BEFORE EXPORT</span>}</div>}
        <div className="entry-activities">{([['MORNING',day.morning],['AFTERNOON',day.afternoon],['EVENING',day.evening]] as const).filter(([,value])=>value && value!=='—').map(([label,value])=><div key={label}><b>{label}</b><p>{value}</p></div>)}</div>
        {(day.breakfast||day.lunch||day.dinner) && <div className="entry-meals">{[['B',day.breakfast],['L',day.lunch],['D',day.dinner]].filter(([,value])=>value).map(([label,value])=><span key={label}>{label} · {value}</span>)}</div>}
      </article>;
    })}</div>
    <div className="paper-footer"><span>MAPLE LEAF EDU-TRAVEL</span><span>STUDY TOUR PROPOSAL · {String(documentPage??pageNumber).padStart(2,'0')}</span></div>
  </div>;
}
