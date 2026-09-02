import Link from 'next/link';
import { Container } from '@/components/ui';

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center py-24 text-center">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</div>
          <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">Page Not Found</h1>
          <p className="mt-2 text-sm text-ink-dim sm:text-base">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-[#03131a] transition-colors hover:bg-primary/90"
          >
            Go Home
          </Link>
        </div>
      </Container>
    </section>
  );
}
