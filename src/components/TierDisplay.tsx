'use client';

import { useTierCurrent } from '@/lib/hooks';
import { formatPercentage, formatTokenPrice, formatUSD, toNum } from '@/lib/format';
import { Badge, Card, EmptyState, Mono, Section, SectionHeading, Spinner } from './ui';

const LISTING_PRICE = 0.05;

export default function TierDisplay() {
  const { data: tier, loading, error } = useTierCurrent();
  const price = tier ? toNum(tier.price) : 0;
  const discountPct = price > 0 ? ((LISTING_PRICE - price) / LISTING_PRICE) * 100 : 0;

  return (
    <Section id="tier">
      <SectionHeading
        eyebrow="Presale Tier"
        title="Current Tier Pricing"
        description="Live from the presale contract state — updates automatically as each tier fills."
      />

      {loading && !tier ? (
        <Card className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 text-primary" />
        </Card>
      ) : error && !tier ? (
        <EmptyState>Could not load tier data right now.</EmptyState>
      ) : tier && !tier.message ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-widest text-ink-dim">Tier</p>
            <p className="mt-1.5 text-lg font-bold text-ink">{tier.name}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-ink-dim">Price</p>
            <Mono className="mt-1.5 block text-lg font-bold text-primary">{formatTokenPrice(tier.price)}</Mono>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-ink-dim">Vs. Listing ({formatTokenPrice(LISTING_PRICE)})</p>
            <Mono className={`mt-1.5 block text-lg font-bold ${discountPct >= 0 ? 'text-green' : 'text-red'}`}>
              {discountPct >= 0 ? '−' : '+'}
              {formatPercentage(Math.abs(discountPct), { decimals: 1, showSign: false })}
            </Mono>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-widest text-ink-dim">TGE Unlock</p>
            <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatPercentage(tier.tge_percentage, { showSign: false })}</Mono>
          </Card>

          <Card className="col-span-2 sm:col-span-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Cliff</p>
              <p className="mt-1 text-sm font-semibold text-ink">{tier.cliff_months} month{tier.cliff_months === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Vesting</p>
              <p className="mt-1 text-sm font-semibold text-ink">{tier.vest_months} month{tier.vest_months === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-dim">Hard Cap</p>
              <Mono className="mt-1 block text-sm font-semibold text-ink">{formatUSD(tier.hard_cap_usd)}</Mono>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {tier.claims_open && <Badge tone="green">Claims Open</Badge>}
              {tier.bonus && <Badge tone="purple">{tier.bonus} Bonus</Badge>}
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState>{tier?.message || 'No active tier right now.'}</EmptyState>
      )}
    </Section>
  );
}
