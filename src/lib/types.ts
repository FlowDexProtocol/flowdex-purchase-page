// ══════════════════════════════════════════════════
// src/lib/types.ts
// Types mirror the actual flowdex-backend response shapes.
// Decimal/numeric Postgres columns come back as strings unless the
// route explicitly parseFloat()s them — those fields are typed `Numeric`.
// ══════════════════════════════════════════════════

export type Numeric = string | number;

export interface Tier {
  id: number;
  name: string;
  price: Numeric;
  hard_cap_usd: Numeric;
  total_raised_usd: Numeric;
  is_active: boolean;
  claims_open: boolean;
  tge_percentage: Numeric;
  cliff_months: number;
  vest_months: number;
  opened_at: string | null;
  closed_at: string | null;
}

export interface TierCurrent {
  id: number;
  name: string;
  price: number;
  total_raised_usd: number;
  hard_cap_usd: number;
  progress_pct: string;
  tge_percentage: number;
  cliff_months: number;
  vest_months: number;
  claims_open: boolean;
  bonus: string | null;
  status: string | null;
  countdown: string | null;
  message?: string;
}

export interface PriceResponse {
  crypto: string;
  usd_price: number;
  updated_at: string;
  // true once the price is over 5 minutes old (still under the backend's
  // 15-minute stale-price cutoff, past which /api/price/:crypto 503s instead).
  is_delayed: boolean;
}

export interface PurchaseStatusResponse {
  found: boolean;
  status?: string;
  usd_value?: Numeric;
  tokens_allocated?: Numeric;
  tier_name?: string;
  created_at?: string;
  confirmed_at?: string;
}

export interface PurchaseReceipt {
  id: number;
  created_at: string;
  buyer_wallet: string;
  chain: string;
  crypto_currency: string;
  crypto_amount: Numeric;
  usd_value: Numeric;
  tier_name: string;
  tier_price: Numeric;
  tokens_allocated: Numeric;
  bonus_tokens?: Numeric;
  referral_code_used?: string | null;
  tx_hash: string;
  status: string;
  tge_percentage: Numeric;
  cliff_months: number;
  vest_months: number;
}

export interface PurchaseIntentResponse {
  success: boolean;
  intent_id: number;
  receiving_address: string;
  crypto_amount: string;
  price_locked: number;
  expires_in: string;
  tokens_estimated: number;
  tier: { id: number; name: string; price: number };
  error?: string;
  code?: string;
}

export interface WalletConnectResponse {
  success: boolean;
  token: string;
  expires_in: string;
  wallet: string;
  referral_code: string;
  is_new_buyer: boolean;
  summary: {
    total_tokens: number;
    total_spent: number;
    purchase_count: number;
  };
  terminal_credits: number;
  pending_claims: { tier: number; tokens: number }[];
}

export interface BuyerProfile {
  buyer_wallet: string;
  referral_code: string;
  referred_by_wallet: string | null;
  referred_by_code: string | null;
  country: string | null;
  country_code: string | null;
  state: string | null;
  city: string | null;
  tag: string | null;
  btc_deposit_address: string | null;
  total_purchases: number;
  total_usd_spent: Numeric;
  total_tokens: Numeric;
  total_referral_purchases: number;
  total_referral_volume_usd: Numeric;
  total_referral_earnings_usd: Numeric;
  total_referral_earnings_tokens: Numeric;
  total_terminal_credits_usd: Numeric;
  total_bonus_tokens: Numeric;
  total_tokens_burned: Numeric;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  tx_hash: string;
  chain: string;
  network_name: string | null;
  crypto_currency: string;
  crypto_amount: Numeric;
  usd_value: Numeric;
  tier_at_purchase: number | null;
  tier_name: string | null;
  tier_price: Numeric | null;
  tokens_allocated: Numeric;
  status: string;
  payment_match_status: string | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface ReferralStats {
  referral_code: string;
  total_referral_purchases: number;
  total_referral_volume_usd: Numeric;
  total_referral_earnings_usd: Numeric;
  total_referral_earnings_tokens: Numeric;
  total_terminal_credits_usd: Numeric;
  total_bonus_tokens: Numeric;
  total_tokens_burned: Numeric;
}

export interface ReferredUser {
  referred_wallet: string;
  has_purchased: boolean;
  first_purchase_at: string | null;
  total_purchases: number;
  total_volume_usd: Numeric;
  referrer_bonus_usd: Numeric;
  referrer_terminal_credits: Numeric;
  referrer_bonus_tokens: Numeric;
  status: string;
  created_at: string;
}

export interface ReferralCredits {
  success: boolean;
  total_credits: number;
  status: string;
  message: string;
  expires: string;
}

export interface Claim {
  id: number;
  buyer_wallet: string;
  tier_id: number;
  tier_name: string | null;
  total_purchased_tokens: Numeric;
  tge_percentage: Numeric;
  claimable_tokens: Numeric;
  bonus_tokens_claimable: Numeric;
  total_claimable: Numeric;
  status: string;
  claimed_at: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  wallet: string;
  total_usd: number;
  total_tokens: number;
  purchase_count: number;
  buyer_tag: string | null;
}

export interface ScenariosResponse {
  listing_price: number;
  total_supply: number;
  scenarios: { label: string; multiplier: number; price: number; mcap: number }[];
}

export interface StakingInfo {
  status: string;
  phase: number;
  fee_share_pct: number;
  token: string;
  description: string;
  features: string[];
}

export interface PublicStats {
  total_raised_usd: number;
  total_buyers: number;
  current_tier: Tier | null;
}

export const PAYMENT_METHODS = [
  { key: 'ETH', label: 'ETH', chain: 'ethereum', crypto: 'ETH', network: 'Ethereum' },
  { key: 'USDT-ERC20', label: 'USDT (ERC-20)', chain: 'ethereum', crypto: 'USDT', network: 'Ethereum' },
  { key: 'USDT-TRC20', label: 'USDT (TRC-20)', chain: 'tron', crypto: 'USDT', network: 'Tron' },
  { key: 'USDC', label: 'USDC', chain: 'ethereum', crypto: 'USDC', network: 'Ethereum' },
  { key: 'BNB', label: 'BNB', chain: 'bsc', crypto: 'BNB', network: 'BNB Chain' },
  { key: 'SOL', label: 'SOL', chain: 'solana', crypto: 'SOL', network: 'Solana' },
  { key: 'BTC', label: 'BTC', chain: 'bitcoin', crypto: 'BTC', network: 'Bitcoin' },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]['key'];
