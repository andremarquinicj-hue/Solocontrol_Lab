export const VILLA_ARAUCO_BLOCKS = [
  '01','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'
];

export const VILLA_ARAUCO_ELEMENTS = [
  'RADIER',
  'PAREDES E LAJES',
  'OITÕES E PLATIBANDAS',
  'MURO DE ARRIMO',
] as const;

export const CONTROL_ILLUMINATED_MAX_LOT = 28;

export function normalizeBlock(value?: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? digits.padStart(2, '0') : '';
}

export function extractLots(value?: string): string[] {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw || raw === '-') return [];
  const numbers = (raw.match(/\d+/g) || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!numbers.length) return [];

  // Expressões como "11 A 14" representam intervalo completo.
  if (/\bA\b|AT[EÉ]/.test(raw) && numbers.length >= 2) {
    const start = Math.min(numbers[0], numbers[1]);
    const end = Math.max(numbers[0], numbers[1]);
    return Array.from({length:end-start+1},(_,i)=>String(start+i).padStart(2,'0'));
  }

  // "01 E 18", "15/16/17" e formatos semelhantes representam lotes explícitos.
  return Array.from(new Set(numbers.map(n=>String(n).padStart(2,'0'))));
}

export function normalizeLot(value?: string) {
  return extractLots(value)[0] || String(value || '').trim().toUpperCase();
}
