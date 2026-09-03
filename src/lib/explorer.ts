// ══════════════════════════════════════════════════
// src/lib/explorer.ts
// Maps a purchase's `chain` column to a block explorer tx URL.
// A Purchase's `chain` only ever comes from PAYMENT_METHODS' `chain`
// field (ethereum/bsc/tron/solana/bitcoin) — arbitrum/polygon/base are
// included for forward-compatibility since they're valid wallet-connect
// chains even though no payment method uses them yet.
// ══════════════════════════════════════════════════

const EXPLORER_TX_TEMPLATES: Record<string, (tx: string) => string> = {
  ethereum: (tx) => `https://etherscan.io/tx/${tx}`,
  bsc: (tx) => `https://bscscan.com/tx/${tx}`,
  solana: (tx) => `https://solscan.io/tx/${tx}`,
  tron: (tx) => `https://tronscan.org/#/transaction/${tx}`,
  bitcoin: (tx) => `https://blockstream.info/tx/${tx}`,
  arbitrum: (tx) => `https://arbiscan.io/tx/${tx}`,
  polygon: (tx) => `https://polygonscan.com/tx/${tx}`,
  base: (tx) => `https://basescan.org/tx/${tx}`,
};

export function getExplorerUrl(chain: string | null | undefined, txHash: string | null | undefined): string | null {
  if (!chain || !txHash) return null;
  const template = EXPLORER_TX_TEMPLATES[chain.toLowerCase()];
  return template ? template(txHash) : null;
}
