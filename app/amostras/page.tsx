'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function SamplesPage(){
 const [samples,setSamples]=useState<Sample[]>([]); const [q,setQ]=useState(''); useEffect(()=>{listSamples().then(setSamples)},[]);
 const filtered=useMemo(()=>samples.filter(s=>`${s.labelBase} ${s.workName} ${s.reportNumber||''}`.toLowerCase().includes(q.toLowerCase())),[samples,q]);
 return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">RASTREABILIDADE</span><h1>Amostras / Ensaios</h1><p>Localize rapidamente por etiqueta, obra ou relatório.</p></div><Link href="/lancamento" className="button primary">+ Nova ficha</Link></section><section className="panel"><div className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar etiqueta, obra ou relatório..."/></div><div className="cards-list">{filtered.map(s=><Link href={`/amostras/${s.id}`} key={s.id} className="sample-card"><div><span className="label-kicker">ETIQUETA</span><strong>{s.labelBase}</strong><small>{s.workName}</small></div><div><span>Moldagem</span><b>{formatDate(s.moldedAt)}</b></div><div><span>Próxima ruptura</span><b>{formatDate(s.ruptures.find(r=>r.status!=='concluido')?.dueDate)}</b></div><div><span>Local físico</span><b>{s.physicalLocation}</b></div><span className={`status ${s.status==='concluido'?'concluido':'em_execucao'}`}>{s.status==='concluido'?'Concluído':'Em andamento'}</span></Link>)}</div></section></div>
}
