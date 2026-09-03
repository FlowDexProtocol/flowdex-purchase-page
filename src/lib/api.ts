// ══════════════════════════════════════════════════
// src/lib/api.ts
// Thin client for the FlowDex Protocol backend.
// Paths and payload shapes are matched 1:1 against the backend routes.
// ══════════════════════════════════════════════════

import type {
  BuyerProfile,
  Claim,
  LeaderboardEntry,
  PriceResponse,
  Purchase,
  PurchaseIntentResponse,
  PurchaseReceipt,
  PurchaseStatusResponse,
  PublicStats,
  ReferralCredits,
  ReferralStats,
  ReferredUser,
  ScenariosResponse,
  StakingInfo,
  Tier,
  TierCurrent,
  WalletConnectResponse,
} from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.flowdexprotocol.com').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — could not reach the FlowDex API.', 0);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; message?: string; code?: string };
    throw new ApiError(payload.error || payload.message || `Request failed (${res.status})`, res.status, payload.code, data);
  }

  return data as T;
}

// ── Tiers ──
export const getTierCurrent = () => request<TierCurrent>('/api/tiers/current');
export const getTiers = () => request<Tier[]>('/api/tiers');

// ── Prices ──
export const getPrice = (crypto: string) => request<PriceResponse>(`/api/price/${encodeURIComponent(crypto)}`);

// ── Purchases ──
export interface PurchaseIntentPayload {
  buyer_wallet: string;
  chain: string;
  crypto: string;
  usd_amount: number;
  referral_code?: string;
}
export const postPurchaseIntent = (payload: PurchaseIntentPayload) =>
  request<PurchaseIntentResponse>('/api/purchases/intent', { method: 'POST', body: payload });

// Path assumed to match Fix 1's spec literally (singular "purchase") —
// GET /api/purchase/status/:tx_hash, public, no auth.
export const getPurchaseStatus = (txHash: string) =>
  request<PurchaseStatusResponse>(`/api/purchase/status/${encodeURIComponent(txHash)}`);

// ── Wallet ──
export interface WalletConnectPayload {
  wallet_address: string;
  chain_id?: number;
  wallet_type?: string;
}
export const connectWallet = (payload: WalletConnectPayload) =>
  request<WalletConnectResponse>('/api/wallet/connect', { method: 'POST', body: payload });

export const disconnectWalletSession = (token: string) =>
  request<{ success: boolean; message: string }>('/api/wallet/disconnect', { method: 'POST', token });

export const refreshWalletSession = (token: string) =>
  request<{ success: boolean; wallet: string; expires_in: string }>('/api/wallet/refresh', { method: 'POST', token });

// ── Buyer (requires Bearer session token) ──
export const getBuyerProfile = (wallet: string, token: string) =>
  request<{ success: boolean; buyer: BuyerProfile }>(`/api/buyer/${wallet}/profile`, { token });

export const getBuyerPurchases = (wallet: string, token: string) =>
  request<{ success: boolean; purchases: Purchase[] }>(`/api/buyer/${wallet}/purchases`, { token });

export const getPurchaseReceipt = (wallet: string, purchaseId: number, token: string) =>
  request<PurchaseReceipt>(`/api/buyer/${wallet}/receipt/${purchaseId}`, { token });

// ── Referrals (public by wallet) ──
export const getReferralStats = (wallet: string) =>
  request<{ success: boolean; stats: ReferralStats }>(`/api/referral/${wallet}/stats`);

export const getReferralList = (wallet: string) =>
  request<{ success: boolean; referrals: ReferredUser[] }>(`/api/referral/${wallet}/list`);

export const getReferralCredits = (wallet: string) =>
  request<ReferralCredits>(`/api/referral/${wallet}/credits`);

export interface ApplyReferralPayload {
  buyer_wallet: string;
  referral_code: string;
}
export const applyReferral = (payload: ApplyReferralPayload) =>
  request<{ success: boolean; bonus?: string; error?: string; code?: string }>('/api/referral/apply', {
    method: 'POST',
    body: payload,
  });

// ── Claims (public by wallet) ──
export const getClaims = (wallet: string) => request<Claim[]>(`/api/claims/${wallet}`);

export const postClaim = (wallet: string, tierId: number) =>
  request<{ success: boolean; error?: string; [key: string]: unknown }>(`/api/claims/${wallet}/claim`, {
    method: 'POST',
    body: { tier_id: tierId },
  });

// ── Public ──
export const getPublicLeaders = (limit = 10) =>
  request<LeaderboardEntry[]>(`/api/public/leaders?limit=${encodeURIComponent(String(limit))}`);

export const getPublicScenarios = () => request<ScenariosResponse>('/api/public/scenarios');
export const getPublicStaking = () => request<StakingInfo>('/api/public/staking');
export const getPublicStats = () => request<PublicStats>('/api/public/stats');
