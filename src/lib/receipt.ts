// ══════════════════════════════════════════════════
// src/lib/receipt.ts
// Client-side PDF receipt generation from a PurchaseReceipt payload.
// jsPDF v4 default-exports the jsPDF class.
// ══════════════════════════════════════════════════

import jsPDF from 'jspdf';
import type { PurchaseReceipt } from './types';
import { formatDate, formatTokenAmount, formatUSD, toNum } from './format';

export function downloadReceiptPdf(receipt: PurchaseReceipt): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 60;

  const line = (text: string, opts: { size?: number; bold?: boolean; gap?: number; color?: [number, number, number] } = {}) => {
    const { size = 11, bold = false, gap = 20, color = [20, 20, 20] } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(text, marginX, y);
    y += gap;
  };

  line('FlowDex Protocol — Purchase Receipt', { size: 18, bold: true, gap: 30 });

  line(`Receipt #: ${receipt.id}`);
  line(`Date: ${formatDate(receipt.created_at)}`);
  line(`Wallet: ${receipt.buyer_wallet}`);
  y += 8;

  line('Payment', { bold: true, gap: 18 });
  line(`${receipt.crypto_amount} ${receipt.crypto_currency} on ${receipt.chain}`);
  line(`USD Value: ${formatUSD(receipt.usd_value)}`);
  y += 8;

  line('Allocation', { bold: true, gap: 18 });
  line(`Tier: ${receipt.tier_name} (${formatUSD(receipt.tier_price, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}/token)`);
  line(`$FDP Allocated: ${formatTokenAmount(receipt.tokens_allocated)}`);
  if (receipt.bonus_tokens && toNum(receipt.bonus_tokens) > 0) {
    line(`Bonus Tokens: ${formatTokenAmount(receipt.bonus_tokens)}`);
  }
  if (receipt.referral_code_used) {
    line(`Referral Code Used: ${receipt.referral_code_used}`);
  }
  y += 8;

  line('Transaction', { bold: true, gap: 18 });
  line(`Tx Hash: ${receipt.tx_hash}`, { size: 9 });
  line(`Status: ${receipt.status}`);
  y += 8;

  line('Vesting Schedule', { bold: true, gap: 18 });
  line(`${receipt.tge_percentage}% at TGE, ${receipt.cliff_months}-month cliff, ${receipt.vest_months}-month vest`);

  y += 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, y, 595 - marginX, y);
  y += 20;
  line('This is not a tax document. Consult your tax advisor.', { size: 9, color: [120, 120, 120] });

  doc.save(`flowdex-receipt-${receipt.id}.pdf`);
}
