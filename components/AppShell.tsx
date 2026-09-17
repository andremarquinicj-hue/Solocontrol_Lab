'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Building2, Calculator, ClipboardList, FileText, FlaskConical, Menu, Users, X } from 'lucide-react';
import { ReactNode, useState } from 'react';

const links = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/amostras', label: 'Amostras / Ensaios', icon: FlaskConical },
  { href: '/lancamento', label: 'Lançamento rápido', icon: ClipboardList },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { href: '/equipe', label: 'Equipe', icon: Users },
  { href: '/calculadoras', label: 'Calculadoras', icon: Calculator },
  { href: '/relatorios', label: 'Relatórios', icon: FileText },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-block">
          <Image src="/logo-solocontrol.png" width={195} height={76} alt="Solocontrol" className="brand-logo" />
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
          <div>
            <strong>Laboratório</strong>
            <span>Controle, rastreabilidade e produção</span>
          </div>
          <div className="topbar-user"><div className="avatar">AM</div><div><b>Coordenação</b><small>Solocontrol</small></div></div>
        </header>
        <main className="content">{children}</main>
      </div>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
    </div>
  );
}
