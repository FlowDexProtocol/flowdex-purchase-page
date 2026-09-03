'use client';

import { usePolling } from '@/lib/hooks';
import { getPublicLeaders } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/types';
import { formatTokenAmount, formatUSD } from '@/lib/format';
import { Badge, Card, EmptyState, Mono, Section, SectionHeading, Spinner } from './ui';

const RANK_TONE = ['text-primary', 'text-ink-dim', 'text-purple'] as const;

export default function Leaderboard() {
  const { data, loading, error } = usePolling<LeaderboardEntry[]>(() => getPublicLeaders(10), 30000, []);

  return (
    <Section id="leaderboard">
      <SectionHeading eyebrow="Top Buyers" title="Presale Leaderboard" description="Ranked by total USD committed. Wallets are truncated for privacy." />

      <Card className="p-0 overflow-hidden">
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : error && !data ? (
          <div className="p-6">
            <EmptyState>Leaderboard unavailable right now.</EmptyState>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState>No confirmed purchases yet — be the first on the board.</EmptyState>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((entry, i) => (
              <div key={`${entry.wallet}-${i}`} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                <Mono className={`w-6 text-right text-sm font-bold ${RANK_TONE[i] ?? 'text-ink-faint'}`}>
                  {i + 1}
                </Mono>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Mono className="truncate text-sm font-semibold text-ink">{entry.wallet}</Mono>
                    {entry.buyer_tag && <Badge tone="purple">{entry.buyer_tag}</Badge>}
                  </div>
                  <p className="text-xs text-ink-faint">
                    {entry.purchase_count} purchase{entry.purchase_count === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right">
                  <Mono className="block text-sm font-bold text-ink">{formatUSD(entry.total_usd)}</Mono>
                  <Mono className="block text-xs text-ink-faint">{formatTokenAmount(entry.total_tokens)} $FDP</Mono>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Section>
  );
}
