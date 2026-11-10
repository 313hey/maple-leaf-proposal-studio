import {useLayoutEffect,useRef,useState} from 'react';
import {AttractionsPage} from './AttractionsPage';
import type {AttractionSnapshot} from './attractions-types';
import {attractionPages} from './attractions-types';
import {planAttractionPages,type AttractionLanguage} from './attraction-layout';

export function useAttractionLayout(items:AttractionSnapshot[],language:AttractionLanguage){
  const root=useRef<HTMLDivElement>(null);
  const [result,setResult]=useState<{items:AttractionSnapshot[];language:AttractionLanguage;layout:ReturnType<typeof planAttractionPages>}|null>(null);
  useLayoutEffect(()=>{
    let cancelled=false,fontsSettled=false;
    const measure=()=>{
      if(cancelled||!root.current)return;
      const normal=root.current.querySelector<HTMLElement>('.normal-probe .attractions-page-list')!;
      const compact=root.current.querySelector<HTMLElement>('.compact-probe .attractions-page-list')!;
      // Probe text uses the final A4 width and fonts, independently of preview zoom.
      const heights=(list:HTMLElement)=>Array.from(list.children).map(node=>Math.ceil(node.getBoundingClientRect().height)+2);
      const layout=planAttractionPages(items,{normal:heights(normal),compact:heights(compact),available:Math.floor(normal.getBoundingClientRect().height)-2,gap:parseFloat(getComputedStyle(normal).rowGap)});
      setResult({items,language,layout});
    };
    // A layout effect runs before the browser has necessarily requested web fonts.
    // Explicitly wait for the document faces, then measure again if fallback fonts change.
    const frame=requestAnimationFrame(()=>{
      void Promise.allSettled([document.fonts.load('10px "DM Sans"'),document.fonts.load('26px "Libre Baskerville"')]).then(()=>document.fonts.ready).then(()=>{fontsSettled=true;measure()});
    });
    const fontChanged=()=>{if(fontsSettled)measure()};
    document.fonts.addEventListener('loadingdone',fontChanged);
    return ()=>{cancelled=true;cancelAnimationFrame(frame);document.fonts.removeEventListener('loadingdone',fontChanged)};
  },[items,language]);
  const ready=!items.length||(result?.items===items&&result?.language===language);
  const layout=ready&&result?result.layout:{pages:attractionPages(items).map((group,i)=>({items:group,heights:[],offset:i*2,compact:false})),errors:[]};
  const probe=<div className="attraction-measure-stage" ref={root} aria-hidden="true">{[false,true].map(compact=><div key={String(compact)} className={`attraction-probe ${compact?'compact-probe':'normal-probe'}`}><AttractionsPage items={items} pageNumber={1} language={language} compact={compact} measurement/></div>)}</div>;
  return {...layout,ready,probe};
}
