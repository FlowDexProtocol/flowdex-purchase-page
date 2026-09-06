'use client';

import { usePublicStats } from '@/lib/hooks';

// Social proof counter — GET /api/public/stats' total_buyers field. Grows
// as real buyers confirm purchases; shows an inviting message at zero
// instead of "0 wallets connected".
export default function WalletsConnectedCounter({ className = '' }: { className?: string }) {
  const { data } = usePublicStats();
  if (!data) return null;

  return (
    <div className={`flex items-center justify-center gap-2 text-xs text-ink-dim ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-primary">
        <path
          d="M17 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M15.5 3.5a3 3 0 0 1 0 6M20 20v-1a4 4 0 0 0-2.5-3.7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      {data.total_buyers > 0 ? (
        <span>
          <span className="font-semibold text-ink">{data.total_buyers.toLocaleString()}</span> wallets connected
        </span>
      ) : (
        <span>Be among the first</span>
      )}
    </div>
  );
}
