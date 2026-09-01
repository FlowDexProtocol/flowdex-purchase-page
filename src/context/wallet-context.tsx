// ══════════════════════════════════════════════════
// src/context/wallet-context.tsx
// Wallet connection + buyer session state.
//
// - Token lives only in React state (memory) — never localStorage.
// - Backend session is 30 minutes and requires NO signature to renew
//   ("connection IS authentication"), so on expiry we silently replay
//   POST /api/wallet/connect for the still-connected address.
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

const SESSION_MS = 30 * 60 * 1000;

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
  openConnectModal: () => void;
  disconnectWallet: () => Promise<void>;
  refreshSession: () => Promise<void>;
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

  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedWalletRef = useRef<string | null>(null);
  const referralAppliedRef = useRef<Set<string>>(new Set());
  // Holds the latest `doConnect` so the session-expiry timer (scheduled from
  // inside `doConnect` itself, below) can call the current closure without
  // referencing `doConnect` before it's declared.
  const doConnectRef = useRef<(addr: string, cid?: number) => Promise<string | null>>(null);

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

      if (sessionTimer.current) clearTimeout(sessionTimer.current);
      sessionTimer.current = setTimeout(() => {
        doConnectRef.current?.(addr, cid);
      }, SESSION_MS);

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
  }, []);

  useEffect(() => {
    doConnectRef.current = doConnect;
  }, [doConnect]);

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
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    }
  }, [isConnected, address, chainId, doConnect]);

  useEffect(() => {
    return () => {
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    };
  }, []);

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
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    connectedWalletRef.current = null;
    setToken(null);
    setReferralCode(null);
    setReferredByCode(null);
    setSummary(null);
    setTerminalCredits(0);
    setPendingClaims([]);
    await disconnect();
  }, [disconnect]);

  const refreshSession = useCallback(async () => {
    if (address) await doConnect(address, chainId);
  }, [address, chainId, doConnect]);

  // Runs an authenticated request; on a 401 (session expired/timed out) it
  // silently reconnects (no signature needed) and retries once.
  const authedFetch = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!address) throw new Error('Wallet not connected');
      if (!token) {
        const newToken = await doConnect(address, chainId);
        if (!newToken) throw new Error('Wallet session unavailable');
        return fn(newToken);
      }
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const newToken = await doConnect(address, chainId);
          if (!newToken) throw err;
          return fn(newToken);
        }
        throw err;
      }
    },
    [token, address, chainId, doConnect]
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
      openConnectModal: () => {
        open();
      },
      disconnectWallet,
      refreshSession,
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
      open,
      disconnectWallet,
      refreshSession,
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
