import rawSnapshot from '@/public/data/villa-arauco-pictograma-2026-09-29.json';
import rawMapSnapshot from '@/public/data/villa-arauco-pictograma-map-2026-09-29.json';
import { Work } from './types';

export interface PictogramStatus {
  code: number;
  label: string;
  count: number | null;
}

export interface PictogramStage {
  sheet: string;
  totalUnits: number;
  statuses: PictogramStatus[];
  dateRange?: { first: string; last: string; dateCells: number } | null;
}

export interface VillaPictogramSnapshot {
  sourceFile: string;
  receivedAt: string;
  project: string;
  client: string;
  contractor: string;
  totalUnits: number;
  stages: PictogramStage[];
  houseConcrete: {
    sheet: string;
    label: string;
    total: number;
    byBlock: Record<string, number>;
    datedLots: Array<{ block: string; lot: string; date: string }>;
  };
}

export interface PictogramMapBlock {
  totalLots: number;
  radier?: { gabarito: number; concretado: number; muroArrimo: number };
  parede?: { armacao: number; concretada: number; oitao: number };
}

export interface VillaPictogramMapSnapshot {
  sourceFile: string;
  receivedAt: string;
  totalUnits: number;
  blocks: Record<string, PictogramMapBlock>;
  houseConcreteByBlock: Record<string, number>;
  exactLots: Array<{ block: string; lot: string; stage: string; date: string }>;
  notes?: string[];
}

export type MapViewMode = 'consolidated' | 'coplan' | 'solocontrol';

export const villaPictogram = rawSnapshot as VillaPictogramSnapshot;
export const villaPictogramMap = rawMapSnapshot as VillaPictogramMapSnapshot;

export function pictogramForWork(work?: Work) {
  if (!work) return undefined;
  const id = String(work.id || '').toLowerCase();
  const name = String(work.name || '').toLowerCase();
  if (id.includes('villa-arauco') || name.includes('villa arauco')) return villaPictogram;
  return undefined;
}

export function pictogramMapForWork(work?: Work) {
  if (!work) return undefined;
  const id = String(work.id || '').toLowerCase();
  const name = String(work.name || '').toLowerCase();
  if (id.includes('villa-arauco') || name.includes('villa arauco')) return villaPictogramMap;
  return undefined;
}

export function pictogramStage(snapshot: VillaPictogramSnapshot | undefined, sheet: string) {
  return snapshot?.stages.find(item => item.sheet === sheet);
}

export function pictogramStatus(snapshot: VillaPictogramSnapshot | undefined, sheet: string, label: string) {
  const stage = pictogramStage(snapshot, sheet);
  return stage?.statuses.find(item => item.label.toLowerCase() === label.toLowerCase());
}

export function pct(count: number | null | undefined, total: number | null | undefined) {
  if (!count || !total) return count === 0 ? 0 : undefined;
  return Math.min(100, (count / total) * 100);
}

export function villaConstructionHighlights(snapshot: VillaPictogramSnapshot | undefined) {
  if (!snapshot) return [];
  const items = [
    { key: 'earthwork', label: 'Terraplenagem concluída', source: 'TERRAPLENAGEM', status: 'Platos Concluidos' },
    { key: 'radier', label: 'Radier concretado', source: 'RADIER', status: 'Concretagem de Radier' },
    { key: 'walls', label: 'Paredes concretadas', source: 'PAREDE', status: 'Concretagem Parede' },
    { key: 'gables', label: 'Oitões concretados', source: 'PAREDE', status: 'Concretagem de Oitão' },
    { key: 'floor', label: 'Contrapiso', source: 'CONTRAPISO', status: 'Contrapiso' },
    { key: 'roof', label: 'Estrutura metálica / cobertura', source: 'EST. METÁLICA - COBERTURA', status: 'Estrutura Metálica' },
    { key: 'inspection', label: 'Verificação pós-desforma', source: 'INSPEÇÕES', status: 'Verificação Pós Desforma' },
  ];

  return items.map(item => {
    const match = pictogramStatus(snapshot, item.source, item.status);
    const count = match?.count ?? 0;
    return {
      ...item,
      count,
      total: snapshot.totalUnits,
      percent: pct(count, snapshot.totalUnits) ?? 0,
    };
  });
}

export function pictogramBlockProgress(snapshot: VillaPictogramMapSnapshot | undefined, block: string, element: string) {
  if (!snapshot) return undefined;
  const key = String(block || '').replace(/\D/g, '').padStart(2, '0');
  const blockData = snapshot.blocks[key];
  if (!blockData) return undefined;
  const normalized = String(element || '').toUpperCase();
  if (normalized.includes('RADIER')) return { completed: blockData.radier?.concretado ?? 0, total: blockData.totalLots, label: 'Radier' };
  if (normalized.includes('OIT') || normalized.includes('PLATIBANDA')) return { completed: blockData.parede?.oitao ?? 0, total: blockData.totalLots, label: 'Oitões / Platibandas' };
  if (normalized.includes('PAREDE') || normalized.includes('LAJE')) {
    const completed = snapshot.houseConcreteByBlock[key] ?? blockData.parede?.concretada ?? 0;
    return { completed, total: blockData.totalLots, label: 'Paredes / Lajes' };
  }
  if (normalized.includes('MURO')) return { completed: blockData.radier?.muroArrimo ?? 0, total: blockData.totalLots, label: 'Muros' };
  return undefined;
}

export function pictogramExactLot(snapshot: VillaPictogramMapSnapshot | undefined, block: string, lot: string, element: string) {
  if (!snapshot) return undefined;
  const b = String(block || '').replace(/\D/g, '').padStart(2, '0');
  const l = String(lot || '').replace(/\D/g, '').padStart(2, '0');
  const normalized = String(element || '').toUpperCase();
  const wall = snapshot.exactLots.find(item => item.block === b && item.lot === l && item.stage === 'PAREDES E LAJES');
  if ((normalized.includes('PAREDE') || normalized.includes('LAJE')) && wall) return { completed: true, date: wall.date, source: 'COPLAN' as const };
  // Uma casa com paredes/lajes concretadas necessariamente já passou pela etapa do radier.
  if (normalized.includes('RADIER') && wall) return { completed: true, date: wall.date, source: 'COPLAN' as const, inferredFrom: 'PAREDES E LAJES' };
  return undefined;
}

export function pictogramPreviewForElement(element: string) {
  const normalized = String(element || '').toUpperCase();
  if (normalized.includes('RADIER') || normalized.includes('MURO')) return '/pictograma-radier.png';
  if (normalized.includes('PAREDE') || normalized.includes('LAJE') || normalized.includes('OIT') || normalized.includes('PLATIBANDA')) return '/pictograma-parede.png';
  return '/pictograma-casa-concretada.png';
}
