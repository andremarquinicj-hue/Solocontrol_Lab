'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileDown,
  FileText,
  FlaskConical,
  FolderOpen,
  HelpCircle,
  Home,
  ImageIcon,
  LockKeyhole,
  MapPinned,
  PackageCheck,
  Share2,
  ShieldCheck,
  TrendingUp,
  X,
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
import { sampleProcessLabel } from '@/lib/process-profiles';
import {
  completedTests,
  elementProgress,
  formatElementLabel,
  normalizeElementGroup,
  overallProgress,
  sampleCollectionDate,
  sampleVolume,
  uniqueConcreteUnits,
  uniqueReports,
} from '@/lib/work-analytics';
import { extractLots, normalizeBlock, VILLA_ARAUCO_BLOCKS } from '@/lib/villa-arauco';
import { formatDate, ruptureAgeLabel } from '@/lib/utils';

type LotRef={block:string;lot:string};

function formatNumber(value:number,digits=1){
  return value.toLocaleString('pt-BR',{maximumFractionDigits:digits});
}

function monthLabel(value:string){
  const date=new Date(`${value}T12:00:00`);
  if(Number.isNaN(date.getTime()))return value;
  return date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
}

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
  const controlledUnits=uniqueConcreteUnits(data);
  const traceabilityPercent=data.length?Math.min(100,(controlled/data.length)*100):100;
  const plannedUnits=work?.plannedUnits||0;
  const unitPercent=plannedUnits?Math.min(100,(controlledUnits/plannedUnits)*100):(overall||0);

  const productionSeries=useMemo(()=>{
    const groups=new Map<string,{volume:number,units:Set<string>}>();
    data.forEach(sample=>{
      const key=sampleCollectionDate(sample).slice(0,7);
      const current=groups.get(key)||{volume:0,units:new Set<string>()};
      current.volume+=sampleVolume(sample);
      const block=normalizeBlock(sample.block);
      const lots=extractLots(sample.lot);
      lots.forEach(lot=>current.units.add(`${block}-${lot}`));
      groups.set(key,current);
    });
    return Array.from(groups.entries()).sort((a,b)=>a[0].localeCompare(b[0])).slice(-9).map(([key,value])=>({key,label:monthLabel(`${key}-01`),volume:value.volume,units:value.units.size}));
  },[data]);
  const productionMax=Math.max(...productionSeries.map(item=>item.units),1);

  const volumeDistribution=useMemo(()=>{
    const groups=new Map<string,number>();
    data.forEach(sample=>{
      const key=normalizeElementGroup(sample.element);
      if(key==='OUTROS')return;
      groups.set(key,(groups.get(key)||0)+sampleVolume(sample));
    });
    const colors=['#0b4f97','#0b77d5','#49a7eb','#8ac7f4'];
    return Array.from(groups.entries()).map(([element,value],index)=>({
      element,
      label:formatElementLabel(element),
      value,
      percent:volume?(value/volume)*100:0,
      color:colors[index%colors.length],
    })).sort((a,b)=>b.value-a.value);
  },[data,volume]);
  const volumeDonut=useMemo(()=>{
    if(!volumeDistribution.length)return 'conic-gradient(#e5edf4 0 100%)';
    let cursor=0;
    const stops=volumeDistribution.map(item=>{
      const start=cursor;
      cursor+=item.percent;
      return `${item.color} ${start}% ${Math.min(100,cursor)}%`;
    });
    if(cursor<100)stops.push(`#e5edf4 ${cursor}% 100%`);
    return `conic-gradient(${stops.join(',')})`;
  },[volumeDistribution]);

  const evidence=useMemo(()=>{
    const all=data.flatMap(sample=>[
      ...sample.photos.map(photo=>({url:photo.url,label:photo.name,sample})),
      ...sample.ruptures.flatMap(rupture=>rupture.photos.map(photo=>({url:photo.url,label:`${ruptureAgeLabel(rupture)} • ${photo.name}`,sample}))),
    ]).filter(item=>Boolean(item.url));
    const seen=new Set<string>();
    return all.filter(item=>!seen.has(item.url)&&seen.add(item.url)).slice(0,5);
  },[data]);

  const recent=useMemo(()=>[...data].sort((a,b)=>sampleCollectionDate(b).localeCompare(sampleCollectionDate(a))).slice(0,6),[data]);

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

  if(isPilot)return <main className="client-portal client-portal-v2">
    <section className="client-empty"><Image src="/logo-solocontrol.png" width={220} height={110} alt="Solocontrol"/><LockKeyhole size={44}/><h1>Login necessário</h1><p>Dados reais da obra não são exibidos no modo anônimo. Entre com uma conta de cliente autorizada.</p><Link href="/login" className="button primary">Entrar no portal</Link></section>
  </main>;

  return <main className="client-portal-v2">
    <aside className="client-sidebar-v2">
      <div className="client-brand-v2">
        <Image src="/logo-solocontrol.png" width={185} height={92} alt="Solocontrol" priority/>
        <span>Portal do Cliente</span>
      </div>
      <nav>
        <a href="#visao-geral"><Home size={18}/>Visão Geral</a>
        <a href="#mapa"><MapPinned size={18}/>Mapa da Obra</a>
        <a href="#concretagens"><FlaskConical size={18}/>Concretagens</a>
        <a href="#resultados"><BarChart3 size={18}/>Resultados</a>
        <a href="#relatorios"><FileText size={18}/>Relatórios</a>
        <a href="#fotos"><ImageIcon size={18}/>Galeria de Fotos</a>
        <a href="#documentos"><FolderOpen size={18}/>Documentos</a>
        <a href="#sobre"><HelpCircle size={18}/>Sobre a Solocontrol</a>
      </nav>
      <div className="client-sidebar-quote"><ShieldCheck size={28}/><b>Qualidade hoje.<br/>Construindo o amanhã.</b></div>
      <div className="client-sidebar-account"><span>Acesso</span><b>{profile.name}</b><Link href="/login">Minha conta</Link></div>
    </aside>

    <div className="client-main-v2">
      {!work?<section className="client-empty"><Building2 size={44}/><h1>Nenhuma obra liberada</h1><p>Solicite à Solocontrol a liberação do acesso para a obra.</p></section>:<>
        <section id="visao-geral" className="client-hero-v2">
          <div className="client-hero-v2-copy">
            <span>PORTAL DE ACOMPANHAMENTO TECNOLÓGICO</span>
            <div className="client-hero-title-row"><h1>{work.name}</h1><b>Obra em andamento</b></div>
            <p><strong>Cliente:</strong> {work.client} <i/> <strong>Executora:</strong> {work.contractor||'—'}</p>
            <small>Controle tecnológico: Solocontrol Engenharia e Consultoria</small>
            <blockquote>“Qualidade, segurança e rastreabilidade em todas as etapas da sua obra.”</blockquote>
          </div>
          <div className="client-hero-v2-side">
            <label>Obra<select value={workId} onChange={e=>{setWorkId(e.target.value);setSelectedLot(null)}}>{works.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</select></label>
            <div className="client-last-update"><span>Última atualização</span><b>{latest?new Date(latest).toLocaleDateString('pt-BR'):'—'}</b><strong>{latest?new Date(latest).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</strong></div>
            <p>Mais que números,<br/><b>construímos confiança.</b></p>
          </div>
        </section>

        <section className="client-kpi-grid-v2">
          <div><Home/><span>Unidades previstas</span><strong>{plannedUnits||'—'}</strong><small>Total da obra</small></div>
          <div><CheckCircle2/><span>Unidades com controle</span><strong>{controlledUnits}</strong><small>{unitPercent.toFixed(1)}% do total</small></div>
          <div><PackageCheck/><span>Volume de concreto</span><strong>{formatNumber(volume)} m³</strong><small>controlado</small></div>
          <div><FlaskConical/><span>Ensaios realizados</span><strong>{tests.toLocaleString('pt-BR')}</strong><small>resultados registrados</small></div>
          <div><FileCheck2/><span>Laudos registrados</span><strong>{reports}</strong><small>referências únicas</small></div>
          <div><ShieldCheck/><span>Rastreabilidade</span><strong>{traceabilityPercent.toFixed(0)}%</strong><small>dos registros</small></div>
        </section>

        <section className="client-dashboard-v2">
          <article className="client-card-v2 client-evolution-v2" id="resultados">
            <div className="client-card-title-v2"><div><span>EVOLUÇÃO DA OBRA</span><h2>Unidades com processo controlado</h2></div><div className="client-chart-legend"><i className="planned"/>Previsto <i className="realized"/>Realizado</div></div>
            <div className="client-bars-v2">
              {productionSeries.map(item=><div key={item.key}><div className="client-bar-track-v2"><span style={{height:`${(item.units/productionMax)*100}%`}}/></div><b>{item.label}</b><small>{item.units} un.</small></div>)}
              {!productionSeries.length&&<div className="client-empty-mini">Sem produção mensal suficiente.</div>}
            </div>
          </article>

          <article className="client-card-v2 client-distribution-v2">
            <div className="client-card-title-v2"><div><span>DISTRIBUIÇÃO DO VOLUME</span><h2>Por elemento construtivo</h2></div></div>
            <div className="client-distribution-layout-v2">
              <div className="client-donut-v2" style={{background:volumeDonut}}><div><b>{formatNumber(volume)}</b><span>m³ total</span></div></div>
              <div className="client-volume-legend-v2">{volumeDistribution.map(item=><div key={item.element}><span><i style={{background:item.color}}/>{item.label}</span><b>{formatNumber(item.value)} m³ ({item.percent.toFixed(1)}%)</b></div>)}</div>
            </div>
          </article>

          <article className="client-card-v2 client-quality-v2">
            <div className="client-card-title-v2"><div><span>QUALIDADE E CONFORMIDADE</span><h2>Indicadores de confiança</h2></div></div>
            <div className="client-quality-list-v2">
              <div><CheckCircle2/><span>Registros com rastreabilidade</span><b>{traceabilityPercent.toFixed(0)}%</b></div>
              <div><CheckCircle2/><span>Ensaios registrados</span><b>{tests.toLocaleString('pt-BR')}</b></div>
              <div className={pending?'attention':''}><ShieldCheck/><span>Pendências críticas</span><b>{pending}</b></div>
              <div><FileCheck2/><span>Laudos/referências</span><b>{reports}</b></div>
              <div><TrendingUp/><span>Acompanhamento técnico</span><b>Ativo</b></div>
            </div>
            <div className="client-quality-verdict-v2"><CheckCircle2/><div><b>Obra dentro do acompanhamento tecnológico</b><span>Os dados exibidos são derivados dos registros cadastrados no sistema.</span></div></div>
          </article>
        </section>

        <section id="mapa" className="client-map-layout-v2">
          <article className="client-card-v2 client-map-card-v2">
            <div className="client-card-title-v2"><div><span>MAPA DA OBRA</span><h2>Quadras e lotes</h2></div><div className="client-map-filter-v2">{['RADIER','PAREDES E LAJES','OITÕES E PLATIBANDAS','MURO DE ARRIMO'].map(e=><button key={e} className={element===e?'active':''} onClick={()=>setElement(e)}>{formatElementLabel(e)}</button>)}</div></div>
            <div className="client-map-legend-v2"><span><i className="done"/>Concluído</span><span><i className="active"/>Em andamento</span><span><i className="waiting"/>Aguardando ensaio</span><span><i className="none"/>Sem registro</span></div>
            {work.mapImage&&<div className="client-plan-v2"><img src={work.mapImage} alt={`Planta ${work.name}`}/></div>}
            <div className="blocks-grid client-blocks client-blocks-v2">{blocks.slice(0,30).map(block=><div className="block-card" key={block}><div className="block-title"><MapPinned size={14}/>Quadra {block}</div><div className="lots-grid">{Array.from({length:work.mapMaxLot||28},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const rs=records(block,lot);const bad=rs.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');return <button type="button" onClick={()=>setSelectedLot({block,lot})} className={`lot-tile ${rs.length?(bad?'partial':'done'):'empty'}`} key={lot}>{lot}</button>})}</div></div>)}</div>
          </article>

          <article id="concretagens" className="client-card-v2 client-recent-v2">
            <div className="client-card-title-v2"><div><span>ÚLTIMAS CONCRETAGENS</span><h2>Atividade recente</h2></div><a href="#mapa">Ver mapa →</a></div>
            <div className="table-wrap"><table><thead><tr><th>Data</th><th>Quadra</th><th>Lote</th><th>Elemento</th><th>Volume</th><th>Status</th></tr></thead><tbody>{recent.map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}</td><td>{s.block?`Q${s.block}`:'—'}</td><td>{s.lot?`L${s.lot}`:'—'}</td><td>{sampleProcessLabel(s)}</td><td>{formatNumber(sampleVolume(s))} m³</td><td><span className="status concluido">Registrado</span></td></tr>)}</tbody></table></div>
            <div className="client-map-callout-v2"><FileText/><div><b>Acesse o dossiê completo de cada lote</b><span>Relatórios, resultados, fotos e muito mais.</span></div><a href="#mapa" className="button primary">Explorar mapa</a></div>
          </article>
        </section>

        <section className="client-field-grid-v2">
          <article id="fotos" className="client-card-v2 client-gallery-v2">
            <div className="client-card-title-v2"><div><span>REGISTRO EM CAMPO</span><h2>Evidências da qualidade</h2></div></div>
            <div className="client-gallery-grid-v2">
              {evidence.map((item,index)=><figure key={`${item.url}-${index}`}><img src={item.url} alt={item.label}/><figcaption><b>{item.label}</b><span>{item.sample.block?`Q${item.sample.block}`:''}{item.sample.lot?` • L${item.sample.lot}`:''} • {formatDate(sampleCollectionDate(item.sample))}</span></figcaption></figure>)}
              {!evidence.length&&<div className="client-gallery-placeholder-v2"><Camera size={28}/><b>Galeria em formação</b><span>As fotos vinculadas às novas fichas aparecerão automaticamente aqui.</span></div>}
            </div>
          </article>

          <article id="relatorios" className="client-card-v2 client-docs-v2">
            <div className="client-card-title-v2"><div><span>DOCUMENTOS E RELATÓRIOS</span><h2>Geração de relatórios técnicos</h2></div></div>
            <div className="client-doc-list-v2">
              <button onClick={()=>window.print()}><FileText/><span>Visão geral da obra</span><b>PDF</b></button>
              <a href="#mapa"><FileText/><span>Relatório por quadra/lote</span><b>Mapa</b></a>
              <a href="#concretagens"><FileText/><span>Histórico de concretagens</span><b>Dados</b></a>
              <a href="#resultados"><FileText/><span>Resultados e evolução</span><b>Gráficos</b></a>
            </div>
            <a href="mailto:contatos.solocontrol@gmail.com" className="button primary full">Solicitar relatório personalizado</a>
          </article>
        </section>

        <section id="documentos" className="client-document-strip-v2">
          <ShieldCheck/><div><b>Transparência e rastreabilidade em tempo real</b><span>O portal apresenta informações de acompanhamento. Resultados formais permanecem vinculados aos relatórios técnicos aprovados e documentos aplicáveis.</span></div>
        </section>

        <footer id="sobre" className="client-footer-v2"><Image src="/logo-solocontrol-icon.png" width={40} height={40} alt="Solocontrol"/><div><b>Solocontrol Engenharia e Consultoria</b><span>Controle tecnológico para um futuro mais seguro.</span></div><small>Tecnologia aplicada à qualidade, controle e rastreabilidade.</small></footer>
      </>}
    </div>

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
          <div><span>Volume controlado</span><strong>{formatNumber(selectedLotRecords.reduce((sum,s)=>sum+sampleVolume(s),0))} m³</strong></div>
          <div><span>Ensaios concluídos</span><strong>{selectedLotRecords.reduce((sum,s)=>sum+s.ruptures.filter(r=>r.status==='concluido').length,0)}</strong></div>
          <div><span>Laudos / referências</span><strong>{new Set(selectedLotRecords.map(s=>s.reportNumber||s.physicalFormNumber).filter(Boolean)).size}</strong></div>
        </div>

        <div className="client-report-body">
          <section>
            <div className="client-report-section-title"><span>01</span><div><b>Resumo das concretagens</b><small>Rastreabilidade por etapa construtiva</small></div></div>
            <div className="table-wrap"><table><thead><tr><th>Data</th><th>Processo</th><th>Concreteira</th><th>NF</th><th>Volume</th><th>Slump</th><th>MPa projeto</th><th>Referência</th></tr></thead><tbody>{[...selectedLotRecords].sort((a,b)=>sampleCollectionDate(a).localeCompare(sampleCollectionDate(b))).map(s=><tr key={s.id}><td>{formatDate(sampleCollectionDate(s))}</td><td>{sampleProcessLabel(s)}</td><td>{s.supplier||'—'}</td><td>{s.invoice||'—'}</td><td>{formatNumber(sampleVolume(s))} m³</td><td>{s.slumpActualCm!==undefined?`${s.slumpActualCm} cm`:'—'}</td><td>{s.specifiedStrengthMpa?`${s.specifiedStrengthMpa} MPa`:work.defaultStrengthMpa?`${work.defaultStrengthMpa} MPa`:'—'}</td><td>{s.reportNumber||s.physicalFormNumber||'—'}</td></tr>)}</tbody></table></div>
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
  </main>;
}
