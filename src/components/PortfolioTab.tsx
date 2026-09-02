'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { getBuyerProfile, getBuyerPurchases, getClaims, getTiers } from '@/lib/api';
import type { BuyerProfile, Claim, Purchase, Tier } from '@/lib/types';
import { formatDate, formatTokens, formatUsd, toNum } from '@/lib/format';
import { getVestingDates } from '@/lib/vesting';
import { Badge, Card, EmptyState, ErrorNote, Mono, ProgressBar, Spinner } from './ui';

export default function PortfolioTab() {
  const { address, authedFetch } = useWallet();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      authedFetch((token) => getBuyerProfile(address, token)),
      authedFetch((token) => getBuyerPurchases(address, token)),
      getClaims(address),
      getTiers(),
    ])
      .then(([profileRes, purchasesRes, claimsRes, tiersRes]) => {
        if (cancelled) return;
        setProfile(profileRes.buyer);
        setPurchases(purchasesRes.purchases);
        setClaims(claimsRes);
        setTiers(tiersRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, authedFetch]);

  const vesting = useMemo(() => {
    if (!profile) return null;

    const purchasedTokens = toNum(profile.total_tokens);
    // total_bonus_tokens is combined (referrer + buyer-side); total_referral_earnings_tokens
    // is specifically the referrer-earned slice — subtracting gives the buyer-side slice.
    const referralBonusTokens = toNum(profile.total_referral_earnings_tokens);
    const purchaseBonusTokens = Math.max(0, toNum(profile.total_bonus_tokens) - referralBonusTokens);
    const totalTokens = purchasedTokens + toNum(profile.total_bonus_tokens);

    const claimedTokens = claims.filter((c) => c.status === 'claimed').reduce((sum, c) => sum + toNum(c.total_claimable), 0);
    const vestingTokens = Math.max(0, totalTokens - claimedTokens);
    const claimedPct = totalTokens > 0 ? (claimedTokens / totalTokens) * 100 : 0;

    // Next unlock: an unclaimed eligible TGE tranche beats a still-vesting
    // cliff date, which beats "already fully vested / nothing pending."
    const eligible = claims.find((c) => c.status === 'eligible');
    let nextUnlock: { label: string } | null = null;
    if (eligible) {
      nextUnlock = { label: `${formatTokens(toNum(eligible.total_claimable))} $FDP ready to claim now (${eligible.tier_name || `Tier ${eligible.tier_id}`})` };
    } else {
      const now = new Date();
      let nearestCliff: { date: Date; tierName: string } | null = null;
      for (const c of claims) {
        if (c.status !== 'claimed') continue;
        const tier = tiers.find((t) => t.id === c.tier_id);
        if (!tier?.closed_at) continue;
        const { cliffEnd, fullUnlock } = getVestingDates(tier.closed_at, tier.cliff_months, tier.vest_months);
        if (now < fullUnlock && (!nearestCliff || cliffEnd < nearestCliff.date)) {
          nearestCliff = { date: now < cliffEnd ? cliffEnd : fullUnlock, tierName: c.tier_name || `Tier ${c.tier_id}` };
        }
      }
      if (nearestCliff) {
        nextUnlock = { label: `Vesting continues through ${formatDate(nearestCliff.date.toISOString())} (${nearestCliff.tierName})` };
      }
    }

    return {
      purchasedTokens,
      referralBonusTokens,
      purchaseBonusTokens,
      totalTokens,
      claimedTokens,
      claimedPct,
      vestingTokens,
      nextUnlock,
    };
  }, [profile, claims, tiers]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!profile) return <EmptyState>No profile data yet — make your first purchase to get started.</EmptyState>;

  const statusTone = (status: string): 'green' | 'red' | 'neutral' =>
    status === 'confirmed' ? 'green' : status === 'failed' || status === 'cancelled' ? 'red' : 'neutral';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Total $FDP</p>
          <Mono className="mt-1.5 block text-xl font-bold text-primary">{formatTokens(profile.total_tokens)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Total Spent</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{formatUsd(profile.total_usd_spent)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Purchases</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{profile.total_purchases}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Bonus $FDP</p>
          <Mono className="mt-1.5 block text-xl font-bold text-green">{formatTokens(profile.total_bonus_tokens)}</Mono>
        </Card>
      </div>

      {vesting && (
        <Card>
          <p className="text-sm font-semibold text-ink">Vesting Summary</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-dim">Purchased tokens</p>
              <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokens(vesting.purchasedTokens)} $FDP</Mono>
            </div>
            {vesting.referralBonusTokens > 0 && (
              <div>
                <p className="text-xs text-ink-dim">Referral bonus tokens</p>
                <Mono className="mt-0.5 block text-base font-bold text-purple">{formatTokens(vesting.referralBonusTokens)} $FDP</Mono>
              </div>
            )}
            {vesting.purchaseBonusTokens > 0 && (
              <div>
                <p className="text-xs text-ink-dim">Purchase bonus tokens</p>
                <Mono className="mt-0.5 block text-base font-bold text-primary">{formatTokens(vesting.purchaseBonusTokens)} $FDP</Mono>
              </div>
            )}
            <div>
              <p className="text-xs text-ink-dim">Total</p>
              <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokens(vesting.totalTokens)} $FDP</Mono>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-dim">
              <span>
                Claimed <Mono className="text-green">{formatTokens(vesting.claimedTokens)}</Mono> ({vesting.claimedPct.toFixed(0)}%)
              </span>
              <span>
                Vesting <Mono className="text-ink">{formatTokens(vesting.vestingTokens)}</Mono> ({(100 - vesting.claimedPct).toFixed(0)}%)
              </span>
            </div>
            <ProgressBar pct={vesting.claimedPct} />
          </div>

          {vesting.nextUnlock && <p className="mt-3 text-xs text-ink-faint">Next unlock: {vesting.nextUnlock.label}</p>}

          {(vesting.referralBonusTokens > 0 || vesting.purchaseBonusTokens > 0) && (
            <p className="mt-3 text-xs text-ink-faint">Bonus tokens follow the same vesting schedule as the tier they were earned in.</p>
          )}
        </Card>
      )}

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Purchase History</p>
        {purchases.length === 0 ? (
          <EmptyState>No purchases yet.</EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-2 pb-2 font-medium">Date</th>
                  <th className="px-2 pb-2 font-medium">Paid</th>
                  <th className="px-2 pb-2 font-medium">$FDP</th>
                  <th className="px-2 pb-2 font-medium">Tier</th>
                  <th className="px-2 pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-2 py-2.5 text-ink-dim">{formatDate(p.created_at)}</td>
                    <td className="px-2 py-2.5">
                      <Mono>{formatUsd(p.usd_value)}</Mono> <span className="text-ink-faint">{p.crypto_currency}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono>{formatTokens(p.tokens_allocated)}</Mono>
                    </td>
                    <td className="px-2 py-2.5 text-ink-dim">{p.tier_name || '—'}</td>
                    <td className="px-2 py-2.5">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
