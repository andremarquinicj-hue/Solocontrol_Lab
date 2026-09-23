'use client';

import { Users } from 'lucide-react';
import { useEffect,useState } from 'react';
import { listTeam,saveTeamMember } from '@/lib/store';
import { TeamMember } from '@/lib/types';
import { makeId } from '@/lib/utils';

const skills=['Slump','Moldagem de CP','Ruptura','Argamassa','Blocos','Prismas','Arrancamento','Módulo de elasticidade'];
const labels={trained:'Treinado',training:'Em treinamento',not_trained:'Não treinado'} as const;

export default function TeamPage(){
  const [team,setTeam]=useState<TeamMember[]>([]);const[name,setName]=useState('');
  async function load(){const data=await listTeam();const order=['Lucas','Fabiano','Ederson','Rafael','Eduardo','Ismael','Leonardo','Bruno'];setTeam([...data].sort((a,b)=>{const ai=order.indexOf(a.name),bi=order.indexOf(b.name);if(ai>=0||bi>=0)return (ai<0?999:ai)-(bi<0?999:bi);return a.name.localeCompare(b.name,'pt-BR')}))}useEffect(()=>{load()},[]);
  async function add(){if(!name)return;await saveTeamMember({id:makeId('team'),name,role:'Laboratorista',active:true,skills:{}});setName('');load()}
  async function skill(member:TeamMember,key:string,value:'trained'|'training'|'not_trained'){await saveTeamMember({...member,skills:{...(member.skills||{}),[key]:value}});await load()}
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">EQUIPE E CAPACITAÇÃO</span><h1>Laboratoristas</h1><p>Cadastre a equipe e mantenha pelo menos duas pessoas aptas nas atividades críticas.</p></div></section><section className="two-columns"><div className="panel"><h2>Novo colaborador</h2><label>Nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do laboratorista"/></label><button className="button primary" onClick={add}>Adicionar</button></div><div className="panel"><div className="panel-header"><div><h2>Equipe ativa</h2><p>{team.filter(m=>m.active).length} colaborador(es)</p></div><Users/></div>{team.map(m=><div className="simple-row" key={m.id}><div><b>{m.name}</b><span>{m.role}</span></div><span className="status concluido">Ativo</span></div>)}</div></section><section className="panel"><div className="panel-header"><div><h2>Matriz de treinamento</h2><p>✅ Treinado • 🟡 Em treinamento • ○ Não treinado.</p></div></div><div className="table-wrap"><table className="training-table"><thead><tr><th>Colaborador</th>{skills.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{team.map(member=><tr key={member.id}><td><b>{member.name}</b></td>{skills.map(s=>{const value=member.skills?.[s]||'not_trained';return <td key={s}><select value={value} onChange={e=>skill(member,s,e.target.value as any)}><option value="trained">✅ {labels.trained}</option><option value="training">🟡 {labels.training}</option><option value="not_trained">○ {labels.not_trained}</option></select></td>})}</tr>)}</tbody></table></div></section></div>
}
