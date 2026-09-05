// ══════════════════════════════════════════════════
// src/components/CoinIcons.tsx
// Simple inline SVG coin logos for the payment method pills in BuyForm —
// recognizable colored shapes, not pixel-perfect brand marks. Each icon
// flips to a white silhouette (with a pill-background-colored glyph, so it
// reads as a "cutout") when its pill is selected, matching the selected
// pill's solid primary-color background.
// ══════════════════════════════════════════════════

import type { PaymentMethodKey } from '@/lib/types';

const SELECTED_GLYPH = '#627EEA'; // matches the selected pill's background

function EthIcon({ selected }: { selected: boolean }) {
  const dark = selected ? '#FFFFFF' : '#627EEA';
  const light = selected ? 'rgba(255,255,255,0.6)' : '#9AA8F5';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polygon points="10,1 10,12.2 17.3,9" fill={light} />
      <polygon points="10,1 10,12.2 2.7,9" fill={dark} />
      <polygon points="10,13.4 10,19 17.3,10.4" fill={dark} />
      <polygon points="10,13.4 10,19 2.7,10.4" fill={light} />
    </svg>
  );
}

function UsdtIcon({ selected }: { selected: boolean }) {
  const shape = selected ? '#FFFFFF' : '#26A17B';
  const glyph = selected ? SELECTED_GLYPH : '#FFFFFF';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={shape} />
      <text x="10" y="14.2" textAnchor="middle" fontSize="11" fontWeight="700" fill={glyph}>
        ₮
      </text>
    </svg>
  );
}

// USDT (TRC-20) — same Tether mark, plus a small red TRON network badge in
// the bottom-right corner. The badge stays TRON-red in both selected and
// unselected states — it identifies the network, not the coin, so it
// doesn't follow the coin icon's own color-flip rule.
function UsdtTrc20Icon({ selected }: { selected: boolean }) {
  const shape = selected ? '#FFFFFF' : '#26A17B';
  const glyph = selected ? SELECTED_GLYPH : '#FFFFFF';
  const badgeRing = selected ? '#627EEA' : '#0B1A2E';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={shape} />
      <text x="10" y="14.2" textAnchor="middle" fontSize="11" fontWeight="700" fill={glyph}>
        ₮
      </text>
      <circle cx="15.5" cy="15.5" r="4.5" fill="#EB0029" stroke={badgeRing} strokeWidth="1" />
      <text x="15.5" y="18.2" textAnchor="middle" fontSize="6" fontWeight="700" fill="#FFFFFF">
        T
      </text>
    </svg>
  );
}

function UsdcIcon({ selected }: { selected: boolean }) {
  const shape = selected ? '#FFFFFF' : '#2775CA';
  const glyph = selected ? SELECTED_GLYPH : '#FFFFFF';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={shape} />
      <text x="10" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill={glyph}>
        $
      </text>
    </svg>
  );
}

function BnbIcon({ selected }: { selected: boolean }) {
  const shape = selected ? '#FFFFFF' : '#F0B90B';
  const hole = selected ? SELECTED_GLYPH : '#0B1A2E';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <polygon points="10,1 17,10 10,19 3,10" fill={shape} />
      <polygon points="10,7 13,10 10,13 7,10" fill={hole} />
    </svg>
  );
}

function SolIcon({ selected }: { selected: boolean }) {
  const bars = selected ? SELECTED_GLYPH : '#FFFFFF';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {selected ? (
        <circle cx="10" cy="10" r="9" fill="#FFFFFF" />
      ) : (
        <>
          <defs>
            <linearGradient id="sol-pill-gradient" x1="0" y1="0" x2="20" y2="20">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
          <circle cx="10" cy="10" r="9" fill="url(#sol-pill-gradient)" />
        </>
      )}
      <g fill={bars}>
        <rect x="5" y="6.6" width="10" height="1.7" rx="0.85" />
        <rect x="6.5" y="9.2" width="8.5" height="1.7" rx="0.85" />
        <rect x="5" y="11.8" width="10" height="1.7" rx="0.85" />
      </g>
    </svg>
  );
}

function BtcIcon({ selected }: { selected: boolean }) {
  const shape = selected ? '#FFFFFF' : '#F7931A';
  const glyph = selected ? SELECTED_GLYPH : '#FFFFFF';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={shape} />
      <text x="10" y="14.2" textAnchor="middle" fontSize="11" fontWeight="700" fill={glyph}>
        ₿
      </text>
    </svg>
  );
}

const ICON_BY_METHOD: Record<PaymentMethodKey, (props: { selected: boolean }) => React.JSX.Element> = {
  ETH: EthIcon,
  'USDT-ERC20': UsdtIcon,
  'USDT-TRC20': UsdtTrc20Icon,
  USDC: UsdcIcon,
  BNB: BnbIcon,
  SOL: SolIcon,
  BTC: BtcIcon,
};

export function PaymentMethodIcon({ methodKey, selected }: { methodKey: PaymentMethodKey; selected: boolean }) {
  const Icon = ICON_BY_METHOD[methodKey];
  return <Icon selected={selected} />;
}
