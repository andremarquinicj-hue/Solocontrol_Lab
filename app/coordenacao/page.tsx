'use client';

import { CheckCircle2, ClipboardCheck, Clock3, FileText, FolderOpen, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listChecklists, listSamples, listTeam, saveChecklist, saveSample } from '@/lib/store';
import { DailyChecklist, Sample, TeamMember } from '@/lib/types';
import { formatDate, isoToday, isRuptureOverdue, makeId, ruptureAgeLabel, ruptureScheduleLabel } from '@/lib/utils';
import { analyzeFormRelease } from '@/lib/technical-analysis';
import { checkSlump, resolveProcessProfile, sampleProcessType } from '@/lib/process-profiles';

const openingLabels = [
  'Conferir rupturas previstas para hoje',
  'Conferir fichas físicas do dia',
  'Verificar condições e limpeza dos equipamentos',
  'Distribuir atividades para a equipe',
];
const closingLabels = [
  'Todos os ensaios do dia concluídos ou justificados',
  'Resultados e fotos lançados no sistema',
  'Todas as fichas devolvidas ao arquivo ou com localização registrada',
  'Bancadas e equipamentos limpos e organizados',
];

export default function CoordinatorPage(){
  const { selectedWorkId, selectedWork } = useWorkScope();
  const [samples,setSamples]=useState<Sample[]>([]);
  const [team,setTeam]=useState<TeamMember[]>([]);
  const [checklist,setChecklist]=useState<DailyChecklist>();
  const [selected,setSelected]=useState<string[]>([]);
  const [responsible,setResponsible]=useState('');
  const today=isoToday();

  async function load(){
    const [s,t,c]=await Promise.all([listSamples(),listTeam(),listChecklists()]);
    setSamples(s);setTeam(t.filter(x=>x.active));
    const key=`${today}_${selectedWorkId}`;
    const found=c.find(x=>x.id===key);
    setChecklist(found || {id:key,date:today,workId:selectedWorkId,opening:openingLabels.map(label=>({id:makeId('op'),label,done:false})),closing:closingLabels.map(label=>({id:makeId('cl'),label,done:false})),updatedAt:new Date().toISOString()});
  }
  useEffect(()=>{load()},[selectedWorkId]);

  const scoped=useMemo(()=>samples.filter(s=>!s.archived&&(selectedWorkId==='all'||s.workId===selectedWorkId)),[samples,selectedWorkId]);
  const tasks=useMemo(()=>scoped.flatMap(sample=>sample.ruptures.filter(r=>r.status!=='concluido'&&(r.dueDate===today||isRuptureOverdue(r))).map(r=>({sample,rupture:r,late:isRuptureOverdue(r)}))).sort((a,b)=>(a.rupture.dueAt||`${a.rupture.dueDate}T23:59`).localeCompare(b.rupture.dueAt||`${b.rupture.dueDate}T23:59`)),[scoped,today]);
  const outside=useMemo(()=>scoped.filter(s=>!['arquivo','arquivada',undefined].includes(s.sheetState)),[scoped]);
  const workload=useMemo(()=>team.map(member=>({member,count:tasks.filter(t=>t.rupture.responsible===member.name).length,done:scoped.flatMap(s=>s.ruptures).filter(r=>r.responsible===member.name&&r.completedAt?.slice(0,10)===today).length})),[team,tasks,scoped,today]);
  const releasePending=useMemo(()=>scoped.filter(s=>{const a=analyzeFormRelease(s,selectedWork);return a.applicable&&['pending','not_configured','below'].includes(a.decision)}),[scoped,selectedWork]);
  const slumpAlerts=useMemo(()=>scoped.filter(s=>{const p=resolveProcessProfile(selectedWork,sampleProcessType(s));const r=checkSlump(p,s.slumpActualCm);return r.status==='low'||r.status==='high'}),[scoped,selectedWork]);

  async function delegate(){
    if(!responsible||!selected.length)return;
    const grouped=new Map<string,string[]>();
    selected.forEach(key=>{const [sid,rid]=key.split('|');grouped.set(sid,[...(grouped.get(sid)||[]),rid])});
    for(const [sid,rids] of Array.from(grouped.entries())){
      const sample=samples.find(s=>s.id===sid);if(!sample)continue;
      await saveSample({...sample,ruptures:sample.ruptures.map(r=>rids.includes(r.id)?{...r,responsible,status:'em_execucao'}:r),updatedAt:new Date().toISOString()},`Atividades delegadas para ${responsible}`);
    }
    setSelected([]);setResponsible('');await load();
  }

  async function toggle(section:'opening'|'closing',id:string){
    if(!checklist)return;
    const next:DailyChecklist={...checklist,[section]:checklist[section].map(item=>item.id===id?{...item,done:!item.done,doneAt:!item.done?new Date().toISOString():undefined}:item),updatedAt:new Date().toISOString()};
    setChecklist(next);await saveChecklist(next);
  }

  async function moveSheet(sample:Sample,state:Sample['sheetState'],custodian=''){
    const updated={...sample,sheetState:state,sheetCustodian:custodian||undefined,sheetMovementAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    await saveSample(updated,`Ficha física movimentada para ${state}${custodian?` (${custodian})`:''}`);await load();
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">CENTRAL DO COORDENADOR</span><h1>{selectedWorkId==='all'?'Operação de hoje':selectedWork?.name}</h1><p>Distribua atividades, confira fichas e feche o laboratório sem depender da memória da equipe.</p></div><Link href="/relatorios/diario" className="button primary"><FileText size={16}/>Relatório diário</Link></section>

    <section className="coordinator-kpis">
      <div className="panel mini-kpi"><Clock3/><div><span>Ensaios vencendo hoje/atrasados</span><strong>{tasks.length}</strong></div></div>
      <div className="panel mini-kpi"><Users/><div><span>Colaboradores ativos</span><strong>{team.length}</strong></div></div>
      <div className="panel mini-kpi"><FolderOpen/><div><span>Fichas fora do arquivo</span><strong>{outside.length}</strong></div></div>
      <div className="panel mini-kpi"><CheckCircle2/><div><span>Concluídos hoje</span><strong>{scoped.flatMap(s=>s.ruptures).filter(r=>r.completedAt?.slice(0,10)===today).length}</strong></div></div>
      <div className="panel mini-kpi"><Clock3/><div><span>Liberação de forma em acompanhamento</span><strong>{releasePending.length}</strong></div></div>
      <div className="panel mini-kpi"><ClipboardCheck/><div><span>Alertas de slump</span><strong>{slumpAlerts.length}</strong></div></div>
    </section>

    <section className="two-columns coordinator-layout">
      <div className="panel">
        <div className="panel-header"><div><h2>Distribuir atividades</h2><p>Selecione várias rupturas e delegue de uma vez.</p></div><ClipboardCheck/></div>
        <div className="bulk-actions"><select value={responsible} onChange={e=>setResponsible(e.target.value)}><option value="">Responsável...</option>{team.map(m=><option key={m.id}>{m.name}</option>)}</select><button className="button primary" disabled={!responsible||!selected.length} onClick={delegate}>Delegar {selected.length||''}</button></div>
        <div className="table-wrap"><table><thead><tr><th></th><th>Etiqueta</th><th>Obra</th><th>Idade</th><th>Data</th><th>Responsável</th><th>Status</th></tr></thead><tbody>{tasks.map(t=>{const key=`${t.sample.id}|${t.rupture.id}`;return <tr key={key}><td><input type="checkbox" checked={selected.includes(key)} onChange={e=>setSelected(e.target.checked?[...selected,key]:selected.filter(x=>x!==key))}/></td><td><b>{t.sample.labelBase}</b></td><td>{t.sample.workName}</td><td>{ruptureAgeLabel(t.rupture)}</td><td>{ruptureScheduleLabel(t.rupture)}</td><td>{t.rupture.responsible||'Não atribuído'}</td><td><span className={`status ${t.late?'atrasado':t.rupture.status}`}>{t.late?'Atrasado':t.rupture.status.replace('_',' ')}</span></td></tr>})}{tasks.length===0&&<tr><td colSpan={7}>Nenhuma ruptura vencendo neste filtro.</td></tr>}</tbody></table></div>
      </div>
      <div className="panel"><div className="panel-header"><div><h2>Carga da equipe</h2><p>Distribuição operacional de hoje.</p></div><Users/></div><div className="workload-list">{workload.map(x=><div key={x.member.id}><div><b>{x.member.name}</b><span>{x.member.role}</span></div><div><strong>{x.count}</strong><small>pendentes</small></div><div><strong>{x.done}</strong><small>concluídos</small></div></div>)}</div></div>
    </section>

    <section className="two-columns">
      <div className="panel"><div className="panel-header"><div><h2>Checklist de abertura</h2><p>{formatDate(today)}</p></div></div><div className="checklist-list">{checklist?.opening.map(item=><label key={item.id} className={item.done?'checked':''}><input type="checkbox" checked={item.done} onChange={()=>toggle('opening',item.id)}/><span>{item.label}</span></label>)}</div></div>
      <div className="panel"><div className="panel-header"><div><h2>Checklist de fechamento</h2><p>Nenhuma pendência deve ficar invisível.</p></div></div><div className="checklist-list">{checklist?.closing.map(item=><label key={item.id} className={item.done?'checked':''}><input type="checkbox" checked={item.done} onChange={()=>toggle('closing',item.id)}/><span>{item.label}</span></label>)}</div></div>
    </section>

    <section className="panel"><div className="panel-header"><div><h2>Controle físico das fichas</h2><p>Registre quem está com cada ficha durante o expediente.</p></div><FolderOpen/></div><div className="table-wrap"><table><thead><tr><th>Etiqueta</th><th>Obra</th><th>Estado</th><th>Responsável atual</th><th>Movimentar</th></tr></thead><tbody>{scoped.filter(s=>s.status!=='concluido').slice(0,80).map(s=><tr key={s.id}><td><b>{s.labelBase}</b></td><td>{s.workName}</td><td>{s.sheetState||'arquivo'}</td><td>{s.sheetCustodian||'—'}</td><td><select value={s.sheetState||'arquivo'} onChange={e=>{const state=e.target.value as Sample['sheetState'];const custodian=state==='laboratorista'?prompt('Nome de quem recebeu a ficha:')||'': '';moveSheet(s,state,custodian)}}><option value="arquivo">No arquivo</option><option value="coordenador">Com coordenador</option><option value="laboratorista">Com laboratorista</option><option value="prensa">Na prensa</option><option value="aguardando_lancamento">Aguardando lançamento</option><option value="arquivada">Arquivada</option></select></td></tr>)}</tbody></table></div></section>
  </div>
}
