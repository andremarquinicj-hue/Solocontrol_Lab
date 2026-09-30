'use client';

import * as XLSX from 'xlsx';
import { RuptureEvent, RuptureImportRecord, Sample, Work } from './types';
import { mean, ruptureResults } from './technical-analysis';
import { normalizeElementGroup } from './work-analytics';
import { makeId } from './utils';

export interface RuptureImportSummary {
  sourceRows: number;
  matchedRows: number;
  matchedSamples: number;
  unmatchedRows: number;
  ambiguousRows: number;
  projectMpaRows: number;
  firstDate?: string;
  lastDate?: string;
}

export interface RuptureReconciliation {
  records: RuptureImportRecord[];
  updatedSamples: Sample[];
  summary: RuptureImportSummary;
}

export interface BundledRupturePayload {
  sourceFile: string;
  receivedAt: string;
  sha256?: string;
  workHint?: string;
  recordCount: number;
  period?: { first?: string; last?: string };
  records: Array<{
    sourceSheet: string;
    sourceRow: number;
    identification?: string;
    supplier?: string;
    invoice?: string;
    concreteDate: string;
    projectMpa?: number;
    results: Array<{ ageDays: number; dueDate?: string | null; resistanceMpa?: number | null }>;
    ap?: string | null;
    rp?: string | null;
    observation?: string | null;
  }>;
}

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function numberFromCell(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const text = cleanText(value).replace(',', '.');
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function excelDate(value: unknown): string {
  if (typeof value === 'number' && value > 20000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0,10);
  const text = cleanText(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d,m,y] = text.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0,10);
  return '';
}

function normalizeInvoice(value?: string) {
  let text = cleanText(value).toUpperCase().replace(/\s+/g,'');
  if (/^\d+\.0$/.test(text)) text = text.slice(0,-2);
  return text;
}

function normalizeSupplier(value?: string) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
}

function deterministicId(workId: string, sourceFile: string, sourceSheet: string, sourceRow: number) {
  const seed = `${workId}_${sourceFile}_${sourceSheet}_${sourceRow}`.replace(/[^a-zA-Z0-9_-]+/g,'_');
  return `rupimp_${seed}`.slice(0,480);
}

function rowToRecord(
  row: unknown[],
  sourceFile: string,
  sourceSheet: string,
  sourceRow: number,
  workId: string,
): RuptureImportRecord | undefined {
  const identification = cleanText(row[0]);
  const concreteDate = excelDate(row[3]);
  const invoice = cleanText(row[2]);
  if (!concreteDate || (!identification && !invoice)) return undefined;

  const results = [
    { ageDays:7, dueDate:excelDate(row[5]) || undefined, resistanceMpa:numberFromCell(row[6]) },
    { ageDays:28, dueDate:excelDate(row[7]) || undefined, resistanceMpa:numberFromCell(row[8]) },
    { ageDays:63, dueDate:excelDate(row[9]) || undefined, resistanceMpa:numberFromCell(row[10]) },
  ];

  return {
    id: deterministicId(workId, sourceFile, sourceSheet, sourceRow),
    workId,
    sourceFile,
    sourceSheet,
    sourceRow,
    identification: identification || undefined,
    supplier: cleanText(row[1]) || undefined,
    invoice: invoice || undefined,
    concreteDate,
    projectMpa: numberFromCell(row[4]),
    results,
    ap: cleanText(row[11]) || undefined,
    rp: cleanText(row[12]) || undefined,
    observation: cleanText(row[13]) || undefined,
    matchStatus:'unmatched',
    importedAt:new Date().toISOString(),
  };
}

function looksLikeRuptureSheet(rows: unknown[][]) {
  const header = rows.slice(0,6).flat().map(v=>cleanText(v).toUpperCase());
  return header.some(v=>v.includes('MPA DE PROJETO'))
    && header.some(v=>v.includes('DATA CONCRETAGEM'))
    && header.some(v=>v.includes('TENSÃO') || v.includes('TENSAO'));
}

export async function isRuptureControlWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer,{type:'array',cellDates:false});
  return workbook.SheetNames.some(name=>{
    const sheet=workbook.Sheets[name];
    const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:null});
    return looksLikeRuptureSheet(rows);
  });
}

export async function parseRuptureControlWorkbook(file: File, work: Work): Promise<RuptureImportRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer,{type:'array',cellDates:false});
  const records:RuptureImportRecord[]=[];

  for (const sourceSheet of workbook.SheetNames) {
    const sheet=workbook.Sheets[sourceSheet];
    const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:null});
    if(!looksLikeRuptureSheet(rows))continue;

    const headerIndex=rows.findIndex(row=>row.some(cell=>cleanText(cell).toUpperCase()==='IDENTIFICAÇÃO' || cleanText(cell).toUpperCase()==='IDENTIFICACAO'));
    const start=headerIndex>=0?headerIndex+1:3;
    for(let i=start;i<rows.length;i++){
      const record=rowToRecord(rows[i],file.name,sourceSheet,i+1,work.id);
      if(record)records.push(record);
    }
  }

  if(!records.length)throw new Error('Nenhuma linha de controle de rupturas foi reconhecida neste arquivo.');
  return records;
}

export function bundledPayloadToRecords(payload: BundledRupturePayload, work: Work): RuptureImportRecord[] {
  return payload.records.map(item=>({
    id:deterministicId(work.id,payload.sourceFile,item.sourceSheet,item.sourceRow),
    workId:work.id,
    sourceFile:payload.sourceFile,
    sourceSheet:item.sourceSheet,
    sourceRow:item.sourceRow,
    identification:item.identification || undefined,
    supplier:item.supplier || undefined,
    invoice:item.invoice || undefined,
    concreteDate:item.concreteDate,
    projectMpa:item.projectMpa,
    results:item.results.map(result=>({
      ageDays:result.ageDays,
      dueDate:result.dueDate || undefined,
      resistanceMpa:result.resistanceMpa ?? undefined,
    })),
    ap:item.ap || undefined,
    rp:item.rp || undefined,
    observation:item.observation || undefined,
    matchStatus:'unmatched',
    importedAt:new Date().toISOString(),
  }));
}

function sampleDate(sample: Sample) {
  return sample.collectedAt || sample.moldedAt;
}

function sourceGroupCompatible(record: RuptureImportRecord, sample: Sample) {
  const sheet=record.sourceSheet.toUpperCase();
  const element=normalizeElementGroup(sample.element);
  if(sheet.includes('PAREDE')) return ['PAREDES','LAJES','PAREDES E LAJES','OITÕES E PLATIBANDAS'].includes(element);
  if(sheet.includes('RADIER')) return ['RADIER','MURO DE ARRIMO'].includes(element);
  return true;
}

function existingAgeValue(sample: Sample, ageDays: number) {
  const rupture=sample.ruptures.find(r=>Math.abs(r.ageDays-ageDays)<0.05);
  return mean(ruptureResults(rupture));
}

function candidateScore(record: RuptureImportRecord, sample: Sample) {
  let score=0;
  let compared=0;
  if(record.supplier && sample.supplier && normalizeSupplier(record.supplier)!==normalizeSupplier(sample.supplier))score+=15;

  for(const result of record.results){
    if(result.resistanceMpa===undefined)continue;
    const existing=existingAgeValue(sample,result.ageDays);
    if(existing===undefined)continue;
    score+=Math.abs(result.resistanceMpa-existing);
    compared++;
  }

  if(compared===0)score+=8;
  if(sample.historicalState==='sem_controle' && record.results.some(r=>r.resistanceMpa!==undefined))score+=6;
  return score;
}

function chooseCandidate(record: RuptureImportRecord, candidates: Sample[]) {
  if(candidates.length===1)return {sample:candidates[0],score:candidateScore(record,candidates[0]),ambiguous:false};
  const ranked=candidates
    .map(sample=>({sample,score:candidateScore(record,sample)}))
    .sort((a,b)=>a.score-b.score);
  const best=ranked[0];
  const second=ranked[1];
  const clear=(second.score-best.score>=3) || (best.score<=3 && second.score>best.score+0.5);
  return {sample:clear?best.sample:undefined,score:best.score,ambiguous:!clear,candidates:ranked.map(x=>x.sample.id)};
}

function appendUnique(base: string | undefined, extra: string | undefined) {
  if(!extra)return base;
  if(!base)return extra;
  if(base.includes(extra))return base;
  return `${base}\n${extra}`;
}

function importedEvent(
  existing: RuptureEvent | undefined,
  ageDays: number,
  dueDate: string | undefined,
  values: number[],
  sourceFile: string,
): RuptureEvent | undefined {
  if(!existing && !dueDate && !values.length)return undefined;
  const average=values.length?values.reduce((a,b)=>a+b,0)/values.length:undefined;
  const id=existing?.id || makeId('rup');
  return {
    ...(existing || {
      id,
      ageDays,
      ageValue:ageDays,
      ageUnit:'days' as const,
      ageLabel:`${ageDays} dias`,
      dueDate:dueDate || '',
      status:'pendente' as const,
      photos:[],
    }),
    dueDate:dueDate || existing?.dueDate || '',
    status:values.length?'concluido':(existing?.status || 'pendente'),
    resistanceMpa:average ?? existing?.resistanceMpa,
    importedResultsMpa:values.length?values:existing?.importedResultsMpa,
    importSource:sourceFile,
    completedAt:values.length?(dueDate?`${dueDate}T12:00:00.000Z`:existing?.completedAt || new Date().toISOString()):existing?.completedAt,
    notes:appendUnique(existing?.notes,`Resultado atualizado a partir de ${sourceFile}.`),
    photos:existing?.photos || [],
  };
}

function applyRecordsToSample(sample: Sample, records: RuptureImportRecord[]) {
  const sourceFile=records[0]?.sourceFile || 'Planilha de rupturas';
  const byAge=new Map<number,{dates:string[];values:number[]}>();
  for(const record of records){
    for(const result of record.results){
      const current=byAge.get(result.ageDays) || {dates:[],values:[]};
      if(result.dueDate)current.dates.push(result.dueDate);
      if(result.resistanceMpa!==undefined)current.values.push(result.resistanceMpa);
      byAge.set(result.ageDays,current);
    }
  }

  let ruptures=[...sample.ruptures];
  for(const age of [7,28,63]){
    const group=byAge.get(age);
    if(!group)continue;
    const existing=ruptures.find(r=>Math.abs(r.ageDays-age)<0.05);
    const dates=Array.from(new Set(group.dates)).sort();
    const event=importedEvent(existing,age,dates[0],group.values,sourceFile);
    if(!event)continue;
    ruptures=existing?ruptures.map(r=>r.id===existing.id?event:r):[...ruptures,event];
  }

  const observations=Array.from(new Set(records.map(r=>r.observation).filter(Boolean) as string[]));
  const aps=records.map(r=>r.ap).filter(v=>v&&v!=='-') as string[];
  const rps=records.map(r=>r.rp).filter(v=>v&&v!=='-') as string[];
  const projectMpa=records.map(r=>r.projectMpa).find(v=>v!==undefined);
  const has63Result=records.some(r=>r.results.some(x=>x.ageDays===63&&x.resistanceMpa!==undefined));
  const has63Date=records.some(r=>r.results.some(x=>x.ageDays===63&&x.dueDate));
  const discardMention=observations.some(text=>/DESCART/i.test(text));
  const ncMention=observations.some(text=>/\bNC[-\s]?\d|N[AÃ]O\s*CONFORM/i.test(text)) || rps.length>0;

  const qualityDecision=rps[0] || aps[0] || sample.qualityDecision;
  const qualityObservation=observations.reduce((text,item)=>appendUnique(text,item),sample.qualityObservation);
  const reserveDisposition=has63Result?'tested':discardMention?'discarded':has63Date?'scheduled':sample.reserveDisposition;

  return {
    ...sample,
    collectedAt:sample.collectedAt || sample.moldedAt,
    specifiedStrengthMpa:projectMpa ?? sample.specifiedStrengthMpa,
    qualityDecision,
    qualityObservation,
    reserveDisposition,
    status:ncMention?'nao_conformidade':sample.status,
    ruptures:ruptures.sort((a,b)=>a.ageDays-b.ageDays),
    ruptureImportUpdatedAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
  } satisfies Sample;
}

export function reconcileRuptureRecords(
  inputRecords: RuptureImportRecord[],
  samples: Sample[],
  work: Work,
): RuptureReconciliation {
  const scoped=samples.filter(sample=>sample.workId===work.id);
  const index=new Map<string,Sample[]>();
  for(const sample of scoped){
    const invoice=normalizeInvoice(sample.invoice);
    if(!invoice || invoice==='-' || invoice==='S/N' || invoice==='SN')continue;
    const key=`${sampleDate(sample)}|${invoice}`;
    index.set(key,[...(index.get(key)||[]),sample]);
  }

  const records:RuptureImportRecord[]=[];
  const matchedGroups=new Map<string,RuptureImportRecord[]>();

  for(const source of inputRecords){
    const invoice=normalizeInvoice(source.invoice);
    const key=`${source.concreteDate}|${invoice}`;
    const rawCandidates=invoice && !['-','S/N','SN'].includes(invoice)?(index.get(key)||[]):[];
    const candidates=rawCandidates.filter(sample=>sourceGroupCompatible(source,sample));

    if(!candidates.length){
      records.push({...source,matchStatus:'unmatched',matchedSampleId:undefined,candidateSampleIds:undefined,importedAt:new Date().toISOString()});
      continue;
    }

    const chosen=chooseCandidate(source,candidates);
    if(!chosen.sample){
      records.push({...source,matchStatus:'ambiguous',matchScore:chosen.score,candidateSampleIds:chosen.candidates,importedAt:new Date().toISOString()});
      continue;
    }

    const matched={...source,matchStatus:'matched' as const,matchedSampleId:chosen.sample.id,matchScore:chosen.score,candidateSampleIds:undefined,importedAt:new Date().toISOString()};
    records.push(matched);
    matchedGroups.set(chosen.sample.id,[...(matchedGroups.get(chosen.sample.id)||[]),matched]);
  }

  const sampleById=new Map(scoped.map(sample=>[sample.id,sample]));
  const updatedSamples:Array<Sample>=[];
  for(const [sampleId,matched] of Array.from(matchedGroups.entries())){
    const sample=sampleById.get(sampleId);
    if(sample)updatedSamples.push(applyRecordsToSample(sample,matched));
  }

  const dates=records.map(r=>r.concreteDate).filter(Boolean).sort();
  const summary:RuptureImportSummary={
    sourceRows:records.length,
    matchedRows:records.filter(r=>r.matchStatus==='matched').length,
    matchedSamples:updatedSamples.length,
    unmatchedRows:records.filter(r=>r.matchStatus==='unmatched').length,
    ambiguousRows:records.filter(r=>r.matchStatus==='ambiguous').length,
    projectMpaRows:records.filter(r=>r.projectMpa!==undefined).length,
    firstDate:dates[0],
    lastDate:dates.at(-1),
  };

  return {records,updatedSamples,summary};
}
