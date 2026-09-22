import { RuptureAgeSpec, RuptureEvent } from './types';

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


export function parseAgeSpecToken(token: string): RuptureAgeSpec | undefined {
  const text = token.trim().toLowerCase().replace(',', '.');
  if (!text) return undefined;

  const hour = text.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas)$/i);
  if (hour) {
    const value = Number(hour[1]);
    return value > 0 ? { value, unit: 'hours' } : undefined;
  }

  const day = text.match(/^(\d+(?:\.\d+)?)\s*(d|dia|dias)$/i);
  if (day) {
    const value = Number(day[1]);
    return value > 0 ? { value, unit: 'days' } : undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const value = Number(text);
    return value > 0 ? { value, unit: 'days' } : undefined;
  }

  return undefined;
}

export function ageSpecToDays(spec: RuptureAgeSpec) {
  return spec.unit === 'hours' ? spec.value / 24 : spec.value;
}

export function ageSpecKey(spec: RuptureAgeSpec) {
  return `${spec.value}${spec.unit === 'hours' ? 'h' : 'd'}`;
}

export function ageSpecLabel(spec: RuptureAgeSpec) {
  if (spec.unit === 'hours') return `${spec.value} ${spec.value === 1 ? 'hora' : 'horas'}`;
  return `${spec.value} ${spec.value === 1 ? 'dia' : 'dias'}`;
}

function localDateTimeString(date: Date) {
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  const h=String(date.getHours()).padStart(2,'0');
  const min=String(date.getMinutes()).padStart(2,'0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function scheduleFromAge(dateIso: string, timeHHMM: string | undefined, spec: RuptureAgeSpec) {
  const [y,m,d]=dateIso.split('-').map(Number);
  const [hh,mm]=(timeHHMM || '12:00').split(':').map(Number);
  const date=new Date(y,m-1,d,Number.isFinite(hh)?hh:12,Number.isFinite(mm)?mm:0,0,0);
  const hours = spec.unit === 'hours' ? spec.value : spec.value * 24;
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  const local=localDateTimeString(date);
  // Horário exato só é persistido quando a moldagem tem hora informada.
  // Para idades em dias sem horário, a agenda continua diária e não vira
  // "atrasada" artificialmente ao meio-dia.
  const dueAt = timeHHMM ? local : undefined;
  return { dueAt, dueDate: local.slice(0,10) };
}

export function formatDateTimeLocal(value?: string) {
  if (!value) return '—';
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
}

export function ruptureAgeSpec(rupture: RuptureEvent): RuptureAgeSpec {
  if (rupture.ageValue && rupture.ageUnit) return { value: rupture.ageValue, unit: rupture.ageUnit };
  if (rupture.ageLabel) {
    const parsed=parseAgeSpecToken(rupture.ageLabel);
    if (parsed) return parsed;
  }
  return { value: rupture.ageDays, unit: 'days' };
}

export function ruptureAgeLabel(rupture: RuptureEvent) {
  return rupture.ageLabel || ageSpecLabel(ruptureAgeSpec(rupture));
}

export function ruptureScheduleLabel(rupture: RuptureEvent) {
  return rupture.dueAt ? formatDateTimeLocal(rupture.dueAt) : formatDate(rupture.dueDate);
}

export function localNowKey() {
  return localDateTimeString(new Date());
}

export function isRuptureOverdue(rupture: RuptureEvent) {
  if (rupture.status === 'concluido') return false;
  if (rupture.dueAt) return rupture.dueAt < localNowKey();
  return rupture.dueDate < isoToday();
}
