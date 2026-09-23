'use client';

import { useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-14 sm:py-20 scroll-mt-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8 sm:mb-10">
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      )}
      <h2 className="font-serif text-3xl sm:text-4xl font-light text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm sm:text-base text-ink-dim">{description}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border-soft bg-card p-6 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-white/[0.12] ${className}`}
    >
      {children}
    </div>
  );
}

export function Mono({
  children,
  className = '',
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`font-mono tabular-nums ${className}`} {...rest}>
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-7 py-3 text-[11px] font-medium uppercase tracking-[0.15em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 shadow-[0_0_24px_rgba(108,92,231,0.15)]',
    secondary: 'bg-white/[0.04] text-ink border border-white/[0.22] backdrop-blur-sm hover:bg-white/10 hover:border-white/40 hover:shadow-[0_0_24px_rgba(108,92,231,0.1)]',
    outline: 'bg-transparent text-primary border border-primary/60 hover:bg-primary-dim hover:border-primary',
    ghost: 'text-ink-dim hover:text-ink hover:bg-white/5',
    danger: 'bg-red text-white hover:bg-red/90',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'primary',
  className = '',
}: {
  children: ReactNode;
  tone?: 'primary' | 'green' | 'red' | 'purple' | 'neutral' | 'amber';
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: 'bg-[rgba(108,92,231,0.08)] text-[#a78bfa] border border-[rgba(108,92,231,0.25)]',
    green: 'bg-[rgba(74,222,128,0.08)] text-[#4ade80] border border-[rgba(74,222,128,0.2)]',
    red: 'bg-[rgba(239,68,68,0.08)] text-[#f87171] border border-[rgba(239,68,68,0.2)]',
    purple: 'bg-[rgba(168,85,247,0.08)] text-[#c084fc] border border-[rgba(168,85,247,0.25)]',
    neutral: 'bg-white/5 text-ink-dim border border-white/[0.08]',
    amber: 'bg-amber-dim text-amber border border-amber/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ProgressBar({ pct, className = '' }: { pct: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-white/5 ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${clamped}%`,
          background: 'linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
        }}
      />
    </div>
  );
}

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-white/[0.12] px-4 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-ink-dim hover:text-ink hover:border-white/30 transition-colors"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

// Four-step vesting visual: TGE -> cliff -> vesting -> full unlock.
// `markerPct` (0-100) optionally places a "you are here" dot along the
// cliff+vesting span, for showing live progress after a claim.
export function VestingTimeline({
  tgePct,
  cliffMonths,
  vestMonths,
  markerPct,
  grayed = false,
  className = '',
}: {
  tgePct: number;
  cliffMonths: number;
  vestMonths: number;
  markerPct?: number;
  grayed?: boolean;
  className?: string;
}) {
  const totalMonths = Math.max(cliffMonths + vestMonths, 1);
  const cliffWidthPct = (cliffMonths / totalMonths) * 100;
  const vestWidthPct = (vestMonths / totalMonths) * 100;
  const dotColor = grayed ? 'bg-ink-faint' : 'bg-primary';
  const lineColor = grayed ? 'bg-white/5' : 'bg-primary/20';

  return (
    <div className={className}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div className={`absolute inset-y-0 left-0 ${lineColor}`} style={{ width: `${cliffWidthPct}%` }} />
        <div
          className={`absolute inset-y-0 ${grayed ? 'bg-white/10' : 'bg-primary/40'}`}
          style={{ left: `${cliffWidthPct}%`, width: `${vestWidthPct}%` }}
        />
        {typeof markerPct === 'number' && (
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-bg ${dotColor}`}
            style={{ left: `${Math.min(100, Math.max(0, markerPct))}%` }}
          />
        )}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs leading-tight text-ink-faint">
        <div>
          <span className={`block font-semibold ${grayed ? 'text-ink-faint' : 'text-primary'}`}>TGE {tgePct}%</span>
          Instant
        </div>
        <div>
          <span className="block font-semibold text-ink-dim">{cliffMonths}mo</span>
          Cliff
        </div>
        <div>
          <span className="block font-semibold text-ink-dim">{vestMonths}mo</span>
          Vesting
        </div>
        <div>
          <span className={`block font-semibold ${grayed ? 'text-ink-faint' : 'text-green'}`}>Full Unlock</span>
          {totalMonths}mo total
        </div>
      </div>
    </div>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-xl border border-border-soft bg-bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/60 transition-colors ${className}`}
      {...rest}
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-border-soft bg-white/[0.02] p-10 text-center text-sm text-ink-dim">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-red/30 bg-red-dim px-4 py-3 text-sm text-red">{children}</div>
  );
}
