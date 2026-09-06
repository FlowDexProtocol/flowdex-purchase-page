'use client';

import type { ReactNode } from 'react';
import '@/lib/web3modal';
import { WalletProvider } from '@/context/wallet-context';
import SessionStatusBanner from './SessionStatusBanner';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <SessionStatusBanner />
      {children}
    </WalletProvider>
  );
}
