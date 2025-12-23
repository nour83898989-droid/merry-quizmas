# Requirements Document - Base Mainnet Migration

## Introduction

This document outlines the complete requirements for migrating the Merry Quizmas application from Base Sepolia testnet to Base Mainnet for production use. The migration involves deploying smart contracts, updating configuration, and ensuring all blockchain interactions work correctly on mainnet.

## Glossary

- **Base Mainnet**: The production Ethereum L2 network (Chain ID: 8453)
- **Base Sepolia**: The test network for Base (Chain ID: 84532)
- **QuizRewardPool**: Smart contract that manages quiz rewards, entry fees, and stakes
- **Deployer Wallet**: The wallet used to deploy and manage smart contracts (owner of QuizRewardPool)
- **SUP/BANGER/USDC**: ERC-20 tokens supported as reward tokens on Base
- **Wagmi**: React hooks library for Ethereum wallet interactions
- **Farcaster MiniApp**: The embedded app context within Warpcast

---

## Requirements

### Requirement 1: Smart Contract Deployment

**User Story:** As a platform operator, I want to deploy the QuizRewardPool contract to Base Mainnet, so that users can create and participate in quizzes with real tokens.

#### Acceptance Criteria

1. WHEN the deployer runs the deployment script with `--rpc-url https://mainnet.base.org` THEN the QuizRewardPool contract SHALL be deployed to Base Mainnet (Chain ID 8453)
2. WHEN the contract is deployed THEN the system SHALL record the mainnet contract address
3. WHEN the contract is deployed THEN the deployer wallet (`0x26331e0d4c7fc168462d56ec36629d22012f4d88`) SHALL be set as the contract owner
4. IF the deployment fails due to insufficient gas THEN the system SHALL display a clear error message with required ETH amount

### Requirement 2: Environment Configuration Update

**User Story:** As a developer, I want to configure the application for mainnet, so that all blockchain interactions use the correct network and addresses.

#### Acceptance Criteria

1. WHEN `NEXT_PUBLIC_USE_TESTNET` is set to `false` THEN the application SHALL use Base Mainnet (Chain ID 8453)
2. WHEN in mainnet mode THEN the application SHALL use mainnet token addresses (SUP, BANGER, USDC)
3. WHEN in mainnet mode THEN the application SHALL use the mainnet QuizRewardPool contract address
4. WHEN switching between networks THEN the application SHALL automatically update all token displays and addresses

### Requirement 3: Dual Contract Address Support

**User Story:** As a developer, I want separate contract addresses for testnet and mainnet, so that the application can switch between networks without manual code changes.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL select the correct contract address based on `NEXT_PUBLIC_USE_TESTNET` value
2. WHEN in testnet mode THEN the system SHALL use `NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS_TESTNET`
3. WHEN in mainnet mode THEN the system SHALL use `NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS_MAINNET`
4. IF the contract address is missing for the active network THEN the system SHALL display an error and disable blockchain features

### Requirement 4: Vercel Production Environment

**User Story:** As a platform operator, I want to update Vercel environment variables, so that the production deployment uses mainnet configuration.

#### Acceptance Criteria

1. WHEN deploying to production THEN Vercel SHALL have `NEXT_PUBLIC_USE_TESTNET=false`
2. WHEN deploying to production THEN Vercel SHALL have the mainnet contract address configured
3. WHEN environment variables are updated THEN Vercel SHALL trigger a new deployment automatically

### Requirement 5: Token Display for Mainnet

**User Story:** As a user, I want to see real token symbols (SUP, BANGER, USDC) instead of test tokens, so that I know I'm using real assets.

#### Acceptance Criteria

1. WHEN in mainnet mode THEN the token selector SHALL display "SUP" instead of "tSUP"
2. WHEN in mainnet mode THEN the token selector SHALL display "BANGER" instead of "tBANGER"
3. WHEN in mainnet mode THEN the token selector SHALL display "USDC" instead of "tUSDC"
4. WHEN in mainnet mode THEN the testnet banner on homepage and navbar SHALL NOT be displayed

### Requirement 6: Network Validation and Auto-Switch

**User Story:** As a user, I want the application to prompt me to switch to Base Mainnet, so that my transactions go to the correct network.

#### Acceptance Criteria

1. WHEN a user connects with a wallet on wrong network THEN the system SHALL prompt to switch to Base Mainnet
2. WHEN the user approves network switch THEN the wallet SHALL switch to Base Mainnet (Chain ID 8453)
3. IF the user rejects network switch THEN the system SHALL display a warning and disable transaction features
4. WHEN in Farcaster MiniApp THEN the wagmi config SHALL use Base Mainnet as active chain

### Requirement 7: Contract Owner Operations

**User Story:** As a platform admin, I want to perform owner-only operations on mainnet, so that I can manage quiz rewards and winners.

#### Acceptance Criteria

1. WHEN calling `setWinner()` or `setWinnersBatch()` THEN only the contract owner SHALL be able to execute
2. WHEN the deployer wallet calls owner functions THEN the transaction SHALL succeed on mainnet
3. IF a non-owner wallet calls owner functions THEN the transaction SHALL revert with "Not authorized"

---

## Complete Pre-Migration Checklist

### ✅ Accounts & API Keys (Already Available)

| Service | Status | Details |
|---------|--------|---------|
| Supabase | ✅ Ready | Project ID: `myhfmbqmxzuleobjicwc` |
| Neynar API | ✅ Ready | API Key configured for Farcaster user lookup |
| Vercel | ✅ Ready | Hosting at `merry-quizmas.vercel.app` |
| GitHub | ✅ Ready | Repo: `nour83898989-droid/merry-quizmas` |
| Deployer Wallet | ✅ Ready | Address: `0x26331e0d4c7fc168462d56ec36629d22012f4d88` |
| Foundry/Forge | ✅ Ready | v1.5.0-nightly installed |

### ❌ Crypto Requirements (Need to Acquire)

| Item | Amount | Purpose | How to Get |
|------|--------|---------|------------|
| ETH on Base Mainnet | ~0.01 ETH | Contract deployment + gas | Bridge from Ethereum via bridge.base.org |
| ETH on Base Mainnet | ~0.001 ETH per tx | Admin operations (setWinner) | Same as above |
| SUP tokens | Variable | Quiz rewards | Buy on DEX (Uniswap/Aerodrome) |
| BANGER tokens | Variable | Quiz rewards | Buy on DEX |
| USDC tokens | Variable | Quiz rewards | Bridge from Ethereum or buy |

### Token Addresses (Base Mainnet - Already Configured)

| Token | Address | Decimals |
|-------|---------|----------|
| SUP | `0xa69f80524381275a7ffdb3ae01c54150644c8792` | 18 |
| BANGER | `0x2800f7bbdd38e84f38ef0a556705a62b5104e91b` | 18 |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| ETH | Native | 18 |

### Current Testnet Configuration (For Reference)

| Item | Value |
|------|-------|
| QuizRewardPool (Sepolia) | `0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731` |
| tSUP (Sepolia) | `0x91d143D0c9CE96AF2172424A7B943E07a70BE080` |
| tBANGER (Sepolia) | `0xb3C87A2a914CD4BeB8534e624be1216b9163862a` |
| tUSDC (Sepolia) | `0x783EFc4DCBf2ADD464AD38839f26dE3c51882f04` |

---

## Files That Need Code Changes

### 1. `src/lib/web3/config.ts`
- Add logic to select contract address based on network
- Currently uses single `QUIZ_REWARD_POOL_ADDRESS`
- Need to support `QUIZ_REWARD_POOL_ADDRESS_MAINNET` and `QUIZ_REWARD_POOL_ADDRESS_TESTNET`

### 2. `.env.local` and `.env.example`
- Add new env variables for dual contract addresses
- Update documentation

### 3. Vercel Environment Variables
- Set `NEXT_PUBLIC_USE_TESTNET=false`
- Add mainnet contract address

---

## Environment Variables - Complete List

### Current Variables (No Change Needed)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://myhfmbqmxzuleobjicwc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>

# Neynar
NEXT_PUBLIC_NEYNAR_API_KEY=<key>

# Token Addresses (Mainnet) - Already configured
NEXT_PUBLIC_BANGER_TOKEN_ADDRESS=0x2800f7bbdd38e84f38ef0a556705a62b5104e91b
NEXT_PUBLIC_SUP_TOKEN_ADDRESS=0xa69f80524381275a7ffdb3ae01c54150644c8792

# Deployer
DEPLOYER_ADDRESS=0x26331e0d4c7fc168462d56ec36629d22012f4d88
DEPLOYER_PRIVATE_KEY=<key>
```

### Variables to Change
```bash
# CHANGE: from true to false
NEXT_PUBLIC_USE_TESTNET=false
```

### Variables to Add
```bash
# ADD: Mainnet contract address (after deployment)
NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS_MAINNET=<deployed_address>

# RENAME: Current testnet address
NEXT_PUBLIC_QUIZ_REWARD_POOL_ADDRESS_TESTNET=0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731
```

---

## Deployment Steps (Detailed)

### Step 1: Prepare ETH on Base Mainnet
1. Go to https://bridge.base.org
2. Connect deployer wallet (`0x26331e0d4c7fc168462d56ec36629d22012f4d88`)
3. Bridge ~0.02 ETH from Ethereum mainnet to Base mainnet
4. Wait for bridge confirmation (~10-20 minutes)
5. Verify balance on https://basescan.org

### Step 2: Deploy Contract to Mainnet
```powershell
# Add foundry to PATH
$env:Path = "$env:USERPROFILE\.foundry\bin;$env:Path"

# Navigate to contracts
cd quiz-app/contracts

# Deploy to Base Mainnet
forge script script/DeployQuizRewardPool.s.sol:DeployQuizRewardPool --rpc-url https://mainnet.base.org --broadcast -vvv
```

### Step 3: Record Contract Address
- Copy the deployed contract address from console output
- Verify on https://basescan.org/address/<address>

### Step 4: Update Code (config.ts)
- Modify `src/lib/web3/config.ts` to support dual addresses
- Add logic: `IS_TESTNET ? TESTNET_ADDRESS : MAINNET_ADDRESS`

### Step 5: Update Environment Variables
- Local: Update `.env.local`
- Production: Update Vercel dashboard

### Step 6: Test on Mainnet
1. Create a quiz with small amount (e.g., 1 SUP)
2. Join the quiz
3. Complete quiz and verify winner setting
4. Claim reward and verify token transfer

---

## Risk Considerations

1. **Real Money**: Mainnet uses real tokens with real value
2. **Gas Costs**: All transactions cost real ETH
3. **Contract Immutability**: Deployed contract cannot be modified
4. **Owner Key Security**: Deployer private key must be kept secure
5. **Token Approvals**: Users approve real token spending

## Rollback Plan

If issues occur on mainnet:
1. Set `NEXT_PUBLIC_USE_TESTNET=true` in Vercel to revert to testnet
2. Investigate issues on testnet
3. Deploy new contract if needed
4. Update mainnet address and switch back
