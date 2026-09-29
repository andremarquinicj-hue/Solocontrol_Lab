'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FlaskConical,
  Home,
  Layers3,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Users2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import StatCard from '@/components/StatCard';
import { listSamples, listTeam, saveSample } from '@/lib/store';
import { Sample, TeamMember } from '@/lib/types';
import { formatDate, isoToday, isRuptureOverdue, ruptureAgeLabel, ruptureScheduleLabel } from '@/lib/utils';
import {
  completedTests,
  elementProgress,
  formatElementLabel,
  normalizeElementGroup,
  overallProgress,
  sampleCollectionDate,
  sampleVolume,
  uniqueReports,
  workSamples,
} from '@/lib/work-analytics';
import { analyzeFormRelease, resolveSpecimens } from '@/lib/technical-analysis';
import { checkSlump, resolveProcessProfile, sampleProcessType } from '@/lib/process-profiles';
import { pictogramForWork, villaConstructionHighlights } from '@/lib/pictogram';

function formatNumber(value: number, digits = 1) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: digits });
}

function monthLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const year = date.toLocaleDateString('pt-BR', { year: '2-digit' });
  return `${month}/${year}`;
}

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

  useEffect(() => {
    load();
  }, []);

  const scoped = useMemo(() => workSamples(samples, selectedWorkId), [samples, selectedWorkId]);
  const operationalSamples = useMemo(
    () => scoped.filter(sample => !sample.archived && sample.includeInOperations !== false && sample.source !== 'historical_excel'),
    [scoped],
  );
  const ruptures = useMemo(
    () => operationalSamples.flatMap(sample => sample.ruptures.map(r => ({ ...r, sample }))),
    [operationalSamples],
  );

  const todayR = ruptures.filter(r => r.dueDate === today && r.status !== 'concluido');
  const overdue = ruptures.filter(r => isRuptureOverdue(r));
  const future = ruptures.filter(r => r.status !== 'concluido' && !isRuptureOverdue(r) && r.dueDate !== today);
  const dueKey = (r: typeof ruptures[number]) => r.dueAt || `${r.dueDate}T23:59`;
  const agenda = [
    ...overdue.sort((a, b) => dueKey(a).localeCompare(dueKey(b))),
    ...todayR.filter(r => !isRuptureOverdue(r)).sort((a, b) => dueKey(a).localeCompare(dueKey(b))),
    ...future.sort((a, b) => dueKey(a).localeCompare(dueKey(b))),
  ].slice(0, 12);

  const totalVolume = scoped.reduce((a, s) => a + sampleVolume(s), 0);
  const totalTests = completedTests(scoped);
  const reportCount = uniqueReports(scoped);
  const noControlSamples = useMemo(
    () => scoped
      .filter(s => s.historicalState === 'sem_controle' && !s.historicalBaselineClosed && !s.archived && s.includeInOperations !== false)
      .sort((a, b) => sampleCollectionDate(b).localeCompare(sampleCollectionDate(a))),
    [scoped],
  );
  const noControl = noControlSamples.length;
  const progress = selectedWorkId !== 'all' ? elementProgress(scoped, selectedWork) : [];

  const eligibleReserveCount = useMemo(() => scoped.reduce((sum, sample) => {
    const work = works.find(w => w.id === sample.workId);
    return sum + resolveSpecimens(sample, work).filter(cp => cp.status === 'elegivel_descarte').length;
  }, 0), [scoped, works]);

  const slumpAlerts = useMemo(() => scoped.filter(sample => {
    const work = works.find(w => w.id === sample.workId);
    const profile = resolveProcessProfile(work, sampleProcessType(sample));
    const result = checkSlump(profile, sample.slumpActualCm);
    return result.status === 'low' || result.status === 'high';
  }), [scoped, works]);

  const formReleasePending = useMemo(() => scoped.filter(sample => {
    const work = works.find(w => w.id === sample.workId);
    const analysis = analyzeFormRelease(sample, work);
    return analysis.applicable && ['pending', 'not_configured', 'below'].includes(analysis.decision);
  }), [scoped, works]);

  const formReleaseReady = useMemo(() => scoped.filter(sample => {
    const work = works.find(w => w.id === sample.workId);
    return analyzeFormRelease(sample, work).decision === 'eligible';
  }), [scoped, works]);

  const volumePercent = selectedWork?.plannedVolumeM3 ? Math.min(100, (totalVolume / selectedWork.plannedVolumeM3) * 100) : undefined;
  const overall = selectedWorkId !== 'all' ? overallProgress(scoped, selectedWork) : undefined;
  const activeTeam = useMemo(() => team.filter(member => member.active), [team]);

  const pictogram = useMemo(() => pictogramForWork(selectedWork), [selectedWork]);
  const constructionHighlights = useMemo(() => villaConstructionHighlights(pictogram), [pictogram]);
  const houseConcreteTotal = pictogram?.houseConcrete.total || 0;
  const houseConcretePercent = pictogram?.totalUnits ? (houseConcreteTotal / pictogram.totalUnits) * 100 : undefined;

  const latestUpdate = useMemo(() => {
    const latest = scoped.reduce((acc, sample) => {
      const stamp = sample.updatedAt || sample.createdAt;
      return stamp > acc ? stamp : acc;
    }, '');
    return latest ? new Date(latest).toLocaleDateString('pt-BR') + ' ' + new Date(latest).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  }, [scoped]);

  const workRows = useMemo(() => works.map(work => {
    const ws = samples.filter(s => s.workId === work.id);
    return {
      work,
      samples: ws.length,
      volume: ws.reduce((a, s) => a + sampleVolume(s), 0),
      tests: completedTests(ws),
      progress: overallProgress(ws, work),
      noControl: ws.filter(s => s.historicalState === 'sem_controle' && !s.historicalBaselineClosed && !s.archived && s.includeInOperations !== false).length,
    };
  }).filter(row => row.samples > 0 || row.work.active), [works, samples]);

  const trendSeries = useMemo(() => {
    const bucket = new Map<string, number>();
    scoped.forEach(sample => {
      const key = sampleCollectionDate(sample).slice(0, 7);
      bucket.set(key, (bucket.get(key) || 0) + sampleVolume(sample));
    });
    return Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, value]) => ({ key, label: monthLabel(`${key}-01`), value }));
  }, [scoped]);
  const trendMax = Math.max(...trendSeries.map(item => item.value), 1);

  const distribution = useMemo(() => {
    const grouped = new Map<string, number>();
    scoped.forEach(sample => {
      const key = normalizeElementGroup(sample.element);
      if (key === 'OUTROS') return;
      grouped.set(key, (grouped.get(key) || 0) + sampleVolume(sample));
    });
    const colors = ['#0B5FB8', '#3182CE', '#69AEE8', '#9ACAF4'];
    return Array.from(grouped.entries())
      .map(([element, value], index) => ({
        element,
        label: formatElementLabel(element),
        value,
        share: totalVolume ? (value / totalVolume) * 100 : 0,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [scoped, totalVolume]);

  const distributionBackground = useMemo(() => {
    if (!distribution.length) return 'conic-gradient(#dfe8f0 0 100%)';
    let cumulative = 0;
    const stops = distribution.map(item => {
      const start = cumulative;
      cumulative += item.share;
      return `${item.color} ${start}% ${Math.min(100, cumulative)}%`;
    });
    if (cumulative < 100) stops.push(`#dfe8f0 ${cumulative}% 100%`);
    return `conic-gradient(${stops.join(',')})`;
  }, [distribution]);

  const summaryTone = overdue.length > 0 || noControl > 0 ? 'attention' : (volumePercent || 0) >= 50 ? 'good' : 'neutral';
  const summaryBadge = overdue.length > 0 || noControl > 0 ? 'Atenção operacional' : 'Objeto no prazo';
  const summaryText = overdue.length > 0
    ? `Existem ${overdue.length} pendência(s) atrasada(s) que merecem ação imediata. O restante do histórico segue rastreado e disponível para consulta.`
    : `Boa evolução da produção${volumePercent !== undefined ? `, com ${volumePercent.toFixed(1)}% do volume previsto executado` : ''}. Todos os ensaios cadastrados permanecem rastreados, com foco em qualidade, prazo e transparência.`;

  async function assign(sampleId: string, ruptureId: string, responsible: string) {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;
    const updated: Sample = {
      ...sample,
      ruptures: sample.ruptures.map(r => r.id === ruptureId ? { ...r, responsible, status: responsible ? 'em_execucao' : 'pendente' } : r),
      updatedAt: new Date().toISOString(),
    };
    await saveSample(updated);
    await load();
  }

  return <div className="page-stack">
    {selectedWorkId === 'all' ? <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">VISÃO GERENCIAL</span>
          <h1>Dashboard da Solocontrol</h1>
          <p>Visão consolidada das obras e da operação do laboratório.</p>
        </div>
        <Link className="button primary" href="/lancamento">+ Lançar nova ficha</Link>
      </section>

      <section className="stats-grid">
        <StatCard label="Obras monitoradas" value={workRows.length} icon={<Layers3 />} hint="com cadastro ou registros" />
        <StatCard label="Volume controlado" value={`${formatNumber(totalVolume)} m³`} icon={<PackageCheck />} hint="acumulado" />
        <StatCard label="Ensaios realizados" value={totalTests} icon={<FlaskConical />} hint="rupturas concluídas" />
        <StatCard label="Laudos registrados" value={reportCount} icon={<FileCheck2 />} hint="números únicos" />
        <StatCard label="Ensaios de hoje" value={todayR.length} icon={<CalendarDays />} hint="rupturas programadas" />
        <StatCard label="Atrasados" value={overdue.length} icon={<AlertTriangle />} tone="red" hint="exigem ação" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Resumo por obra</h2>
            <p>Selecione uma obra no topo para abrir o dashboard detalhado.</p>
          </div>
          <BarChart3 />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Obra</th><th>Progresso</th><th>Registros</th><th>Volume</th><th>Ensaios</th><th>Sem controle</th></tr>
            </thead>
            <tbody>
              {workRows.map(row => (
                <tr key={row.work.id}>
                  <td><b>{row.work.name}</b><br /><small>{row.work.client}</small></td>
                  <td>{row.progress !== undefined ? <div className="table-progress"><div><span style={{ width: `${row.progress}%` }} /></div><b>{row.progress.toFixed(1)}%</b></div> : <span className="badge muted">Sem meta</span>}</td>
                  <td>{row.samples}</td>
                  <td>{formatNumber(row.volume)} m³</td>
                  <td>{row.tests}</td>
                  <td>{row.noControl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </> : <>
      <section className="executive-hero panel">
        <div className="executive-hero-copy">
          <span className="eyebrow">VISÃO GERENCIAL</span>
          <h1>{selectedWork?.name || 'Dashboard da Obra'}</h1>
          <p>Produção, qualidade e rastreabilidade da obra.</p>
          <div className="hero-meta-row">
            <span className="hero-chip success"><CheckCircle2 size={16} /> Operação ativa</span>
            {selectedWork?.operationalStartDate && <span className="hero-chip neutral"><CalendarDays size={16} /> Histórico de dados a partir de <b>{formatDate(selectedWork.operationalStartDate)}</b></span>}
          </div>
        </div>
        <div className="executive-hero-side">
          <div>
            <strong>Qualidade em cada etapa, confiança no resultado.</strong>
            <span>Painel executivo pensado para diretoria, coordenação e acompanhamento do cliente.</span>
          </div>
          <Link className="button primary hero-button" href="/lancamento">+ Lançar nova ficha</Link>
        </div>
      </section>

      <section className="stats-grid executive-stats-grid">
        <StatCard label="Registros de concretagem" value={scoped.length} icon={<Layers3 />} hint="histórico + operação" tone="blue" />
        <StatCard label="Volume de concreto" value={`${formatNumber(totalVolume)} m³`} icon={<PackageCheck />} hint="acumulado" tone="blue" />
        <StatCard label="Ensaios realizados" value={totalTests} icon={<FlaskConical />} hint="rupturas concluídas" tone="green" />
        <StatCard label="Laudos registrados" value={reportCount} icon={<FileCheck2 />} hint="números únicos" tone="purple" />
        <StatCard label="Pendências atuais" value={overdue.length + todayR.length} icon={<AlertTriangle />} tone={overdue.length ? 'red' : 'amber'} hint={`${overdue.length} atrasado(s)`} />
        <StatCard label="Sem controle" value={noControl} icon={<ShieldCheck />} tone={noControl ? 'red' : 'green'} hint={noControl ? 'clique para ver pendências' : 'nenhuma pendência histórica'} onClick={noControl ? () => setShowNoControl(true) : undefined} title={noControl ? 'Abrir registros sem controle' : undefined} />
      </section>

      {pictogram && <section className="panel pictogram-progress-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">AVANÇO FÍSICO COPLAN</span>
            <h2>Pictograma atualizado da Villa Arauco</h2>
            <p>Base recebida em {formatDate(pictogram.receivedAt)} • {pictogram.sourceFile}</p>
          </div>
          <span className="status-pill good">620 unidades</span>
        </div>
        <div className="pictogram-highlight-grid">
          {constructionHighlights.map(item => <div className="pictogram-highlight-card" key={item.key}>
            <div className="pictogram-highlight-head"><span>{item.label}</span><b>{item.count} / {item.total}</b></div>
            <div className="pictogram-progress-track"><i style={{ width: `${item.percent}%` }} /></div>
            <small>{item.percent.toFixed(1)}% do empreendimento</small>
          </div>)}
          <div className="pictogram-highlight-card featured">
            <div className="pictogram-highlight-head"><span>Paredes e lajes concretadas</span><b>{houseConcreteTotal} / {pictogram.totalUnits}</b></div>
            <div className="pictogram-progress-track"><i style={{ width: `${houseConcretePercent ?? 0}%` }} /></div>
            <small>{houseConcretePercent !== undefined ? `${houseConcretePercent.toFixed(1)}% do empreendimento` : '—'}</small>
          </div>
        </div>
        <div className="pictogram-source-details">
          {pictogram.stages.map(stage => <div key={stage.sheet}>
            <b>{stage.sheet}</b>
            <div>{stage.statuses.map(status => <span key={`${stage.sheet}-${status.code}`}>{status.label}: <strong>{status.count ?? '—'}</strong></span>)}</div>
            {stage.dateRange&&<small>Datas registradas: {formatDate(stage.dateRange.first)} a {formatDate(stage.dateRange.last)}</small>}
          </div>)}
        </div>
        <div className="pictogram-note">
          <ShieldCheck size={18}/>
          <span>Este bloco mostra o avanço físico informado no pictograma da COPLAN. Os indicadores de ensaios, laudos, volume e rastreabilidade Solocontrol continuam sendo calculados separadamente a partir das fichas e resultados do laboratório.</span>
        </div>
      </section>}

      <section className="executive-dashboard-grid">
        <section className="panel executive-progress-panel">
          <div className="panel-header">
            <div>
              <h2>Cobertura de controle Solocontrol</h2>
              <p>Unidades com registros de controle tecnológico no sistema, sem duplicidade por caminhão ou nota fiscal.</p>
            </div>
            <div className="executive-updated"><Clock3 size={16} /><span>Atualizado em {latestUpdate}</span></div>
          </div>
          <div className="executive-progress-layout">
            <div className="progress-grid executive-progress-grid">
              {progress.map(item => (
                <div className="progress-card executive-progress-card" key={item.element}>
                  <div className="progress-card-head"><span>{formatElementLabel(item.element)}</span><b>{item.completed}{item.target ? ` / ${item.target}` : ''}</b></div>
                  <div className="progress-bar"><span style={{ width: `${item.percent ?? (item.completed ? 100 : 0)}%` }} /></div>
                  <small>{item.percent !== undefined ? `${item.percent.toFixed(1)}% concluído` : 'Meta não configurada na obra'}</small>
                </div>
              ))}
            </div>
            <div className="executive-side-metrics">
              <div className="executive-mini-card">
                <div className="executive-mini-icon"><Home size={22} /></div>
                <div>
                  <span>Unidades previstas</span>
                  <strong>{selectedWork?.plannedUnits ? formatNumber(selectedWork.plannedUnits, 0) : '—'}</strong>
                  <small>Total da obra</small>
                </div>
              </div>
              <div className="executive-mini-card">
                <div className="executive-mini-icon"><TrendingUp size={22} /></div>
                <div>
                  <span>Volume previsto x realizado</span>
                  <strong>{formatNumber(totalVolume)} <em>/ {selectedWork?.plannedVolumeM3 ? `${formatNumber(selectedWork.plannedVolumeM3)} m³` : 'sem meta'}</em></strong>
                  <div className="executive-mini-progress"><span style={{ width: `${volumePercent ?? 0}%` }} /></div>
                  <small>{volumePercent !== undefined ? `${volumePercent.toFixed(1)}% realizado` : 'Cadastre o volume previsto em Obras'}</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel executive-volume-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Evolução da produção</h2>
              <p>Volume de concreto (m³) por período consolidado.</p>
            </div>
            <span className="badge muted">Últimos {trendSeries.length || 0} períodos</span>
          </div>
          <div className="volume-chart">
            {trendSeries.map(item => (
              <div key={item.key} className="volume-chart-col">
                <div className="volume-chart-bar-wrap"><span className="volume-chart-bar" style={{ height: `${(item.value / trendMax) * 100}%` }} /></div>
                <b>{item.label}</b>
                <small>{formatNumber(item.value)} m³</small>
              </div>
            ))}
            {!trendSeries.length && <div className="empty-state chart-empty"><b>Sem dados suficientes</b><span>Os períodos aparecerão conforme novas fichas forem lançadas.</span></div>}
          </div>
        </section>

        <section className="panel executive-distribution-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Distribuição por elemento</h2>
              <p>Participação no volume total concretado.</p>
            </div>
          </div>
          <div className="distribution-layout">
            <div className="distribution-donut" style={{ background: distributionBackground }}>
              <div>
                <strong>{formatNumber(totalVolume)}</strong>
                <span>m³</span>
              </div>
            </div>
            <div className="distribution-legend">
              {distribution.map(item => (
                <div key={item.element}>
                  <span><i style={{ background: item.color }} />{item.label}</span>
                  <b>{item.share.toFixed(1)}%</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`panel executive-summary-panel ${summaryTone}`}>
          <div className="panel-header compact-header">
            <div>
              <h2>Resumo gerencial</h2>
              <p>Leitura rápida para diretoria e coordenação.</p>
            </div>
            <span className={`status-pill ${summaryTone}`}>{summaryBadge}</span>
          </div>
          <div className="executive-summary-body">
            <div className="summary-icon"><ClipboardCheck size={22} /></div>
            <p>{summaryText}</p>
            <ul>
              <li><b>{overall !== undefined ? `${overall.toFixed(1)}%` : '—'}</b><span>cobertura de controle consolidada</span></li>
              <li><b>{slumpAlerts.length}</b><span>alerta(s) de slump</span></li>
              <li><b>{eligibleReserveCount}</b><span>CPs 63d elegíveis para avaliação</span></li>
            </ul>
          </div>
        </section>
      </section>

      <section className="executive-bottom-grid">
        <section className="panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Controle operacional do laboratório</h2>
              <p>Alertas automáticos para priorização do coordenador.</p>
            </div>
          </div>
          <div className="operations-grid executive-operations-grid">
            <div className={slumpAlerts.length ? 'attention' : 'good'}><span>Slump fora da faixa</span><strong>{slumpAlerts.length}</strong><small>Hoje</small></div>
            <div className={formReleasePending.length ? 'attention' : ''}><span>Liberação de forma em acompanhamento</span><strong>{formReleasePending.length}</strong><small>Aguardando resultado</small></div>
            <div className={eligibleReserveCount ? 'good' : ''}><span>CPs elegíveis para descarte 63 dias</span><strong>{eligibleReserveCount}</strong><small>Em estoque</small></div>
            <div><span>Rompimentos programados hoje</span><strong>{todayR.length}</strong><small>Ensaios</small></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Agenda do dia</h2>
              <p>Rupturas priorizadas por atraso e vencimento.</p>
            </div>
            <Link href="/coordenacao" className="text-link">Ver agenda completa →</Link>
          </div>
          <div className="table-wrap executive-agenda-table">
            <table>
              <thead>
                <tr><th>Horário</th><th>Quadra / Lote</th><th>Elemento</th><th>NF</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5}>Carregando...</td></tr>}
                {!loading && agenda.length === 0 && <tr><td colSpan={5}>Nenhuma ruptura pendente neste filtro.</td></tr>}
                {!loading && agenda.slice(0, 5).map(r => {
                  const late = isRuptureOverdue(r);
                  return (
                    <tr key={r.id}>
                      <td>{r.dueAt ? r.dueAt.slice(11, 16) : '—'}</td>
                      <td>{r.sample.block ? `Qd. ${r.sample.block}` : '—'} {r.sample.lot ? `• Lote ${r.sample.lot}` : ''}</td>
                      <td>{formatElementLabel(String(r.sample.element || ''))}</td>
                      <td>{r.sample.invoice || '—'}</td>
                      <td><span className={`status ${late ? 'atrasado' : r.status}`}>{late ? 'Atrasado' : r.status.replace('_', ' ')}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel team-panel">
          <div className="panel-header compact-header">
            <div>
              <h2>Equipe do laboratório</h2>
              <p>Colaboradores cadastrados e ativos.</p>
            </div>
            <span className="status-pill good">Todos ativos</span>
          </div>
          <div className="team-grid">
            {activeTeam.map(member => (
              <div key={member.id} className="team-card">
                <div className="team-avatar"><Users2 size={14} /></div>
                <span>{member.name}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </>}

    <section className="two-columns dashboard-columns" style={{ display: selectedWorkId === 'all' ? 'grid' : 'none' }}>
      <div className="panel">
        <div className="panel-header"><div><h2>Agenda de ensaios</h2><p>{selectedWorkId === 'all' ? 'Todas as obras, priorizadas por atraso e data.' : 'Somente a obra selecionada.'}</p></div><span className="badge muted">{agenda.length} itens</span></div>
        <div className="table-wrap"><table><thead><tr><th>Etiqueta</th><th>Obra</th><th>Idade</th><th>Ruptura</th><th>Responsável</th><th>Status</th><th></th></tr></thead><tbody>
          {loading && <tr><td colSpan={7}>Carregando...</td></tr>}
          {!loading && agenda.length === 0 && <tr><td colSpan={7}>Nenhuma ruptura pendente neste filtro.</td></tr>}
          {!loading && agenda.map(r => {
            const late = isRuptureOverdue(r);
            return <tr key={r.id}><td><b>{r.sample.labelBase}</b></td><td>{r.sample.workName}</td><td>{ruptureAgeLabel(r)}</td><td>{ruptureScheduleLabel(r)}</td><td><select value={r.responsible || ''} onChange={e => assign(r.sample.id, r.id, e.target.value)}><option value="">Não atribuído</option>{team.map(m => <option key={m.id}>{m.name}</option>)}</select></td><td><span className={`status ${late ? 'atrasado' : r.status}`}>{late ? 'Atrasado' : r.status.replace('_', ' ')}</span></td><td><Link className="text-link" href={`/amostras/${r.sample.id}`}>Abrir</Link></td></tr>;
          })}
        </tbody></table></div>
      </div>
      <div className="side-stack">
        <div className="panel day-check"><div className="panel-header"><div><h2>Conferência física</h2><p>Compare o sistema com as fichas do armário.</p></div><ClipboardCheck /></div><div className="donut"><div><strong>{todayR.length}</strong><span>fichas de hoje</span></div></div><p className="callout">A conferência acompanha o filtro de obra selecionado no topo.</p><Link className="button secondary" href="/amostras">Conferir fichas</Link></div>
        {eligibleReserveCount > 0 && <div className="panel reserve-dashboard-alert"><div className="panel-header"><div><h2>CPs de reserva</h2><p>Há espaço que pode ser liberado após avaliação.</p></div><PackageCheck /></div><strong>{eligibleReserveCount}</strong><span>CP(s) elegível(is) para avaliação de descarte</span><Link className="button secondary full" href="/tanque">Abrir Gestão do Tanque</Link></div>}
        <div className="panel"><div className="panel-header"><h2>Ações rápidas</h2><BarChart3 /></div><div className="quick-actions"><Link href="/lancamento">Lançar ficha</Link><Link href="/mapa">Mapa da obra</Link><Link href="/tanque">Gestão do tanque</Link><Link href="/historico">Importar / exportar</Link></div></div>
      </div>
    </section>

    {showNoControl && (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNoControl(false); }}>
        <section className="modal-card no-control-modal" role="dialog" aria-modal="true" aria-labelledby="no-control-title">
          <div className="modal-header">
            <div>
              <span className="eyebrow">PENDÊNCIAS HISTÓRICAS</span>
              <h2 id="no-control-title">Registros sem controle — {noControl}</h2>
              <p>{selectedWork?.name || 'Obra selecionada'} • registros importados que não possuem laudo/controle identificado na planilha de origem.</p>
            </div>
            <button className="modal-close" onClick={() => setShowNoControl(false)} aria-label="Fechar"><X size={22} /></button>
          </div>

          <div className="modal-summary">
            <div><span>Total</span><strong>{noControl}</strong></div>
            <div><span>Volume envolvido</span><strong>{formatNumber(noControlSamples.reduce((sum, s) => sum + sampleVolume(s), 0))} m³</strong></div>
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
                {noControlSamples.map(sample => (
                  <tr key={sample.id}>
                    <td>{formatDate(sampleCollectionDate(sample))}</td>
                    <td>{sample.block ? `Q${sample.block}` : '—'}</td>
                    <td>{sample.lot ? `L${sample.lot}` : '—'}</td>
                    <td>{formatElementLabel(String(sample.element || ''))}</td>
                    <td>{sample.supplier || '—'}</td>
                    <td>{sample.invoice || '—'}</td>
                    <td>{formatNumber(sampleVolume(sample))} m³</td>
                    <td><span className="badge muted">{sample.importedSheet || 'Histórico'}</span></td>
                    <td><Link className="text-link" href={`/amostras/${sample.id}`} onClick={() => setShowNoControl(false)}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-footer">
            <span>Use “Abrir” para complementar o registro e anexar documentos/fotos quando localizar a ficha física.</span>
            <button className="button secondary" onClick={() => setShowNoControl(false)}>Fechar</button>
          </div>
        </section>
      </div>
    )}
  </div>;
}
