'use client';

import { Building2, FileDown, MapPinned, Share2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import StrengthEvolutionChart from '@/components/StrengthEvolutionChart';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { lotTechnicalSummary } from '@/lib/technical-analysis';
import { downloadLotTechnicalPdf, shareLotTechnicalPdf } from '@/lib/lot-report-pdf';
import { formatDate, ruptureAgeLabel, ruptureScheduleLabel } from '@/lib/utils';
import { formatElementLabel, normalizeElementGroup, sampleCollectionDate, sampleVolume } from '@/lib/work-analytics';
import { processTypeLabel, sampleProcessLabel, sampleProcessType } from '@/lib/process-profiles';
import { extractLots, normalizeBlock, normalizeLot, VILLA_ARAUCO_BLOCKS, VILLA_ARAUCO_ELEMENTS } from '@/lib/villa-arauco';

type LotRef = {block:string;lot:string};

export default function MapaPage(){
  const [samples,setSamples]=useState<Sample[]>([]);
  const [element,setElement]=useState<string>('RADIER');
  const [selected,setSelected]=useState<LotRef|null>(null);
  const [tab,setTab]=useState<'resumo'|'concretagens'|'rompimentos'|'grafico'|'analise'>('resumo');
  const [reportBusy,setReportBusy]=useState<'pdf'|'share'|''>('');
  const { selectedWorkId, selectedWork, works, setSelectedWorkId } = useWorkScope();

  useEffect(()=>{listSamples().then(setSamples)},[]);
  useEffect(()=>{setSelected(null)},[selectedWorkId]);

  const data=useMemo(()=>selectedWorkId==='all'?[]:samples.filter(s=>s.workId===selectedWorkId),[samples,selectedWorkId]);
  const elements=useMemo(()=>{
    const present=data.map(s=>normalizeElementGroup(s.element)).filter(e=>e!=='OUTROS');
    return Array.from(new Set([...VILLA_ARAUCO_ELEMENTS,...present]));
  },[data]);

  const blocks=useMemo(()=>{
    if(selectedWork?.mapMode==='villa_arauco'||selectedWorkId==='villa-arauco')return VILLA_ARAUCO_BLOCKS;
    return Array.from(new Set(data.map(s=>normalizeBlock(s.block)).filter(Boolean))).sort();
  },[data,selectedWork,selectedWorkId]);

  const maxLot=useMemo(()=>{
    if(selectedWork?.mapMaxLot)return selectedWork.mapMaxLot;
    const nums=data.map(s=>Number(normalizeLot(s.lot))).filter(n=>Number.isFinite(n)&&n>0);
    return nums.length?Math.max(...nums):28;
  },[data,selectedWork]);

  function hasLot(sample:Sample, lot:string){return extractLots(sample.lot).includes(lot)}
  function records(block:string,lot:string,elementFilter?:string){
    return data.filter(s=>
      normalizeBlock(s.block)===block &&
      hasLot(s,lot) &&
      (!elementFilter || normalizeElementGroup(s.element)===elementFilter)
    );
  }

  const lotRecords=selected?records(selected.block,selected.lot):[];
  const selectedRecords=selected?records(selected.block,selected.lot,element):[];
  const lotSummary=useMemo(()=>selected?lotTechnicalSummary(lotRecords,selectedWork):undefined,[selected,lotRecords,selectedWork]);
  const totalLotVolume=lotRecords.reduce((sum,s)=>sum+sampleVolume(s),0);
  const totalResults=lotRecords.reduce((sum,s)=>sum+s.ruptures.filter(r=>r.resistanceMpa!==undefined||r.measurements?.length||r.importedResultsMpa?.length).length,0);

  async function generatePdf(){
    if(!selected||!selectedWork||!lotRecords.length)return;
    setReportBusy('pdf');
    try{await downloadLotTechnicalPdf({work:selectedWork,block:selected.block,lot:selected.lot,samples:lotRecords})}
    catch(error){console.error(error);alert('Não foi possível gerar o PDF. Tente novamente.')}
    finally{setReportBusy('')}
  }

  async function sharePdf(){
    if(!selected||!selectedWork||!lotRecords.length)return;
    setReportBusy('share');
    try{await shareLotTechnicalPdf({work:selectedWork,block:selected.block,lot:selected.lot,samples:lotRecords})}
    catch(error){console.error(error);alert('Não foi possível compartilhar o relatório.')}
    finally{setReportBusy('')}
  }

  if(selectedWorkId==='all'){
    return <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">MAPA MULTIOBRA</span><h1>Mapa da Obra</h1><p>Escolha uma obra específica para visualizar quadras, lotes e concretagens.</p></div></section>
      <section className="panel choose-work-panel"><MapPinned size={42}/><h2>Selecione uma obra</h2><p>O mapa é individual por obra. O seletor abaixo também altera o filtro global.</p><select value="all" onChange={e=>setSelectedWorkId(e.target.value)}><option value="all">Selecione...</option>{works.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section>
    </div>
  }

  if(selectedWork?.mapMode==='none'){
    return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">{selectedWork.name}</span><h1>Mapa da Obra</h1><p>Esta obra está configurada sem controle espacial.</p></div><Link href="/obras" className="button secondary">Configurar obra</Link></section><section className="panel empty-state"><MapPinned size={38}/><b>Mapa não configurado</b><span>Em Obras, altere o tipo de mapa para Grade Quadra/Lote, planta personalizada ou Villa Arauco.</span></section></div>
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">{selectedWork?.name||'OBRA'}</span><h1>Mapa de Concretagens</h1><p>Clique em qualquer lote para abrir o dossiê técnico completo.</p></div><div className="heading-actions"><Link href="/historico" className="button secondary">Importar histórico</Link><Link href="/obras" className="button ghost">Configurar obra</Link></div></section>

    {selectedWork?.mapImage&&<section className="map-layout">
      <div className="panel plan-panel"><div className="panel-header"><div><h2>Planta de referência</h2><p>{selectedWork.name}</p></div><MapPinned/></div><img className="site-plan" src={selectedWork.mapImage} alt={`Planta ${selectedWork.name}`}/></div>
      <div className="panel map-summary"><h2>Legenda operacional</h2><div className="map-legend"><span><i className="map-dot done"></i> Possui registro</span><span><i className="map-dot partial"></i> Registro parcial / sem controle</span><span><i className="map-dot empty"></i> Sem registro neste filtro</span></div><p>O clique no lote abre concretagens, cargas, rompimentos e análise automática.</p></div>
    </section>}

    <section className="panel">
      <div className="panel-header"><div><h2>Controle por quadra e lote</h2><p>{data.length} registro(s) vinculados à obra.</p></div><span className="badge muted">{blocks.length} quadra(s)</span></div>
      <div className="element-tabs">{elements.map(e=><button key={e} onClick={()=>setElement(e)} className={element===e?'active':''}>{formatElementLabel(e)}</button>)}</div>
      {blocks.length===0?<div className="empty-state"><MapPinned size={34}/><b>Sem dados de quadra/lote</b><span>Cadastre Quadra e Lote nas novas fichas ou importe o histórico.</span></div>:<div className="blocks-grid">{blocks.map(block=><div className="block-card" key={block}><div className="block-title"><Building2 size={16}/>Quadra {block}</div><div className="lots-grid">{Array.from({length:maxLot},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const rs=records(block,lot,element);const bad=rs.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');return <button key={lot} title={`Abrir dossiê Q${block} L${lot}`} onClick={()=>{setSelected({block,lot});setTab('resumo')}} className={`lot-tile ${rs.length?(bad?'partial':'done'):'empty'}`}>{lot}</button>})}</div></div>)}</div>}
    </section>

    {selected&&lotSummary&&<div className="modal-backdrop lot-dossier-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setSelected(null)}}>
      <section className="modal-card lot-dossier" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div><span className="eyebrow">DOSSIÊ TÉCNICO DO LOTE</span><h2>Q{selected.block} — L{selected.lot}</h2><p>{selectedWork?.name} • acompanhamento consolidado de todos os elementos registrados.</p></div>
          <button className="modal-close" onClick={()=>setSelected(null)}><X size={22}/></button>
        </div>

        <div className="lot-dossier-kpis">
          <div><span>Concretagens</span><strong>{lotRecords.length}</strong></div>
          <div><span>Volume controlado</span><strong>{totalLotVolume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong></div>
          <div><span>Rompimentos/resultados</span><strong>{totalResults}</strong></div>
          <div><span>Reservas elegíveis</span><strong>{lotSummary.eligible}</strong></div>
        </div>

        <div className="dossier-tabs">
          <button className={tab==='resumo'?'active':''} onClick={()=>setTab('resumo')}>Resumo</button>
          <button className={tab==='concretagens'?'active':''} onClick={()=>setTab('concretagens')}>Concretagens</button>
          <button className={tab==='rompimentos'?'active':''} onClick={()=>setTab('rompimentos')}>Cargas e rompimentos</button>
          <button className={tab==='grafico'?'active':''} onClick={()=>setTab('grafico')}>Evolução da cura</button>
          <button className={tab==='analise'?'active':''} onClick={()=>setTab('analise')}>Análise técnica</button>
        </div>

        <div className="dossier-body">
          {tab==='resumo'&&<>
            <div className={`technical-analysis-card tone-${lotSummary.tone}`}>
              <div className="technical-analysis-message"><b>{lotSummary.headline}</b><span>{lotSummary.summary}</span></div>
            </div>
            <div className="lot-elements-summary">
              {elements.map(el=>{const rs=records(selected.block,selected.lot,el);if(!rs.length)return null;return <div key={el}><span>{formatElementLabel(el)}</span><strong>{rs.length} registro(s)</strong><small>{rs.reduce((sum,s)=>sum+sampleVolume(s),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</small></div>})}
            </div>
            <div className="table-wrap"><table><thead><tr><th>Data</th><th>Elemento</th><th>NF</th><th>Volume</th><th>Laudo</th><th>Status</th><th></th></tr></thead><tbody>{[...lotRecords].sort((a,b)=>sampleCollectionDate(b).localeCompare(sampleCollectionDate(a))).map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}{s.collectedTime?<><br/><small>{s.collectedTime}</small></>:null}</td><td>{formatElementLabel(normalizeElementGroup(s.element))}</td><td>{s.invoice||'—'}</td><td>{sampleVolume(s).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{s.reportNumber||'—'}</td><td>{s.historicalBaselineClosed?<span className="legacy-closed-note">Histórico</span>:<span className={`status ${s.historicalState==='sem_controle'?'atrasado':'concluido'}`}>{s.historicalState==='sem_controle'?'Sem controle':'Controlado'}</span>}</td><td><Link className="text-link" href={`/amostras/${s.id}`}>Abrir ficha</Link></td></tr>)}</tbody></table></div>
          </>}

          {tab==='concretagens'&&<div className="table-wrap"><table><thead><tr><th>Data</th><th>Processo</th><th>Concreteira</th><th>NF</th><th>Volume</th><th>Slump</th><th>MPa projeto</th><th>Ficha/Laudo</th></tr></thead><tbody>{lotRecords.map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}{s.collectedTime?<><br/><small>{s.collectedTime}</small></>:s.moldedTime?<><br/><small>{s.moldedTime}</small></>:null}</td><td>{sampleProcessLabel(s)}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{sampleVolume(s).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{s.slumpActualCm!==undefined?`${s.slumpActualCm} cm`:s.slumpMm?`${s.slumpMm} mm`:'—'}</td><td>{s.specifiedStrengthMpa?`${s.specifiedStrengthMpa} MPa`:selectedWork?.defaultStrengthMpa?`${selectedWork.defaultStrengthMpa} MPa`:'—'}</td><td>{s.physicalFormNumber||s.reportNumber||'—'}</td></tr>)}</tbody></table></div>}

          {tab==='rompimentos'&&<div className="table-wrap"><table><thead><tr><th>Ficha</th><th>Processo</th><th>Idade</th><th>Programado</th><th>CPs / resultados</th><th>Média</th><th>Status</th></tr></thead><tbody>{lotRecords.flatMap(s=>s.ruptures.map(r=><tr key={`${s.id}-${r.id}`}><td>{s.labelBase}</td><td>{sampleProcessLabel(s)}</td><td>{ruptureAgeLabel(r)}</td><td>{ruptureScheduleLabel(r)}</td><td>{r.measurements?.length?r.measurements.map(m=>`${m.specimenLabel||'CP'}: ${m.load} ${m.loadUnit} → ${m.resistanceMpa.toFixed(2)} MPa`).join(' • '):r.importedResultsMpa?.length?r.importedResultsMpa.map((v,i)=>`Resultado ${i+1}: ${v.toFixed(2)} MPa`).join(' • '):r.load!==undefined?`${r.load} ${r.loadUnit||''}`:'—'}</td><td>{r.resistanceMpa!==undefined?`${r.resistanceMpa.toFixed(2)} MPa`:'—'}</td><td>{r.historicalNoResult?<span className="legacy-closed-note">Histórico encerrado</span>:<span className={`status ${r.status}`}>{r.status.replace('_',' ')}</span>}</td></tr>))}</tbody></table></div>}

          {tab==='grafico'&&<StrengthEvolutionChart samples={lotRecords} work={selectedWork} title={`Evolução da resistência — Q${selected.block} L${selected.lot}`} maxSeries={6}/>}

          {tab==='analise'&&<><div className="analysis-export-bar"><div><b>Relatório técnico do lote</b><span>Gere o PDF completo da análise ou compartilhe o arquivo pelo celular/WhatsApp.</span></div><div className="heading-actions"><button className="button secondary" disabled={Boolean(reportBusy)} onClick={generatePdf}><FileDown size={16}/>{reportBusy==='pdf'?'Gerando...':'Gerar PDF'}</button><button className="button primary" disabled={Boolean(reportBusy)} onClick={sharePdf}><Share2 size={16}/>{reportBusy==='share'?'Preparando...':'PDF / WhatsApp'}</button></div></div><div className="technical-sample-list">{lotSummary.analyses.map(({sample,analysis,formRelease})=><article key={sample.id} className={`technical-sample-item tone-${analysis.tone}`}><div className="technical-sample-head"><div><b>{sample.labelBase}</b><span>{formatElementLabel(normalizeElementGroup(sample.element))} • {formatDate(sampleCollectionDate(sample))}</span></div><Link href={`/amostras/${sample.id}`} className="text-link">Abrir ficha</Link></div><div className="technical-analysis-grid"><div><span>Referência</span><strong>{analysis.targetMpa?`${analysis.targetMpa.toFixed(2)} MPa`:'—'}</strong></div><div><span>{analysis.controlAgeDays} dias</span><strong>{analysis.controlAverage!==undefined?`${analysis.controlAverage.toFixed(2)} MPa`:sample.historicalBaselineClosed?'Sem dado na fonte':'Aguardando'}</strong></div><div><span>Mín./Máx.</span><strong>{analysis.controlMin!==undefined?`${analysis.controlMin.toFixed(2)} / ${analysis.controlMax?.toFixed(2)} MPa`:'—'}</strong></div><div><span>Reserva {analysis.reserveAgeDays}d</span><strong>{sample.historicalBaselineClosed?'Histórico':analysis.reserveDecision==='eligible'?'Avaliar descarte':analysis.reserveDecision==='keep'?'Manter':'Aguardar'}</strong></div></div><div className="technical-analysis-message"><b>{analysis.headline}</b><span>{analysis.summary}</span></div>{formRelease.applicable&&<div className={`form-release-mini tone-${formRelease.tone}`}><b>{formRelease.headline}</b><span>{formRelease.summary}</span></div>}</article>)}</div></>}
        </div>

        <div className="modal-footer"><span>Análise automática de apoio à gestão. A aceitação técnica deve seguir normas, projeto, contrato e responsável técnico.</span><div className="heading-actions"><button className="button ghost" disabled={Boolean(reportBusy)} onClick={generatePdf}><FileDown size={15}/>PDF</button><button className="button secondary" disabled={Boolean(reportBusy)} onClick={sharePdf}><Share2 size={15}/>WhatsApp</button><button className="button secondary" onClick={()=>setSelected(null)}>Fechar</button></div></div>
      </section>
    </div>}
  </div>
}
