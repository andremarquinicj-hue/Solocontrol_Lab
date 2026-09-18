'use client';

import { Building2, MapPinned } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { normalizeElementGroup } from '@/lib/work-analytics';
import { extractLots, normalizeBlock, normalizeLot, VILLA_ARAUCO_BLOCKS, VILLA_ARAUCO_ELEMENTS } from '@/lib/villa-arauco';

export default function MapaPage(){
  const [samples,setSamples]=useState<Sample[]>([]);
  const [element,setElement]=useState<string>('PAREDES E LAJES');
  const [selected,setSelected]=useState<{block:string;lot:string}|null>(null);
  const { selectedWorkId, selectedWork, works, setSelectedWorkId } = useWorkScope();

  useEffect(()=>{listSamples().then(setSamples)},[]);
  useEffect(()=>{setSelected(null)},[selectedWorkId,element]);

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

  function hasLot(sample:Sample, lot:string){
    return extractLots(sample.lot).includes(lot);
  }
  function records(block:string,lot:string){
    return data.filter(s=>normalizeBlock(s.block)===block&&hasLot(s,lot)&&normalizeElementGroup(s.element)===element);
  }
  const selectedRecords=selected?records(selected.block,selected.lot):[];

  if(selectedWorkId==='all'){
    return <div className="page-stack">
      <section className="page-heading"><div><span className="eyebrow">MAPA MULTIOBRA</span><h1>Mapa da Obra</h1><p>Escolha uma obra específica para visualizar quadras, lotes e concretagens.</p></div></section>
      <section className="panel choose-work-panel"><MapPinned size={42}/><h2>Selecione uma obra</h2><p>O mapa é individual por obra. O seletor abaixo também altera o filtro global do sistema.</p><select value="all" onChange={e=>setSelectedWorkId(e.target.value)}><option value="all">Selecione...</option>{works.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></section>
    </div>
  }

  if(selectedWork?.mapMode==='none'){
    return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">{selectedWork.name}</span><h1>Mapa da Obra</h1><p>Esta obra está configurada sem controle espacial.</p></div><Link href="/obras" className="button secondary">Configurar obra</Link></section><section className="panel empty-state"><MapPinned size={38}/><b>Mapa não configurado</b><span>Em Obras, altere o tipo de mapa para Grade Quadra/Lote ou Planta Villa Arauco.</span></section></div>
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">{selectedWork?.name || 'OBRA'}</span><h1>Mapa de Concretagens</h1><p>Quadra + lote + elemento vinculados aos ensaios e laudos desta obra.</p></div><div className="heading-actions"><Link href="/historico" className="button secondary">Importar histórico</Link><Link href="/obras" className="button ghost">Configurar metas</Link></div></section>

    {selectedWork?.mapImage&&<section className="map-layout">
      <div className="panel plan-panel"><div className="panel-header"><div><h2>Planta de referência</h2><p>{selectedWork.name}</p></div><MapPinned/></div><img className="site-plan" src={selectedWork.mapImage} alt={`Planta ${selectedWork.name}`}/></div>
      <div className="panel map-summary"><h2>Legenda operacional</h2><div className="map-legend"><span><i className="map-dot done"></i> Possui registro</span><span><i className="map-dot partial"></i> Registro parcial / sem controle</span><span><i className="map-dot empty"></i> Sem registro neste filtro</span></div><p>As cores são calculadas apenas com os dados da obra selecionada.</p></div>
    </section>}

    <section className="panel">
      <div className="panel-header"><div><h2>Controle por quadra e lote</h2><p>{data.length} registro(s) vinculados à obra.</p></div><span className="badge muted">{blocks.length} quadra(s)</span></div>
      <div className="element-tabs">{elements.map(e=><button key={e} onClick={()=>setElement(e)} className={element===e?'active':''}>{e}</button>)}</div>
      {blocks.length===0?<div className="empty-state"><MapPinned size={34}/><b>Sem dados de quadra/lote</b><span>Cadastre Quadra e Lote nas novas fichas ou importe o histórico desta obra.</span></div>:<div className="blocks-grid">{blocks.map(block=><div className="block-card" key={block}><div className="block-title"><Building2 size={16}/>Quadra {block}</div><div className="lots-grid">{Array.from({length:maxLot},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const rs=records(block,lot);const bad=rs.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');return <button key={lot} title={`Q${block} L${lot}`} onClick={()=>setSelected({block,lot})} className={`lot-tile ${rs.length?(bad?'partial':'done'):'empty'}`}>{lot}</button>})}</div></div>)}</div>}
    </section>

    {selected&&<section className="panel lot-detail"><div className="panel-header"><div><h2>Q{selected.block} — L{selected.lot}</h2><p>{element}</p></div><span className="badge muted">{selectedRecords.length} registro(s)</span></div>{selectedRecords.length===0?<p>Nenhum registro localizado para este elemento.</p>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>NF</th><th>Volume</th><th>Laudo</th><th>Folha</th><th>Resultados</th><th></th></tr></thead><tbody>{selectedRecords.map(s=><tr key={s.id}><td>{new Date(s.moldedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{s.invoice||'—'}</td><td>{s.volumeM3||'—'} m³</td><td>{s.reportNumber||'—'}</td><td>{s.labSheet||'—'}</td><td>{s.ruptures.filter(r=>r.resistanceMpa!==undefined).map(r=>`${r.ageLabel||r.ageDays+'d'}: ${r.resistanceMpa?.toFixed(2)} MPa`).join(' • ')||'—'}</td><td><Link className="text-link" href={`/amostras/${s.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}</section>}
  </div>
}
