'use client';

import Image from 'next/image';
import { CalendarDays, Printer, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { formatDate, isoToday, ruptureAgeLabel, ruptureScheduleLabel } from '@/lib/utils';
import { sampleVolume } from '@/lib/work-analytics';
import { analyzeFormRelease } from '@/lib/technical-analysis';
import { checkSlump, processTypeLabel, resolveProcessProfile, sampleProcessLabel, sampleProcessType } from '@/lib/process-profiles';

export default function DailyReportPage(){
  const { selectedWorkId, selectedWork, works }=useWorkScope();
  const [samples,setSamples]=useState<Sample[]>([]);const[date,setDate]=useState(isoToday());
  useEffect(()=>{listSamples().then(setSamples)},[]);
  const scoped=useMemo(()=>samples.filter(s=>selectedWorkId==='all'||s.workId===selectedWorkId),[samples,selectedWorkId]);
  const concrete=useMemo(()=>scoped.filter(s=>s.moldedAt===date),[scoped,date]);
  const ruptures=useMemo(()=>scoped.flatMap(sample=>sample.ruptures.filter(r=>r.completedAt?.slice(0,10)===date).map(r=>({sample,rupture:r}))),[scoped,date]);
  const volume=concrete.reduce((a,s)=>a+sampleVolume(s),0);
  const photos=useMemo(()=>{
    const all=[...concrete.flatMap(s=>s.photos.map(p=>({sample:s,url:p.url,label:p.name}))),...ruptures.flatMap(x=>x.rupture.photos.map(p=>({sample:x.sample,url:p.url,label:p.name})))];
    const seen=new Set<string>();return all.filter(p=>p.url&&!seen.has(p.url)&&seen.add(p.url)).slice(0,24);
  },[concrete,ruptures]);

  const title=selectedWorkId==='all'?'Todas as obras':selectedWork?.name||'Obra';
  async function share(){const text=`Relatório Diário Solocontrol — ${formatDate(date)}\n${title}\nConcretagens: ${concrete.length}\nVolume: ${volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³\nEnsaios realizados: ${ruptures.length}`;if(navigator.share){await navigator.share({title:`Relatório Diário - ${title}`,text,url:location.href})}else{await navigator.clipboard.writeText(text);alert('Resumo copiado para a área de transferência.')}}

  return <div className="page-stack daily-report-page">
    <section className="page-heading no-print"><div><span className="eyebrow">RELATÓRIO DIÁRIO</span><h1>Produção e ensaios do dia</h1><p>Documento pronto para impressão em PDF e compartilhamento com o grupo da obra.</p></div><div className="heading-actions"><label className="date-control"><CalendarDays size={16}/><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="button secondary" onClick={share}><Share2 size={16}/>Compartilhar resumo</button><button className="button primary" onClick={()=>window.print()}><Printer size={16}/>Salvar / imprimir PDF</button></div></section>

    <section className="daily-report-sheet">
      <header className="daily-report-header"><Image src="/logo-solocontrol.png" width={210} height={105} alt="Solocontrol"/><div><span>RELATÓRIO DIÁRIO DE CONTROLE TECNOLÓGICO</span><h1>{title}</h1><p>{formatDate(date)}</p></div></header>
      <div className="daily-kpis"><div><span>Concretagens registradas</span><strong>{concrete.length}</strong></div><div><span>Volume controlado</span><strong>{volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong></div><div><span>Ensaios realizados</span><strong>{ruptures.length}</strong></div><div><span>Evidências fotográficas</span><strong>{photos.length}</strong></div></div>

      <section className="daily-section"><h2>1. Concretagens e locais de utilização</h2><div className="table-wrap"><table><thead><tr><th>Obra</th><th>Quadra/Lote</th><th>Processo</th><th>Concreteira</th><th>NF</th><th>Volume</th><th>Slump</th><th>Ficha</th></tr></thead><tbody>{concrete.map(s=>{const w=selectedWorkId==='all'?works.find(work=>work.id===s.workId):selectedWork;const p=resolveProcessProfile(w,sampleProcessType(s));const slump=checkSlump(p,s.slumpActualCm);return <tr key={s.id}><td>{s.workName}</td><td>{s.block?`Q${s.block}`:'—'} {s.lot?`/ L${s.lot}`:''}</td><td>{sampleProcessLabel(s)}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{sampleVolume(s).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{s.slumpActualCm!==undefined?<>{s.slumpActualCm} cm<br/><small>{slump.status==='within'?'Dentro da faixa':slump.status==='not_configured'?'Sem referência':'Revisar faixa'}</small></>:'—'}</td><td>{s.physicalFormNumber||s.labelBase}</td></tr>})}{concrete.length===0&&<tr><td colSpan={8}>Nenhuma concretagem registrada nesta data.</td></tr>}</tbody></table></div></section>

      <section className="daily-section"><h2>2. Ensaios realizados</h2><div className="table-wrap"><table><thead><tr><th>Obra</th><th>Etiqueta</th><th>Elemento / local</th><th>Idade</th><th>Programado</th><th>Carga</th><th>Resultado</th><th>Responsável</th></tr></thead><tbody>{ruptures.map(({sample,rupture})=><tr key={rupture.id}><td>{sample.workName}</td><td>{sample.labelBase}</td><td>{sample.element||sample.location||'—'}</td><td>{ruptureAgeLabel(rupture)}</td><td>{ruptureScheduleLabel(rupture)}</td><td>{rupture.measurements?.length?rupture.measurements.map(m=>`${m.specimenLabel||'CP'} ${m.load} ${m.loadUnit}`).join(' • '):rupture.load?`${rupture.load} ${rupture.loadUnit}`:'—'}</td><td>{rupture.measurements?.length?rupture.measurements.map(m=>`${m.specimenLabel||'CP'} ${m.resistanceMpa.toFixed(2)} MPa`).join(' • '):rupture.resistanceMpa!==undefined?`${rupture.resistanceMpa.toFixed(2)} MPa`:'—'}</td><td>{rupture.responsible||'—'}</td></tr>)}{ruptures.length===0&&<tr><td colSpan={8}>Nenhum ensaio concluído nesta data.</td></tr>}</tbody></table></div></section>

      <section className="daily-section"><h2>3. Liberação de formas — controle de baixa idade</h2><div className="table-wrap"><table><thead><tr><th>Quadra/Lote</th><th>Processo</th><th>Ensaio</th><th>Resultado avaliado</th><th>Referência</th><th>Situação</th></tr></thead><tbody>{Array.from(new Map(ruptures.filter(x=>x.rupture.purpose==='form_release').map(x=>[x.sample.id,x.sample])).values()).map(s=>{const a=analyzeFormRelease(s,selectedWorkId==='all'?works.find(work=>work.id===s.workId):selectedWork);return <tr key={s.id}><td>{s.block?`Q${s.block}`:'—'} {s.lot?`L${s.lot}`:''}</td><td>{sampleProcessLabel(s)}</td><td>{a.rupture?ruptureAgeLabel(a.rupture):'—'}</td><td>{a.resultValue!==undefined?`${a.resultValue.toFixed(2)} MPa`:'Aguardando'}</td><td>{a.targetMpa?`${a.targetMpa.toFixed(2)} MPa`:'Não configurada'}</td><td>{a.headline}</td></tr>})}</tbody></table></div></section>

      <section className="daily-section"><h2>4. Evidências fotográficas</h2>{photos.length?<div className="daily-photo-grid">{photos.map((p,i)=><figure key={`${p.url}-${i}`}><img src={p.url} alt={p.label}/><figcaption>{p.sample.labelBase} • {p.label}<br/><small>{p.sample.block?`Q${p.sample.block}`:''} {p.sample.lot?`L${p.sample.lot}`:''} • {p.sample.element||p.sample.location||''}</small></figcaption></figure>)}</div>:<p>Nenhuma evidência fotográfica registrada nesta data.</p>}</section>

      <footer className="daily-report-footer"><p>Relatório gerencial gerado pelo Solocontrol Lab. Resultados técnicos oficiais permanecem sujeitos à conferência e aprovação previstas nos procedimentos internos da Solocontrol.</p><span>Gerado em {new Date().toLocaleString('pt-BR')}</span></footer>
    </section>
  </div>
}
