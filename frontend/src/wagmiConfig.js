import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'Noah',
  projectId: 'noah-app', // WalletConnect project ID - get one at https://cloud.walletconnect.com
  chains: [arbitrum],
});
