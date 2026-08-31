'use client';

import { useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import PortfolioTab from './PortfolioTab';
import ReferralTab from './ReferralTab';
import ClaimsTab from './ClaimsTab';
import { Button, Card, Section, SectionHeading } from './ui';

const TABS = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'referral', label: 'Referral' },
  { key: 'claims', label: 'Claims' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function DashboardTabs() {
  const { isConnected, openConnectModal } = useWallet();
  const [active, setActive] = useState<TabKey>('portfolio');

  return (
    <Section id="dashboard">
      <SectionHeading
        eyebrow="Your Account"
        title="Dashboard"
        description="Track your holdings, referral rewards, and TGE claims."
      />

      {!isConnected ? (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <p className="max-w-sm text-sm text-ink-dim">
            Connect your wallet to view your portfolio, referral stats, and claimable tokens.
          </p>
          <Button onClick={openConnectModal}>Connect Wallet</Button>
        </Card>
      ) : (
        <div>
          <div className="mb-6 flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  active === t.key ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {active === 'portfolio' && <PortfolioTab />}
          {active === 'referral' && <ReferralTab />}
          {active === 'claims' && <ClaimsTab />}
        </div>
      )}
    </Section>
  );
}
