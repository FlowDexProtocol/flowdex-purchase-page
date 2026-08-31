'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { Button, Mono } from './ui';
import { truncateWallet } from '@/lib/format';

const NAV_LINKS = [
  { href: '#buy', label: 'Buy' },
  { href: '#dashboard', label: 'Dashboard' },
  { href: '#leaderboard', label: 'Leaderboard' },
  { href: '#scenarios', label: 'Scenarios' },
  { href: '#staking', label: 'Staking' },
  { href: '#tiers', label: 'Tiers' },
];

function AccountMenu() {
  const { address, isConnecting, isConnected, openConnectModal, disconnectWallet } = useWallet();
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
      <Button onClick={openConnectModal} disabled={isConnecting}>
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:border-primary/50 transition-colors"
      >
        <span className="h-2 w-2 rounded-full bg-green" />
        <Mono>{truncateWallet(address)}</Mono>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-xl overflow-hidden z-50">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(address).catch(() => {});
              setOpen(false);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-ink-dim hover:text-ink hover:bg-white/5"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              setOpen(false);
              disconnectWallet();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-red hover:bg-red-dim"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple font-bold text-[#03131a]">
            F
          </span>
          <span className="text-lg font-bold tracking-tight">
            FlowDex <span className="text-primary">Protocol</span>
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-ink-dim hover:text-ink transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <AccountMenu />
          </div>
          <button
            className="lg:hidden rounded-md border border-border p-2 text-ink-dim"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-bg px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-ink-dim hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <div className="sm:hidden pt-2">
            <AccountMenu />
          </div>
        </div>
      )}
    </header>
  );
}
