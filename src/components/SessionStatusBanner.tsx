'use client';

import { useWallet } from '@/context/wallet-context';

// Renders nothing until the session is within 2 minutes of its hard
// 20-minute expiry, or has already expired. See wallet-context.tsx —
// the timer is fixed from connection time and is never extended by activity.
export default function SessionStatusBanner() {
  const { sessionExpired, sessionWarning, reconnectSession } = useWallet();

  if (sessionExpired) {
    return (
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-red/30 bg-red-dim px-4 py-2.5 text-center text-sm text-red">
        <span>Session expired. Please reconnect your wallet.</span>
        <button
          onClick={reconnectSession}
          className="rounded-md bg-red px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Reconnect
        </button>
      </div>
    );
  }

  if (sessionWarning) {
    return (
      <div className="sticky top-0 z-50 border-b border-amber/30 bg-amber-dim px-4 py-2 text-center text-xs text-amber">
        Session expires in 2 minutes. Stay active to keep your connection.
      </div>
    );
  }

  return null;
}
