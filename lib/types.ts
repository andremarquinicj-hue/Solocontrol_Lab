export type Status = 'pendente' | 'em_execucao' | 'concluido' | 'atrasado';

export type PhotoKey = 'ficha' | 'coleta' | 'etiqueta' | 'rompimento' | 'prensa' | 'cpFinal' | 'naoConformidade' | 'descarte';
export type SampleSource = 'manual' | 'historical_excel' | 'rupture_excel';
export type HistoricalState = 'concluido' | 'parcial' | 'sem_controle' | 'descartado';
export type ConcreteElement = 'RADIER' | 'PAREDES E LAJES' | 'OITÕES E PLATIBANDAS' | 'MURO DE ARRIMO' | string;
export type WorkMapMode = 'villa_arauco' | 'custom' | 'grid' | 'none';
export type UserRole = 'admin' | 'coordinator' | 'technician' | 'engineer' | 'client';
export type SheetState = 'arquivo' | 'coordenador' | 'laboratorista' | 'prensa' | 'aguardando_lancamento' | 'arquivada';
export type ApprovalStatus = 'draft' | 'review' | 'approved';
export type NonConformityStatus = 'aberta' | 'em_tratamento' | 'encerrada';
export type RuptureImportMatchStatus = 'matched' | 'unmatched' | 'ambiguous';
export type AgeUnit = 'hours' | 'days';
export type ConcreteProcessType = 'RADIER' | 'PAREDES' | 'LAJE' | 'OITAO_PLATIBANDA' | 'OUTRO';
export type RupturePurpose = 'form_release' | 'control' | 'reserve' | 'other';
export type StrengthEvaluationMode = 'manual' | 'minimum' | 'average';

export interface RuptureAgeSpec {
  value: number;
  unit: AgeUnit;
}


export type SpecimenStatus =
  | 'armazenado'
  | 'rompido'
  | 'manter_reserva'
  | 'elegivel_descarte'
  | 'descartado';

export interface PhotoEvidence {
  key: PhotoKey;
  url: string;
  name: string;
  createdAt: string;
}

export interface RuptureMeasurement {
  specimenId?: string;
  specimenLabel?: string;
  load: number;
  loadUnit: 'kN' | 'tf' | 'kgf' | 'N';
  diameterMm: number;
  heightMm?: number;
  resistanceMpa: number;
  createdAt: string;
}

export interface RuptureEvent {
  id: string;
  ageDays: number; // valor normalizado em dias, mantido para compatibilidade
  ageValue?: number;
  ageUnit?: AgeUnit;
  ageLabel?: string;
  dueDate: string;
  dueAt?: string;
  purpose?: RupturePurpose;
  plannedCpCount?: number;
  rescheduleHistory?: Array<{
    fromLabel: string;
    fromDueAt?: string;
    toLabel: string;
    toDueAt?: string;
    reason: string;
    changedBy?: string;
    changedAt: string;
  }>;
  status: Status;
  responsible?: string;
  load?: number;
  loadUnit?: 'kN' | 'tf' | 'kgf' | 'N';
  diameterMm?: number;
  heightMm?: number;
  resistanceMpa?: number;
  measurements?: RuptureMeasurement[];
  importedResultsMpa?: number[];
  importSource?: string;
  specimenIds?: string[];
  completedAt?: string;
  notes?: string;
  equipmentId?: string;
  photos: PhotoEvidence[];
}

export interface ConcreteSpecimen {
  id: string;
  label: string;
  scheduledAgeDays: number; // valor normalizado em dias
  scheduledAgeValue?: number;
  scheduledAgeUnit?: AgeUnit;
  dueAt?: string;
  ruptureId?: string;
  status: SpecimenStatus;
  tankName?: string;
  tankPosition?: string;
  manualHold?: boolean;
  discardedAt?: string;
  discardedBy?: string;
  discardReason?: string;
  discardPhotoUrl?: string;
  updatedAt: string;
}

export interface RupturePlanItem {
  value: number;
  unit: AgeUnit;
  cpCount: number;
  purpose: RupturePurpose;
  allowRescheduleToHours?: number[];
}

export interface ConcreteProcessProfile {
  processType: ConcreteProcessType;
  label: string;
  elementGroup: string;
  cpTotal: number;
  slumpTargetCm?: number;
  slumpToleranceCm?: number;
  projectStrengthMpa?: number;
  formReleaseStrengthMpa?: number;
  formReleaseEvaluationMode?: StrengthEvaluationMode;
  controlEvaluationMode?: StrengthEvaluationMode;
  rupturePlan: RupturePlanItem[];
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
  collectedAt?: string;
  collectedTime?: string;
  moldedAt: string;
  moldedTime?: string;
  supplier?: string;
  invoice?: string;
  volumeM3?: string;
  aggregate?: string;
  slumpMm?: string;
  specifiedStrengthMpa?: number;
  sampleType: 'Concreto' | 'Argamassa' | 'Graute' | 'Outro';
  element?: ConcreteElement;
  processType?: ConcreteProcessType;
  location?: string;
  physicalFormNumber?: string;
  truckMixer?: string;
  vehiclePlate?: string;
  placementMethod?: string;
  plantDepartureTime?: string;
  siteArrivalTime?: string;
  slumpTestTime?: string;
  dischargeStartTime?: string;
  waterAddedLiters?: number;
  slumpActualCm?: number;
  slumpConformity?: 'within' | 'low' | 'high' | 'not_configured';
  cpQuantity: number;
  labelBase: string;
  cpLabels: string[];
  specimens?: ConcreteSpecimen[];
  fieldTechnician?: string;
  notes?: string;
  qualityDecision?: string;
  qualityObservation?: string;
  reserveDisposition?: 'discarded' | 'tested' | 'scheduled' | 'unknown';
  ruptureImportUpdatedAt?: string;
  physicalLocation: string;
  sheetState?: SheetState;
  sheetCustodian?: string;
  sheetMovementAt?: string;
  status: 'em_andamento' | 'concluido' | 'nao_conformidade';
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  archived?: boolean;
  archivedAt?: string;
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
  contractor?: string;
  location?: string;
  defaultAges: number[];
  defaultRuptureAges?: RuptureAgeSpec[];
  active: boolean;
  plannedUnits?: number;
  plannedVolumeM3?: number;
  plannedElements?: Record<string, number>;
  mapMode?: WorkMapMode;
  mapImage?: string;
  mapMaxLot?: number;
  clientPortalEnabled?: boolean;
  processMode?: 'villa_arauco' | 'generic';
  processProfiles?: Partial<Record<ConcreteProcessType, ConcreteProcessProfile>>;
  controlEvaluationMode?: StrengthEvaluationMode;

  // Critérios gerenciais para acompanhamento técnico.
  // Estes campos orientam alertas e triagem interna, não substituem critérios normativos/contratuais.
  defaultStrengthMpa?: number;
  controlAgeDays?: number;
  reserveAgeDays?: number;
  reserveReleaseThresholdPct?: number;
  reserveReleaseEnabled?: boolean;

  // Gestão física do tanque/câmara de cura.
  tankName?: string;
  tankCapacityCp?: number;
}


export interface RuptureImportResult {
  ageDays: number;
  dueDate?: string;
  resistanceMpa?: number;
}

export interface RuptureImportRecord {
  id: string;
  workId: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  identification?: string;
  supplier?: string;
  invoice?: string;
  concreteDate: string;
  projectMpa?: number;
  results: RuptureImportResult[];
  ap?: string;
  rp?: string;
  observation?: string;
  matchStatus: RuptureImportMatchStatus;
  matchedSampleId?: string;
  matchScore?: number;
  candidateSampleIds?: string[];
  importedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  active: boolean;
  skills?: Record<string, 'trained' | 'training' | 'not_trained'>;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  allowedWorkIds?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  entityType: 'sample' | 'work' | 'non_conformity' | 'equipment' | 'checklist' | 'auth' | 'rupture_import';
  entityId: string;
  workId?: string;
  sampleId?: string;
  action: string;
  description: string;
  actorUid?: string;
  actorName?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface NonConformity {
  id: string;
  workId: string;
  sampleId?: string;
  type: string;
  description: string;
  status: NonConformityStatus;
  responsible?: string;
  actionTaken?: string;
  photos: PhotoEvidence[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  assetNumber: string;
  serialNumber?: string;
  calibrationCertificate?: string;
  lastCalibration?: string;
  nextCalibration?: string;
  active: boolean;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
}

export interface DailyChecklist {
  id: string;
  date: string;
  workId: string;
  opening: ChecklistItem[];
  closing: ChecklistItem[];
  updatedAt: string;
}
