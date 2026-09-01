// ══════════════════════════════════════════════════
// src/lib/balance.ts
// On-chain balance check for EVM payment methods, using the wallet's own
// connected provider (never a separate public RPC) — so it always checks
// whatever chain the wallet actually happens to be on (mainnet, a testnet,
// whatever), with zero risk of CORS/rate-limit failures from a third-party
// RPC endpoint.
//
// Fails CLOSED: any error, timeout, or unexpected condition resolves to
// "insufficient" (balance 0) rather than silently letting the purchase
// proceed unchecked. The only case that skips the check entirely is a
// payment method whose chain isn't EVM at all (TRC-20 USDT, SOL, BTC) —
// there's no wallet-connected EVM provider that could ever answer that.
// ══════════════════════════════════════════════════

import { BrowserProvider, Contract, formatUnits, type Eip1193Provider } from 'ethers';
import type { PaymentMethodKey } from './types';

const EVM_CHAINS = new Set(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']);

// Native-currency payment methods (checked via provider.getBalance).
const NATIVE_METHODS = new Set<PaymentMethodKey>(['ETH', 'BNB']);

// ERC-20 contract addresses, lowercased so a mismatched EIP-55 checksum can
// never throw at runtime — only the underlying hex matters.
const ERC20_CONTRACTS: Partial<Record<PaymentMethodKey, string>> = {
  'USDT-ERC20': '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase(),
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(),
};

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

export function isEvmChain(chain: string): boolean {
  return EVM_CHAINS.has(chain);
}

export interface BalanceCheckResult {
  sufficient: boolean;
  balance: number;
}

// Returns null ONLY when this payment method's chain isn't EVM at all
// (skip the check entirely, per spec). For every EVM-payable method this
// always resolves to a definitive result — falling back to `insufficient`
// on any failure instead of throwing or returning null.
export async function checkEvmBalance(
  methodKey: PaymentMethodKey,
  chain: string,
  walletProvider: Eip1193Provider | undefined,
  address: string,
  requiredAmount: number
): Promise<BalanceCheckResult | null> {
  if (!isEvmChain(chain)) return null;

  if (!walletProvider) {
    console.log(`Balance check: chain=unknown, token=${methodKey}, balance=0, required=${requiredAmount} (no wallet provider)`);
    console.log('Balance check: insufficient');
    return { sufficient: false, balance: 0 };
  }

  let chainId: number | string = 'unknown';
  try {
    const provider = new BrowserProvider(walletProvider);
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);

    let balance: number;
    if (NATIVE_METHODS.has(methodKey)) {
      const raw = await provider.getBalance(address);
      balance = parseFloat(formatUnits(raw, 18));
    } else {
      const contractAddress = ERC20_CONTRACTS[methodKey];
      if (!contractAddress) {
        console.log(`Balance check: chain=${chainId}, token=${methodKey}, balance=0, required=${requiredAmount} (no contract configured)`);
        console.log('Balance check: insufficient');
        return { sufficient: false, balance: 0 };
      }
      const contract = new Contract(contractAddress, ERC20_ABI, provider);
      const [raw, decimals] = await Promise.all([contract.balanceOf(address), contract.decimals()]);
      balance = parseFloat(formatUnits(raw, decimals));
    }

    console.log(`Balance check: chain=${chainId}, token=${methodKey}, balance=${balance}, required=${requiredAmount}`);
    const sufficient = balance > 0 && balance >= requiredAmount;
    console.log(sufficient ? 'Balance check: sufficient' : 'Balance check: insufficient');
    return { sufficient, balance };
  } catch (err) {
    console.log(
      `Balance check: chain=${chainId}, token=${methodKey}, balance=0, required=${requiredAmount} (error: ${
        err instanceof Error ? err.message : String(err)
      })`
    );
    console.log('Balance check: insufficient');
    return { sufficient: false, balance: 0 };
  }
}
