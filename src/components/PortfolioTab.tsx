'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { ApiError, getBuyerProfile, getBuyerPurchases, getClaims, getPurchaseReceipt, getTiers } from '@/lib/api';
import type { BuyerProfile, Claim, Purchase, Tier } from '@/lib/types';
import { formatDate, formatTokenAmount, formatUSD, toNum, truncateWallet } from '@/lib/format';
import { getExplorerUrl } from '@/lib/explorer';
import { getVestingDates } from '@/lib/vesting';
import { downloadReceiptPdf } from '@/lib/receipt';
import { Badge, Card, EmptyState, ErrorNote, Mono, ProgressBar, Spinner } from './ui';

export default function PortfolioTab() {
  const { address, authedFetch } = useWallet();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownloadReceipt(purchaseId: number) {
    if (!address) return;
    setDownloadingId(purchaseId);
    setDownloadError(null);
    try {
      const receipt = await authedFetch((token) => getPurchaseReceipt(address, purchaseId, token));
      downloadReceiptPdf(receipt);
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Failed to generate receipt. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

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
      nextUnlock = { label: `${formatTokenAmount(toNum(eligible.total_claimable))} $FDP ready to claim now (${eligible.tier_name || `Tier ${eligible.tier_id}`})` };
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
          <Mono className="mt-1.5 block text-xl font-bold text-primary">{formatTokenAmount(profile.total_tokens)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Total Spent</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{formatUSD(profile.total_usd_spent)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Purchases</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{profile.total_purchases}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Bonus $FDP</p>
          <Mono className="mt-1.5 block text-xl font-bold text-green">{formatTokenAmount(profile.total_bonus_tokens)}</Mono>
        </Card>
      </div>

      {vesting && (
        <Card>
          <p className="text-lg font-semibold text-ink">Vesting Summary</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ink-dim">Purchased tokens</p>
              <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokenAmount(vesting.purchasedTokens)} $FDP</Mono>
            </div>
            {vesting.referralBonusTokens > 0 && (
              <div>
                <p className="text-xs text-ink-dim">Referral bonus tokens</p>
                <Mono className="mt-0.5 block text-base font-bold text-purple">{formatTokenAmount(vesting.referralBonusTokens)} $FDP</Mono>
              </div>
            )}
            {vesting.purchaseBonusTokens > 0 && (
              <div>
                <p className="text-xs text-ink-dim">Purchase bonus tokens</p>
                <Mono className="mt-0.5 block text-base font-bold text-primary">{formatTokenAmount(vesting.purchaseBonusTokens)} $FDP</Mono>
              </div>
            )}
            <div>
              <p className="text-xs text-ink-dim">Total</p>
              <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokenAmount(vesting.totalTokens)} $FDP</Mono>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-dim">
              <span>
                Claimed <Mono className="text-green">{formatTokenAmount(vesting.claimedTokens)}</Mono> ({vesting.claimedPct.toFixed(0)}%)
              </span>
              <span>
                Vesting <Mono className="text-ink">{formatTokenAmount(vesting.vestingTokens)}</Mono> ({(100 - vesting.claimedPct).toFixed(0)}%)
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
        <p className="mb-4 text-lg font-semibold text-ink">Purchase History</p>
        {downloadError && (
          <div className="mb-4">
            <ErrorNote>{downloadError}</ErrorNote>
          </div>
        )}
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
                  <th className="px-2 pb-2 font-medium">Tx Hash</th>
                  <th className="px-2 pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases.map((p) => {
                  const explorerUrl = getExplorerUrl(p.chain, p.tx_hash);
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-2 py-2.5 text-ink-dim">{formatDate(p.created_at)}</td>
                      <td className="px-2 py-2.5">
                        <Mono>{formatUSD(p.usd_value)}</Mono> <span className="text-ink-faint">{p.crypto_currency}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <Mono>{formatTokenAmount(p.tokens_allocated)}</Mono>
                      </td>
                      <td className="px-2 py-2.5 text-ink-dim">{p.tier_name || '—'}</td>
                      <td className="px-2 py-2.5">
                        <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        {p.tx_hash ? (
                          explorerUrl ? (
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-primary hover:underline"
                              title={p.tx_hash}
                            >
                              {truncateWallet(p.tx_hash)}
                            </a>
                          ) : (
                            <Mono className="text-xs text-ink-faint" title={p.tx_hash}>
                              {truncateWallet(p.tx_hash)}
                            </Mono>
                          )
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        {p.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(p.id)}
                            disabled={downloadingId === p.id}
                            className="min-h-11 whitespace-nowrap rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ink-dim transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingId === p.id ? 'Generating…' : 'Download Receipt'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
