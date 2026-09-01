'use client';

import { useTierCurrent } from '@/lib/hooks';
import { formatCompactUsd, formatPct, formatPrice } from '@/lib/format';
import { Badge, Container, Mono, ProgressBar, Spinner } from './ui';

export default function Hero() {
  const { data: tier, loading } = useTierCurrent();
  const presaleComplete = !!tier?.message && !tier.price;

  return (
    <div id="top" className="relative overflow-hidden bg-radial-glow border-b border-border">
      <Container className="py-16 sm:py-24 text-center">
        <Badge tone="primary" className="mb-6">
          $FDP Presale Live
        </Badge>

        <h1 className="mx-auto max-w-3xl text-4xl sm:text-6xl font-bold tracking-tight text-ink">
          Trade Everything.
          <br />
          <span className="bg-gradient-to-r from-primary to-purple bg-clip-text text-transparent">Know Everything.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-ink-dim">
          FlowDex Protocol unifies crypto, stocks, forex, and commodities into a single intelligent trading layer.
          $FDP powers the network.
        </p>

        <div className="mx-auto mt-10 max-w-xl">
          {loading && !tier ? (
            <div className="flex items-center justify-center gap-2 text-ink-dim">
              <Spinner className="h-5 w-5" />
              <span className="text-sm">Loading current tier…</span>
            </div>
          ) : presaleComplete ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-lg font-semibold text-primary">Presale Complete</p>
              <p className="mt-1 text-sm text-ink-dim">All tiers have sold out. Thank you for backing FlowDex.</p>
            </div>
          ) : tier ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-left shadow-[0_0_50px_rgba(98,126,234,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-ink-dim">Current Tier</p>
                  <p className="text-xl font-bold text-ink">{tier.status || tier.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-ink-dim">Price</p>
                  <Mono className="text-xl font-bold text-primary">{formatPrice(tier.price)}</Mono>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs text-ink-dim">
                  <span>
                    Raised <Mono className="text-ink">{formatCompactUsd(tier.total_raised_usd)}</Mono>
                  </span>
                  <span>
                    Cap <Mono className="text-ink">{formatCompactUsd(tier.hard_cap_usd)}</Mono>
                  </span>
                </div>
                <ProgressBar pct={parseFloat(tier.progress_pct)} />
                <div className="mt-1.5 flex items-center justify-between text-xs text-ink-dim">
                  <Mono>{formatPct(tier.progress_pct, 1)} filled</Mono>
                  {tier.bonus && <Badge tone="green">{tier.bonus} bonus</Badge>}
                </div>
              </div>

              {tier.countdown && (
                <p className="mt-4 text-center text-sm text-ink-dim">
                  <span className="text-ink font-semibold">{tier.countdown}</span> remaining
                </p>
              )}

              <a
                href="#buy"
                className="mt-5 flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-[#03131a] hover:bg-primary/90 transition-colors"
              >
                Buy $FDP Now
              </a>
            </div>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
