'use client';

import {
  getSystemMigration,
  listSamples,
  listWorks,
  replaceRuptureImportsForWork,
  saveSamplesBatch,
  saveSystemMigration,
  saveWork,
} from './store';
import { BundledRupturePayload, bundledPayloadToRecords, reconcileRuptureRecords } from './rupture-import';
import { Sample, Work } from './types';
import { isVillaAraucoWork } from './process-profiles';

export const HISTORICAL_BASELINE_ID='villa-arauco-historical-baseline-v090';
export const OPERATIONAL_CUTOVER_DATE='2026-10-01';
export const HISTORICAL_BASELINE_VERSION='v0.9.0-2026-09-29';

export interface HistoricalBaselineResult {
  alreadyApplied:boolean;
  samplesArchived:number;
  sourceRows:number;
  matchedRows:number;
  matchedSamples:number;
  complementaryRows:number;
}

function sampleDate(sample:Sample){
  return sample.collectedAt || sample.moldedAt || sample.receivedAt;
}

function hasRuptureResult(sampleRupture:Sample['ruptures'][number]){
  return sampleRupture.resistanceMpa!==undefined
    || Boolean(sampleRupture.measurements?.length)
    || Boolean(sampleRupture.importedResultsMpa?.length);
}

export function isLegacyOperationalRecord(sample:Sample,workId?:string){
  if(workId&&sample.workId!==workId)return false;
  const date=sampleDate(sample);
  return Boolean(date && date < OPERATIONAL_CUTOVER_DATE);
}

export function finalizeHistoricalSample(sample:Sample):Sample{
  if(!isLegacyOperationalRecord(sample))return sample;

  const now='2026-09-30T23:59:59-04:00';
  const hadQualityIssue=sample.status==='nao_conformidade'
    || /\bNC[-\s]?\d|N[AÃ]O\s*CONFORM/i.test(sample.qualityObservation||'');

  const ruptures=sample.ruptures.map(rupture=>{
    if(hasRuptureResult(rupture)){
      return {...rupture,status:'concluido' as const,historicalNoResult:false};
    }
    return {
      ...rupture,
      status:'concluido' as const,
      historicalNoResult:true,
      historicalClosedAt:now,
      notes:[rupture.notes,'Histórico consolidado até 30/09/2026. A fonte disponível não contém resultado para esta idade; o item foi encerrado apenas para não gerar pendência operacional retroativa.'].filter(Boolean).join('\n'),
    };
  });

  return {
    ...sample,
    source:sample.source || 'historical_excel',
    includeInOperations:false,
    archived:true,
    archivedAt:sample.archivedAt || now,
    physicalLocation:'Arquivo Histórico',
    sheetState:'arquivada',
    sheetCustodian:undefined,
    status:'concluido',
    historicalBaselineClosed:true,
    historicalBaselineVersion:HISTORICAL_BASELINE_VERSION,
    historicalIssueNote:hadQualityIssue
      ? 'Ocorrência histórica preservada conforme fonte. Não compõe a fila operacional iniciada em 01/10/2026.'
      : sample.historicalIssueNote,
    ruptures,
    updatedAt:new Date().toISOString(),
  };
}

function makeFallbackWork(samples:Sample[]):Work{
  const sample=samples.find(s=>String(s.workName||'').toUpperCase().includes('ARAUCO')) || samples[0];
  return {
    id:sample?.workId || 'villa-arauco',
    number:'VA',
    name:sample?.workName || 'Villa Arauco',
    client:'Arauco',
    contractor:'COPLAN',
    location:'Inocência/MS',
    defaultAges:[7,28,63],
    defaultRuptureAges:[{value:7,unit:'days'},{value:28,unit:'days'},{value:63,unit:'days'}],
    active:true,
    processMode:'villa_arauco',
    defaultStrengthMpa:25,
    controlAgeDays:28,
    reserveAgeDays:63,
    reserveReleaseThresholdPct:100,
    reserveReleaseEnabled:true,
    mapMode:'villa_arauco',
    mapImage:'/villa-arauco-planta.png',
    mapMaxLot:28,
    clientPortalEnabled:true,
    operationalStartDate:OPERATIONAL_CUTOVER_DATE,
    tankName:'Tanque 01',
  };
}

export async function ensureVillaAraucoHistoricalBaseline():Promise<HistoricalBaselineResult>{
  const marker=await getSystemMigration(HISTORICAL_BASELINE_ID);
  if(marker){
    const summary=marker.summary||{};
    return {
      alreadyApplied:true,
      samplesArchived:Number(summary.samplesArchived||0),
      sourceRows:Number(summary.sourceRows||0),
      matchedRows:Number(summary.matchedRows||0),
      matchedSamples:Number(summary.matchedSamples||0),
      complementaryRows:Number(summary.complementaryRows||0),
    };
  }

  const [samples,works]=await Promise.all([listSamples(),listWorks()]);
  const villaSamples=samples.filter(sample=>
    sample.workId==='villa-arauco'
    || String(sample.workName||'').toUpperCase().includes('VILLA ARAUCO')
    || String(sample.workName||'').toUpperCase().includes('VILA ARAUCO')
  );
  const existingWork=works.find(isVillaAraucoWork);
  const work:Work={
    ...makeFallbackWork(villaSamples),
    ...existingWork,
    client:existingWork?.client || 'Arauco',
    contractor:existingWork?.contractor || 'COPLAN',
    processMode:'villa_arauco',
    defaultStrengthMpa:existingWork?.defaultStrengthMpa || 25,
    controlAgeDays:existingWork?.controlAgeDays || 28,
    reserveAgeDays:existingWork?.reserveAgeDays || 63,
    reserveReleaseThresholdPct:existingWork?.reserveReleaseThresholdPct || 100,
    reserveReleaseEnabled:existingWork?.reserveReleaseEnabled!==false,
    clientPortalEnabled:existingWork?.clientPortalEnabled!==false,
    operationalStartDate:OPERATIONAL_CUTOVER_DATE,
  };
  await saveWork(work);

  const response=await fetch('/data/villa-arauco-rupturas-final-2026-09-29.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível carregar a base histórica consolidada de rupturas.');
  const payload=await response.json() as BundledRupturePayload;
  const sourceRecords=bundledPayloadToRecords(payload,work);
  const reconciliation=reconcileRuptureRecords(sourceRecords,samples,work);

  const updatedById=new Map(reconciliation.updatedSamples.map(sample=>[sample.id,sample]));
  const historicalSamples=samples
    .filter(sample=>sample.workId===work.id && isLegacyOperationalRecord(sample,work.id))
    .map(sample=>finalizeHistoricalSample(updatedById.get(sample.id) || sample));

  if(historicalSamples.length)await saveSamplesBatch(historicalSamples);
  await replaceRuptureImportsForWork(work.id,reconciliation.records);

  const complementaryRows=reconciliation.summary.unmatchedRows+reconciliation.summary.ambiguousRows;
  const summary={
    samplesArchived:historicalSamples.length,
    sourceRows:reconciliation.summary.sourceRows,
    matchedRows:reconciliation.summary.matchedRows,
    matchedSamples:reconciliation.summary.matchedSamples,
    complementaryRows,
    cutoff:OPERATIONAL_CUTOVER_DATE,
    sourceHash:payload.sha256 || null,
  };
  await saveSystemMigration({
    id:HISTORICAL_BASELINE_ID,
    version:HISTORICAL_BASELINE_VERSION,
    workId:work.id,
    appliedAt:new Date().toISOString(),
    summary,
  });

  return {alreadyApplied:false,...summary};
}
