# Onchain Integration Analysis

## Deployment Status (Dec 2024)
- **Frontend:** Vercel (Production) - https://merry-quizmas.vercel.app
- **Database:** Supabase (Production) - Realtime enabled
- **Network:** Base Sepolia (Testnet) for transaction testing
- **Contract:** QuizRewardPool deployed at `0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731`

## Overview
Dokumen ini berisi analisis lengkap tentang file-file yang berinteraksi dengan blockchain.
Semua transaksi adalah REAL onchain - tidak ada mock data.

## Files dengan Interaksi Onchain

### 1. Core Web3 Files

#### `src/lib/web3/config.ts`
- **Fungsi:** Konfigurasi network, token addresses, contract ABI
- **Status:** ✅ Sudah support testnet
- **Key exports:**
  - `IS_TESTNET` - flag dari env `NEXT_PUBLIC_USE_TESTNET`
  - `ACTIVE_CHAIN_ID` - 84532 (Sepolia) atau 8453 (Mainnet)
  - `SUPPORTED_TOKENS` - list token dengan address testnet/mainnet
  - `QUIZ_REWARD_POOL_ADDRESS` - contract address dari env
  - `QUIZ_REWARD_POOL_ABI` - ABI untuk contract

#### `src/lib/web3/transactions.ts`
- **Fungsi:** Semua transaksi onchain
- **Status:** ✅ Sudah real onchain (bukan mock)
- **Functions:**
  - `createQuizOnChain()` - Create quiz + deposit reward tokens
  - `joinQuizOnChain()` - Join quiz + pay entry fee/stake
  - `claimRewardOnChain()` - Claim reward dari contract
  - `returnStakeOnChain()` - Return stake setelah quiz selesai
  - `hasJoinedQuiz()` - Check apakah sudah join
  - `getClaimableReward()` - Get claimable amount
  - `approveToken()` - Approve ERC20 spending
  - `transferToken()` - Transfer ERC20
  - `waitForTransaction()` - Wait for tx confirmation

#### `src/lib/web3/client.ts`
- **Fungsi:** Utility functions untuk wallet
- **Status:** ✅ Real onchain
- **Functions:**
  - `getCurrentNetwork()` - Get current chain
  - `switchToBase()` - Switch network
  - `getERC20Balance()` - Get token balance
  - `getAllTokenBalances()` - Get all supported token balances

### 2. Page Files dengan Onchain Interaction

#### `src/app/create/page.tsx`
- **Fungsi:** Create quiz dengan deposit reward tokens
- **Flow:**
  1. User fills form (title, questions, rewards)
  2. Calls `createQuizOnChain()` - deposits tokens to contract
  3. Waits for tx confirmation
  4. Saves quiz to database with `contractQuizId` dan `depositTxHash`
- **Status:** ✅ Real onchain

#### `src/app/quiz/[id]/page.tsx`
- **Fungsi:** Join quiz dengan entry fee/stake
- **Flow:**
  1. User clicks "Start Quiz"
  2. If quiz has `contract_quiz_id` + entry fee/stake:
     - Calls `joinQuizOnChain()` - pays entry fee/stake
     - Waits for tx confirmation
  3. Starts quiz session
- **Status:** ✅ Real onchain

#### `src/app/claim/page.tsx`
- **Fungsi:** Claim rewards dari contract
- **Flow:**
  1. Fetches pending rewards from API
  2. For rewards with `contractQuizId`:
     - Calls `getClaimableReward()` to check amount
     - Calls `claimRewardOnChain()` - transfers tokens
     - Waits for tx confirmation
     - Updates database
- **Status:** ✅ Real onchain

---

## ✅ ALL MOCK DATA REMOVED (Dec 2024)

### API Routes Updated:
- `/api/rewards/claim/route.ts` - Now requires real txHash from frontend
- `/api/rewards/claim-all/route.ts` - Now requires array of {rewardId, txHash}
- `/api/rewards/[id]/claim/route.ts` - Already accepts real txHash

### Correct Flow (No Mock):
```
Frontend: claimRewardOnChain() → Real TX → Wait confirmation
    ↓
API: POST /api/rewards/claim with { rewardId, txHash }
    ↓
Database: Update with real txHash
```

---

## Environment Variables Required

```env
# .env.local for Base Sepolia Testnet

# Network
NEXT_PUBLIC_USE_TESTNET=true

# Contract
NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS=0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731

# Test Tokens (Base Sepolia)
NEXT_PUBLIC_TESTNET_SUP_ADDRESS=0x91d143D0c9CE96AF2172424A7B943E07a70BE080
NEXT_PUBLIC_TESTNET_BANGER_ADDRESS=0xb3C87A2a914CD4BeB8534e624be1216b9163862a
NEXT_PUBLIC_TESTNET_USDC_ADDRESS=0x783EFc4DCBf2ADD464AD38839f26dE3c51882f04

# RPC (optional, has default)
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
```

---

## Onchain Transaction Flow (Complete)

### Creating a Quiz
```
1. User fills quiz form
2. Frontend: createQuizOnChain()
   ├── Check token allowance
   ├── If insufficient: approveToken() → wallet popup
   ├── Wait for approval tx
   └── createQuiz() on contract → wallet popup
3. Wait for tx confirmation
4. POST /api/quizzes with contractQuizId + depositTxHash
5. Quiz saved to database
```

### Joining a Quiz
```
1. User clicks "Start Quiz"
2. Check if quiz has contract integration (contract_quiz_id exists)
3. If yes:
   ├── Check if already joined: hasJoinedQuiz()
   ├── If not joined: joinQuizOnChain()
   │   ├── Approve entry fee token if needed
   │   ├── Approve stake token if needed
   │   └── joinQuiz() on contract → wallet popup
   └── Wait for tx confirmation
4. Start quiz session
```

### Claiming Rewards
```
1. User goes to /claim page
2. Fetch pending rewards from /api/rewards
3. For each reward with contractQuizId:
   ├── getClaimableReward() - check amount on contract
   ├── If > 0: claimRewardOnChain() → wallet popup
   ├── Wait for tx confirmation
   └── POST /api/rewards/{id}/claim with real txHash
4. Update UI
```

---

## Smart Contract Functions

### QuizRewardPool.sol (deployed at 0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731)

| Function | Description | Called By |
|----------|-------------|-----------|
| `createQuiz(bytes32, address, uint256, address, uint256, address, uint256)` | Create quiz + deposit rewards | Quiz creator |
| `joinQuiz(bytes32)` | Join quiz + pay entry/stake | Participant |
| `claimReward(bytes32)` | Claim reward as winner | Winner |
| `returnStake(bytes32)` | Return stake after quiz ends | Participant |
| `setWinner(bytes32, address, uint256)` | Set single winner | Contract owner |
| `setWinnersBatch(bytes32, address[], uint256[])` | Set multiple winners | Contract owner |
| `closeQuiz(bytes32)` | Close quiz | Quiz creator |
| `hasJoined(bytes32, address)` | Check if joined | View |
| `getClaimableReward(bytes32, address)` | Get claimable amount | View |

---

## Testing Checklist for Base Sepolia

### Prerequisites
- [ ] Wallet connected to Base Sepolia (Chain ID: 84532)
- [ ] Have test ETH for gas (from faucet)
- [ ] Have test tokens (tSUP, tBANGER, tUSDC)
- [ ] `NEXT_PUBLIC_USE_TESTNET=true` in .env.local

### Test Scenarios
1. **Create Quiz**
   - [ ] Select test token (tSUP/tBANGER/tUSDC)
   - [ ] Approve token spending
   - [ ] Create quiz transaction
   - [ ] Verify quiz saved with contractQuizId

2. **Join Quiz**
   - [ ] Find quiz with entry fee/stake
   - [ ] Approve tokens if needed
   - [ ] Join quiz transaction
   - [ ] Verify joined status on contract

3. **Claim Reward**
   - [ ] Complete quiz as winner
   - [ ] Admin sets winner on contract
   - [ ] Claim reward transaction
   - [ ] Verify tokens received

---

## Recommendations

### ✅ COMPLETED:
1. Removed mock txHash from API routes - now requires real txHash
2. All onchain transactions use real gas fees on Base Sepolia
3. Frontend handles approve → transaction → wait → update DB flow

### Future Improvements:
1. Add transaction status UI (pending/confirmed/failed)
2. Add contract event listeners for better UX
3. Implement batch transactions using EIP-5792 (wallet_sendCalls)
