'use client';

import { usePolling } from '@/lib/hooks';
import { getPublicStaking } from '@/lib/api';
import type { StakingInfo as StakingInfoType } from '@/lib/types';
import { Badge, Card, EmptyState, Section, Spinner } from './ui';

export default function StakingInfo() {
  const { data, loading, error } = usePolling<StakingInfoType>(getPublicStaking, 0, []);

  return (
    <Section id="staking">
      <Card className="relative overflow-hidden bg-gradient-to-br from-card to-bg-soft">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple/10 blur-3xl" />
        {loading && !data ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : error && !data ? (
          <EmptyState>Staking info unavailable right now.</EmptyState>
        ) : data ? (
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="purple">{data.status.replace('_', ' ')}</Badge>
              <Badge tone="primary">Phase {data.phase}</Badge>
              <Badge tone="green">{data.fee_share_pct}% Fee Share</Badge>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-ink">
              Stake {data.token} <span className="text-primary">Coming Soon</span>
            </h3>
            <p className="mt-3 max-w-2xl text-sm text-ink-dim">{data.description}</p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.features.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-4 py-3 text-sm text-ink">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </Section>
  );
}
