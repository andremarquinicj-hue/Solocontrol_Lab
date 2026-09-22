'use client';

import { Edit3, MapPinned, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { deleteWork, listSamples, saveWork, uploadEvidence } from '@/lib/store';
import {
  ConcreteProcessProfile,
  ConcreteProcessType,
  RuptureAgeSpec,
  StrengthEvaluationMode,
  Work,
  WorkMapMode,
} from '@/lib/types';
import {
  VILLA_ARAUCO_DEFAULT_PROFILES,
  isVillaAraucoWork,
  processTypeLabel,
  profilePlanSummary,
} from '@/lib/process-profiles';
import { ageSpecToDays, makeId, parseAgeSpecToken } from '@/lib/utils';

const blank={
  id:'',number:'',name:'',client:'',location:'',plannedUnits:'',plannedVolumeM3:'',
  radier:'',paredes:'',lajes:'',oitaoes:'',muros:'',mapMode:'grid' as WorkMapMode,clientPortalEnabled:true,
  processMode:'generic' as 'villa_arauco'|'generic',
  defaultAges:'7d,14d,28d',defaultStrengthMpa:'',controlAgeDays:'28',reserveAgeDays:'63',
  reserveReleaseThresholdPct:'100',reserveReleaseEnabled:true,controlEvaluationMode:'manual' as StrengthEvaluationMode,
  tankName:'Tanque 01',tankCapacityCp:'',
  radierProjectMpa:'',paredesProjectMpa:'',lajeProjectMpa:'',oitaoProjectMpa:'',
  paredesReleaseMpa:'',lajeReleaseMpa:'',oitaoReleaseMpa:'',
  radierSlump:'8',radierTol:'1',
  paredesSlump:'20',paredesTol:'2',
  lajeSlump:'8',lajeTol:'1',
  oitaoSlump:'20',oitaoTol:'2',
};

const processTypes:Exclude<ConcreteProcessType,'OUTRO'>[]=['RADIER','PAREDES','LAJE','OITAO_PLATIBANDA'];

function n(value:string){const parsed=Number(String(value).replace(',','.'));return Number.isFinite(parsed)&&parsed>0?parsed:undefined}

export default function WorksPage(){
  const {works,refreshWorks,selectedWorkId,setSelectedWorkId}=useWorkScope();
  const [form,setForm]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState<string>();
  const [mapFile,setMapFile]=useState<File>();
  const editing=useMemo(()=>Boolean(form.id),[form.id]);

  function profileValue(work:Work,type:Exclude<ConcreteProcessType,'OUTRO'>,key:keyof ConcreteProcessProfile){
    return work.processProfiles?.[type]?.[key];
  }

  function edit(work:Work){
    setMapFile(undefined);
    const villa=isVillaAraucoWork(work);
    setForm({
      id:work.id,number:work.number||'',name:work.name||'',client:work.client||'',location:work.location||'',
      plannedUnits:work.plannedUnits?String(work.plannedUnits):'',
      plannedVolumeM3:work.plannedVolumeM3?String(work.plannedVolumeM3):'',
      radier:work.plannedElements?.['RADIER']?String(work.plannedElements['RADIER']):'',
      paredes:work.plannedElements?.['PAREDES']?String(work.plannedElements['PAREDES']):(work.plannedElements?.['PAREDES E LAJES']?String(work.plannedElements['PAREDES E LAJES']):''),
      lajes:work.plannedElements?.['LAJES']?String(work.plannedElements['LAJES']):(work.plannedElements?.['PAREDES E LAJES']?String(work.plannedElements['PAREDES E LAJES']):''),
      oitaoes:work.plannedElements?.['OITÕES E PLATIBANDAS']?String(work.plannedElements['OITÕES E PLATIBANDAS']):'',
      muros:work.plannedElements?.['MURO DE ARRIMO']?String(work.plannedElements['MURO DE ARRIMO']):'',
      mapMode:work.mapMode||(villa?'villa_arauco':'grid'),
      clientPortalEnabled:work.clientPortalEnabled!==false,
      processMode:work.processMode||(villa?'villa_arauco':'generic'),
      defaultAges:(work.defaultRuptureAges?.length?work.defaultRuptureAges.map(a=>`${a.value}${a.unit==='hours'?'h':'d'}`).join(','):(work.defaultAges||[7,14,28]).map(a=>`${a}d`).join(',')),
      defaultStrengthMpa:work.defaultStrengthMpa?String(work.defaultStrengthMpa):'',
      controlAgeDays:String(work.controlAgeDays||28),
      reserveAgeDays:String(work.reserveAgeDays||63),
      reserveReleaseThresholdPct:String(work.reserveReleaseThresholdPct||100),
      reserveReleaseEnabled:work.reserveReleaseEnabled!==false,
      controlEvaluationMode:work.controlEvaluationMode||'manual',
      tankName:work.tankName||'Tanque 01',
      tankCapacityCp:work.tankCapacityCp?String(work.tankCapacityCp):'',
      radierProjectMpa:profileValue(work,'RADIER','projectStrengthMpa')?String(profileValue(work,'RADIER','projectStrengthMpa')):'',
      paredesProjectMpa:profileValue(work,'PAREDES','projectStrengthMpa')?String(profileValue(work,'PAREDES','projectStrengthMpa')):'',
      lajeProjectMpa:profileValue(work,'LAJE','projectStrengthMpa')?String(profileValue(work,'LAJE','projectStrengthMpa')):'',
      oitaoProjectMpa:profileValue(work,'OITAO_PLATIBANDA','projectStrengthMpa')?String(profileValue(work,'OITAO_PLATIBANDA','projectStrengthMpa')):'',
      paredesReleaseMpa:profileValue(work,'PAREDES','formReleaseStrengthMpa')?String(profileValue(work,'PAREDES','formReleaseStrengthMpa')):'',
      lajeReleaseMpa:profileValue(work,'LAJE','formReleaseStrengthMpa')?String(profileValue(work,'LAJE','formReleaseStrengthMpa')):'',
      oitaoReleaseMpa:profileValue(work,'OITAO_PLATIBANDA','formReleaseStrengthMpa')?String(profileValue(work,'OITAO_PLATIBANDA','formReleaseStrengthMpa')):'',
      radierSlump:String(profileValue(work,'RADIER','slumpTargetCm')||8),
      radierTol:String(profileValue(work,'RADIER','slumpToleranceCm')||1),
      paredesSlump:String(profileValue(work,'PAREDES','slumpTargetCm')||20),
      paredesTol:String(profileValue(work,'PAREDES','slumpToleranceCm')||2),
      lajeSlump:String(profileValue(work,'LAJE','slumpTargetCm')||8),
      lajeTol:String(profileValue(work,'LAJE','slumpToleranceCm')||1),
      oitaoSlump:String(profileValue(work,'OITAO_PLATIBANDA','slumpTargetCm')||20),
      oitaoTol:String(profileValue(work,'OITAO_PLATIBANDA','slumpToleranceCm')||2),
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function configuredProfiles():Partial<Record<ConcreteProcessType,ConcreteProcessProfile>>|undefined{
    if(form.processMode!=='villa_arauco')return undefined;
    const fieldMap={
      RADIER:{project:form.radierProjectMpa,release:'',slump:form.radierSlump,tol:form.radierTol},
      PAREDES:{project:form.paredesProjectMpa,release:form.paredesReleaseMpa,slump:form.paredesSlump,tol:form.paredesTol},
      LAJE:{project:form.lajeProjectMpa,release:form.lajeReleaseMpa,slump:form.lajeSlump,tol:form.lajeTol},
      OITAO_PLATIBANDA:{project:form.oitaoProjectMpa,release:form.oitaoReleaseMpa,slump:form.oitaoSlump,tol:form.oitaoTol},
    } as const;
    const out:Partial<Record<ConcreteProcessType,ConcreteProcessProfile>>={};
    processTypes.forEach(type=>{
      const base=VILLA_ARAUCO_DEFAULT_PROFILES[type];
      const values=fieldMap[type];
      out[type]={
        ...base,
        slumpTargetCm:n(values.slump)||base.slumpTargetCm,
        slumpToleranceCm:n(values.tol)||base.slumpToleranceCm,
        projectStrengthMpa:n(values.project),
        formReleaseStrengthMpa:n(values.release),
        controlEvaluationMode:form.controlEvaluationMode,
        formReleaseEvaluationMode:form.controlEvaluationMode,
      };
    });
    return out;
  }

  async function save(){
    if(!form.name||!form.client)return;
    setSaving(true);
    try{
      const plannedElements:Record<string,number>={};
      const values:[string,string][]=[
        ['RADIER',form.radier],['PAREDES',form.paredes],['LAJES',form.lajes],
        ['OITÕES E PLATIBANDAS',form.oitaoes],['MURO DE ARRIMO',form.muros]
      ];
      values.forEach(([key,value])=>{const valueN=Number(value);if(valueN>0)plannedElements[key]=valueN});

      const id=form.id||makeId('work');
      let mapImage=form.mapMode==='villa_arauco'?'/villa-arauco-planta.png':works.find(w=>w.id===id)?.mapImage;
      if(form.mapMode==='custom'&&mapFile)mapImage=await uploadEvidence(mapFile,`works/${id}/map`);
      if(form.mapMode==='grid'||form.mapMode==='none')mapImage=undefined;

      const defaultRuptureAges=form.defaultAges.split(/[;,/\s]+/).map(parseAgeSpecToken).filter((value):value is RuptureAgeSpec=>Boolean(value));
      const ageMap=new Map(defaultRuptureAges.map(age=>[`${age.value}-${age.unit}`,age]));
      const uniqueRuptureAges=Array.from(ageMap.values()).sort((a,b)=>ageSpecToDays(a)-ageSpecToDays(b));
      const defaultAges=uniqueRuptureAges.map(age=>ageSpecToDays(age));

      const work:Work={
        id,
        number:form.number||String(works.length+1).padStart(2,'0'),
        name:form.name,
        client:form.client,
        contractor:form.contractor||undefined,
        location:form.location||undefined,
        processMode:form.processMode,
        processProfiles:configuredProfiles(),
        defaultAges:defaultAges.length?defaultAges:[7,14,28],
        defaultRuptureAges:uniqueRuptureAges.length?uniqueRuptureAges:undefined,
        active:true,
        plannedUnits:Number(form.plannedUnits)||undefined,
        plannedVolumeM3:n(form.plannedVolumeM3),
        plannedElements:Object.keys(plannedElements).length?plannedElements:undefined,
        mapMode:form.mapMode,
        mapImage,
        mapMaxLot:form.mapMode==='villa_arauco'?28:undefined,
        clientPortalEnabled:form.clientPortalEnabled,
        defaultStrengthMpa:n(form.defaultStrengthMpa),
        controlAgeDays:Number(form.controlAgeDays)||28,
        reserveAgeDays:Number(form.reserveAgeDays)||63,
        reserveReleaseThresholdPct:n(form.reserveReleaseThresholdPct)||100,
        reserveReleaseEnabled:form.reserveReleaseEnabled,
        controlEvaluationMode:form.controlEvaluationMode,
        tankName:form.tankName||undefined,
        tankCapacityCp:Number(form.tankCapacityCp)||undefined,
      };

      await saveWork(work);
      await refreshWorks();
      setSelectedWorkId(id);
      setForm(blank);
      setMapFile(undefined);
    }finally{setSaving(false)}
  }

  async function remove(work:Work){
    const samples=(await listSamples()).filter(sample=>sample.workId===work.id);
    const linkedCount=samples.length;
    const first=confirm(linkedCount>0
      ?`Excluir a obra "${work.name}"?\n\nEla possui ${linkedCount} registro(s) vinculado(s). A obra, fichas, resultados e imagens vinculadas também serão excluídos.\n\nEssa ação não pode ser desfeita.`
      :`Excluir a obra "${work.name}"?\n\nEssa ação não pode ser desfeita.`);
    if(!first)return;
    if(linkedCount>0){
      const typed=prompt(`Digite EXCLUIR para apagar a obra e seus ${linkedCount} registro(s).`);
      if(typed?.trim().toUpperCase()!=='EXCLUIR')return;
    }
    setDeletingId(work.id);
    try{
      const result=await deleteWork(work.id,{deleteLinkedSamples:true});
      if(selectedWorkId===work.id)setSelectedWorkId('all');
      if(form.id===work.id)setForm(blank);
      await refreshWorks();
      alert(result.deletedSamples>0?`Obra excluída. ${result.deletedSamples} registro(s) removidos.`:'Obra excluída.');
    }catch{alert('Não foi possível excluir a obra.')}finally{setDeletingId(undefined)}
  }

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">GESTÃO MULTIOBRA</span><h1>Obras e critérios de controle</h1><p>Configure cada contrato sem misturar regras. A Villa Arauco possui um fluxo próprio de CPs, slump e liberação de formas.</p></div></section>

    <section className="two-columns works-layout">
      <div className="panel">
        <div className="panel-header"><div><h2>{editing?'Editar obra':'Nova obra'}</h2><p>Parâmetros técnicos ficam vinculados à obra e alimentam lançamentos, alertas e Portal do Cliente.</p></div>{editing&&<button className="button ghost small" onClick={()=>{setForm(blank);setMapFile(undefined)}}>Cancelar edição</button>}</div>

        <h3 className="form-section-title">Identificação e planejamento</h3>
        <div className="form-grid compact">
          <label>Nº / Código<input value={form.number} onChange={e=>setForm({...form,number:e.target.value})}/></label>
          <label>Cliente *<input value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/></label><label>Construtora / executora<input value={form.contractor} onChange={e=>setForm({...form,contractor:e.target.value})} placeholder="Ex.: COPLAN"/></label>
          <label className="span-2">Nome da obra *<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="span-2">Local<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Cidade / UF"/></label>
          <label>Tipo de operação<select value={form.processMode} onChange={e=>setForm({...form,processMode:e.target.value as typeof form.processMode})}><option value="generic">Obra genérica / ensaios sob demanda</option><option value="villa_arauco">Villa Arauco — casas em paredes de concreto</option></select></label>
          <label>Unidades previstas<input type="number" min="0" value={form.plannedUnits} onChange={e=>setForm({...form,plannedUnits:e.target.value})}/></label>
          <label>Volume previsto (m³)<input value={form.plannedVolumeM3} onChange={e=>setForm({...form,plannedVolumeM3:e.target.value})}/></label>
        </div>

        <h3 className="form-section-title">Metas por elemento</h3>
        <div className="form-grid compact">
          <label>Radier<input type="number" min="0" value={form.radier} onChange={e=>setForm({...form,radier:e.target.value})}/></label>
          <label>Paredes<input type="number" min="0" value={form.paredes} onChange={e=>setForm({...form,paredes:e.target.value})}/></label>
          <label>Lajes<input type="number" min="0" value={form.lajes} onChange={e=>setForm({...form,lajes:e.target.value})}/></label>
          <label>Oitões / Platibandas<input type="number" min="0" value={form.oitaoes} onChange={e=>setForm({...form,oitaoes:e.target.value})}/></label>
          <label>Muros<input type="number" min="0" value={form.muros} onChange={e=>setForm({...form,muros:e.target.value})}/></label>
        </div>

        <h3 className="form-section-title">Critério principal do projeto</h3>
        <div className="technical-config-note">Os valores abaixo são parâmetros de projeto/procedimento informados pela equipe. O sistema usa-os para alertas e triagem, sem substituir aprovação técnica.</div>
        <div className="form-grid compact">
          <label>MPa mínimo padrão aos 28 dias<input inputMode="decimal" value={form.defaultStrengthMpa} onChange={e=>setForm({...form,defaultStrengthMpa:e.target.value})} placeholder="Preencher conforme projeto"/></label>
          <label>Comparação do par de CPs<select value={form.controlEvaluationMode} onChange={e=>setForm({...form,controlEvaluationMode:e.target.value as StrengthEvaluationMode})}><option value="manual">Selecionar conforme projeto/procedimento</option><option value="minimum">Menor resultado do par</option><option value="average">Média do par</option></select></label>
          <label>Idade principal de controle (dias)<input type="number" min="1" value={form.controlAgeDays} onChange={e=>setForm({...form,controlAgeDays:e.target.value})}/></label>
          <label>Idade de reserva (dias)<input type="number" min="1" value={form.reserveAgeDays} onChange={e=>setForm({...form,reserveAgeDays:e.target.value})}/></label>
          <label>Referência para liberar reserva (% do MPa)<input type="number" min="1" value={form.reserveReleaseThresholdPct} onChange={e=>setForm({...form,reserveReleaseThresholdPct:e.target.value})}/></label>
          <label className="portal-toggle"><input type="checkbox" checked={form.reserveReleaseEnabled} onChange={e=>setForm({...form,reserveReleaseEnabled:e.target.checked})}/>Sugerir avaliação de descarte do CP de 63 dias quando o critério for atendido</label>
        </div>

        {form.processMode==='villa_arauco'?<>
          <h3 className="form-section-title">Padrão operacional — Villa Arauco</h3>
          <div className="villa-process-explainer">
            <b>Planos automáticos de amostragem</b>
            <span>Radier: 6 CPs — 2×7d, 2×28d, 2×63d.</span>
            <span>Paredes, lajes e oitão/platibanda: 8 CPs — 2×12h (reprogramável para 19h ou 24h), 2×7d, 2×28d, 2×63d.</span>
          </div>
          <div className="process-config-cards">
            {processTypes.map(type=>{
              const base=VILLA_ARAUCO_DEFAULT_PROFILES[type];
              const projectKey=type==='RADIER'?'radierProjectMpa':type==='PAREDES'?'paredesProjectMpa':type==='LAJE'?'lajeProjectMpa':'oitaoProjectMpa';
              const releaseKey=type==='PAREDES'?'paredesReleaseMpa':type==='LAJE'?'lajeReleaseMpa':type==='OITAO_PLATIBANDA'?'oitaoReleaseMpa':undefined;
              const slumpKey=type==='RADIER'?'radierSlump':type==='PAREDES'?'paredesSlump':type==='LAJE'?'lajeSlump':'oitaoSlump';
              const tolKey=type==='RADIER'?'radierTol':type==='PAREDES'?'paredesTol':type==='LAJE'?'lajeTol':'oitaoTol';
              return <div className="process-config-card" key={type}>
                <div className="process-config-head"><div><span>ELEMENTO</span><h4>{processTypeLabel(type)}</h4></div><b>{base.cpTotal} CPs</b></div>
                <p>{profilePlanSummary(base)}</p>
                <div className="process-config-fields">
                  <label>Slump alvo (cm)<input value={(form as any)[slumpKey]} onChange={e=>setForm({...form,[slumpKey]:e.target.value})}/></label>
                  <label>Tolerância (cm)<input value={(form as any)[tolKey]} onChange={e=>setForm({...form,[tolKey]:e.target.value})}/></label>
                  <label>MPa de projeto 28d<input value={(form as any)[projectKey]} onChange={e=>setForm({...form,[projectKey]:e.target.value})} placeholder="Usa padrão se vazio"/></label>
                  {releaseKey?<label>MPa para liberação da forma<input value={(form as any)[releaseKey]} onChange={e=>setForm({...form,[releaseKey]:e.target.value})} placeholder="Conforme projeto/procedimento"/></label>:<div className="process-no-release"><span>Liberação de forma</span><b>Não aplicável ao plano</b></div>}
                </div>
              </div>
            })}
          </div>
        </>:<>
          <h3 className="form-section-title">Idades padrão — obras genéricas</h3>
          <div className="form-grid compact"><label className="span-2">Idades padrão<input value={form.defaultAges} onChange={e=>setForm({...form,defaultAges:e.target.value})} placeholder="Ex.: 24h,7d,28d,63d"/><small>Use h para horas e d para dias.</small></label></div>
        </>}

        <h3 className="form-section-title">Tanque / câmara de cura</h3>
        <div className="form-grid compact">
          <label>Nome do armazenamento<input value={form.tankName} onChange={e=>setForm({...form,tankName:e.target.value})} placeholder="Ex.: Tanque 01"/></label>
          <label>Capacidade em CPs<input type="number" min="0" value={form.tankCapacityCp} onChange={e=>setForm({...form,tankCapacityCp:e.target.value})} placeholder="Ex.: 400"/></label>
        </div>

        <h3 className="form-section-title">Mapa e Portal do Cliente</h3>
        <div className="form-grid compact">
          <label className="span-2">Tipo de mapa<select value={form.mapMode} onChange={e=>setForm({...form,mapMode:e.target.value as WorkMapMode})}><option value="grid">Grade Quadra / Lote</option><option value="villa_arauco">Planta Villa Arauco</option><option value="custom">Planta personalizada</option><option value="none">Sem mapa</option></select></label>
          {form.mapMode==='custom'&&<label className="span-2">Imagem da planta<input type="file" accept="image/*" onChange={e=>setMapFile(e.target.files?.[0])}/></label>}
          <label className="span-2 portal-toggle"><input type="checkbox" checked={form.clientPortalEnabled} onChange={e=>setForm({...form,clientPortalEnabled:e.target.checked})}/>Liberar esta obra para o Portal do Cliente</label>
        </div>

        <button className="button primary" disabled={saving||!form.name||!form.client} onClick={save}><Save size={16}/>{saving?'Salvando...':editing?'Atualizar obra':'Salvar obra'}</button>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Obras cadastradas</h2><p>Cada obra mantém suas próprias metas, critérios e acessos.</p></div><MapPinned/></div>
        <div className="cards-list works-list">{works.map(w=><div className="work-card" key={w.id}><div><b>{w.number} — {w.name}</b><span>{w.client}{w.contractor?` • Executora: ${w.contractor}`:''}{w.location?` • ${w.location}`:''}</span><small>{w.plannedUnits?`${w.plannedUnits} unidades previstas`:'Sem meta'} • {isVillaAraucoWork(w)?'Fluxo Villa Arauco':'Fluxo genérico'} • {w.defaultStrengthMpa?`${w.defaultStrengthMpa} MPa padrão`:'MPa padrão não configurado'} • {w.tankCapacityCp?`${w.tankName||'Tanque'} ${w.tankCapacityCp} CPs`:'capacidade não cadastrada'}</small></div><div className="work-card-actions"><button className="button secondary small" onClick={()=>edit(w)} disabled={deletingId===w.id}><Edit3 size={14}/>Editar</button><button className="button danger small" onClick={()=>remove(w)} disabled={deletingId===w.id}><Trash2 size={14}/>{deletingId===w.id?'Excluindo...':'Excluir'}</button></div></div>)}</div>
      </div>
    </section>
  </div>
}
