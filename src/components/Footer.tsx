import { Container } from './ui';

const LINKS = [
  { label: 'Buy $FDP', href: '#buy' },
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Leaderboard', href: '#leaderboard' },
  { label: 'Tiers', href: '#tiers' },
  { label: 'Staking', href: '#staking' },
];

const LEGAL_LINKS = [{ label: 'Terms of Service', href: 'https://flowdexprotocol.com/terms' }];

const SOCIAL = [
  { label: 'X / Twitter', href: 'https://x.com/flowdexprotocol' },
  { label: 'Telegram', href: 'https://t.me/flowdexprotocol' },
  { label: 'Discord', href: 'https://discord.gg/flowdexprotocol' },
  { label: 'Docs', href: 'https://docs.flowdexprotocol.com' },
];

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-border bg-bg-soft">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple font-bold text-[#03131a]">
                F
              </span>
              <span className="text-lg font-bold">
                FlowDex <span className="text-primary">Protocol</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-dim">Trade Everything. Know Everything.</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Navigate</p>
            <ul className="mt-3 space-y-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm text-ink-dim hover:text-ink transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Community</p>
            <ul className="mt-3 space-y-2">
              {SOCIAL.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-dim hover:text-ink transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-ink-faint">
            This is not financial advice. $FDP is a utility token. Cryptocurrency purchases carry risk, including
            total loss of funds. Presale tokens are subject to a cliff and vesting schedule and may not be
            immediately liquid. Nothing on this page constitutes an offer or solicitation to sell securities in any
            jurisdiction where such an offer would be unlawful.
          </p>
          <p className="mt-4 text-xs text-ink-faint">© {new Date().getFullYear()} FlowDex Protocol. All rights reserved.</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ink-faint hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a href="mailto:support@flowdexprotocol.com" className="text-xs text-ink-faint hover:text-ink transition-colors">
              Support: support@flowdexprotocol.com
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
