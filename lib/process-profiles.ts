import {
  ConcreteProcessProfile,
  ConcreteProcessType,
  RupturePlanItem,
  Sample,
  StrengthEvaluationMode,
  Work,
} from './types';
import { ageSpecLabel, ageSpecToDays } from './utils';

export const VILLA_ARAUCO_DEFAULT_PROFILES: Record<Exclude<ConcreteProcessType,'OUTRO'>,ConcreteProcessProfile> = {
  RADIER: {
    processType:'RADIER',
    label:'Radier',
    elementGroup:'RADIER',
    cpTotal:6,
    slumpTargetCm:8,
    slumpToleranceCm:1,
    controlEvaluationMode:'manual',
    rupturePlan:[
      {value:7,unit:'days',cpCount:2,purpose:'control'},
      {value:28,unit:'days',cpCount:2,purpose:'control'},
      {value:63,unit:'days',cpCount:2,purpose:'reserve'},
    ],
  },
  PAREDES: {
    processType:'PAREDES',
    label:'Paredes',
    elementGroup:'PAREDES',
    cpTotal:8,
    slumpTargetCm:20,
    slumpToleranceCm:2,
    formReleaseEvaluationMode:'manual',
    controlEvaluationMode:'manual',
    rupturePlan:[
      {value:12,unit:'hours',cpCount:2,purpose:'form_release',allowRescheduleToHours:[19,24]},
      {value:7,unit:'days',cpCount:2,purpose:'control'},
      {value:28,unit:'days',cpCount:2,purpose:'control'},
      {value:63,unit:'days',cpCount:2,purpose:'reserve'},
    ],
  },
  LAJE: {
    processType:'LAJE',
    label:'Laje',
    elementGroup:'LAJES',
    cpTotal:8,
    slumpTargetCm:8,
    slumpToleranceCm:1,
    formReleaseEvaluationMode:'manual',
    controlEvaluationMode:'manual',
    rupturePlan:[
      {value:12,unit:'hours',cpCount:2,purpose:'form_release',allowRescheduleToHours:[19,24]},
      {value:7,unit:'days',cpCount:2,purpose:'control'},
      {value:28,unit:'days',cpCount:2,purpose:'control'},
      {value:63,unit:'days',cpCount:2,purpose:'reserve'},
    ],
  },
  OITAO_PLATIBANDA: {
    processType:'OITAO_PLATIBANDA',
    label:'Oitão / Platibanda',
    elementGroup:'OITÕES E PLATIBANDAS',
    cpTotal:8,
    slumpTargetCm:20,
    slumpToleranceCm:2,
    formReleaseEvaluationMode:'manual',
    controlEvaluationMode:'manual',
    rupturePlan:[
      {value:12,unit:'hours',cpCount:2,purpose:'form_release',allowRescheduleToHours:[19,24]},
      {value:7,unit:'days',cpCount:2,purpose:'control'},
      {value:28,unit:'days',cpCount:2,purpose:'control'},
      {value:63,unit:'days',cpCount:2,purpose:'reserve'},
    ],
  },
};

export function isVillaAraucoWork(work?: Work) {
  if (!work) return false;
  return work.processMode==='villa_arauco'
    || work.id==='villa-arauco'
    || work.name.toUpperCase().includes('VILLA ARAUCO')
    || work.name.toUpperCase().includes('VILA ARAUCO');
}

function mergeProfile(base:ConcreteProcessProfile, override?:ConcreteProcessProfile):ConcreteProcessProfile{
  if(!override)return base;
  return {
    ...base,
    ...override,
    rupturePlan: override.rupturePlan?.length ? override.rupturePlan : base.rupturePlan,
  };
}

export function resolveProcessProfile(work:Work|undefined, processType?:ConcreteProcessType):ConcreteProcessProfile|undefined{
  if(!processType||processType==='OUTRO')return undefined;
  const configured=work?.processProfiles?.[processType];
  if(isVillaAraucoWork(work)){
    return mergeProfile(VILLA_ARAUCO_DEFAULT_PROFILES[processType],configured as ConcreteProcessProfile|undefined);
  }
  return configured as ConcreteProcessProfile|undefined;
}

export function processTypeLabel(type?:ConcreteProcessType){
  if(type==='RADIER')return 'Radier';
  if(type==='PAREDES')return 'Paredes';
  if(type==='LAJE')return 'Laje';
  if(type==='OITAO_PLATIBANDA')return 'Oitão / Platibanda';
  return 'Outro';
}

export function processTypeFromElement(value?:string):ConcreteProcessType{
  const v=String(value||'').trim().toUpperCase();
  if(v.includes('RADIER'))return 'RADIER';
  if(v.includes('PAREDE')&&v.includes('LAJE'))return 'OUTRO';
  if(v.includes('LAJE'))return 'LAJE';
  if(v.includes('PAREDE'))return 'PAREDES';
  if(v.includes('OIT')||v.includes('PLATIBANDA'))return 'OITAO_PLATIBANDA';
  return 'OUTRO';
}

export function sampleProcessType(sample:Sample):ConcreteProcessType{
  return sample.processType || processTypeFromElement(sample.element);
}


export function sampleProcessLabel(sample:Sample){
  const type=sampleProcessType(sample);
  if(type!=='OUTRO')return processTypeLabel(type);
  return sample.element || sample.location || 'Outro';
}

export function profileRuptureLabel(item:RupturePlanItem){
  return ageSpecLabel({value:item.value,unit:item.unit});
}

export function profilePlanSummary(profile:ConcreteProcessProfile){
  return profile.rupturePlan
    .map(item=>`${item.cpCount} CP ${profileRuptureLabel(item)}`)
    .join(' • ');
}

export function checkSlump(profile:ConcreteProcessProfile|undefined, actualCm?:number){
  if(!profile?.slumpTargetCm||profile.slumpToleranceCm===undefined||actualCm===undefined||!Number.isFinite(actualCm)){
    return {status:'not_configured' as const, message:'Sem comparação automática de slump.'};
  }
  const min=profile.slumpTargetCm-profile.slumpToleranceCm;
  const max=profile.slumpTargetCm+profile.slumpToleranceCm;
  if(actualCm<min)return {status:'low' as const,min,max,message:`Abaixo da faixa operacional informada (${min} a ${max} cm).`};
  if(actualCm>max)return {status:'high' as const,min,max,message:`Acima da faixa operacional informada (${min} a ${max} cm).`};
  return {status:'within' as const,min,max,message:`Dentro da faixa operacional informada (${min} a ${max} cm).`};
}

export function profileTargetStrength(sample:Sample, work?:Work, profile?:ConcreteProcessProfile){
  return sample.specifiedStrengthMpa || profile?.projectStrengthMpa || work?.defaultStrengthMpa;
}

export function profileEvaluationMode(profile?:ConcreteProcessProfile, fallback?:StrengthEvaluationMode){
  return profile?.controlEvaluationMode || fallback || 'manual';
}

export function reservePlanItem(profile?:ConcreteProcessProfile){
  return profile?.rupturePlan.find(item=>item.purpose==='reserve');
}

export function formReleasePlanItem(profile?:ConcreteProcessProfile){
  return profile?.rupturePlan.find(item=>item.purpose==='form_release');
}

export function controlPlanItem(profile?:ConcreteProcessProfile, preferredDays=28){
  return profile?.rupturePlan.find(item=>item.purpose==='control' && Math.abs(ageSpecToDays(item)-preferredDays)<0.001)
    || profile?.rupturePlan.find(item=>item.purpose==='control');
}
