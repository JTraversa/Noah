import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../../wagmiConfig';
import AppPage from './AppPage';
import ConnectButton from './ConnectButton';

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
        <ConnectButtonPortal />
        <main className="relative z-10 flex-1 py-8 overflow-auto">
          <AppPage />
        </main>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
