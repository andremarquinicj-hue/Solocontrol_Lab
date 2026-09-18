'use client';

import { collection, deleteDoc, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, ensureFirebaseUser, firebaseConfigured, storage } from './firebase';
import { demoSamples, demoTeam, demoWorks } from './demo-data';
import { Sample, TeamMember, Work } from './types';

const KEYS = { samples:'solocontrol.samples', works:'solocontrol.works', team:'solocontrol.team' };
function loadLocal<T>(key:string,fallback:T):T { if(typeof window==='undefined') return fallback; const raw=localStorage.getItem(key); if(!raw){localStorage.setItem(key,JSON.stringify(fallback));return fallback;} try{return JSON.parse(raw) as T}catch{return fallback} }
function saveLocal<T>(key:string,value:T){ if(typeof window!=='undefined') localStorage.setItem(key,JSON.stringify(value)); }

export async function listSamples():Promise<Sample[]> { if(firebaseConfigured&&db){await ensureFirebaseUser(); const snap=await getDocs(collection(db,'samples')); return snap.docs.map(d=>d.data() as Sample);} return loadLocal(KEYS.samples,demoSamples); }
export async function saveSample(sample:Sample){ if(firebaseConfigured&&db){await ensureFirebaseUser(); await setDoc(doc(db,'samples',sample.id),sample);} const current=loadLocal<Sample[]>(KEYS.samples,demoSamples); saveLocal(KEYS.samples,[sample,...current.filter(s=>s.id!==sample.id)]); }
export async function saveSamplesBatch(samples:Sample[]){ if(firebaseConfigured&&db){await ensureFirebaseUser(); for(let i=0;i<samples.length;i+=400){const batch=writeBatch(db); samples.slice(i,i+400).forEach(s=>batch.set(doc(db!,'samples',s.id),s)); await batch.commit();} return;} const current=loadLocal<Sample[]>(KEYS.samples,demoSamples); const ids=new Set(samples.map(s=>s.id)); saveLocal(KEYS.samples,[...samples,...current.filter(s=>!ids.has(s.id))]); }
export async function getSample(id:string){return (await listSamples()).find(s=>s.id===id)}
function evidenceUrls(s:Sample){return [...s.photos,...s.ruptures.flatMap(r=>r.photos)].map(p=>p.url).filter(Boolean)}
export async function deleteSample(sample:Sample){ if(firebaseConfigured){await ensureFirebaseUser(); if(storage) await Promise.all(evidenceUrls(sample).map(async u=>{if(!/^https?:|^gs:/.test(u))return;try{await deleteObject(ref(storage,u))}catch{}})); if(db) await deleteDoc(doc(db,'samples',sample.id));} saveLocal(KEYS.samples,loadLocal<Sample[]>(KEYS.samples,demoSamples).filter(s=>s.id!==sample.id)); }
export async function listWorks():Promise<Work[]>{if(firebaseConfigured&&db){await ensureFirebaseUser();const snap=await getDocs(collection(db,'works'));return snap.docs.map(d=>d.data() as Work);}return loadLocal(KEYS.works,demoWorks)}
export async function saveWork(work:Work){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'works',work.id),work)}const c=loadLocal<Work[]>(KEYS.works,demoWorks);saveLocal(KEYS.works,[work,...c.filter(w=>w.id!==work.id)])}
export async function listTeam():Promise<TeamMember[]>{if(firebaseConfigured&&db){await ensureFirebaseUser();const snap=await getDocs(collection(db,'team'));return snap.docs.map(d=>d.data() as TeamMember);}return loadLocal(KEYS.team,demoTeam)}
export async function saveTeamMember(member:TeamMember){if(firebaseConfigured&&db){await ensureFirebaseUser();await setDoc(doc(db,'team',member.id),member)}const c=loadLocal<TeamMember[]>(KEYS.team,demoTeam);saveLocal(KEYS.team,[member,...c.filter(m=>m.id!==member.id)])}
export async function uploadEvidence(file:File,path:string){if(firebaseConfigured&&storage){await ensureFirebaseUser();const safe=file.name.replace(/[^\w.\-]+/g,'-');const fileRef=ref(storage,`${path}/${Date.now()}-${safe}`);await uploadBytes(fileRef,file);return getDownloadURL(fileRef)}return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)})}
