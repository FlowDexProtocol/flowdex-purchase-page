// ══════════════════════════════════════════════════
// src/lib/vesting.ts
// Client-side vesting math. The backend only persists a single TGE
// claim record per (wallet, tier) — the post-cliff linear release is
// not tracked anywhere server-side, so "vested so far" / "remaining"
// are computed here from the tier's cliff/vest months and the tier's
// closed_at date (cliff starts when the tier closes).
// ══════════════════════════════════════════════════

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

export interface VestingDates {
  cliffEnd: Date;
  fullUnlock: Date;
}

export function getVestingDates(closedAt: string | Date, cliffMonths: number, vestMonths: number): VestingDates {
  const closeDate = typeof closedAt === 'string' ? new Date(closedAt) : closedAt;
  const cliffEnd = addMonths(closeDate, cliffMonths);
  const fullUnlock = addMonths(cliffEnd, vestMonths);
  return { cliffEnd, fullUnlock };
}

// Fractional months elapsed between two dates (30-day months, matches
// the backend's own 30-day-month credit-expiry convention).
export function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000));
}

// Linear release after the cliff: 0 during the cliff, then a straight
// line from 0 to `remainingTokens` across `vestMonths`, capped once
// `fullUnlock` has passed.
export function getVestedAmount(remainingTokens: number, cliffEnd: Date, vestMonths: number, fullUnlock: Date, now: Date): number {
  if (now < cliffEnd) return 0;
  if (now >= fullUnlock || vestMonths <= 0) return remainingTokens;
  const monthsSinceCliff = monthsBetween(cliffEnd, now);
  return Math.min(remainingTokens, (monthsSinceCliff / vestMonths) * remainingTokens);
}
