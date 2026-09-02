'use client';

import { useState } from 'react';
import { usePolling } from '@/lib/hooks';
import { getPublicScenarios } from '@/lib/api';
import type { ScenariosResponse } from '@/lib/types';
import { formatCompactUsd, formatTokens, formatUsd } from '@/lib/format';
import { Card, EmptyState, Mono, Section, SectionHeading, Spinner } from './ui';

export default function MarketCapScenarios() {
  const { data, loading, error } = usePolling<ScenariosResponse>(getPublicScenarios, 0, []);
  const [tokens, setTokens] = useState('100000');
  const tokenAmount = parseFloat(tokens) || 0;

  return (
    <Section id="scenarios">
      <SectionHeading
        eyebrow="Projections"
        title="Market Cap Scenarios"
        description="Illustrative only — not a guarantee of future price or performance."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label htmlFor="scenario-tokens" className="text-sm text-ink-dim">
          Your $FDP amount
        </label>
        <div className="flex items-center rounded-lg border border-border bg-bg-soft px-3 py-2">
          <input
            id="scenario-tokens"
            inputMode="decimal"
            value={tokens}
            onChange={(e) => setTokens(e.target.value.replace(/[^0-9.]/g, ''))}
            className="w-32 bg-transparent font-mono text-sm font-semibold text-ink outline-none"
          />
          <span className="ml-2 text-xs text-ink-faint">$FDP</span>
        </div>
      </div>

      {loading && !data ? (
        <Card className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-primary" />
        </Card>
      ) : error && !data ? (
        <EmptyState>Scenario data unavailable right now.</EmptyState>
      ) : data ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {data.scenarios.map((s) => (
            <Card key={s.label} className="w-[85%] min-w-[280px] shrink-0 snap-center text-center sm:w-auto sm:min-w-0 sm:shrink">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">{s.label}</p>
              <Mono className="mt-2 block text-lg font-bold text-primary">{s.multiplier}x</Mono>
              <Mono className="mt-1 block text-sm text-ink-dim">${s.price.toFixed(2)}</Mono>
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-widest text-ink-faint">Your $FDP worth</p>
                <Mono className="mt-1 block text-base font-bold text-green">{formatUsd(tokenAmount * s.price)}</Mono>
              </div>
              <Mono className="mt-2 block text-xs text-ink-faint">{formatCompactUsd(s.mcap)} mcap</Mono>
            </Card>
          ))}
        </div>
      ) : null}

      {data && (
        <p className="mt-4 text-xs text-ink-faint">
          Based on a listing price of ${data.listing_price.toFixed(2)} and total supply of {formatTokens(data.total_supply, 0)} $FDP.
        </p>
      )}
    </Section>
  );
}
