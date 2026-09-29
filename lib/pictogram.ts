import rawSnapshot from '@/public/data/villa-arauco-pictograma-2026-09-29.json';
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

export const villaPictogram = rawSnapshot as VillaPictogramSnapshot;

export function pictogramForWork(work?: Work) {
  if (!work) return undefined;
  const id = String(work.id || '').toLowerCase();
  const name = String(work.name || '').toLowerCase();
  if (id.includes('villa-arauco') || name.includes('villa arauco')) return villaPictogram;
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
