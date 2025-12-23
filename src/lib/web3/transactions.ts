/**
 * Web3 Transactions
 * Functions for onchain token transfers with wallet approval
 */

import { ACTIVE_CHAIN_ID, getChainIdHex, isCorrectNetwork, getChainConfig, IS_TESTNET, QUIZ_REWARD_POOL_ADDRESS } from './config';
import { getWalletClient, getPublicClient } from '@wagmi/core';
import { wagmiConfig } from '@/components/providers/farcaster-provider';

// ERC20 function selectors
const TRANSFER_SELECTOR = '0xa9059cbb'; // transfer(address,uint256)
const APPROVE_SELECTOR = '0x095ea7b3'; // approve(address,uint256)
const ALLOWANCE_SELECTOR = '0xdd62ed3e'; // allowance(address,address)

// QuizRewardPool function selectors (calculated with cast sig)
const CREATE_QUIZ_SELECTOR = '0xb69059da'; // createQuiz(bytes32,address,uint256,address,uint256,address,uint256)
const JOIN_QUIZ_SELECTOR = '0x694d3d38'; // joinQuiz(bytes32)
const CLAIM_REWARD_SELECTOR = '0xf5414023'; // claimReward(bytes32)
const RETURN_STAKE_SELECTOR = '0x3ba170c0'; // returnStake(bytes32)
const GET_CLAIMABLE_SELECTOR = '0xd16a7c54'; // getClaimableReward(bytes32,address)
const HAS_JOINED_SELECTOR = '0x02cc90c7'; // hasJoined(bytes32,address)

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Get wallet provider - tries wagmi first, falls back to window.ethereum
 */
async function getWalletProvider(): Promise<{ request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null> {
  // Try wagmi wallet client first (works in Farcaster mini app)
  try {
    const walletClient = await getWalletClient(wagmiConfig);
    const publicClient = getPublicClient(wagmiConfig);
    
    if (walletClient) {
      return {
        request: async ({ method, params }) => {
          // Map common methods to viem wallet client
          if (method === 'eth_sendTransaction' && params?.[0]) {
            const tx = params[0] as { from: string; to: string; data?: string; value?: string; gas?: string };
            
            // Try to estimate gas first, fallback to 300k if estimation fails
            let gasLimit: bigint;
            if (tx.gas) {
              gasLimit = BigInt(tx.gas);
            } else if (publicClient) {
              try {
                const estimated = await publicClient.estimateGas({
                  account: tx.from as `0x${string}`,
                  to: tx.to as `0x${string}`,
                  data: tx.data as `0x${string}` | undefined,
                  value: tx.value ? BigInt(tx.value) : undefined,
                });
                // Add 20% buffer to estimated gas
                gasLimit = (estimated * BigInt(120)) / BigInt(100);
                console.log(`[Transactions] Estimated gas: ${estimated}, with buffer: ${gasLimit}`);
              } catch (estimateError) {
                console.log('[Transactions] Gas estimation failed, using fallback:', estimateError);
                gasLimit = BigInt(300000); // Fallback for contract calls
              }
            } else {
              gasLimit = BigInt(300000);
            }
            
            const hash = await walletClient.sendTransaction({
              account: tx.from as `0x${string}`,
              to: tx.to as `0x${string}`,
              data: tx.data as `0x${string}` | undefined,
              value: tx.value ? BigInt(tx.value) : undefined,
              gas: gasLimit,
            });
            return hash;
          }
          if (method === 'eth_chainId') {
            // Handle case where walletClient.chain might be undefined
            if (walletClient.chain?.id) {
              return `0x${walletClient.chain.id.toString(16)}`;
            }
            // Fallback to window.ethereum if chain is not available
            if (typeof window !== 'undefined' && window.ethereum) {
              return window.ethereum.request({ method, params });
            }
            // Default to active chain ID from config
            return `0x${ACTIVE_CHAIN_ID.toString(16)}`;
          }
          // For other methods, try window.ethereum as fallback
          if (typeof window !== 'undefined' && window.ethereum) {
            return window.ethereum.request({ method, params });
          }
          throw new Error(`Method ${method} not supported`);
        }
      };
    }
  } catch (e) {
    console.log('[Transactions] Wagmi wallet client not available:', e);
  }
  
  // Fallback to window.ethereum (browser wallets)
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  
  return null;
}

/**
 * Get public client for read-only calls
 */
async function getProvider(): Promise<{ request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null> {
  // Try wagmi public client first
  try {
    const publicClient = getPublicClient(wagmiConfig);
    if (publicClient) {
      return {
        request: async ({ method, params }) => {
          if (method === 'eth_call' && params) {
            const [callParams] = params as [{ to: string; data: string }, string];
            const result = await publicClient.call({
              to: callParams.to as `0x${string}`,
              data: callParams.data as `0x${string}`,
            });
            return result.data;
          }
          if (method === 'eth_getTransactionReceipt' && params?.[0]) {
            const receipt = await publicClient.getTransactionReceipt({
              hash: params[0] as `0x${string}`,
            });
            return receipt;
          }
          if (method === 'eth_chainId') {
            return `0x${publicClient.chain.id.toString(16)}`;
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
    console.log('[Transactions] Wagmi public client not available:', e);
  }
  
  // Fallback to window.ethereum
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum;
  }
  
  return null;
}

/**
 * Pad address to 32 bytes (64 hex chars)
 */
function padAddress(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

/**
 * Pad uint256 to 32 bytes (64 hex chars)
 */
function padUint256(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

/**
 * Parse token amount with decimals
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Check if wallet is on correct network, switch if needed
 */
export async function ensureCorrectNetwork(): Promise<boolean> {
  const provider = await getWalletProvider();
  if (!provider) {
    return false;
  }

  try {
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex as string, 16);
    
    if (isCorrectNetwork(chainId)) {
      return true;
    }

    // Try to switch network
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: getChainIdHex(ACTIVE_CHAIN_ID) }],
      });
      return true;
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        // Chain not added, add it
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [getChainConfig(IS_TESTNET)],
        });
        return true;
      }
      throw switchError;
    }
  } catch (error) {
    console.error('Failed to ensure correct network:', error);
    return false;
  }
}

/**
 * Get current allowance for spender
 */
export async function getAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> {
  const provider = await getProvider();
  if (!provider) {
    return BigInt(0);
  }

  try {
    const data = ALLOWANCE_SELECTOR + padAddress(ownerAddress) + padAddress(spenderAddress);
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
    });

    return BigInt(result as string);
  } catch (error) {
    console.error('Failed to get allowance:', error);
    return BigInt(0);
  }
}

/**
 * Approve token spending - requires wallet confirmation
 */
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Encode approve call
    const data = APPROVE_SELECTOR + padAddress(spenderAddress) + padUint256(amount);

    // Send transaction - this will prompt wallet approval
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: tokenAddress,
        data,
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('Approve failed:', error);
    return { success: false, error: err.message || 'Approval failed' };
  }
}

/**
 * Transfer ERC20 tokens - requires wallet confirmation
 */
export async function transferToken(
  tokenAddress: string,
  toAddress: string,
  amount: bigint,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Encode transfer call
    const data = TRANSFER_SELECTOR + padAddress(toAddress) + padUint256(amount);

    // Send transaction - this will prompt wallet approval
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: tokenAddress,
        data,
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('Transfer failed:', error);
    return { success: false, error: err.message || 'Transfer failed' };
  }
}

/**
 * Transfer ETH - requires wallet confirmation
 */
export async function transferETH(
  toAddress: string,
  amountWei: bigint,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Send ETH transaction
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: toAddress,
        value: '0x' + amountWei.toString(16),
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('ETH transfer failed:', error);
    return { success: false, error: err.message || 'Transfer failed' };
  }
}

/**
 * Wait for transaction to be mined
 */
export async function waitForTransaction(txHash: string, maxAttempts = 60): Promise<boolean> {
  console.log(`[waitForTransaction] Waiting for tx: ${txHash}`);
  
  // Try using viem's waitForTransactionReceipt directly (more reliable)
  try {
    const publicClient = getPublicClient(wagmiConfig);
    if (publicClient) {
      console.log('[waitForTransaction] Using viem waitForTransactionReceipt');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 120_000, // 2 minutes timeout
      });
      const success = receipt.status === 'success';
      console.log(`[waitForTransaction] Receipt found! Status: ${receipt.status}, Success: ${success}`);
      return success;
    }
  } catch (viemError) {
    console.log('[waitForTransaction] Viem waitForTransactionReceipt failed:', viemError);
  }

  // Fallback to polling
  const provider = await getProvider();
  if (!provider) {
    console.error('[waitForTransaction] No provider available');
    return false;
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt) {
        // Handle both viem format (status: 'success') and JSON-RPC format (status: '0x1')
        const receiptObj = receipt as { status: string | 'success' | 'reverted' };
        const success = receiptObj.status === '0x1' || receiptObj.status === 'success';
        console.log(`[waitForTransaction] Receipt found! Status: ${receiptObj.status}, Success: ${success}`);
        return success;
      }

      // Wait 2 seconds before next attempt
      if (i % 10 === 0) {
        console.log(`[waitForTransaction] Still waiting... attempt ${i + 1}/${maxAttempts}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('[waitForTransaction] Error checking transaction:', error);
    }
  }

  console.error(`[waitForTransaction] Timeout after ${maxAttempts} attempts`);
  return false;
}

/**
 * Deposit reward pool tokens to treasury
 * Called when creating a quiz with rewards
 */
export async function depositRewardPool(
  tokenAddress: string,
  amount: string,
  decimals: number,
  walletAddress: string,
  treasuryAddress: string
): Promise<TransactionResult> {
  const amountBigInt = parseTokenAmount(amount, decimals);
  
  // For ETH
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return transferETH(treasuryAddress, amountBigInt, walletAddress);
  }
  
  // For ERC20 tokens
  return transferToken(tokenAddress, treasuryAddress, amountBigInt, walletAddress);
}

/**
 * Pay entry fee to join quiz
 */
export async function payEntryFee(
  tokenAddress: string,
  amount: string,
  decimals: number,
  walletAddress: string,
  quizCreatorAddress: string
): Promise<TransactionResult> {
  const amountBigInt = parseTokenAmount(amount, decimals);
  
  // For ETH
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return transferETH(quizCreatorAddress, amountBigInt, walletAddress);
  }
  
  // For ERC20 tokens
  return transferToken(tokenAddress, quizCreatorAddress, amountBigInt, walletAddress);
}

/**
 * Stake tokens to participate in quiz
 */
export async function stakeTokens(
  tokenAddress: string,
  amount: string,
  decimals: number,
  walletAddress: string,
  stakingAddress: string
): Promise<TransactionResult> {
  const amountBigInt = parseTokenAmount(amount, decimals);
  
  // For ETH
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return transferETH(stakingAddress, amountBigInt, walletAddress);
  }
  
  // For ERC20 tokens
  return transferToken(tokenAddress, stakingAddress, amountBigInt, walletAddress);
}

// ============================================
// QuizRewardPool Contract Functions
// ============================================

/**
 * Convert string to bytes32 (quiz ID)
 */
export function stringToBytes32(str: string): string {
  // If already hex, pad to 32 bytes
  if (str.startsWith('0x')) {
    return str.padEnd(66, '0');
  }
  // Convert string to hex
  let hex = '0x';
  for (let i = 0; i < str.length && i < 32; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex.padEnd(66, '0');
}

/**
 * Encode createQuiz function call
 */
function encodeCreateQuiz(
  quizId: string,
  rewardToken: string,
  rewardAmount: bigint,
  entryFeeToken: string,
  entryFeeAmount: bigint,
  stakeToken: string,
  stakeAmount: bigint
): string {
  const quizIdBytes32 = stringToBytes32(quizId).slice(2);
  return CREATE_QUIZ_SELECTOR +
    quizIdBytes32 +
    padAddress(rewardToken) +
    padUint256(rewardAmount) +
    padAddress(entryFeeToken) +
    padUint256(entryFeeAmount) +
    padAddress(stakeToken) +
    padUint256(stakeAmount);
}

/**
 * Check token balance
 */
export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<bigint> {
  const provider = await getProvider();
  if (!provider) return BigInt(0);

  try {
    // balanceOf(address) selector
    const data = '0x70a08231' + padAddress(walletAddress);
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
    });
    return BigInt(result as string);
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return BigInt(0);
  }
}

/**
 * Create quiz on contract - deposits reward tokens
 * Requires prior approval of reward tokens
 */
export async function createQuizOnChain(
  quizId: string,
  rewardToken: string,
  rewardAmount: string,
  rewardDecimals: number,
  entryFeeToken: string,
  entryFeeAmount: string,
  entryFeeDecimals: number,
  stakeToken: string,
  stakeAmount: string,
  stakeDecimals: number,
  walletAddress: string
): Promise<TransactionResult> {
  console.log('[createQuizOnChain] Starting...', {
    quizId,
    rewardToken,
    rewardAmount,
    rewardDecimals,
    walletAddress,
    contractAddress: QUIZ_REWARD_POOL_ADDRESS,
  });

  const provider = await getWalletProvider();
  if (!provider) {
    console.error('[createQuizOnChain] Wallet not available');
    return { success: false, error: 'Wallet not available' };
  }

  if (!QUIZ_REWARD_POOL_ADDRESS) {
    console.error('[createQuizOnChain] Contract not configured');
    return { success: false, error: 'Quiz contract not configured' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    const rewardAmountBigInt = parseTokenAmount(rewardAmount, rewardDecimals);
    const entryFeeAmountBigInt = entryFeeToken && entryFeeAmount ? parseTokenAmount(entryFeeAmount, entryFeeDecimals) : BigInt(0);
    const stakeAmountBigInt = stakeToken && stakeAmount ? parseTokenAmount(stakeAmount, stakeDecimals) : BigInt(0);

    console.log('[createQuizOnChain] Parsed amounts:', {
      rewardAmountBigInt: rewardAmountBigInt.toString(),
      entryFeeAmountBigInt: entryFeeAmountBigInt.toString(),
      stakeAmountBigInt: stakeAmountBigInt.toString(),
    });

    // Check token balance first
    const balance = await getTokenBalance(rewardToken, walletAddress);
    console.log('[createQuizOnChain] Token balance:', balance.toString());
    
    if (balance < rewardAmountBigInt) {
      const shortfall = rewardAmountBigInt - balance;
      return { 
        success: false, 
        error: `Insufficient token balance. You need ${rewardAmount} tokens but only have ${(Number(balance) / Math.pow(10, rewardDecimals)).toFixed(4)}` 
      };
    }

    // Check and request approval for reward token
    let currentAllowance = await getAllowance(rewardToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
    console.log('[createQuizOnChain] Current allowance:', currentAllowance.toString());
    
    if (currentAllowance < rewardAmountBigInt) {
      console.log('[createQuizOnChain] Requesting approval...');
      const approveResult = await approveToken(rewardToken, QUIZ_REWARD_POOL_ADDRESS, rewardAmountBigInt, walletAddress);
      if (!approveResult.success) {
        return approveResult;
      }
      // Wait for approval tx
      if (approveResult.txHash) {
        console.log('[createQuizOnChain] Waiting for approval tx:', approveResult.txHash);
        const approved = await waitForTransaction(approveResult.txHash);
        if (!approved) {
          return { success: false, error: 'Token approval failed' };
        }
        console.log('[createQuizOnChain] Approval confirmed');
        
        // Wait a bit for RPC to sync, then verify allowance
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Re-check allowance to make sure it's updated
        currentAllowance = await getAllowance(rewardToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
        console.log('[createQuizOnChain] Allowance after approval:', currentAllowance.toString());
        
        if (currentAllowance < rewardAmountBigInt) {
          // Wait more and retry
          console.log('[createQuizOnChain] Allowance still insufficient, waiting more...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          currentAllowance = await getAllowance(rewardToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
          console.log('[createQuizOnChain] Allowance after extra wait:', currentAllowance.toString());
          
          if (currentAllowance < rewardAmountBigInt) {
            return { success: false, error: 'Token approval not confirmed. Please try again.' };
          }
        }
      }
    }

    // Encode and send createQuiz transaction
    const data = encodeCreateQuiz(
      quizId,
      rewardToken,
      rewardAmountBigInt,
      entryFeeToken || '0x0000000000000000000000000000000000000000',
      entryFeeAmountBigInt,
      stakeToken || '0x0000000000000000000000000000000000000000',
      stakeAmountBigInt
    );

    console.log('[createQuizOnChain] Sending transaction with data:', data.slice(0, 74) + '...');

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: QUIZ_REWARD_POOL_ADDRESS,
        data,
      }],
    });

    console.log('[createQuizOnChain] Transaction sent:', txHash);
    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string; data?: unknown };
    console.error('[createQuizOnChain] Error:', error);
    
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    
    // Parse common error messages
    let errorMessage = err.message || 'Create quiz failed';
    if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient ETH for gas fees';
    } else if (errorMessage.includes('execution reverted')) {
      errorMessage = 'Transaction would fail. Check token balance and approval.';
    } else if (errorMessage.includes('gas estimation')) {
      errorMessage = 'Network fee estimation failed. This usually means the transaction would revert. Check your token balance.';
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Join quiz on contract - pays entry fee and/or stake
 */
export async function joinQuizOnChain(
  quizId: string,
  entryFeeToken: string | null,
  entryFeeAmount: string | null,
  entryFeeDecimals: number,
  stakeToken: string | null,
  stakeAmount: string | null,
  stakeDecimals: number,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  if (!QUIZ_REWARD_POOL_ADDRESS) {
    return { success: false, error: 'Quiz contract not configured' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Approve entry fee token if needed
    if (entryFeeToken && entryFeeAmount && entryFeeToken !== '0x0000000000000000000000000000000000000000') {
      const entryFeeAmountBigInt = parseTokenAmount(entryFeeAmount, entryFeeDecimals);
      const currentAllowance = await getAllowance(entryFeeToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
      if (currentAllowance < entryFeeAmountBigInt) {
        const approveResult = await approveToken(entryFeeToken, QUIZ_REWARD_POOL_ADDRESS, entryFeeAmountBigInt, walletAddress);
        if (!approveResult.success) return approveResult;
        if (approveResult.txHash) {
          const approved = await waitForTransaction(approveResult.txHash);
          if (!approved) return { success: false, error: 'Entry fee approval failed' };
        }
      }
    }

    // Approve stake token if needed
    if (stakeToken && stakeAmount && stakeToken !== '0x0000000000000000000000000000000000000000') {
      const stakeAmountBigInt = parseTokenAmount(stakeAmount, stakeDecimals);
      const currentAllowance = await getAllowance(stakeToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
      if (currentAllowance < stakeAmountBigInt) {
        const approveResult = await approveToken(stakeToken, QUIZ_REWARD_POOL_ADDRESS, stakeAmountBigInt, walletAddress);
        if (!approveResult.success) return approveResult;
        if (approveResult.txHash) {
          const approved = await waitForTransaction(approveResult.txHash);
          if (!approved) return { success: false, error: 'Stake approval failed' };
        }
      }
    }

    // Encode joinQuiz call
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = JOIN_QUIZ_SELECTOR + quizIdBytes32;

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: QUIZ_REWARD_POOL_ADDRESS,
        data,
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('Join quiz failed:', error);
    return { success: false, error: err.message || 'Join quiz failed' };
  }
}

/**
 * Claim reward from contract
 */
export async function claimRewardOnChain(
  quizId: string,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  if (!QUIZ_REWARD_POOL_ADDRESS) {
    return { success: false, error: 'Quiz contract not configured' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Encode claimReward call
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = CLAIM_REWARD_SELECTOR + quizIdBytes32;

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: QUIZ_REWARD_POOL_ADDRESS,
        data,
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('Claim reward failed:', error);
    return { success: false, error: err.message || 'Claim reward failed' };
  }
}

/**
 * Return stake after quiz ends
 */
export async function returnStakeOnChain(
  quizId: string,
  walletAddress: string
): Promise<TransactionResult> {
  const provider = await getWalletProvider();
  if (!provider) {
    return { success: false, error: 'Wallet not available' };
  }

  if (!QUIZ_REWARD_POOL_ADDRESS) {
    return { success: false, error: 'Quiz contract not configured' };
  }

  try {
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = RETURN_STAKE_SELECTOR + quizIdBytes32;

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletAddress,
        to: QUIZ_REWARD_POOL_ADDRESS,
        data,
      }],
    });

    return { success: true, txHash: txHash as string };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    console.error('Return stake failed:', error);
    return { success: false, error: err.message || 'Return stake failed' };
  }
}

/**
 * Check if user has joined a quiz
 */
export async function hasJoinedQuiz(quizId: string, walletAddress: string): Promise<boolean> {
  if (!QUIZ_REWARD_POOL_ADDRESS) {
    return false;
  }

  const provider = await getProvider();
  if (!provider) {
    return false;
  }

  try {
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = HAS_JOINED_SELECTOR + quizIdBytes32 + padAddress(walletAddress);

    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: QUIZ_REWARD_POOL_ADDRESS, data }, 'latest'],
    });

    return BigInt(result as string) === BigInt(1);
  } catch (error) {
    console.error('Failed to check join status:', error);
    return false;
  }
}

/**
 * Get claimable reward amount for user
 */
export async function getClaimableReward(quizId: string, walletAddress: string): Promise<bigint> {
  if (!QUIZ_REWARD_POOL_ADDRESS) {
    return BigInt(0);
  }

  const provider = await getProvider();
  if (!provider) {
    return BigInt(0);
  }

  try {
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = GET_CLAIMABLE_SELECTOR + quizIdBytes32 + padAddress(walletAddress);

    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: QUIZ_REWARD_POOL_ADDRESS, data }, 'latest'],
    });

    return BigInt(result as string);
  } catch (error) {
    console.error('Failed to get claimable reward:', error);
    return BigInt(0);
  }
}
