'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useWallet } from '@/context/wallet-context';
import { useTierCurrent } from '@/lib/hooks';
import { ApiError, applyReferral, getPrice, postPurchaseIntent } from '@/lib/api';
import { checkEvmBalance } from '@/lib/balance';
import { PAYMENT_METHODS, type PaymentMethodKey } from '@/lib/types';
import { formatCrypto, formatDuration, formatTokenPrice, formatTokenAmount, formatUSD, toNum } from '@/lib/format';
import { cms, type CmsPageData } from '@/lib/cms';
import { Badge, Button, Card, CopyButton, ErrorNote, Mono, Section, SectionHeading, Spinner, VestingTimeline } from './ui';
import type { PurchaseIntentResponse, TierCurrent } from '@/lib/types';

// Referral bonus split — mirrors the published referral program terms
// (also reflected in FaqSection/ReferralSection/ReferralTab copy):
// the buyer who ENTERS a code gets 30%, the code's OWNER (referrer) gets
// 15%, each split 30% tokens / 70% Terminal Credits. This is a pre-
// confirmation ESTIMATE shown right after the buyer creates an intent —
// nothing is actually allocated until the payment confirms on-chain, so
// the Claims/Portfolio/Referral tabs read the real, already-confirmed
// numbers from the backend instead of recomputing them.
const BUYER_BONUS_PCT = 0.3;
const REFERRER_BONUS_PCT = 0.15;
const TOKEN_SHARE_PCT = 0.3;
const CREDIT_SHARE_PCT = 0.7;

const MIN_USD = 10;
const MAX_USD = 10_000_000;
const INTENT_WINDOW_MS = 15 * 60 * 1000;
const REFERRAL_CODE_RE = /^FDX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const GAS_FEE_NOTES: Record<PaymentMethodKey, string> = {
  ETH: 'Note: Network gas fees of approximately $2-15 apply on top of this amount.',
  BNB: 'Note: Network gas fees of approximately $2-15 apply on top of this amount.',
  'USDT-ERC20': 'Note: A small network fee applies for token transfers.',
  USDC: 'Note: A small network fee applies for token transfers.',
  'USDT-TRC20': 'Note: Tron network fees are typically under $1.',
  SOL: 'Note: Solana network fees are typically a fraction of a cent.',
  BTC: 'Note: Bitcoin network fees vary with network congestion, typically $1-5.',
};

// Only ETH/BNB (native) and the ERC-20 token methods have a CMS-managed
// generic warning (buy.form.gas_warning_native / gas_warning_token) — the
// chain-specific Tron/Solana/Bitcoin fee notes stay hardcoded per method.
const NATIVE_GAS_METHODS: PaymentMethodKey[] = ['ETH', 'BNB'];
const TOKEN_GAS_METHODS: PaymentMethodKey[] = ['USDT-ERC20', 'USDC'];

function resolveGasNote(cmsBuy: CmsPageData, key: PaymentMethodKey): string {
  if (NATIVE_GAS_METHODS.includes(key)) return cms(cmsBuy, 'form', 'gas_warning_native', GAS_FEE_NOTES[key]);
  if (TOKEN_GAS_METHODS.includes(key)) return cms(cmsBuy, 'form', 'gas_warning_token', GAS_FEE_NOTES[key]);
  return GAS_FEE_NOTES[key];
}

export default function BuyForm({ cmsBuy = {}, cmsGlobal = {} }: { cmsBuy?: CmsPageData; cmsGlobal?: CmsPageData }) {
  const { address, isConnected, openConnectModal, referralCode, referredByCode } = useWallet();
  const { walletProvider } = useWeb3ModalProvider();
  const { data: tier } = useTierCurrent();

  const [methodKey, setMethodKey] = useState<PaymentMethodKey>('ETH');
  const [usdAmount, setUsdAmount] = useState('250');
  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [intent, setIntent] = useState<PurchaseIntentResponse | null>(null);
  const [intentUsdAmount, setIntentUsdAmount] = useState(0);
  const [intentReferralCode, setIntentReferralCode] = useState<string | null>(null);
  const [intentTier, setIntentTier] = useState<TierCurrent | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState<{ balance: number; required: number; symbol: string } | null>(null);

  const [referralInput, setReferralInput] = useState('');
  const referralSeededRef = useRef(false);
  const referralAppliedRef = useRef<string | null>(null);

  const method = useMemo(() => PAYMENT_METHODS.find((m) => m.key === methodKey)!, [methodKey]);
  const usdNumber = parseFloat(usdAmount) || 0;

  useEffect(() => {
    let cancelled = false;
    setPriceLoading(true);
    setPriceError(null);
    getPrice(method.crypto)
      .then((res) => {
        if (!cancelled) setPrice(res.usd_price);
      })
      .catch((err) => {
        if (!cancelled) setPriceError(err instanceof Error ? err.message : 'Price unavailable');
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });

    const id = setInterval(() => {
      getPrice(method.crypto)
        .then((res) => !cancelled && setPrice(res.usd_price))
        .catch(() => {});
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [method.crypto]);

  useEffect(() => {
    if (!intent) return;
    const expiresAt = Date.now() + INTENT_WINDOW_MS;
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    setRemainingMs(INTENT_WINDOW_MS);
    return () => clearInterval(id);
  }, [intent]);

  const cryptoEquivalent = price && usdNumber > 0 ? usdNumber / price : 0;
  const tierPrice = tier && !tier.message ? toNum(tier.price) : 0;
  const fdpEstimate = tierPrice > 0 && usdNumber > 0 ? usdNumber / tierPrice : 0;

  const validationError = useMemo(() => {
    if (!usdAmount) return null;
    if (usdNumber <= 0) return 'Enter an amount greater than $0.';
    if (usdNumber < MIN_USD) return `Minimum purchase is ${formatUSD(MIN_USD)}.`;
    if (usdNumber > MAX_USD) return 'Amount too large.';
    return null;
  }, [usdAmount, usdNumber]);

  // Pre-fill the referral input from the ?ref= code the wallet already
  // resolved, once — never overwrite anything the buyer has typed themselves.
  useEffect(() => {
    if (referredByCode && !referralSeededRef.current) {
      referralSeededRef.current = true;
      setReferralInput(referredByCode);
    }
  }, [referredByCode]);

  // Editing the amount or payment method invalidates a stale balance
  // warning — clear it so the Buy button un-sticks instead of staying
  // permanently disabled.
  useEffect(() => {
    setBalanceWarning(null);
  }, [usdAmount, methodKey]);

  type ReferralValidation =
    | { state: 'empty' }
    | { state: 'invalid_format' }
    | { state: 'self' }
    | { state: 'valid'; code: string };

  const referralValidation = useMemo<ReferralValidation>(() => {
    const code = referralInput.trim().toUpperCase();
    if (!code) return { state: 'empty' };
    if (!REFERRAL_CODE_RE.test(code)) return { state: 'invalid_format' };
    if (referralCode && code === referralCode.toUpperCase()) return { state: 'self' };
    return { state: 'valid', code };
  }, [referralInput, referralCode]);

  const effectiveReferralCode = referralValidation.state === 'valid' ? referralValidation.code : null;

  // Best-effort link of a freshly-entered, validated code — errors (e.g.
  // already referred, code doesn't exist) are non-fatal; the checkmark
  // above is driven by client-side validation, not this call's outcome.
  useEffect(() => {
    if (!address || !effectiveReferralCode) return;
    if (referralAppliedRef.current === effectiveReferralCode) return;
    referralAppliedRef.current = effectiveReferralCode;
    applyReferral({ buyer_wallet: address, referral_code: effectiveReferralCode }).catch(() => {});
  }, [address, effectiveReferralCode]);

  async function createIntent() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await postPurchaseIntent({
        buyer_wallet: address!,
        chain: method.chain,
        crypto: method.crypto,
        usd_amount: usdNumber,
        ...(effectiveReferralCode ? { referral_code: effectiveReferralCode } : {}),
      });
      setIntent(res);
      setIntentUsdAmount(usdNumber);
      setIntentReferralCode(effectiveReferralCode);
      setIntentTier(tier && !tier.message ? tier : null);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBuy() {
    setSubmitError(null);
    setIntent(null);
    setBalanceWarning(null);

    if (!isConnected || !address) {
      openConnectModal();
      return;
    }
    if (validationError || usdNumber <= 0) {
      setSubmitError(validationError || 'Enter a valid amount.');
      return;
    }

    // On-chain balance check, run BEFORE creating the purchase intent.
    // checkEvmBalance returns null only for non-EVM payment methods
    // (TRC-20 USDT, SOL, BTC) — there's no wallet-connected EVM provider
    // that could ever check those, so those skip the check entirely.
    // Everything else fails CLOSED: any RPC error, timeout, or missing
    // provider resolves to "insufficient" rather than silently proceeding.
    setCheckingBalance(true);
    const result = await checkEvmBalance(method.key, method.chain, walletProvider, address, cryptoEquivalent).catch((err) => {
      console.log('Balance check: unexpected error', err);
      console.log('Balance check: insufficient');
      return { sufficient: false, balance: 0 };
    });
    setCheckingBalance(false);

    if (result && !result.sufficient) {
      setBalanceWarning({ balance: result.balance, required: cryptoEquivalent, symbol: method.crypto });
      return;
    }

    await createIntent();
  }

  function handleProceedAnyway() {
    setBalanceWarning(null);
    createIntent();
  }

  const vestingPreview = useMemo(() => {
    if (!intent || !intentTier) return null;
    const totalTokens = intent.tokens_estimated;
    const tgePct = toNum(intentTier.tge_percentage);
    const tgeTokens = totalTokens * (tgePct / 100);
    const remainingTokens = totalTokens - tgeTokens;
    return {
      totalTokens,
      tgePct,
      tgeTokens,
      remainingTokens,
      cliffMonths: intentTier.cliff_months,
      vestMonths: intentTier.vest_months,
    };
  }, [intent, intentTier]);

  const referralBonusPreview = useMemo(() => {
    if (!intent || !intentTier || !intentReferralCode) return null;
    const tierPrice = toNum(intentTier.price);
    if (tierPrice <= 0) return null;

    const buyerBonusUsd = intentUsdAmount * BUYER_BONUS_PCT;
    const buyerBonusTokens = (buyerBonusUsd * TOKEN_SHARE_PCT) / tierPrice;
    const buyerCredits = buyerBonusUsd * CREDIT_SHARE_PCT;

    const referrerBonusUsd = intentUsdAmount * REFERRER_BONUS_PCT;
    const referrerBonusTokens = (referrerBonusUsd * TOKEN_SHARE_PCT) / tierPrice;
    const referrerCredits = referrerBonusUsd * CREDIT_SHARE_PCT;

    return {
      buyerBonusTokens,
      buyerCredits,
      referrerBonusTokens,
      referrerCredits,
      totalBurned: buyerBonusTokens + referrerBonusTokens,
    };
  }, [intent, intentTier, intentReferralCode, intentUsdAmount]);

  return (
    <Section id="buy">
      <SectionHeading
        eyebrow="Presale"
        title={cms(cmsBuy, 'form', 'title', 'Buy $FDP')}
        description={cms(cmsBuy, 'form', 'subtitle', 'Lock in your price for 15 minutes and receive a deposit address.')}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-ink-dim">Pay with</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethodKey(m.key)}
                className={`min-h-11 rounded-lg border px-2 py-2.5 text-xs sm:px-3 sm:text-sm font-semibold transition-colors ${
                  methodKey === m.key
                    ? 'border-primary bg-primary-dim text-primary'
                    : 'border-border text-ink-dim hover:text-ink hover:border-primary/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label htmlFor="usd" className="mb-2 mt-6 block text-xs font-semibold uppercase tracking-widest text-ink-dim">
            Amount (USD)
          </label>
          <div className="flex items-center rounded-lg border border-border bg-bg-soft px-4 py-3 focus-within:border-primary/60">
            <span className="mr-2 text-ink-dim">$</span>
            <input
              id="usd"
              inputMode="decimal"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              className="w-full bg-transparent font-mono text-lg font-semibold text-ink outline-none"
            />
          </div>
          {validationError && <p className="mt-2 text-xs text-red">{validationError}</p>}
          <p className="mt-2 text-xs text-ink-faint">{resolveGasNote(cmsBuy, methodKey)}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-soft p-3">
              <p className="text-xs text-ink-dim">You send</p>
              {priceLoading ? (
                <Spinner className="mt-1.5 h-4 w-4 text-primary" />
              ) : priceError ? (
                <p className="mt-1 text-xs text-red">Price unavailable</p>
              ) : (
                <Mono className="mt-1 block text-base font-bold text-ink">
                  {formatCrypto(cryptoEquivalent, method.crypto)}
                </Mono>
              )}
              {price !== null && !priceLoading && (
                <Mono className="mt-0.5 block text-xs text-ink-faint">1 {method.crypto} = {formatUSD(price)}</Mono>
              )}
            </div>
            <div className="rounded-lg border border-border bg-bg-soft p-3">
              <p className="text-xs text-ink-dim">Estimated $FDP</p>
              <Mono className="mt-1 block text-base font-bold text-green">{formatTokenAmount(fdpEstimate, 2)}</Mono>
              {tierPrice > 0 && <Mono className="mt-0.5 block text-xs text-ink-faint">at {formatTokenPrice(tierPrice)}/token</Mono>}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="referral" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-ink-dim">
              {cms(cmsBuy, 'referral', 'title', 'Referral Code (optional)')}
            </label>
            <input
              id="referral"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="FDX-XXXX-XXXX"
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-primary/60"
            />
            {referralValidation.state === 'valid' && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                30% bonus will be applied to your purchase.
              </p>
            )}
            {referralValidation.state === 'invalid_format' && (
              <p className="mt-1.5 text-xs text-red">Invalid code format</p>
            )}
            {referralValidation.state === 'self' && (
              <p className="mt-1.5 text-xs text-red">You cannot use your own referral code</p>
            )}
          </div>

          <Button
            className="mt-5 min-h-12 w-full"
            onClick={handleBuy}
            disabled={submitting || checkingBalance || !!balanceWarning || !!validationError || usdNumber <= 0}
          >
            {checkingBalance ? (
              <>
                <Spinner className="h-4 w-4" /> Checking balance…
              </>
            ) : submitting ? (
              <>
                <Spinner className="h-4 w-4" /> Creating intent…
              </>
            ) : balanceWarning ? (
              'Insufficient Balance'
            ) : !isConnected ? (
              'Connect Wallet to Buy'
            ) : (
              'Buy $FDP'
            )}
          </Button>

          {submitError && (
            <div className="mt-4">
              <ErrorNote>{submitError}</ErrorNote>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-dim">Payment Instructions</p>
          {balanceWarning ? (
            <div className="mt-4 rounded-lg border border-amber bg-amber-dim p-4">
              <div className="flex items-start gap-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 shrink-0 text-amber"
                  aria-hidden="true"
                >
                  <path
                    d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber">Insufficient Balance</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
                    Your wallet has{' '}
                    <Mono className="text-ink">
                      {formatCrypto(balanceWarning.balance, balanceWarning.symbol)}
                    </Mono>{' '}
                    but this purchase requires{' '}
                    <Mono className="text-ink">
                      {formatCrypto(balanceWarning.required, balanceWarning.symbol)}
                    </Mono>
                    . Please add funds to your wallet or reduce the purchase amount.
                  </p>
                  <button
                    onClick={handleProceedAnyway}
                    className="mt-3 text-xs font-semibold text-ink-faint underline decoration-dotted hover:text-ink"
                  >
                    Proceed anyway
                  </button>
                </div>
              </div>
            </div>
          ) : !intent ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center text-sm text-ink-faint">
              <p>Submit a purchase to generate a deposit address and locked price.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Badge tone={remainingMs > 0 ? 'green' : 'red'}>
                  {remainingMs > 0 ? `Expires in ${formatDuration(remainingMs)}` : 'Expired — start a new purchase'}
                </Badge>
                <Mono className="text-xs text-ink-dim">Intent #{intent.intent_id}</Mono>
              </div>

              <div>
                <p className="text-xs text-ink-dim">Send exactly</p>
                <Mono className="block text-lg font-bold text-ink">
                  {intent.crypto_amount} {method.crypto}
                </Mono>
              </div>

              <div>
                <p className="text-xs text-ink-dim">To this address ({method.network})</p>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg-soft p-3">
                  <Mono className="flex-1 break-all text-xs text-ink">{intent.receiving_address}</Mono>
                  <CopyButton value={intent.receiving_address} />
                </div>
              </div>

              <div className="flex justify-center py-1">
                <div className="w-[150px] rounded-lg bg-white p-2.5 sm:w-[180px]">
                  <QRCode
                    value={intent.receiving_address}
                    size={180}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                    style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    viewBox="0 0 180 180"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-ink-dim">Price locked</p>
                  <Mono className="text-ink">{formatUSD(intent.price_locked, { maximumFractionDigits: 6 })}</Mono>
                </div>
                <div>
                  <p className="text-ink-dim">$FDP estimated</p>
                  <Mono className="text-green">{formatTokenAmount(intent.tokens_estimated)}</Mono>
                </div>
              </div>

              <p className="text-xs text-ink-faint">
                Send only {method.crypto} on {method.network}. Your purchase confirms automatically once the payment is detected on-chain.
              </p>
            </div>
          )}
        </Card>

        {vestingPreview && (
          <Card className="lg:col-span-5">
            <p className="text-sm font-semibold text-ink">{cms(cmsBuy, 'vesting', 'title', 'Your Vesting Schedule')}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-ink-dim">Total tokens</p>
                <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokenAmount(vestingPreview.totalTokens)} $FDP</Mono>
              </div>
              <div>
                <p className="text-xs text-ink-dim">At TGE ({vestingPreview.tgePct}%)</p>
                <Mono className="mt-0.5 block text-base font-bold text-primary">{formatTokenAmount(vestingPreview.tgeTokens)} $FDP</Mono>
                <p className="mt-0.5 text-xs text-ink-faint">Available immediately when tier closes</p>
              </div>
              <div>
                <p className="text-xs text-ink-dim">Cliff period</p>
                <Mono className="mt-0.5 block text-base font-bold text-ink">{vestingPreview.cliffMonths} months</Mono>
                <p className="mt-0.5 text-xs text-ink-faint">No additional tokens released during this period</p>
              </div>
              <div>
                <p className="text-xs text-ink-dim">Vesting ({vestingPreview.vestMonths} months)</p>
                <Mono className="mt-0.5 block text-base font-bold text-ink">{formatTokenAmount(vestingPreview.remainingTokens)} $FDP</Mono>
                <p className="mt-0.5 text-xs text-ink-faint">Released linearly after the cliff</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-faint">
              Full unlock:{' '}
              <span className="font-semibold text-ink">
                {vestingPreview.cliffMonths + vestingPreview.vestMonths} months after tier close
              </span>
            </p>
            <VestingTimeline
              className="mt-5"
              tgePct={vestingPreview.tgePct}
              cliffMonths={vestingPreview.cliffMonths}
              vestMonths={vestingPreview.vestMonths}
            />
          </Card>
        )}

        {referralBonusPreview && (
          <Card className="lg:col-span-5">
            <p className="text-sm font-semibold text-ink">Referral Bonus Applied</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-bg-soft p-3">
                <p className="text-xs text-ink-dim">Your bonus (30%)</p>
                <Mono className="mt-0.5 block text-base font-bold text-green">
                  {formatTokenAmount(referralBonusPreview.buyerBonusTokens)} $FDP
                </Mono>
                <p className="mt-0.5 text-xs text-ink-faint">+ {formatUSD(referralBonusPreview.buyerCredits)} Terminal Credits</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-soft p-3">
                <p className="text-xs text-ink-dim">Referrer bonus (15%)</p>
                <Mono className="mt-0.5 block text-base font-bold text-primary">
                  {formatTokenAmount(referralBonusPreview.referrerBonusTokens)} $FDP
                </Mono>
                <p className="mt-0.5 text-xs text-ink-faint">+ {formatUSD(referralBonusPreview.referrerCredits)} Terminal Credits</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-dim">
              Tokens burned:{' '}
              <span className="font-semibold text-ink">{formatTokenAmount(referralBonusPreview.totalBurned)} $FDP</span> permanently
              removed from supply 🔥
            </p>
            <p className="mt-1.5 text-xs text-ink-faint">Terminal Credits redeemable when the Intelligence Terminal launches.</p>
          </Card>
        )}

        <p className="text-center text-xs text-ink-faint lg:col-span-5">
          Need help? Contact{' '}
          <a
            href={`mailto:${cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com')}`}
            className="font-medium text-primary hover:underline"
          >
            {cms(cmsGlobal, 'site', 'support_email', 'support@flowdexprotocol.com')}
          </a>
        </p>
      </div>
    </Section>
  );
}
