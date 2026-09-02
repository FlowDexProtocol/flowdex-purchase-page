'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { ApiError, getBuyerProfile, getBuyerPurchases, getClaims, getTiers, postClaim } from '@/lib/api';
import type { Claim, Purchase, Tier } from '@/lib/types';
import { formatDate, formatTokens, toNum } from '@/lib/format';
import { getVestedAmount, getVestingDates } from '@/lib/vesting';
import { Badge, Button, Card, EmptyState, ErrorNote, Mono, ProgressBar, Spinner, VestingTimeline } from './ui';

interface TierGroup {
  tierId: number;
  tier: Tier | null;
  purchasedTokens: number;
  claim: Claim | null;
}

export default function ClaimsTab() {
  const { address, authedFetch } = useWallet();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [totalBonusTokens, setTotalBonusTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const [purchasesRes, claimsRes, tiersRes, profileRes] = await Promise.all([
        authedFetch((token) => getBuyerPurchases(address, token)),
        getClaims(address),
        getTiers(),
        authedFetch((token) => getBuyerProfile(address, token)),
      ]);
      setPurchases(purchasesRes.purchases.filter((p) => p.status === 'confirmed'));
      setClaims(claimsRes);
      setTiers(tiersRes);
      setTotalBonusTokens(toNum(profileRes.buyer.total_bonus_tokens));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [address, authedFetch]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaim(tierId: number) {
    if (!address) return;
    setClaimingId(tierId);
    setClaimError(null);
    try {
      const res = await postClaim(address, tierId);
      if (!res.success) throw new Error((res.error as string) || 'Claim failed');
      await load();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaimingId(null);
    }
  }

  // Bonus tokens aren't exposed per-tier until a tier closes (the claim
  // record derives them: bonus_tokens_claimable is the TGE-percentage
  // slice, so dividing back out by tge% gives the full bonus for that
  // tier). For a tier that hasn't closed yet, the only bonus figure
  // available is the buyer's all-time total — subtracting out what's
  // already accounted for in closed tiers attributes the remainder to
  // the still-open tier(s), which is exact for the common case of one
  // open tier at a time.
  const closedTierBonusTotal = useMemo(
    () =>
      claims.reduce((sum, c) => {
        const tgePct = toNum(c.tge_percentage);
        if (tgePct <= 0) return sum;
        return sum + toNum(c.bonus_tokens_claimable) / (tgePct / 100);
      }, 0),
    [claims]
  );
  const openTierBonusEstimate = Math.max(0, totalBonusTokens - closedTierBonusTotal);

  const groups = useMemo<TierGroup[]>(() => {
    const byTier = new Map<number, { purchasedTokens: number }>();
    for (const p of purchases) {
      if (p.tier_at_purchase === null) continue;
      const existing = byTier.get(p.tier_at_purchase) ?? { purchasedTokens: 0 };
      existing.purchasedTokens += toNum(p.tokens_allocated);
      byTier.set(p.tier_at_purchase, existing);
    }
    return Array.from(byTier.entries())
      .map(([tierId, v]) => ({
        tierId,
        tier: tiers.find((t) => t.id === tierId) ?? null,
        purchasedTokens: v.purchasedTokens,
        claim: claims.find((c) => c.tier_id === tierId) ?? null,
      }))
      .sort((a, b) => a.tierId - b.tierId);
  }, [purchases, tiers, claims]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (groups.length === 0) {
    return (
      <EmptyState>
        <p>No purchases yet. Buy $FDP to see your vesting schedule and claims here.</p>
        <a
          href="#buy"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-[#03131a] hover:bg-primary/90 transition-colors"
        >
          Buy $FDP
        </a>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {claimError && <ErrorNote>{claimError}</ErrorNote>}
      {groups.map((g) => (
        <TierClaimCard
          key={g.tierId}
          group={g}
          isOpenTier={g.tier ? !g.tier.closed_at : true}
          openTierBonusEstimate={openTierBonusEstimate}
          claiming={claimingId === g.tierId}
          onClaim={() => handleClaim(g.tierId)}
        />
      ))}
    </div>
  );
}

function TierClaimCard({
  group,
  isOpenTier,
  openTierBonusEstimate,
  claiming,
  onClaim,
}: {
  group: TierGroup;
  isOpenTier: boolean;
  openTierBonusEstimate: number;
  claiming: boolean;
  onClaim: () => void;
}) {
  const { tier, claim, purchasedTokens, tierId } = group;
  const tierName = tier?.name || claim?.tier_name || `Tier ${tierId}`;

  if (!tier) {
    return (
      <Card>
        <p className="font-semibold text-ink">{tierName}</p>
        <p className="mt-2 text-sm text-ink-dim">Loading tier details…</p>
      </Card>
    );
  }

  const tgePct = toNum(tier.tge_percentage);

  // ── Tier still active — before close ──
  if (isOpenTier) {
    const bonusTokens = openTierBonusEstimate;
    const totalTokens = purchasedTokens + bonusTokens;
    const tgeTokens = totalTokens * (tgePct / 100);
    return (
      <Card>
        <p className="font-semibold text-ink">{tierName}</p>
        <p className="mt-2 text-sm text-ink-dim">
          Your tokens: <Mono className="font-semibold text-ink">{formatTokens(totalTokens)}</Mono> $FDP
        </p>
        {bonusTokens > 0 && (
          <p className="mt-0.5 text-xs text-ink-faint">
            Purchased: {formatTokens(purchasedTokens)} + Bonus: {formatTokens(bonusTokens)} = {formatTokens(totalTokens)}
          </p>
        )}
        <p className="mt-2 text-xs text-ink-dim">
          TGE unlock: {tgePct}% = <Mono>{formatTokens(tgeTokens)}</Mono> $FDP
        </p>
        <p className="mt-3">
          <Badge tone="neutral">Tier still active</Badge>
        </p>
        <p className="mt-1.5 text-xs text-ink-faint">Claims activate when this tier closes.</p>
        <VestingTimeline className="mt-4" grayed tgePct={tgePct} cliffMonths={tier.cliff_months} vestMonths={tier.vest_months} />
      </Card>
    );
  }

  // Tier closed but the claims-generation job hasn't run yet — rare, transient.
  if (!claim) {
    return (
      <Card>
        <p className="font-semibold text-ink">{tierName}</p>
        <Badge tone="neutral" className="mt-2">
          Generating claims
        </Badge>
        <p className="mt-2 text-xs text-ink-faint">This tier just closed — your claim will appear here shortly.</p>
      </Card>
    );
  }

  const totalTokens = toNum(claim.total_purchased_tokens) + toNum(claim.bonus_tokens_claimable) / (tgePct > 0 ? tgePct / 100 : 1);
  const tgeTokens = toNum(claim.total_claimable);
  const remainingTokens = Math.max(0, totalTokens - tgeTokens);
  const closedAt = tier.closed_at as string;
  const { cliffEnd, fullUnlock } = getVestingDates(closedAt, tier.cliff_months, tier.vest_months);

  // ── Closed, eligible, not yet claimed ──
  if (claim.status !== 'claimed') {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{tierName}</p>
          <Badge tone="green">CLAIMABLE</Badge>
        </div>
        <Mono className="mt-3 block text-3xl font-extrabold text-green">{formatTokens(tgeTokens)} $FDP</Mono>
        <p className="text-xs text-ink-faint">ready to claim</p>
        <Button className="mt-4 w-full" onClick={onClaim} disabled={claiming}>
          {claiming ? 'Claiming…' : 'Claim Now'}
        </Button>

        <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs">
          <p className="text-ink-dim">
            TGE: <Mono className="text-green">{formatTokens(tgeTokens)} $FDP</Mono> —{' '}
            <span className="font-semibold text-green">READY NOW</span>
          </p>
          <p className="text-ink-dim">
            Cliff ends: <span className="text-ink">{formatDate(cliffEnd.toISOString())}</span>
          </p>
          <p className="text-ink-dim">
            Vesting: <Mono className="text-ink">{formatTokens(remainingTokens)}</Mono> $FDP over {tier.vest_months} months
            after cliff
          </p>
          <p className="text-ink-dim">
            Full unlock: <span className="text-ink">{formatDate(fullUnlock.toISOString())}</span>
          </p>
        </div>
        <VestingTimeline className="mt-4" tgePct={tgePct} cliffMonths={tier.cliff_months} vestMonths={tier.vest_months} markerPct={0} />
      </Card>
    );
  }

  // ── Claimed — compute live vesting progress ──
  const now = new Date();
  const vestedSinceCliff = getVestedAmount(remainingTokens, cliffEnd, tier.vest_months, fullUnlock, now);
  const totalVested = tgeTokens + vestedSinceCliff;
  const remaining = Math.max(0, totalTokens - totalVested);
  const overallPct = totalTokens > 0 ? (totalVested / totalTokens) * 100 : 100;
  const fullyVested = now >= fullUnlock;

  const totalMonths = Math.max(tier.cliff_months + tier.vest_months, 1);
  const elapsedMonths = Math.min(totalMonths, (now.getTime() - new Date(closedAt).getTime()) / (30 * 24 * 60 * 60 * 1000));
  const markerPct = (elapsedMonths / totalMonths) * 100;

  if (fullyVested) {
    return (
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{tierName}</p>
          <Badge tone="amber">FULLY UNLOCKED</Badge>
        </div>
        <p className="mt-3 text-sm text-ink-dim">
          All <Mono className="font-semibold text-ink">{formatTokens(totalTokens)}</Mono> $FDP unlocked and available.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-ink">{tierName}</p>
        <Badge tone="neutral">✓ CLAIMED</Badge>
      </div>
      <p className="mt-2 text-sm text-green">
        Claimed <Mono className="font-semibold">{formatTokens(tgeTokens)}</Mono> $FDP on {formatDate(claim.claimed_at)}
      </p>

      <div className="mt-4">
        <ProgressBar pct={overallPct} />
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div>
            <p className="text-ink-faint">Cliff</p>
            <p className="font-semibold text-ink">{now >= cliffEnd ? 'Complete ✓' : `${Math.ceil((cliffEnd.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000))}mo remaining`}</p>
          </div>
          <div>
            <p className="text-ink-faint">Vested so far</p>
            <Mono className="font-semibold text-ink">{formatTokens(totalVested)}</Mono>
          </div>
          <div>
            <p className="text-ink-faint">Remaining</p>
            <Mono className="font-semibold text-ink">{formatTokens(remaining)}</Mono>
          </div>
          <div>
            <p className="text-ink-faint">Full unlock</p>
            <p className="font-semibold text-ink">{formatDate(fullUnlock.toISOString())}</p>
          </div>
        </div>
      </div>

      <VestingTimeline
        className="mt-4"
        tgePct={tgePct}
        cliffMonths={tier.cliff_months}
        vestMonths={tier.vest_months}
        markerPct={markerPct}
      />
    </Card>
  );
}
