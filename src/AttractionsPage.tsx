import {BrandLogo} from './BrandLogo';
import {imageFor,type AttractionSnapshot} from './attractions-types';
import {imagePosition,learningDisplay,type AttractionLanguage} from './attraction-layout';
import './attraction-pages.css';

export function AttractionsPage({items,pageNumber,language='en',documentPage,offset,heights,compact=false,measurement=false}:{
  documentPage?:number;items:AttractionSnapshot[];pageNumber:number;language?:AttractionLanguage;
  offset?:number;heights?:number[];compact?:boolean;measurement?:boolean;
}){
  const rows=heights?.map(h=>`${h}px`).join(' ');
  return <div className={`paper-inner attractions-page ${items.length===1?'single-attraction':''} ${compact?'compact-attractions':''} ${measurement?'measuring-attractions':''}`}>
    <div className="doc-masthead"><BrandLogo/></div>
    <div className="doc-kicker">EXPLORE / ATTRACTIONS & EXPERIENCES</div>
    <h1>{language==='zh'?'景点与研学体验':'Attractions & Experiences'}</h1>
    <div className="attractions-page-list" style={rows?{gridTemplateRows:rows}:undefined}>
      {items.map((item,index)=>{
        const learning=learningDisplay(item,language),position=imagePosition(item);
        const title=language==='zh'?item.nameZh||item.nameEn:item.nameEn||item.nameZh;
        const secondary=language==='zh'?item.nameEn:item.nameZh;
        const description=language==='zh'?item.descriptionZh||item.descriptionEn:item.descriptionEn||item.descriptionZh;
        return <article key={item.id} data-attraction-id={item.id} className={imageFor(item)?'':'without-photo'}>
          <div className="attraction-number">{String((offset??(pageNumber-1)*2)+index+1).padStart(2,'0')}</div>
          {imageFor(item)&&<div className="attraction-image-frame"><img className="attraction-page-image" src={imageFor(item)} alt={item.nameEn||item.nameZh} style={{objectPosition:`${position.x}% ${position.y}%`}}/></div>}
          <div className="attraction-page-copy">
            <div className="attraction-page-meta">{[item.city,item.country,item.category].filter(Boolean).join(' · ')}</div>
            <h2>{title}</h2>{secondary&&<small>{secondary}</small>}
            {description&&<p className="attraction-description">{description}</p>}
            {(learning.tags.length>0||learning.text)&&<div className="attraction-learning"><strong>{language==='zh'?'研学亮点':'LEARNING HIGHLIGHTS'}</strong>
              {learning.tags.length>0?<ul className="attraction-learning-tags">{learning.tags.map((tag,i)=><li key={i}>{tag}</li>)}</ul>:<p className="attraction-learning-original">{learning.text}</p>}
            </div>}
          </div>
        </article>;
      })}
    </div>
    <div className="paper-footer"><span>MAPLE LEAF EDU-TRAVEL</span><span>ATTRACTIONS & EXPERIENCES · {String(documentPage??pageNumber).padStart(2,'0')}</span></div>
  </div>;
}
