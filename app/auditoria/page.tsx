'use client';

import { History, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkScope } from '@/components/WorkScope';
import { listAuditEvents } from '@/lib/store';
import { AuditEvent } from '@/lib/types';

export default function AuditPage(){
  const {selectedWorkId}=useWorkScope();
  const [items,setItems]=useState<AuditEvent[]>([]);const[q,setQ]=useState('');
  useEffect(()=>{listAuditEvents().then(setItems)},[]);
  const filtered=useMemo(()=>items.filter(x=>(selectedWorkId==='all'||!x.workId||x.workId===selectedWorkId)&&`${x.description} ${x.actorName||''} ${x.action}`.toLowerCase().includes(q.toLowerCase())).slice(0,1000),[items,selectedWorkId,q]);
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">AUDITORIA</span><h1>Histórico de alterações</h1><p>Quem fez, o que fez e quando fez. Eventos de exclusão permanecem no histórico.</p></div></section><section className="panel"><div className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar alteração, usuário ou ação..."/></div><div className="audit-list">{filtered.map(item=><div key={item.id}><div className="audit-icon"><History size={16}/></div><div><b>{item.description}</b><span>{item.action} • {item.entityType}</span></div><div className="audit-meta"><b>{item.actorName||'Usuário'}</b><span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span></div></div>)}{filtered.length===0&&<div className="empty-state"><b>Nenhum evento localizado.</b></div>}</div></section></div>
}
