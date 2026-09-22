'use client';

import { Sample, Work } from '@/lib/types';
import { sampleStrengthSeries } from '@/lib/technical-analysis';
import { profileTargetStrength, resolveProcessProfile, sampleProcessType } from '@/lib/process-profiles';

interface Props {
  samples: Sample[];
  work?: Work;
  title?: string;
  maxSeries?: number;
  compact?: boolean;
}

const palette=['#0b68b2','#1f9d68','#f59e0b','#8b5cf6','#dc3545','#0f766e'];

export default function StrengthEvolutionChart({samples,work,title='Evolução da resistência',maxSeries=5,compact=false}:Props){
  const series=samples
    .map(sample=>({sample,points:sampleStrengthSeries(sample)}))
    .filter(item=>item.points.length)
    .sort((a,b)=>b.sample.moldedAt.localeCompare(a.sample.moldedAt))
    .slice(0,maxSeries);

  if(!series.length){
    return <div className="strength-chart-empty"><b>{title}</b><span>Ainda não há resultados suficientes para montar o gráfico.</span></div>;
  }

  const ages=Array.from(new Map(series.flatMap(s=>s.points).map(p=>[`${p.ageDays}-${p.ageLabel}`,{ageDays:p.ageDays,label:p.ageLabel}])).values())
    .sort((a,b)=>a.ageDays-b.ageDays);

  const targets=series.map(({sample})=>{
    const profile=resolveProcessProfile(work,sampleProcessType(sample));
    return profileTargetStrength(sample,work,profile);
  }).filter((v):v is number=>Boolean(v&&Number.isFinite(v)));
  const target=targets.length?Math.max(...targets):undefined;

  const allValues=series.flatMap(s=>s.points.flatMap(p=>[p.min,p.max,p.value]));
  if(target)allValues.push(target);
  const yMax=Math.max(5,Math.ceil(Math.max(...allValues)*1.18/5)*5);
  const width=compact?720:920;
  const height=compact?300:360;
  const left=54,right=24,top=28,bottom=56;
  const plotW=width-left-right,plotH=height-top-bottom;
  const x=(index:number)=>ages.length===1?left+plotW/2:left+(index/(ages.length-1))*plotW;
  const y=(value:number)=>top+plotH-(value/yMax)*plotH;
  const ticks=5;

  function pointForAge(item:{points:ReturnType<typeof sampleStrengthSeries>},ageDays:number){
    return item.points.find(p=>Math.abs(p.ageDays-ageDays)<0.001);
  }

  return <div className={`strength-chart ${compact?'compact':''}`}>
    <div className="strength-chart-head"><div><span>CURVA DE EVOLUÇÃO</span><h3>{title}</h3></div>{target&&<div className="strength-target"><span>Referência</span><b>{target.toFixed(1)} MPa</b></div>}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
      {Array.from({length:ticks+1},(_,i)=>{
        const value=(yMax/ticks)*i;
        const yy=y(value);
        return <g key={i}><line x1={left} x2={width-right} y1={yy} y2={yy} className="chart-grid"/><text x={left-10} y={yy+4} textAnchor="end" className="chart-axis-label">{value.toFixed(0)}</text></g>
      })}
      {ages.map((age,index)=><g key={`${age.ageDays}-${age.label}`}><line x1={x(index)} x2={x(index)} y1={top} y2={top+plotH} className="chart-grid vertical"/><text x={x(index)} y={height-22} textAnchor="middle" className="chart-axis-label">{age.label.replace(' horas','h').replace(' dias','d')}</text></g>)}
      <text x={16} y={top+plotH/2} transform={`rotate(-90 16 ${top+plotH/2})`} textAnchor="middle" className="chart-axis-title">Resistência (MPa)</text>

      {target&&<g><line x1={left} x2={width-right} y1={y(target)} y2={y(target)} className="chart-target-line"/><text x={width-right-4} y={y(target)-6} textAnchor="end" className="chart-target-label">Projeto {target.toFixed(1)} MPa</text></g>}

      {series.map((item,seriesIndex)=>{
        const color=palette[seriesIndex%palette.length];
        const pts=ages.map((age,index)=>{
          const point=pointForAge(item,age.ageDays);
          return point?{x:x(index),y:y(point.value),point}:undefined;
        }).filter((v):v is NonNullable<typeof v>=>Boolean(v));
        const d=pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
        return <g key={item.sample.id}>
          {pts.length>1&&<path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}
          {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="5" fill={color}/><text x={p.x} y={p.y-10} textAnchor="middle" className="chart-point-label">{p.point.value.toFixed(1)}</text></g>)}
        </g>
      })}
    </svg>
    <div className="strength-chart-legend">{series.map((item,index)=><span key={item.sample.id}><i style={{background:palette[index%palette.length]}}/><b>{item.sample.labelBase}</b><small>{item.sample.element||item.sample.location||''}</small></span>)}</div>
    <p className="strength-chart-note">Gráfico gerencial a partir dos resultados cadastrados. Critérios de aceitação permanecem vinculados ao projeto, especificações, normas e aprovação técnica aplicável.</p>
  </div>
}
