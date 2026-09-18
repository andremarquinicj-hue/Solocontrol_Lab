import { Sample, TeamMember, Work } from './types';
import { addDays, isoToday, makeId, physicalLocationByDate } from './utils';

const today = isoToday();

export const demoWorks: Work[] = [
  { id: 'villa-arauco', number: 'VA', name: 'Villa Arauco', client: 'Arauco', location: 'Inocência/MS', defaultAges: [7, 14, 28], active: true, plannedUnits: 620, plannedElements: { 'RADIER': 620, 'PAREDES E LAJES': 620, 'OITÕES E PLATIBANDAS': 620 }, mapMode: 'villa_arauco', mapImage: '/villa-arauco-planta.png', mapMaxLot: 28 },
  { id: 'work-q21', number: '26', name: 'QD21 - L04', client: 'Cliente Demonstração', location: 'Obra', defaultAges: [7, 28], active: true }
];

export const demoTeam: TeamMember[] = [
  { id: 'lucas', name: 'Lucas', role: 'Laboratorista', active: true },
  { id: 'eduardo', name: 'Eduardo', role: 'Laboratorista', active: true },
  { id: 'fabiano', name: 'Fabiano', role: 'Laboratorista', active: true }
];

export const demoSamples: Sample[] = [
  {
    id: 'sample-demo-1',
    workId: 'work-q21',
    workName: 'QD21 - L04',
    reportNumber: '01',
    receivedAt: today,
    moldedAt: today,
    supplier: 'Concremix',
    invoice: '6300',
    volumeM3: '7,10',
    aggregate: '0',
    slumpMm: '160',
    sampleType: 'Concreto',
    element: 'Parede',
    location: 'QD21 - L04',
    cpQuantity: 6,
    labelBase: '010251-26',
    cpLabels: ['010251-26-1','010251-26-2','010251-26-3','010251-26-4','010251-26-5','010251-26-6'],
    fieldTechnician: 'Lucas',
    physicalLocation: physicalLocationByDate(addDays(today, 7)),
    status: 'em_andamento',
    photos: [],
    ruptures: [7,14,28].map((age) => ({ id: makeId('rup'), ageDays: age, dueDate: addDays(today, age), status: 'pendente', photos: [] })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
