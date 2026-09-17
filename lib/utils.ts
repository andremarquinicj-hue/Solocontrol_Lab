export function isoToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDays(dateIso: string, days: number) {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(dateIso?: string) {
  if (!dateIso) return '—';
  const [y, m, d] = dateIso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR').format(new Date(y, m - 1, d));
}

export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, '').replace(/--+/g, '-').toUpperCase();
}

export function pressureMpa(load: number, unit: 'kN' | 'tf' | 'kgf' | 'N', diameterMm: number) {
  if (!load || !diameterMm) return 0;
  const newtons = unit === 'kN' ? load * 1000 : unit === 'tf' ? load * 9806.65 : unit === 'kgf' ? load * 9.80665 : load;
  const area = Math.PI * Math.pow(diameterMm, 2) / 4;
  return newtons / area;
}

export function physicalLocationByDate(dateIso: string) {
  const day = Number(dateIso.slice(8, 10));
  return `Arquivo Ativo > Dia ${String(day).padStart(2, '0')}`;
}
