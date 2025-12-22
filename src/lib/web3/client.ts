/**
 * Web3 Client
 * Functions for blockchain interactions
 */

import { getPublicClient, getWalletClient } from '@wagmi/core';
import { wagmiConfig } from '@/components/providers/farcaster-provider';
import { 
  ACTIVE_CHAIN_ID,
  IS_TESTNET,
  REWARD_TOKEN_ADDRESS,
  SUPPORTED_TOKENS,
  getChainIdHex,
  isCorrectNetwork,
  getChainConfig,
} from './config';

// Token balance type
export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  decimals: number;
  formattedBalance: string;
}

// Types
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface NetworkInfo {
  chainId: number;
  isCorrect: boolean;
}

/**
 * Get provider for read-only calls - tries wagmi first, falls back to window.ethereum
 */
async function getProvider(): Promise<{ request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null> {
  // Try wagmi public client first
  try {
    const publicClient = getPublicClient(wagmiConfig);
    if (publicClient) {
      return {
        request: async ({ method, params }) => {
          if (method === 'eth_call' && params) {
            const [callParams] = params as [{ to: string; data: string }];
            const result = await publicClient.call({
              to: callParams.to as `0x${string}`,
              data: callParams.data as `0x${string}`,
            });
            return result.data;
          }
          if (method === 'eth_getBalance' && params) {
            const [address] = params as [string];
            const balance = await publicClient.getBalance({
              address: address as `0x${string}`,
            });
            return `0x${balance.toString(16)}`;
          }
          if (method === 'eth_chainId') {
            return `0x${publicClient.chain.id.toString(16)}`;
          }
          if (method === 'eth_getTransactionReceipt' && params?.[0]) {
            const receipt = await publicClient.getTransactionReceipt({
              hash: params[0] as `0x${string}`,
            });
            return receipt;
          }
          // Fallback to window.ethereum
          if (typeof window !== 'undefined' && window.ethereum) {
            return window.ethereum.request({ method, params });
          }
          throw new Error(`Method ${method} not supported`);
        }
      };
    }
  } catch (e) {
    console.log('[Client] Wagmi public client not available:', e);
  }
  
  // Fallback to window.ethereum
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  
  return null;
}

/**
 * Get wallet provider for write operations
 */
async function getWalletProvider(): Promise<{ request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null> {
  // Try wagmi wallet client first
  try {
    const walletClient = await getWalletClient(wagmiConfig);
    if (walletClient) {
      return {
        request: async ({ method, params }) => {
          if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
            // These methods need window.ethereum
            if (typeof window !== 'undefined' && window.ethereum) {
              return window.ethereum.request({ method, params });
            }
            throw new Error(`Method ${method} not supported without window.ethereum`);
          }
          if (method === 'eth_chainId') {
            return `0x${walletClient.chain.id.toString(16)}`;
          }
          // Fallback to window.ethereum
          if (typeof window !== 'undefined' && window.ethereum) {
            return window.ethereum.request({ method, params });
          }
          throw new Error(`Method ${method} not supported`);
        }
      };
    }
  } catch (e) {
    console.log('[Client] Wagmi wallet client not available:', e);
  }
  
  // Fallback to window.ethereum
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  
  return null;
}

/**
 * Get current network info from wallet
 */
export async function getCurrentNetwork(): Promise<NetworkInfo | null> {
  const provider = await getProvider();
  if (!provider) {
    return null;
  }

  try {
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex as string, 16);
    return {
      chainId,
      isCorrect: isCorrectNetwork(chainId),
    };
  } catch (error) {
    console.error('Failed to get network:', error);
    return null;
  }
}

/**
 * Switch to the active network (Base Mainnet or Base Sepolia)
 */
export async function switchToBase(): Promise<boolean> {
  const provider = await getWalletProvider();
  if (!provider) {
    return false;
  }

  const targetChainId = ACTIVE_CHAIN_ID;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: getChainIdHex(targetChainId) }],
    });
    return true;
  } catch (switchError: unknown) {
    // If chain not added, add it
    const error = switchError as { code?: number };
    if (error.code === 4902) {
      try {
        const chainConfig = getChainConfig(IS_TESTNET);
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        return false;
      }
    }
    console.error('Failed to switch network:', switchError);
    return false;
  }
}

/**
 * Get token balance for address
 */
export async function getTokenBalance(address: string): Promise<string> {
  if (!REWARD_TOKEN_ADDRESS) {
    return '0';
  }

  const provider = await getProvider();
  if (!provider) {
    return '0';
  }

  try {
    // Encode balanceOf call
    const data = encodeBalanceOf(address);
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: REWARD_TOKEN_ADDRESS,
        data,
      }, 'latest'],
    });

    // Decode result (uint256)
    const balance = BigInt(result as string);
    return balance.toString();
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return '0';
  }
}

/**
 * Encode balanceOf function call
 */
function encodeBalanceOf(address: string): string {
  // balanceOf(address) selector: 0x70a08231
  const selector = '0x70a08231';
  // Pad address to 32 bytes
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return selector + paddedAddress;
}

/**
 * Format token balance with decimals
 */
export function formatTokenBalance(balance: string, decimals: number): string {
  if (!balance || balance === '0') return '0';
  
  const balanceBigInt = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const integerPart = balanceBigInt / divisor;
  const fractionalPart = balanceBigInt % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  // Trim trailing zeros
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmedFractional.slice(0, 4)}`;
}

/**
 * Get ETH balance for address
 */
export async function getEthBalance(address: string): Promise<string> {
  const provider = await getProvider();
  if (!provider) {
    return '0';
  }

  try {
    const result = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });

    return BigInt(result as string).toString();
  } catch (error) {
    console.error('Failed to get ETH balance:', error);
    return '0';
  }
}

/**
 * Get balance for a specific ERC20 token
 */
export async function getERC20Balance(tokenAddress: string, walletAddress: string): Promise<string> {
  if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return '0';
  }

  const provider = await getProvider();
  if (!provider) {
    return '0';
  }

  try {
    const data = encodeBalanceOf(walletAddress);
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: tokenAddress,
        data,
      }, 'latest'],
    });

    return BigInt(result as string).toString();
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return '0';
  }
}

/**
 * Get all supported token balances for a wallet
 */
export async function getAllTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
  if (!walletAddress) {
    return [];
  }

  // Fetch all balances in parallel for better performance
  const balancePromises = SUPPORTED_TOKENS.map(async (token) => {
    try {
      let balance: string;
      
      if (token.symbol === 'ETH') {
        balance = await getEthBalance(walletAddress);
      } else {
        balance = await getERC20Balance(token.address, walletAddress);
      }

      const formattedBalance = formatTokenBalance(balance, token.decimals);

      return {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        balance,
        decimals: token.decimals,
        formattedBalance,
      };
    } catch (error) {
      console.error(`Failed to get balance for ${token.symbol}:`, error);
      return {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        balance: '0',
        decimals: token.decimals,
        formattedBalance: '0',
      };
    }
  });

  return Promise.all(balancePromises);
}

/**
 * Claim reward - Direct transfer approach
 * Note: This is a simplified approach where rewards are sent from a treasury wallet
 * In production, you'd use a smart contract with signature verification
 */
export async function claimRewardDirect(
  rewardId: string,
  amount: string,
  walletAddress: string
): Promise<TransactionResult> {
  // For now, we'll call the API to process the claim
  // The API will handle the actual token transfer from treasury
  try {
    const response = await fetch('/api/rewards/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({
        rewardId,
        amount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to claim reward',
      };
    }

    return {
      success: true,
      txHash: data.txHash,
    };
  } catch (error) {
    console.error('Claim error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Claim multiple rewards at once
 */
export async function claimAllRewards(
  rewardIds: string[],
  walletAddress: string
): Promise<TransactionResult> {
  try {
    const response = await fetch('/api/rewards/claim-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({
        rewardIds,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to claim rewards',
      };
    }

    return {
      success: true,
      txHash: data.txHash,
    };
  } catch (error) {
    console.error('Claim all error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.',
    };
  }
}

/**
 * Watch for transaction confirmation
 */
export async function waitForTransaction(txHash: string, maxAttempts = 30): Promise<boolean> {
  const provider = await getProvider();
  if (!provider) {
    return false;
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt) {
        const status = (receipt as { status: string }).status;
        return status === '0x1';
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error checking transaction:', error);
    }
  }

  return false;
}

// Extend Window interface - use 'any' to avoid conflicts with wagmi/coinbase types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}
