'use client';

import { usePolling } from '@/lib/hooks';
import { getTiers } from '@/lib/api';
import type { Tier } from '@/lib/types';
import { formatPercentage, formatTokenPrice, formatUSD } from '@/lib/format';
import { Badge, Card, EmptyState, Mono, Section, SectionHeading, Spinner } from './ui';

export default function TiersTable() {
  const { data, loading, error } = usePolling<Tier[]>(getTiers, 60000, []);

  return (
    <Section id="tiers">
      <SectionHeading eyebrow="Full Schedule" title="All Presale Tiers" description="All 8 tiers, pricing, hard caps, and vesting terms." />

      <Card className="overflow-hidden p-0">
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : error && !data ? (
          <div className="p-6">
            <EmptyState>Could not load tiers right now.</EmptyState>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-6">
            <EmptyState>No tiers configured yet.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-5 py-3 font-medium sm:px-6">Tier</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Price</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Hard Cap</th>
                  <th className="px-5 py-3 font-medium sm:px-6">TGE %</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Cliff</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Vesting</th>
                  <th className="px-5 py-3 font-medium sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((tier) => (
                  <tr key={tier.id} className={tier.is_active ? 'bg-primary-dim/40' : undefined}>
                    <td className="px-5 py-3 font-semibold text-ink sm:px-6">{tier.name}</td>
                    <td className="px-5 py-3 sm:px-6">
                      <Mono className="text-ink">{formatTokenPrice(tier.price)}</Mono>
                    </td>
                    <td className="px-5 py-3 sm:px-6">
                      <Mono className="text-ink-dim">{formatUSD(tier.hard_cap_usd)}</Mono>
                    </td>
                    <td className="px-5 py-3 sm:px-6">
                      <Mono className="text-ink-dim">{formatPercentage(tier.tge_percentage, { showSign: false })}</Mono>
                    </td>
                    <td className="px-5 py-3 text-ink-dim sm:px-6">{tier.cliff_months}mo</td>
                    <td className="px-5 py-3 text-ink-dim sm:px-6">{tier.vest_months}mo</td>
                    <td className="px-5 py-3 sm:px-6">
                      {tier.is_active ? (
                        <Badge tone="green">Active</Badge>
                      ) : tier.closed_at ? (
                        <Badge tone="neutral">Closed</Badge>
                      ) : (
                        <Badge tone="neutral">Upcoming</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  );
}
