/**
 * Web3 Transactions
 * Functions for onchain token transfers with wallet approval
 */

import { ACTIVE_CHAIN_ID, getChainIdHex, isCorrectNetwork, getChainConfig, IS_TESTNET, QUIZ_REWARD_POOL_ADDRESS } from './config';

// ERC20 function selectors
const TRANSFER_SELECTOR = '0xa9059cbb'; // transfer(address,uint256)
const APPROVE_SELECTOR = '0x095ea7b3'; // approve(address,uint256)
const ALLOWANCE_SELECTOR = '0xdd62ed3e'; // allowance(address,address)

// QuizRewardPool function selectors (calculated with cast sig)
const CREATE_QUIZ_SELECTOR = '0x8f6b0a5a'; // createQuiz(bytes32,address,uint256,address,uint256,address,uint256)
const JOIN_QUIZ_SELECTOR = '0x694d3d38'; // joinQuiz(bytes32)
const CLAIM_REWARD_SELECTOR = '0xf5414023'; // claimReward(bytes32)
const RETURN_STAKE_SELECTOR = '0x5c19a95c'; // returnStake(bytes32)
const GET_CLAIMABLE_SELECTOR = '0xd16a7c54'; // getClaimableReward(bytes32,address)
const HAS_JOINED_SELECTOR = '0x02cc90c7'; // hasJoined(bytes32,address)

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
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
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  try {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex as string, 16);
    
    if (isCorrectNetwork(chainId)) {
      return true;
    }

    // Try to switch network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: getChainIdHex(ACTIVE_CHAIN_ID) }],
      });
      return true;
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        // Chain not added, add it
        await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
    return BigInt(0);
  }

  try {
    const data = ALLOWANCE_SELECTOR + padAddress(ownerAddress) + padAddress(spenderAddress);
    
    const result = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
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
    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
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
    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
    return { success: false, error: 'Wallet not available' };
  }

  try {
    // Ensure correct network
    const networkOk = await ensureCorrectNetwork();
    if (!networkOk) {
      return { success: false, error: 'Please switch to the correct network' };
    }

    // Send ETH transaction
    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
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

    const rewardAmountBigInt = parseTokenAmount(rewardAmount, rewardDecimals);
    const entryFeeAmountBigInt = entryFeeToken && entryFeeAmount ? parseTokenAmount(entryFeeAmount, entryFeeDecimals) : BigInt(0);
    const stakeAmountBigInt = stakeToken && stakeAmount ? parseTokenAmount(stakeAmount, stakeDecimals) : BigInt(0);

    // Check and request approval for reward token
    const currentAllowance = await getAllowance(rewardToken, walletAddress, QUIZ_REWARD_POOL_ADDRESS);
    if (currentAllowance < rewardAmountBigInt) {
      const approveResult = await approveToken(rewardToken, QUIZ_REWARD_POOL_ADDRESS, rewardAmountBigInt, walletAddress);
      if (!approveResult.success) {
        return approveResult;
      }
      // Wait for approval tx
      if (approveResult.txHash) {
        const approved = await waitForTransaction(approveResult.txHash);
        if (!approved) {
          return { success: false, error: 'Token approval failed' };
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

    const txHash = await window.ethereum.request({
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
    console.error('Create quiz failed:', error);
    return { success: false, error: err.message || 'Create quiz failed' };
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
  if (typeof window === 'undefined' || !window.ethereum) {
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

    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
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

    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum) {
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

    const txHash = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum || !QUIZ_REWARD_POOL_ADDRESS) {
    return false;
  }

  try {
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = HAS_JOINED_SELECTOR + quizIdBytes32 + padAddress(walletAddress);

    const result = await window.ethereum.request({
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
  if (typeof window === 'undefined' || !window.ethereum || !QUIZ_REWARD_POOL_ADDRESS) {
    return BigInt(0);
  }

  try {
    const quizIdBytes32 = stringToBytes32(quizId).slice(2);
    const data = GET_CLAIMABLE_SELECTOR + quizIdBytes32 + padAddress(walletAddress);

    const result = await window.ethereum.request({
      method: 'eth_call',
      params: [{ to: QUIZ_REWARD_POOL_ADDRESS, data }, 'latest'],
    });

    return BigInt(result as string);
  } catch (error) {
    console.error('Failed to get claimable reward:', error);
    return BigInt(0);
  }
}
