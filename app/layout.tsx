import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return {
    title: 'Kompetenzeinschätzung nach LuV',
    description: 'KI-gestützte Kompetenzeinschätzung nach LuV für Berater:innen',
    metadataBase: new URL(baseUrl),
    icons: {
      icon: '/logo.png',
      shortcut: '/logo.png',
    },
    openGraph: {
      title: 'Kompetenzeinschätzung nach LuV',
      description: 'KI-gestützte Kompetenzeinschätzung nach LuV für Berater:innen',
      images: ['/og-image.png'],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
