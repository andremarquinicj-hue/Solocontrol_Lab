export type Status = 'pendente' | 'em_execucao' | 'concluido' | 'atrasado';

export type PhotoKey = 'ficha' | 'coleta' | 'etiqueta' | 'rompimento' | 'prensa' | 'cpFinal';
export type SampleSource = 'manual' | 'historical_excel';
export type HistoricalState = 'concluido' | 'parcial' | 'sem_controle' | 'descartado';
export type ConcreteElement = 'RADIER' | 'PAREDES E LAJES' | 'OITÕES E PLATIBANDAS' | 'MURO DE ARRIMO' | string;
export type WorkMapMode = 'villa_arauco' | 'grid' | 'none';

export interface PhotoEvidence {
  key: PhotoKey;
  url: string;
  name: string;
  createdAt: string;
}

export interface RuptureEvent {
  id: string;
  ageDays: number;
  ageLabel?: string;
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
  source?: SampleSource;
  includeInOperations?: boolean;
  historicalState?: HistoricalState;
  importedSheet?: string;
  concreteNumber?: string;
  block?: string;
  lot?: string;
  reportNumber?: string;
  labSheet?: string;
  receivedAt: string;
  moldedAt: string;
  supplier?: string;
  invoice?: string;
  volumeM3?: string;
  aggregate?: string;
  slumpMm?: string;
  sampleType: 'Concreto' | 'Argamassa' | 'Graute' | 'Outro';
  element?: ConcreteElement;
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
  plannedUnits?: number;
  plannedVolumeM3?: number;
  plannedElements?: Record<string, number>;
  mapMode?: WorkMapMode;
  mapImage?: string;
  mapMaxLot?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
}
