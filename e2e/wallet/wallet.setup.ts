/**
 * Synpress Wallet Setup for E2E Testing
 * Configures MetaMask with Base Sepolia network and test wallet
 */

import { MetaMask, defineWalletSetup } from '@synthetixio/synpress';

// Base Sepolia Network Configuration
const BASE_SEPOLIA_NETWORK = {
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  chainId: 84532,
  symbol: 'ETH',
  blockExplorerUrl: 'https://sepolia.basescan.org',
};

// Use DEPLOYER_PRIVATE_KEY from .env.local
// Remove '0x' prefix if present
const PRIVATE_KEY = (process.env.DEPLOYER_PRIVATE_KEY || '').replace(/^0x/, '');
const TEST_PASSWORD = 'Tester@1234';

export default defineWalletSetup(TEST_PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, TEST_PASSWORD);

  // Import wallet using private key
  await metamask.importWalletFromPrivateKey(PRIVATE_KEY);

  // Add Base Sepolia network
  await metamask.addNetwork(BASE_SEPOLIA_NETWORK);

  // Switch to Base Sepolia
  await metamask.switchNetwork('Base Sepolia');
});
