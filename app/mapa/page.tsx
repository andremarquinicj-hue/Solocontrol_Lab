'use client';

import { Building2, MapPinned } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { VILLA_ARAUCO_BLOCKS, VILLA_ARAUCO_ELEMENTS } from '@/lib/villa-arauco';

export default function MapaPage(){
 const [samples,setSamples]=useState<Sample[]>([]); const [element,setElement]=useState<string>('PAREDES E LAJES'); const [selected,setSelected]=useState<{block:string;lot:string}|null>(null);
 useEffect(()=>{listSamples().then(setSamples)},[]);
 const data=useMemo(()=>samples.filter(s=>s.workId==='villa-arauco'||s.workName.toUpperCase().includes('ARAUCO')),[samples]);
 function hasLot(sample:Sample, lot:string){const nums=String(sample.lot||'').match(/\d+/g)||[];return nums.some(n=>n.padStart(2,'0')===lot)}
 function records(block:string,lot:string){return data.filter(s=>s.block===block&&hasLot(s,lot)&&String(s.element).toUpperCase()===element)}
 const selectedRecords=selected?records(selected.block,selected.lot):[];
 return <div className="page-stack">
  <section className="page-heading"><div><span className="eyebrow">VILLA ARAUCO</span><h1>Mapa de Concretagens</h1><p>Quadra + lote + elemento vinculados aos ensaios e laudos do laboratório.</p></div><div className="heading-actions"><Link href="/historico" className="button secondary">Importar histórico</Link></div></section>
  <section className="map-layout">
   <div className="panel plan-panel"><div className="panel-header"><div><h2>Planta de referência</h2><p>Planta de situação das 620 unidades habitacionais.</p></div><MapPinned/></div><img className="site-plan" src="/villa-arauco-planta.png" alt="Planta Villa Arauco"/></div>
   <div className="panel map-summary"><h2>Legenda operacional</h2><div className="map-legend"><span><i className="map-dot done"></i> Possui registro</span><span><i className="map-dot partial"></i> Registro parcial / sem controle</span><span><i className="map-dot empty"></i> Sem registro neste filtro</span></div><p>O mapa operacional usa a grade Quadra/Lote do controle da obra. A planta ao lado permanece como referência espacial.</p></div>
  </section>
  <section className="panel"><div className="element-tabs">{VILLA_ARAUCO_ELEMENTS.map(e=><button key={e} onClick={()=>{setElement(e);setSelected(null)}} className={element===e?'active':''}>{e}</button>)}</div>
   <div className="blocks-grid">{VILLA_ARAUCO_BLOCKS.map(block=><div className="block-card" key={block}><div className="block-title"><Building2 size={16}/>Quadra {block}</div><div className="lots-grid">{Array.from({length:28},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const rs=records(block,lot);const bad=rs.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');return <button key={lot} title={`Q${block} L${lot}`} onClick={()=>setSelected({block,lot})} className={`lot-tile ${rs.length?(bad?'partial':'done'):'empty'}`}>{lot}</button>})}</div></div>)}</div>
  </section>
  {selected&&<section className="panel lot-detail"><div className="panel-header"><div><h2>Q{selected.block} — L{selected.lot}</h2><p>{element}</p></div><span className="badge muted">{selectedRecords.length} registro(s)</span></div>{selectedRecords.length===0?<p>Nenhum registro localizado para este elemento.</p>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>NF</th><th>Volume</th><th>Laudo</th><th>Folha</th><th>Resultados</th><th></th></tr></thead><tbody>{selectedRecords.map(s=><tr key={s.id}><td>{new Date(s.moldedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{s.invoice||'—'}</td><td>{s.volumeM3||'—'} m³</td><td>{s.reportNumber||'—'}</td><td>{s.labSheet||'—'}</td><td>{s.ruptures.filter(r=>r.resistanceMpa!==undefined).map(r=>`${r.ageLabel||r.ageDays+'d'}: ${r.resistanceMpa?.toFixed(2)} MPa`).join(' • ')||'—'}</td><td><Link className="text-link" href={`/amostras/${s.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}</section>}
 </div>
}
