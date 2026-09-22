'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle, Archive, BadgeCheck, Camera, CheckCircle2, Clock3,
  FileImage, FlaskConical, Printer, Send, Trash2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PhotoCapture from '@/components/PhotoCapture';
import StrengthEvolutionChart from '@/components/StrengthEvolutionChart';
import { useAuthScope } from '@/components/AuthScope';
import { useWorkScope } from '@/components/WorkScope';
import { archiveSample, deleteSample, getSample, listEquipment, saveSample, uploadEvidence } from '@/lib/store';
import {
  Equipment, PhotoEvidence, RuptureEvent, RuptureMeasurement, Sample
} from '@/lib/types';
import {
  formatDate, physicalLocationByDate, pressureMpa, ruptureAgeLabel,
  ruptureAgeSpec, ruptureScheduleLabel, scheduleFromAge
} from '@/lib/utils';
import {
  analyzeFormRelease, analyzeSample, applySpecimenStatuses,
  mean, resolveSpecimens, specimensForRupture
} from '@/lib/technical-analysis';
import {
  checkSlump, processTypeLabel, resolveProcessProfile, sampleProcessLabel, sampleProcessType
} from '@/lib/process-profiles';

type Unit='kN'|'tf'|'kgf'|'N';
interface MeasurementInput{load:string;unit:Unit;diameter:string;height:string}

function emptyMeasurement():MeasurementInput{return{load:'',unit:'kN',diameter:'100',height:'200'}}

export default function SampleDetail(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const {profile:isUser,isPilot,can}=useAuthScope();
  const {works}=useWorkScope();

  const [sample,setSample]=useState<Sample>();
  const [equipment,setEquipment]=useState<Equipment[]>([]);
  const [active,setActive]=useState<string>();
  const [files,setFiles]=useState<Record<string,File|undefined>>({});
  const [measurementInputs,setMeasurementInputs]=useState<Record<string,MeasurementInput>>({});
  const [equipmentId,setEquipmentId]=useState('');
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [reserveNotice,setReserveNotice]=useState('');

  useEffect(()=>{
    Promise.all([getSample(id),listEquipment()]).then(([found,eq])=>{
      setSample(found);
      setEquipment(eq.filter(x=>x.active));
      setActive(found?.ruptures.find(r=>r.status!=='concluido')?.id||found?.ruptures[0]?.id);
    });
  },[id]);

  const rupture=sample?.ruptures.find(item=>item.id===active);
  const work=sample?works.find(w=>w.id===sample.workId):undefined;
  const processType=sample?sampleProcessType(sample):undefined;
  const processProfile=resolveProcessProfile(work,processType);
  const technicalAnalysis=useMemo(()=>sample?analyzeSample(sample,work):undefined,[sample,work]);
  const formReleaseAnalysis=useMemo(()=>sample?analyzeFormRelease(sample,work):undefined,[sample,work]);
  const specimens=useMemo(()=>sample?resolveSpecimens(sample,work):[],[sample,work]);
  const activeSpecimens=useMemo(()=>sample&&rupture?specimensForRupture(sample,rupture,work):[],[sample,rupture,work]);
  const slumpResult=checkSlump(processProfile,sample?.slumpActualCm);

  useEffect(()=>{
    if(!rupture)return;
    const current:Record<string,MeasurementInput>={};
    const linked=activeSpecimens.length?activeSpecimens:[{id:'single',label:'CP'} as any];
    linked.forEach(cp=>{
      const existing=rupture.measurements?.find(m=>m.specimenId===cp.id||m.specimenLabel===cp.label);
      current[cp.id]=existing?{
        load:String(existing.load),
        unit:existing.loadUnit,
        diameter:String(existing.diameterMm),
        height:existing.heightMm?String(existing.heightMm):'200',
      }:emptyMeasurement();
    });
    setMeasurementInputs(current);
    setEquipmentId(rupture.equipmentId||'');
    setFiles({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active]);

  const operationalWarnings=useMemo(()=>{
    if(!sample)return[];
    const warnings:string[]=[];
    sample.ruptures.forEach(r=>{
      const spec=ruptureAgeSpec(r);
      const expected=scheduleFromAge(sample.moldedAt,sample.moldedTime||undefined,spec);
      if(spec.unit==='hours'&&sample.moldedTime&&r.dueAt&&r.dueAt!==expected.dueAt){
        warnings.push(`${ruptureAgeLabel(r)}: horário programado ${ruptureScheduleLabel(r)} difere do cálculo pela moldagem.`);
      }else if(spec.unit==='days'&&r.dueDate!==expected.dueDate){
        warnings.push(`${ruptureAgeLabel(r)}: data programada ${formatDate(r.dueDate)} difere de ${formatDate(expected.dueDate)} calculada pela idade.`);
      }
    });
    const r7=sample.ruptures.find(r=>Math.abs(r.ageDays-7)<0.001&&r.resistanceMpa!==undefined);
    const r28=sample.ruptures.find(r=>Math.abs(r.ageDays-28)<0.001&&r.resistanceMpa!==undefined);
    if(r7?.resistanceMpa!==undefined&&r28?.resistanceMpa!==undefined&&r28.resistanceMpa<r7.resistanceMpa){
      warnings.push(`Resultado médio de 28 dias (${r28.resistanceMpa.toFixed(2)} MPa) está abaixo do resultado médio de 7 dias (${r7.resistanceMpa.toFixed(2)} MPa). Revisar lançamento e evidências.`);
    }
    if(sample.slumpActualCm!==undefined&&slumpResult.status!=='within'&&slumpResult.status!=='not_configured'){
      warnings.push(`Slump ${sample.slumpActualCm} cm: ${slumpResult.message}`);
    }
    return warnings;
  },[sample,slumpResult.message,slumpResult.status]);

  if(!sample)return <div className="panel">Carregando amostra...</div>;

  const selectedEquipment=equipment.find(x=>x.id===rupture?.equipmentId);
  const measurementRows=activeSpecimens.length?activeSpecimens.map(cp=>({id:cp.id,label:cp.label})):[{id:'single',label:sample.labelBase}];

  function updateMeasurement(id:string,patch:Partial<MeasurementInput>){
    setMeasurementInputs(current=>({...current,[id]:{...(current[id]||emptyMeasurement()),...patch}}));
  }

  function calcFor(id:string){
    const row=measurementInputs[id]||emptyMeasurement();
    return pressureMpa(Number(row.load),row.unit,Number(row.diameter));
  }

  async function rescheduleEarly(hours:number){
    const currentSample=sample;
    const currentRupture=rupture;
    if(!currentSample||!currentRupture||currentRupture.status==='concluido'||currentRupture.purpose!=='form_release')return;
    if(!currentSample.moldedTime){alert('A ficha precisa ter horário de moldagem para reprogramar o ensaio em horas.');return}
    const reason=prompt(`Reprogramar os mesmos CPs de ${ruptureAgeLabel(currentRupture)} para ${hours} horas.\n\nMotivo:`,`Concreto ainda sem condição para ruptura/liberação de forma`);
    if(reason===null)return;
    const nextSpec={value:hours,unit:'hours' as const};
    const schedule=scheduleFromAge(currentSample.moldedAt,currentSample.moldedTime,nextSpec);
    const now=new Date().toISOString();
    const previous={fromLabel:ruptureAgeLabel(currentRupture),fromDueAt:currentRupture.dueAt,toLabel:`${hours} horas`,toDueAt:schedule.dueAt,reason:reason||'Reprogramação operacional',changedBy:isUser.name,changedAt:now};
    const ruptures=currentSample.ruptures.map(r=>r.id===currentRupture.id?{
      ...r,
      ageDays:hours/24,
      ageValue:hours,
      ageUnit:'hours' as const,
      ageLabel:`${hours} horas`,
      dueDate:schedule.dueDate,
      dueAt:schedule.dueAt,
      rescheduleHistory:[...(r.rescheduleHistory||[]),previous],
    }:r);
    const specimenList=resolveSpecimens(currentSample,work).map(cp=>cp.ruptureId===currentRupture.id?{
      ...cp,scheduledAgeDays:hours/24,scheduledAgeValue:hours,scheduledAgeUnit:'hours' as const,dueAt:schedule.dueAt,updatedAt:now
    }:cp);
    const updated:Sample={...currentSample,ruptures,specimens:specimenList,physicalLocation:physicalLocationByDate(schedule.dueDate),updatedAt:now};
    await saveSample(updated,`Ensaio de liberação reprogramado para ${hours} horas — ${reason||'sem motivo informado'}`);
    setSample(updated);
    alert(`Reprogramado para ${ruptureScheduleLabel(ruptures.find(r=>r.id===currentRupture.id)!)}.`);
  }

  async function finish(){
    const currentSample=sample;
    const currentRupture=rupture;
    if(!currentSample||!currentRupture||!files.rompimento||!files.prensa||!files.cpFinal)return;
    if(equipment.length&&!equipmentId){alert('Selecione o equipamento utilizado para manter a rastreabilidade.');return}

    const measurements:RuptureMeasurement[]=[];
    for(const row of measurementRows){
      const input=measurementInputs[row.id]||emptyMeasurement();
      if(!input.load||!input.diameter){
        alert(`Preencha carga e diâmetro para ${row.label}.`);
        return;
      }
      const resistance=pressureMpa(Number(input.load),input.unit,Number(input.diameter));
      measurements.push({
        specimenId:row.id==='single'?undefined:row.id,
        specimenLabel:row.label,
        load:Number(input.load),
        loadUnit:input.unit,
        diameterMm:Number(input.diameter),
        heightMm:Number(input.height)||undefined,
        resistanceMpa:resistance,
        createdAt:new Date().toISOString(),
      });
    }

    setSaving(true);
    try{
      const photos:PhotoEvidence[]=[];
      for(const key of ['rompimento','prensa','cpFinal'] as const){
        const file=files[key];if(!file)continue;
        const url=await uploadEvidence(file,`samples/${currentSample.id}/ruptura-${currentRupture.id}`);
        photos.push({key,url,name:key,createdAt:new Date().toISOString()});
      }
      const average=mean(measurements.map(m=>m.resistanceMpa))||0;
      const first=measurements[0];
      const updatedRupture:RuptureEvent={
        ...currentRupture,
        status:'concluido',
        load:first?.load,
        loadUnit:first?.loadUnit,
        diameterMm:first?.diameterMm,
        heightMm:first?.heightMm,
        resistanceMpa:average,
        measurements,
        equipmentId:equipmentId||undefined,
        completedAt:new Date().toISOString(),
        photos:[...currentRupture.photos,...photos],
      };
      const ruptures=currentSample.ruptures.map(item=>item.id===currentRupture.id?updatedRupture:item);
      const next=ruptures.filter(item=>item.status!=='concluido').sort((a,b)=>(a.dueAt||`${a.dueDate}T23:59`).localeCompare(b.dueAt||`${b.dueDate}T23:59`))[0];
      const updatedBase:Sample={
        ...currentSample,ruptures,
        physicalLocation:next?physicalLocationByDate(next.dueDate):'Arquivo Encerrado',
        sheetState:next?'arquivo':'arquivada',
        sheetCustodian:undefined,
        status:next?'em_andamento':'concluido',
        approvalStatus:currentSample.approvalStatus||'draft',
        updatedAt:new Date().toISOString(),
      };
      const updated=applySpecimenStatuses(updatedBase,work);
      await saveSample(updated,`Ruptura ${ruptureAgeLabel(currentRupture)} concluída — média ${average.toFixed(2)} MPa (${measurements.length} CP)`);
      const postAnalysis=analyzeSample(updated,work);
      setReserveNotice(postAnalysis.reserveDecision==='eligible'?postAnalysis.summary:'');
      setSample(updated);
      setFiles({});
      setMeasurementInputs({});
      setEquipmentId('');
      setActive(next?.id||updatedRupture.id);
    }finally{setSaving(false)}
  }

  async function changeApproval(next:'review'|'approved'){
    const currentSample=sample;
    if(!currentSample)return;
    if(next==='approved'&&!isPilot&&!can('engineer'))return;
    const updated:Sample={...currentSample,approvalStatus:next,approvedBy:next==='approved'?isUser.name:currentSample.approvedBy,approvedAt:next==='approved'?new Date().toISOString():currentSample.approvedAt,updatedAt:new Date().toISOString()};
    await saveSample(updated,next==='approved'?`Relatório aprovado por ${isUser.name}`:`Relatório enviado para conferência por ${isUser.name}`);
    setSample(updated);
  }

  async function archive(){
    const currentSample=sample;if(!currentSample)return;
    if(!confirm(`Arquivar a ficha ${currentSample.labelBase}? Ela sairá da operação diária, mas todo o histórico será preservado.`))return;
    const updated=await archiveSample(currentSample);setSample(updated);router.push('/amostras');
  }
  async function removeCurrentSample(){
    const currentSample=sample;if(!currentSample)return;
    if(!confirm(`EXCLUSÃO PERMANENTE\n\nExcluir a ficha ${currentSample.labelBase}, resultados e imagens? Essa ação não pode ser desfeita.`))return;
    setDeleting(true);try{await deleteSample(currentSample);router.push('/amostras');router.refresh()}catch{alert('Não foi possível excluir a ficha.');setDeleting(false)}
  }

  const stages=[
    {label:'Recebimento',display:formatDate(sample.receivedAt),done:true},
    {label:'Moldagem',display:`${formatDate(sample.moldedAt)}${sample.moldedTime?` ${sample.moldedTime}`:''}`,done:true},
    ...sample.ruptures.map(item=>({label:`Ruptura ${ruptureAgeLabel(item)}`,display:ruptureScheduleLabel(item),done:item.status==='concluido'})),
    {label:'Relatório final',display:sample.approvedAt?new Date(sample.approvedAt).toLocaleString('pt-BR'):'',done:sample.approvalStatus==='approved'}
  ];

  return <div className="page-stack print-area">
    <section className="page-heading no-print">
      <div><span className="eyebrow">AMOSTRA {sample.labelBase}</span><h1>Rastreabilidade da concretagem</h1><p>{sample.workName} • {sampleProcessLabel(sample)} • {sample.cpQuantity} CPs • {sample.block?`Q${sample.block} `:''}{sample.lot?`L${sample.lot} • `:''}{sample.location||''}</p></div>
      <div className="heading-actions"><span className={`status ${sample.approvalStatus==='approved'?'concluido':sample.approvalStatus==='review'?'em_execucao':'pendente'}`}>{sample.approvalStatus==='approved'?'Aprovado':sample.approvalStatus==='review'?'Em conferência':'Rascunho'}</span><button className="button secondary" onClick={()=>window.print()}><Printer size={16}/>Imprimir</button><button className="button secondary" onClick={archive}><Archive size={16}/>Arquivar</button>{(isPilot||can('admin'))&&<button className="button danger" disabled={deleting} onClick={removeCurrentSample}><Trash2 size={16}/>{deleting?'Excluindo...':'Excluir'}</button>}</div>
    </section>

    {operationalWarnings.length>0&&<section className="panel validation-panel no-print"><div className="panel-header"><div><h2>Alertas para conferência</h2><p>Verificações automáticas de apoio ao coordenador.</p></div><AlertTriangle/></div><div className="rule-list">{operationalWarnings.map((w,i)=><span key={i}>⚠ {w}</span>)}</div></section>}

    <section className="sample-process-overview no-print">
      <div className="panel"><span>Processo</span><strong>{sampleProcessLabel(sample)}</strong><small>{processProfile?`${processProfile.cpTotal} CPs padrão`:'Plano da ficha'}</small></div>
      <div className={`panel ${slumpResult.status==='within'?'overview-good':slumpResult.status==='low'||slumpResult.status==='high'?'overview-danger':''}`}><span>Slump</span><strong>{sample.slumpActualCm!==undefined?`${sample.slumpActualCm} cm`:'—'}</strong><small>{slumpResult.message}</small></div>
      <div className="panel"><span>MPa de projeto</span><strong>{technicalAnalysis?.targetMpa?`${technicalAnalysis.targetMpa.toFixed(1)} MPa`:'—'}</strong><small>controle principal</small></div>
      <div className={`panel ${formReleaseAnalysis?.decision==='eligible'?'overview-good':formReleaseAnalysis?.decision==='below'?'overview-danger':''}`}><span>Liberação de forma</span><strong>{formReleaseAnalysis?.applicable?formReleaseAnalysis.headline:'Não aplicável'}</strong><small>{formReleaseAnalysis?.applicable?formReleaseAnalysis.summary:'Sem ensaio de baixa idade'}</small></div>
    </section>

    {technicalAnalysis&&<section className={`panel technical-analysis-card tone-${technicalAnalysis.tone} no-print`}>
      <div className="panel-header"><div><h2>Controle principal e CP de reserva</h2><p>Comparação gerencial com o MPa configurado para o projeto.</p></div><BadgeCheck/></div>
      <div className="technical-analysis-grid">
        <div><span>Referência</span><strong>{technicalAnalysis.targetMpa?`${technicalAnalysis.targetMpa.toFixed(2)} MPa`:'Não configurada'}</strong></div>
        <div><span>Idade principal</span><strong>{technicalAnalysis.controlAgeDays} dias</strong></div>
        <div><span>Valor avaliado</span><strong>{technicalAnalysis.controlValue!==undefined?`${technicalAnalysis.controlValue.toFixed(2)} MPa`:'Aguardando'}</strong></div>
        <div><span>Regra do par</span><strong>{technicalAnalysis.evaluationMode==='minimum'?'Menor CP':technicalAnalysis.evaluationMode==='average'?'Média':'Configurar'}</strong></div>
      </div>
      <div className="technical-analysis-message"><b>{technicalAnalysis.headline}</b><span>{technicalAnalysis.summary}</span></div>
    </section>}

    {formReleaseAnalysis?.applicable&&<section className={`panel technical-analysis-card tone-${formReleaseAnalysis.tone} no-print`}>
      <div className="panel-header"><div><h2>Liberação de forma</h2><p>Controle de baixa idade para apoio à sequência das casas.</p></div><Clock3/></div>
      <div className="technical-analysis-grid">
        <div><span>MPa configurado</span><strong>{formReleaseAnalysis.targetMpa?`${formReleaseAnalysis.targetMpa.toFixed(2)} MPa`:'Não configurado'}</strong></div>
        <div><span>Ensaio</span><strong>{formReleaseAnalysis.rupture?ruptureAgeLabel(formReleaseAnalysis.rupture):'12 horas'}</strong></div>
        <div><span>Valor avaliado</span><strong>{formReleaseAnalysis.resultValue!==undefined?`${formReleaseAnalysis.resultValue.toFixed(2)} MPa`:'Aguardando'}</strong></div>
        <div><span>Regra do par</span><strong>{formReleaseAnalysis.evaluationMode==='minimum'?'Menor CP':formReleaseAnalysis.evaluationMode==='average'?'Média':'Configurar'}</strong></div>
      </div>
      <div className="technical-analysis-message"><b>{formReleaseAnalysis.headline}</b><span>{formReleaseAnalysis.summary}</span></div>
    </section>}

    {reserveNotice&&<section className="panel reserve-release-notice no-print"><div><CheckCircle2/><div><b>CP de 63 dias disponível para avaliação</b><span>{reserveNotice}</span></div></div><button className="button primary" onClick={()=>router.push('/tanque')}>Abrir Gestão do Tanque</button></section>}

    <section className="panel trace-head">
      <div><span>Etiqueta</span><strong>{sample.labelBase}</strong><small>{sample.cpLabels.join(' • ')}</small></div>
      <div><span>Obra / utilização</span><b>{sample.workName}</b><small>{sample.block?`Q${sample.block} `:''}{sample.lot?`L${sample.lot} • `:''}{sample.element||sample.location||'—'} • Moldagem {formatDate(sample.moldedAt)}{sample.moldedTime?` às ${sample.moldedTime}`:''}</small></div>
      <div><span>Ficha física</span><b>{sample.physicalFormNumber||sample.reportNumber||'Referência não informada'}</b><small>{sample.physicalLocation} • {sample.sheetState||'arquivo'}{sample.sheetCustodian?` • ${sample.sheetCustodian}`:''}</small></div>
    </section>

    <section className="panel sample-field-data">
      <div className="panel-header"><div><h2>Dados transcritos da ficha de moldagem</h2><p>A ficha física continua preservada nas evidências.</p></div></div>
      <div className="report-grid">
        <div><span>Concreteira</span><b>{sample.supplier||'—'}</b></div><div><span>NF</span><b>{sample.invoice||'—'}</b></div>
        <div><span>Betoneira</span><b>{sample.truckMixer||'—'}</b></div><div><span>Placa</span><b>{sample.vehiclePlate||'—'}</b></div>
        <div><span>Volume</span><b>{sample.volumeM3?`${sample.volumeM3} m³`:'—'}</b></div><div><span>Slump</span><b>{sample.slumpActualCm!==undefined?`${sample.slumpActualCm} cm`:'—'}</b></div>
        <div><span>Saída usina</span><b>{sample.plantDepartureTime||'—'}</b></div><div><span>Chegada obra</span><b>{sample.siteArrivalTime||'—'}</b></div>
        <div><span>Slump</span><b>{sample.slumpTestTime||'—'}</b></div><div><span>Descarga</span><b>{sample.dischargeStartTime||'—'}</b></div>
        <div><span>Moldagem</span><b>{sample.moldedTime||'—'}</b></div><div><span>Água adicionada</span><b>{sample.waterAddedLiters!==undefined?`${sample.waterAddedLiters} L`:'—'}</b></div>
      </div>
    </section>

    <section className="panel"><div className="timeline">{stages.map((stage,index)=><div key={index} className={stage.done?'done':''}><span>{stage.done?<CheckCircle2 size={16}/>:index+1}</span><b>{stage.label}</b><small>{stage.display||'Pendente'}</small></div>)}</div></section>

    <section className="panel"><div className="panel-header"><div><h2>Evidências iniciais</h2><p>Ficha, coleta e etiqueta preservadas junto ao registro.</p></div><FileImage/></div><div className="evidence-strip">{sample.photos.map(photo=><figure key={`${photo.key}-${photo.url}`}><img src={photo.url} alt={photo.name}/><figcaption>{photo.name}</figcaption></figure>)}{sample.photos.length===0&&<p>Registro histórico sem evidências digitais.</p>}</div></section>

    {specimens.length>0&&<section className="panel no-print"><div className="panel-header"><div><h2>Controle individual dos CPs</h2><p>Cada corpo de prova permanece vinculado à sua idade e situação física.</p></div><FlaskConical/></div><div className="table-wrap"><table><thead><tr><th>CP</th><th>Idade</th><th>Finalidade</th><th>Status</th><th>Armazenamento</th><th>Posição</th></tr></thead><tbody>{specimens.map(cp=>{const r=sample.ruptures.find(x=>x.id===cp.ruptureId);return <tr key={cp.id}><td><b>{cp.label}</b></td><td>{r?ruptureAgeLabel(r):`${cp.scheduledAgeDays} dias`}</td><td>{r?.purpose==='form_release'?'Liberação de forma':r?.purpose==='reserve'?'Reserva':'Controle'}</td><td><span className={`specimen-status ${cp.status}`}>{cp.status.replaceAll('_',' ')}</span></td><td>{cp.tankName||work?.tankName||'—'}</td><td>{cp.tankPosition||'—'}</td></tr>})}</tbody></table></div></section>}

    <section className="two-columns rupture-work no-print">
      <div className="panel">
        <div className="panel-header"><div><h2>Lançar ruptura</h2><p>Registre os dois CPs do par separadamente. O sistema preserva carga, dimensão e MPa de cada um.</p></div></div>
        <div className="rupture-tabs">{sample.ruptures.map(item=><button key={item.id} className={`${active===item.id?'active':''} ${item.status==='concluido'?'completed':''}`} onClick={()=>setActive(item.id)}>{ruptureAgeLabel(item)}<small>{ruptureScheduleLabel(item)} • {item.plannedCpCount||item.specimenIds?.length||''} CP</small></button>)}</div>

        {rupture?.purpose==='form_release'&&rupture.status!=='concluido'&&<div className="form-release-reschedule">
          <div><b>Concreto ainda sem condição de ruptura?</b><span>Reprograme os mesmos 2 CPs de liberação. Nenhum CP adicional é criado.</span></div>
          <div>{[19,24].map(h=><button key={h} className="button secondary small" onClick={()=>rescheduleEarly(h)}>Reprogramar para {h}h</button>)}</div>
        </div>}

        {rupture?.rescheduleHistory?.length?<div className="reschedule-history">{rupture.rescheduleHistory.map((h,i)=><span key={i}><b>{h.fromLabel} → {h.toLabel}</b> • {h.reason} • {new Date(h.changedAt).toLocaleString('pt-BR')}</span>)}</div>:null}

        {rupture?.status==='concluido'?<div className="success-box"><CheckCircle2/><b>Ruptura concluída</b><span>Média {rupture.resistanceMpa?.toFixed(2)} MPa • {rupture.measurements?.length||1} CP(s){selectedEquipment?` • ${selectedEquipment.name}`:''}</span></div>:rupture&&<>
          <div className="measurement-table">
            <div className="measurement-head"><span>CP</span><span>Carga</span><span>Unidade</span><span>Diâmetro</span><span>Altura</span><span>Resultado</span></div>
            {measurementRows.map(row=>{const input=measurementInputs[row.id]||emptyMeasurement();const calc=calcFor(row.id);return <div className="measurement-row" key={row.id}><b>{row.label}</b><input type="number" step="0.01" value={input.load} onChange={e=>updateMeasurement(row.id,{load:e.target.value})}/><select value={input.unit} onChange={e=>updateMeasurement(row.id,{unit:e.target.value as Unit})}><option>kN</option><option>tf</option><option>kgf</option><option>N</option></select><input type="number" value={input.diameter} onChange={e=>updateMeasurement(row.id,{diameter:e.target.value})}/><input type="number" value={input.height} onChange={e=>updateMeasurement(row.id,{height:e.target.value})}/><strong>{calc?`${calc.toFixed(2)} MPa`:'—'}</strong></div>})}
          </div>
          <div className="form-grid compact"><label className="span-2">Equipamento {equipment.length?'*':''}<select value={equipmentId} onChange={e=>setEquipmentId(e.target.value)}><option value="">{equipment.length?'Selecione...':'Nenhum equipamento cadastrado'}</option>{equipment.map(eq=><option key={eq.id} value={eq.id}>{eq.name} — Patr. {eq.assetNumber}</option>)}</select></label></div>
          <div className="result-preview"><span>Média preliminar do par</span><strong>{mean(measurementRows.map(row=>calcFor(row.id)).filter(v=>v>0))?.toFixed(2)||'—'} MPa</strong><small>Os resultados individuais permanecem registrados. A regra de comparação do projeto é configurada na obra.</small></div>
          <div className="photo-grid three"><PhotoCapture label="Foto do rompimento" value={files.rompimento} onChange={file=>setFiles({...files,rompimento:file})}/><PhotoCapture label="Foto da prensa" value={files.prensa} onChange={file=>setFiles({...files,prensa:file})}/><PhotoCapture label="Foto final dos CPs" value={files.cpFinal} onChange={file=>setFiles({...files,cpFinal:file})}/></div>
          <button className="button primary full" disabled={saving||!files.rompimento||!files.prensa||!files.cpFinal||(equipment.length>0&&!equipmentId)} onClick={finish}>{saving?'Salvando...':'Concluir ruptura do par'}</button>
        </>}
      </div>

      <div className="panel"><div className="panel-header"><div><h2>Histórico das rupturas</h2><p>Resultados individuais e média por idade.</p></div><Camera/></div><div className="history-list">{sample.ruptures.map(item=><div key={item.id}><div><b>{ruptureAgeLabel(item)}</b><span>{ruptureScheduleLabel(item)} • {item.purpose==='form_release'?'Liberação de forma':item.purpose==='reserve'?'Reserva':'Controle'}</span></div><div><span className={`status ${item.status}`}>{item.status.replace('_',' ')}</span>{item.resistanceMpa!==undefined&&<strong>{item.resistanceMpa.toFixed(2)} MPa</strong>}</div>{item.measurements?.length?<small className="history-measurements">{item.measurements.map(m=>`${m.specimenLabel||'CP'} ${m.resistanceMpa.toFixed(2)} MPa`).join(' • ')}</small>:null}</div>)}</div>
        <div className="approval-box"><h3>Fluxo de aprovação</h3><p>Resultado lançado → Conferência → Aprovação técnica → Relatório emitido.</p><div className="heading-actions">{sample.approvalStatus!=='approved'&&<button className="button secondary" onClick={()=>changeApproval('review')}><Send size={15}/>Enviar para conferência</button>}{sample.approvalStatus==='review'&&(isPilot||can('engineer'))&&<button className="button primary" onClick={()=>changeApproval('approved')}><BadgeCheck size={15}/>Aprovar relatório</button>}</div>{sample.approvalStatus==='approved'&&<div className="success-box"><BadgeCheck/><b>Aprovado</b><span>{sample.approvedBy} • {sample.approvedAt?new Date(sample.approvedAt).toLocaleString('pt-BR'):''}</span></div>}</div>
      </div>
    </section>

    <section className="panel no-print"><StrengthEvolutionChart samples={[sample]} work={work} title="Evolução da resistência da concretagem"/></section>

    <section className="report-sheet">
      <div className="report-brand"><img src="/logo-solocontrol.png" alt="Solocontrol"/><div><h2>Relatório Gerencial da Amostra</h2><span>Solocontrol Lab • {sample.approvalStatus==='approved'?'APROVADO':'NÃO APROVADO'}</span></div></div>
      <div className="report-grid"><div><span>Obra</span><b>{sample.workName}</b></div><div><span>Etiqueta</span><b>{sample.labelBase}</b></div><div><span>Processo</span><b>{sampleProcessLabel(sample)}</b></div><div><span>Local</span><b>{sample.block?`Q${sample.block} `:''}{sample.lot?`L${sample.lot} • `:''}{sample.location||'—'}</b></div><div><span>Moldagem</span><b>{formatDate(sample.moldedAt)}{sample.moldedTime?` ${sample.moldedTime}`:''}</b></div><div><span>Slump</span><b>{sample.slumpActualCm!==undefined?`${sample.slumpActualCm} cm`:'—'}</b></div><div><span>MPa de projeto</span><b>{technicalAnalysis?.targetMpa?`${technicalAnalysis.targetMpa} MPa`:'—'}</b></div><div><span>Ficha física</span><b>{sample.physicalFormNumber||'—'}</b></div></div>
      <table><thead><tr><th>Idade</th><th>Programado</th><th>CPs / resultados</th><th>Média</th><th>Equipamento</th><th>Status</th></tr></thead><tbody>{sample.ruptures.map(item=>{const eq=equipment.find(x=>x.id===item.equipmentId);return <tr key={item.id}><td>{ruptureAgeLabel(item)}</td><td>{ruptureScheduleLabel(item)}</td><td>{item.measurements?.length?item.measurements.map(m=>`${m.specimenLabel||'CP'}: ${m.resistanceMpa.toFixed(2)} MPa`).join(' | '):'—'}</td><td>{item.resistanceMpa!==undefined?`${item.resistanceMpa.toFixed(2)} MPa`:'—'}</td><td>{eq?`${eq.name} / ${eq.assetNumber}`:'—'}</td><td>{item.status}</td></tr>})}</tbody></table>
      <p className="report-note">Relatório gerencial do sistema. Critérios de aceitação, liberação de forma e descarte de reserva dependem do projeto, procedimento, normas e aprovação técnica aplicável.</p>
    </section>
  </div>
}
