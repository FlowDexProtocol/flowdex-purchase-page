'use client';

import type { ReactNode } from 'react';
import '@/lib/web3modal';
import { WalletProvider } from '@/context/wallet-context';

export default function Providers({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
