import type {DayData} from './itinerary';
import type {ProjectData} from './project-store';
export type ImportMode='replace'|'append'|'patch';
export type ItineraryImport={days:DayData[];warnings:string[];dayNumbers:number[];specified:(keyof DayData)[][]};
export function applyItineraryImport(p:ProjectData,input:ItineraryImport,mode:ImportMode):ProjectData{
 let days:DayData[];
 if(mode==='patch'){days=structuredClone(p.days);input.days.forEach((d,i)=>{const index=input.dayNumbers[i]-1;if(!days[index])throw new Error(`Day ${index+1} 不在当前项目中，无法局部更新。`);for(const key of input.specified[i])Object.assign(days[index],{[key]:d[key]});});}
 else{if(input.dayNumbers.some((n,i)=>n!==i+1))throw new Error('完整替换或追加要求 Day 从 1 连续编号；非连续行请使用按 Day 局部更新。');days=mode==='append'?[...p.days,...structuredClone(input.days)]:structuredClone(input.days);}
 if(days.length>90)throw new Error('最多支持 90 天。');
 return {...p,days,archivedDays:mode==='patch'?[...structuredClone(days),...structuredClone(p.archivedDays.slice(days.length))]:structuredClone(days),nights:days.length===p.days.length?p.nights:p.nights===p.days.length-1?days.length-1:Math.min(p.nights,days.length),startDate:mode==='replace'?(days[0]?.date||p.startDate):p.startDate,showDates:p.showDates||days.some(d=>!!d.date),updatedAt:new Date().toISOString()};
}
export type EditableDayKey='date'|'city'|'title'|'morning'|'afternoon'|'evening'|'breakfast'|'lunch'|'dinner'|'notes';
export function parseTSV(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&(quoted||cell==='')){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c==='\t'&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('粘贴内容的引号未闭合。');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export function pasteItinerary(days:DayData[],startRow:number,startColumn:number,columns:EditableDayKey[],text:string):DayData[]{
 const rows=parseTSV(text);if(startRow+rows.length>days.length)throw new Error('粘贴行数超出当前天数，请先增加天数。');if(rows.some(r=>startColumn+r.length>columns.length))throw new Error('粘贴列数超出显示的列，请核对起始单元格或开启三餐／备注列。');
 const next=structuredClone(days);rows.forEach((row,r)=>row.forEach((value,c)=>{const key=columns[startColumn+c];if(key==='date'&&value){value=value.replaceAll('/','-');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new Error(`第 ${startRow+r+1} 天日期无效。`);}if(['breakfast','lunch','dinner'].includes(key)){const map:Record<string,string>={'包含':'Included','自理':'At Own Expense','未安排':'Not Included','未填写':'','':'','Included':'Included','At Own Expense':'At Own Expense','Not Included':'Not Included'};if(!(value in map))throw new Error(`第 ${startRow+r+1} 天餐食值无效。`);value=map[value];}next[startRow+r][key]=value;}));return next;
}
