'use client';

import * as XLSX from 'xlsx';
import { Sample, RuptureEvent, HistoricalState } from './types';
import { makeId } from './utils';
import { normalizeBlock, normalizeLot } from './villa-arauco';

const SHEET_MAP: Record<string, string> = {
  'CONTROLE DE CONC. - RADIER': 'RADIER',
  'CONTROLE DE CONC. - PAREDES': 'PAREDES E LAJES',
  'CONTROLE DE CONC. - OITÕES': 'OITÕES E PLATIBANDAS',
  'CONTROLE DE CONC. - MUROS': 'MURO DE ARRIMO',
};

export interface ImportSummary {
  rows: number;
  controlled: number;
  withoutControl: number;
  partial: number;
  discarded: number;
  volumeM3: number;
  firstDate?: string;
  lastDate?: string;
  byElement: Record<string, number>;
}

function excelDate(value: unknown): string {
  if (typeof value === 'number' && value > 20000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
  }
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0,10);
  const text = String(value ?? '').trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d,m,y] = text.split('/'); return `${y}-${m}-${d}`;
  }
  return '';
}

function numberFromCell(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim().replace(',', '.');
  const n = Number(text.match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : undefined;
}

function resultInfo(value: unknown, fallbackAgeDays: number, moldedAt: string): {event?: RuptureEvent; discarded?: boolean} {
  if (value === null || value === undefined || value === '' || value === '-') return {};
  const text = String(value).trim().toUpperCase();
  if (text.includes('DESCARTADO')) return { discarded: true };

  // Excel serial used as a future/expected rupture date, not a strength result.
  if (typeof value === 'number' && value > 20000) {
    const dueDate = excelDate(value);
    return { event: { id: makeId('rup'), ageDays: fallbackAgeDays, ageLabel: `${fallbackAgeDays} dias`, dueDate, status:'pendente', photos:[] } };
  }

  const explicitDays = text.match(/(\d+(?:[.,]\d+)?)\s*DIAS?/i);
  const explicitHours = text.match(/(\d+(?:[.,]\d+)?)\s*H(?:R|ORAS?)/i);
  const result = numberFromCell(value);
  if (result === undefined) return {};

  let ageDays = fallbackAgeDays;
  let ageLabel = fallbackAgeDays === 0.5 ? '12 horas' : `${fallbackAgeDays} dias`;
  if (explicitDays) {
    ageDays = Number(explicitDays[1].replace(',','.'));
    ageLabel = `${ageDays} dias`;
  } else if (explicitHours) {
    const hours = Number(explicitHours[1].replace(',','.'));
    ageDays = hours / 24;
    ageLabel = `${hours} horas`;
  }

  const d = new Date(`${moldedAt}T12:00:00`);
  d.setDate(d.getDate() + Math.round(ageDays));
  return {
    event: {
      id: makeId('rup'), ageDays, ageLabel,
      dueDate: d.toISOString().slice(0,10),
      status:'concluido', resistanceMpa: result,
      completedAt: d.toISOString(), photos:[], notes:'Resultado histórico importado do Excel.'
    }
  };
}

export async function parseHistoricalWorkbook(file: File): Promise<{samples: Sample[]; summary: ImportSummary}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type:'array', cellDates:false });
  const samples: Sample[] = [];
  let withoutControl = 0, partial = 0, discarded = 0, volumeM3 = 0;
  const byElement: Record<string, number> = {};
  const dates: string[] = [];

  for (const sheetName of Object.keys(SHEET_MAP)) {
    const sheet = workbook.Sheets[sheetName]; if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {header:1, raw:true, defval:null});
    const element = SHEET_MAP[sheetName];
    for (let i=1; i<rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(v=>v===null || v==='')) continue;
      const moldedAt = excelDate(r[1]);
      const block = normalizeBlock(r[2]);
      const lot = String(r[3] ?? '').trim();
      if (!moldedAt || !block || !lot) continue;

      const labReport = String(r[8] ?? '').trim();
      const labSheet = String(r[9] ?? '').trim();
      const isNoControl = labSheet.toUpperCase().includes('SEM CONTROLE') || !labReport;
      const volume = numberFromCell(r[7]) || 0;
      volumeM3 += volume;
      dates.push(moldedAt);
      byElement[element] = (byElement[element] || 0) + 1;

      const candidates = [
        resultInfo(r[10], 0.5, moldedAt),
        resultInfo(r[11], 7, moldedAt),
        resultInfo(r[12], 28, moldedAt),
        resultInfo(r[13], 63, moldedAt),
      ];
      const ruptures = candidates.flatMap(x=>x.event ? [x.event] : []);
      const wasDiscarded = candidates.some(x=>x.discarded);
      let historicalState: HistoricalState = 'concluido';
      if (isNoControl) { historicalState = 'sem_controle'; withoutControl++; }
      else if (ruptures.some(x=>x.status==='pendente')) { historicalState='parcial'; partial++; }
      if (wasDiscarded && ruptures.length === 0) { historicalState='descartado'; discarded++; }

      const normalizedLot = normalizeLot(lot);
      const base = labReport || `SEM-${block}-${normalizedLot}-${moldedAt}-${i}`;
      samples.push({
        id: `hist_${sheetName.replace(/\W+/g,'_')}_${i}_${String(base).replace(/\W+/g,'_')}`,
        workId:'villa-arauco', workName:'Villa Arauco', source:'historical_excel', includeInOperations:false,
        historicalState, importedSheet:sheetName,
        concreteNumber:String(r[0] ?? '').trim(), block, lot:String(r[3] ?? '').trim(),
        reportNumber:labReport || undefined, labSheet:labSheet || undefined,
        receivedAt:moldedAt, moldedAt,
        supplier:String(r[5] ?? '').trim() || undefined,
        invoice:String(r[6] ?? '').trim() || undefined,
        volumeM3: volume ? String(volume).replace('.',',') : undefined,
        sampleType:'Concreto', element, location:`Q${block} - L${normalizedLot}`,
        cpQuantity:0, labelBase:base, cpLabels:[],
        physicalLocation:'Arquivo Histórico', status:'concluido', photos:[], ruptures,
        notes:'Registro histórico importado da planilha de controle de concretagem. Evidências fotográficas não disponíveis na origem.',
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
      });
    }
  }
  dates.sort();
  return { samples, summary:{ rows:samples.length, controlled:samples.length-withoutControl, withoutControl, partial, discarded, volumeM3, firstDate:dates[0], lastDate:dates.at(-1), byElement } };
}

function valueForAge(sample: Sample, age: number): string | number {
  const r = sample.ruptures.find(x=>Math.abs(x.ageDays-age)<0.05);
  if (!r) return '-';
  if (r.resistanceMpa !== undefined) return Number(r.resistanceMpa.toFixed(2));
  if (r.dueDate) return r.dueDate;
  return '-';
}

export function exportControlWorkbook(samples: Sample[]) {
  const wb = XLSX.utils.book_new();
  const historical = samples.filter(s=>s.workId==='villa-arauco' || s.workName.toUpperCase().includes('ARAUCO'));
  const configs = [
    ['CONTROLE DE CONC. - RADIER','RADIER'],
    ['CONTROLE DE CONC. - PAREDES','PAREDES E LAJES'],
    ['CONTROLE DE CONC. - OITÕES','OITÕES E PLATIBANDAS'],
    ['CONTROLE DE CONC. - MUROS','MURO DE ARRIMO'],
  ];
  for (const [name, element] of configs) {
    const rows:any[][] = [[
      'Nº CONCRETAGEM','DATA CONCRETAGEM','QUADRA','LOTE','PAVIMENTO','CONCRETEIRA','Nº NF','M³','Nº LAUDO LABORATÓRIO','FOLHA LABORATÓRIO','12 HORAS','7 DIAS (Mpa)','28 DIAS (Mpa)','63 DIAS (Mpa)'
    ]];
    historical.filter(s=>String(s.element).toUpperCase()===element).sort((a,b)=>a.moldedAt.localeCompare(b.moldedAt)).forEach(s=>rows.push([
      s.concreteNumber || '', s.moldedAt, s.block || '', s.lot || '', s.element || '', s.supplier || '', s.invoice || '',
      Number(String(s.volumeM3||'0').replace(',','.')) || '', s.reportNumber || '', s.labSheet || (s.historicalState==='sem_controle'?'SEM CONTROLE':''),
      valueForAge(s,.5), valueForAge(s,7), valueForAge(s,28), valueForAge(s,63)
    ]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [10,13,9,9,24,16,10,9,20,18,14,14,14,14].map(wch=>({wch}));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0,31));
  }

  const blocks = ['01','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'];
  const mapRows:any[][] = [[null,'CONTROLE ILUMINADO',...blocks.map(q=>`Q.${q}`),'TOTAL DE CONCRETAGENS']];
  for (let lot=1; lot<=28; lot++) {
    const row:any[]=[null,null]; let total=0;
    for (const block of blocks) {
      const found = historical.some(s=>s.block===block && normalizeLot(s.lot)===String(lot).padStart(2,'0'));
      row.push(found ? `L.${String(lot).padStart(2,'0')}` : '-'); if(found) total++;
    }
    row.push(total); mapRows.push(row);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mapRows), 'CONTROLE ILUMINADO');
  XLSX.writeFile(wb, `CONTROLE_CONCRETAGEM_SOLOCONTROL_${new Date().toISOString().slice(0,10)}.xlsx`);
}
