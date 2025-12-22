# Onchain Integration Guide

## Overview
Dokumentasi lengkap tentang integrasi onchain untuk Merry Quizmas mini app di Base Sepolia testnet.

## Files yang Membutuhkan Interaksi Onchain

### 1. Core Transaction Functions
**File:** `src/lib/web3/transactions.ts`
- `createQuizOnChain()` - Deposit reward tokens ke contract saat buat quiz
- `joinQuizOnChain()` - Bayar entry fee dan/atau stake saat join quiz
- `claimRewardOnChain()` - Claim reward dari contract
- `returnStakeOnChain()` - Return stake setelah quiz selesai
- `approveToken()` - Approve ERC20 token spending
- `getAllowance()` - Check current allowance
- `hasJoinedQuiz()` - Check apakah user sudah join quiz di contract
- `getClaimableReward()` - Get claimable reward amount

### 2. Pages yang Menggunakan Onchain Functions

| Page | File | Functions Used | Description |
|------|------|----------------|-------------|
| Create Quiz | `src/app/create/page.tsx` | `createQuizOnChain`, `waitForTransaction` | Deposit reward tokens saat publish quiz |
| Quiz Detail | `src/app/quiz/[id]/page.tsx` | `joinQuizOnChain`, `waitForTransaction`, `hasJoinedQuiz` | Pay entry fee/stake saat start quiz |
| Claim Rewards | `src/app/claim/page.tsx` | `claimRewardOnChain`, `waitForTransaction`, `getClaimableReward` | Claim rewards dari contract |

### 3. API Routes yang Handle Onchain Data

| Route | File | Purpose |
|-------|------|---------|
| POST /api/rewards/:id/claim | `src/app/api/rewards/[id]/claim/route.ts` | Update DB setelah onchain claim |
| POST /api/rewards/claim | `src/app/api/rewards/claim/route.ts` | Update single reward status |
| POST /api/rewards/claim-all | `src/app/api/rewards/claim-all/route.ts` | Update multiple rewards status |

## Mock Data yang Masih Ada (PERLU DIPERBAIKI)

### 1. Polls - FID Placeholder ✅ FIXED
**Files:**
- `src/app/polls/create/page.tsx` - Now uses `useFarcaster()` and `useAccount()` for real FID/wallet
- `src/app/polls/[id]/page.tsx` - Now uses `useFarcaster()` and `useAccount()` for voting

### 2. Quiz Play - Share Functionality
**File:** `src/app/quiz/[id]/play/page.tsx` - Line 239
```typescript
onShare={() => {
  // TODO: Implement share functionality
}}
```

## Contract Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| QuizRewardPool | `0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731` |
| tSUP (Test Token) | `0x91d143D0c9CE96AF2172424A7B943E07a70BE080` |
| tBANGER (Test Token) | `0xb3C87A2a914CD4BeB8534e624be1216b9163862a` |
| tUSDC (Test Token) | `0x783EFc4DCBf2ADD464AD38839f26dE3c51882f04` |

## Onchain Transaction Flow

### Creating a Quiz (dengan Reward Pool)
```
1. User fills quiz form
2. Frontend: createQuizOnChain()
   ├── Check token allowance
   ├── If insufficient: approveToken() → wallet popup
   ├── Wait for approval tx
   └── Call contract createQuiz() → wallet popup
3. Wait for tx confirmation
4. Save to database with contractQuizId & depositTxHash
```

### Joining a Quiz (dengan Entry Fee/Stake)
```
1. User clicks "Start Quiz"
2. Frontend: joinQuizOnChain()
   ├── Check if already joined (hasJoinedQuiz)
   ├── Approve entry fee token if needed
   ├── Approve stake token if needed
   └── Call contract joinQuiz() → wallet popup
3. Wait for tx confirmation
4. Start quiz session
```

### Claiming Rewards
```
1. User goes to /claim page
2. Frontend: claimRewardOnChain()
   └── Call contract claimReward() → wallet popup
3. Wait for tx confirmation
4. Update database via API
```

## Environment Variables (.env.local)

```bash
# Network Mode
NEXT_PUBLIC_USE_TESTNET=true

# Contract Address
NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS=0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731

# Test Tokens (Base Sepolia)
NEXT_PUBLIC_TESTNET_SUP_ADDRESS=0x91d143D0c9CE96AF2172424A7B943E07a70BE080
NEXT_PUBLIC_TESTNET_BANGER_ADDRESS=0xb3C87A2a914CD4BeB8534e624be1216b9163862a
NEXT_PUBLIC_TESTNET_USDC_ADDRESS=0x783EFc4DCBf2ADD464AD38839f26dE3c51882f04

# Neynar API (Farcaster user lookup)
NEXT_PUBLIC_NEYNAR_API_KEY=95A1969D-ADD8-4741-B80D-2CBD3EE8599C
```

## Useful Links & Documentation

### Farcaster
- Mini App SDK: https://docs.farcaster.xyz/developers/mini-apps
- Frame SDK: https://docs.farcaster.xyz/developers/frames
- Neynar API: https://docs.neynar.com/

### Base Network
- Base Docs: https://docs.base.org/
- Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Base Sepolia Explorer: https://sepolia.basescan.org/

### Wagmi/Viem
- Wagmi Docs: https://wagmi.sh/
- Viem Docs: https://viem.sh/

### Smart Contract
- QuizRewardPool on Explorer: https://sepolia.basescan.org/address/0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731

## Testing Checklist

### Prerequisites
- [ ] Wallet connected (MetaMask/Coinbase/Farcaster)
- [ ] Network: Base Sepolia (Chain ID: 84532)
- [ ] Have test ETH for gas (from faucet)
- [ ] Have test tokens (tSUP, tBANGER, tUSDC)

### Test Scenarios
1. **Create Quiz**
   - [ ] Select reward token
   - [ ] Enter reward amount
   - [ ] Approve token (wallet popup)
   - [ ] Create quiz (wallet popup)
   - [ ] Verify tx on explorer

2. **Join Quiz**
   - [ ] Open quiz with entry fee/stake
   - [ ] Approve tokens if needed
   - [ ] Join quiz (wallet popup)
   - [ ] Verify participation

3. **Claim Reward**
   - [ ] Complete quiz as winner
   - [ ] Go to /claim page
   - [ ] Claim reward (wallet popup)
   - [ ] Verify token received

## Wallet Provider Architecture

```
FarcasterProvider (wagmi config)
├── farcasterMiniApp connector (priority 1 - for Farcaster)
├── injected connector (MetaMask, etc)
└── coinbaseWallet connector

transactions.ts / client.ts
├── getWalletProvider() - tries wagmi first, fallback window.ethereum
└── getProvider() - for read-only calls
```

## Known Issues & Workarounds

1. **Polls FID Placeholder** - Polls masih pakai hardcoded FID=1, perlu fix
2. **Share Functionality** - Belum diimplementasi di quiz play page
3. **Legacy Quizzes** - Quiz lama tanpa contract integration tidak bisa claim onchain
