'use client';

import { AlertTriangle, Archive, CheckCircle2, FlaskConical, PackageCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuthScope } from '@/components/AuthScope';
import { useWorkScope } from '@/components/WorkScope';
import { listSamples, saveSample, uploadEvidence } from '@/lib/store';
import { ConcreteSpecimen, Sample } from '@/lib/types';
import { analyzeSample, applySpecimenStatuses, resolveSpecimens } from '@/lib/technical-analysis';
import { addDays, formatDate, formatDateTimeLocal, isoToday } from '@/lib/utils';

interface InventoryRow {
  sample: Sample;
  specimen: ConcreteSpecimen;
  dueDate?: string;
}

export default function TankPage(){
  const { selectedWorkId, selectedWork }=useWorkScope();
  const { profile, isPilot, can }=useAuthScope();
  const [samples,setSamples]=useState<Sample[]>([]);
  const [saving,setSaving]=useState<string>();
  const [discardFiles,setDiscardFiles]=useState<Record<string,File|undefined>>({});

  async function reload(){setSamples(await listSamples())}
  useEffect(()=>{reload()},[]);

  const scoped=useMemo(()=>{const base=selectedWorkId==='all'?samples:samples.filter(s=>s.workId===selectedWorkId);return base.filter(s=>!s.archived&&s.includeInOperations!==false&&s.source!=='historical_excel')},[samples,selectedWorkId]);

  const inventory=useMemo<InventoryRow[]>(()=>{
    const rows:InventoryRow[]=[];
    for(const sample of scoped){
      const work=selectedWorkId==='all'?undefined:selectedWork;
      for(const specimen of resolveSpecimens(sample,work)){
        const rupture=sample.ruptures.find(r=>r.id===specimen.ruptureId)||sample.ruptures.find(r=>r.ageDays===specimen.scheduledAgeDays);
        rows.push({sample,specimen,dueDate:rupture?.dueDate});
      }
    }
    return rows;
  },[scoped,selectedWorkId,selectedWork]);

  const active=inventory.filter(x=>!['rompido','descartado'].includes(x.specimen.status));
  const eligible=inventory.filter(x=>x.specimen.status==='elegivel_descarte');
  const reserved=inventory.filter(x=>x.specimen.status==='manter_reserva');
  const capacity=selectedWork?.tankCapacityCp||0;
  const occupancy=active.length;
  const occupancyPct=capacity?Math.min(100,occupancy/capacity*100):undefined;
  const next7=active.filter(x=>x.dueDate&&x.dueDate<=addDays(isoToday(),7)).length;
  const canManage=isPilot||can('coordinator','engineer');

  async function updateSpecimen(sample:Sample,specimenId:string,patch:Partial<ConcreteSpecimen>,description:string){
    setSaving(specimenId);
    try{
      const work=selectedWorkId==='all'?undefined:selectedWork;
      const current=resolveSpecimens(sample,work);
      const specimens=current.map(cp=>cp.id===specimenId?{...cp,...patch,updatedAt:new Date().toISOString()}:cp);
      const updated=applySpecimenStatuses({...sample,specimens,updatedAt:new Date().toISOString()},work);
      await saveSample(updated,description);
      await reload();
    }finally{setSaving(undefined)}
  }

  async function setPosition(row:InventoryRow){
    const value=prompt(`Posição física do CP ${row.specimen.label}\nEx.: Prateleira B-14`,row.specimen.tankPosition||'');
    if(value===null)return;
    await updateSpecimen(row.sample,row.specimen.id,{tankPosition:value,tankName:row.specimen.tankName||selectedWork?.tankName},`Posição do CP ${row.specimen.label} atualizada`);
  }

  async function hold(row:InventoryRow){
    await updateSpecimen(row.sample,row.specimen.id,{manualHold:true,status:'manter_reserva'},`CP ${row.specimen.label} mantido como reserva por decisão responsável`);
  }

  async function discard(row:InventoryRow){
    const file=discardFiles[row.specimen.id];
    if(!file){alert('Anexe uma foto do CP antes do descarte para manter a rastreabilidade.');return}
    const analysis=analyzeSample(row.sample,selectedWork);
    if(analysis.reserveDecision!=='eligible'){alert('Este CP não está elegível para avaliação de descarte.');return}
    if(!confirm(`Liberar o CP ${row.specimen.label} para descarte?\n\nO sistema registrará responsável, data, justificativa e foto. Essa ação não deve substituir a decisão técnica aplicável à obra.`))return;

    setSaving(row.specimen.id);
    try{
      const photoUrl=await uploadEvidence(file,`samples/${row.sample.id}/descarte/${row.specimen.id}`);
      const work=selectedWorkId==='all'?undefined:selectedWork;
      const current=resolveSpecimens(row.sample,work);
      const now=new Date().toISOString();
      const specimens=current.map(cp=>cp.id===row.specimen.id?{
        ...cp,
        status:'descartado' as const,
        manualHold:false,
        discardedAt:now,
        discardedBy:profile.name,
        discardReason:`Triagem gerencial: resultado da idade de controle atendeu à referência configurada. Autorização manual registrada por ${profile.name}.`,
        discardPhotoUrl:photoUrl,
        updatedAt:now,
      }:cp);
      const updated={...row.sample,specimens,updatedAt:now};
      await saveSample(updated,`CP ${row.specimen.label} liberado para descarte por ${profile.name}`);
      setDiscardFiles(currentFiles=>({...currentFiles,[row.specimen.id]:undefined}));
      await reload();
    }finally{setSaving(undefined)}
  }

  return <div className="page-stack">
    <section className="page-heading">
      <div><span className="eyebrow">GESTÃO FÍSICA DOS CPS</span><h1>Gestão do Tanque</h1><p>Ocupação, CPs de reserva, posições e liberação rastreada de espaço.</p></div>
    </section>

    {selectedWorkId==='all'&&<section className="panel warning-box"><b>Selecione uma obra específica.</b><br/>A capacidade e o critério de reserva são configurados individualmente por obra.</section>}

    <section className="tank-kpis">
      <div className="panel tank-kpi"><FlaskConical/><span>CPs armazenados</span><strong>{occupancy}</strong><small>aguardando rompimento/descarte</small></div>
      <div className="panel tank-kpi"><CheckCircle2/><span>Elegíveis para avaliação</span><strong>{eligible.length}</strong><small>podem liberar posições após autorização</small></div>
      <div className="panel tank-kpi"><Archive/><span>Reservas mantidas</span><strong>{reserved.length}</strong><small>aguardando idade/decisão</small></div>
      <div className="panel tank-kpi"><PackageCheck/><span>Saídas próximas 7 dias</span><strong>{next7}</strong><small>rupturas programadas</small></div>
    </section>

    <section className="panel tank-capacity">
      <div className="panel-header"><div><h2>{selectedWork?.tankName||'Tanque / câmara de cura'}</h2><p>Ocupação calculada pelos CPs individuais ainda armazenados.</p></div><span className="badge muted">{capacity?`Capacidade: ${capacity} CPs`:'Capacidade não cadastrada'}</span></div>
      <div className="tank-capacity-row"><div className="tank-capacity-number"><strong>{occupancy}</strong><span>ocupados</span></div><div className="tank-capacity-bar"><span style={{width:`${occupancyPct??0}%`}}/></div><div className="tank-capacity-number"><strong>{capacity?Math.max(0,capacity-occupancy):'—'}</strong><span>livres</span></div></div>
      {capacity&&occupancyPct!==undefined&&occupancyPct>=85&&<div className="tank-alert"><AlertTriangle/>Ocupação em {occupancyPct.toFixed(0)}%. Priorize a análise dos CPs elegíveis e as rupturas programadas.</div>}
    </section>

    <section className="panel">
      <div className="panel-header"><div><h2>CPs armazenados</h2><p>Os CPs de reserva só podem ser descartados após indicação do sistema e autorização manual.</p></div><span className="badge muted">{active.length} CPs</span></div>
      <div className="table-wrap"><table><thead><tr><th>CP</th><th>Quadra/Lote</th><th>Idade</th><th>Ruptura</th><th>Status</th><th>Posição</th><th>Critério</th><th>Ações</th></tr></thead><tbody>
        {active.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(row=>{
          const analysis=analyzeSample(row.sample,selectedWorkId==='all'?undefined:selectedWork);
          return <tr key={row.specimen.id}>
            <td><b>{row.specimen.label}</b><small className="table-subline">{row.sample.labelBase}</small></td>
            <td>{row.sample.block?`Q${row.sample.block}`:'—'} {row.sample.lot?`L${row.sample.lot}`:''}</td>
            <td>{row.specimen.scheduledAgeValue?`${row.specimen.scheduledAgeValue} ${row.specimen.scheduledAgeUnit==='hours'?(row.specimen.scheduledAgeValue===1?'hora':'horas'):(row.specimen.scheduledAgeValue===1?'dia':'dias')}`:`${row.specimen.scheduledAgeDays} dias`}</td>
            <td>{row.specimen.dueAt?formatDateTimeLocal(row.specimen.dueAt):row.dueDate?formatDate(row.dueDate):'—'}</td>
            <td><span className={`specimen-status ${row.specimen.status}`}>{row.specimen.status.replaceAll('_',' ')}</span></td>
            <td><button className="inline-edit" onClick={()=>setPosition(row)}>{row.specimen.tankPosition||'Definir posição'}</button></td>
            <td><span className={`analysis-pill tone-${analysis.tone}`}>{analysis.headline}</span></td>
            <td>
              {row.specimen.status==='elegivel_descarte'&&canManage?<div className="discard-action">
                <label className="mini-file">Foto<input type="file" accept="image/*" capture="environment" onChange={e=>setDiscardFiles({...discardFiles,[row.specimen.id]:e.target.files?.[0]})}/></label>
                <button className="button danger small" disabled={saving===row.specimen.id||!discardFiles[row.specimen.id]} onClick={()=>discard(row)}><Trash2 size={14}/>Descartar</button>
                <button className="button ghost small" disabled={saving===row.specimen.id} onClick={()=>hold(row)}>Manter</button>
              </div>:<span className="muted-inline">{row.specimen.status==='elegivel_descarte'?'Aguardando autorização':'—'}</span>}
            </td>
          </tr>
        })}
        {active.length===0&&<tr><td colSpan={8}>Nenhum CP armazenado localizado para este filtro.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="panel">
      <div className="panel-header"><div><h2>Descarte rastreado</h2><p>Histórico dos CPs liberados e retirados do armazenamento.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>CP</th><th>Ficha</th><th>Data</th><th>Responsável</th><th>Motivo</th><th>Evidência</th></tr></thead><tbody>
        {inventory.filter(x=>x.specimen.status==='descartado').sort((a,b)=>(b.specimen.discardedAt||'').localeCompare(a.specimen.discardedAt||'')).map(row=><tr key={row.specimen.id}><td><b>{row.specimen.label}</b></td><td>{row.sample.labelBase}</td><td>{row.specimen.discardedAt?new Date(row.specimen.discardedAt).toLocaleString('pt-BR'):'—'}</td><td>{row.specimen.discardedBy||'—'}</td><td>{row.specimen.discardReason||'—'}</td><td>{row.specimen.discardPhotoUrl?<a href={row.specimen.discardPhotoUrl} target="_blank" rel="noreferrer" className="text-link">Ver foto</a>:'—'}</td></tr>)}
      </tbody></table></div>
    </section>
  </div>
}
