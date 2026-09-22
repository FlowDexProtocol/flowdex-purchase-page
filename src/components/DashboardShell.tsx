'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/wallet-context';
import { useTierCurrent, usePublicStats } from '@/lib/hooks';
import { formatCompactUSD, formatPercentage, formatTokenPrice, truncateWallet } from '@/lib/format';
import { cms, type CmsPageData } from '@/lib/cms';
import { sanitizeImageUrl } from '@/lib/url-safety';
import { Button, Card, Mono, ProgressBar } from './ui';
import BuyForm from './BuyForm';
import PortfolioTab from './PortfolioTab';
import ReferralTab from './ReferralTab';
import ClaimsTab from './ClaimsTab';
import Leaderboard from './Leaderboard';
import MarketCapScenarios from './MarketCapScenarios';
import StakingInfo from './StakingInfo';
import TiersTable from './TiersTable';
import EmailCaptureBanner from './EmailCaptureBanner';

// ══════════════════════════════════════════════════
// View routing
// ══════════════════════════════════════════════════

type View = 'buy' | 'portfolio' | 'referral' | 'claims' | 'leaderboard' | 'scenarios' | 'staking' | 'tiers';

interface NavItem {
  key: View;
  label: string;
  requiresWallet?: boolean;
  /** 1-based order in the mobile bottom bar. Omit to hide from mobile nav. */
  mobileOrder?: number;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'buy', label: 'Buy $FDP', mobileOrder: 1 },
  { key: 'portfolio', label: 'Portfolio', requiresWallet: true, mobileOrder: 2 },
  { key: 'referral', label: 'Referral', requiresWallet: true, mobileOrder: 3 },
  { key: 'claims', label: 'Claims', requiresWallet: true },
  { key: 'leaderboard', label: 'Leaderboard', mobileOrder: 4 },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'staking', label: 'Staking' },
  { key: 'tiers', label: 'All Tiers', mobileOrder: 5 },
];

const MOBILE_NAV = NAV_ITEMS.filter((v) => v.mobileOrder).sort(
  (a, b) => (a.mobileOrder ?? 99) - (b.mobileOrder ?? 99)
);

const VIEW_TITLES: Record<View, string> = {
  buy: 'Buy $FDP',
  portfolio: 'Portfolio',
  referral: 'Referral Program',
  claims: 'Token Claims',
  leaderboard: 'Presale Leaderboard',
  scenarios: 'Market Cap Scenarios',
  staking: 'Staking',
  tiers: 'All Presale Tiers',
};

// ══════════════════════════════════════════════════
// Icons — stroke-based, 24×24 viewBox
// ══════════════════════════════════════════════════

function NavIcon({ type, className = '' }: { type: View; className?: string }) {
  const c = `shrink-0 ${className}`;
  const s = {
    className: c,
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (type) {
    case 'buy':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v10M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" />
        </svg>
      );
    case 'portfolio':
      return (
        <svg {...s}>
          <path d="M12 20V10M18 20V4M6 20v-4" />
        </svg>
      );
    case 'referral':
      return (
        <svg {...s}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
      );
    case 'claims':
      return (
        <svg {...s}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="M22 4 12 14.01l-3-3" />
        </svg>
      );
    case 'leaderboard':
      return (
        <svg {...s}>
          <path d="M8 21V11M16 21V7M12 21V3" />
        </svg>
      );
    case 'scenarios':
      return (
        <svg {...s}>
          <path d="m23 6-9.5 9.5-5-5L1 18" />
          <path d="M17 6h6v6" />
        </svg>
      );
    case 'staking':
      return (
        <svg {...s}>
          <path d="m12 2-10 5 10 5 10-5-10-5Z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'tiers':
      return (
        <svg {...s}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════
// Wallet gate — shown for wallet-required views
// ══════════════════════════════════════════════════

function WalletGate({ children }: { children: ReactNode }) {
  const { isConnected, openConnectModal } = useWallet();
  if (isConnected) return <>{children}</>;
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M22 10H2M7 15h.01M11 15h.01" />
        </svg>
      </div>
      <p className="max-w-xs text-sm text-ink-dim">Connect your wallet to access this section.</p>
      <Button onClick={openConnectModal}>Connect Wallet</Button>
    </Card>
  );
}

// ══════════════════════════════════════════════════
// Stat card — top bar
// ══════════════════════════════════════════════════

function StatCard({
  label,
  value,
  loading,
  accent,
  progress,
}: {
  label: string;
  value: string;
  loading?: boolean;
  accent?: boolean;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-ink-dim sm:text-[11px]">{label}</p>
      {loading ? (
        <div className="mt-1">
          <div className="h-5 w-16 animate-pulse rounded bg-white/5" />
        </div>
      ) : (
        <>
          <Mono className={`mt-0.5 block text-base font-bold sm:text-lg ${accent ? 'text-primary' : 'text-ink'}`}>
            {value}
          </Mono>
          {typeof progress === 'number' && <ProgressBar pct={progress} className="mt-1.5" />}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// Main shell
// ══════════════════════════════════════════════════

export default function DashboardShell({
  cmsBuy = {},
  cmsGlobal = {},
}: {
  cmsBuy?: CmsPageData;
  cmsGlobal?: CmsPageData;
}) {
  const { address, isConnecting, isConnected, openConnectModal, disconnectWallet, detectedChainName } = useWallet();
  const { data: tier } = useTierCurrent();
  const { data: stats } = usePublicStats();
  const [activeView, setActiveView] = useState<View>('buy');

  // ── Logo from CMS ──
  const logoType = cms(cmsGlobal, 'logo', 'type', 'text');
  const logoImageUrl = sanitizeImageUrl(cms(cmsGlobal, 'logo', 'image_url', ''));
  const logoMain = cms(cmsGlobal, 'logo', 'text_main', 'Flow');
  const logoAccent = cms(cmsGlobal, 'logo', 'text_accent', 'Dex');
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const showLogoImage = logoType === 'image' && logoImageUrl && !logoImageFailed;
  const supportEmail = cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com');

  // ── Read initial view from URL hash ──
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as View;
    if (NAV_ITEMS.some((v) => v.key === hash)) setActiveView(hash);
    // Also handle the old "dashboard" hash — map it to portfolio
    if (hash === ('dashboard' as string)) setActiveView('portfolio');
  }, []);

  function switchView(view: View) {
    setActiveView(view);
    window.history.replaceState(null, '', `#${view}`);
    // Scroll the content area to the top
    document.getElementById('dashboard-content')?.scrollTo(0, 0);
  }

  const Logo = (
    <button onClick={() => switchView('buy')} className="flex items-center gap-3">
      {showLogoImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoImageUrl}
          alt={`${logoMain}${logoAccent}`}
          className="h-9 w-auto object-contain"
          onError={() => setLogoImageFailed(true)}
        />
      ) : (
        <div className="leading-none">
          <span className="font-serif text-xl">
            <em className="font-light italic">{logoMain}</em>
            <span className="font-normal">{logoAccent}</span>
          </span>
          <span className="mt-px block text-[8px] uppercase tracking-[3px] text-white/30">Protocol</span>
        </div>
      )}
    </button>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-bg">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-white/[0.03] shrink-0">
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-border shrink-0">{Logo}</div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => switchView(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeView === item.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-ink-dim hover:text-ink hover:bg-white/5'
              }`}
            >
              <NavIcon type={item.key} />
              {item.label}
            </button>
          ))}

          {/* Separator + external links */}
          <div className="my-2 border-t border-border" />
          <Link
            href="/status"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:text-ink hover:bg-white/5 transition-colors"
          >
            <svg
              className="shrink-0"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Check Status
          </Link>
          <a
            href="https://flowdexprotocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:text-ink hover:bg-white/5 transition-colors"
          >
            <svg
              className="shrink-0"
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
            </svg>
            Main Site
          </a>
        </nav>

        {/* Wallet + footer */}
        <div className="border-t border-border p-4 shrink-0 space-y-3">
          {isConnected && address ? (
            <>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-green" />
                <Mono className="truncate text-xs text-ink">{truncateWallet(address)}</Mono>
              </div>
              {detectedChainName && <p className="text-[11px] text-ink-faint">{detectedChainName}</p>}
              <button onClick={disconnectWallet} className="text-xs text-ink-faint hover:text-red transition-colors">
                Disconnect
              </button>
            </>
          ) : (
            <Button variant="outline" className="w-full text-xs" onClick={openConnectModal} disabled={isConnecting}>
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </Button>
          )}
          <div className="flex items-center gap-3 text-[10px] text-ink-faint">
            <span>&copy; {new Date().getFullYear()} FlowDex</span>
            <a href="https://flowdexprotocol.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors">
              Terms
            </a>
            <a href={`mailto:${supportEmail}`} className="hover:text-ink transition-colors">
              Support
            </a>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex h-14 items-center justify-between border-b border-border bg-bg shrink-0 px-4">
          {Logo}
          {isConnected && address ? (
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              <Mono className="text-[11px]">{truncateWallet(address)}</Mono>
            </button>
          ) : (
            <button
              onClick={openConnectModal}
              disabled={isConnecting}
              className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
            >
              {isConnecting ? '…' : 'Connect'}
            </button>
          )}
        </header>

        {/* Stats bar */}
        <div className="border-b border-border bg-bg-soft shrink-0">
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:px-6 sm:py-4">
            <StatCard
              label="Total Raised"
              value={stats ? formatCompactUSD(stats.total_raised_usd) : '—'}
              loading={!stats}
            />
            <StatCard
              label="Token Price"
              value={tier && !tier.message ? formatTokenPrice(tier.price) : '—'}
              loading={!tier}
              accent
            />
            <StatCard
              label="Tier Progress"
              value={
                tier && !tier.message
                  ? formatPercentage(tier.progress_pct, { decimals: 1, showSign: false })
                  : '—'
              }
              loading={!tier}
              progress={tier && !tier.message ? parseFloat(tier.progress_pct) : undefined}
            />
            <StatCard
              label="Total Buyers"
              value={stats ? stats.total_buyers.toLocaleString() : '—'}
              loading={!stats}
            />
          </div>
        </div>

        {/* Content area */}
        <main id="dashboard-content" className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {/* View heading (hidden on Buy — the form speaks for itself) */}
            {activeView !== 'buy' && (
              <h1 className="mb-6 font-serif text-3xl font-light text-ink sm:text-4xl">{VIEW_TITLES[activeView]}</h1>
            )}

            {activeView === 'buy' && <BuyForm cmsBuy={cmsBuy} cmsGlobal={cmsGlobal} embedded />}

            {activeView === 'portfolio' && (
              <WalletGate>
                <EmailCaptureBanner />
                <PortfolioTab />
              </WalletGate>
            )}

            {activeView === 'referral' && (
              <WalletGate>
                <ReferralTab />
              </WalletGate>
            )}

            {activeView === 'claims' && (
              <WalletGate>
                <ClaimsTab />
              </WalletGate>
            )}

            {activeView === 'leaderboard' && <Leaderboard embedded />}
            {activeView === 'scenarios' && <MarketCapScenarios embedded />}
            {activeView === 'staking' && <StakingInfo embedded />}
            {activeView === 'tiers' && <TiersTable embedded />}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur dashboard-safe-bottom">
        <div className="flex">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => switchView(item.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                activeView === item.key ? 'text-primary' : 'text-ink-faint'
              }`}
            >
              <NavIcon type={item.key} className="h-5 w-5" />
              <span className="truncate">{item.label.replace(' $FDP', '')}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
