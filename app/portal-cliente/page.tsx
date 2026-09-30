'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
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
import { MapViewMode, pictogramBlockProgress, pictogramExactLot, pictogramForWork, pictogramMapForWork, pictogramPreviewForElement, villaConstructionHighlights } from '@/lib/pictogram';

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
  const [mapMode,setMapMode]=useState<MapViewMode>('consolidated');

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
  const kpiProgress=Math.max(unitPercent||0,overall||0);
  const pictogram=useMemo(()=>pictogramForWork(work),[work]);
  const pictogramMap=useMemo(()=>pictogramMapForWork(work),[work]);
  const constructionHighlights=useMemo(()=>villaConstructionHighlights(pictogram),[pictogram]);
  const houseConcreteTotal=pictogram?.houseConcrete.total||0;
  const displayPlannedUnits=plannedUnits||pictogram?.totalUnits||0;
  const houseConcretePercent=pictogram?.totalUnits?Math.min(100,(houseConcreteTotal/pictogram.totalUnits)*100):0;
  const houseByBlock:Record<string,number>=pictogram?.houseConcrete.byBlock??{};
  const maxHouseByBlock=Math.max(...Object.values(houseByBlock),1);

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
    return all.filter(item=>!seen.has(item.url)&&seen.add(item.url)).slice(0,6);
  },[data]);

  const recent=useMemo(()=>[...data].sort((a,b)=>sampleCollectionDate(b).localeCompare(sampleCollectionDate(a))).slice(0,8),[data]);

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

  function lotMapState(block:string,lot:string){
    const technical=records(block,lot);
    const technicalBad=technical.some(s=>s.historicalState==='sem_controle'||s.historicalState==='parcial');
    const physical=pictogramExactLot(pictogramMap,block,lot,element);
    if(mapMode==='solocontrol') return technical.length?(technicalBad?'partial':'done'):(allLotRecords(block,lot).length?'waiting':'empty');
    if(mapMode==='coplan') return physical?.completed?'coplan-done':'coplan-unknown';
    if(physical?.completed&&technical.length) return technicalBad?'reconcile-attention':'reconciled';
    if(physical?.completed&&!technical.length) return 'physical-only';
    if(!physical?.completed&&technical.length) return technicalBad?'reconcile-attention':'technical-only';
    return allLotRecords(block,lot).length?'technical-other':'empty';
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

  const topElements=useMemo(()=>progress.filter(item=>item.completed>0).slice(0,4),[progress]);
  const topLots=useMemo(()=>{
    const groups=new Map<string,{count:number,volume:number}>();
    data.forEach(sample=>{
      const block=normalizeBlock(sample.block);
      const lots=extractLots(sample.lot);
      if(!block||!lots.length)return;
      lots.forEach(lot=>{
        const key=`${block}-${lot}`;
        const current=groups.get(key)||{count:0,volume:0};
        current.count+=1;
        current.volume+=sampleVolume(sample);
        groups.set(key,current);
      });
    });
    return Array.from(groups.entries())
      .map(([key,value])=>({key,block:key.split('-')[0],lot:key.split('-')[1],...value}))
      .sort((a,b)=>b.count-a.count||b.volume-a.volume)
      .slice(0,5);
  },[data]);

  function publicStatus(){
    if(!lotSummary)return{label:'Aguardando dados',tone:'pendente'};
    if(lotSummary.tone==='danger')return{label:'Em análise técnica',tone:'pendente'};
    if(lotSummary.tone==='good')return{label:'Resultados de controle acompanhados',tone:'concluido'};
    return{label:'Acompanhamento em andamento',tone:'em_execucao'};
  }
  const lotStatus=publicStatus();

  const workStatus=pending===0
    ?{label:'Operação estável',detail:'Sem pendências críticas em aberto.',tone:'good'}
    :{label:'Acompanhamento ativo',detail:`${pending} item(ns) exigem atenção/continuidade de cadastro.`,tone:'warn'};

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

  if(isPilot)return <main className="client-portal-v3">
    <section className="client-empty"><Image src="/logo-solocontrol.png" width={220} height={110} alt="Solocontrol"/><LockKeyhole size={44}/><h1>Login necessário</h1><p>Dados reais da obra não são exibidos no modo anônimo. Entre com uma conta de cliente autorizada.</p><Link href="/login" className="button primary">Entrar no portal</Link></section>
  </main>;

  return <main className="client-portal-v3">
    <aside className="client-sidebar-v3">
      <div className="client-brand-v3">
        <Image src="/logo-solocontrol.png" width={188} height={92} alt="Solocontrol" priority/>
        <span>Portal do Cliente</span>
      </div>
      <nav>
        <a href="#visao-geral"><Home size={18}/>Visão Geral</a>
        <a href="#mapa"><MapPinned size={18}/>Mapa da Obra</a>
        <a href="#status"><ShieldCheck size={18}/>Status da Qualidade</a>
        <a href="#concretagens"><FlaskConical size={18}/>Concretagens</a>
        <a href="#resultados"><BarChart3 size={18}/>Resultados</a>
        <a href="#fotos"><ImageIcon size={18}/>Evidências</a>
        <a href="#relatorios"><FileText size={18}/>Relatórios</a>
        <a href="#sobre"><HelpCircle size={18}/>Sobre a Solocontrol</a>
      </nav>
      <div className="client-sidebar-seal-v3"><ShieldCheck size={28}/><b>Qualidade hoje.<br/>Construindo o amanhã.</b><span>Rastreabilidade, tecnologia e transparência para a diretoria e para o cliente.</span></div>
      <div className="client-sidebar-account-v3"><span>Acesso liberado para</span><b>{profile.name}</b><Link href="/login">Minha conta</Link></div>
    </aside>

    <div className="client-main-v3">
      {!work?<section className="client-empty"><Building2 size={44}/><h1>Nenhuma obra liberada</h1><p>Solicite à Solocontrol a liberação do acesso para a obra.</p></section>:<>
        <header id="visao-geral" className="client-topbar-v3">
          <div>
            <span>PORTAL EXECUTIVO DO CLIENTE</span>
            <h1>{work.name}</h1>
            <p>{work.client} • acompanhamento tecnológico em tempo real</p>
          </div>
          <div className="client-topbar-controls-v3">
            <label>
              <span>Obra</span>
              <select value={workId} onChange={e=>{setWorkId(e.target.value);setSelectedLot(null)}}>
                {works.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}
              </select>
            </label>
            <div className={`client-health-pill-v3 ${workStatus.tone}`}>
              {workStatus.tone==='good'?<CheckCircle2 size={16}/>:<AlertTriangle size={16}/>} {workStatus.label}
            </div>
          </div>
        </header>

        <section className="client-hero-v3">
          <div className="client-hero-copy-v3">
            <div className="client-hero-badge-row-v3">
              <span>CONTROLE TECNOLÓGICO</span>
              <strong>Solocontrol Engenharia e Consultoria</strong>
            </div>
            <h2>Painel sofisticado, claro e objetivo para a diretoria acompanhar a obra com confiança.</h2>
            <p>
              O portal consolida volume de concreto, ensaios executados, rastreabilidade, mapa interativo, evolução da obra,
              dossiê técnico por lote e evidências fotográficas — tudo em um único ambiente.
            </p>
            <div className="client-hero-highlights-v3">
              <div><span>Status operacional</span><b>{workStatus.detail}</b></div>
              <div><span>Última atualização</span><b>{latest?`${new Date(latest).toLocaleDateString('pt-BR')} às ${new Date(latest).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`:'Sem atualização recente'}</b></div>
            </div>
          </div>
          <div className="client-hero-aside-v3">
            <div className="hero-mini-card"><span>Cliente</span><b>{work.client||'—'}</b></div>
            <div className="hero-mini-card"><span>Executora</span><b>{work.contractor||'—'}</b></div>
            <div className="hero-mini-card"><span>{pictogram?'Paredes/Lajes concretadas':'Progresso global'}</span><b>{pictogram?`${houseConcretePercent.toFixed(1)}%`:`${kpiProgress.toFixed(1)}%`}</b></div>
            <div className="hero-mini-card"><span>Rastreabilidade</span><b>{traceabilityPercent.toFixed(0)}%</b></div>
          </div>
        </section>

        <section className="client-kpi-grid-v3">
          <article><Home/><span>Unidades previstas</span><strong>{displayPlannedUnits||'—'}</strong><small>escopo cadastrado</small></article>
          <article><CheckCircle2/><span>Paredes / lajes concretadas</span><strong>{pictogram?houseConcreteTotal:controlledUnits}</strong><small>{pictogram?`${houseConcretePercent.toFixed(1)}% do empreendimento`:`${unitPercent.toFixed(1)}% com controle`}</small></article>
          <article><PackageCheck/><span>Volume de concreto</span><strong>{formatNumber(volume)} m³</strong><small>acumulado controlado</small></article>
          <article><FlaskConical/><span>Ensaios concluídos</span><strong>{tests.toLocaleString('pt-BR')}</strong><small>rupturas/resultados</small></article>
          <article><FileCheck2/><span>Laudos / referências</span><strong>{reports}</strong><small>documentos vinculados</small></article>
          <article><ShieldCheck/><span>Rastreabilidade</span><strong>{traceabilityPercent.toFixed(0)}%</strong><small>dos registros cadastrados</small></article>
        </section>

        {pictogram&&<section className="client-construction-panel-v3">
          <div className="client-section-head-v3">
            <div><span>AVANÇO FÍSICO INFORMADO PELA COPLAN</span><h3>Pictograma executivo da Villa Arauco</h3><p>Base recebida em {formatDate(pictogram.receivedAt)} • {pictogram.sourceFile}</p></div>
            <div className="client-source-badge-v3"><ShieldCheck size={16}/>620 unidades</div>
          </div>
          <div className="client-construction-grid-v3">
            {constructionHighlights.map(item=><article key={item.key}>
              <div><span>{item.label}</span><b>{item.count} / {item.total}</b></div>
              <div className="client-construction-track-v3"><i style={{width:`${item.percent}%`}}/></div>
              <small>{item.percent.toFixed(1)}% concluído</small>
            </article>)}
            <article className="featured"><div><span>Paredes e lajes concretadas</span><b>{houseConcreteTotal} / {pictogram.totalUnits}</b></div><div className="client-construction-track-v3"><i style={{width:`${houseConcretePercent}%`}}/></div><small>{houseConcretePercent.toFixed(1)}% do empreendimento</small></article>
          </div>
          <div className="client-block-progress-v3">
            <div><b>Casas com paredes/lajes concretadas por quadra</b><span>Totais consolidados da aba “CASA CONCRETADA”.</span></div>
            <div className="client-block-progress-grid-v3">{Object.entries(houseByBlock).map(([block,count])=><div key={block}><span>Q{block}</span><div><i style={{width:`${(count/maxHouseByBlock)*100}%`}}/></div><b>{count}</b></div>)}</div>
          </div>
          <div className="client-source-note-v3"><ShieldCheck size={18}/><span>Avanço físico da COPLAN e controle tecnológico da Solocontrol são apresentados separadamente para preservar a origem e a rastreabilidade de cada informação.</span></div>
        </section>}

        <section className="client-overview-grid-v3">
          <article id="mapa" className="client-card-v3 client-map-panel-v3">
            <div className="client-section-head-v3">
              <div><span>MAPA INTERATIVO DA OBRA</span><h3>COPLAN + Solocontrol em uma única leitura</h3></div>
              <div className="client-map-filter-v3">
                {['RADIER','PAREDES E LAJES','OITÕES E PLATIBANDAS','MURO DE ARRIMO'].map(e=><button key={e} className={element===e?'active':''} onClick={()=>setElement(e)}>{formatElementLabel(e)}</button>)}
              </div>
            </div>
            {pictogramMap&&<div className="client-map-source-tabs-v3"><button className={mapMode==='consolidated'?'active':''} onClick={()=>setMapMode('consolidated')}>Visão consolidada</button><button className={mapMode==='coplan'?'active':''} onClick={()=>setMapMode('coplan')}>Pictograma COPLAN</button><button className={mapMode==='solocontrol'?'active':''} onClick={()=>setMapMode('solocontrol')}>Controle Solocontrol</button></div>}
            {mapMode==='coplan'&&pictogramMap?<>
              <div className="client-map-legend-v3"><span><i className="done"/>Fonte oficial COPLAN</span><span>Base recebida em {formatDate(pictogramMap.receivedAt)}</span></div>
              <div className="client-pictogram-official-v3"><img src={pictogramPreviewForElement(element)} alt={`Pictograma COPLAN - ${formatElementLabel(element)}`}/></div>
              <div className="client-coplan-block-grid-v3">{blocks.map(block=>{const item=pictogramBlockProgress(pictogramMap,block,element);if(!item)return null;const percent=item.total?Math.min(100,item.completed/item.total*100):0;return <div key={block}><div><b>Q{block}</b><span>{item.completed}/{item.total}</span></div><div><i style={{width:`${percent}%`}}/></div><small>{item.label} • {percent.toFixed(1)}%</small></div>})}</div>
              <div className="client-map-source-note-v3"><ShieldCheck size={18}/><span>Este modo reproduz o avanço físico da planilha alimentada pela COPLAN. Quando o arquivo não identifica o lote individualmente, o portal apresenta a contagem oficial da quadra sem inventar associação de lote.</span></div>
            </>:<>
              <div className="client-map-legend-v3">
                {mapMode==='consolidated'?<><span><i className="reconciled"/>COPLAN + Solocontrol</span><span><i className="physical-only"/>Executado COPLAN sem ficha vinculada</span><span><i className="technical-only"/>Controle Solocontrol</span><span><i className="empty"/>Sem vínculo individual</span></>:<><span><i className="done"/>Controlado</span><span><i className="partial"/>Registro parcial</span><span><i className="waiting"/>Outro elemento no lote</span><span><i className="empty"/>Sem registro</span></>}
              </div>
              {work.mapImage&&<div className="client-plan-v3"><img src={work.mapImage} alt={`Planta ${work.name}`}/></div>}
              <div className="client-map-scroll-v3"><div className="blocks-grid client-blocks-v3">{blocks.slice(0,30).map(block=>{const coplan=pictogramBlockProgress(pictogramMap,block,element);return <div className="block-card-v3" key={block}><div className="block-title-v3 client-consolidated-block-v3"><span><MapPinned size={14}/>Quadra {block}</span>{mapMode==='consolidated'&&coplan&&<small>COPLAN: <b>{coplan.completed}/{coplan.total}</b></small>}</div><div className="lots-grid-v3">{Array.from({length:work.mapMaxLot||28},(_,i)=>String(i+1).padStart(2,'0')).map(lot=>{const tone=lotMapState(block,lot);const tech=records(block,lot).length;const physical=pictogramExactLot(pictogramMap,block,lot,element);return <button type="button" title={`Q${block} L${lot} • COPLAN ${physical?.completed?'confirmado no lote':'sem identificação individual'} • Solocontrol ${tech?`${tech} registro(s)`:'sem ficha vinculada'}`} onClick={()=>setSelectedLot({block,lot})} className={`lot-tile-v3 ${tone}`} key={lot}>{lot}</button>})}</div></div>})}</div></div>
            </>}
            <div className="client-map-footer-v3"><div><b>Exploração técnica por lote</b><span>Na visão consolidada, o cliente enxerga o avanço COPLAN e a rastreabilidade Solocontrol sem misturar ou inventar a origem dos dados.</span></div><button className="button primary" onClick={()=>topLots[0]&&setSelectedLot({block:topLots[0].block,lot:topLots[0].lot})}>Abrir dossiê em destaque</button></div>
          </article>

          <aside className="client-side-stack-v3">
            <article id="status" className="client-card-v3">
              <div className="client-section-head-v3 compact">
                <div><span>SALA DE CONTROLE</span><h3>Status da qualidade</h3></div>
              </div>
              <div className="quality-badge-v3">
                <div className={`quality-dot-v3 ${workStatus.tone}`}>{workStatus.tone==='good'?<CheckCircle2 size={24}/>:<AlertTriangle size={24}/>}</div>
                <div><b>{workStatus.label}</b><span>{workStatus.detail}</span></div>
              </div>
              <div className="quality-list-v3">
                <div><span>Pendências em aberto</span><b>{pending}</b></div>
                <div><span>Registros controlados</span><b>{controlled}</b></div>
                <div><span>Ensaios cadastrados</span><b>{tests}</b></div>
                <div><span>Volume total</span><b>{formatNumber(volume)} m³</b></div>
              </div>
            </article>

            <article className="client-card-v3">
              <div className="client-section-head-v3 compact">
                <div><span>AVANÇO FÍSICO</span><h3>Resumo por elemento</h3></div>
              </div>
              <div className="progress-list-v3">
                {progress.filter(item=>item.target||item.completed).slice(0,5).map(item=><div key={item.element}>
                  <div className="progress-head-v3"><span>{formatElementLabel(item.element)}</span><b>{item.completed}{item.target?` / ${item.target}`:''}</b></div>
                  <div className="progress-track-v3"><i style={{width:`${Math.min(100,item.percent||0)}%`}}/></div>
                  <small>{item.target?`${(item.percent||0).toFixed(1)}% concluído`:'meta não configurada'}</small>
                </div>)}
              </div>
            </article>

            <article id="concretagens" className="client-card-v3">
              <div className="client-section-head-v3 compact">
                <div><span>ÚLTIMAS CONCRETAGENS</span><h3>Atividade recente</h3></div>
              </div>
              <div className="recent-list-v3">
                {recent.map(s=><button type="button" key={s.id} onClick={()=>s.block&&extractLots(s.lot)[0]&&setSelectedLot({block:normalizeBlock(s.block),lot:extractLots(s.lot)[0]})}>
                  <div>
                    <b>{sampleProcessLabel(s)}</b>
                    <span>{formatDate(sampleCollectionDate(s))} • {s.block?`Q${normalizeBlock(s.block)}`:'—'} {s.lot?`L${extractLots(s.lot)[0]||s.lot}`:''}</span>
                  </div>
                  <strong>{formatNumber(sampleVolume(s))} m³</strong>
                </button>)}
                {!recent.length&&<div className="empty-inline-v3">Sem registros recentes.</div>}
              </div>
            </article>
          </aside>
        </section>

        <section className="client-analytics-grid-v3">
          <article id="resultados" className="client-card-v3">
            <div className="client-section-head-v3"><div><span>EVOLUÇÃO DA OBRA</span><h3>Unidades controladas por período</h3></div></div>
            <div className="client-bars-v3">
              {productionSeries.map(item=><div key={item.key}><div className="client-bar-track-v3"><span style={{height:`${(item.units/productionMax)*100}%`}}/></div><b>{item.label}</b><small>{item.units} un.</small></div>)}
              {!productionSeries.length&&<div className="empty-inline-v3">Sem produção mensal suficiente.</div>}
            </div>
          </article>

          <article className="client-card-v3">
            <div className="client-section-head-v3"><div><span>DISTRIBUIÇÃO DO VOLUME</span><h3>Volume de concreto por elemento</h3></div></div>
            <div className="client-distribution-layout-v3">
              <div className="client-donut-v3" style={{background:volumeDonut}}><div><b>{formatNumber(volume)}</b><span>m³ total</span></div></div>
              <div className="client-volume-legend-v3">{volumeDistribution.map(item=><div key={item.element}><span><i style={{background:item.color}}/>{item.label}</span><b>{formatNumber(item.value)} m³</b><small>{item.percent.toFixed(1)}%</small></div>)}</div>
            </div>
          </article>

          <article id="fotos" className="client-card-v3 client-gallery-card-v3">
            <div className="client-section-head-v3"><div><span>EVIDÊNCIAS DE CAMPO</span><h3>Fotos e registros recentes</h3></div></div>
            <div className="client-gallery-grid-v3">
              {evidence.map((item,index)=><figure key={`${item.url}-${index}`}><img src={item.url} alt={item.label}/><figcaption><b>{item.label}</b><span>{item.sample.block?`Q${item.sample.block}`:''}{item.sample.lot?` • L${item.sample.lot}`:''} • {formatDate(sampleCollectionDate(item.sample))}</span></figcaption></figure>)}
              {!evidence.length&&<div className="client-gallery-placeholder-v3"><Camera size={28}/><b>Galeria em formação</b><span>As fotos vinculadas às novas fichas aparecerão automaticamente aqui.</span></div>}
            </div>
          </article>

          <article id="relatorios" className="client-card-v3">
            <div className="client-section-head-v3"><div><span>RELATÓRIOS E DOCUMENTOS</span><h3>Acesso rápido da diretoria</h3></div></div>
            <div className="client-doc-list-v3">
              <button onClick={()=>window.print()}><FileText/><div><b>Visão geral da obra</b><span>Resumo executivo em PDF</span></div></button>
              <a href="#mapa"><MapPinned/><div><b>Dossiê por quadra/lote</b><span>Relatórios técnicos, fotos e gráfico de cura</span></div></a>
              <a href="mailto:contatos.solocontrol@gmail.com"><FolderOpen/><div><b>Solicitar relatório formal</b><span>Envio pela equipe Solocontrol</span></div></a>
            </div>
            <div className="client-strip-v3"><FileCheck2 size={18}/><span>Os dados exibidos são derivados dos registros lançados no sistema e servem como acompanhamento gerencial do cliente.</span></div>
          </article>
        </section>

        <section id="sobre" className="client-footer-banner-v3">
          <ShieldCheck/>
          <div>
            <b>Transparência, rastreabilidade e confiança em tempo real</b>
            <span>Portal desenvolvido para transformar dados de campo em informação clara para gestores, diretoria e cliente.</span>
          </div>
        </section>
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
