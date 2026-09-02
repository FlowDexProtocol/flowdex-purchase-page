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
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">Something Went Wrong</h1>
          <p className="mt-2 text-sm text-ink-dim sm:text-base">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#03131a] transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </Container>
    </section>
  );
}
