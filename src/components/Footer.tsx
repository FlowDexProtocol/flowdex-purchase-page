'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Container } from './ui';
import { cms, type CmsPageData } from '@/lib/cms';
import { isSafeLinkUrl, sanitizeImageUrl } from '@/lib/url-safety';

// Absolute paths (not bare "#buy") so these work from any route — see the
// same fix in Header.tsx's NAV_LINKS for why a bare hash breaks off-homepage.
const LINKS = [
  { label: 'Buy FDP', href: '/#buy' },
  { label: 'Dashboard', href: '/#dashboard' },
  { label: 'Leaderboard', href: '/#leaderboard' },
  { label: 'Tiers', href: '/#tiers' },
  { label: 'Staking', href: '/#staking' },
  { label: 'Check Status', href: '/status' },
];

const LEGAL_LINKS = [{ label: 'Terms of Service', href: 'https://flowdexprotocol.com/terms' }];

// Copied verbatim from flowdex-landing's Footer so the icon-button social
// row in the brand column renders identically on both sites.
function SocialIcon({ type }: { type: 'x' | 'telegram' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor' } as const;
  if (type === 'x') {
    return (
      <svg {...common}>
        <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.5l8.1-9.3L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.4 4H5.6L17.7 20Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M21.9 3.5 2.6 11.1c-1.3.5-1.3 1.2-.2 1.6l4.9 1.5 1.9 5.8c.2.6.5.8.9.8s.5-.1.8-.4l2.4-2.3 5 3.7c.9.5 1.5.2 1.7-.8L23 5c.3-1.2-.4-1.8-1.1-1.5ZM8.5 14.9l9.6-6.4c.4-.3.8-.1.5.2l-8 7.5-.3 3.2-1.3-4.5Z" />
    </svg>
  );
}

export default function Footer({ cmsGlobal = {} }: { cmsGlobal?: CmsPageData }) {
  const logoType = cms(cmsGlobal, 'logo', 'type', 'text');
  const logoImageUrl = sanitizeImageUrl(cms(cmsGlobal, 'logo', 'image_url', ''));
  const logoMain = cms(cmsGlobal, 'logo', 'text_main', 'Flow');
  const logoAccent = cms(cmsGlobal, 'logo', 'text_accent', 'Dex');
  const supportEmail = cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com');
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const showLogoImage = logoType === 'image' && logoImageUrl && !logoImageFailed;

  const safeSocialUrl = (raw: string, fallback: string) => (isSafeLinkUrl(raw) ? raw : fallback);
  const communityLinks = [
    {
      key: 'x' as const,
      label: 'X / Twitter',
      href: safeSocialUrl(cms(cmsGlobal, 'social', 'twitter', 'https://x.com/flowdexprotocol'), 'https://x.com/flowdexprotocol'),
    },
    {
      key: 'telegram' as const,
      label: 'Telegram',
      href: safeSocialUrl(cms(cmsGlobal, 'social', 'telegram', 'https://t.me/flowdexprotocol'), 'https://t.me/flowdexprotocol'),
    },
    { key: 'docs' as const, label: 'Docs', href: 'https://docs.flowdexprotocol.com' },
  ];

  return (
    <footer className="border-t border-border bg-footer-bg">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/#top" className="flex items-center gap-3 mb-2">
              {showLogoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImageUrl}
                  alt={`${logoMain}${logoAccent}`}
                  className="h-8 w-auto object-contain"
                  onError={() => setLogoImageFailed(true)}
                />
              ) : (
                <>
                  <div className="f-logo-drops">
                    <div className="drop f-drop-1" />
                    <div className="drop f-drop-2" />
                  </div>
                  <div className="leading-none">
                    <span className="font-serif text-[22px]">
                      <em className="font-light italic">{logoMain}</em>
                      <span className="font-normal">{logoAccent}</span>
                    </span>
                    <span className="mt-px block text-[8px] uppercase tracking-[3px] text-white/20">Protocol</span>
                  </div>
                </>
              )}
            </Link>
            <p className="mt-3 max-w-[240px] text-sm text-ink-faint">
              {cms(cmsGlobal, 'site', 'tagline', 'Trade Everything. Know Everything.')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {communityLinks
                .filter((l) => l.key !== 'docs')
                .map((l) => (
                  <a
                    key={l.key}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center text-ink-faint transition-colors hover:text-ink"
                    aria-label={l.key}
                  >
                    <SocialIcon type={l.key} />
                  </a>
                ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Navigate</p>
            <ul>
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex min-h-11 items-center text-sm text-ink-faint transition-colors hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Legal</p>
            <ul>
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-sm text-ink-faint transition-colors hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Community</p>
            <ul>
              {communityLinks.map((l) => (
                <li key={l.key}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-sm text-ink-faint transition-colors hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-3 border-t border-border pt-5 text-center sm:flex-row sm:text-left">
          <span className="text-xs text-ink-faint">© {new Date().getFullYear()} FlowDex Protocol. All rights reserved.</span>
          <span className="text-xs text-ink-faint">
            {cms(
              cmsGlobal,
              'footer',
              'disclaimer',
              'This is not financial advice. FDP is a utility token. Cryptocurrency purchases carry risk, including total loss of funds. Presale tokens are subject to a cliff and vesting schedule and may not be immediately liquid. Nothing on this page constitutes an offer or solicitation to sell securities in any jurisdiction where such an offer would be unlawful.'
            )}
          </span>
        </div>

        <div className="mt-1 flex justify-center sm:justify-start">
          <a
            href={`mailto:${supportEmail}`}
            className="flex min-h-11 items-center text-xs text-ink-faint transition-colors hover:text-ink"
          >
            Support: {supportEmail}
          </a>
        </div>
      </Container>
    </footer>
  );
}
