import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { WorkScopeProvider } from '@/components/WorkScope';

export const metadata: Metadata = {
  title: 'Solocontrol Lab',
  description: 'Gestão de ensaios, fichas e rastreabilidade da Solocontrol',
  icons: {
    icon: '/logo-solocontrol-icon.png',
    apple: '/logo-solocontrol-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <WorkScopeProvider>
          <AppShell>{children}</AppShell>
        </WorkScopeProvider>
      </body>
    </html>
  );
}
