'use client';

import { Camera, Check, Copy, Plus, ScanLine, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoCapture from '@/components/PhotoCapture';
import { useWorkScope } from '@/components/WorkScope';
import { saveSample, uploadEvidence } from '@/lib/store';
import {
  ConcreteProcessType,
  PhotoEvidence,
  RuptureAgeSpec,
  RupturePlanItem,
  Sample,
} from '@/lib/types';
import { applySpecimenStatuses, buildSpecimens } from '@/lib/technical-analysis';
import {
  checkSlump,
  isVillaAraucoWork,
  processTypeLabel,
  profilePlanSummary,
  resolveProcessProfile,
} from '@/lib/process-profiles';
import {
  ageSpecKey, ageSpecLabel, ageSpecToDays, isoToday, makeId, normalizeLabel,
  physicalLocationByDate, scheduleFromAge, parseAgeSpecToken
} from '@/lib/utils';

const initial = {
  workId:'', reportNumber:'', physicalFormNumber:'', receivedAt:isoToday(), collectedAt:isoToday(), collectedTime:'', moldedAt:isoToday(), moldedTime:'',
  supplier:'', invoice:'', volumeM3:'', aggregate:'', slumpCm:'',
  specifiedStrengthMpa:'',
  sampleType:'Concreto' as const, processType:'OUTRO' as ConcreteProcessType, element:'', block:'', lot:'', location:'',
  cpQuantity:6, labelBase:'', fieldTechnician:'', notes:'',
  truckMixer:'', vehiclePlate:'', placementMethod:'', plantDepartureTime:'', siteArrivalTime:'',
  slumpTestTime:'', dischargeStartTime:'', waterAddedLiters:'',
};

const AGE_PRESETS:RuptureAgeSpec[] = [
  {value:12,unit:'hours'},{value:19,unit:'hours'},{value:24,unit:'hours'},
  {value:48,unit:'hours'},{value:72,unit:'hours'},
  {value:3,unit:'days'},{value:7,unit:'days'},{value:14,unit:'days'},
  {value:28,unit:'days'},{value:56,unit:'days'},{value:63,unit:'days'},{value:90,unit:'days'},
];

function normalizeSpecs(specs:RuptureAgeSpec[]){
  const map=new Map<string,RuptureAgeSpec>();
  specs.forEach(spec=>map.set(ageSpecKey(spec),spec));
  return Array.from(map.values()).sort((a,b)=>ageSpecToDays(a)-ageSpecToDays(b));
}

function genericPlan(specs:RuptureAgeSpec[],cpTotal:number,reserveDays?:number,controlDays?:number):RupturePlanItem[]{
  const ordered=normalizeSpecs(specs);
  if(!ordered.length)return[];
  const base=Math.floor(cpTotal/ordered.length);
  let remainder=cpTotal%ordered.length;
  return ordered.map(spec=>{
    const cpCount=base+(remainder-- >0?1:0);
    const days=ageSpecToDays(spec);
    const purpose=
      reserveDays&&Math.abs(days-reserveDays)<0.001?'reserve':
      controlDays&&Math.abs(days-controlDays)<0.001?'control':'other';
    return {...spec,cpCount:Math.max(1,cpCount),purpose};
  });
}

export default function QuickEntryPage() {
  const router=useRouter();
  const {works,selectedWorkId}=useWorkScope();
  const [step,setStep]=useState(1);
  const [form,setForm]=useState(initial);
  const [ageSpecs,setAgeSpecs]=useState<RuptureAgeSpec[]>([{value:7,unit:'days'},{value:14,unit:'days'},{value:28,unit:'days'}]);
  const [customAge,setCustomAge]=useState('');
  const [exceptionMode,setExceptionMode]=useState(false);
  const [files,setFiles]=useState<Record<string,File|undefined>>({});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const work=works.find(w=>w.id===form.workId);
  const villa=isVillaAraucoWork(work);
  const profile=resolveProcessProfile(work,form.processType);
  const configuredProjectMpa=profile?.projectStrengthMpa||work?.defaultStrengthMpa;

  useEffect(()=>{
    if(selectedWorkId!=='all'&&!form.workId){
      const w=works.find(x=>x.id===selectedWorkId);
      if(w)applyWork(w.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedWorkId,works]);

  function applyWork(wid:string){
    const w=works.find(x=>x.id===wid);
    const defaults=w?.defaultRuptureAges?.length
      ? w.defaultRuptureAges
      : (w?.defaultAges||[7,14,28]).map(value=>({value,unit:'days' as const}));
    setAgeSpecs(normalizeSpecs(defaults));
    setExceptionMode(false);
    setForm(current=>({
      ...current,
      workId:wid,
      location:current.location||w?.name||'',
      processType:isVillaAraucoWork(w)?'RADIER':'OUTRO',
      element:isVillaAraucoWork(w)?'Radier':current.element,
      cpQuantity:isVillaAraucoWork(w)?6:current.cpQuantity,
      specifiedStrengthMpa:w?.defaultStrengthMpa?String(w.defaultStrengthMpa):current.specifiedStrengthMpa,
    }));
  }

  function applyProcessType(type:ConcreteProcessType){
    const selectedProfile=resolveProcessProfile(work,type);
    setExceptionMode(false);
    setForm(current=>({
      ...current,
      processType:type,
      element:type==='OUTRO'?current.element:processTypeLabel(type),
      cpQuantity:selectedProfile?.cpTotal||current.cpQuantity,
      specifiedStrengthMpa:selectedProfile?.projectStrengthMpa
        ? String(selectedProfile.projectStrengthMpa)
        : work?.defaultStrengthMpa?String(work.defaultStrengthMpa):current.specifiedStrengthMpa,
    }));
  }

  const activePlan=useMemo<RupturePlanItem[]>(()=>{
    if(profile&&!exceptionMode)return profile.rupturePlan;
    return genericPlan(ageSpecs,Number(form.cpQuantity)||0,work?.reserveAgeDays,work?.controlAgeDays);
  },[profile,exceptionMode,ageSpecs,form.cpQuantity,work?.reserveAgeDays,work?.controlAgeDays]);

  const hasHourlyAge=activePlan.some(item=>item.unit==='hours');
  const dueDates=useMemo(()=>activePlan.map(item=>{
    const schedule=scheduleFromAge(form.moldedAt,form.moldedTime||undefined,item);
    return {item,...schedule};
  }),[activePlan,form.moldedAt,form.moldedTime]);

  const slumpValue=Number(String(form.slumpCm).replace(',','.'));
  const slumpResult=checkSlump(profile,Number.isFinite(slumpValue)&&String(form.slumpCm).trim()?slumpValue:undefined);
  const expectedCp=activePlan.reduce((sum,item)=>sum+item.cpCount,0);

  const input=(key:string)=>(e:any)=>setForm({...form,[key]:e.target.type==='number'?Number(e.target.value):e.target.value});
  const requiredPhotos=['ficha','coleta','etiqueta'];
  const canAdvance1=Boolean(
    form.workId&&form.collectedAt&&form.moldedAt&&form.labelBase&&form.cpQuantity>0&&
    (!villa||form.processType!=='OUTRO')&&
    (!hasHourlyAge||form.moldedTime)
  );
  const canAdvance2=activePlan.length>0&&expectedCp===Number(form.cpQuantity);
  const canAdvance3=requiredPhotos.every(k=>files[k]);

  function changeCollectionDate(value:string){
    setForm(current=>({
      ...current,
      collectedAt:value,
      moldedAt:(!current.moldedAt || current.moldedAt===current.collectedAt) ? value : current.moldedAt,
    }));
  }

  function duplicatePrevious(){
    const raw=localStorage.getItem('solocontrol.lastQuickEntry');if(!raw)return;
    try{
      const prev=JSON.parse(raw);
      setForm({...form,...prev,receivedAt:isoToday(),collectedAt:isoToday(),collectedTime:'',moldedAt:isoToday(),moldedTime:'',labelBase:'',reportNumber:'',physicalFormNumber:''});
    }catch{}
  }

  function toggleAge(spec:RuptureAgeSpec){
    const key=ageSpecKey(spec);
    setAgeSpecs(current=>current.some(x=>ageSpecKey(x)===key)
      ? current.filter(x=>ageSpecKey(x)!==key)
      : normalizeSpecs([...current,spec]));
  }

  function addCustomAge(){
    const parsed=parseAgeSpecToken(customAge);
    if(!parsed){setError('Digite a idade como 12h, 19h, 24h, 7d, 28d, 63d etc.');return}
    setError('');
    setAgeSpecs(current=>normalizeSpecs([...current,parsed]));
    setCustomAge('');
  }

  async function submit(){
    setError('');
    if(hasHourlyAge&&!form.moldedTime){setError('Informe o horário da moldagem para programar corretamente o ensaio de baixa idade.');return}
    if(expectedCp!==Number(form.cpQuantity)){setError(`O plano possui ${expectedCp} CPs, mas a ficha informa ${form.cpQuantity}. Ajuste antes de salvar.`);return}
    if(!canAdvance3){setError('As três imagens iniciais são obrigatórias.');return}
    setSaving(true);
    try{
      const id=makeId('sample');
      const photoDefs:[string,string][]=[['ficha','Foto da ficha física'],['coleta','Foto da coleta / amostra'],['etiqueta','Foto da etiqueta']];
      const photos:PhotoEvidence[]=[];
      for(const [key,label] of photoDefs){
        const file=files[key];if(!file)continue;
        const url=await uploadEvidence(file,`samples/${id}/entrada`);
        photos.push({key:key as any,url,name:label,createdAt:new Date().toISOString()});
      }

      const base=normalizeLabel(form.labelBase);
      const cpLabels=Array.from({length:Number(form.cpQuantity)},(_,i)=>`${base}-${i+1}`);
      const firstDue=dueDates[0]?.dueDate||form.moldedAt;

      let ruptures=dueDates.map(({item,dueDate,dueAt})=>({
        id:makeId('rup'),
        ageDays:ageSpecToDays(item),
        ageValue:item.value,
        ageUnit:item.unit,
        ageLabel:ageSpecLabel(item),
        dueDate,
        dueAt,
        purpose:item.purpose,
        plannedCpCount:item.cpCount,
        status:'pendente' as const,
        photos:[],
      }));

      const specimens=buildSpecimens(cpLabels,ruptures,work);
      ruptures=ruptures.map(r=>({...r,specimenIds:specimens.filter(cp=>cp.ruptureId===r.id).map(cp=>cp.id)}));

      const slumpCm=Number.isFinite(slumpValue)&&String(form.slumpCm).trim()?slumpValue:undefined;
      let sample:Sample={
        id,
        workId:form.workId,
        workName:work?.name||'Obra',
        reportNumber:form.reportNumber||undefined,
        physicalFormNumber:form.physicalFormNumber||undefined,
        receivedAt:form.receivedAt,
        collectedAt:form.collectedAt,
        collectedTime:form.collectedTime||undefined,
        moldedAt:form.moldedAt,
        moldedTime:form.moldedTime||undefined,
        supplier:form.supplier||undefined,
        invoice:form.invoice||undefined,
        volumeM3:form.volumeM3||undefined,
        aggregate:form.aggregate||undefined,
        slumpMm:slumpCm!==undefined?String(slumpCm*10):undefined,
        slumpActualCm:slumpCm,
        slumpConformity:slumpResult.status,
        specifiedStrengthMpa:Number(String(form.specifiedStrengthMpa).replace(',','.'))||configuredProjectMpa||undefined,
        sampleType:form.sampleType,
        processType:form.processType,
        element:form.processType==='OUTRO'?form.element:processTypeLabel(form.processType),
        block:form.block||undefined,
        lot:form.lot||undefined,
        location:form.location||undefined,
        truckMixer:form.truckMixer||undefined,
        vehiclePlate:form.vehiclePlate||undefined,
        placementMethod:form.placementMethod||undefined,
        plantDepartureTime:form.plantDepartureTime||undefined,
        siteArrivalTime:form.siteArrivalTime||undefined,
        slumpTestTime:form.slumpTestTime||undefined,
        dischargeStartTime:form.dischargeStartTime||undefined,
        waterAddedLiters:Number(String(form.waterAddedLiters).replace(',','.'))||undefined,
        cpQuantity:Number(form.cpQuantity),
        labelBase:base,
        cpLabels,
        specimens,
        fieldTechnician:form.fieldTechnician||undefined,
        notes:form.notes||undefined,
        physicalLocation:physicalLocationByDate(firstDue),
        sheetState:'arquivo',
        approvalStatus:'draft',
        status:'em_andamento',
        photos,
        ruptures,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };

      sample=applySpecimenStatuses(sample,work);
      await saveSample(sample,`Ficha cadastrada — ${processTypeLabel(form.processType)} — ${form.cpQuantity} CPs`);
      localStorage.setItem('solocontrol.lastQuickEntry',JSON.stringify({...form,labelBase:'',reportNumber:'',physicalFormNumber:''}));
      router.push(`/amostras/${id}`);
    }catch(e:any){
      setError(e?.message||'Não foi possível salvar.');
    }finally{setSaving(false)}
  }

  return <div className="page-stack narrow-page">
    <section className="page-heading">
      <div><span className="eyebrow">TRANSCRIÇÃO DA FICHA DE MOLDAGEM</span><h1>Lançamento da concretagem</h1><p>O sistema reproduz o fluxo da ficha física, monta automaticamente o plano de CPs e mantém a rastreabilidade digital.</p></div>
    </section>

    <section className="panel wizard-panel">
      <div className="stepper">
        {['Ficha e concretagem','Plano de ensaios','Evidências','Confirmar'].map((s,i)=>
          <div key={s} className={`step ${step===i+1?'current':''} ${step>i+1?'done':''}`}>
            <span>{step>i+1?<Check size={16}/>:i+1}</span><b>{s}</b>
          </div>
        )}
      </div>

      <div className="smart-strip">
        <button onClick={()=>document.getElementById('labelBase')?.focus()}><ScanLine size={16}/>Etiqueta</button>
        <button onClick={duplicatePrevious}><Copy size={16}/>Duplicar dados da última ficha</button>
        <button onClick={()=>setForm({...form,receivedAt:isoToday(),collectedAt:isoToday(),moldedAt:isoToday()})}><WandSparkles size={16}/>Datas de hoje</button>
      </div>

      {step===1&&<>
        <div className="launch-process-header">
          <div><span>PROCESSO CONSTRUTIVO</span><h3>{villa?'Villa Arauco — plano automático':'Configuração da amostra'}</h3></div>
          {villa&&<div className="process-type-grid">
            {(['RADIER','PAREDES','LAJE','OITAO_PLATIBANDA'] as ConcreteProcessType[]).map(type=><button key={type} type="button" className={form.processType===type?'active':''} onClick={()=>applyProcessType(type)}>{processTypeLabel(type)}</button>)}
          </div>}
        </div>

        {profile&&<div className="process-profile-strip">
          <div><span>Plano de CPs</span><b>{profile.cpTotal} CPs</b><small>{profilePlanSummary(profile)}</small></div>
          <div><span>Slump operacional informado</span><b>{profile.slumpTargetCm} ± {profile.slumpToleranceCm} cm</b><small>{(profile.slumpTargetCm!*10).toFixed(0)} ± {(profile.slumpToleranceCm!*10).toFixed(0)} mm</small></div>
          <div><span>MPa de projeto</span><b>{configuredProjectMpa?`${configuredProjectMpa} MPa`:'Configurar na obra'}</b><small>Referência gerencial para controle</small></div>
        </div>}

        <div className="form-section-caption">Identificação da ficha física</div>
        <div className="form-grid">
          <label>Obra *<select value={form.workId} onChange={e=>applyWork(e.target.value)}><option value="">Selecione</option>{works.map(w=><option key={w.id} value={w.id}>{w.number} — {w.name}</option>)}</select></label>
          <label>Nº / referência da ficha<input value={form.physicalFormNumber} onChange={input('physicalFormNumber')} placeholder="Conforme ficha física"/></label>
          <label>Nº do relatório<input value={form.reportNumber} onChange={input('reportNumber')} placeholder="Quando aplicável"/></label>
          <label>Data de recebimento<input type="date" value={form.receivedAt} onChange={input('receivedAt')}/></label>

          <label>Data da coleta / amostragem *<input type="date" value={form.collectedAt} onChange={e=>changeCollectionDate(e.target.value)}/><small>Use a data real da coleta, mesmo quando a ficha for lançada dias depois.</small></label>
          <label>Horário da coleta<input type="time" value={form.collectedTime} onChange={input('collectedTime')}/></label>
          <label>Concreteira / fornecedor<input value={form.supplier} onChange={input('supplier')} placeholder="Ex.: COPLAN / concreteira"/></label>
          <label>Nota fiscal<input value={form.invoice} onChange={input('invoice')} placeholder="NF"/></label>
          <label>Betoneira / caminhão<input value={form.truckMixer} onChange={input('truckMixer')} placeholder="Nº da betoneira"/></label>
          <label>Placa<input value={form.vehiclePlate} onChange={input('vehiclePlate')} placeholder="Opcional"/></label>

          <label>Volume (m³)<input value={form.volumeM3} onChange={input('volumeM3')} placeholder="Ex.: 7,10"/></label>
          <label>Brita<input value={form.aggregate} onChange={input('aggregate')} placeholder="Ex.: 0"/></label>
          <label>Slump medido (cm)<input inputMode="decimal" value={form.slumpCm} onChange={e=>setForm({...form,slumpCm:e.target.value})} placeholder={profile?`Esperado ${profile.slumpTargetCm} ± ${profile.slumpToleranceCm}`:'Ex.: 8'}/>{form.slumpCm&&<small className={`slump-inline ${slumpResult.status}`}>{slumpResult.message}</small>}</label>
          <label>MPa exigido em projeto<input inputMode="decimal" value={form.specifiedStrengthMpa} onChange={e=>setForm({...form,specifiedStrengthMpa:e.target.value})} placeholder={configuredProjectMpa?`Padrão ${configuredProjectMpa} MPa`:'Cadastrar conforme projeto'}/></label>

          {!villa&&<label>Peça concretada<input value={form.element} onChange={input('element')} placeholder="Radier, parede, laje..."/></label>}
          <label>Quadra<input value={form.block} onChange={input('block')} placeholder="Ex.: 25"/></label>
          <label>Lote<input value={form.lot} onChange={input('lot')} placeholder="Ex.: 07"/></label>
          <label>Local / trecho<input value={form.location} onChange={input('location')} placeholder="Local de utilização"/></label>

          <label>Método de lançamento<input value={form.placementMethod} onChange={input('placementMethod')} placeholder="Bomba, calha..."/></label>
          <label>Saída da usina<input type="time" value={form.plantDepartureTime} onChange={input('plantDepartureTime')}/></label>
          <label>Chegada na obra<input type="time" value={form.siteArrivalTime} onChange={input('siteArrivalTime')}/></label>
          <label>Horário do slump<input type="time" value={form.slumpTestTime} onChange={input('slumpTestTime')}/></label>

          <label>Início da descarga<input type="time" value={form.dischargeStartTime} onChange={input('dischargeStartTime')}/></label>
          <label>Data da moldagem *<input type="date" value={form.moldedAt} onChange={input('moldedAt')}/></label>
          <label>Horário da moldagem {hasHourlyAge?'*':''}<input type="time" value={form.moldedTime} onChange={input('moldedTime')}/><small>{hasHourlyAge?'Obrigatório para calcular 12/19/24 horas.':'Recomendado.'}</small></label>
          <label>Água adicionada (L)<input inputMode="decimal" value={form.waterAddedLiters} onChange={e=>setForm({...form,waterAddedLiters:e.target.value})} placeholder="Se houver"/></label>

          <label>Quantidade de CPs *<input type="number" min={1} max={30} value={form.cpQuantity} readOnly={Boolean(profile&&!exceptionMode)} onChange={input('cpQuantity')}/><small>{profile&&!exceptionMode?'Definida pelo plano da Villa Arauco.':'Quantidade total moldada.'}</small></label>
          <label>Etiqueta base *<input id="labelBase" value={form.labelBase} onChange={input('labelBase')} placeholder="Ex.: 010251-26"/></label>
          <label>Laboratorista<input value={form.fieldTechnician} onChange={input('fieldTechnician')} placeholder="Responsável pela coleta/moldagem"/></label>
          <label className="span-2">Observações<textarea value={form.notes} onChange={input('notes')} placeholder="Condições, ocorrências ou observações da ficha"/></label>
        </div>
        {profile&&<div className="exception-toggle"><label><input type="checkbox" checked={exceptionMode} onChange={e=>{setExceptionMode(e.target.checked);if(!e.target.checked)setForm({...form,cpQuantity:profile.cpTotal})}}/>Amostragem excepcional — permitir alterar quantidade/idades</label><span>Use apenas quando a ficha física tiver um plano diferente do padrão configurado.</span></div>}
      </>}

      {step===2&&<div className="age-layout">
        <div>
          <h3>Plano de corpos de prova</h3>
          {profile&&!exceptionMode?<>
            <p>Plano carregado automaticamente conforme o elemento selecionado.</p>
            <div className="cp-plan-list">{activePlan.map(item=><div key={`${item.value}-${item.unit}`}><strong>{item.cpCount} CP</strong><span>{ageSpecLabel(item)}</span><small>{item.purpose==='form_release'?'Liberação de forma':item.purpose==='reserve'?'Reserva':'Controle'}</small>{item.allowRescheduleToHours?.length?<em>Se necessário, pode ser reprogramado para {item.allowRescheduleToHours.join('h ou ')}h sem criar novos CPs.</em>:null}</div>)}</div>
          </>:<>
            <p>Selecione as idades. O sistema distribui os CPs entre as idades selecionadas.</p>
            <div className="age-pills">{AGE_PRESETS.map(spec=>{const key=ageSpecKey(spec);return <label key={key} className={ageSpecs.some(x=>ageSpecKey(x)===key)?'selected':''}><input type="checkbox" checked={ageSpecs.some(x=>ageSpecKey(x)===key)} onChange={()=>toggleAge(spec)}/>{ageSpecLabel(spec)}</label>})}</div>
            <div className="custom-age-row"><input value={customAge} onChange={e=>setCustomAge(e.target.value)} placeholder="Outra idade: ex. 36h ou 21d" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCustomAge()}}}/><button className="button secondary" type="button" onClick={addCustomAge}><Plus size={15}/>Adicionar</button></div>
          </>}
          <div className="selected-age-list"><b>Total programado:</b> {expectedCp} CPs • <b>Ficha:</b> {form.cpQuantity} CPs</div>
          {expectedCp!==Number(form.cpQuantity)&&<div className="hour-warning">A soma do plano precisa ser igual à quantidade de CPs da ficha.</div>}
        </div>
        <div className="due-preview">
          <h3>Agenda automática</h3>
          {dueDates.map(({item,dueAt,dueDate})=><div key={`${item.value}-${item.unit}`}><b>{item.cpCount} CP • {ageSpecLabel(item)}</b><span>{dueAt?new Date(dueAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</span></div>)}
          {hasHourlyAge&&!form.moldedTime&&<div className="hour-warning">Informe o horário da moldagem para calcular o ensaio de baixa idade.</div>}
        </div>
      </div>}

      {step===3&&<div>
        <div className="mandatory-note"><Camera/><div><b>Evidências obrigatórias</b><span>A ficha física continua sendo o documento de campo. O sistema guarda sua imagem junto com a coleta e a etiqueta para auditoria e rastreabilidade.</span></div></div>
        <div className="photo-grid">
          <PhotoCapture label="Foto da ficha física" value={files.ficha} onChange={f=>setFiles({...files,ficha:f})}/>
          <PhotoCapture label="Foto da coleta / amostra" value={files.coleta} onChange={f=>setFiles({...files,coleta:f})}/>
          <PhotoCapture label="Foto da etiqueta" value={files.etiqueta} onChange={f=>setFiles({...files,etiqueta:f})}/>
        </div>
      </div>}

      {step===4&&<div className="confirm-grid">
        <div>
          <h3>Conferência antes de salvar</h3>
          <dl>
            <dt>Obra</dt><dd>{work?.name}</dd>
            <dt>Processo</dt><dd>{processTypeLabel(form.processType)}</dd>
            <dt>Quadra / Lote</dt><dd>{form.block||form.lot?`Q${form.block||'—'} / L${form.lot||'—'}`:'—'}</dd>
            <dt>Etiqueta</dt><dd>{normalizeLabel(form.labelBase)}</dd>
            <dt>Coleta</dt><dd>{form.collectedAt}{form.collectedTime?` às ${form.collectedTime}`:''}</dd>
            <dt>Moldagem</dt><dd>{form.moldedAt}{form.moldedTime?` às ${form.moldedTime}`:''}</dd>
            <dt>Slump</dt><dd>{form.slumpCm?`${form.slumpCm} cm — ${slumpResult.message}`:'Não informado'}</dd>
            <dt>MPa de projeto</dt><dd>{form.specifiedStrengthMpa||configuredProjectMpa?`${form.specifiedStrengthMpa||configuredProjectMpa} MPa`:'Não configurado'}</dd>
            <dt>CPs</dt><dd>{form.cpQuantity}</dd>
            <dt>Plano</dt><dd>{activePlan.map(item=>`${item.cpCount}× ${ageSpecLabel(item)}`).join(' / ')}</dd>
            <dt>Próxima pasta física</dt><dd>{dueDates[0]?physicalLocationByDate(dueDates[0].dueDate):'—'}</dd>
          </dl>
        </div>
        <div className="success-box"><Check size={28}/><b>Ficha pronta para digitalização</b><span>Ao salvar, o sistema cria os CPs individualmente, monta a agenda e passa a acompanhar cada idade e cada evidência.</span></div>
      </div>}

      {error&&<div className="error-box">{error}</div>}
      <div className="wizard-actions">
        <button className="button ghost" disabled={step===1} onClick={()=>setStep(step-1)}>Voltar</button>
        {step<4
          ?<button className="button primary" disabled={(step===1&&!canAdvance1)||(step===2&&!canAdvance2)||(step===3&&!canAdvance3)} onClick={()=>setStep(step+1)}>Próximo</button>
          :<button className="button primary" disabled={saving} onClick={submit}>{saving?'Salvando...':'Salvar ficha'}</button>}
      </div>
    </section>
  </div>
}
