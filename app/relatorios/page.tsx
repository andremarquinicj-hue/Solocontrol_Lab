'use client';
import Link from 'next/link';
import { CalendarDays, FileCheck2, FileText } from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';

export default function ReportsPage(){
  const[samples,setSamples]=useState<Sample[]>([]);const{selectedWorkId,selectedWork}=useWorkScope();
  useEffect(()=>{listSamples().then(setSamples)},[]);
  const scoped=useMemo(()=>samples.filter(s=>selectedWorkId==='all'||s.workId===selectedWorkId),[samples,selectedWorkId]);
  const approved=scoped.filter(s=>s.approvalStatus==='approved').length;
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">RELATÓRIOS</span><h1>Central de relatórios</h1><p>{selectedWorkId==='all'?'Todas as obras.':`Obra: ${selectedWork?.name||''}`}</p></div></section><section className="report-options"><Link className="panel report-option" href="/relatorios/diario"><CalendarDays/><div><b>Relatório diário</b><span>Ensaios, concretagens, locais de aplicação, volume e fotos do dia.</span></div></Link><div className="panel report-option"><FileCheck2/><div><b>{approved} relatório(s) aprovado(s)</b><span>Fluxo: resultado → conferência → aprovação técnica.</span></div></div><div className="panel report-option"><FileText/><div><b>{scoped.length} ficha(s) no filtro</b><span>Abra uma ficha para imprimir o relatório individual.</span></div></div></section><section className="panel"><div className="cards-list">{scoped.map(s=><Link href={`/amostras/${s.id}`} className="sample-card" key={s.id}><div><b>{s.labelBase}</b><small>{s.workName}</small></div><div><span>Status</span><b>{s.status}</b></div><div><span>Aprovação</span><b>{s.approvalStatus==='approved'?'Aprovado':s.approvalStatus==='review'?'Em conferência':'Rascunho'}</b></div><div><span>Rupturas</span><b>{s.ruptures.filter(r=>r.status==='concluido').length}/{s.ruptures.length}</b></div><span className="text-link">Abrir relatório</span></Link>)}{scoped.length===0&&<div className="empty-state"><b>Nenhum relatório neste filtro.</b><span>Selecione outra obra no topo.</span></div>}</div></section></div>
}
