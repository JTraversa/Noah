import { http, createConfig } from 'wagmi';
import { arbitrum } from 'viem/chains';

export const config = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(),
  },
});
