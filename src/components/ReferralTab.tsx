'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { getReferralCredits, getReferralList, getReferralStats } from '@/lib/api';
import type { ReferralCredits, ReferralStats, ReferredUser } from '@/lib/types';
import { formatDate, formatTokenAmount, formatUSD, toNum, truncateWallet } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorNote, Mono, Spinner } from './ui';

// The bonus-token share of a referral bonus is always 30% of its USD value
// (the rest goes to Terminal Credits), so dividing back out gives the exact
// tokens burned for that bonus — there's no per-referral burn field exposed
// by the API, but this ratio is a fixed backend constant, not an estimate.
const TOKEN_SHARE_PCT = 0.3;

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
          <p className="text-xs uppercase tracking-widest text-ink-dim">Total Referrals</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{stats?.total_referral_purchases ?? 0}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Referral Volume</p>
          <Mono className="mt-1.5 block text-xl font-bold text-ink">{formatUSD(stats?.total_referral_volume_usd)}</Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Your Token Earnings</p>
          <Mono className="mt-1.5 block text-xl font-bold text-green">
            {formatTokenAmount(stats?.total_referral_earnings_tokens ?? 0)} $FDP
          </Mono>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-widest text-ink-dim">Your Terminal Credits</p>
          <Mono className="mt-1.5 block text-xl font-bold text-purple">{formatUSD(credits?.total_credits ?? 0)}</Mono>
        </Card>
      </div>

      <Card>
        <p className="mb-4 text-sm font-semibold text-ink">Earnings</p>
        {list.length === 0 ? (
          <EmptyState>No referrals yet — share your code to start earning.</EmptyState>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink-dim">
                  <th className="px-2 pb-2 font-medium">Date</th>
                  <th className="px-2 pb-2 font-medium">Friend</th>
                  <th className="px-2 pb-2 font-medium">Their Purchase</th>
                  <th className="px-2 pb-2 font-medium">Your 15% Bonus</th>
                  <th className="px-2 pb-2 font-medium">Tokens Earned</th>
                  <th className="px-2 pb-2 font-medium">Credits Earned</th>
                  <th className="px-2 pb-2 font-medium">Tokens Burned 🔥</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((r) => (
                  <tr key={r.referred_wallet}>
                    <td className="whitespace-nowrap px-2 py-2.5 text-ink-dim">{formatDate(r.first_purchase_at || r.created_at)}</td>
                    <td className="px-2 py-2.5">
                      <Mono>{truncateWallet(r.referred_wallet)}</Mono>
                      <span className="ml-2">
                        <Badge tone={r.has_purchased ? 'green' : 'neutral'}>{r.has_purchased ? 'Purchased' : 'Pending'}</Badge>
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono>{formatUSD(r.total_volume_usd)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono className="text-green">{formatUSD(r.referrer_bonus_usd)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono className="text-primary">{formatTokenAmount(r.referrer_bonus_tokens)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono className="text-purple">{formatUSD(r.referrer_terminal_credits)}</Mono>
                    </td>
                    <td className="px-2 py-2.5">
                      <Mono className="text-ink-faint">{formatTokenAmount(toNum(r.referrer_bonus_tokens) / TOKEN_SHARE_PCT)}</Mono>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold text-ink">Token Burn Summary</p>
        <p className="mt-2 text-sm text-ink-dim">
          Total tokens burned from your referrals:{' '}
          <Mono className="font-semibold text-ink">{formatTokenAmount(stats?.total_tokens_burned ?? 0)}</Mono> $FDP 🔥
        </p>
        <p className="mt-1.5 text-xs text-ink-faint">Burning reduces total supply, increasing value for all holders.</p>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-ink">Terminal Credits</p>
        <Mono className="mt-2 block text-2xl font-bold text-purple">{formatUSD(credits?.total_credits ?? 0)}</Mono>
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-ink-dim">
            Status: <span className="font-semibold text-ink">{credits?.status === 'active' ? 'Accumulating' : credits?.status || 'Accumulating'}</span>
          </p>
          <p className="text-ink-dim">Redeemable: {credits?.message || 'When the Intelligence Terminal launches'}</p>
          <p className="text-ink-dim">Expires: {credits?.expires || '6 months after Terminal launch'}</p>
        </div>
      </Card>
    </div>
  );
}
