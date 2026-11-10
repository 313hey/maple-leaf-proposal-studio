import ExcelJS from 'exceljs';
import type { DayData } from './itinerary';
import type {ItineraryImport} from './itinerary-operations';
export const HEADERS=['天数','日期 (YYYY-MM-DD)','城市','上午活动','下午/晚间活动','早餐','午餐','晚餐','备注（不导入图片）'];
export const MAX_DAYS=90;
const mealIn:Record<string,string>={'包含':'Included','自理':'At Own Expense','未安排':'Not Included','未填写':'','Included':'Included','At Own Expense':'At Own Expense','Not Included':'Not Included'};
const mealOut:Record<string,string>={'Included':'包含','At Own Expense':'自理','Not Included':'未安排'};
export const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function text(cell:ExcelJS.Cell):string {if(cell.type===ExcelJS.ValueType.Formula)throw new Error(`单元格 ${cell.address} 含公式，请粘贴为值后导入。`);return cell.text.replace(/\r\n?/g,'\n');}
function dateValue(cell:ExcelJS.Cell):string{
 const value=text(cell).trim();if(!value)return '';
 if(cell.value instanceof Date){const d=cell.value;if(!Number.isFinite(d.getTime())||d.getUTCFullYear()<2000||d.getUTCFullYear()>2099||d.getUTCHours()||d.getUTCMinutes()||d.getUTCSeconds()||d.getUTCMilliseconds())throw new Error(`${cell.address} 日期无效，请填写 2000–2099 年的纯日期，不能使用数字占位或时间。`);return d.toISOString().slice(0,10);}
 if(typeof cell.value==='number')throw new Error(`${cell.address} 日期不能使用数字占位值「${value}」，请填写 YYYY-MM-DD 或有效的 Excel 日期单元格。`);
 if(!validDate(value))throw new Error(`${cell.address} 日期无效「${value}」，请使用 YYYY-MM-DD。`);return value;
}
export async function readItinerary(buffer:ArrayBuffer):Promise<ItineraryImport>{
 const wb=new ExcelJS.Workbook();try{await wb.xlsx.load(buffer)}catch{throw new Error('无法读取 Excel，请确认文件为有效的 .xlsx 格式，或使用下载的新版模板。');}const sheet=wb.getWorksheet('行程填写');if(!sheet)throw new Error('未找到「行程填写」工作表，请使用新版九列模板。');
 const headers=new Map<string,number>();sheet.getRow(1).eachCell((cell,i)=>{const h=text(cell).trim();if(!h)return;if(headers.has(h))throw new Error(`表头重复：${h}`);headers.set(h,i);});
 for(const h of HEADERS)if(!headers.has(h))throw new Error(`缺少表头：${h}`);
 const extras=[...headers.keys()].filter(h=>!HEADERS.includes(h));if(extras.length)throw new Error(`当前使用新版九列格式，不支持扩展表头：${extras.join('、')}。请下载新的填写模板。`);
 const days:DayData[]=[],warnings:string[]=[],dayNumbers:number[]=[],specified:(keyof DayData)[][]=[];
 for(let r=2;r<=sheet.rowCount;r++){
 const row=sheet.getRow(r);const cell=(h:string)=>row.getCell(headers.get(h)!);const value=(h:string)=>text(cell(h));
 if(!HEADERS.some(h=>value(h).trim()))continue;
 const match=value('天数').trim().match(/^(?:Day\s*)?(\d+)$/i),number=Number(match?.[1]);if(!match||number<1||number>MAX_DAYS||dayNumbers.includes(number))throw new Error(`第 ${r} 行 Day 编号无效或重复。`);dayNumbers.push(number);
 const date=dateValue(cell(HEADERS[1]));const meal=(h:string)=>{const v=value(h).trim();if(!v)return '';if(!Object.hasOwn(mealIn,v))throw new Error(`${cell(h).address} ${h}无效「${v}」，只能填写包含、自理、未安排、未填写或留空，数字不是餐食状态。`);return mealIn[v]};
 days.push({title:'',city:value('城市'),notes:value(HEADERS[8]),date,morning:value('上午活动'),afternoon:value('下午/晚间活动'),evening:'',breakfast:meal('早餐'),lunch:meal('午餐'),dinner:meal('晚餐'),layout:'auto'});
 const fields:[keyof DayData,string][]=[['city','城市'],['notes',HEADERS[8]],['date',HEADERS[1]],['morning','上午活动'],['afternoon','下午/晚间活动'],['breakfast','早餐'],['lunch','午餐'],['dinner','晚餐']];specified.push(fields.filter(([,h])=>value(h).trim()!=='').map(([key])=>key));
 if(days.length>MAX_DAYS)throw new Error(`最多支持 ${MAX_DAYS} 天。`);
 }
 if(!days.length)throw new Error('没有可导入的 Day 行。');
 if(days.every(d=>!d.morning.trim()&&!d.afternoon.trim()))warnings.push('这是空白行程模板，导入后仍需填写活动。');
 const dated=days.filter(d=>d.date);if(dated.length&&dated.length!==days.length)warnings.push('部分日期为空，请在导入后核对。');
 if(dated.some((d,i)=>i>0&&d.date!<=dated[i-1].date!))warnings.push('日期有重复或倒序，请核对。');
 if(dayNumbers.some((n,i)=>n!==i+1))warnings.push('Day 编号不从 1 连续排列，只能按 Day 局部更新。');
 return {days,warnings,dayNumbers,specified};
}
export async function writeItinerary(days:DayData[],dateFor?:(d:DayData,i:number)=>string):Promise<Blob>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('行程填写',{views:[{state:'frozen',ySplit:1,xSplit:1}]});sheet.addRow(HEADERS);
 days.forEach((d,i)=>{const date=dateFor?dateFor(d,i):d.date;const combined=[d.afternoon,d.evening].filter(s=>s.length>0).join('\n');const row=sheet.addRow([`Day ${i+1}`,date&&validDate(date)?new Date(`${date}T00:00:00Z`):date||'',d.city||'',d.morning,combined,mealOut[d.breakfast||'']||d.breakfast||'',mealOut[d.lunch||'']||d.lunch||'',mealOut[d.dinner||'']||d.dinner||'',d.notes||'']);row.height=70;row.getCell(2).numFmt='yyyy-mm-dd';});
 sheet.columns.forEach((c,i)=>{c.width=[10,18,18,40,48,14,14,14,30][i]});sheet.eachRow(row=>row.eachCell(c=>{c.alignment={vertical:'top',wrapText:true};c.font={name:'Arial',size:11}}));sheet.getRow(1).height=32;sheet.getRow(1).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF8A2018'}};c.font={name:'Arial',bold:true,color:{argb:'FFFFFFFF'},size:11}});sheet.autoFilter={from:'A1',to:'I1'};
 for(let r=2;r<=days.length+1;r++)for(const c of [6,7,8])sheet.getCell(r,c).dataValidation={type:'list',allowBlank:true,formulae:['"包含,自理,未安排,未填写"']};
 const help=wb.addWorksheet('使用说明');const info=[['九列格式',HEADERS.join('、')],['工作表','只读取「行程填写」，不读取此使用说明。每行一天；支持 1–90 天，按 Day 局部更新可使用非连续编号。'],['日期','填写 YYYY-MM-DD 或有效 Excel 日期；纯数字 10、11 等占位值会报错，日期可留空。Excel 日期单元格支持 2000–2099 年，不含时间。'],['三餐','仅填写包含、自理、未安排、未填写或留空，10 等数字会报错。'],['合并活动','E 列整体导入下午活动，晚间留空，不自动拆分，保留文字及换行。平台导出时原下午和独立晚间文字以换行合并到 E 列。'],['数据安全','预览确认后才导入，取消不改动数据。报价、币种和费用条款始终保留。局部更新保留未指定的日期、图片、版式及其他字段。'],['完整备份','九列 Excel 不包含主题、图片和版式，原下午／晚间分类再次导入不会恢复。完整保留请使用项目完整备份。'],['备注','内部使用，不进入 PDF／Word 客户方案。']];info.forEach(values=>help.addRow(values));help.getColumn(1).width=18;help.getColumn(2).width=100;help.eachRow(r=>{r.height=48;r.eachCell(c=>{c.alignment={vertical:'top',wrapText:true};c.font={name:'Arial',size:11}})});
 return new Blob([new Uint8Array(await wb.xlsx.writeBuffer())],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
