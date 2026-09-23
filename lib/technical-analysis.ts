import {
  ConcreteProcessProfile,
  ConcreteSpecimen,
  RuptureEvent,
  Sample,
  SpecimenStatus,
  StrengthEvaluationMode,
  Work,
} from './types';
import { makeId } from './utils';
import {
  formReleasePlanItem,
  profileTargetStrength,
  reservePlanItem,
  resolveProcessProfile,
  sampleProcessType,
} from './process-profiles';

export type ReserveDecision = 'not_applicable' | 'disabled' | 'not_configured' | 'pending' | 'keep' | 'eligible';
export type FormReleaseDecision = 'not_applicable' | 'not_configured' | 'pending' | 'below' | 'eligible';

export interface TechnicalAnalysis {
  targetMpa?: number;
  controlAgeDays: number;
  reserveAgeDays: number;
  thresholdMpa?: number;
  evaluationMode: StrengthEvaluationMode;
  controlResults: number[];
  controlValue?: number;
  controlAverage?: number;
  controlMin?: number;
  controlMax?: number;
  trend7toControlPct?: number;
  reserveDecision: ReserveDecision;
  tone: 'neutral' | 'good' | 'attention' | 'danger';
  headline: string;
  summary: string;
}

export interface FormReleaseAnalysis {
  applicable: boolean;
  targetMpa?: number;
  evaluationMode: StrengthEvaluationMode;
  resultValue?: number;
  average?: number;
  min?: number;
  max?: number;
  decision: FormReleaseDecision;
  tone: 'neutral' | 'good' | 'attention' | 'danger';
  headline: string;
  summary: string;
  rupture?: RuptureEvent;
}

export function ruptureResults(rupture?: RuptureEvent): number[] {
  if (!rupture) return [];
  const measurements = rupture.measurements?.map(m => m.resistanceMpa).filter(v => Number.isFinite(v)) || [];
  if (measurements.length) return measurements;
  const imported = rupture.importedResultsMpa?.filter(v => Number.isFinite(v)) || [];
  if (imported.length) return imported;
  return rupture.resistanceMpa !== undefined && Number.isFinite(rupture.resistanceMpa) ? [rupture.resistanceMpa] : [];
}

export function mean(values: number[]) {
  if (!values.length) return undefined;
  return values.reduce((a,b)=>a+b,0) / values.length;
}

export function evaluateResults(values:number[],mode:StrengthEvaluationMode){
  if(!values.length)return undefined;
  if(mode==='manual')return undefined;
  return mode==='average' ? mean(values) : Math.min(...values);
}

function eventAtDays(sample:Sample,days:number){
  return sample.ruptures.find(r=>Math.abs(r.ageDays-days)<0.001);
}

function eventByPurpose(sample:Sample,purpose:RuptureEvent['purpose'],fallbackDays?:number){
  return sample.ruptures.find(r=>r.purpose===purpose)
    || (fallbackDays!==undefined ? eventAtDays(sample,fallbackDays) : undefined);
}

export function analyzeSample(sample: Sample, work?: Work): TechnicalAnalysis {
  const processType=sampleProcessType(sample);
  const profile=resolveProcessProfile(work,processType);
  const controlAgeDays = work?.controlAgeDays || 28;
  const reserveAgeDays = work?.reserveAgeDays || reservePlanItem(profile)?.value || 63;
  const targetMpa = profileTargetStrength(sample,work,profile);
  const thresholdPct = work?.reserveReleaseThresholdPct || 100;
  const thresholdMpa = targetMpa ? targetMpa * thresholdPct / 100 : undefined;
  const evaluationMode=profile?.controlEvaluationMode || work?.controlEvaluationMode || 'manual';

  const control = sample.ruptures.find(r=>r.purpose==='control'&&Math.abs(r.ageDays-controlAgeDays)<0.001)
    || eventAtDays(sample,controlAgeDays);
  const reserve = sample.ruptures.find(r=>r.purpose==='reserve')
    || eventAtDays(sample,reserveAgeDays);

  const controlResults = ruptureResults(control);
  const controlAverage = mean(controlResults);
  const controlMin = controlResults.length ? Math.min(...controlResults) : undefined;
  const controlMax = controlResults.length ? Math.max(...controlResults) : undefined;
  const controlValue=evaluateResults(controlResults,evaluationMode);

  const r7=eventAtDays(sample,7);
  const r7avg=mean(ruptureResults(r7));
  const trend7toControlPct =
    r7avg && controlAverage !== undefined && r7avg > 0
      ? ((controlAverage - r7avg) / r7avg) * 100
      : undefined;

  if(sample.historicalBaselineClosed || (sample.archived && sample.includeInOperations===false)){
    const resultText=controlAverage!==undefined
      ? `Resultado médio registrado aos ${controlAgeDays} dias: ${controlAverage.toFixed(2)} MPa.`
      : `A fonte histórica consolidada não possui resultado para ${controlAgeDays} dias nesta ficha.`;
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_applicable', tone:controlResults.length?'good':'neutral',
      headline:'Histórico consolidado — sem pendência operacional',
      summary:`${resultText} O registro anterior a 28/09/2026 foi preservado para rastreabilidade e não integra a agenda operacional atual.`,
    };
  }

  if (!reserve) {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_applicable', tone:'neutral',
      headline:'Sem CP de reserva configurado',
      summary:`Esta ficha não possui ruptura de reserva programada.`,
    };
  }

  if (sample.reserveDisposition==='discarded') {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_applicable', tone:'good',
      headline:'CP de reserva registrado como descartado',
      summary:'A planilha histórica atualizada registra o descarte do CP de reserva. O registro foi preservado para rastreabilidade e não entra como reserva pendente.',
    };
  }

  if (sample.reserveDisposition==='tested') {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_applicable', tone:'neutral',
      headline:`Reserva de ${reserveAgeDays} dias já ensaiada`,
      summary:'Há resultado registrado para a idade de reserva; portanto, este CP não deve ser tratado como reserva disponível para descarte antecipado.',
    };
  }

  if (work?.reserveReleaseEnabled === false) {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'disabled', tone:'neutral',
      headline:'Liberação antecipada desativada',
      summary:'A obra está configurada para manter os CPs de reserva até a idade programada.',
    };
  }

  if (!targetMpa || !thresholdMpa) {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_configured', tone:'attention',
      headline:'MPa de projeto não configurado',
      summary:'Cadastre o MPa de projeto/controle da obra ou da ficha para habilitar a triagem dos CPs de reserva.',
    };
  }

  if (evaluationMode==='manual') {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'not_configured', tone:'attention',
      headline:'Critério do par de CPs não configurado',
      summary:'Selecione na obra se o valor de avaliação será a média do par ou o menor resultado, conforme projeto/procedimento, antes de liberar CPs de reserva.',
    };
  }

  if (!control || control.status !== 'concluido' || !controlResults.length || controlValue===undefined) {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'pending', tone:'neutral',
      headline:`Aguardando resultado de ${controlAgeDays} dias`,
      summary:`Os CPs de reserva devem permanecer armazenados até existir resultado da idade principal de controle.`,
    };
  }

  if (controlValue < thresholdMpa) {
    return {
      targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
      controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
      reserveDecision:'keep', tone:'danger',
      headline:'Manter CP de reserva',
      summary:`O valor de avaliação aos ${controlAgeDays} dias (${controlValue.toFixed(2)} MPa) está abaixo da referência gerencial de ${thresholdMpa.toFixed(2)} MPa. Manter os CPs de reserva e encaminhar para avaliação técnica.`,
    };
  }

  return {
    targetMpa, controlAgeDays, reserveAgeDays, thresholdMpa, evaluationMode, controlResults,
    controlValue, controlAverage, controlMin, controlMax, trend7toControlPct,
    reserveDecision:'eligible', tone:'good',
    headline:'CP de reserva elegível para avaliação de descarte',
    summary:`O valor de avaliação aos ${controlAgeDays} dias (${controlValue.toFixed(2)} MPa) atende à referência gerencial configurada (${thresholdMpa.toFixed(2)} MPa). Os CPs de reserva podem ser avaliados para descarte mediante autorização responsável. Esta indicação não substitui projeto, especificações, normas ou decisão técnica.`,
  };
}

export function analyzeFormRelease(sample:Sample,work?:Work):FormReleaseAnalysis{
  const processType=sampleProcessType(sample);
  const profile=resolveProcessProfile(work,processType);
  const planned=formReleasePlanItem(profile);
  const event=sample.ruptures.find(r=>r.purpose==='form_release')
    || (planned ? sample.ruptures.find(r=>Math.abs(r.ageDays-(planned.unit==='hours'?planned.value/24:planned.value))<0.001) : undefined);

  if(sample.historicalBaselineClosed || (sample.archived && sample.includeInOperations===false)){
    return {
      applicable:Boolean(planned||event),evaluationMode:profile?.formReleaseEvaluationMode||'manual',decision:'not_applicable',tone:'neutral',rupture:event,
      headline:'Histórico consolidado',
      summary:'Registro anterior a 28/09/2026 preservado para rastreabilidade, sem ação operacional pendente.',
    };
  }

  if(!planned&&!event){
    return {
      applicable:false,evaluationMode:'minimum',decision:'not_applicable',tone:'neutral',
      headline:'Sem controle de liberação de forma',
      summary:'Este processo não possui ensaio de liberação de forma configurado.',
    };
  }

  const evaluationMode=profile?.formReleaseEvaluationMode || 'manual';
  const targetMpa=profile?.formReleaseStrengthMpa;

  if(!targetMpa){
    return {
      applicable:true,targetMpa,evaluationMode,decision:'not_configured',tone:'attention',rupture:event,
      headline:'MPa para liberação de forma não configurado',
      summary:'O ensaio de baixa idade será registrado, mas o sistema não indicará liberação até o valor exigido em projeto/procedimento ser cadastrado.',
    };
  }

  if(evaluationMode==='manual'){
    return {
      applicable:true,targetMpa,evaluationMode,decision:'not_configured',tone:'attention',rupture:event,
      headline:'Critério do par de CPs não configurado',
      summary:'Selecione se a liberação será avaliada pela média do par ou pelo menor resultado, conforme projeto/procedimento.',
    };
  }

  const results=ruptureResults(event);
  const average=mean(results);
  const min=results.length?Math.min(...results):undefined;
  const max=results.length?Math.max(...results):undefined;
  const resultValue=evaluateResults(results,evaluationMode);

  if(!event||event.status!=='concluido'||!results.length||resultValue===undefined){
    return {
      applicable:true,targetMpa,evaluationMode,decision:'pending',tone:'neutral',rupture:event,
      headline:'Aguardando ensaio de liberação de forma',
      summary:'A forma permanece em acompanhamento até o lançamento do ensaio de baixa idade e a avaliação do responsável.',
    };
  }

  if(resultValue<targetMpa){
    return {
      applicable:true,targetMpa,evaluationMode,resultValue,average,min,max,decision:'below',tone:'danger',rupture:event,
      headline:'Referência de liberação ainda não atingida',
      summary:`O valor de avaliação registrado (${resultValue.toFixed(2)} MPa) está abaixo do valor configurado para liberação (${targetMpa.toFixed(2)} MPa). Não indicar liberação automática.`,
    };
  }

  return {
    applicable:true,targetMpa,evaluationMode,resultValue,average,min,max,decision:'eligible',tone:'good',rupture:event,
    headline:'Referência de liberação atingida',
    summary:`O valor de avaliação registrado (${resultValue.toFixed(2)} MPa) atingiu a referência configurada para liberação de forma (${targetMpa.toFixed(2)} MPa). A liberação efetiva permanece sujeita ao procedimento e à autorização aplicável.`,
  };
}

function statusForSpecimen(specimen: ConcreteSpecimen, sample: Sample, work?: Work): SpecimenStatus {
  if (specimen.status === 'descartado') return 'descartado';

  const rupture = sample.ruptures.find(r => r.id === specimen.ruptureId)
    || sample.ruptures.find(r => Math.abs(r.ageDays-specimen.scheduledAgeDays)<0.001);

  if (rupture?.status === 'concluido') return 'rompido';

  const reserve = rupture?.purpose==='reserve'
    || specimen.scheduledAgeDays === (work?.reserveAgeDays || 63);

  if (reserve) {
    if (specimen.manualHold) return 'manter_reserva';
    const analysis = analyzeSample(sample, work);
    return analysis.reserveDecision === 'eligible' ? 'elegivel_descarte' : 'manter_reserva';
  }

  return 'armazenado';
}

function plannedCounts(ruptures:RuptureEvent[],labelCount:number){
  const explicit=ruptures.map(r=>Math.max(0,Number(r.plannedCpCount)||0));
  const total=explicit.reduce((a,b)=>a+b,0);
  if(total===labelCount&&explicit.every(n=>n>0))return explicit;

  const baseCount=Math.floor(labelCount/ruptures.length);
  let remainder=labelCount%ruptures.length;
  return ruptures.map(()=>{
    const count=baseCount+(remainder>0?1:0);
    if(remainder>0)remainder--;
    return count;
  });
}

export function buildSpecimens(
  labels: string[],
  ruptures: RuptureEvent[],
  work?: Work,
): ConcreteSpecimen[] {
  if (!labels.length || !ruptures.length) return [];

  const ordered=[...ruptures].sort((a,b)=>a.ageDays-b.ageDays);
  const counts=plannedCounts(ordered,labels.length);
  let cursor=0;
  const now=new Date().toISOString();
  const specimens:ConcreteSpecimen[]=[];

  ordered.forEach((rupture,index)=>{
    const count=counts[index];
    for(let i=0;i<count&&cursor<labels.length;i++,cursor++){
      specimens.push({
        id:makeId('cp'),
        label:labels[cursor],
        scheduledAgeDays:rupture.ageDays,
        scheduledAgeValue:rupture.ageValue,
        scheduledAgeUnit:rupture.ageUnit,
        dueAt:rupture.dueAt,
        ruptureId:rupture.id,
        status:rupture.status==='concluido'?'rompido':'armazenado',
        tankName:work?.tankName,
        updatedAt:now,
      });
    }
  });

  return specimens.map(specimen=>({
    ...specimen,
    status:statusForSpecimen(specimen,{ruptures} as Sample,work),
  }));
}

export function resolveSpecimens(sample: Sample, work?: Work): ConcreteSpecimen[] {
  const current=sample.specimens?.length
    ? sample.specimens
    : buildSpecimens(sample.cpLabels||[],sample.ruptures||[],work);

  return current.map(specimen=>({
    ...specimen,
    tankName:specimen.tankName||work?.tankName,
    status:statusForSpecimen(specimen,sample,work),
  }));
}

export function applySpecimenStatuses(sample: Sample, work?: Work): Sample {
  const specimens=resolveSpecimens(sample,work);
  const ruptures=sample.ruptures.map(r=>({
    ...r,
    specimenIds:r.specimenIds?.length
      ? r.specimenIds
      : specimens.filter(cp=>cp.ruptureId===r.id).map(cp=>cp.id),
  }));
  return {...sample,specimens,ruptures};
}

export function specimensForRupture(sample: Sample, rupture: RuptureEvent, work?: Work) {
  return resolveSpecimens(sample,work).filter(specimen =>
    specimen.ruptureId === rupture.id
    || (!specimen.ruptureId && Math.abs(specimen.scheduledAgeDays-rupture.ageDays)<0.001)
  );
}

export interface StrengthSeriesPoint{
  ageDays:number;
  ageLabel:string;
  value:number;
  min:number;
  max:number;
  rupture:RuptureEvent;
}

export function sampleStrengthSeries(sample:Sample):StrengthSeriesPoint[]{
  return sample.ruptures
    .map(rupture=>{
      const values=ruptureResults(rupture);
      if(!values.length)return undefined;
      const average=mean(values)!;
      return {
        ageDays:rupture.ageDays,
        ageLabel:rupture.ageLabel||`${rupture.ageDays} dias`,
        value:average,
        min:Math.min(...values),
        max:Math.max(...values),
        rupture,
      };
    })
    .filter((v):v is StrengthSeriesPoint=>Boolean(v))
    .sort((a,b)=>a.ageDays-b.ageDays);
}

export function lotTechnicalSummary(samples: Sample[], work?: Work) {
  const analyses=samples.map(sample=>({
    sample,
    analysis:analyzeSample(sample,work),
    formRelease:analyzeFormRelease(sample,work),
  }));
  const withTarget=analyses.filter(x=>x.analysis.targetMpa);
  const eligible=analyses.filter(x=>x.analysis.reserveDecision==='eligible').length;
  const keep=analyses.filter(x=>x.analysis.reserveDecision==='keep').length;
  const pending=analyses.filter(x=>['pending','not_configured'].includes(x.analysis.reserveDecision)).length;
  const formReleased=analyses.filter(x=>x.formRelease.decision==='eligible').length;
  const formAttention=analyses.filter(x=>x.formRelease.decision==='below').length;

  let tone:TechnicalAnalysis['tone']='neutral';
  let headline='Acompanhamento em andamento';
  let summary='Não há resultado suficiente para uma conclusão gerencial rápida.';

  if(keep>0||formAttention>0){
    tone='danger';
    headline='Atenção técnica';
    const issues=[
      keep?`${keep} concretagem(ns) com controle principal abaixo da referência`:undefined,
      formAttention?`${formAttention} concretagem(ns) sem atingir a referência de liberação de forma`:undefined,
    ].filter(Boolean).join(' e ');
    summary=`${issues}. Recomenda-se revisar os registros e manter as reservas aplicáveis.`;
  }else if(eligible>0&&eligible===withTarget.length&&withTarget.length>0){
    tone='good';
    headline='Resultados de controle atendendo às referências configuradas';
    summary=`As ${eligible} concretagem(ns) com critério de controle configurado atendem à referência gerencial.`;
  }else if(eligible>0||formReleased>0){
    tone='attention';
    headline='Resultados parcialmente consolidados';
    summary=`Há resultados já atendidos e outros ainda aguardando idade, configuração ou avaliação.`;
  }

  return {analyses,eligible,keep,pending,formReleased,formAttention,tone,headline,summary};
}
