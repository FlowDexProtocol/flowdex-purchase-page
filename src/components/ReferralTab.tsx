'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { getReferralCredits, getReferralList, getReferralStats } from '@/lib/api';
import type { ReferralCredits, ReferralStats, ReferredUser } from '@/lib/types';
import { formatDate, formatUsd, truncateWallet } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorNote, Mono, Spinner } from './ui';

export default function ReferralTab() {
  const { address, referralCode: liveReferralCode } = useWallet();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [list, setList] = useState<ReferredUser[]>([]);
  const [credits, setCredits] = useState<ReferralCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getReferralStats(address), getReferralList(address), getReferralCredits(address)])
      .then(([statsRes, listRes, creditsRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats);
        setList(listRes.referrals);
        setCredits(creditsRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load referral data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const code = stats?.referral_code || liveReferralCode;
  const shareUrl = typeof window !== 'undefined' && code ? `${window.location.origin}${window.location.pathname}?ref=${code}` : '';
  const shareMessage = `Buy $FDP at the lowest presale price. Use my referral link for a 30% bonus: ${shareUrl}`;

  async function handleShare() {
    if (!shareUrl) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'FlowDex Protocol', text: 'Join the $FDP presale with my referral link', url: shareUrl });
        return;
      } catch {
        // user cancelled or share unsupported — fall through to copy
      }
    }
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-xs uppercase tracking-widest text-ink-dim">Your Referral Code</p>
        <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Mono className="block w-full text-2xl font-bold text-primary sm:w-auto">{code || '—'}</Mono>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={handleShare} disabled={!code}>
            {copied ? 'Copied!' : 'Share'}
          </Button>
        </div>
        {shareUrl && <Mono className="mt-2 block break-all text-xs text-ink-faint">{shareUrl}</Mono>}
        <p className="mt-3 text-xs text-ink-dim">
          When someone buys using your code, you earn <span className="font-semibold text-green">15% of their purchase</span> as bonus.
        </p>

        {shareUrl && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:text-ink hover:border-primary/50 sm:justify-start"
            >
              X / Twitter
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                'Buy $FDP at the lowest presale price. Use my referral link for a 30% bonus:'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:text-ink hover:border-primary/50 sm:justify-start"
            >
              Telegram
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:text-ink hover:border-primary/50 sm:justify-start"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-2 text-xs font-semibold text-ink-dim transition-colors hover:text-ink hover:border-primary/50 sm:justify-start"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Referrals</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{stats?.total_referral_purchases ?? 0}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Volume</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{formatUsd(stats?.total_referral_volume_usd)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Earnings</p>
          <Mono className="mt-1.5 block text-xl font-bold text-green">{formatUsd(stats?.total_referral_earnings_usd)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Terminal Credits</p>
          <Mono className="mt-1.5 block text-xl font-bold text-purple">{formatUsd(credits?.total_credits ?? 0)}</Mono>
        </Card>
      </div>

      {credits?.message && (
        <p className="text-xs text-ink-faint">
          {credits.message}. Expires {credits.expires}.
        </p>
      )}

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Referred Users</p>
        {list.length === 0 ? (
          <EmptyState>No referrals yet — share your code to start earning.</EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-2 pb-2 font-medium">Wallet</th>
                  <th className="px-2 pb-2 font-medium">Joined</th>
                  <th className="px-2 pb-2 font-medium">Volume</th>
                  <th className="px-2 pb-2 font-medium">Your Bonus</th>
                  <th className="px-2 pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((r) => (
                  <tr key={r.referred_wallet}>
                    <td className="px-2 py-2.5">
                      <Mono>{truncateWallet(r.referred_wallet)}</Mono>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-ink-dim">{formatDate(r.created_at)}</td>
                    <td className="px-2 py-2.5">
                      <Mono>{formatUsd(r.total_volume_usd)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono className="text-green">{formatUsd(r.referrer_bonus_usd)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Badge tone={r.has_purchased ? 'green' : 'neutral'}>{r.has_purchased ? 'Purchased' : 'Pending'}</Badge>
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
