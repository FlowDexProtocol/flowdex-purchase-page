'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/wallet-context';
import { Button, Mono } from './ui';
import { truncateWallet } from '@/lib/format';
import { cms, type CmsPageData } from '@/lib/cms';
import { sanitizeImageUrl } from '@/lib/url-safety';

// Absolute paths (not bare "#buy") so these work from any route, not just
// the homepage — a bare hash link clicked from e.g. /status just rewrites
// the URL to /status#buy with no matching element, silently going nowhere.
const NAV_LINKS = [
  { href: '/#buy', label: 'Buy' },
  { href: '/#dashboard', label: 'Dashboard' },
  { href: '/#leaderboard', label: 'Leaderboard' },
  { href: '/#scenarios', label: 'Scenarios' },
  { href: '/#staking', label: 'Staking' },
  { href: '/#tiers', label: 'Tiers' },
  { href: '/status', label: 'Status' },
];

function AccountMenu() {
  const { address, isConnecting, isConnected, openConnectModal, disconnectWallet, detectedChainName } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!isConnected || !address) {
    return (
      <Button variant="secondary" onClick={openConnectModal} disabled={isConnecting}>
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-white/[0.22] bg-white/[0.04] px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/10 hover:border-white/40 transition-all"
      >
        <span className="h-2 w-2 rounded-full bg-green" />
        <Mono>{truncateWallet(address)}</Mono>
        {detectedChainName && <span className="text-ink-faint">· {detectedChainName}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/[0.06] bg-[rgba(22,22,96,0.95)] shadow-xl backdrop-blur-2xl overflow-hidden z-50">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(address).catch(() => {});
              setOpen(false);
            }}
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-ink-dim hover:text-ink hover:bg-white/5"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              setOpen(false);
              disconnectWallet();
            }}
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-red hover:bg-red-dim"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({ cmsGlobal = {} }: { cmsGlobal?: CmsPageData }) {
  const logoType = cms(cmsGlobal, 'logo', 'type', 'text');
  const logoImageUrl = sanitizeImageUrl(cms(cmsGlobal, 'logo', 'image_url', ''));
  const logoMain = cms(cmsGlobal, 'logo', 'text_main', 'Flow');
  const logoAccent = cms(cmsGlobal, 'logo', 'text_accent', 'Dex');
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const showLogoImage = logoType === 'image' && logoImageUrl && !logoImageFailed;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[rgba(22,22,96,0.92)] backdrop-blur-[18px]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/#top" className="flex min-w-0 items-center gap-3 shrink-0">
          {showLogoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoImageUrl}
              alt={`${logoMain}${logoAccent}`}
              className="h-8 w-auto object-contain"
              onError={() => setLogoImageFailed(true)}
            />
          ) : (
            <>
              <div className="logo-drops">
                <div className="drop drop-1" />
                <div className="drop drop-2" />
              </div>
              <div className="leading-none">
                <span className="font-serif text-xl">
                  <em className="font-light italic">{logoMain}</em>
                  <span className="font-normal">{logoAccent}</span>
                </span>
                <span className="mt-px block text-[8px] uppercase tracking-[3px] text-white/30">Protocol</span>
              </div>
            </>
          )}
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13px] font-normal text-white/[0.45] hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
