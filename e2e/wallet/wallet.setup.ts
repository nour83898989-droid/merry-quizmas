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

// Test wallet seed phrase - use deployer wallet for testing
// IMPORTANT: This should match DEPLOYER_PRIVATE_KEY in .env.local
const TEST_SEED_PHRASE = process.env.TEST_WALLET_SEED_PHRASE || 'test test test test test test test test test test test junk';
const TEST_PASSWORD = 'Tester@1234';

export default defineWalletSetup(TEST_PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, TEST_PASSWORD);

  // Import wallet using seed phrase
  await metamask.importWallet(TEST_SEED_PHRASE);

  // Add Base Sepolia network
  await metamask.addNetwork(BASE_SEPOLIA_NETWORK);

  // Switch to Base Sepolia
  await metamask.switchNetwork('Base Sepolia');
});
