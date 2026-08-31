'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { getBuyerProfile, getBuyerPurchases } from '@/lib/api';
import type { BuyerProfile, Purchase } from '@/lib/types';
import { formatDate, formatTokens, formatUsd } from '@/lib/format';
import { Badge, Card, EmptyState, ErrorNote, Mono, Spinner } from './ui';

export default function PortfolioTab() {
  const { address, authedFetch } = useWallet();
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
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
    ])
      .then(([profileRes, purchasesRes]) => {
        if (cancelled) return;
        setProfile(profileRes.buyer);
        setPurchases(purchasesRes.purchases);
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
