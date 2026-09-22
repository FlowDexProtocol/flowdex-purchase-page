import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';
import Providers from '@/components/Providers';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

const SITE_URL = 'https://purchase.flowdexprotocol.com';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

const PAGE_TITLE = 'Buy $FDP — FlowDex Protocol Presale';
const PAGE_DESCRIPTION =
  'Join the FlowDex Protocol presale. Buy $FDP, track your portfolio, earn referral rewards, and stake for 40% of protocol fees.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: SITE_URL,
    siteName: 'FlowDex Protocol',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#161660',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
