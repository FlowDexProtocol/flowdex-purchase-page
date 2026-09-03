'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, getPurchaseStatus } from '@/lib/api';
import type { PurchaseStatusResponse } from '@/lib/types';
import { formatDate, formatTokenAmount, formatUSD, truncateWallet } from '@/lib/format';
import { cms, type CmsPageData } from '@/lib/cms';
import { Badge, Button, Card, ErrorNote, Input, Mono, Section, SectionHeading } from './ui';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  confirmed: 'green',
  pending: 'amber',
  expired: 'red',
  needs_pricing: 'neutral',
};

export default function StatusChecker({ cmsGlobal = {} }: { cmsGlobal?: CmsPageData }) {
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseStatusResponse | null>(null);
  const [checkedHash, setCheckedHash] = useState('');

  const supportEmail = cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hash = txHash.trim();
    if (!hash) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await getPurchaseStatus(hash);
      setResult(res);
      setCheckedHash(hash);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section id="status">
      <SectionHeading eyebrow="Presale" title="Check Purchase Status" description="No wallet connection needed — anyone can check any transaction hash." />

      <Card className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="tx-hash" className="sr-only">
            Enter your transaction hash
          </label>
          <Input
            id="tx-hash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter your transaction hash"
            className="flex-1 font-mono text-xs"
          />
          <Button type="submit" disabled={loading || !txHash.trim()}>
            {loading ? 'Checking…' : 'Check Status'}
          </Button>
        </form>

        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {result && !error && (
          <div className="mt-6 border-t border-border pt-5">
            {result.found ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone={STATUS_TONE[result.status || ''] || 'neutral'}>{result.status}</Badge>
                  {result.confirmed_at && <span className="text-xs text-ink-faint">Confirmed {formatDate(result.confirmed_at)}</span>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-ink-dim">USD Value</p>
                    <Mono className="text-ink">{formatUSD(result.usd_value)}</Mono>
                  </div>
                  <div>
                    <p className="text-xs text-ink-dim">$FDP Allocated</p>
                    <Mono className="text-green">{formatTokenAmount(result.tokens_allocated)}</Mono>
                  </div>
                  <div>
                    <p className="text-xs text-ink-dim">Tier</p>
                    <p className="text-ink">{result.tier_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-dim">Date</p>
                    <p className="text-ink">{formatDate(result.created_at)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-dim">Transaction</p>
                  <Mono className="text-xs text-ink-faint" title={checkedHash}>
                    {truncateWallet(checkedHash)}
                  </Mono>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-dim">
                Transaction not found. It may take a few minutes to appear. If your payment was sent more than 30
                minutes ago, contact{' '}
                <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">
                  {supportEmail}
                </a>
                .
              </p>
            )}
          </div>
        )}
      </Card>
    </Section>
  );
}
