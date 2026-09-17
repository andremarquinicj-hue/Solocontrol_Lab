export type Status = 'pendente' | 'em_execucao' | 'concluido' | 'atrasado';

export type PhotoKey =
  | 'ficha'
  | 'coleta'
  | 'etiqueta'
  | 'rompimento'
  | 'prensa'
  | 'cpFinal';

export interface PhotoEvidence {
  key: PhotoKey;
  url: string;
  name: string;
  createdAt: string;
}

export interface RuptureEvent {
  id: string;
  ageDays: number;
  dueDate: string;
  status: Status;
  responsible?: string;
  load?: number;
  loadUnit?: 'kN' | 'tf' | 'kgf' | 'N';
  diameterMm?: number;
  heightMm?: number;
  resistanceMpa?: number;
  completedAt?: string;
  notes?: string;
  photos: PhotoEvidence[];
}

export interface Sample {
  id: string;
  workId: string;
  workName: string;
  reportNumber?: string;
  receivedAt: string;
  moldedAt: string;
  supplier?: string;
  invoice?: string;
  volumeM3?: string;
  aggregate?: string;
  slumpMm?: string;
  sampleType: 'Concreto' | 'Argamassa' | 'Graute' | 'Outro';
  element?: string;
  location?: string;
  cpQuantity: number;
  labelBase: string;
  cpLabels: string[];
  fieldTechnician?: string;
  notes?: string;
  physicalLocation: string;
  status: 'em_andamento' | 'concluido' | 'nao_conformidade';
  photos: PhotoEvidence[];
  ruptures: RuptureEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Work {
  id: string;
  number: string;
  name: string;
  client: string;
  location?: string;
  defaultAges: number[];
  active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}
