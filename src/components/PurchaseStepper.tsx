'use client';

import type { PurchaseWatchStatus } from '@/lib/types';
import { Spinner } from './ui';

const STEPS = [
  'Intent Created',
  'Waiting for Payment...',
  'Confirming on Blockchain...',
  'Complete!',
] as const;

// Maps the poll result to which step is currently active (index 0 —
// "Intent Created" — is always already complete the moment this renders).
function activeStepIndex(status: PurchaseWatchStatus | null): number {
  if (status === 'confirmed') return 3;
  if (status === 'detected') return 2;
  return 1; // 'pending', 'expired', or no poll result yet
}

export default function PurchaseStepper({ status }: { status: PurchaseWatchStatus | null }) {
  const active = activeStepIndex(status);

  return (
    <div className="flex flex-col gap-2.5">
      {STEPS.map((label, i) => {
        const isComplete = i < active || (i === active && status === 'confirmed');
        const isActive = i === active && !isComplete;

        return (
          <div key={label} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                isComplete
                  ? 'bg-green text-[#03131a]'
                  : isActive
                    ? 'border-2 border-primary text-primary'
                    : 'border border-border text-ink-faint'
              }`}
            >
              {isComplete ? (
                '✓'
              ) : isActive && i === 1 ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              ) : isActive && i === 2 ? (
                <Spinner className="h-3 w-3 text-primary" />
              ) : (
                i + 1
              )}
            </span>
            <span className={`text-sm ${isComplete ? 'text-ink' : isActive ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
              {label}
              {isComplete && i === 0 ? ' ✓' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
