'use client';

import { Archive, CheckCircle2, DatabaseZap, Download, FileSpreadsheet, History, RefreshCw, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { exportControlWorkbook, ImportSummary, parseHistoricalWorkbook } from '@/lib/historical';
import {
  BundledRupturePayload,
  bundledPayloadToRecords,
  isRuptureControlWorkbook,
  parseRuptureControlWorkbook,
  reconcileRuptureRecords,
  RuptureReconciliation,
} from '@/lib/rupture-import';
import { listRuptureImports, listSamples, saveRuptureImportsBatch, saveSamplesBatch } from '@/lib/store';
import { RuptureImportRecord, Sample } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { isVillaAraucoWork } from '@/lib/process-profiles';
import { finalizeHistoricalSample, OPERATIONAL_CUTOVER_DATE } from '@/lib/historical-baseline';

export default function HistoricoPage(){
  const { works, selectedWorkId, selectedWork, setSelectedWorkId, refreshWorks } = useWorkScope();
  const [all,setAll]=useState<Sample[]>([]);
  const [ruptureImports,setRuptureImports]=useState<RuptureImportRecord[]>([]);
  const [preview,setPreview]=useState<Sample[]>([]);
  const [summary,setSummary]=useState<ImportSummary>();
  const [rupturePreview,setRupturePreview]=useState<RuptureReconciliation>();
  const [fileName,setFileName]=useState('');
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState('');
  const [targetWorkId,setTargetWorkId]=useState(selectedWorkId==='all'?'':selectedWorkId);
  const [ruptureSearch,setRuptureSearch]=useState('');

  async function reload(){
    const [samples,imports]=await Promise.all([listSamples(),listRuptureImports()]);
    setAll(samples);setRuptureImports(imports);
  }
  useEffect(()=>{reload()},[]);
  useEffect(()=>{if(selectedWorkId!=='all')setTargetWorkId(selectedWorkId)},[selectedWorkId]);

  const targetWork=works.find(w=>w.id===targetWorkId);
  const scoped=useMemo(()=>selectedWorkId==='all'?all:all.filter(s=>s.workId===selectedWorkId),[all,selectedWorkId]);
  const history=useMemo(()=>scoped.filter(s=>s.source==='historical_excel'),[scoped]);
  const scopedRuptureImports=useMemo(()=>selectedWorkId==='all'?ruptureImports:ruptureImports.filter(r=>r.workId===selectedWorkId),[ruptureImports,selectedWorkId]);
  const unresolved=useMemo(()=>scopedRuptureImports.filter(r=>r.matchStatus!=='matched'),[scopedRuptureImports]);
  const visibleRuptureArchive=useMemo(()=>{const q=ruptureSearch.trim().toLowerCase();if(!q)return scopedRuptureImports;return scopedRuptureImports.filter(r=>[r.concreteDate,r.sourceSheet,r.identification,r.supplier,r.invoice,r.projectMpa,r.ap,r.rp,r.observation].some(value=>String(value??'').toLowerCase().includes(q)))},[scopedRuptureImports,ruptureSearch]);
  const historicalClosed=useMemo(()=>scoped.filter(s=>s.historicalBaselineClosed||s.archived&&s.includeInOperations===false).length,[scoped]);
  const priorOperationalPending=useMemo(()=>scoped.filter(s=>(s.collectedAt||s.moldedAt)<OPERATIONAL_CUTOVER_DATE&&!s.archived&&s.includeInOperations!==false).length,[scoped]);
  const isVilla=Boolean(targetWork&&isVillaAraucoWork(targetWork));

  function resetPreview(){setPreview([]);setSummary(undefined);setRupturePreview(undefined);setFileName('');}

  async function choose(file?:File){
    if(!file)return;
    if(!targetWork){setMessage('Selecione a obra de destino antes de escolher a planilha.');return;}
    setLoading(true);setMessage('');resetPreview();
    try{
      const ruptureFormat=await isRuptureControlWorkbook(file);
      if(ruptureFormat){
        const records=await parseRuptureControlWorkbook(file,targetWork);
        const reconciled=reconcileRuptureRecords(records,all,targetWork);
        setRupturePreview(reconciled);setFileName(file.name);
        setMessage(`Planilha de rupturas reconhecida: ${reconciled.summary.sourceRows} linha(s). O sistema vinculou automaticamente ${reconciled.summary.matchedRows} linha(s) a ${reconciled.summary.matchedSamples} ficha(s) existentes.`);
      }else{
        const parsed=await parseHistoricalWorkbook(file,targetWork);
        setPreview(parsed.samples);setSummary(parsed.summary);setFileName(file.name);
      }
    }catch(e){
      console.error(e);
      const detail=e instanceof Error?e.message:String(e);
      setMessage(`Não foi possível analisar a planilha. ${detail}`);
    }finally{setLoading(false)}
  }

  async function loadBundledUpdate(){
    if(!targetWork||!isVilla)return;
    setLoading(true);setMessage('Carregando a base final de rupturas recebida em 23/09/2026...');resetPreview();
    try{
      const response=await fetch('/data/villa-arauco-rupturas-final-2026-09-23.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Arquivo de atualização não encontrado no pacote.');
      const payload=await response.json() as BundledRupturePayload;
      const records=bundledPayloadToRecords(payload,targetWork);
      const reconciled=reconcileRuptureRecords(records,all,targetWork);
      setRupturePreview(reconciled);setFileName(payload.sourceFile);
      setMessage(`Base pronta para sincronização: ${reconciled.summary.matchedRows} linha(s) vinculadas automaticamente e ${reconciled.summary.unmatchedRows+reconciled.summary.ambiguousRows} preservadas no arquivo complementar sem vínculo espacial.`);
    }catch(e){
      console.error(e);setMessage(e instanceof Error?e.message:String(e));
    }finally{setLoading(false)}
  }

  async function importHistorical(){
    if(!preview.length||loading)return;
    setLoading(true);setMessage(`Importando ${preview.length} registros históricos...`);
    try{
      await saveSamplesBatch(preview.map(finalizeHistoricalSample));
      await reload();await refreshWorks();
      if(targetWorkId)setSelectedWorkId(targetWorkId);
      setMessage(`${preview.length} registros históricos importados com sucesso em ${targetWork?.name}.`);
      resetPreview();
    }catch(e){
      console.error(e);setMessage(`Falha ao gravar os registros. ${e instanceof Error?e.message:String(e)}`);
    }finally{setLoading(false)}
  }

  async function applyRuptureUpdate(){
    if(!rupturePreview||loading)return;
    setLoading(true);setMessage(`Atualizando ${rupturePreview.summary.matchedSamples} ficha(s) e arquivando ${rupturePreview.summary.sourceRows} linha(s) da planilha de rupturas...`);
    try{
      if(rupturePreview.updatedSamples.length)await saveSamplesBatch(rupturePreview.updatedSamples.map(finalizeHistoricalSample));
      await saveRuptureImportsBatch(rupturePreview.records);
      await reload();await refreshWorks();
      if(targetWorkId)setSelectedWorkId(targetWorkId);
      setMessage(`Atualização concluída: ${rupturePreview.summary.matchedSamples} ficha(s) receberam MPa/resultados atualizados. ${rupturePreview.summary.unmatchedRows+rupturePreview.summary.ambiguousRows} linha(s) sem vínculo espacial foram preservadas sem alterar o mapa.`);
      resetPreview();
    }catch(e){
      console.error(e);setMessage(`Falha na sincronização da planilha de rupturas. ${e instanceof Error?e.message:String(e)}`);
    }finally{setLoading(false)}
  }

  function exportCurrent(){
    if(selectedWorkId==='all'||!selectedWork){setMessage('Selecione uma obra específica no topo para exportar no modelo de controle.');return;}
    exportControlWorkbook(all,selectedWorkId,selectedWork.name);
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">BASE HISTÓRICA E RESULTADOS</span><h1>Importar / Sincronizar Excel</h1><p>O sistema reconhece a planilha de concretagens e a planilha atualizada de controle de CPs/rupturas.</p></div><button className="button secondary" onClick={exportCurrent} disabled={selectedWorkId==='all'}><Download size={17}/> Exportar obra selecionada</button></section>

    <section className="history-kpis">
      <div className="panel mini-kpi"><History/><div><span>Fichas históricas</span><strong>{history.length}</strong></div></div>
      <div className="panel mini-kpi"><DatabaseZap/><div><span>Linhas da base de rupturas</span><strong>{scopedRuptureImports.length}</strong></div></div>
      <div className="panel mini-kpi"><Archive/><div><span>Arquivo complementar</span><strong>{unresolved.length}</strong></div></div>
      <div className="panel mini-kpi"><CheckCircle2/><div><span>Pendências anteriores</span><strong>{priorOperationalPending}</strong></div></div>
    </section>

    {isVilla&&<section className="panel historical-baseline-banner"><div className="panel-header"><div><span className="eyebrow">MARCO OPERACIONAL</span><h2>Histórico consolidado até 27/09/2026</h2><p><strong>{historicalClosed}</strong> ficha(s) anteriores ficam arquivadas para rastreabilidade e não entram na agenda operacional. A operação diária passa a considerar novas fichas com coleta em <b>28/09/2026 ou depois</b>.</p></div><CheckCircle2/></div></section>}

    {isVilla&&<section className="panel bundled-update-card">
      <div><span className="eyebrow">VILLA ARAUCO • BASE FINAL RECEBIDA</span><h2>Controle de CPs / rupturas incorporado ao pacote</h2><p>A versão contém as <b>1.323 linhas</b> da planilha enviada em 23/09/2026. A consolidação é executada automaticamente uma única vez no Firebase. Este botão fica disponível apenas para conferência/reprocessamento manual.</p></div>
      <button className="button secondary" onClick={loadBundledUpdate} disabled={loading}><RefreshCw size={17}/>{loading?'Processando...':'Conferir base final'}</button>
    </section>}

    <section className="two-columns import-columns">
      <div className="panel import-drop"><UploadCloud size={38}/><h2>Importar outra planilha</h2><p>Selecione a obra. O sistema identifica automaticamente qual dos dois modelos foi enviado.</p><label className="import-work-select">Obra de destino<select value={targetWorkId} onChange={e=>{setTargetWorkId(e.target.value);resetPreview();setMessage('')}}><option value="">Selecione...</option>{works.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label className={`button primary file-button ${!targetWork?'disabled':''}`}>{loading?'Analisando...':'Selecionar Excel'}<input type="file" accept=".xlsx,.xls" disabled={!targetWork||loading} onChange={e=>choose(e.target.files?.[0])}/></label>{fileName&&<small>Arquivo: {fileName}</small>}{message&&<div className="import-message">{message}</div>}</div>
      <div className="panel"><h2>Como o sistema trata os arquivos</h2><div className="rule-list"><span>✓ <b>Controle de concretagem:</b> cria/atualiza o histórico espacial com Quadra, Lote, volume e laudo.</span><span>✓ <b>Controle de CPs / rupturas:</b> atualiza MPa de projeto, 7d, 28d, 63d, AP/RP e observações.</span><span>✓ O vínculo é feito por <b>data da concretagem + NF + grupo do processo</b>, com conferência dos resultados existentes quando há duplicidade.</span><span>✓ A planilha de rupturas <b>não cria concretagens duplicadas</b>.</span><span>✓ Linhas sem Quadra/Lote são preservadas em arquivo complementar e não são forçadas no mapa.</span><span>✓ O legado continua fora da agenda operacional diária.</span></div></div>
    </section>

    {summary&&preview.length>0&&<section className="panel"><div className="panel-header"><div><h2>Prévia — histórico de concretagens</h2><p>Destino: <b>{targetWork?.name}</b>. Nenhum dado foi gravado ainda.</p></div><button className="button primary" onClick={importHistorical} disabled={loading}>{loading?`Importando ${summary.rows}...`:`Importar ${summary.rows} registros`}</button></div>
      <div className="preview-stats"><div><span>Registros</span><b>{summary.rows}</b></div><div><span>Com controle</span><b>{summary.controlled}</b></div><div><span>Sem controle</span><b>{summary.withoutControl}</b></div><div><span>Parciais</span><b>{summary.partial}</b></div><div><span>Volume</span><b>{summary.volumeM3.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</b></div><div><span>Período</span><b>{formatDate(summary.firstDate)} → {formatDate(summary.lastDate)}</b></div></div>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>Quadra</th><th>Lote</th><th>Elemento</th><th>Concreteira</th><th>NF</th><th>Laudo</th><th>Estado</th></tr></thead><tbody>{preview.slice(0,12).map(s=><tr key={s.id}><td>{formatDate(s.collectedAt||s.moldedAt)}</td><td>Q{s.block}</td><td>L{s.lot}</td><td>{s.element}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{s.reportNumber||'—'}</td><td><span className="badge muted">{s.historicalState}</span></td></tr>)}</tbody></table></div>
    </section>}

    {rupturePreview&&<section className="panel rupture-sync-preview">
      <div className="panel-header"><div><h2>Prévia — atualização de CPs / rupturas</h2><p>Os dados espaciais existentes serão preservados. Resultados serão atualizados apenas quando o vínculo for seguro.</p></div><button className="button primary" onClick={applyRuptureUpdate} disabled={loading}>{loading?'Sincronizando...':'Aplicar atualização'}</button></div>
      <div className="preview-stats"><div><span>Linhas fonte</span><b>{rupturePreview.summary.sourceRows}</b></div><div><span>Linhas vinculadas</span><b>{rupturePreview.summary.matchedRows}</b></div><div><span>Fichas atualizadas</span><b>{rupturePreview.summary.matchedSamples}</b></div><div><span>Arquivo complementar</span><b>{rupturePreview.summary.unmatchedRows+rupturePreview.summary.ambiguousRows}</b></div><div><span>Pendência operacional</span><b>0</b></div><div><span>Período</span><b>{formatDate(rupturePreview.summary.firstDate)} → {formatDate(rupturePreview.summary.lastDate)}</b></div></div>
      <div className="sync-note"><b>Importante:</b> linhas que não podem ser associadas com segurança a uma Quadra/Lote permanecem no arquivo histórico complementar. Elas não geram tarefas, alertas ou pendências operacionais.</div>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>Origem</th><th>ID</th><th>Concreteira</th><th>NF</th><th>MPa projeto</th><th>7d</th><th>28d</th><th>Vínculo</th></tr></thead><tbody>{rupturePreview.records.slice(0,18).map(r=><tr key={r.id}><td>{formatDate(r.concreteDate)}</td><td>{r.sourceSheet.includes('parede')?'Parede / Oitão':'Radier / Muro'}</td><td>{r.identification||'—'}</td><td>{r.supplier||'—'}</td><td>{r.invoice||'—'}</td><td>{r.projectMpa!==undefined?`${r.projectMpa} MPa`:'—'}</td><td>{r.results.find(x=>x.ageDays===7)?.resistanceMpa??'—'}</td><td>{r.results.find(x=>x.ageDays===28)?.resistanceMpa??'—'}</td><td><span className={`status ${'concluido'}`}>{r.matchStatus==='matched'?'Vinculado':'Arquivo histórico'}</span></td></tr>)}</tbody></table></div>
    </section>}

    {scopedRuptureImports.length>0&&<section className="panel"><div className="panel-header"><div><h2>Arquivo completo da planilha de CPs / rupturas</h2><p>Todas as linhas da fonte ficam disponíveis para consulta, inclusive as que não puderam ser ligadas com segurança a Quadra/Lote.</p></div><span className="badge muted">{visibleRuptureArchive.length} / {scopedRuptureImports.length}</span></div><div className="search-box"><input value={ruptureSearch} onChange={e=>setRuptureSearch(e.target.value)} placeholder="Buscar por NF, identificação, concreteira, data, AP/RP ou observação..."/></div><div className="table-wrap rupture-archive-table"><table><thead><tr><th>Data</th><th>Origem</th><th>ID</th><th>Concreteira</th><th>NF</th><th>MPa projeto</th><th>7d</th><th>28d</th><th>63d</th><th>AP</th><th>RP</th><th>Observação</th><th>Destino</th></tr></thead><tbody>{visibleRuptureArchive.map(r=><tr key={r.id}><td>{formatDate(r.concreteDate)}</td><td>{r.sourceSheet.includes('parede')?'Parede':'Radier'}</td><td>{r.identification||'—'}</td><td>{r.supplier||'—'}</td><td>{r.invoice||'—'}</td><td>{r.projectMpa!==undefined?`${r.projectMpa} MPa`:'—'}</td><td>{r.results.find(x=>x.ageDays===7)?.resistanceMpa??'—'}</td><td>{r.results.find(x=>x.ageDays===28)?.resistanceMpa??'—'}</td><td>{r.results.find(x=>x.ageDays===63)?.resistanceMpa??'—'}</td><td>{r.ap||'—'}</td><td>{r.rp||'—'}</td><td>{r.observation||'—'}</td><td>{r.matchStatus==='matched'?<span className="status concluido">Ficha vinculada</span>:<span className="legacy-closed-note">Arquivo histórico</span>}</td></tr>)}</tbody></table></div></section>}
  </div>
}
