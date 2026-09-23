'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3, Building2, CheckCircle2, FileCheck2, FileDown, FlaskConical,
  LockKeyhole, MapPinned, PackageCheck, Share2, ShieldCheck, X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useAuthScope } from '@/components/AuthScope';
import StrengthEvolutionChart from '@/components/StrengthEvolutionChart';
import { listSamples, listWorks } from '@/lib/store';
import { db, ensureFirebaseUser, firebaseConfigured } from '@/lib/firebase';
import { Sample, Work } from '@/lib/types';
import { lotTechnicalSummary } from '@/lib/technical-analysis';
import { downloadLotTechnicalPdf, shareLotTechnicalPdf } from '@/lib/lot-report-pdf';
import { processTypeLabel, sampleProcessLabel, sampleProcessType } from '@/lib/process-profiles';
import {
  completedTests, elementProgress, formatElementLabel, normalizeElementGroup, overallProgress,
  sampleCollectionDate, sampleVolume, uniqueReports
} from '@/lib/work-analytics';
import { extractLots, normalizeBlock, VILLA_ARAUCO_BLOCKS } from '@/lib/villa-arauco';
import { formatDate, ruptureAgeLabel } from '@/lib/utils';

type LotRef={block:string;lot:string};

export default function ClientPortal(){
  const {profile,isPilot}=useAuthScope();
  const [works,setWorks]=useState<Work[]>([]);
  const [samples,setSamples]=useState<Sample[]>([]);
  const [workId,setWorkId]=useState('');
  const [element,setElement]=useState('RADIER');
  const [selectedLot,setSelectedLot]=useState<LotRef|null>(null);
  const [reportBusy,setReportBusy]=useState<'pdf'|'share'|''>('');

  useEffect(()=>{
    if(isPilot){setWorks([]);setSamples([]);setWorkId('');return}
    async function loadWorks(){
      if(profile.role==='client'&&!isPilot&&firebaseConfigured&&db&&profile.allowedWorkIds?.length){
        await ensureFirebaseUser();
        const docs=await Promise.all(profile.allowedWorkIds.map(id=>getDoc(doc(db!,'works',id))));
        const allowed=docs.filter(s=>s.exists()).map(s=>s.data() as Work).filter(w=>w.clientPortalEnabled!==false);
        setWorks(allowed);
        setWorkId(prev=>allowed.some(w=>w.id===prev)?prev:allowed[0]?.id||'');
        return;
      }
      const w=await listWorks();
      const allowed=(profile.role==='client'&&!isPilot)
        ?w.filter(x=>profile.allowedWorkIds?.includes(x.id)&&x.clientPortalEnabled!==false)
        :w.filter(x=>x.clientPortalEnabled!==false);
      setWorks(allowed);
      setWorkId(prev=>allowed.some(x=>x.id===prev)?prev:allowed[0]?.id||'');
    }
    loadWorks();
  },[profile,isPilot]);

  useEffect(()=>{
    if(isPilot){setSamples([]);return}
    if(!workId){setSamples([]);return}
    if(firebaseConfigured&&db){
      let unsubscribe=()=>{};
      ensureFirebaseUser().then(()=>{
        unsubscribe=onSnapshot(query(collection(db!,'samples'),where('workId','==',workId)),snap=>setSamples(snap.docs.map(d=>d.data() as Sample)));
      }).catch(()=>listSamples().then(all=>setSamples(all.filter(s=>s.workId===workId))));
      return()=>unsubscribe();
    }
    const timer=setInterval(()=>listSamples().then(all=>setSamples(all.filter(s=>s.workId===workId))),30000);
    listSamples().then(all=>setSamples(all.filter(s=>s.workId===workId)));
    return()=>clearInterval(timer);
  },[workId,isPilot]);

  const work=works.find(w=>w.id===workId);
  const data=useMemo(()=>samples.filter(s=>s.workId===workId),[samples,workId]);
  const progress=elementProgress(data,work);
  const overall=overallProgress(data,work);
  const volume=data.reduce((a,s)=>a+sampleVolume(s),0);
  const tests=completedTests(data);
  const reports=uniqueReports(data);
  const controlled=data.filter(s=>s.historicalState!=='sem_controle').length;
  const pending=data.filter(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial').length;
  const latest=data.map(s=>s.updatedAt).filter(Boolean).sort().at(-1);

  const blocks=useMemo(
    ()=>work?.mapMode==='villa_arauco'
      ?VILLA_ARAUCO_BLOCKS
      :Array.from(new Set(data.map(s=>normalizeBlock(s.block)).filter(Boolean))).sort(),
    [work,data]
  );

  function records(block:string,lot:string){
    return data.filter(s=>
      normalizeBlock(s.block)===block&&
      extractLots(s.lot).includes(lot)&&
      normalizeElementGroup(s.element)===element
    );
  }
  function allLotRecords(block:string,lot:string){
    return data.filter(s=>normalizeBlock(s.block)===block&&extractLots(s.lot).includes(lot));
  }

  const selectedLotRecords=selectedLot?allLotRecords(selectedLot.block,selectedLot.lot):[];
  const lotSummary=selectedLot?lotTechnicalSummary(selectedLotRecords,work):undefined;
  const lotPhotos=useMemo(()=>{
    const all=selectedLotRecords.flatMap(s=>[
      ...s.photos.map(p=>({url:p.url,label:p.name,sample:s})),
      ...s.ruptures.flatMap(r=>r.photos.map(p=>({url:p.url,label:`${ruptureAgeLabel(r)} • ${p.name}`,sample:s}))),
    ]);
    const seen=new Set<string>();
    return all.filter(item=>item.url&&!seen.has(item.url)&&seen.add(item.url)).slice(0,8);
  },[selectedLotRecords]);

  function publicStatus(){
    if(!lotSummary)return{label:'Aguardando dados',tone:'pendente'};
    if(lotSummary.tone==='danger')return{label:'Em análise técnica',tone:'pendente'};
    if(lotSummary.tone==='good')return{label:'Resultados de controle acompanhados',tone:'concluido'};
    return{label:'Acompanhamento em andamento',tone:'em_execucao'};
  }
  const lotStatus=publicStatus();

  async function clientPdf(){
    if(!selectedLot||!work||!selectedLotRecords.length)return;
    setReportBusy('pdf');
    try{await downloadLotTechnicalPdf({work,block:selectedLot.block,lot:selectedLot.lot,samples:selectedLotRecords,clientView:true})}
    catch(error){console.error(error);alert('Não foi possível gerar o PDF.')}
    finally{setReportBusy('')}
  }

  async function clientShare(){
    if(!selectedLot||!work||!selectedLotRecords.length)return;
    setReportBusy('share');
    try{await shareLotTechnicalPdf({work,block:selectedLot.block,lot:selectedLot.lot,samples:selectedLotRecords,clientView:true})}
    catch(error){console.error(error);alert('Não foi possível compartilhar o relatório.')}
    finally{setReportBusy('')}
  }

  if(isPilot)return <main className="client-portal">
    <header className="client-header"><div><Image src="/logo-solocontrol.png" width={200} height={100} alt="Solocontrol"/><div><b>Portal de Acompanhamento da Obra</b><span>Acesso protegido aos dados do cliente.</span></div></div></header>
    <section className="client-empty"><LockKeyhole size={46}/><h1>Login necessário</h1><p>Dados reais da obra não são exibidos no modo anônimo. Entre com uma conta de cliente autorizada.</p><Link href="/login" className="button primary">Entrar no portal</Link></section>
  </main>;

  return <main className="client-portal">
    <header className="client-header">
      <div><Image src="/logo-solocontrol.png" width={200} height={100} alt="Solocontrol"/><div><b>Portal de Acompanhamento da Obra</b><span>Controle tecnológico, rastreabilidade e progresso em tempo real.</span></div></div>
      <div className="client-header-actions"><label>Obra<select value={workId} onChange={e=>{setWorkId(e.target.value);setSelectedLot(null)}}>{works.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</select></label><Link href="/login" className="button ghost"><LockKeyhole size={15}/>Conta</Link></div>
    </header>

    {!work?<section className="client-empty"><Building2 size={44}/><h1>Nenhuma obra liberada</h1><p>Solicite à Solocontrol a liberação do acesso para a obra.</p></section>:<>
      <section className="client-hero professional">
        <div><span className="eyebrow">SOLOCONTROL • MONITORAMENTO AO VIVO</span><h1>{work.name}</h1><p>{work.client}{work.contractor?` • Executora: ${work.contractor}`:''}{work.location?` • ${work.location}`:''}</p><div className="client-trust-line"><ShieldCheck/><span>Dados rastreáveis por ficha, lote, ensaio e evidência fotográfica.</span></div></div>
        <div className="client-progress-ring"><strong>{overall!==undefined?`${overall.toFixed(0)}%`:'—'}</strong><span>avanço controlado</span></div>
      </section>

      <section className="client-kpis professional">
        <div><PackageCheck/><span>Volume controlado</span><strong>{volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong><small>acumulado da obra</small></div>
        <div><FlaskConical/><span>Ensaios realizados</span><strong>{tests}</strong><small>resultados registrados</small></div>
        <div><BarChart3/><span>Concretagens registradas</span><strong>{data.length}</strong><small>rastreabilidade por lote</small></div>
        <div><FileCheck2/><span>Laudos registrados</span><strong>{reports}</strong><small>referências únicas</small></div>
        <div><CheckCircle2/><span>Registros controlados</span><strong>{controlled}</strong><small>{pending} em acompanhamento</small></div>
      </section>

      <section className="client-section client-quality-strip">
        <div><span>ATUALIZAÇÃO</span><b>{latest?new Date(latest).toLocaleString('pt-BR'):'—'}</b></div>
        <div><span>PORTAL</span><b>Tempo real</b></div>
        <div><span>RASTREABILIDADE</span><b>Quadra • Lote • Ficha • CP</b></div>
        <div><span>EVIDÊNCIAS</span><b>Fotos vinculadas aos registros</b></div>
      </section>

      <section className="client-section">
        <div className="client-section-title"><div><span>EVOLUÇÃO DA OBRA</span><h2>Progresso por etapa construtiva</h2></div><p>Indicadores calculados a partir dos registros de controle tecnológico da Solocontrol.</p></div>
        <div className="client-progress-grid">{progress.map(p=><div key={p.element}><div><span>{formatElementLabel(p.element)}</span><b>{p.completed}{p.target?` / ${p.target}`:''}</b></div><div className="progress-bar"><span style={{width:`${p.percent??0}%`}}/></div><small>{p.percent!==undefined?`${p.percent.toFixed(1)}% concluído`:'Meta não cadastrada'}</small></div>)}</div>
      </section>

      <section className="client-section">
        <div className="client-section-title"><div><span>MAPA INTERATIVO</span><h2>Quadras e lotes</h2></div><div className="element-tabs">{['RADIER','PAREDES E LAJES','OITÕES E PLATIBANDAS','MURO DE ARRIMO'].map(e=><button key={e} className={element===e?'active':''} onClick={()=>setElement(e)}>{formatElementLabel(e)}</button>)}</div></div>
        {work.mapImage&&<div className="client-plan"><img src={work.mapImage} alt={`Planta ${work.name}`}/></div>}
        <div className="client-map-legend"><span><i className="map-dot done"/> Com registro</span><span><i className="map-dot partial"/> Em acompanhamento</span><span><i className="map-dot empty"/> Sem registro</span><b>Clique no lote para abrir o relatório técnico.</b></div>
        <div className="blocks-grid client-blocks">{blocks.slice(0,30).map(block=><div className="block-card" key={block}><div className="block-title"><MapPinned size={14}/>Quadra {block}</div><div className="lots-grid">{Array.from({length:work.mapMaxLot||28},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const rs=records(block,lot);const bad=rs.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');return <button type="button" onClick={()=>setSelectedLot({block,lot})} className={`lot-tile ${rs.length?(bad?'partial':'done'):'empty'}`} key={lot}>{lot}</button>})}</div></div>)}</div>
      </section>

      <section className="client-section">
        <div className="client-section-title"><div><span>ATIVIDADE RECENTE</span><h2>Últimos controles registrados</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Data</th><th>Quadra/Lote</th><th>Processo</th><th>Volume</th><th>Slump</th><th>Laudo/Ficha</th><th>Status</th></tr></thead><tbody>{[...data].sort((a,b)=>sampleCollectionDate(b).localeCompare(sampleCollectionDate(a))).slice(0,20).map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}</td><td>{s.block?`Q${s.block}`:'—'} {s.lot?`L${s.lot}`:''}</td><td>{sampleProcessLabel(s)}</td><td>{sampleVolume(s).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{s.slumpActualCm!==undefined?`${s.slumpActualCm} cm`:'—'}</td><td>{s.reportNumber||s.physicalFormNumber||'—'}</td><td>{s.historicalBaselineClosed?<span className="legacy-closed-note">Histórico</span>:<span className={`status ${s.historicalState==='sem_controle'?'pendente':'concluido'}`}>{s.historicalState==='sem_controle'?'Em acompanhamento':'Registrado'}</span>}</td></tr>)}</tbody></table></div>
      </section>
    </>}

    {selectedLot&&lotSummary&&work&&<div className="modal-backdrop client-tech-report-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedLot(null)}}>
      <section className="modal-card client-tech-report">
        <div className="client-report-header">
          <div><Image src="/logo-solocontrol.png" width={180} height={90} alt="Solocontrol"/><div><span>RELATÓRIO TÉCNICO DE ACOMPANHAMENTO</span><h2>Quadra {selectedLot.block} • Lote {selectedLot.lot}</h2><p>{work.name} • atualizado em tempo real</p></div></div>
          <button className="modal-close" onClick={()=>setSelectedLot(null)}><X size={22}/></button>
        </div>

        <div className="client-report-status">
          <span className={`status ${lotStatus.tone}`}>{lotStatus.label}</span>
          <p>Informações apresentadas para acompanhamento do cliente. Conclusões formais permanecem vinculadas aos relatórios técnicos aprovados.</p>
        </div>

        <div className="lot-dossier-kpis client">
          <div><span>Concretagens</span><strong>{selectedLotRecords.length}</strong></div>
          <div><span>Volume controlado</span><strong>{selectedLotRecords.reduce((sum,s)=>sum+sampleVolume(s),0).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</strong></div>
          <div><span>Ensaios concluídos</span><strong>{selectedLotRecords.reduce((sum,s)=>sum+s.ruptures.filter(r=>r.status==='concluido').length,0)}</strong></div>
          <div><span>Laudos / referências</span><strong>{new Set(selectedLotRecords.map(s=>s.reportNumber||s.physicalFormNumber).filter(Boolean)).size}</strong></div>
        </div>

        <div className="client-report-body">
          <section>
            <div className="client-report-section-title"><span>01</span><div><b>Resumo das concretagens</b><small>Rastreabilidade por etapa construtiva</small></div></div>
            <div className="table-wrap"><table><thead><tr><th>Data</th><th>Processo</th><th>Concreteira</th><th>NF</th><th>Volume</th><th>Slump</th><th>MPa projeto</th><th>Referência</th></tr></thead><tbody>{[...selectedLotRecords].sort((a,b)=>sampleCollectionDate(a).localeCompare(sampleCollectionDate(b))).map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}</td><td>{sampleProcessLabel(s)}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{sampleVolume(s).toLocaleString('pt-BR',{maximumFractionDigits:1})} m³</td><td>{s.slumpActualCm!==undefined?`${s.slumpActualCm} cm`:'—'}</td><td>{s.specifiedStrengthMpa?`${s.specifiedStrengthMpa} MPa`:work.defaultStrengthMpa?`${work.defaultStrengthMpa} MPa`:'—'}</td><td>{s.reportNumber||s.physicalFormNumber||'—'}</td></tr>)}</tbody></table></div>
          </section>

          <section>
            <div className="client-report-section-title"><span>02</span><div><b>Evolução da resistência</b><small>Resultados cadastrados por idade</small></div></div>
            <StrengthEvolutionChart samples={selectedLotRecords} work={work} title={`Evolução da cura — Q${selectedLot.block} L${selectedLot.lot}`} maxSeries={6}/>
          </section>

          <section>
            <div className="client-report-section-title"><span>03</span><div><b>Resultados dos ensaios</b><small>Valores individuais quando disponíveis</small></div></div>
            <div className="table-wrap"><table><thead><tr><th>Ficha</th><th>Processo</th><th>Idade</th><th>CPs / resultados</th><th>Média</th><th>Situação</th></tr></thead><tbody>{selectedLotRecords.flatMap(s=>s.ruptures.map(r=><tr key={`${s.id}-${r.id}`}><td>{s.labelBase}</td><td>{sampleProcessLabel(s)}</td><td>{ruptureAgeLabel(r)}</td><td>{r.measurements?.length?r.measurements.map(m=>`${m.specimenLabel||'CP'}: ${m.load} ${m.loadUnit} → ${m.resistanceMpa.toFixed(2)} MPa`).join(' • '):r.importedResultsMpa?.length?r.importedResultsMpa.map((v,i)=>`Resultado ${i+1}: ${v.toFixed(2)} MPa`).join(' • '):r.resistanceMpa!==undefined?`${r.resistanceMpa.toFixed(2)} MPa`:'—'}</td><td>{r.resistanceMpa!==undefined?`${r.resistanceMpa.toFixed(2)} MPa`:'—'}</td><td><span className={`status ${r.status==='concluido'?'concluido':'pendente'}`}>{r.status==='concluido'?'Concluído':'Programado'}</span></td></tr>))}</tbody></table></div>
          </section>

          {lotPhotos.length>0&&<section>
            <div className="client-report-section-title"><span>04</span><div><b>Evidências fotográficas</b><small>Imagens vinculadas às fichas e ensaios</small></div></div>
            <div className="client-evidence-grid">{lotPhotos.map((item,index)=><figure key={`${item.url}-${index}`}><img src={item.url} alt={item.label}/><figcaption><b>{item.sample.labelBase}</b><span>{item.label}</span></figcaption></figure>)}</div>
          </section>}
        </div>

        <div className="modal-footer"><span>Portal de acompanhamento Solocontrol. Resultados formais devem ser interpretados conforme projeto, especificações, procedimentos e relatórios técnicos aplicáveis.</span><div className="heading-actions"><button className="button ghost" disabled={Boolean(reportBusy)} onClick={clientPdf}><FileDown size={15}/>{reportBusy==='pdf'?'Gerando...':'Gerar PDF'}</button><button className="button primary" disabled={Boolean(reportBusy)} onClick={clientShare}><Share2 size={15}/>{reportBusy==='share'?'Preparando...':'Compartilhar'}</button><button className="button secondary" onClick={()=>setSelectedLot(null)}>Fechar relatório</button></div></div>
      </section>
    </div>}

    <footer className="client-footer"><Image src="/logo-solocontrol-icon.png" width={42} height={42} alt="Solocontrol"/><div><b>Solocontrol Engenharia e Consultoria</b><span>Tecnologia aplicada à qualidade, controle e rastreabilidade.</span></div></footer>
  </main>
}
