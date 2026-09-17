'use client';

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, ensureFirebaseUser, firebaseConfigured, storage } from './firebase';
import { demoSamples, demoTeam, demoWorks } from './demo-data';
import { Sample, TeamMember, Work } from './types';

const KEYS = { samples: 'solocontrol.samples', works: 'solocontrol.works', team: 'solocontrol.team' };

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function listSamples(): Promise<Sample[]> {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    const snap = await getDocs(collection(db, 'samples'));
    if (!snap.empty) return snap.docs.map((d) => d.data() as Sample);
  }
  return loadLocal(KEYS.samples, demoSamples);
}

export async function saveSample(sample: Sample): Promise<void> {
  if (firebaseConfigured && db) { await ensureFirebaseUser(); await setDoc(doc(db, 'samples', sample.id), sample); }
  const current = loadLocal<Sample[]>(KEYS.samples, demoSamples);
  const next = [sample, ...current.filter((s) => s.id !== sample.id)];
  saveLocal(KEYS.samples, next);
}

export async function getSample(id: string): Promise<Sample | undefined> {
  return (await listSamples()).find((s) => s.id === id);
}

export async function listWorks(): Promise<Work[]> {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    const snap = await getDocs(collection(db, 'works'));
    if (!snap.empty) return snap.docs.map((d) => d.data() as Work);
  }
  return loadLocal(KEYS.works, demoWorks);
}

export async function saveWork(work: Work): Promise<void> {
  if (firebaseConfigured && db) { await ensureFirebaseUser(); await setDoc(doc(db, 'works', work.id), work); }
  const current = loadLocal<Work[]>(KEYS.works, demoWorks);
  saveLocal(KEYS.works, [work, ...current.filter((w) => w.id !== work.id)]);
}

export async function listTeam(): Promise<TeamMember[]> {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    const snap = await getDocs(collection(db, 'team'));
    if (!snap.empty) return snap.docs.map((d) => d.data() as TeamMember);
  }
  return loadLocal(KEYS.team, demoTeam);
}

export async function saveTeamMember(member: TeamMember): Promise<void> {
  if (firebaseConfigured && db) { await ensureFirebaseUser(); await setDoc(doc(db, 'team', member.id), member); }
  const current = loadLocal<TeamMember[]>(KEYS.team, demoTeam);
  saveLocal(KEYS.team, [member, ...current.filter((m) => m.id !== member.id)]);
}

export async function uploadEvidence(file: File, path: string): Promise<string> {
  if (firebaseConfigured && storage) {
    await ensureFirebaseUser();
    const fileRef = ref(storage, `${path}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }
  return fileToDataUrl(file);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
