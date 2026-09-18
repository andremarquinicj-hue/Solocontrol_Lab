'use client';

import { Download, FileSpreadsheet, History, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { exportControlWorkbook, ImportSummary, parseHistoricalWorkbook } from '@/lib/historical';
import { listSamples, saveSamplesBatch } from '@/lib/store';
import { Sample } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function HistoricoPage(){
  const { works, selectedWorkId, selectedWork, setSelectedWorkId, refreshWorks } = useWorkScope();
  const [all,setAll]=useState<Sample[]>([]);
  const [preview,setPreview]=useState<Sample[]>([]);
  const [summary,setSummary]=useState<ImportSummary>();
  const [fileName,setFileName]=useState('');
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const [targetWorkId,setTargetWorkId]=useState(selectedWorkId==='all'?'':selectedWorkId);

  useEffect(()=>{listSamples().then(setAll)},[]);
  useEffect(()=>{if(selectedWorkId!=='all')setTargetWorkId(selectedWorkId)},[selectedWorkId]);

  const targetWork=works.find(w=>w.id===targetWorkId);
  const scoped=useMemo(()=>selectedWorkId==='all'?all:all.filter(s=>s.workId===selectedWorkId),[all,selectedWorkId]);
  const history=useMemo(()=>scoped.filter(s=>s.source==='historical_excel'),[scoped]);

  async function choose(file?:File){
    if(!file)return;
    if(!targetWork){setMessage('Selecione a obra de destino antes de escolher a planilha.');return;}
    setLoading(true);setMessage('');
    try{
      const parsed=await parseHistoricalWorkbook(file,targetWork);
      setPreview(parsed.samples);setSummary(parsed.summary);setFileName(file.name);
    }catch(e){console.error(e);setMessage('Não foi possível ler a planilha. Confira se o arquivo segue o modelo de controle de concretagem.');}
    finally{setLoading(false)}
  }

  async function importNow(){
    if(!preview.length || loading)return;
    setLoading(true);
    setMessage(`Importando ${preview.length} registros... Isso pode levar alguns segundos.`);
    try{
      await saveSamplesBatch(preview);
      const updated = await listSamples();
      setAll(updated);
      await refreshWorks();
      if(targetWorkId)setSelectedWorkId(targetWorkId);
      setMessage(`${preview.length} registros históricos importados com sucesso em ${targetWork?.name}.`);
      setPreview([]);setSummary(undefined);setFileName('');
    }catch(e){
      console.error('Falha na importação histórica:', e);
      const detail = e instanceof Error ? e.message : String(e);
      setMessage(`Falha ao gravar os registros no banco. ${detail}`);
    }finally{setLoading(false)}
  }

  function exportCurrent(){
    if(selectedWorkId==='all'||!selectedWork){setMessage('Selecione uma obra específica no topo para exportar no modelo de controle.');return;}
    exportControlWorkbook(all,selectedWorkId,selectedWork.name);
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">BASE HISTÓRICA</span><h1>Importar / Exportar Excel</h1><p>O histórico é vinculado à obra escolhida e permanece separado da agenda operacional.</p></div><button className="button secondary" onClick={exportCurrent} disabled={selectedWorkId==='all'}><Download size={17}/> Exportar obra selecionada</button></section>

    <section className="history-kpis">
      <div className="panel mini-kpi"><History/><div><span>Registros históricos</span><strong>{history.length}</strong></div></div>
      <div className="panel mini-kpi"><FileSpreadsheet/><div><span>Com laudo</span><strong>{history.filter(s=>s.reportNumber).length}</strong></div></div>
      <div className="panel mini-kpi"><FileSpreadsheet/><div><span>Sem controle</span><strong>{history.filter(s=>s.historicalState==='sem_controle').length}</strong></div></div>
      <div className="panel mini-kpi"><FileSpreadsheet/><div><span>Volume histórico</span><strong>{history.reduce((a,s)=>a+(Number(String(s.volumeM3||0).replace(',','.'))||0),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong></div></div>
    </section>

    <section className="two-columns import-columns">
      <div className="panel import-drop"><UploadCloud size={38}/><h2>Importar planilha existente</h2><p>Primeiro selecione em qual obra os registros serão gravados.</p><label className="import-work-select">Obra de destino<select value={targetWorkId} onChange={e=>{setTargetWorkId(e.target.value);setPreview([]);setSummary(undefined);setFileName('');setMessage('')}}><option value="">Selecione...</option>{works.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label className={`button primary file-button ${!targetWork?'disabled':''}`}>{loading?'Analisando...':'Selecionar Excel'}<input type="file" accept=".xlsx,.xls" disabled={!targetWork||loading} onChange={e=>choose(e.target.files?.[0])}/></label>{fileName&&<small>Arquivo: {fileName}</small>}{message&&<div className="import-message">{message}</div>}</div>
      <div className="panel"><h2>Regras da importação</h2><div className="rule-list"><span>✓ Cada planilha é vinculada a uma <b>obra específica</b>.</span><span>✓ Registros antigos entram como <b>Histórico importado</b>.</span><span>✓ Não entram na agenda diária nem viram “atrasados”.</span><span>✓ “SEM CONTROLE”, “DESCARTADO” e datas previstas são preservados.</span><span>✓ Quadra e lote alimentam o mapa da obra selecionada.</span><span>✓ Fotos não são obrigatórias no legado; podem ser anexadas depois.</span></div></div>
    </section>

    {summary&&preview.length>0&&<section className="panel"><div className="panel-header"><div><h2>Prévia antes de importar</h2><p>Destino: <b>{targetWork?.name}</b>. Nenhum dado foi gravado ainda.</p></div><button className="button primary" onClick={importNow} disabled={loading}>{loading?`Importando ${summary.rows} registros...`:`Importar ${summary.rows} registros`}</button></div>
      <div className="preview-stats"><div><span>Registros</span><b>{summary.rows}</b></div><div><span>Com controle</span><b>{summary.controlled}</b></div><div><span>Sem controle</span><b>{summary.withoutControl}</b></div><div><span>Parciais</span><b>{summary.partial}</b></div><div><span>Volume</span><b>{summary.volumeM3.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</b></div><div><span>Período</span><b>{formatDate(summary.firstDate)} → {formatDate(summary.lastDate)}</b></div></div>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>Quadra</th><th>Lote</th><th>Elemento</th><th>Concreteira</th><th>NF</th><th>Laudo</th><th>Estado</th></tr></thead><tbody>{preview.slice(0,12).map(s=><tr key={s.id}><td>{formatDate(s.moldedAt)}</td><td>Q{s.block}</td><td>L{s.lot}</td><td>{s.element}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{s.reportNumber||'—'}</td><td><span className="badge muted">{s.historicalState}</span></td></tr>)}</tbody></table></div>
    </section>}
  </div>
}
