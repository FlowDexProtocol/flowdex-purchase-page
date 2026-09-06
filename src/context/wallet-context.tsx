// ══════════════════════════════════════════════════
// src/context/wallet-context.tsx
// Wallet connection + buyer session state.
//
// - Token lives only in React state (memory) — never localStorage.
// - The backend session is a hard 20-minute window from connection time
//   (its own expires_in in the connect response is the source of truth,
//   not a hardcoded frontend guess). It is NOT extended by user activity —
//   a warning banner shows at 2 minutes remaining, and at 0 the token is
//   cleared and the user must explicitly reconnect (no signature needed,
//   "connection IS authentication", but it's no longer done silently).
// - A `?ref=FDX-XXXX-XXXX` URL param is auto-applied once per wallet.
// ══════════════════════════════════════════════════

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useDisconnect, useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { BrowserProvider } from 'ethers';
import { ApiError, applyReferral, connectWallet as apiConnectWallet } from '@/lib/api';
import { CHAINS } from '@/lib/web3modal';
import type { WalletConnectResponse } from '@/lib/types';

// How long before the real expiry to show the "session expiring" banner.
const SESSION_WARNING_MS = 2 * 60 * 1000;

interface WalletContextValue {
  address: string | null;
  chainId: number | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  token: string | null;
  referralCode: string | null;
  /** The code that referred THIS buyer (from ?ref=), never the buyer's own code. */
  referredByCode: string | null;
  /** Human-readable name of whatever chain the wallet is currently on — informational only, never restrictive. */
  detectedChainName: string | null;
  isNewBuyer: boolean;
  summary: WalletConnectResponse['summary'] | null;
  terminalCredits: number;
  pendingClaims: WalletConnectResponse['pending_claims'];
  error: string | null;
  /** True in the last 2 minutes before the session hard-expires. */
  sessionWarning: boolean;
  /** True once the 20-minute session has expired — token has been cleared. */
  sessionExpired: boolean;
  openConnectModal: () => void;
  disconnectWallet: () => Promise<void>;
  /** Re-authenticates the still-connected wallet after the session expired. */
  reconnectSession: () => Promise<void>;
  authedFetch: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { open } = useWeb3Modal();
  const { address: rawAddress, chainId, isConnected } = useWeb3ModalAccount();
  const { disconnect } = useDisconnect();
  const { walletProvider } = useWeb3ModalProvider();
  const address = rawAddress ? rawAddress.toLowerCase() : null;

  const [token, setToken] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  const [detectedChainName, setDetectedChainName] = useState<string | null>(null);
  const [isNewBuyer, setIsNewBuyer] = useState(false);
  const [summary, setSummary] = useState<WalletConnectResponse['summary'] | null>(null);
  const [terminalCredits, setTerminalCredits] = useState(0);
  const [pendingClaims, setPendingClaims] = useState<WalletConnectResponse['pending_claims']>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedWalletRef = useRef<string | null>(null);
  const referralAppliedRef = useRef<Set<string>>(new Set());

  const clearSessionTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    warningTimer.current = null;
    expiryTimer.current = null;
  }, []);

  const doConnect = useCallback(async (addr: string, cid?: number): Promise<string | null> => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await apiConnectWallet({ wallet_address: addr, chain_id: cid, wallet_type: 'walletconnect' });
      setToken(res.token);
      setReferralCode(res.referral_code);
      setIsNewBuyer(res.is_new_buyer);
      setSummary(res.summary);
      setTerminalCredits(res.terminal_credits);
      setPendingClaims(res.pending_claims);
      connectedWalletRef.current = addr;

      // Hard 20-minute window from THIS connection — never extended by
      // activity. expires_in (seconds) comes from the backend, not a
      // hardcoded frontend value, so it always matches the real JWT TTL.
      setSessionWarning(false);
      setSessionExpired(false);
      clearSessionTimers();
      const ttlMs = res.expires_in * 1000;
      warningTimer.current = setTimeout(() => setSessionWarning(true), Math.max(0, ttlMs - SESSION_WARNING_MS));
      expiryTimer.current = setTimeout(() => {
        setToken(null);
        setSessionWarning(false);
        setSessionExpired(true);
      }, ttlMs);

      if (typeof window !== 'undefined') {
        const rawRef = new URLSearchParams(window.location.search).get('ref');
        const ref = rawRef ? rawRef.trim().toUpperCase() : null;
        const ownCode = res.referral_code ? res.referral_code.toUpperCase() : null;
        const isSelfReferral = !!ref && !!ownCode && ref === ownCode;

        if (ref && !isSelfReferral) {
          // This is the code that referred THIS buyer — never the buyer's own
          // code — so it's what gets shown/applied on their own purchase.
          setReferredByCode(ref);

          const key = `${addr}:${ref}`;
          if (!referralAppliedRef.current.has(key)) {
            referralAppliedRef.current.add(key);
            applyReferral({ buyer_wallet: addr, referral_code: ref }).catch(() => {
              // Invalid/self/already-referred codes are non-fatal — ignore silently.
            });
          }
        } else {
          setReferredByCode(null);
        }
      }

      return res.token;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setToken(null);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [clearSessionTimers]);

  useEffect(() => {
    if (isConnected && address && connectedWalletRef.current !== address) {
      doConnect(address, chainId);
    }
    if (!isConnected && connectedWalletRef.current) {
      connectedWalletRef.current = null;
      setToken(null);
      setReferralCode(null);
      setReferredByCode(null);
      setSummary(null);
      setTerminalCredits(0);
      setPendingClaims([]);
      setSessionWarning(false);
      setSessionExpired(false);
      clearSessionTimers();
    }
  }, [isConnected, address, chainId, doConnect, clearSessionTimers]);

  useEffect(() => {
    return () => clearSessionTimers();
  }, [clearSessionTimers]);

  // Informational-only chain detection — never blocks or prompts a switch.
  // Re-runs whenever the wallet reports a different chainId (i.e. the user
  // switched networks from inside their wallet, not something we triggered).
  useEffect(() => {
    if (!isConnected || !walletProvider) {
      setDetectedChainName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const provider = new BrowserProvider(walletProvider);
        const network = await provider.getNetwork();
        if (cancelled) return;
        const known = CHAINS.find((c) => c.chainId === Number(network.chainId));
        const fallbackName = network.name && network.name !== 'unknown' ? network.name : `Chain ${network.chainId}`;
        setDetectedChainName(known?.name ?? fallbackName);
      } catch {
        if (!cancelled) setDetectedChainName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, walletProvider, chainId]);

  const disconnectWallet = useCallback(async () => {
    clearSessionTimers();
    connectedWalletRef.current = null;
    setToken(null);
    setReferralCode(null);
    setReferredByCode(null);
    setSummary(null);
    setTerminalCredits(0);
    setPendingClaims([]);
    setSessionWarning(false);
    setSessionExpired(false);
    await disconnect();
  }, [disconnect, clearSessionTimers]);

  // Re-authenticates the still-connected wallet after the session hard-
  // expired — no signature needed, but (unlike the old behavior) this only
  // ever runs from an explicit user action, never silently on a timer.
  const reconnectSession = useCallback(async () => {
    if (address) {
      await doConnect(address, chainId);
    } else {
      open();
    }
  }, [address, chainId, doConnect, open]);

  // Runs an authenticated request. No silent reconnect on a 401 or a
  // missing token — either one means the session is expired, so this
  // surfaces that state (for the expired banner + reconnect button) and
  // rejects, rather than quietly re-authenticating behind the user's back.
  const authedFetch = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!address || !token) {
        setSessionExpired(true);
        throw new Error('Wallet session expired. Please reconnect your wallet.');
      }
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearSessionTimers();
          setToken(null);
          setSessionWarning(false);
          setSessionExpired(true);
        }
        throw err;
      }
    },
    [token, address, clearSessionTimers]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      isConnected,
      isConnecting,
      token,
      referralCode,
      referredByCode,
      detectedChainName,
      isNewBuyer,
      summary,
      terminalCredits,
      pendingClaims,
      error,
      sessionWarning,
      sessionExpired,
      openConnectModal: () => {
        open();
      },
      disconnectWallet,
      reconnectSession,
      authedFetch,
    }),
    [
      address,
      chainId,
      isConnected,
      isConnecting,
      token,
      referralCode,
      referredByCode,
      detectedChainName,
      isNewBuyer,
      summary,
      terminalCredits,
      pendingClaims,
      error,
      sessionWarning,
      sessionExpired,
      open,
      disconnectWallet,
      reconnectSession,
      authedFetch,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
