import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum, sepolia } from 'viem/chains';

// Local Anvil chain for testing
const anvil = {
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'Noah',
  projectId: 'noah-app', // WalletConnect project ID - get one at https://cloud.walletconnect.com
  chains: [sepolia, anvil, arbitrum],
});
