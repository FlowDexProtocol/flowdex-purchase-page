// ══════════════════════════════════════════════════
// src/lib/send.ts
// Direct wallet transaction for EVM payment methods.
// Uses the wallet's own connected provider (same pattern as balance.ts)
// to send native currency or ERC-20 token transfers directly via the
// MetaMask / WalletConnect approval popup — no manual address copy needed.
//
// Non-EVM methods (TRC-20, SOL, BTC) are not supported here and keep the
// deposit-address flow.
// ══════════════════════════════════════════════════

import { BrowserProvider, Contract, parseUnits, parseEther, type Eip1193Provider } from 'ethers';
import type { PaymentMethodKey } from './types';

// Native-currency payment methods — sent via eth_sendTransaction with value.
const NATIVE_METHODS = new Set<PaymentMethodKey>(['ETH', 'BNB']);

// ERC-20 token addresses (same as balance.ts) and their decimal counts.
const ERC20_CONFIG: Partial<Record<PaymentMethodKey, { address: string; decimals: number }>> = {
  'USDT-ERC20': { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
};

const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

// EVM chains that support direct wallet sends.
const EVM_CHAINS = new Set(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']);

/** Whether this payment method + chain supports a direct wallet send. */
export function supportsDirectSend(methodKey: PaymentMethodKey, chain: string): boolean {
  return EVM_CHAINS.has(chain) && (NATIVE_METHODS.has(methodKey) || !!ERC20_CONFIG[methodKey]);
}

export interface SendResult {
  txHash: string;
}

/**
 * Initiates a direct wallet transaction (MetaMask popup) for the given
 * payment method. Returns the transaction hash once the user approves and
 * the transaction is submitted to the network.
 *
 * Throws on:
 * - User rejection (code 4001 / ACTION_REJECTED)
 * - Missing wallet provider
 * - Any RPC / network error
 */
export async function sendEvmTransaction(
  methodKey: PaymentMethodKey,
  walletProvider: Eip1193Provider,
  receivingAddress: string,
  cryptoAmount: string
): Promise<SendResult> {
  const provider = new BrowserProvider(walletProvider);
  const signer = await provider.getSigner();

  if (NATIVE_METHODS.has(methodKey)) {
    // Native currency (ETH, BNB) — plain value transfer.
    const tx = await signer.sendTransaction({
      to: receivingAddress,
      value: parseEther(cryptoAmount),
    });
    return { txHash: tx.hash };
  }

  // ERC-20 token transfer (USDT, USDC).
  const config = ERC20_CONFIG[methodKey];
  if (!config) {
    throw new Error(`No ERC-20 config for ${methodKey}`);
  }

  const contract = new Contract(config.address, ERC20_ABI, signer);
  const amount = parseUnits(cryptoAmount, config.decimals);
  const tx = await contract.transfer(receivingAddress, amount);
  return { txHash: tx.hash };
}

/** Returns true when an error is a user-rejected-transaction (MetaMask 4001). */
export function isUserRejection(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number | string; action?: string };
  // ethers v6 wraps rejections as ACTION_REJECTED
  if (e.code === 'ACTION_REJECTED') return true;
  // Raw EIP-1193 rejection code
  if (e.code === 4001) return true;
  // Some wallets nest it
  if ('info' in e) {
    const info = (e as { info?: { error?: { code?: number } } }).info;
    if (info?.error?.code === 4001) return true;
  }
  return false;
}
