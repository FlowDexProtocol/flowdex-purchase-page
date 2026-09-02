// ══════════════════════════════════════════════════
// src/lib/web3modal.ts
// WalletConnect Web3Modal (ethers) setup — EVM chains only.
// Non-EVM payment methods (BTC, SOL, TRC-20 USDT) are deposit-address
// flows, not wallet-connect flows, so they are not registered here.
// ══════════════════════════════════════════════════

'use client';

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

export interface AppChain {
  chainId: number;
  name: string;
  currency: string;
  explorerUrl: string;
  rpcUrl: string;
}

// Matches the supported EVM chain ids in the backend's /api/wallet/connect handler.
export const CHAINS: AppChain[] = [
  { chainId: 1, name: 'Ethereum', currency: 'ETH', explorerUrl: 'https://etherscan.io', rpcUrl: 'https://eth.llamarpc.com' },
  { chainId: 56, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: 'https://bsc-dataseed.binance.org' },
  { chainId: 137, name: 'Polygon', currency: 'MATIC', explorerUrl: 'https://polygonscan.com', rpcUrl: 'https://polygon-rpc.com' },
  { chainId: 42161, name: 'Arbitrum One', currency: 'ETH', explorerUrl: 'https://arbiscan.io', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
  { chainId: 8453, name: 'Base', currency: 'ETH', explorerUrl: 'https://basescan.org', rpcUrl: 'https://mainnet.base.org' },
];

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const metadata = {
  name: 'FlowDex Protocol',
  description: 'Trade Everything. Know Everything.',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://flowdexprotocol.com',
  icons: ['https://flowdexprotocol.com/icon.png'],
};

if (!projectId && typeof window !== 'undefined') {
  console.warn(
    '[FlowDex] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — Connect Wallet will not work until it is configured. ' +
      'A missing/invalid project id is also why the wallet explorer list and QR code fail: get a real id from https://cloud.walletconnect.com.'
  );
}

// Featured wallets shown first, both in the default connect view and at the
// top of "All Wallets" — ids are from the WalletConnect Explorer.
const FEATURED_WALLET_IDS = [
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
  '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
  '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance Web3 Wallet
  'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e93c30de230b7ec', // Coinbase Wallet
];

const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 1,
  // Wallet-only login: this SDK's defaultConfig defaults `email: true` and
  // `socials` to every provider (google/x/discord/farcaster/github/apple/
  // facebook) unless overridden here — that default is what was putting
  // social logins in the modal.
  auth: { email: false, socials: [] },
});

// Initialized once at module load (the standard Reown/Web3Modal SSR pattern):
// useWeb3Modal()/useWeb3ModalAccount() run during the server render pass too,
// and throw unless the modal singleton already exists by then.
createWeb3Modal({
  ethersConfig,
  chains: CHAINS,
  projectId: projectId || 'MISSING_WALLETCONNECT_PROJECT_ID',
  defaultChain: CHAINS[0],
  // Chain detection is informational only (see wallet-context's
  // detectedChainName) — never force the wallet to switch networks, since
  // the buyer's chosen payment method doesn't have to match their wallet's
  // chain (e.g. paying with USDT TRC-20 or BTC from an EVM wallet).
  allowUnsupportedChain: true,
  // Show the "All Wallets" button and don't restrict/exclude the explorer
  // list — the full 550+ WalletConnect wallet list depends on a valid
  // projectId (see the warning above), not on these flags alone.
  allWallets: 'SHOW',
  featuredWalletIds: FEATURED_WALLET_IDS,
  includeWalletIds: undefined,
  excludeWalletIds: undefined,
  enableAnalytics: true,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#627EEA',
    '--w3m-color-mix-strength': 20,
    '--w3m-accent': '#627EEA',
    '--w3m-font-family': 'DM Sans, sans-serif',
    '--w3m-border-radius-master': '6px',
  },
});
