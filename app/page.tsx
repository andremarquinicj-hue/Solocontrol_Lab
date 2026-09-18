'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FlaskConical, FolderSearch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import StatCard from '@/components/StatCard';
import { listSamples, listTeam, saveSample } from '@/lib/store';
import { Sample, TeamMember } from '@/lib/types';
import { formatDate, isoToday } from '@/lib/utils';

export default function DashboardPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const today = isoToday();

  async function load() { setLoading(true); setSamples(await listSamples()); setTeam(await listTeam()); setLoading(false); }
  useEffect(() => { load(); }, []);

  const operationalSamples = useMemo(() => samples.filter(sample => sample.includeInOperations !== false && sample.source !== 'historical_excel'), [samples]);
  const ruptures = useMemo(() => operationalSamples.flatMap(sample => sample.ruptures.map(r => ({...r, sample}))), [operationalSamples]);
  const todayR = ruptures.filter(r => r.dueDate === today && r.status !== 'concluido');
  const overdue = ruptures.filter(r => r.dueDate < today && r.status !== 'concluido');
  const ageCount = (age:number) => ruptures.filter(r => r.ageDays === age && r.status !== 'concluido').length;

  async function assign(sampleId:string, ruptureId:string, responsible:string) {
    const sample = samples.find(s=>s.id===sampleId); if (!sample) return;
    const updated: Sample = {...sample, ruptures: sample.ruptures.map(r => r.id===ruptureId ? {...r, responsible, status: responsible ? 'em_execucao':'pendente'} : r), updatedAt:new Date().toISOString()};
    await saveSample(updated); await load();
  }

  const agenda = [...overdue, ...todayR, ...ruptures.filter(r=>r.dueDate > today && r.status!=='concluido')].slice(0, 12);

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">VISÃO GERENCIAL</span><h1>Dashboard do Laboratório</h1><p>O que precisa acontecer hoje, sem depender da memória da equipe.</p></div><Link className="button primary" href="/lancamento">+ Lançar nova ficha</Link></section>

    <section className="stats-grid">
      <StatCard label="Ensaios de hoje" value={todayR.length} icon={<FlaskConical/>} hint="rupturas programadas" />
      <StatCard label="Atrasados" value={overdue.length} icon={<AlertTriangle/>} tone="red" hint="exigem ação" />
      <StatCard label="7 dias" value={ageCount(7)} icon={<CalendarDays/>} hint="em aberto" />
      <StatCard label="14 dias" value={ageCount(14)} icon={<CalendarDays/>} hint="em aberto" />
      <StatCard label="28 dias" value={ageCount(28)} icon={<CalendarDays/>} hint="em aberto" />
      <StatCard label="Fichas ativas" value={operationalSamples.filter(s=>s.status==='em_andamento').length} icon={<FolderSearch/>} tone="navy" />
    </section>

    <section className="two-columns dashboard-columns">
      <div className="panel">
        <div className="panel-header"><div><h2>Agenda de ensaios</h2><p>Prioridade automática por atraso e data.</p></div><span className="badge muted">{agenda.length} itens</span></div>
        <div className="table-wrap"><table><thead><tr><th>Etiqueta</th><th>Obra</th><th>Idade</th><th>Ruptura</th><th>Responsável</th><th>Status</th><th></th></tr></thead><tbody>
          {loading && <tr><td colSpan={7}>Carregando...</td></tr>}
          {!loading && agenda.map(r => { const late = r.dueDate < today; return <tr key={r.id}><td><b>{r.sample.labelBase}</b></td><td>{r.sample.workName}</td><td>{r.ageLabel || `${r.ageDays} dias`}</td><td>{formatDate(r.dueDate)}</td><td><select value={r.responsible || ''} onChange={e=>assign(r.sample.id,r.id,e.target.value)}><option value="">Não atribuído</option>{team.map(m=><option key={m.id}>{m.name}</option>)}</select></td><td><span className={`status ${late ? 'atrasado' : r.status}`}>{late ? 'Atrasado' : r.status.replace('_',' ')}</span></td><td><Link className="text-link" href={`/amostras/${r.sample.id}`}>Abrir</Link></td></tr>})}
        </tbody></table></div>
      </div>
      <div className="side-stack">
        <div className="panel day-check"><div className="panel-header"><div><h2>Conferência física</h2><p>Compare o sistema com as fichas do armário.</p></div><ClipboardCheck/></div><div className="donut"><div><strong>{todayR.length}</strong><span>fichas de hoje</span></div></div><p className="callout">Abra o armário pela manhã e confirme se o volume físico bate com o dashboard.</p><button className="button secondary">Conferir fichas</button></div>
        <div className="panel"><div className="panel-header"><h2>Ações rápidas</h2><Clock3/></div><div className="quick-actions"><Link href="/lancamento">Lançar ficha</Link><Link href="/amostras">Buscar etiqueta</Link><Link href="/calculadoras">Calcular resistência</Link></div></div>
      </div>
    </section>
  </div>
}
