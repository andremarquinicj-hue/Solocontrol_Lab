'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Archive, BarChart3, Bell, Building2, Calculator, ClipboardCheck, ClipboardList, FileSearch,
  FileSpreadsheet, FileText, FlaskConical, Gauge, History, LogIn, MapPinned, Menu,
  ScanLine, Settings, ShieldAlert, Users, Wrench, X, MonitorSmartphone
} from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useWorkScope } from './WorkScope';
import { useAuthScope } from './AuthScope';
import { listSamples } from '@/lib/store';
import { isoToday, isRuptureOverdue } from '@/lib/utils';
import HistoricalBaselineMigration from './HistoricalBaselineMigration';

const internalLinks = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/coordenacao', label: 'Central do Coordenador', icon: ClipboardCheck },
  { href: '/amostras', label: 'Amostras / Ensaios', icon: FlaskConical },
  { href: '/lancamento', label: 'Lançamento rápido', icon: ClipboardList },
  { href: '/scanner', label: 'Ler etiqueta', icon: ScanLine },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { href: '/mapa', label: 'Mapa da Obra', icon: MapPinned },
  { href: '/historico', label: 'Importar / Exportar', icon: FileSpreadsheet },
  { href: '/nao-conformidades', label: 'Não conformidades', icon: ShieldAlert },
  { href: '/equipamentos', label: 'Equipamentos', icon: Wrench },
  { href: '/tanque', label: 'Gestão do Tanque', icon: Archive },
  { href: '/equipe', label: 'Equipe', icon: Users },
  { href: '/calculadoras', label: 'Calculadoras', icon: Calculator },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
  { href: '/auditoria', label: 'Auditoria', icon: History },
  { href: '/executivo', label: 'Visão Executiva', icon: Gauge },
  { href: '/acessos', label: 'Acessos', icon: FileSearch },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/portal-cliente', label: 'Portal do Cliente', icon: MonitorSmartphone },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(0);
  const { works, selectedWorkId, setSelectedWorkId, loadingWorks } = useWorkScope();
  const { profile, isPilot } = useAuthScope();

  const publicLayout = pathname.startsWith('/login') || pathname.startsWith('/portal-cliente');

  useEffect(()=>{
    if(publicLayout)return;
    listSamples().then(samples=>{
      const today=isoToday();
      const scoped=(selectedWorkId==='all'?samples:samples.filter(s=>s.workId===selectedWorkId))
        .filter(s=>!s.archived&&s.includeInOperations!==false&&s.source!=='historical_excel');
      setAlerts(scoped.flatMap(s=>s.ruptures).filter(r=>r.status!=='concluido'&&(r.dueDate===today||isRuptureOverdue(r))).length);
    }).catch(()=>{});
  },[selectedWorkId,pathname,publicLayout]);

  const links = useMemo(()=>internalLinks.filter(link=>{
    if(profile.role==='client') return false;
    if(profile.role==='technician') return !['/obras','/historico','/auditoria','/executivo','/acessos','/configuracoes'].includes(link.href);
    if(profile.role==='engineer') return !['/acessos'].includes(link.href);
    return true;
  }),[profile.role]);

  if(publicLayout) return <>{children}</>;

  const technicianBlocked = profile.role==='technician' && ['/obras','/historico','/auditoria','/executivo','/acessos','/configuracoes'].some(route=>pathname.startsWith(route));
  const engineerBlocked = profile.role==='engineer' && pathname.startsWith('/acessos');
  if(profile.role==='client') return <main className="access-denied"><Image src="/logo-solocontrol.png" width={220} height={110} alt="Solocontrol"/><h1>Acesso do cliente</h1><p>Seu perfil é somente leitura. Utilize o Portal do Cliente para acompanhar as obras liberadas.</p><Link href="/portal-cliente" className="button primary">Abrir Portal do Cliente</Link></main>;
  if(technicianBlocked||engineerBlocked) return <main className="access-denied"><h1>Acesso restrito</h1><p>Seu perfil não possui permissão para esta área.</p><Link href="/" className="button secondary">Voltar ao Dashboard</Link></main>;

  return (
    <div className="app-shell">
      <HistoricalBaselineMigration/>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-block">
          <Image src="/logo-solocontrol.png" width={205} height={102} alt="Solocontrol" className="brand-logo" priority />
          <button className="mobile-close" onClick={() => setOpen(false)}><X size={22}/></button>
          <div className="brand-title">Solocontrol Lab</div>
          <div className="brand-subtitle">Gestão de Ensaios</div>
        </div>
        <nav className="side-nav">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setOpen(false)}><Icon size={18}/><span>{label}</span></Link>
          })}
        </nav>
        <div className="sidebar-footer">SOLOCONTROL<br/><span>Engenharia e Consultoria</span></div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={24}/></button>
          <div className="topbar-title">
            <strong>Laboratório</strong>
            <span>Controle, rastreabilidade e produção</span>
          </div>

          <div className="work-selector-wrap">
            <span>Obra em análise</span>
            <select value={selectedWorkId} onChange={e => setSelectedWorkId(e.target.value)} disabled={loadingWorks}>
              <option value="all">Todas as obras</option>
              {works.map(work => <option key={work.id} value={work.id}>{work.name}</option>)}
            </select>
          </div>

          <Link href="/coordenacao" className="notification-button" title="Pendências de hoje"><Bell size={19}/>{alerts>0&&<b>{alerts>99?'99+':alerts}</b>}</Link>
          <Link href="/login" className="topbar-user"><div className="avatar">{profile.name.slice(0,2).toUpperCase()}</div><div><b>{profile.name}</b><small>{isPilot?'Modo piloto':profile.role}</small></div></Link>
        </header>
        <main className="content">{children}</main>
      </div>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </div>
  );
}
