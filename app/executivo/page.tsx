'use client';

import { AlertTriangle, Building2, CheckCircle2, FlaskConical, PackageCheck, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import StatCard from '@/components/StatCard';
import { listNonConformities, listSamples } from '@/lib/store';
import { NonConformity, Sample } from '@/lib/types';
import { completedTests, overallProgress, sampleVolume } from '@/lib/work-analytics';
import { isoToday, isRuptureOverdue } from '@/lib/utils';
import { analyzeFormRelease, resolveSpecimens } from '@/lib/technical-analysis';
import { checkSlump, resolveProcessProfile, sampleProcessType } from '@/lib/process-profiles';

export default function ExecutivePage(){
  const {works,setSelectedWorkId}=useWorkScope();
  const [samples,setSamples]=useState<Sample[]>([]);
  const [ncs,setNcs]=useState<NonConformity[]>([]);
  const today=isoToday();

  useEffect(()=>{Promise.all([listSamples(),listNonConformities()]).then(([s,n])=>{setSamples(s);setNcs(n)})},[]);

  const rows=useMemo(()=>works.map(work=>{
    const ws=samples.filter(s=>s.workId===work.id);
    const operational=ws.filter(s=>!s.archived&&s.includeInOperations!==false&&s.source!=='historical_excel');
    const ruptures=operational.flatMap(s=>s.ruptures);
    const due=ruptures.filter(r=>r.status!=='concluido'&&(r.dueDate===today||isRuptureOverdue(r))).length;
    const totalDue=ruptures.filter(r=>r.status==='concluido'||r.dueDate<today||isRuptureOverdue(r)).length;
    const compliance=totalDue?Math.max(0,100-(due/totalDue*100)):100;

    const slumpEvaluated=ws.map(sample=>{
      const profile=resolveProcessProfile(work,sampleProcessType(sample));
      return {sample,result:checkSlump(profile,sample.slumpActualCm)};
    }).filter(x=>x.result.status!=='not_configured');
    const slumpOk=slumpEvaluated.filter(x=>x.result.status==='within').length;
    const slumpCompliance=slumpEvaluated.length?(slumpOk/slumpEvaluated.length)*100:undefined;

    const releaseAnalyses=ws.map(sample=>analyzeFormRelease(sample,work)).filter(a=>a.applicable);
    const releaseReady=releaseAnalyses.filter(a=>a.decision==='eligible').length;
    const releaseAttention=releaseAnalyses.filter(a=>a.decision==='below').length;
    const reserveEligible=ws.reduce((sum,sample)=>sum+resolveSpecimens(sample,work).filter(cp=>cp.status==='elegivel_descarte').length,0);

    return{
      work,
      records:ws.length,
      volume:ws.reduce((a,s)=>a+sampleVolume(s),0),
      tests:completedTests(ws),
      progress:overallProgress(ws,work),
      pending:due,
      quality:compliance,
      slumpCompliance,
      releaseReady,
      releaseAttention,
      reserveEligible,
      nc:ncs.filter(n=>n.workId===work.id&&n.status!=='encerrada').length,
    };
  }),[works,samples,ncs,today]);

  const volume=rows.reduce((a,r)=>a+r.volume,0);
  const tests=rows.reduce((a,r)=>a+r.tests,0);
  const pendings=rows.reduce((a,r)=>a+r.pending,0);
  const openNc=rows.reduce((a,r)=>a+r.nc,0);
  const reserveEligible=rows.reduce((a,r)=>a+r.reserveEligible,0);
  const slumpRows=rows.filter(r=>r.slumpCompliance!==undefined);
  const avgSlump=slumpRows.length?slumpRows.reduce((a,r)=>a+(r.slumpCompliance||0),0)/slumpRows.length:undefined;

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">DIRETORIA</span><h1>Visão Executiva</h1><p>Indicadores consolidados de produção, prazo, qualidade e rastreabilidade.</p></div></section>

    <section className="stats-grid">
      <StatCard label="Obras ativas" value={works.filter(w=>w.active).length} icon={<Building2/>}/>
      <StatCard label="Volume controlado" value={`${volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³`} icon={<PackageCheck/>}/>
      <StatCard label="Ensaios realizados" value={tests} icon={<FlaskConical/>}/>
      <StatCard label="Slump dentro da faixa" value={avgSlump!==undefined?`${avgSlump.toFixed(1)}%`:'—'} icon={<ShieldCheck/>} hint="obras com critério configurado"/>
      <StatCard label="Pendências de prazo" value={pendings} icon={<AlertTriangle/>} tone={pendings?'red':'navy'}/>
      <StatCard label="CPs reserva elegíveis" value={reserveEligible} icon={<CheckCircle2/>} hint="avaliação para liberar tanque"/>
    </section>

    <section className="panel">
      <div className="panel-header"><div><h2>Desempenho por obra</h2><p>Clique em uma obra para levá-la ao filtro global e abrir a visão operacional.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Obra</th><th>Progresso</th><th>Volume</th><th>Ensaios</th><th>Prazo</th><th>Slump</th><th>Liberação de forma</th><th>Reserva 63d</th><th>NC</th></tr></thead><tbody>{rows.map(r=><tr key={r.work.id} className="click-row" onClick={()=>setSelectedWorkId(r.work.id)}>
        <td><b>{r.work.name}</b><br/><small>{r.work.client}</small></td>
        <td>{r.progress!==undefined?`${r.progress.toFixed(1)}%`:'Sem meta'}</td>
        <td>{r.volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td>
        <td>{r.tests}</td>
        <td><span className={`status ${r.quality>=95?'concluido':r.quality>=85?'pendente':'atrasado'}`}>{r.quality.toFixed(1)}%</span></td>
        <td>{r.slumpCompliance!==undefined?<span className={`status ${r.slumpCompliance>=95?'concluido':r.slumpCompliance>=85?'pendente':'atrasado'}`}>{r.slumpCompliance.toFixed(1)}%</span>:'—'}</td>
        <td>{r.releaseReady} atendida(s){r.releaseAttention?` • ${r.releaseAttention} atenção`:''}</td>
        <td>{r.reserveEligible}</td>
        <td>{r.nc}</td>
      </tr>)}</tbody></table></div>
    </section>

    <section className="panel executive-note"><ShieldCheck/><div><b>Rastreabilidade como indicador de gestão</b><span>Os indicadores são derivados das fichas, ensaios e evidências cadastradas. A aprovação técnica continua vinculada aos responsáveis e documentos aplicáveis.</span></div></section>
  </div>
}
