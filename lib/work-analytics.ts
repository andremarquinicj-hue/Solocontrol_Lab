import { Sample, Work } from './types';
import { extractLots, normalizeLot } from './villa-arauco';

export const ELEMENT_GROUPS = [
  'RADIER',
  'PAREDES',
  'LAJES',
  'OITÕES E PLATIBANDAS',
  'PAREDES E LAJES',
  'MURO DE ARRIMO',
] as const;

export function normalizeElementGroup(value?: string): string {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return 'OUTROS';
  if (v.includes('RADIER')) return 'RADIER';
  if (v.includes('PAREDES E LAJES') || v.includes('PAREDE/LAJE')) return 'PAREDES E LAJES';
  if (v.includes('PAREDE')) return 'PAREDES';
  if (v.includes('LAJE')) return 'LAJES';
  if (v.includes('OIT') || v.includes('PLATIBANDA')) return 'OITÕES E PLATIBANDAS';
  if (v.includes('MURO')) return 'MURO DE ARRIMO';
  return v;
}

export function sampleCollectionDate(sample: Sample): string {
  return sample.collectedAt || sample.moldedAt;
}

export function sampleVolume(sample: Sample): number {
  return Number(String(sample.volumeM3 || '0').replace(',', '.')) || 0;
}

export function sampleUnitKeys(sample: Sample): string[] {
  const block = String(sample.block || '').replace(/\D/g, '').padStart(2, '0');
  const lots = extractLots(sample.lot);
  if (block && lots.length) return lots.map(lot => `${block}-${lot}`);
  const lot = normalizeLot(sample.lot);
  if (block && lot) return [`${block}-${lot}`];
  if (sample.location) return [sample.location.trim().toUpperCase()];
  return [sample.id];
}

export function uniqueConcreteUnits(samples: Sample[], element?: string): number {
  const filtered = element
    ? samples.filter(s => normalizeElementGroup(s.element) === element)
    : samples;
  return new Set(filtered.flatMap(sampleUnitKeys)).size;
}

export function completedTests(samples: Sample[]): number {
  return samples.reduce(
    (total, sample) => total + sample.ruptures.filter(r =>
      r.status === 'concluido' && (
        r.resistanceMpa !== undefined ||
        Boolean(r.measurements?.length) ||
        Boolean(r.importedResultsMpa?.length)
      )
    ).length,
    0,
  );
}

export function uniqueReports(samples: Sample[]): number {
  return new Set(samples.map(s => s.reportNumber).filter(Boolean)).size;
}

export function workSamples(samples: Sample[], workId: string): Sample[] {
  return workId === 'all' ? samples : samples.filter(s => s.workId === workId);
}

export interface WorkProgressItem {
  element: string;
  completed: number;
  target?: number;
  percent?: number;
}

export function elementProgress(samples: Sample[], work?: Work): WorkProgressItem[] {
  const present = new Set(samples.map(s => normalizeElementGroup(s.element)));
  const configured = Object.keys(work?.plannedElements || {});
  const all = Array.from(new Set([...ELEMENT_GROUPS, ...configured, ...Array.from(present)]))
    .filter(x => x !== 'OUTROS');

  return all.map(element => {
    const completed = uniqueConcreteUnits(samples, element);
    const explicitTarget = work?.plannedElements?.[element];
    const fallbackTarget = ['RADIER','PAREDES','LAJES','PAREDES E LAJES','OITÕES E PLATIBANDAS'].includes(element)
      ? work?.plannedUnits
      : undefined;
    const target = explicitTarget && explicitTarget > 0 ? explicitTarget : fallbackTarget;
    return {
      element,
      completed,
      target,
      percent: target ? Math.min(100, (completed / target) * 100) : undefined,
    };
  });
}

export function overallProgress(samples: Sample[], work?: Work): number | undefined {
  const withTarget = elementProgress(samples, work).filter(x => x.target && x.target > 0);
  if (!withTarget.length) return undefined;
  const totalDone = withTarget.reduce((a, x) => a + Math.min(x.completed, x.target || 0), 0);
  const totalTarget = withTarget.reduce((a, x) => a + (x.target || 0), 0);
  return totalTarget ? (totalDone / totalTarget) * 100 : undefined;
}

export function formatElementLabel(element: string): string {
  if (element === 'PAREDES') return 'Paredes';
  if (element === 'LAJES') return 'Lajes';
  if (element === 'PAREDES E LAJES') return 'Paredes / Lajes (histórico)';
  if (element === 'OITÕES E PLATIBANDAS') return 'Oitões / Platibandas';
  if (element === 'MURO DE ARRIMO') return 'Muros';
  if (element === 'RADIER') return 'Radier';
  return element;
}
