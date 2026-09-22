'use client';

import Link from 'next/link';
import { Archive, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { archiveSample, deleteSample, listSamples } from '@/lib/store';
import { Sample } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useWorkScope } from '@/components/WorkScope';
import { useAuthScope } from '@/components/AuthScope';

export default function SamplesPage() {
  const [samples,setSamples]=useState<Sample[]>([]);const[q,setQ]=useState('');const[showArchived,setShowArchived]=useState(false);const[busy,setBusy]=useState<string>();
  const {selectedWorkId}=useWorkScope();const{can,isPilot}=useAuthScope();
  useEffect(()=>{listSamples().then(setSamples)},[]);
  const filtered=useMemo(()=>samples.filter(sample=>(selectedWorkId==='all'||sample.workId===selectedWorkId)&&(showArchived||!sample.archived)&&`${sample.labelBase} ${sample.workName} ${sample.reportNumber||''} ${sample.block||''} ${sample.lot||''} ${sample.invoice||''}`.toLowerCase().includes(q.toLowerCase())),[samples,q,selectedWorkId,showArchived]);
  async function archive(sample:Sample){if(!confirm(`Arquivar a ficha ${sample.labelBase}? O histórico será preservado.`))return;setBusy(sample.id);await archiveSample(sample);setSamples(await listSamples());setBusy(undefined)}
  async function remove(sample:Sample){if(!confirm(`Excluir PERMANENTEMENTE a ficha ${sample.labelBase}?`))return;setBusy(sample.id);await deleteSample(sample);setSamples(current=>current.filter(x=>x.id!==sample.id));setBusy(undefined)}
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">RASTREABILIDADE</span><h1>Amostras / Ensaios</h1><p>Pesquise por etiqueta, obra, laudo, quadra, lote ou nota fiscal.</p></div><Link href="/lancamento" className="button primary">+ Nova ficha</Link></section><section className="panel"><div className="sample-toolbar"><div className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar etiqueta, obra, laudo, Q/L ou NF..."/></div><label className="archive-toggle"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Mostrar arquivadas</label></div><div className="cards-list">{filtered.length===0&&<div className="empty-state"><b>Nenhuma ficha encontrada.</b><span>Cadastre uma nova ficha ou altere os filtros.</span></div>}{filtered.map(sample=><div key={sample.id} className={`sample-card ${sample.archived?'archived-card':''}`}><div><span className="label-kicker">ETIQUETA</span><strong>{sample.labelBase}</strong><small>{sample.workName}{sample.archived?' • Arquivada':''}</small></div><div><span>Moldagem</span><b>{formatDate(sample.moldedAt)}</b></div><div><span>Próxima ruptura</span><b>{formatDate(sample.ruptures.find(r=>r.status!=='concluido')?.dueDate)}</b></div><div><span>Local físico</span><b>{sample.physicalLocation}</b></div><span className={`status ${sample.archived?'pendente':sample.status==='concluido'?'concluido':'em_execucao'}`}>{sample.archived?'Arquivada':sample.status==='concluido'?'Concluído':'Em andamento'}</span><div className="sample-actions"><Link className="button secondary small" href={`/amostras/${sample.id}`}>Abrir</Link>{!sample.archived&&<button className="button ghost small" disabled={busy===sample.id} onClick={()=>archive(sample)}><Archive size={15}/>Arquivar</button>}{(isPilot||can('admin'))&&<button className="button danger small" disabled={busy===sample.id} onClick={()=>remove(sample)}><Trash2 size={15}/>Excluir</button>}</div></div>)}</div></section></div>
}
