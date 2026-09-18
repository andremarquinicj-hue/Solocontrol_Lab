'use client';
import Link from 'next/link';
import { useEffect,useMemo,useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';

export default function ReportsPage(){
  const[samples,setSamples]=useState<Sample[]>([]);
  const { selectedWorkId, selectedWork } = useWorkScope();
  useEffect(()=>{listSamples().then(setSamples)},[]);
  const scoped=useMemo(()=>selectedWorkId==='all'?samples:samples.filter(s=>s.workId===selectedWorkId),[samples,selectedWorkId]);
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">RELATÓRIOS</span><h1>Central de relatórios</h1><p>{selectedWorkId==='all'?'Todas as obras.':`Obra: ${selectedWork?.name || ''}`}</p></div></section><section className="panel"><div className="cards-list">{scoped.map(s=><Link href={`/amostras/${s.id}`} className="sample-card" key={s.id}><div><b>{s.labelBase}</b><small>{s.workName}</small></div><div><span>Status</span><b>{s.status}</b></div><div><span>Rupturas</span><b>{s.ruptures.filter(r=>r.status==='concluido').length}/{s.ruptures.length}</b></div><span className="text-link">Abrir relatório</span></Link>)}{scoped.length===0&&<div className="empty-state"><b>Nenhum relatório neste filtro.</b><span>Selecione outra obra no topo.</span></div>}</div></section></div>
}
