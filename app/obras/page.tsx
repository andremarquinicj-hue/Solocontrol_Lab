'use client';

import { Edit3, MapPinned, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { saveWork } from '@/lib/store';
import { Work, WorkMapMode } from '@/lib/types';
import { makeId } from '@/lib/utils';

const blank = {
  id: '', number: '', name: '', client: '', location: '', plannedUnits: '', plannedVolumeM3: '',
  radier: '', paredes: '', oitaoes: '', muros: '', mapMode: 'grid' as WorkMapMode,
};

export default function WorksPage(){
  const { works, refreshWorks, setSelectedWorkId } = useWorkScope();
  const [form,setForm]=useState(blank);
  const [saving,setSaving]=useState(false);

  const editing = useMemo(()=>Boolean(form.id),[form.id]);

  function edit(work:Work){
    setForm({
      id:work.id, number:work.number || '', name:work.name || '', client:work.client || '', location:work.location || '',
      plannedUnits:work.plannedUnits ? String(work.plannedUnits) : '',
      plannedVolumeM3:work.plannedVolumeM3 ? String(work.plannedVolumeM3) : '',
      radier:work.plannedElements?.['RADIER'] ? String(work.plannedElements['RADIER']) : '',
      paredes:work.plannedElements?.['PAREDES E LAJES'] ? String(work.plannedElements['PAREDES E LAJES']) : '',
      oitaoes:work.plannedElements?.['OITÕES E PLATIBANDAS'] ? String(work.plannedElements['OITÕES E PLATIBANDAS']) : '',
      muros:work.plannedElements?.['MURO DE ARRIMO'] ? String(work.plannedElements['MURO DE ARRIMO']) : '',
      mapMode: work.mapMode || (work.id==='villa-arauco'?'villa_arauco':'grid'),
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function save(){
    if(!form.name || !form.client)return;
    setSaving(true);
    try{
      const plannedElements:Record<string,number>={};
      const values:[string,string][]=[['RADIER',form.radier],['PAREDES E LAJES',form.paredes],['OITÕES E PLATIBANDAS',form.oitaoes],['MURO DE ARRIMO',form.muros]];
      values.forEach(([key,value])=>{const n=Number(value);if(n>0)plannedElements[key]=n});
      const id=form.id || makeId('work');
      const work:Work={
        id,
        number:form.number || String(works.length+1).padStart(2,'0'),
        name:form.name,
        client:form.client,
        location:form.location || undefined,
        defaultAges:[7,14,28],
        active:true,
        plannedUnits:Number(form.plannedUnits)||undefined,
        plannedVolumeM3:Number(String(form.plannedVolumeM3).replace(',','.'))||undefined,
        plannedElements:Object.keys(plannedElements).length?plannedElements:undefined,
        mapMode:form.mapMode,
        mapImage:form.mapMode==='villa_arauco'?'/villa-arauco-planta.png':undefined,
        mapMaxLot:form.mapMode==='villa_arauco'?28:undefined,
      };
      await saveWork(work);
      await refreshWorks();
      setSelectedWorkId(id);
      setForm(blank);
    }finally{setSaving(false)}
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">GESTÃO MULTIOBRA</span><h1>Obras</h1><p>Cadastre metas de produção para o dashboard calcular o progresso real de cada obra.</p></div></section>

    <section className="two-columns works-layout">
      <div className="panel">
        <div className="panel-header"><div><h2>{editing?'Editar obra':'Nova obra'}</h2><p>As metas podem ser ajustadas a qualquer momento.</p></div>{editing&&<button className="button ghost small" onClick={()=>setForm(blank)}>Cancelar edição</button>}</div>
        <div className="form-grid compact">
          <label>Nº / Código<input value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/></label>
          <label>Cliente *<input value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/></label>
          <label className="span-2">Nome da obra *<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="span-2">Local<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Cidade / UF"/></label>
          <label>Unidades previstas<input type="number" min="0" value={form.plannedUnits} onChange={e=>setForm({...form,plannedUnits:e.target.value})} placeholder="Ex.: 620"/></label>
          <label>Volume previsto (m³)<input value={form.plannedVolumeM3} onChange={e=>setForm({...form,plannedVolumeM3:e.target.value})} placeholder="Ex.: 10000"/></label>
        </div>
        <h3 className="form-section-title">Metas por elemento</h3>
        <div className="form-grid compact">
          <label>Radier<input type="number" min="0" value={form.radier} onChange={e=>setForm({...form,radier:e.target.value})}/></label>
          <label>Paredes / Lajes<input type="number" min="0" value={form.paredes} onChange={e=>setForm({...form,paredes:e.target.value})}/></label>
          <label>Oitões / Platibandas<input type="number" min="0" value={form.oitaoes} onChange={e=>setForm({...form,oitaoes:e.target.value})}/></label>
          <label>Muros<input type="number" min="0" value={form.muros} onChange={e=>setForm({...form,muros:e.target.value})}/></label>
          <label className="span-2">Tipo de mapa<select value={form.mapMode} onChange={e=>setForm({...form,mapMode:e.target.value as WorkMapMode})}><option value="grid">Grade Quadra / Lote</option><option value="villa_arauco">Planta Villa Arauco</option><option value="none">Sem mapa</option></select></label>
        </div>
        <button className="button primary" disabled={saving||!form.name||!form.client} onClick={save}><Save size={16}/>{saving?'Salvando...':editing?'Atualizar obra':'Salvar obra'}</button>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Obras cadastradas</h2><p>Selecione editar para definir metas e mapa.</p></div><MapPinned/></div>
        <div className="cards-list works-list">
          {works.map(w=><div className="work-card" key={w.id}><div><b>{w.number} — {w.name}</b><span>{w.client}{w.location?` • ${w.location}`:''}</span><small>{w.plannedUnits?`${w.plannedUnits} unidades previstas`:'Sem meta de unidades'} • {w.mapMode==='villa_arauco'?'Mapa Villa Arauco':w.mapMode==='none'?'Sem mapa':'Grade Quadra/Lote'}</small></div><button className="button secondary small" onClick={()=>edit(w)}><Edit3 size={14}/>Editar</button></div>)}
        </div>
      </div>
    </section>
  </div>
}
