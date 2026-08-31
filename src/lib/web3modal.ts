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
    '[FlowDex] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — Connect Wallet will not work until it is configured.'
  );
}

const ethersConfig = defaultConfig({ metadata, defaultChainId: 1 });

// Initialized once at module load (the standard Reown/Web3Modal SSR pattern):
// useWeb3Modal()/useWeb3ModalAccount() run during the server render pass too,
// and throw unless the modal singleton already exists by then.
createWeb3Modal({
  ethersConfig,
  chains: CHAINS,
  projectId: projectId || 'MISSING_WALLETCONNECT_PROJECT_ID',
  defaultChain: CHAINS[0],
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#00B4D8',
    '--w3m-color-mix-strength': 20,
    '--w3m-accent': '#00B4D8',
    '--w3m-font-family': 'DM Sans, sans-serif',
    '--w3m-border-radius-master': '6px',
  },
});
