'use client';

import { useState } from 'react';
import { Container } from './ui';
import { cms, type CmsPageData } from '@/lib/cms';

const LINKS = [
  { label: 'Buy $FDP', href: '#buy' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Leaderboard', href: '#leaderboard' },
  { label: 'Tiers', href: '#tiers' },
  { label: 'Staking', href: '#staking' },
  { label: 'Check Status', href: '/status' },
];

const LEGAL_LINKS = [{ label: 'Terms of Service', href: 'https://flowdexprotocol.com/terms' }];

// Copied verbatim from flowdex-landing's Footer so the icon-button social
// row in the brand column renders identically on both sites.
function SocialIcon({ type }: { type: 'x' | 'telegram' | 'discord' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor' } as const;
  if (type === 'x') {
    return (
      <svg {...common}>
        <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.5l8.1-9.3L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.7L7.4 4H5.6L17.7 20Z" />
      </svg>
    );
  }
  if (type === 'telegram') {
    return (
      <svg {...common}>
        <path d="M21.9 3.5 2.6 11.1c-1.3.5-1.3 1.2-.2 1.6l4.9 1.5 1.9 5.8c.2.6.5.8.9.8s.5-.1.8-.4l2.4-2.3 5 3.7c.9.5 1.5.2 1.7-.8L23 5c.3-1.2-.4-1.8-1.1-1.5ZM8.5 14.9l9.6-6.4c.4-.3.8-.1.5.2l-8 7.5-.3 3.2-1.3-4.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20.3 5.3A18 18 0 0 0 15.7 4l-.3.6a15 15 0 0 1 4 1.4 16.9 16.9 0 0 0-14.8 0 15 15 0 0 1 4-1.4L8.3 4a18 18 0 0 0-4.6 1.3C1 9.6.3 13.8.6 18a17.9 17.9 0 0 0 5.4 2.7l.8-1.3a11.6 11.6 0 0 1-1.8-.9l.5-.4a12.9 12.9 0 0 0 11 0l.5.4a11.6 11.6 0 0 1-1.8.9l.8 1.3A17.8 17.8 0 0 0 21.4 18c.4-4.8-.8-9-4.7-12.7ZM9 15.2c-.9 0-1.6-.8-1.6-1.8S8.1 11.6 9 11.6s1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z" />
    </svg>
  );
}

export default function Footer({ cmsGlobal = {} }: { cmsGlobal?: CmsPageData }) {
  const logoType = cms(cmsGlobal, 'logo', 'type', 'text');
  const logoImageUrl = cms(cmsGlobal, 'logo', 'image_url', '');
  const logoMain = cms(cmsGlobal, 'logo', 'text_main', 'Flow');
  const logoAccent = cms(cmsGlobal, 'logo', 'text_accent', 'Dex');
  const supportEmail = cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com');
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const showLogoImage = logoType === 'image' && logoImageUrl && !logoImageFailed;

  const communityLinks = [
    { key: 'x' as const, label: 'X / Twitter', href: cms(cmsGlobal, 'social', 'twitter', 'https://x.com/flowdexprotocol') },
    { key: 'telegram' as const, label: 'Telegram', href: cms(cmsGlobal, 'social', 'telegram', 'https://t.me/flowdexprotocol') },
    { key: 'discord' as const, label: 'Discord', href: cms(cmsGlobal, 'social', 'discord', 'https://discord.gg/flowdexprotocol') },
    { key: 'docs' as const, label: 'Docs', href: 'https://docs.flowdexprotocol.com' },
  ];

  return (
    <footer className="border-t border-border bg-footer-bg">
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-0.5">
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
                  <span className="text-xl font-bold text-ink sm:text-2xl">{logoMain}</span>
                  <span className="text-xl font-bold text-primary sm:text-2xl">{logoAccent}</span>
                </>
              )}
            </a>
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
                  <a href={l.href} className="flex min-h-11 items-center text-sm text-ink-faint transition-colors hover:text-ink">
                    {l.label}
                  </a>
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
              'This is not financial advice. $FDP is a utility token. Cryptocurrency purchases carry risk, including total loss of funds. Presale tokens are subject to a cliff and vesting schedule and may not be immediately liquid. Nothing on this page constitutes an offer or solicitation to sell securities in any jurisdiction where such an offer would be unlawful.'
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
