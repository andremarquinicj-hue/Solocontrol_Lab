'use client';

import { Camera, Check, Copy, ScanLine, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoCapture from '@/components/PhotoCapture';
import { useWorkScope } from '@/components/WorkScope';
import { saveSample, uploadEvidence } from '@/lib/store';
import { PhotoEvidence, Sample } from '@/lib/types';
import { addDays, isoToday, makeId, normalizeLabel, physicalLocationByDate } from '@/lib/utils';

const initial = { workId:'', reportNumber:'', receivedAt:isoToday(), moldedAt:isoToday(), supplier:'', invoice:'', volumeM3:'', aggregate:'', slumpMm:'', sampleType:'Concreto' as const, element:'', block:'', lot:'', location:'', cpQuantity:6, labelBase:'', fieldTechnician:'', notes:'' };

export default function QuickEntryPage() {
  const router = useRouter();
  const { works, selectedWorkId } = useWorkScope();
  const [step,setStep]=useState(1); const [form,setForm]=useState(initial); const [ages,setAges]=useState<number[]>([7,14,28]); const [files,setFiles]=useState<Record<string,File|undefined>>({}); const [saving,setSaving]=useState(false); const [error,setError]=useState('');

  useEffect(()=>{
    if(selectedWorkId!=='all' && !form.workId){
      const w=works.find(x=>x.id===selectedWorkId);
      if(w){setForm(current=>({...current,workId:w.id,location:current.location||w.name}));if(w.defaultAges?.length)setAges(w.defaultAges)}
    }
  },[selectedWorkId,works,form.workId]);

  const work=works.find(w=>w.id===form.workId);
  const dueDates=useMemo(()=>[...ages].sort((a,b)=>a-b).map(age=>({age,date:addDays(form.moldedAt,age)})),[ages,form.moldedAt]);
  const input=(key:string)=>(e:any)=>setForm({...form,[key]:e.target.type==='number'?Number(e.target.value):e.target.value});
  const requiredPhotos=['ficha','coleta','etiqueta'];
  const canAdvance1=Boolean(form.workId && form.moldedAt && form.labelBase && form.cpQuantity>0);
  const canAdvance2=ages.length>0;
  const canAdvance3=requiredPhotos.every(k=>files[k]);

  function duplicatePrevious(){
    const raw=localStorage.getItem('solocontrol.lastQuickEntry'); if(!raw)return;
    try{ const prev=JSON.parse(raw); setForm({...form,...prev,receivedAt:isoToday(),moldedAt:isoToday(),labelBase:''}); }catch{}
  }
  function applyWork(wid:string){ const w=works.find(x=>x.id===wid); setForm({...form,workId:wid,location:w?.name||form.location}); if(w?.defaultAges?.length) setAges(w.defaultAges); }
  async function submit(){
    setError(''); if(!canAdvance3){setError('As três imagens iniciais são obrigatórias.');return;} setSaving(true);
    try{
      const id=makeId('sample'); const photoDefs:[string,string][]=[['ficha','Foto da ficha'],['coleta','Foto da coleta'],['etiqueta','Foto da etiqueta']];
      const photos:PhotoEvidence[]=[];
      for(const [key,label] of photoDefs){ const file=files[key]; if(!file) continue; const url=await uploadEvidence(file,`samples/${id}/entrada`); photos.push({key:key as any,url,name:label,createdAt:new Date().toISOString()}); }
      const base=normalizeLabel(form.labelBase); const cpLabels=Array.from({length:form.cpQuantity},(_,i)=>`${base}-${i+1}`);
      const firstDue=dueDates[0]?.date || form.moldedAt;
      const sample:Sample={ id, workId:form.workId, workName:work?.name||'Obra', reportNumber:form.reportNumber, receivedAt:form.receivedAt, moldedAt:form.moldedAt, supplier:form.supplier, invoice:form.invoice, volumeM3:form.volumeM3, aggregate:form.aggregate, slumpMm:form.slumpMm, sampleType:form.sampleType, element:form.element, block:form.block||undefined, lot:form.lot||undefined, location:form.location, cpQuantity:form.cpQuantity, labelBase:base, cpLabels, fieldTechnician:form.fieldTechnician, notes:form.notes, physicalLocation:physicalLocationByDate(firstDue), status:'em_andamento', photos, ruptures:dueDates.map(({age,date})=>({id:makeId('rup'),ageDays:age,dueDate:date,status:'pendente',photos:[]})), createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };
      await saveSample(sample); localStorage.setItem('solocontrol.lastQuickEntry',JSON.stringify({...form,labelBase:''})); router.push(`/amostras/${id}`);
    } catch(e:any){setError(e?.message||'Não foi possível salvar.');} finally{setSaving(false);}
  }

  return <div className="page-stack narrow-page">
    <section className="page-heading"><div><span className="eyebrow">CADASTRO RÁPIDO</span><h1>Lançamento da ficha</h1><p>Preencha só o necessário. O sistema calcula datas, cria os CPs e organiza o próximo vencimento.</p></div></section>
    <section className="panel wizard-panel">
      <div className="stepper">{['Dados principais','Idades de ruptura','Imagens obrigatórias','Confirmar'].map((s,i)=><div key={s} className={`step ${step===i+1?'current':''} ${step>i+1?'done':''}`}><span>{step>i+1?<Check size={16}/>:i+1}</span><b>{s}</b></div>)}</div>
      <div className="smart-strip"><button onClick={()=>document.getElementById('labelBase')?.focus()}><ScanLine size={16}/> Ler/digitar etiqueta</button><button onClick={duplicatePrevious}><Copy size={16}/> Duplicar último</button><button onClick={()=>setForm({...form,receivedAt:isoToday(),moldedAt:isoToday()})}><WandSparkles size={16}/> Datas de hoje</button></div>

      {step===1 && <div className="form-grid">
        <label>Obra *<select value={form.workId} onChange={e=>applyWork(e.target.value)}><option value="">Selecione</option>{works.map(w=><option key={w.id} value={w.id}>{w.number} — {w.name}</option>)}</select></label>
        <label>Relatório Nº<input value={form.reportNumber} onChange={input('reportNumber')} placeholder="Ex.: 01"/></label>
        <label>Recebimento *<input type="date" value={form.receivedAt} onChange={input('receivedAt')}/></label>
        <label>Fornecedor<input value={form.supplier} onChange={input('supplier')} placeholder="Ex.: Concremix"/></label>
        <label>Nota fiscal<input value={form.invoice} onChange={input('invoice')} placeholder="Ex.: 6300"/></label>
        <label>Volume (m³)<input value={form.volumeM3} onChange={input('volumeM3')} placeholder="Ex.: 7,10"/></label>
        <label>Brita<input value={form.aggregate} onChange={input('aggregate')} placeholder="Ex.: 0"/></label>
        <label>Slump / abatimento (mm)<input value={form.slumpMm} onChange={input('slumpMm')} placeholder="Ex.: 160"/></label>
        <label>Tipo da amostra<select value={form.sampleType} onChange={input('sampleType')}><option>Concreto</option><option>Argamassa</option><option>Graute</option><option>Outro</option></select></label>
        <label>Peça concretada<input value={form.element} onChange={input('element')} placeholder="Radier, parede, laje, oitão..."/></label>
        <label>Quadra<input value={form.block} onChange={input('block')} placeholder="Ex.: 25"/></label>
        <label>Lote<input value={form.lot} onChange={input('lot')} placeholder="Ex.: 07"/></label>
        <label className="span-2">Local concretado<input value={form.location} onChange={input('location')} placeholder="Trecho / eixo / pavimento"/></label>
        <label>Data da moldagem *<input type="date" value={form.moldedAt} onChange={input('moldedAt')}/></label>
        <label>Quantidade de CPs *<input type="number" min={1} max={30} value={form.cpQuantity} onChange={input('cpQuantity')}/></label>
        <label>Etiqueta base *<input id="labelBase" value={form.labelBase} onChange={input('labelBase')} placeholder="Ex.: 010251-26"/></label>
        <label>Laboratorista / campo<input value={form.fieldTechnician} onChange={input('fieldTechnician')} placeholder="Nome"/></label>
        <label className="span-2">Observações<textarea value={form.notes} onChange={input('notes')} placeholder="Somente quando necessário"/></label>
      </div>}

      {step===2 && <div className="age-layout"><div><h3>Idades de ruptura</h3><p>O padrão da obra já vem marcado. Você pode alterar para esta ficha.</p><div className="age-pills">{[3,7,14,28,56,63,90].map(a=><label key={a} className={ages.includes(a)?'selected':''}><input type="checkbox" checked={ages.includes(a)} onChange={()=>setAges(ages.includes(a)?ages.filter(x=>x!==a):[...ages,a])}/>{a} dias</label>)}</div></div><div className="due-preview"><h3>Agenda criada automaticamente</h3>{dueDates.map(x=><div key={x.age}><b>{x.age} dias</b><span>{new Date(x.date+'T12:00:00').toLocaleDateString('pt-BR')}</span></div>)}</div></div>}

      {step===3 && <div><div className="mandatory-note"><Camera/><div><b>Fotos obrigatórias na entrada</b><span>Sem as três evidências o sistema não permite concluir o cadastro.</span></div></div><div className="photo-grid"><PhotoCapture label="Foto da ficha" value={files.ficha} onChange={f=>setFiles({...files,ficha:f})}/><PhotoCapture label="Foto da coleta / amostra" value={files.coleta} onChange={f=>setFiles({...files,coleta:f})}/><PhotoCapture label="Foto da etiqueta" value={files.etiqueta} onChange={f=>setFiles({...files,etiqueta:f})}/></div></div>}

      {step===4 && <div className="confirm-grid"><div><h3>Resumo</h3><dl><dt>Obra</dt><dd>{work?.name}</dd><dt>Etiqueta</dt><dd>{normalizeLabel(form.labelBase)}</dd><dt>Quadra / Lote</dt><dd>{form.block||form.lot?`Q${form.block||'—'} / L${form.lot||'—'}`:'—'}</dd><dt>CPs</dt><dd>{form.cpQuantity}</dd><dt>Rupturas</dt><dd>{[...ages].sort((a,b)=>a-b).join(' / ')} dias</dd><dt>Próxima localização física</dt><dd>{dueDates[0] ? physicalLocationByDate(dueDates[0].date) : '—'}</dd></dl></div><div className="success-box"><Check size={28}/><b>Cadastro pronto</b><span>Ao salvar, o dashboard da obra já passa a considerar este lançamento.</span></div></div>}

      {error && <div className="error-box">{error}</div>}
      <div className="wizard-actions"><button className="button ghost" disabled={step===1} onClick={()=>setStep(step-1)}>Voltar</button>{step<4?<button className="button primary" disabled={(step===1&&!canAdvance1)||(step===2&&!canAdvance2)||(step===3&&!canAdvance3)} onClick={()=>setStep(step+1)}>Próximo</button>:<button className="button primary" disabled={saving} onClick={submit}>{saving?'Salvando...':'Salvar ficha'}</button>}</div>
    </section>
  </div>
}
