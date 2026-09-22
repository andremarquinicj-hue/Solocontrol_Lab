'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { listSamples, listWorks } from '@/lib/store';
import { Sample, Work } from '@/lib/types';
import { VILLA_ARAUCO_DEFAULT_PROFILES } from '@/lib/process-profiles';

const STORAGE_KEY = 'solocontrol.selectedWorkId';

function virtualWorkFromSample(sample: Sample): Work {
  const isVilla = sample.workId === 'villa-arauco' || sample.workName.toUpperCase().includes('VILLA ARAUCO');
  return {
    id: sample.workId,
    number: isVilla ? 'VA' : '—',
    name: sample.workName,
    client: isVilla ? 'Arauco' : 'Cliente',
    contractor: isVilla ? 'COPLAN' : undefined,
    location: isVilla ? 'Inocência/MS' : undefined,
    defaultAges: isVilla ? [7, 28, 63] : [7, 14, 28],
    defaultRuptureAges: isVilla ? [{value:7,unit:'days'},{value:28,unit:'days'},{value:63,unit:'days'}] : [{value:7,unit:'days'},{value:14,unit:'days'},{value:28,unit:'days'}],
    processMode: isVilla ? 'villa_arauco' : 'generic',
    processProfiles: isVilla ? VILLA_ARAUCO_DEFAULT_PROFILES : undefined,
    active: true,
    plannedUnits: isVilla ? 620 : undefined,
    plannedElements: isVilla ? {
      'RADIER': 620,
      'PAREDES': 620,
      'LAJES': 620,
      'OITÕES E PLATIBANDAS': 620,
    } : undefined,
    mapMode: isVilla ? 'villa_arauco' : 'grid',
    mapImage: isVilla ? '/villa-arauco-planta.png' : undefined,
    mapMaxLot: isVilla ? 28 : undefined,
    controlAgeDays: 28,
    reserveAgeDays: 63,
    reserveReleaseThresholdPct: 100,
    reserveReleaseEnabled: true,
    tankName: 'Tanque 01',
  };
}

interface WorkScopeValue {
  works: Work[];
  selectedWorkId: string;
  selectedWork?: Work;
  setSelectedWorkId: (id: string) => void;
  refreshWorks: () => Promise<void>;
  loadingWorks: boolean;
}

const WorkScopeContext = createContext<WorkScopeValue | null>(null);

export function WorkScopeProvider({ children }: { children: ReactNode }) {
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWorkId, setSelectedWorkIdState] = useState('all');
  const [loadingWorks, setLoadingWorks] = useState(true);

  async function refreshWorks() {
    setLoadingWorks(true);
    try {
      const [savedWorks, samples] = await Promise.all([listWorks(), listSamples()]);
      const merged = new Map<string, Work>();

      for (const sample of samples) {
        if (sample.workId && !merged.has(sample.workId)) {
          merged.set(sample.workId, virtualWorkFromSample(sample));
        }
      }

      for (const work of savedWorks) {
        const virtual = merged.get(work.id);
        merged.set(work.id, { ...virtual, ...work });
      }

      const sorted = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setWorks(sorted);
    } finally {
      setLoadingWorks(false);
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedWorkIdState(stored);
    refreshWorks();
  }, []);

  function setSelectedWorkId(id: string) {
    setSelectedWorkIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const selectedWork = useMemo(
    () => works.find(work => work.id === selectedWorkId),
    [works, selectedWorkId],
  );

  useEffect(() => {
    if (!loadingWorks && selectedWorkId !== 'all' && works.length > 0 && !works.some(work => work.id === selectedWorkId)) {
      setSelectedWorkId('all');
    }
  }, [loadingWorks, selectedWorkId, works]);

  return (
    <WorkScopeContext.Provider value={{
      works,
      selectedWorkId,
      selectedWork,
      setSelectedWorkId,
      refreshWorks,
      loadingWorks,
    }}>
      {children}
    </WorkScopeContext.Provider>
  );
}

export function useWorkScope() {
  const value = useContext(WorkScopeContext);
  if (!value) throw new Error('useWorkScope must be used inside WorkScopeProvider');
  return value;
}
