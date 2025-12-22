/**
 * Web3 Configuration
 * Configuration for blockchain interactions on Base network
 */

// Base Mainnet configuration
export const BASE_CHAIN_ID = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';

// Base Sepolia Testnet configuration
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

// Determine if we're in testnet mode
export const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === 'true';

// Active chain configuration (switches between mainnet and testnet)
export const ACTIVE_CHAIN_ID = IS_TESTNET ? BASE_SEPOLIA_CHAIN_ID : BASE_CHAIN_ID;
export const ACTIVE_RPC_URL = IS_TESTNET ? BASE_SEPOLIA_RPC_URL : BASE_RPC_URL;

// Token addresses from environment (Base Mainnet)
export const BANGER_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_BANGER_TOKEN_ADDRESS || '';
export const SUP_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_SUP_TOKEN_ADDRESS || '';
export const REWARD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS || '';
export const REWARD_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_REWARD_CHAIN_ID || '8453');

// Testnet token addresses (Base Sepolia)
export const TESTNET_SUP_ADDRESS = process.env.NEXT_PUBLIC_TESTNET_SUP_ADDRESS || '';
export const TESTNET_BANGER_ADDRESS = process.env.NEXT_PUBLIC_TESTNET_BANGER_ADDRESS || '';
export const TESTNET_USDC_ADDRESS = process.env.NEXT_PUBLIC_TESTNET_USDC_ADDRESS || '';

// QuizRewardPool Contract Address
export const QUIZ_REWARD_POOL_ADDRESS = process.env.NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS || '';

// Get active token address based on network
export function getActiveTokenAddress(mainnetAddress: string, testnetAddress: string): string {
  return IS_TESTNET ? testnetAddress : mainnetAddress;
}

// Active token addresses (switches based on IS_TESTNET)
export const ACTIVE_SUP_ADDRESS = getActiveTokenAddress(SUP_TOKEN_ADDRESS, TESTNET_SUP_ADDRESS);
export const ACTIVE_BANGER_ADDRESS = getActiveTokenAddress(BANGER_TOKEN_ADDRESS, TESTNET_BANGER_ADDRESS);
export const ACTIVE_USDC_ADDRESS = getActiveTokenAddress(
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base Mainnet
  TESTNET_USDC_ADDRESS
);

// Supported tokens list (dynamically uses testnet or mainnet addresses)
export const SUPPORTED_TOKENS = [
  {
    symbol: IS_TESTNET ? 'tSUP' : 'SUP',
    name: IS_TESTNET ? 'Test SUP Token' : 'SUP Token',
    address: ACTIVE_SUP_ADDRESS,
    decimals: 18,
  },
  {
    symbol: IS_TESTNET ? 'tBANGER' : 'BANGER',
    name: IS_TESTNET ? 'Test Banger Token' : 'Banger Token',
    address: ACTIVE_BANGER_ADDRESS,
    decimals: 18,
  },
  {
    symbol: IS_TESTNET ? 'tUSDC' : 'USDC',
    name: IS_TESTNET ? 'Test USDC' : 'USD Coin',
    address: ACTIVE_USDC_ADDRESS,
    decimals: 6,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    decimals: 18,
  },
] as const;

// ERC20 ABI (minimal for transfer/approve)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const;

// Quiz Reward Contract ABI - QuizRewardPool.sol
export const QUIZ_REWARD_POOL_ABI = [
  // createQuiz
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'rewardToken', type: 'address' },
      { name: 'rewardAmount', type: 'uint256' },
      { name: 'entryFeeToken', type: 'address' },
      { name: 'entryFeeAmount', type: 'uint256' },
      { name: 'stakeToken', type: 'address' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    name: 'createQuiz',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // joinQuiz
  {
    inputs: [{ name: 'quizId', type: 'bytes32' }],
    name: 'joinQuiz',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // claimReward
  {
    inputs: [{ name: 'quizId', type: 'bytes32' }],
    name: 'claimReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // returnStake
  {
    inputs: [{ name: 'quizId', type: 'bytes32' }],
    name: 'returnStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // closeQuiz
  {
    inputs: [{ name: 'quizId', type: 'bytes32' }],
    name: 'closeQuiz',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // setWinner
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'rewardAmount', type: 'uint256' },
    ],
    name: 'setWinner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // setWinnersBatch
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'winners', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    name: 'setWinnersBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // View functions
  {
    inputs: [{ name: 'quizId', type: 'bytes32' }],
    name: 'getQuiz',
    outputs: [
      {
        components: [
          { name: 'creator', type: 'address' },
          { name: 'rewardToken', type: 'address' },
          { name: 'totalRewardPool', type: 'uint256' },
          { name: 'remainingReward', type: 'uint256' },
          { name: 'entryFeeToken', type: 'address' },
          { name: 'entryFeeAmount', type: 'uint256' },
          { name: 'stakeToken', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'totalEntryFees', type: 'uint256' },
          { name: 'totalStaked', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'participant', type: 'address' },
    ],
    name: 'getParticipant',
    outputs: [
      {
        components: [
          { name: 'joined', type: 'bool' },
          { name: 'staked', type: 'bool' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'entryFeePaid', type: 'uint256' },
          { name: 'rewardClaimed', type: 'bool' },
          { name: 'rewardAmount', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'participant', type: 'address' },
    ],
    name: 'hasJoined',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'quizId', type: 'bytes32' },
      { name: 'participant', type: 'address' },
    ],
    name: 'getClaimableReward',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Helper to check if we're on the correct network
export function isCorrectNetwork(chainId: number): boolean {
  return chainId === ACTIVE_CHAIN_ID;
}

// Helper to format chain ID for wallet_switchEthereumChain
export function getChainIdHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

// Get chain config for adding to wallet
export function getChainConfig(isTestnet: boolean = IS_TESTNET) {
  if (isTestnet) {
    return {
      chainId: getChainIdHex(BASE_SEPOLIA_CHAIN_ID),
      chainName: 'Base Sepolia',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: [BASE_SEPOLIA_RPC_URL],
      blockExplorerUrls: ['https://sepolia.basescan.org'],
    };
  }
  
  return {
    chainId: getChainIdHex(BASE_CHAIN_ID),
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [BASE_RPC_URL],
    blockExplorerUrls: ['https://basescan.org'],
  };
}

// Get token by symbol
export function getTokenBySymbol(symbol: string) {
  return SUPPORTED_TOKENS.find(t => t.symbol === symbol);
}

// Get token by address
export function getTokenByAddress(address: string) {
  return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

// Get token display name (handles both mainnet and testnet)
export function getTokenDisplayName(addressOrSymbol: string): string {
  // First try to find by address
  const tokenByAddress = getTokenByAddress(addressOrSymbol);
  if (tokenByAddress) return tokenByAddress.symbol;
  
  // Then try by symbol
  const tokenBySymbol = getTokenBySymbol(addressOrSymbol);
  if (tokenBySymbol) return tokenBySymbol.symbol;
  
  // Return shortened address if not found
  if (addressOrSymbol.startsWith('0x')) {
    return `${addressOrSymbol.slice(0, 6)}...${addressOrSymbol.slice(-4)}`;
  }
  
  return addressOrSymbol;
}
