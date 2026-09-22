'use client';

import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { deleteNonConformity, listNonConformities, listSamples, saveNonConformity, uploadEvidence } from '@/lib/store';
import { NonConformity, NonConformityStatus, PhotoEvidence, Sample } from '@/lib/types';
import { formatDate, makeId } from '@/lib/utils';

const types=['CP sem identificação','Ficha incompleta','CP danificado','Ruptura fora da idade','Amostra perdida','Erro de moldagem','Erro de transporte','Equipamento','Resultado atípico','Outro'];

export default function NCPage(){
  const { selectedWorkId, selectedWork, works }=useWorkScope();
  const [items,setItems]=useState<NonConformity[]>([]);
  const [samples,setSamples]=useState<Sample[]>([]);
  const [type,setType]=useState(types[0]);
  const [description,setDescription]=useState('');
  const [sampleId,setSampleId]=useState('');
  const [responsible,setResponsible]=useState('');const[photo,setPhoto]=useState<File>();
  async function load(){const [n,s]=await Promise.all([listNonConformities(),listSamples()]);setItems(n);setSamples(s)}
  useEffect(()=>{load()},[]);
  const scoped=useMemo(()=>items.filter(x=>selectedWorkId==='all'||x.workId===selectedWorkId),[items,selectedWorkId]);
  const sampleOptions=useMemo(()=>samples.filter(s=>selectedWorkId==='all'||s.workId===selectedWorkId),[samples,selectedWorkId]);

  async function create(){
    const workId=selectedWorkId==='all'?(sampleOptions.find(s=>s.id===sampleId)?.workId||works[0]?.id):selectedWorkId;
    if(!workId||!description)return;
    const now=new Date().toISOString();
    const id=makeId('nc');
    const photos:PhotoEvidence[]=[];
    if(photo){const url=await uploadEvidence(photo,`non-conformities/${id}`);photos.push({key:'naoConformidade' as const,url,name:'Evidência da não conformidade',createdAt:now})}
    await saveNonConformity({id,workId,sampleId:sampleId||undefined,type,description,status:'aberta',responsible:responsible||undefined,photos,createdAt:now,updatedAt:now});
    setDescription('');setSampleId('');setResponsible('');setPhoto(undefined);await load();
  }
  async function status(item:NonConformity,next:NonConformityStatus){const action=next==='encerrada'?(prompt('Descreva a ação tomada para encerrar a ocorrência:',item.actionTaken||'')||item.actionTaken):item.actionTaken;await saveNonConformity({...item,status:next,actionTaken:action,closedAt:next==='encerrada'?new Date().toISOString():undefined,updatedAt:new Date().toISOString()});await load()}

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">QUALIDADE</span><h1>Não conformidades</h1><p>Registre desvios cedo, trate a causa e mantenha evidência da ação tomada.</p></div></section>
    <section className="two-columns nc-layout">
      <div className="panel"><div className="panel-header"><div><h2>Nova ocorrência</h2><p>{selectedWorkId==='all'?'Selecione a ficha para identificar a obra.':`Obra: ${selectedWork?.name}`}</p></div><Plus/></div><div className="form-grid compact"><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}>{types.map(x=><option key={x}>{x}</option>)}</select></label><label>Ficha / amostra<select value={sampleId} onChange={e=>setSampleId(e.target.value)}><option value="">Sem vínculo direto</option>{sampleOptions.slice(0,500).map(s=><option key={s.id} value={s.id}>{s.labelBase} — {s.workName}</option>)}</select></label><label className="span-2">Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descreva o desvio observado..."/></label><label className="span-2">Responsável / ação inicial<input value={responsible} onChange={e=>setResponsible(e.target.value)} placeholder="Responsável pelo tratamento"/></label><label className="span-2">Foto / evidência<input type="file" accept="image/*" onChange={e=>setPhoto(e.target.files?.[0])}/></label></div><button className="button primary" onClick={create} disabled={!description}>Registrar ocorrência</button></div>
      <div className="panel"><div className="panel-header"><div><h2>Indicadores</h2><p>Ocorrências do filtro atual.</p></div><AlertTriangle/></div><div className="nc-kpis"><div><span>Abertas</span><strong>{scoped.filter(x=>x.status==='aberta').length}</strong></div><div><span>Em tratamento</span><strong>{scoped.filter(x=>x.status==='em_tratamento').length}</strong></div><div><span>Encerradas</span><strong>{scoped.filter(x=>x.status==='encerrada').length}</strong></div></div></div>
    </section>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody>{scoped.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(item=><tr key={item.id}><td>{formatDate(item.createdAt.slice(0,10))}</td><td>{item.type}</td><td>{item.description}</td><td>{item.responsible||'—'}</td><td><span className={`status ${item.status==='encerrada'?'concluido':item.status==='em_tratamento'?'em_execucao':'atrasado'}`}>{item.status.replace('_',' ')}</span></td><td><div className="table-actions">{item.status==='aberta'&&<button className="button secondary small" onClick={()=>status(item,'em_tratamento')}>Tratar</button>}{item.status!=='encerrada'&&<button className="button secondary small" onClick={()=>status(item,'encerrada')}><CheckCircle2 size={14}/>Encerrar</button>}<button className="button danger small" onClick={async()=>{if(confirm('Excluir esta ocorrência?')){await deleteNonConformity(item.id);await load()}}}><Trash2 size={14}/></button></div></td></tr>)}{scoped.length===0&&<tr><td colSpan={6}>Nenhuma não conformidade neste filtro.</td></tr>}</tbody></table></div></section>
  </div>
}
