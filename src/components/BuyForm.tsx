'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { useWallet } from '@/context/wallet-context';
import { useTierCurrent } from '@/lib/hooks';
import { ApiError, getPrice, postPurchaseIntent } from '@/lib/api';
import { checkEvmBalance } from '@/lib/balance';
import { PAYMENT_METHODS, type PaymentMethodKey } from '@/lib/types';
import { formatDuration, formatNumber, formatPrice, formatTokens, formatUsd, toNum } from '@/lib/format';
import { Badge, Button, Card, CopyButton, ErrorNote, Mono, Section, SectionHeading, Spinner } from './ui';
import type { PurchaseIntentResponse } from '@/lib/types';

const MIN_USD = 10;
const MAX_USD = 10_000_000;
const INTENT_WINDOW_MS = 15 * 60 * 1000;

export default function BuyForm() {
  const { address, isConnected, openConnectModal, referredByCode } = useWallet();
  const { data: tier } = useTierCurrent();

  const [methodKey, setMethodKey] = useState<PaymentMethodKey>('ETH');
  const [usdAmount, setUsdAmount] = useState('250');
  const [price, setPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [intent, setIntent] = useState<PurchaseIntentResponse | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState<{ balance: number; required: number; symbol: string } | null>(null);

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
    if (usdNumber < MIN_USD) return `Minimum purchase is ${formatUsd(MIN_USD)}.`;
    if (usdNumber > MAX_USD) return 'Amount too large.';
    return null;
  }, [usdAmount, usdNumber]);

  async function createIntent() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await postPurchaseIntent({
        buyer_wallet: address!,
        chain: method.chain,
        crypto: method.crypto,
        usd_amount: usdNumber,
        ...(referredByCode ? { referral_code: referredByCode } : {}),
      });
      setIntent(res);
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

    // Best-effort on-chain balance check — informational, and only possible
    // for EVM-payable methods (checkEvmBalance returns null for TRC-20/SOL/BTC
    // or if the RPC call fails, in which case we just proceed normally).
    setCheckingBalance(true);
    const result = await checkEvmBalance(method.key, method.chain, address, cryptoEquivalent).catch(() => null);
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

  return (
    <Section id="buy">
      <SectionHeading eyebrow="Presale" title="Buy $FDP" description="Lock in your price for 15 minutes and receive a deposit address." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-ink-dim">Pay with</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMethodKey(m.key)}
                className={`rounded-lg border px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-soft p-3">
              <p className="text-xs text-ink-dim">You send</p>
              {priceLoading ? (
                <Spinner className="mt-1.5 h-4 w-4 text-primary" />
              ) : priceError ? (
                <p className="mt-1 text-xs text-red">Price unavailable</p>
              ) : (
                <Mono className="mt-1 block text-base font-bold text-ink">
                  {formatNumber(cryptoEquivalent, 6)} {method.crypto}
                </Mono>
              )}
              {price !== null && !priceLoading && (
                <Mono className="mt-0.5 block text-[11px] text-ink-faint">1 {method.crypto} = {formatUsd(price)}</Mono>
              )}
            </div>
            <div className="rounded-lg border border-border bg-bg-soft p-3">
              <p className="text-xs text-ink-dim">Estimated $FDP</p>
              <Mono className="mt-1 block text-base font-bold text-primary">{formatTokens(fdpEstimate, 2)}</Mono>
              {tierPrice > 0 && <Mono className="mt-0.5 block text-[11px] text-ink-faint">at {formatPrice(tierPrice)}/token</Mono>}
            </div>
          </div>

          {referredByCode && (
            <p className="mt-3 text-xs text-green">30% referral bonus will be applied to your purchase.</p>
          )}

          <Button
            className="mt-5 w-full"
            onClick={handleBuy}
            disabled={submitting || checkingBalance || !!validationError || usdNumber <= 0}
          >
            {checkingBalance ? (
              <>
                <Spinner className="h-4 w-4" /> Checking balance…
              </>
            ) : submitting ? (
              <>
                <Spinner className="h-4 w-4" /> Creating intent…
              </>
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
                      {formatNumber(balanceWarning.balance, 6)} {balanceWarning.symbol}
                    </Mono>{' '}
                    but this purchase requires{' '}
                    <Mono className="text-ink">
                      {formatNumber(balanceWarning.required, 6)} {balanceWarning.symbol}
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
                  <Mono className="text-ink">{formatUsd(intent.price_locked, { maximumFractionDigits: 6 })}</Mono>
                </div>
                <div>
                  <p className="text-ink-dim">$FDP estimated</p>
                  <Mono className="text-ink">{formatTokens(intent.tokens_estimated)}</Mono>
                </div>
              </div>

              <p className="text-[11px] text-ink-faint">
                Send only {method.crypto} on {method.network}. Your purchase confirms automatically once the payment is detected on-chain.
              </p>
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}
