import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { WorkScopeProvider } from '@/components/WorkScope';
import { AuthScopeProvider } from '@/components/AuthScope';
import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Solocontrol Lab',
  description: 'Gestão de ensaios, fichas e rastreabilidade da Solocontrol',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/logo-solocontrol-icon.png',
    apple: '/logo-solocontrol-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthScopeProvider>
          <WorkScopeProvider>
            <PWARegister />
            <AppShell>{children}</AppShell>
          </WorkScopeProvider>
        </AuthScopeProvider>
      </body>
    </html>
  );
}
