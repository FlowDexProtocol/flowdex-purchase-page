import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import Providers from '@/components/Providers';
import CookieConsent from '@/components/CookieConsent';
import './globals.css';

const SITE_URL = 'https://purchase.flowdexprotocol.com';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
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
  themeColor: '#060d18',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
