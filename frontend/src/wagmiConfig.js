import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum } from 'viem/chains';

// Custom Sepolia with Alchemy RPC to avoid CORS issues
const sepoliaCustom = {
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://eth-sepolia.g.alchemy.com/v2/L6juYN1qRd_G-i592DpGaaMcllCYRg8q'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

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
  chains: [sepoliaCustom, anvil, arbitrum],
});
