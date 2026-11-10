import {useState} from 'react';
import {imageFor} from './attractions-types';
import type {AttractionMatch} from './attraction-recommend';

export function AttractionDuplicateNotice({match,disabled,onSave}:{match:AttractionMatch;disabled:boolean;onSave:()=>void}){
  const [viewing,setViewing]=useState(false);
  const item=match.item;
  const label=match.kind==='similar'?'发现可能相似的资源':match.via==='alias'?'发现名称或别名相同的资源':'发现完全同名的资源';
  return <div className="asset-duplicate-notice">
    <div className="asset-duplicate-row"><div role="status">{label}：<strong>{item.nameEn||item.nameZh}</strong><small>{match.kind==='exact'?'请核对，也可确认继续保存。':'仅供参考，可直接保存。'}</small></div>
      <nav><button disabled={disabled} onClick={()=>setViewing(!viewing)}>{viewing?'收起已有资源':'查看已有资源'}</button><button disabled={disabled} onClick={onSave}>仍然保存</button></nav>
    </div>
    {viewing&&<section className="asset-duplicate-preview" role="region" aria-label="已有资源详情">
      {imageFor(item)&&<img src={imageFor(item)} alt="已有景点图片"/>}<div><strong>{item.nameEn}</strong>{item.nameZh&&<span>{item.nameZh}</span>}<small>{[item.city,item.category].filter(Boolean).join(' · ')}</small>
      {item.descriptionEn&&<p>{item.descriptionEn}</p>}{item.descriptionZh&&<p>{item.descriptionZh}</p>}{(item.learningEn||item.learningZh)&&<p>{item.learningEn||item.learningZh}</p>}
      </div>
    </section>}
  </div>;
}
