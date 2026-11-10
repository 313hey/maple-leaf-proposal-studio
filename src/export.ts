import { getFontEmbedCSS, toPng } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { AlignmentType, BorderStyle, Document, Header, HeadingLevel, HeightRule, ImageRun, LineRuleType, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import {BRAND_LOGO,BRAND_LOGO_ALT,BRAND_LOGO_RATIO} from './brand';
import type { DayData } from './itinerary';
import type { Clause, ClauseKind, ClauseLanguage } from './clauses';
import type { Highlight } from './proposal-types';
import type { SampleClassData } from './sample-class';
import {classColumns} from './sample-class-data';
import {hasDayDetails} from './itinerary-data';
import type {DocumentSection} from './document-sections';
import type { AttractionSnapshot } from './attractions-types';
import { imageFor } from './attractions-types';
import {imagePosition,learningDisplay,type AttractionPagePlan} from './attraction-layout';

export type ExportData = {
  documentSections?:DocumentSection[];
  title:string; subtitle:string; destination:string; audience:string; days:DayData[]; nights:number;
  summary:string; overviewHeadline:string; learningIntent:string; featureValue:string; featureLabel:string;
  coverImage:string; overviewImage:string; highlights:Highlight[]; sampleClass:SampleClassData;
  fee:string; currency:string; groupSize:string; clauses:Record<ClauseKind,Clause[]>;
  language:ClauseLanguage; showDates:boolean; dateFor:(day:DayData,index:number)=>string;
  attractions:AttractionSnapshot[]; attractionPlacement:'afterHighlights'|'afterItinerary'|'beforePricing'; attractionLanguage:'en'|'zh';
  attractionLayout?:AttractionPagePlan[];
};

export function download(blob:Blob, filename:string) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
}

export function fileBase(title:string) {
  const safe=title.trim().replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_').slice(0,70);
  return safe||'Maple_Leaf_Proposal';
}

export async function createPdf(root:HTMLElement):Promise<Blob> {
  await document.fonts.ready;
  const pages=Array.from(root.querySelectorAll<HTMLElement>('.export-page'));
  if(!pages.length)throw new Error('没有可导出的页面。');
  const pdf=await PDFDocument.create();
  const fontEmbedCSS=await getFontEmbedCSS(root);
  for(const [index,node] of pages.entries()) {
    if(node.scrollHeight>node.clientHeight+2 || node.scrollWidth>node.clientWidth+2)throw new Error(`第 ${index+1} 页内容超出纸张，请缩短文字或调整图片后重试。`);
    for(const card of node.querySelectorAll<HTMLElement>('.attractions-page-list article')){
      const box=card.getBoundingClientRect();
      const copy=card.querySelector<HTMLElement>('.attraction-page-copy')!;
      const overflows=copy.scrollHeight>copy.clientHeight+2||Array.from(copy.children).some(child=>child.getBoundingClientRect().bottom>box.bottom+1);
      if(overflows)throw new Error(`第 ${index+1} 页景点内容超过容量，请精简介绍或展示标签后重试；文字没有被截断。`);
    }
    await Promise.all(Array.from(node.querySelectorAll('img')).map(img=>img.decode().catch(()=>undefined)));
    const width=node.classList.contains('landscape')?842:595;
    const height=node.classList.contains('landscape')?595:842;
    const png=await toPng(node,{pixelRatio:2,fontEmbedCSS,cacheBust:false,backgroundColor:'#ffffff'});
    const image=await pdf.embedPng(png);
    const page=pdf.addPage([width,height]);
    page.drawImage(image,{x:0,y:0,width,height});
  }
  return new Blob([new Uint8Array(await pdf.save())],{type:'application/pdf'});
}

const red='8A2018';
const gray='555A57';
const faint='F7F4F0';
const run=(text:string,bold=false)=>text.split(/\r\n?|\n/).map((line,i)=>new TextRun({text:line,break:i?1:0,bold,color:bold?red:gray,font:'Aptos'}));
const para=(text:string,options:Record<string,unknown>={})=>new Paragraph({children:run(text),spacing:{after:160},...options});
const heading=(text:string,pageBreakBefore=false)=>new Paragraph({text,heading:HeadingLevel.HEADING_1,pageBreakBefore,keepNext:true,spacing:{before:180,after:180}});
const subheading=(text:string)=>new Paragraph({text,heading:HeadingLevel.HEADING_2,keepNext:true,spacing:{before:170,after:100}});
const cell=(text:string,header=false,columnSpan?:number)=>new TableCell({columnSpan,shading:header?{fill:red}:undefined,margins:{top:100,bottom:100,left:90,right:90},children:[new Paragraph({children:(text||' ').split(/\r\n?|\n/).map((line,i)=>new TextRun({text:line,break:i?1:0,bold:header,color:header?'FFFFFF':gray,size:header?17:18,font:'Aptos'}))})]});
const table=(headers:string[],rows:string[][],mergedRows?:Set<number>)=>new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:{style:BorderStyle.SINGLE,size:3,color:'DED8D2'},bottom:{style:BorderStyle.SINGLE,size:3,color:'DED8D2'},insideHorizontal:{style:BorderStyle.SINGLE,size:2,color:'E8E3DE'}},rows:[new TableRow({children:headers.map(item=>cell(item,true)),cantSplit:true,tableHeader:true}),...rows.map((row,i)=>new TableRow({children:mergedRows?.has(i)?[cell(row[0]),cell(row[1],false,headers.length-1)]:row.map(item=>cell(item)),cantSplit:true}))]});

async function imageRun(src:string,width:number,height:number,required:boolean,position={x:50,y:50}) {
  try {
    const response=await fetch(src);
    if(!response.ok)throw new Error('图片读取失败');
    const blob=await response.blob();
    const bitmap=await createImageBitmap(blob);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*2)); canvas.height=Math.max(1,Math.round(height*2));
    const context=canvas.getContext('2d');
    if(!context)throw new Error('无法处理图片');
    const scale=Math.max(canvas.width/bitmap.width,canvas.height/bitmap.height);
    context.drawImage(bitmap,(canvas.width-bitmap.width*scale)*position.x/100,(canvas.height-bitmap.height*scale)*position.y/100,bitmap.width*scale,bitmap.height*scale);
    const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('图片转换失败')),'image/png'));
    return new ImageRun({data:new Uint8Array(await png.arrayBuffer()),transformation:{width,height},type:'png'});
  } catch(error) {
    if(required)throw new Error(`无法将图片加入 Word：${error instanceof Error?error.message:String(error)}`);
    return null;
  }
}

export async function createDocx(data:ExportData):Promise<Blob> {
  const logoResponse=await fetch(BRAND_LOGO);
  if(!logoResponse.ok)throw new Error('品牌 Logo 读取失败，请刷新页面后重新导出。');
  const logo=new ImageRun({data:new Uint8Array(await logoResponse.arrayBuffer()),type:'png',transformation:{width:38*BRAND_LOGO_RATIO,height:38},altText:{title:BRAND_LOGO_ALT,description:BRAND_LOGO_ALT,name:'Maple Leaf logo'}});
  const brandHeader=new Header({children:[new Paragraph({children:[logo],spacing:{after:0}})]});
  const children:(Paragraph|Table)[]=[];
  const appendAttractions=async()=>{
    if(!data.attractions.length)return;
    // Use the same measured page groups and crop positions as the A4 preview.
    const pages=data.attractionLayout||Array.from({length:Math.ceil(data.attractions.length/2)},(_,i)=>({items:data.attractions.slice(i*2,i*2+2),heights:[255,255],offset:i*2,compact:false}));
    const unit=11906/530;
    const width=Math.round(446*unit),photoWidth=Math.round(width*.32);
    const none={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
    const borders={top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none};
    const text=(value:string,size:number,color=gray,bold=false)=>value.split(/\r\n?|\n/).map((line,i)=>new TextRun({text:line,break:i?1:0,size,color,bold,font:{ascii:'Arial',hAnsi:'Arial',cs:'Arial',eastAsia:'Arial Unicode MS'},language:{value:'en-US',eastAsia:'zh-CN'}}));
    for(const page of pages){
      children.push(new Paragraph({text:data.attractionLanguage==='zh'?'景点与研学体验':'Attractions & Experiences',heading:HeadingLevel.HEADING_1,pageBreakBefore:children.length>0,keepNext:true,spacing:{before:100,after:220},run:{size:44,font:{ascii:'Georgia',hAnsi:'Georgia',eastAsia:'Arial Unicode MS'}}}));
      const rows:TableRow[]=[];
      for(const [index,item] of page.items.entries()){
        const name=data.attractionLanguage==='zh'?item.nameZh||item.nameEn:item.nameEn||item.nameZh;
        const secondary=data.attractionLanguage==='zh'?item.nameEn:item.nameZh;
        const description=data.attractionLanguage==='zh'?item.descriptionZh||item.descriptionEn:item.descriptionEn||item.descriptionZh;
        const learning=learningDisplay(item,data.attractionLanguage),photo=imageFor(item);
        const body:Paragraph[]=[];
        const spacing={before:0,after:0,line:Math.round(14.5*unit),lineRule:LineRuleType.EXACT};
        const meta=[item.city,item.country,item.category].filter(Boolean).join(' · ');
        if(meta)body.push(new Paragraph({children:text(meta.toUpperCase(),16,'A36F5D'),spacing:{...spacing,after:120,line:210}}));
        body.push(new Paragraph({children:[new TextRun({text:`${String(page.offset+index+1).padStart(2,'0')} · ${name}`,font:{ascii:'Georgia',hAnsi:'Georgia',eastAsia:'Arial Unicode MS'},size:40,color:'302D2A'})],spacing:{...spacing,after:70,line:445},keepNext:true}));
        if(secondary)body.push(new Paragraph({children:text(secondary,20,red),spacing:{...spacing,after:90,line:250}}));
        if(description)body.push(new Paragraph({children:text(description,22),spacing:{...spacing,after:120}}));
        if(learning.tags.length||learning.text){
          body.push(new Paragraph({children:text(data.attractionLanguage==='zh'?'研学亮点':'LEARNING HIGHLIGHTS',16,red,true),spacing:{before:100,after:70,line:200,lineRule:LineRuleType.EXACT},keepNext:true}));
          body.push(new Paragraph({children:learning.tags.length?learning.tags.flatMap((tag,i)=>[...(i?[new TextRun({text:'  ·  ',size:18,color:'714C3E'})]:[]),new TextRun({text:tag,size:19,color:'714C3E',font:{ascii:'Arial',hAnsi:'Arial',eastAsia:'Arial Unicode MS'},shading:{fill:'F1EAE2'}})]):text(learning.text,20),spacing:{...spacing,line:270}}));
        }
        const height=Math.round((page.heights[index]||255)*unit);
        const cells:TableCell[]=[];
        if(photo){const image=await imageRun(photo,photoWidth/15,Math.max(100,(height-90)/15),true,imagePosition(item));cells.push(new TableCell({width:{size:photoWidth,type:WidthType.DXA},margins:{top:0,bottom:0,left:0,right:0},verticalAlign:VerticalAlign.TOP,shading:{fill:'F8F5F0'},children:[new Paragraph({children:image?[image]:[],spacing:{before:0,after:0,line:0}})]}));}
        cells.push(new TableCell({columnSpan:photo?1:2,width:{size:photo?width-photoWidth:width,type:WidthType.DXA},margins:{top:page.compact?260:340,bottom:260,left:Math.round(16*unit),right:Math.round(16*unit)},verticalAlign:VerticalAlign.TOP,shading:{fill:'F8F5F0'},children:body}));
        rows.push(new TableRow({children:cells,cantSplit:true,height:{value:height,rule:HeightRule.ATLEAST}}));
        if(index<page.items.length-1)rows.push(new TableRow({children:[new TableCell({columnSpan:2,margins:{top:0,bottom:0,left:0,right:0},children:[new Paragraph({text:'',spacing:{before:0,after:0,line:Math.round(16*unit)}})]})],height:{value:Math.round(16*unit),rule:HeightRule.ATLEAST},cantSplit:true}));
      }
      children.push(new Table({width:{size:width,type:WidthType.DXA},columnWidths:[photoWidth,width-photoWidth],layout:TableLayoutType.FIXED,borders,rows}));
    }
  };
  const sections=data.documentSections||(['cover','overview','highlights',...(data.attractionPlacement==='afterHighlights'?['attractions']:[]),'program','sample','itinerary',...(data.attractionPlacement!=='afterHighlights'?['attractions']:[]),'pricing'] as DocumentSection[]);
  for(const block of sections){switch(block){
    case 'cover':{
  children.push(new Paragraph({text:data.title,heading:HeadingLevel.TITLE,pageBreakBefore:children.length>0,spacing:{after:200}}));
  if(data.subtitle)children.push(para(data.subtitle));
  children.push(para(`${data.destination}  ·  ${data.days.length} DAYS / ${data.nights} NIGHTS`));
  if(data.coverImage){const image=await imageRun(data.coverImage,445,245,true);if(image)children.push(new Paragraph({children:[image],spacing:{before:330,after:200}}));}

break;}
    case 'overview':{
  children.push(heading(data.overviewHeadline||'Programme Overview',children.length>0));
  if(data.summary)children.push(para(data.summary));
  children.push(subheading('At a Glance'));
  children.push(table(['DESTINATION','DURATION','STUDENTS'],[[data.destination,`${data.days.length} days / ${data.nights} nights`,data.audience]]));
  if(data.learningIntent){children.push(subheading('Learning Intent'));children.push(para(data.learningIntent));}
  if(data.overviewImage){const image=await imageRun(data.overviewImage,445,180,true);if(image)children.push(new Paragraph({children:[image],spacing:{before:240,after:160}}));}

break;}
    case 'highlights':{
  children.push(heading('Programme Highlights',children.length>0));
  for(const item of data.highlights.filter(item=>item.title||item.text)) {
    children.push(subheading(item.title));
    if(item.text)children.push(para(item.text));
    if(item.image){const image=await imageRun(item.image,335,135,true);if(image)children.push(new Paragraph({children:[image],spacing:{after:160}}));}
  }


break;}
    case 'program':{
  children.push(heading('Program Itinerary',children.length>0));
  const dayHeaders=['DAY',...(data.showDates?['DATE']:[]),'BREAKFAST','MORNING','LUNCH','AFTERNOON','DINNER','EVENING'];
  const dayRows=data.days.map((day,index)=>[String(index+1).padStart(2,'0'),...(data.showDates?[data.dateFor(day,index)]:[]),day.breakfast||'—',[day.city,day.morning].filter(value=>value?.trim()).join(' · ')||'—',day.lunch||'—',day.afternoon||'—',day.dinner||'—',day.evening||'—']);
  children.push(table(dayHeaders,dayRows));

break;}
    case 'sample':{
  children.push(heading('Sample Class Schedule',children.length>0));
  if(data.sampleClass.title)children.push(para(data.sampleClass.title));
  const columns=classColumns(data.sampleClass);
  children.push(table(['TIME',...columns.map(label=>label.toUpperCase()||'—')],data.sampleClass.rows.map(row=>[row.time,...(row.fullSpan?[row.cells[0]||'']:Array.from({length:columns.length},(_,i)=>row.cells[i]||''))]),new Set(data.sampleClass.rows.flatMap((row,i)=>row.fullSpan?[i]:[]))));
  for(const note of data.sampleClass.notes.filter(Boolean))children.push(para(note));

break;}
    case 'itinerary':{
  children.push(heading('Daily Itinerary',children.length>0));
  for(let index=0;index<data.days.length;index++) {
    const day=data.days[index];
    if(!hasDayDetails(day))continue;
    children.push(subheading(`Day ${String(index+1).padStart(2,'0')}${data.showDates&&data.dateFor(day,index)?` · ${data.dateFor(day,index)}`:''}${[day.title,day.city].filter(Boolean).length?` · ${[day.title,day.city].filter(Boolean).join(' · ')}`:''}`));
    const activities=[['Morning',day.morning],['Afternoon',day.afternoon],['Evening',day.evening]].filter(([,value])=>value);
    const meals=[['Breakfast',day.breakfast],['Lunch',day.lunch],['Dinner',day.dinner]].filter(([,value])=>value);
    const hasImage=Boolean(day.image&&!day.hideImage);
    activities.forEach(([label,value],i)=>children.push(para(`${label}: ${value}`,{keepNext:i<activities.length-1||meals.length>0||hasImage})));
    if(meals.length)children.push(para(meals.map(([label,value])=>`${label}: ${value}`).join('  ·  '),{keepNext:hasImage}));
    if(day.image&&!day.hideImage){const image=await imageRun(day.image,350,155,true);if(image)children.push(new Paragraph({children:[image],spacing:{after:160}}));}
  }


break;}
    case 'pricing':{
  children.push(heading(data.language==='zh'?'项目费用':'Programme Fee',children.length>0));
  const quotation=data.fee.trim()?`${data.currency} ${Number(data.fee).toLocaleString('en-US')} / ${data.language==='zh'?'每名学生':'student'}`:'';
  children.push(table([data.language==='zh'?'每生报价':'QUOTATION',data.language==='zh'?'团组人数与条件':'GROUP SIZE & CONDITIONS'],[[quotation,data.groupSize]]));
  const sectionNames:Record<ClauseKind,string>=data.language==='zh'?{notes:'报价备注',included:'费用包含',excluded:'费用不包含及重要说明'}:{notes:'Notes',included:'Proposed Services & Inclusions',excluded:'Exclusions & Important Notes'};
  for(const kind of ['notes','included','excluded'] as const){const items=data.clauses[kind].filter(item=>item[data.language].trim());if(!items.length)continue;children.push(subheading(sectionNames[kind]));for(const item of items)children.push(new Paragraph({children:run(item[data.language]),bullet:{level:0},spacing:{after:90}}));}

break;}
    case 'attractions':await appendAttractions();break;
  }}
  const document=new Document({creator:'Maple Leaf Edu-Travel',title:data.title,styles:{default:{document:{run:{font:'Aptos',size:22,color:gray},paragraph:{spacing:{line:300}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',next:'Normal',run:{font:'Georgia',size:46,color:'272D2A'}},{id:'Heading1',name:'heading 1',basedOn:'Normal',next:'Normal',run:{font:'Georgia',size:30,color:red}},{id:'Heading2',name:'heading 2',basedOn:'Normal',next:'Normal',run:{font:'Aptos',size:23,bold:true,color:'303633'}}]},sections:[{headers:{default:brandHeader},properties:{page:{size:{width:11906,height:16838},margin:{top:1000,right:780,bottom:850,left:780,header:220}}},children}]});
  return Packer.toBlob(document);
}
