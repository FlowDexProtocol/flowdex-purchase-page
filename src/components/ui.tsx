'use client';

import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

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
      <h2 className="text-2xl sm:text-3xl font-bold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm sm:text-base text-ink-dim">{description}</p>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>{children}</div>
  );
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{children}</span>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-[#03131a] hover:bg-primary/90',
    secondary: 'bg-card-hover text-ink border border-border hover:border-primary/50',
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
  tone?: 'primary' | 'green' | 'red' | 'purple' | 'neutral';
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-dim text-primary',
    green: 'bg-green-dim text-green',
    red: 'bg-red-dim text-red',
    purple: 'bg-purple-dim text-purple',
    neutral: 'bg-white/5 text-ink-dim',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}>
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
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-white/5 ${className}`}>
      <div className="h-full rounded-full bg-green transition-[width] duration-700 ease-out" style={{ width: `${clamped}%` }} />
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
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-border px-3 py-1 text-xs font-semibold text-ink-dim hover:text-primary hover:border-primary/50 transition-colors"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-dim">{children}</div>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-red/30 bg-red-dim px-4 py-3 text-sm text-red">{children}</div>
  );
}
