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

export function normalizeLot(value?: string) {
  const raw = String(value || '').trim().toUpperCase();
  const first = raw.match(/\d+/)?.[0];
  return first ? first.padStart(2, '0') : raw;
}
