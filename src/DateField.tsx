import { useEffect, useState } from 'react';
import './date-field.css';

type Part = 'year' | 'month' | 'day';

export function DateField({label, value, onChange}:{label:string;value:string;onChange:(date:string)=>void}) {
  const [parts, setParts] = useState(() => split(value));
  useEffect(() => setParts(split(value)), [value]);

  function update(part:Part, next:string) {
    const updated = {...parts, [part]: next};
    setParts(updated);
    if (!updated.month || !updated.day) {
      if (value) onChange('');
      return;
    }
    const iso = `${value?.slice(0,2)||'20'}${updated.year}-${updated.month}-${updated.day}`;
    const parsed = new Date(`${iso}T12:00:00`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === iso) onChange(iso);
  }

  return <div className="settings-date"><span>{label}</span><div className="short-date-field">
    <select aria-label={`${label}年份`} value={parts.year} onChange={e=>update('year',e.target.value)}>{[...new Set(['26','27','28','29','30',parts.year])].sort().map(year=><option key={year} value={year}>{year}</option>)}</select>
    <span>/</span><select aria-label={`${label}月份`} value={parts.month} onChange={e=>update('month',e.target.value)}><option value="">月</option>{Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(month=><option key={month} value={month}>{month}</option>)}</select>
    <span>/</span><select aria-label={`${label}日期`} value={parts.day} onChange={e=>update('day',e.target.value)}><option value="">日</option>{Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0')).map(day=><option key={day} value={day}>{day}</option>)}</select>
  </div></div>;
}

function split(value:string) {
  const [year,month,day] = value.split('-');
  const shortYear = year?.slice(-2);
  return {year:shortYear||'26',month:month||'',day:day||''};
}
