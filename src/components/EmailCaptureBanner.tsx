'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useWallet } from '@/context/wallet-context';
import { ApiError, getSubscriptionStatus, postSubscribe } from '@/lib/api';
import { Button, Input, Spinner } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Small, non-intrusive banner at the top of the Dashboard tab — a second,
// more visible touchpoint alongside the optional email field on the buy
// form itself, for buyers who skipped that step.
export default function EmailCaptureBanner() {
  const { address, authedFetch } = useWallet();
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setChecking(true);
    authedFetch((token) => getSubscriptionStatus(address, token))
      .then((res) => {
        if (!cancelled) setSubscribed(res.subscribed);
      })
      .catch(() => {
        // Non-fatal — just show the capture form as if not subscribed.
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, authedFetch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postSubscribe({ email: trimmed, wallet_address: address ?? undefined });
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to subscribe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-ink-dim sm:text-sm">
        Get notified about your purchase status and TGE announcements
      </p>

      {subscribed ? (
        <span className="text-xs font-semibold text-green sm:text-sm">Subscribed ✓</span>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="!w-auto !py-1.5 text-xs sm:text-sm"
          />
          <Button type="submit" disabled={submitting} className="!min-h-0 !px-3 !py-1.5 text-xs sm:text-sm">
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : 'Subscribe'}
          </Button>
        </form>
      )}

      {error && <p className="w-full text-xs text-red">{error}</p>}
    </div>
  );
}
