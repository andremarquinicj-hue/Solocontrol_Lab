'use client';

import Link from 'next/link';
import { AlertTriangle, BarChart3, CalendarDays, ClipboardCheck, FileCheck2, FlaskConical, Layers3, PackageCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import StatCard from '@/components/StatCard';
import { listSamples, listTeam, saveSample } from '@/lib/store';
import { Sample, TeamMember } from '@/lib/types';
import { formatDate, isoToday } from '@/lib/utils';
import { completedTests, elementProgress, formatElementLabel, overallProgress, sampleVolume, uniqueReports, workSamples } from '@/lib/work-analytics';

export default function DashboardPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNoControl, setShowNoControl] = useState(false);
  const { selectedWorkId, selectedWork, works } = useWorkScope();
  const today = isoToday();

  async function load() {
    setLoading(true);
    const [sampleData, teamData] = await Promise.all([listSamples(), listTeam()]);
    setSamples(sampleData);
    setTeam(teamData);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const scoped = useMemo(() => workSamples(samples, selectedWorkId), [samples, selectedWorkId]);
  const operationalSamples = useMemo(
    () => scoped.filter(sample => sample.includeInOperations !== false && sample.source !== 'historical_excel'),
    [scoped],
  );
  const ruptures = useMemo(
    () => operationalSamples.flatMap(sample => sample.ruptures.map(r => ({...r, sample}))),
    [operationalSamples],
  );
  const todayR = ruptures.filter(r => r.dueDate === today && r.status !== 'concluido');
  const overdue = ruptures.filter(r => r.dueDate < today && r.status !== 'concluido');
  const agenda = [...overdue, ...todayR, ...ruptures.filter(r=>r.dueDate > today && r.status!=='concluido')].slice(0, 12);

  const totalVolume = scoped.reduce((a,s)=>a+sampleVolume(s),0);
  const totalTests = completedTests(scoped);
  const reportCount = uniqueReports(scoped);
  const noControlSamples = useMemo(() => scoped.filter(s=>s.historicalState==='sem_controle').sort((a,b)=>b.moldedAt.localeCompare(a.moldedAt)), [scoped]);
  const noControl = noControlSamples.length;
  const progress = selectedWorkId !== 'all' ? elementProgress(scoped, selectedWork) : [];
  const volumePercent = selectedWork?.plannedVolumeM3 ? Math.min(100,(totalVolume/selectedWork.plannedVolumeM3)*100) : undefined;

  async function assign(sampleId:string, ruptureId:string, responsible:string) {
    const sample = samples.find(s=>s.id===sampleId); if (!sample) return;
    const updated: Sample = {...sample, ruptures: sample.ruptures.map(r => r.id===ruptureId ? {...r, responsible, status: responsible ? 'em_execucao':'pendente'} : r), updatedAt:new Date().toISOString()};
    await saveSample(updated); await load();
  }

  const workRows = useMemo(() => works.map(work => {
    const ws = samples.filter(s=>s.workId===work.id);
    return {
      work,
      samples: ws.length,
      volume: ws.reduce((a,s)=>a+sampleVolume(s),0),
      tests: completedTests(ws),
      progress: overallProgress(ws,work),
      noControl: ws.filter(s=>s.historicalState==='sem_controle').length,
    };
  }).filter(row=>row.samples>0 || row.work.active), [works,samples]);

  return <div className="page-stack">
    <section className="page-heading">
      <div><span className="eyebrow">VISÃO GERENCIAL</span><h1>{selectedWorkId==='all'?'Dashboard da Solocontrol':selectedWork?.name || 'Dashboard da Obra'}</h1><p>{selectedWorkId==='all'?'Visão consolidada das obras e da operação do laboratório.':'Produção, concreto, ensaios e avanço físico desta obra.'}</p></div>
      <Link className="button primary" href="/lancamento">+ Lançar nova ficha</Link>
    </section>

    {selectedWorkId==='all' ? <>
      <section className="stats-grid">
        <StatCard label="Obras monitoradas" value={workRows.length} icon={<Layers3/>} hint="com cadastro ou registros" />
        <StatCard label="Volume controlado" value={`${totalVolume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³`} icon={<PackageCheck/>} hint="acumulado" />
        <StatCard label="Ensaios realizados" value={totalTests} icon={<FlaskConical/>} hint="rupturas concluídas" />
        <StatCard label="Laudos registrados" value={reportCount} icon={<FileCheck2/>} hint="números únicos" />
        <StatCard label="Ensaios de hoje" value={todayR.length} icon={<CalendarDays/>} hint="rupturas programadas" />
        <StatCard label="Atrasados" value={overdue.length} icon={<AlertTriangle/>} tone="red" hint="exigem ação" />
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Resumo por obra</h2><p>Selecione uma obra no topo para abrir o dashboard detalhado.</p></div><BarChart3/></div>
        <div className="table-wrap"><table><thead><tr><th>Obra</th><th>Progresso</th><th>Registros</th><th>Volume</th><th>Ensaios</th><th>Sem controle</th></tr></thead><tbody>{workRows.map(row=><tr key={row.work.id}><td><b>{row.work.name}</b><br/><small>{row.work.client}</small></td><td>{row.progress!==undefined?<div className="table-progress"><div><span style={{width:`${row.progress}%`}}/></div><b>{row.progress.toFixed(1)}%</b></div>:<span className="badge muted">Sem meta</span>}</td><td>{row.samples}</td><td>{row.volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{row.tests}</td><td>{row.noControl}</td></tr>)}</tbody></table></div>
      </section>
    </> : <>
      <section className="stats-grid">
        <StatCard label="Registros de concretagem" value={scoped.length} icon={<Layers3/>} hint="histórico + operação" />
        <StatCard label="Volume de concreto" value={`${totalVolume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³`} icon={<PackageCheck/>} hint={selectedWork?.plannedVolumeM3?`meta ${selectedWork.plannedVolumeM3.toLocaleString('pt-BR')} m³`:'acumulado'} />
        <StatCard label="Ensaios realizados" value={totalTests} icon={<FlaskConical/>} hint="rupturas concluídas" />
        <StatCard label="Laudos registrados" value={reportCount} icon={<FileCheck2/>} hint="números únicos" />
        <StatCard label="Sem controle" value={noControl} icon={<AlertTriangle/>} tone={noControl?'red':'navy'} hint={noControl?'clique para ver pendências':'nenhuma pendência histórica'} onClick={noControl?()=>setShowNoControl(true):undefined} title={noControl?'Abrir registros sem controle':undefined} />
        <StatCard label="Pendências atuais" value={overdue.length+todayR.length} icon={<CalendarDays/>} tone={overdue.length?'red':'navy'} hint={`${overdue.length} atrasado(s)`} />
      </section>

      <section className="panel progress-panel">
        <div className="panel-header"><div><h2>Progresso da obra</h2><p>Contagem por unidade (Quadra + Lote) para evitar duplicidade por caminhão ou nota fiscal.</p></div>{selectedWork?.plannedUnits&&<span className="badge muted">{selectedWork.plannedUnits} unidades previstas</span>}</div>
        <div className="progress-grid">
          {progress.map(item=><div className="progress-card" key={item.element}><div className="progress-card-head"><span>{formatElementLabel(item.element)}</span><b>{item.completed}{item.target?` / ${item.target}`:''}</b></div><div className="progress-bar"><span style={{width:`${item.percent ?? (item.completed?100:0)}%`}}/></div><small>{item.percent!==undefined?`${item.percent.toFixed(1)}% concluído`:'Meta não configurada na obra'}</small></div>)}
          <div className="progress-card volume-progress"><div className="progress-card-head"><span>Volume de concreto</span><b>{totalVolume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</b></div><div className="progress-bar"><span style={{width:`${volumePercent ?? 0}%`}}/></div><small>{volumePercent!==undefined?`${volumePercent.toFixed(1)}% da meta de ${selectedWork?.plannedVolumeM3?.toLocaleString('pt-BR')} m³`:'Cadastre o volume previsto em Obras para calcular o avanço'}</small></div>
        </div>
      </section>
    </>}

    <section className="two-columns dashboard-columns">
      <div className="panel">
        <div className="panel-header"><div><h2>Agenda de ensaios</h2><p>{selectedWorkId==='all'?'Todas as obras, priorizadas por atraso e data.':'Somente a obra selecionada.'}</p></div><span className="badge muted">{agenda.length} itens</span></div>
        <div className="table-wrap"><table><thead><tr><th>Etiqueta</th><th>Obra</th><th>Idade</th><th>Ruptura</th><th>Responsável</th><th>Status</th><th></th></tr></thead><tbody>
          {loading && <tr><td colSpan={7}>Carregando...</td></tr>}
          {!loading && agenda.length===0 && <tr><td colSpan={7}>Nenhuma ruptura pendente neste filtro.</td></tr>}
          {!loading && agenda.map(r => { const late = r.dueDate < today; return <tr key={r.id}><td><b>{r.sample.labelBase}</b></td><td>{r.sample.workName}</td><td>{r.ageLabel || `${r.ageDays} dias`}</td><td>{formatDate(r.dueDate)}</td><td><select value={r.responsible || ''} onChange={e=>assign(r.sample.id,r.id,e.target.value)}><option value="">Não atribuído</option>{team.map(m=><option key={m.id}>{m.name}</option>)}</select></td><td><span className={`status ${late ? 'atrasado' : r.status}`}>{late ? 'Atrasado' : r.status.replace('_',' ')}</span></td><td><Link className="text-link" href={`/amostras/${r.sample.id}`}>Abrir</Link></td></tr>})}
        </tbody></table></div>
      </div>
      <div className="side-stack">
        <div className="panel day-check"><div className="panel-header"><div><h2>Conferência física</h2><p>Compare o sistema com as fichas do armário.</p></div><ClipboardCheck/></div><div className="donut"><div><strong>{todayR.length}</strong><span>fichas de hoje</span></div></div><p className="callout">A conferência acompanha o filtro de obra selecionado no topo.</p><Link className="button secondary" href="/amostras">Conferir fichas</Link></div>
        <div className="panel"><div className="panel-header"><h2>Ações rápidas</h2><BarChart3/></div><div className="quick-actions"><Link href="/lancamento">Lançar ficha</Link><Link href="/mapa">Mapa da obra</Link><Link href="/historico">Importar / exportar</Link></div></div>
      </div>
    </section>

    {showNoControl && (
      <div className="modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setShowNoControl(false)}}>
        <section className="modal-card no-control-modal" role="dialog" aria-modal="true" aria-labelledby="no-control-title">
          <div className="modal-header">
            <div>
              <span className="eyebrow">PENDÊNCIAS HISTÓRICAS</span>
              <h2 id="no-control-title">Registros sem controle — {noControl}</h2>
              <p>{selectedWork?.name || 'Obra selecionada'} • registros importados que não possuem laudo/controle identificado na planilha de origem.</p>
            </div>
            <button className="modal-close" onClick={()=>setShowNoControl(false)} aria-label="Fechar"><X size={22}/></button>
          </div>

          <div className="modal-summary">
            <div><span>Total</span><strong>{noControl}</strong></div>
            <div><span>Volume envolvido</span><strong>{noControlSamples.reduce((sum,s)=>sum+sampleVolume(s),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong></div>
            <div><span>Obra</span><strong>{selectedWork?.name || '—'}</strong></div>
          </div>

          <div className="table-wrap modal-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Quadra</th>
                  <th>Lote</th>
                  <th>Elemento</th>
                  <th>Concreteira</th>
                  <th>NF</th>
                  <th>Volume</th>
                  <th>Origem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {noControlSamples.map(sample=>(
                  <tr key={sample.id}>
                    <td>{formatDate(sample.moldedAt)}</td>
                    <td>{sample.block?`Q${sample.block}`:'—'}</td>
                    <td>{sample.lot?`L${sample.lot}`:'—'}</td>
                    <td>{formatElementLabel(String(sample.element || ''))}</td>
                    <td>{sample.supplier || '—'}</td>
                    <td>{sample.invoice || '—'}</td>
                    <td>{sampleVolume(sample).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td>
                    <td><span className="badge muted">{sample.importedSheet || 'Histórico'}</span></td>
                    <td><Link className="text-link" href={`/amostras/${sample.id}`} onClick={()=>setShowNoControl(false)}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-footer">
            <span>Use “Abrir” para complementar o registro e anexar documentos/fotos quando localizar a ficha física.</span>
            <button className="button secondary" onClick={()=>setShowNoControl(false)}>Fechar</button>
          </div>
        </section>
      </div>
    )}
  </div>
}
