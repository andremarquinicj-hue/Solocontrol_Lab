'use client';

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, ensureFirebaseUser, firebaseConfigured, storage } from './firebase';
import { demoSamples, demoTeam, demoWorks } from './demo-data';
import {
  AuditEvent,
  DailyChecklist,
  Equipment,
  NonConformity,
  RuptureImportRecord,
  Sample,
  TeamMember,
  UserProfile,
  Work,
} from './types';
import { makeId } from './utils';

const KEYS = {
  samples: 'solocontrol.samples',
  works: 'solocontrol.works',
  team: 'solocontrol.team',
  audits: 'solocontrol.audits',
  nonConformities: 'solocontrol.nonConformities',
  equipment: 'solocontrol.equipment',
  checklists: 'solocontrol.checklists',
  users: 'solocontrol.users',
  ruptureImports: 'solocontrol.ruptureImports',
  systemMigrations: 'solocontrol.systemMigrations',
};

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
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function cleanForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function actor() {
  const user = auth?.currentUser;
  return {
    actorUid: user?.uid,
    actorName: user?.email || (user?.isAnonymous ? 'Coordenação (piloto)' : 'Usuário'),
  };
}

export async function logAudit(input: Omit<AuditEvent, 'id' | 'createdAt' | 'actorUid' | 'actorName'> & { actorName?: string }) {
  const who = await actor();
  const event: AuditEvent = cleanForFirestore({
    ...input,
    id: makeId('audit'),
    createdAt: new Date().toISOString(),
    actorUid: who.actorUid,
    actorName: input.actorName || who.actorName,
  });

  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      await setDoc(doc(db, 'audit', event.id), event);
    } catch (error) {
      console.warn('Falha ao gravar auditoria no Firebase:', error);
    }
  }
  const current = loadLocal<AuditEvent[]>(KEYS.audits, []);
  saveLocal(KEYS.audits, [event, ...current].slice(0, 5000));
  return event;
}


export interface SystemMigrationMarker {
  id: string;
  appliedAt: string;
  version: string;
  workId?: string;
  summary?: Record<string, string | number | boolean | null>;
}

export async function getSystemMigration(id:string):Promise<SystemMigrationMarker|undefined>{
  if(firebaseConfigured&&db){
    try{
      await ensureFirebaseUser();
      const snap=await getDoc(doc(db,'systemMigrations',id));
      if(snap.exists())return snap.data() as SystemMigrationMarker;
    }catch(error){console.warn('Falha ao consultar migração do sistema:',error)}
  }
  const current=loadLocal<Record<string,SystemMigrationMarker>>(KEYS.systemMigrations,{});
  return current[id];
}

export async function saveSystemMigration(marker:SystemMigrationMarker){
  if(firebaseConfigured&&db){
    await ensureFirebaseUser();
    await setDoc(doc(db,'systemMigrations',marker.id),cleanForFirestore(marker));
  }
  const current=loadLocal<Record<string,SystemMigrationMarker>>(KEYS.systemMigrations,{});
  saveLocal(KEYS.systemMigrations,{...current,[marker.id]:marker});
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      const snap = await getDocs(collection(db, 'audit'));
      const data = snap.docs.map(d => d.data() as AuditEvent).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      saveLocal(KEYS.audits, data);
      return data;
    } catch {}
  }
  return loadLocal<AuditEvent[]>(KEYS.audits, []);
}

export async function listSamples(): Promise<Sample[]> {
  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      const snap = await getDocs(collection(db, 'samples'));
      const data = snap.docs.map(d => d.data() as Sample);
      saveLocal(KEYS.samples, data);
      return data;
    } catch (error) {
      console.warn('Usando cache local de amostras:', error);
    }
  }
  return loadLocal(KEYS.samples, demoSamples);
}

export async function saveSample(sample: Sample, auditDescription = 'Ficha atualizada') {
  const cleaned = cleanForFirestore(sample);
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    await setDoc(doc(db, 'samples', sample.id), cleaned);
  }
  const current = loadLocal<Sample[]>(KEYS.samples, demoSamples);
  saveLocal(KEYS.samples, [sample, ...current.filter(s => s.id !== sample.id)]);
  await logAudit({ entityType:'sample', entityId:sample.id, sampleId:sample.id, workId:sample.workId, action:'save', description:auditDescription });
}

export async function saveSamplesBatch(samples: Sample[]) {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    for (let i = 0; i < samples.length; i += 400) {
      const batch = writeBatch(db);
      samples.slice(i, i + 400).forEach(sample => batch.set(doc(db!, 'samples', sample.id), cleanForFirestore(sample)));
      await batch.commit();
    }
  } else {
    const current = loadLocal<Sample[]>(KEYS.samples, demoSamples);
    const ids = new Set(samples.map(s => s.id));
    saveLocal(KEYS.samples, [...samples, ...current.filter(s => !ids.has(s.id))]);
  }
  await logAudit({ entityType:'sample', entityId:'batch', action:'historical_import', description:`${samples.length} registro(s) importado(s)` });
}

export async function getSample(id: string) {
  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      const snap = await getDoc(doc(db,'samples',id));
      if(snap.exists()) return snap.data() as Sample;
    } catch {}
  }
  return (await listSamples()).find(s => s.id === id);
}

function evidenceUrls(sample: Sample) {
  return [
    ...sample.photos.map(p=>p.url),
    ...sample.ruptures.flatMap(r=>r.photos.map(p=>p.url)),
    ...(sample.specimens||[]).map(cp=>cp.discardPhotoUrl).filter((url):url is string=>Boolean(url)),
  ].filter(Boolean);
}

export async function archiveSample(sample: Sample) {
  const updated: Sample = { ...sample, archived:true, archivedAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
  await saveSample(updated, 'Ficha arquivada');
  return updated;
}

export async function deleteSample(sample: Sample) {
  await logAudit({ entityType:'sample', entityId:sample.id, sampleId:sample.id, workId:sample.workId, action:'delete', description:`Ficha ${sample.labelBase} excluída permanentemente` });
  if (firebaseConfigured) {
    await ensureFirebaseUser();
    const currentStorage = storage;
    if (currentStorage) await Promise.allSettled(evidenceUrls(sample).map(async url => {
      if (!/^https?:|^gs:/.test(url)) return;
      try { await deleteObject(ref(currentStorage, url)); } catch {}
    }));
    if (db) await deleteDoc(doc(db, 'samples', sample.id));
  }
  saveLocal(KEYS.samples, loadLocal<Sample[]>(KEYS.samples, demoSamples).filter(s => s.id !== sample.id));
}

export async function listWorks(): Promise<Work[]> {
  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      const snap = await getDocs(collection(db, 'works'));
      const data = snap.docs.map(d => d.data() as Work);
      saveLocal(KEYS.works, data);
      return data;
    } catch {}
  }
  return loadLocal(KEYS.works, demoWorks);
}

export async function saveWork(work: Work) {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    await setDoc(doc(db, 'works', work.id), cleanForFirestore(work));
  }
  const current = loadLocal<Work[]>(KEYS.works, demoWorks);
  saveLocal(KEYS.works, [work, ...current.filter(w => w.id !== work.id)]);
  await logAudit({ entityType:'work', entityId:work.id, workId:work.id, action:'save', description:`Obra ${work.name} atualizada` });
}

export async function deleteWork(workId: string, { deleteLinkedSamples = true }: { deleteLinkedSamples?: boolean } = {}) {
  const linkedSamples = (await listSamples()).filter(sample => sample.workId === workId);
  if (firebaseConfigured) {
    await ensureFirebaseUser();
    if (deleteLinkedSamples && linkedSamples.length) {
      const currentStorage = storage;
      if (currentStorage) {
        await Promise.allSettled(linkedSamples.flatMap(evidenceUrls).map(async url => {
          if (!/^https?:|^gs:/.test(url)) return;
          try { await deleteObject(ref(currentStorage, url)); } catch {}
        }));
      }
      if (db) {
        for (let i = 0; i < linkedSamples.length; i += 400) {
          const batch = writeBatch(db);
          linkedSamples.slice(i, i + 400).forEach(sample => batch.delete(doc(db!, 'samples', sample.id)));
          await batch.commit();
        }
      }
    }
    if (db) await deleteDoc(doc(db, 'works', workId));
  }
  saveLocal(KEYS.works, loadLocal<Work[]>(KEYS.works, demoWorks).filter(work => work.id !== workId));
  if (deleteLinkedSamples) saveLocal(KEYS.samples, loadLocal<Sample[]>(KEYS.samples, demoSamples).filter(sample => sample.workId !== workId));
  const linkedImports=(await listRuptureImports()).filter(item=>item.workId===workId);
  if(firebaseConfigured&&db&&linkedImports.length){
    for(let i=0;i<linkedImports.length;i+=400){
      const batch=writeBatch(db);
      linkedImports.slice(i,i+400).forEach(item=>batch.delete(doc(db!,'ruptureImports',item.id)));
      await batch.commit();
    }
  }
  saveLocal(KEYS.ruptureImports,loadLocal<RuptureImportRecord[]>(KEYS.ruptureImports,[]).filter(item=>item.workId!==workId));
  await logAudit({ entityType:'work', entityId:workId, workId, action:'delete', description:`Obra excluída com ${deleteLinkedSamples ? linkedSamples.length : 0} registro(s) vinculado(s)` });
  return { deletedSamples: deleteLinkedSamples ? linkedSamples.length : 0 };
}

function normalizedPersonName(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function mergeDefaultTeam(current:TeamMember[]){
  const byName=new Set(current.map(member=>normalizedPersonName(member.name)));
  const missing=demoTeam.filter(member=>!byName.has(normalizedPersonName(member.name)));
  return {merged:[...current,...missing],missing};
}

export async function listTeam(): Promise<TeamMember[]> {
  if (firebaseConfigured && db) {
    try {
      await ensureFirebaseUser();
      const snap = await getDocs(collection(db, 'team'));
      const current = snap.docs.map(d => d.data() as TeamMember);
      const {merged,missing}=mergeDefaultTeam(current);
      if(missing.length){
        await Promise.all(missing.map(member=>setDoc(doc(db!,'team',member.id),cleanForFirestore(member))));
      }
      saveLocal(KEYS.team, merged);
      return merged;
    } catch {}
  }
  const current=loadLocal<TeamMember[]>(KEYS.team,demoTeam);
  const {merged}=mergeDefaultTeam(current);
  saveLocal(KEYS.team,merged);
  return merged;
}

export async function saveTeamMember(member: TeamMember) {
  if (firebaseConfigured && db) {
    await ensureFirebaseUser();
    await setDoc(doc(db, 'team', member.id), cleanForFirestore(member));
  }
  const current = loadLocal<TeamMember[]>(KEYS.team, demoTeam);
  saveLocal(KEYS.team, [member, ...current.filter(m => m.id !== member.id)]);
}

export async function uploadEvidence(file: File, path: string) {
  if (firebaseConfigured && storage) {
    await ensureFirebaseUser();
    const safe = file.name.replace(/[^\w.\-]+/g, '-');
    const fileRef = ref(storage, `${path}/${Date.now()}-${safe}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export async function listRuptureImports(): Promise<RuptureImportRecord[]> {
  if(firebaseConfigured&&db){
    try{
      await ensureFirebaseUser();
      const snap=await getDocs(collection(db,'ruptureImports'));
      const data=snap.docs.map(d=>d.data() as RuptureImportRecord).sort((a,b)=>b.concreteDate.localeCompare(a.concreteDate));
      saveLocal(KEYS.ruptureImports,data);
      return data;
    }catch(error){console.warn('Usando cache local de importações de ruptura:',error)}
  }
  return loadLocal<RuptureImportRecord[]>(KEYS.ruptureImports,[]);
}

export async function replaceRuptureImportsForWork(workId:string,records:RuptureImportRecord[]) {
  const current=await listRuptureImports();
  const linked=current.filter(item=>item.workId===workId);
  if(firebaseConfigured&&db){
    await ensureFirebaseUser();
    for(let i=0;i<linked.length;i+=400){
      const batch=writeBatch(db);
      linked.slice(i,i+400).forEach(item=>batch.delete(doc(db!,'ruptureImports',item.id)));
      await batch.commit();
    }
  }
  saveLocal(KEYS.ruptureImports,current.filter(item=>item.workId!==workId));
  await saveRuptureImportsBatch(records);
}

export async function saveRuptureImportsBatch(records:RuptureImportRecord[]) {
  if(firebaseConfigured&&db){
    await ensureFirebaseUser();
    for(let i=0;i<records.length;i+=400){
      const batch=writeBatch(db);
      records.slice(i,i+400).forEach(item=>batch.set(doc(db!,'ruptureImports',item.id),cleanForFirestore(item)));
      await batch.commit();
    }
  }else{
    const current=loadLocal<RuptureImportRecord[]>(KEYS.ruptureImports,[]);
    const ids=new Set(records.map(r=>r.id));
    saveLocal(KEYS.ruptureImports,[...records,...current.filter(r=>!ids.has(r.id))]);
  }
  await logAudit({entityType:'rupture_import',entityId:'batch',action:'rupture_import',description:`${records.length} linha(s) da planilha de rupturas preservadas`});
}

export async function listNonConformities(): Promise<NonConformity[]> {
  if(firebaseConfigured&&db){try{await ensureFirebaseUser();const snap=await getDocs(collection(db,'nonConformities'));const data=snap.docs.map(d=>d.data() as NonConformity);saveLocal(KEYS.nonConformities,data);return data}catch{}}
  return loadLocal<NonConformity[]>(KEYS.nonConformities,[]);
}
export async function saveNonConformity(item: NonConformity){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'nonConformities',item.id),cleanForFirestore(item))}const current=loadLocal<NonConformity[]>(KEYS.nonConformities,[]);saveLocal(KEYS.nonConformities,[item,...current.filter(x=>x.id!==item.id)]);await logAudit({entityType:'non_conformity',entityId:item.id,workId:item.workId,sampleId:item.sampleId,action:'save',description:`Não conformidade ${item.status}`})}
export async function deleteNonConformity(id:string){if(firebaseConfigured&&db){await ensureFirebaseUser();await deleteDoc(doc(db,'nonConformities',id))}saveLocal(KEYS.nonConformities,loadLocal<NonConformity[]>(KEYS.nonConformities,[]).filter(x=>x.id!==id))}

export async function listEquipment():Promise<Equipment[]>{if(firebaseConfigured&&db){try{await ensureFirebaseUser();const snap=await getDocs(collection(db,'equipment'));const data=snap.docs.map(d=>d.data() as Equipment);saveLocal(KEYS.equipment,data);return data}catch{}}return loadLocal<Equipment[]>(KEYS.equipment,[])}
export async function saveEquipment(item:Equipment){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'equipment',item.id),cleanForFirestore(item))}const current=loadLocal<Equipment[]>(KEYS.equipment,[]);saveLocal(KEYS.equipment,[item,...current.filter(x=>x.id!==item.id)]);await logAudit({entityType:'equipment',entityId:item.id,action:'save',description:`Equipamento ${item.name} atualizado`})}
export async function deleteEquipment(id:string){if(firebaseConfigured&&db){await ensureFirebaseUser();await deleteDoc(doc(db,'equipment',id))}saveLocal(KEYS.equipment,loadLocal<Equipment[]>(KEYS.equipment,[]).filter(x=>x.id!==id))}

export async function listChecklists():Promise<DailyChecklist[]>{if(firebaseConfigured&&db){try{await ensureFirebaseUser();const snap=await getDocs(collection(db,'checklists'));const data=snap.docs.map(d=>d.data() as DailyChecklist);saveLocal(KEYS.checklists,data);return data}catch{}}return loadLocal<DailyChecklist[]>(KEYS.checklists,[])}
export async function saveChecklist(item:DailyChecklist){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'checklists',item.id),cleanForFirestore(item))}const current=loadLocal<DailyChecklist[]>(KEYS.checklists,[]);saveLocal(KEYS.checklists,[item,...current.filter(x=>x.id!==item.id)]);}

export async function listUserProfiles():Promise<UserProfile[]>{if(firebaseConfigured&&db){try{await ensureFirebaseUser();const snap=await getDocs(collection(db,'users'));const data=snap.docs.map(d=>d.data() as UserProfile);saveLocal(KEYS.users,data);return data}catch{}}return loadLocal<UserProfile[]>(KEYS.users,[])}
export async function saveUserProfile(profile:UserProfile){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'users',profile.uid),cleanForFirestore(profile))}const current=loadLocal<UserProfile[]>(KEYS.users,[]);saveLocal(KEYS.users,[profile,...current.filter(x=>x.uid!==profile.uid)])}

export async function getBackupSnapshot(){
  const [samples,works,team,audit,nonConformities,equipment,checklists,users,ruptureImports]=await Promise.all([listSamples(),listWorks(),listTeam(),listAuditEvents(),listNonConformities(),listEquipment(),listChecklists(),listUserProfiles(),listRuptureImports()]);
  return {generatedAt:new Date().toISOString(),version:'0.9.0',samples,works,team,audit,nonConformities,equipment,checklists,users,ruptureImports};
}
