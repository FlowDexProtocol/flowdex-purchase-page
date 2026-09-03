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

export default function Footer({ cmsGlobal = {} }: { cmsGlobal?: CmsPageData }) {
  const logoType = cms(cmsGlobal, 'logo', 'type', 'text');
  const logoImageUrl = cms(cmsGlobal, 'logo', 'image_url', '');
  const logoMain = cms(cmsGlobal, 'logo', 'text_main', 'Flow');
  const logoAccent = cms(cmsGlobal, 'logo', 'text_accent', 'Dex');
  const supportEmail = cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com');
  const [logoImageFailed, setLogoImageFailed] = useState(false);
  const showLogoImage = logoType === 'image' && logoImageUrl && !logoImageFailed;

  const SOCIAL = [
    { label: 'X / Twitter', href: cms(cmsGlobal, 'social', 'twitter', 'https://x.com/flowdexprotocol') },
    { label: 'Telegram', href: cms(cmsGlobal, 'social', 'telegram', 'https://t.me/flowdexprotocol') },
    { label: 'Discord', href: cms(cmsGlobal, 'social', 'discord', 'https://discord.gg/flowdexprotocol') },
    { label: 'Docs', href: 'https://docs.flowdexprotocol.com' },
  ];

  return (
    <footer className="mt-10 border-t border-border bg-bg-soft">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-0.5">
              {showLogoImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImageUrl}
                  alt={`${logoMain}${logoAccent}`}
                  className="h-6 w-auto object-contain"
                  onError={() => setLogoImageFailed(true)}
                />
              ) : (
                <>
                  <span className="text-base font-bold text-ink">{logoMain}</span>
                  <span className="text-base font-bold text-primary">{logoAccent}</span>
                </>
              )}
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-dim">
              {cms(cmsGlobal, 'site', 'tagline', 'Trade Everything. Know Everything.')}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Navigate</p>
            <ul className="mt-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="flex min-h-11 items-center text-sm text-ink-dim hover:text-ink transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Community</p>
            <ul className="mt-1">
              {SOCIAL.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center text-sm text-ink-dim hover:text-ink transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-ink-faint">
            {cms(
              cmsGlobal,
              'footer',
              'disclaimer',
              'This is not financial advice. $FDP is a utility token. Cryptocurrency purchases carry risk, including total loss of funds. Presale tokens are subject to a cliff and vesting schedule and may not be immediately liquid. Nothing on this page constitutes an offer or solicitation to sell securities in any jurisdiction where such an offer would be unlawful.'
            )}
          </p>
          <p className="mt-4 text-xs text-ink-faint">© {new Date().getFullYear()} FlowDex Protocol. All rights reserved.</p>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {LEGAL_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center text-xs text-ink-faint hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href={`mailto:${supportEmail}`}
              className="flex min-h-11 items-center text-xs text-ink-faint hover:text-ink transition-colors"
            >
              Support: {supportEmail}
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
