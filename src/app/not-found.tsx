import Link from 'next/link';
import { Container } from '@/components/ui';

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center py-24 text-center">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">404</div>
          <h1 className="mt-3 font-serif text-3xl font-light text-ink sm:text-4xl">Page Not Found</h1>
          <p className="mt-2 text-sm text-ink-dim sm:text-base">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-[11px] font-medium uppercase tracking-[0.15em] text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5"
          >
            Go Home
          </Link>
        </div>
      </Container>
    </section>
  );
}
