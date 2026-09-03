// ══════════════════════════════════════════════════
// src/lib/format.ts
// Formatting helpers — Postgres DECIMAL columns arrive as strings,
// so every numeric display goes through toNum() first.
// ══════════════════════════════════════════════════

import type { Numeric } from './types';

export function toNum(value: Numeric | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

// "$1,234.56" — always 2 decimals.
export function formatUSD(value: Numeric | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(n);
}

// "$1.2M" / "$500K" — for large numbers.
export function formatCompactUSD(value: Numeric | null | undefined): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}

// "500,000" — whole tokens, comma-grouped. Pass maxDecimals for the rare
// fractional-estimate display (e.g. an unconfirmed token estimate).
export function formatTokenAmount(value: Numeric | null | undefined, maxDecimals = 0): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(n);
}

export function formatNumber(value: Numeric | null | undefined, maxDecimals = 4): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals }).format(n);
}

// "+4,900%" — signed by default (for ROI/change values); pass
// showSign:false for a plain magnitude (TGE %, fill %, discount %, etc.).
export function formatPercentage(
  value: Numeric | null | undefined,
  opts: { decimals?: number; showSign?: boolean } = {}
): string {
  const { decimals = 0, showSign = true } = opts;
  const n = toNum(value);
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

// "$0.0010" under $1, "$1.25" at/over $1 — token/asset prices span both ranges.
export function formatTokenPrice(value: Numeric | null | undefined): string {
  const n = toNum(value);
  const decimals = Math.abs(n) < 1 ? 4 : 2;
  return `$${n.toFixed(decimals)}`;
}

// "0.1017 ETH" — more decimals for smaller amounts so dust isn't rounded away.
export function formatCrypto(value: Numeric | null | undefined, symbol: string): string {
  const n = toNum(value);
  const decimals = n === 0 ? 4 : Math.abs(n) < 0.001 ? 6 : Math.abs(n) < 1 ? 5 : 4;
  return `${formatNumber(n, decimals)} ${symbol}`;
}

export function truncateWallet(wallet: string | null | undefined, lead = 6, trail = 4): string {
  if (!wallet) return '';
  if (wallet.length <= lead + trail + 3) return wallet;
  return `${wallet.slice(0, lead)}...${wallet.slice(-trail)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
