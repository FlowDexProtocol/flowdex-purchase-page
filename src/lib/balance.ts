// ══════════════════════════════════════════════════
// src/lib/balance.ts
// Best-effort on-chain balance check for EVM payment methods.
//
// Queries a dedicated public RPC for the payment method's own chain,
// keyed by the connected wallet's address — NOT the wallet's currently
// injected provider — so this never needs (or triggers) a network switch.
// Non-EVM methods (TRC-20 USDT, SOL, BTC) can't be checked this way and
// are skipped entirely by the caller.
// ══════════════════════════════════════════════════

import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { CHAINS } from './web3modal';
import type { PaymentMethodKey } from './types';

// Internal `chain` string (from PAYMENT_METHODS) -> chainId, limited to the
// chains we actually have an RPC for in CHAINS.
const EVM_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
};

// Native-currency payment methods (checked via provider.getBalance).
const NATIVE_METHODS = new Set<PaymentMethodKey>(['ETH', 'BNB']);

// ERC-20 contract addresses per chain, lowercased so a mismatched EIP-55
// checksum can never throw at runtime — only the underlying hex matters.
const ERC20_CONTRACTS: Partial<Record<PaymentMethodKey, Partial<Record<number, string>>>> = {
  'USDT-ERC20': { 1: '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase() },
  USDC: { 1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase() },
  // Not currently offered as payment methods, kept for future BSC stablecoin support.
  // BSC USDT: 0x55d398326f99059fF775485246999027B3197955
  // BSC USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
};

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

export interface BalanceCheckResult {
  sufficient: boolean;
  balance: number;
}

// Returns null when this payment method isn't EVM-checkable (skip the check
// entirely) or when the RPC call fails (treated as "can't verify" upstream).
export async function checkEvmBalance(
  methodKey: PaymentMethodKey,
  chain: string,
  address: string,
  requiredAmount: number
): Promise<BalanceCheckResult | null> {
  const chainId = EVM_CHAIN_IDS[chain];
  if (!chainId) return null; // non-EVM chain (tron/solana/bitcoin) — not checkable here

  const rpcUrl = CHAINS.find((c) => c.chainId === chainId)?.rpcUrl;
  if (!rpcUrl) return null;

  const provider = new JsonRpcProvider(rpcUrl);

  try {
    if (NATIVE_METHODS.has(methodKey)) {
      const raw = await provider.getBalance(address);
      const balance = parseFloat(formatUnits(raw, 18));
      return { sufficient: balance >= requiredAmount, balance };
    }

    const contractAddress = ERC20_CONTRACTS[methodKey]?.[chainId];
    if (!contractAddress) return null;

    const contract = new Contract(contractAddress, ERC20_ABI, provider);
    const [raw, decimals] = await Promise.all([contract.balanceOf(address), contract.decimals()]);
    const balance = parseFloat(formatUnits(raw, decimals));
    return { sufficient: balance >= requiredAmount, balance };
  } catch {
    return null;
  }
}
