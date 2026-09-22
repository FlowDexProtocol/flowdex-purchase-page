'use client';

import { useEffect } from 'react';
import { Container } from '@/components/ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center py-24 text-center">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="font-serif text-3xl font-light text-ink sm:text-4xl">Something Went Wrong</h1>
          <p className="mt-2 text-sm text-ink-dim sm:text-base">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5"
          >
            Try Again
          </button>
        </div>
      </Container>
    </section>
  );
}
