'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@/context/wallet-context';
import { ApiError, getClaims, postClaim } from '@/lib/api';
import type { Claim } from '@/lib/types';
import { formatDate, formatPct, formatTokens, toNum } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorNote, Mono, Spinner } from './ui';

export default function ClaimsTab() {
  const { address } = useWallet();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getClaims(address);
      setClaims(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaim(claim: Claim) {
    if (!address) return;
    setClaimingId(claim.id);
    setClaimError(null);
    try {
      const res = await postClaim(address, claim.tier_id);
      if (!res.success) throw new Error((res.error as string) || 'Claim failed');
      await load();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaimingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (claims.length === 0) return <EmptyState>No claims available yet. Claims open once a tier reaches TGE.</EmptyState>;

  return (
    <div className="space-y-4">
      {claimError && <ErrorNote>{claimError}</ErrorNote>}
      {claims.map((c) => (
        <Card key={c.id} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-ink">{c.tier_name || `Tier ${c.tier_id}`}</p>
              <Badge tone={c.status === 'claimed' ? 'neutral' : c.status === 'eligible' ? 'green' : 'primary'}>{c.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-ink-dim">
              TGE {formatPct(c.tge_percentage, 0)} · Purchased <Mono>{formatTokens(c.total_purchased_tokens)}</Mono> $FDP
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs text-ink-dim">Claimable now</p>
            <Mono className="text-lg font-bold text-primary">{formatTokens(c.total_claimable)}</Mono>
          </div>

          <Button
            className="w-full sm:w-auto"
            onClick={() => handleClaim(c)}
            disabled={c.status !== 'eligible' || claimingId === c.id || toNum(c.total_claimable) <= 0}
          >
            {claimingId === c.id ? 'Claiming…' : c.status === 'claimed' ? 'Claimed' : 'Claim'}
          </Button>

          {c.claimed_at && <p className="w-full text-xs text-ink-faint">Claimed {formatDate(c.claimed_at)}</p>}
        </Card>
      ))}
    </div>
  );
}
