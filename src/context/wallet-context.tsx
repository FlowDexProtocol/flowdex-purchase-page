// ══════════════════════════════════════════════════
// src/context/wallet-context.tsx
// Wallet connection + buyer session state.
//
// Session persistence: the JWT, its connection timestamp, and the wallet
// address are stored in localStorage (fdp_token / fdp_session_start /
// fdp_wallet) so a page reload or reopening the tab within 20 minutes
// keeps the wallet connected — no reconnect prompt, no visible countdown,
// no "session expired" messaging anywhere. A background check every 30
// seconds silently clears everything once 20 minutes have passed since
// the stored session started.
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

const SESSION_TTL_MS = 20 * 60 * 1000; // 20 minutes
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

const TOKEN_KEY = 'fdp_token';
const SESSION_START_KEY = 'fdp_session_start';
const WALLET_KEY = 'fdp_wallet';

interface StoredSession {
  token: string;
  walletAddress: string;
  sessionStart: number;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const sessionStartRaw = window.localStorage.getItem(SESSION_START_KEY);
    const walletAddress = window.localStorage.getItem(WALLET_KEY);
    if (!token || !sessionStartRaw || !walletAddress) return null;
    const sessionStart = parseInt(sessionStartRaw, 10);
    if (!Number.isFinite(sessionStart)) return null;
    return { token, walletAddress, sessionStart };
  } catch {
    return null;
  }
}

function storeSession(token: string, walletAddress: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    window.localStorage.setItem(WALLET_KEY, walletAddress);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — connecting
    // still works, it just won't persist across a reload.
  }
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_START_KEY);
    window.localStorage.removeItem(WALLET_KEY);
  } catch {
    // Nothing to clear.
  }
}

// Sweeps every localStorage key WalletConnect/Web3Modal/AppKit (and the
// wagmi-style adapters some SDK versions use internally) are known to
// persist connection state under. A programmatic disconnect() call alone
// doesn't reliably clear all of these across SDK versions.
const WALLETCONNECT_STORAGE_PREFIXES = ['wc@', '@w3m', '@appkit', '@reown', 'wagmi', 'W3M_', 'WCM_'];

function clearWalletConnectStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && WALLETCONNECT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear.
  }
}

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

  const connectedWalletRef = useRef<string | null>(null);
  const referralAppliedRef = useRef<Set<string>>(new Set());

  const teardownWalletConnection = useCallback(async () => {
    try {
      await disconnect();
    } catch {
      // Best-effort — still sweep storage below even if the SDK-level
      // disconnect call itself throws.
    }
    clearWalletConnectStorage();
  }, [disconnect]);

  // Clears the stored session, our React state, and Web3Modal's own
  // connection — silently, no banner or message. Used both when a stale
  // (>20min) session is found on load and by the 30s background check.
  const expireSession = useCallback(() => {
    clearStoredSession();
    connectedWalletRef.current = null;
    setToken(null);
    setReferralCode(null);
    setReferredByCode(null);
    setSummary(null);
    setTerminalCredits(0);
    setPendingClaims([]);
    teardownWalletConnection();
  }, [teardownWalletConnection]);

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
      storeSession(res.token, addr);

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

  // Runs once on mount: restore a still-valid (<20min) session from
  // localStorage immediately, or clear a stale one. Web3Modal reconnects
  // the wallet itself from its own persisted session — connectedWalletRef
  // is set here so the isConnected effect below recognizes that address as
  // already authenticated instead of firing a redundant /api/wallet/connect
  // call once Web3Modal catches up (it also self-corrects if Web3Modal ends
  // up reporting a DIFFERENT address than the one we restored, since that
  // effect's own connectedWalletRef check still applies).
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) return;

    if (Date.now() - stored.sessionStart >= SESSION_TTL_MS) {
      expireSession();
      return;
    }

    connectedWalletRef.current = stored.walletAddress;
    setToken(stored.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    }
  }, [isConnected, address, chainId, doConnect]);

  // Background check — every 30 seconds, silently clear everything once
  // 20 minutes have passed since the stored session started. No warning,
  // no countdown: the next render just shows "Connect Wallet".
  useEffect(() => {
    const id = setInterval(() => {
      const stored = readStoredSession();
      if (stored && Date.now() - stored.sessionStart >= SESSION_TTL_MS) {
        expireSession();
      }
    }, EXPIRY_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [expireSession]);

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
    connectedWalletRef.current = null;
    setToken(null);
    setReferralCode(null);
    setReferredByCode(null);
    setSummary(null);
    setTerminalCredits(0);
    setPendingClaims([]);
    clearStoredSession();
    await teardownWalletConnection();
  }, [teardownWalletConnection]);

  // Runs an authenticated request. A 401 means the backend rejected the
  // token (expired or revoked server-side) — silently clear the stale
  // local session, no message shown, then rethrow so the caller's own
  // error handling (each call site already has one) can react.
  const authedFetch = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!token) throw new Error('Wallet not connected');
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          expireSession();
        }
        throw err;
      }
    },
    [token, expireSession]
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
