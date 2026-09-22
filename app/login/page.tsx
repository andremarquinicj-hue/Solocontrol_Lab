'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, LogIn } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useAuthScope } from '@/components/AuthScope';

export default function LoginPage(){
  const { login, logout, profile, isPilot } = useAuthScope();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault(); setLoading(true); setMessage('');
    try{await login(email,password);setMessage('Login realizado. Você já pode voltar ao sistema.')}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível entrar.')}finally{setLoading(false)}
  }

  return <main className="auth-page">
    <section className="auth-card">
      <Image src="/logo-solocontrol.png" width={230} height={115} alt="Solocontrol" priority/>
      <span className="eyebrow">ACESSO SEGURO</span>
      <h1>Solocontrol Lab</h1>
      <p>Entre com sua conta nominal para registrar autoria, aprovações e histórico de alterações.</p>
      <form onSubmit={submit} className="auth-form">
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="seuemail@solocontrol..."/></label>
        <label>Senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <button className="button primary full" disabled={loading}><LogIn size={17}/>{loading?'Entrando...':'Entrar'}</button>
      </form>
      {message&&<div className="import-message">{message}</div>}
      <div className="pilot-box"><LockKeyhole size={18}/><div><b>{isPilot?'Modo piloto ativo':'Conta identificada'}</b><span>{isPilot?'O sistema continua utilizável com autenticação anônima enquanto os usuários nominais são configurados no Firebase.':`Usuário atual: ${profile.name}`}</span></div></div>
      <div className="auth-actions"><Link className="button secondary" href="/">Voltar ao sistema</Link><Link className="button ghost" href="/portal-cliente">Portal do Cliente</Link>{!isPilot&&<button className="button danger" onClick={logout}>Sair da conta</button>}</div>
    </section>
  </main>
}
