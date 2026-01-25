import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from '../../wagmiConfig';
import AppPage from './AppPage';
import ConnectButton from './ConnectButton';

import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

function ConnectButtonPortal() {
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    const el = document.getElementById('connect-button-slot');
    if (el) setSlot(el);
  }, []);

  if (!slot) return null;
  return createPortal(<ConnectButton />, slot);
}

export default function AppWithWagmi() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ConnectButtonPortal />
          <main className="relative z-10 flex-1 py-8 overflow-auto">
            <AppPage />
          </main>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
