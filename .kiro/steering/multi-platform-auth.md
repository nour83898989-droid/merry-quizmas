# Multi-Platform Authentication Strategy

## Overview
Dokumen ini menjelaskan strategi autentikasi untuk 4 platform yang didukung:
1. Farcaster Mini App (Mobile) - Warpcast di HP
2. Farcaster Mini App (Desktop) - Warpcast di browser desktop
3. Base Mini App - Coinbase Wallet app
4. Browser - Standalone web browser

## Current Status (Dec 2024) - UPDATED ✅

### Completed Fixes:
- ✅ Fixed SDK init order: `isInMiniApp` → `context` → `quickAuth` → `ready()`
- ✅ Fixed auto-connect timing: waits for `isReady` before attempting
- ✅ Implemented Quick Auth token management in FarcasterProvider
- ✅ Unified wallet management: navbar uses wagmi hooks, not direct ethereum calls
- ✅ Created `useFarcasterAuth` hook for authenticated API calls
- ✅ Centralized SDK access: all hooks use FarcasterProvider context

### Architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    FarcasterProvider                            │
│  - SDK initialization (correct order)                           │
│  - Quick Auth token management                                  │
│  - User context from SDK                                        │
│  - Auto-connect wallet                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Context Consumers                            │
│  - useFarcaster() - main context hook                           │
│  - useFarcasterUser() - user data with Neynar enrichment        │
│  - useFarcasterAuth() - auth token & authenticated fetch        │
│  - useIsInFarcaster() - simple boolean check                    │
└─────────────────────────────────────────────────────────────────┘
```

## SDK Initialization Order (CORRECT)

```typescript
// In FarcasterInitializer:
async function init() {
  const { sdk } = await import('@farcaster/miniapp-sdk');
  
  // STEP 1: Check if in mini app FIRST
  const isInMiniApp = await sdk.isInMiniApp();
  
  if (isInMiniApp) {
    // STEP 2: Get user context
    const ctx = await sdk.context;
    
    // STEP 3: Get Quick Auth token (experimental API)
    const authResult = await sdk.experimental.quickAuth();
    
    // STEP 4: Call ready() LAST - hides splash screen
    await sdk.actions.ready();
  }
}
```

## Authentication Flow

### Farcaster Mini App (Mobile/Desktop)
```
App Load → SDK.isInMiniApp() = true
    │
    ▼
Get Context (user.fid, username, pfpUrl)
    │
    ▼
Get Quick Auth Token (sdk.experimental.quickAuth())
    │
    ▼
Call sdk.actions.ready() - hide splash
    │
    ▼
Auto-connect wallet (connectors[0] = farcasterMiniApp)
    │
    ▼
User authenticated with FID + wallet
```

### Browser (Standalone)
```
App Load → SDK.isInMiniApp() = false
    │
    ▼
User clicks "Connect" button
    │
    ▼
Wagmi connect (injected/coinbaseWallet)
    │
    ▼
Lookup FID from Neynar by wallet address
    │
    ├── FID found → User has Farcaster account
    │
    └── No FID → Wallet-only access (limited features)
```

## Files Modified

### Core Provider
- `src/components/providers/farcaster-provider.tsx`
  - Fixed SDK init order
  - Added Quick Auth token management
  - Fixed auto-connect timing (waits for isReady)
  - Exports: `useFarcaster()`, `farcasterMiniApp`

### Hooks
- `src/hooks/useFarcasterAuth.ts` (NEW)
  - `authFetch()` - fetch with Bearer token
  - `getAuthHeaders()` - get auth headers for other libs
  
- `src/hooks/useFarcasterUser.ts` (UPDATED)
  - Uses context from FarcasterProvider (no duplicate SDK calls)
  - Falls back to Neynar lookup for browser users
  
- `src/hooks/useIsInFarcaster.ts` (UPDATED)
  - Uses context from FarcasterProvider

### UI Components
- `src/components/layout/navbar.tsx` (UPDATED)
  - Uses wagmi hooks (`useAccount`, `useDisconnect`)
  - Uses `useFarcaster()` for PFP/username
  - No more direct `window.ethereum` calls
  
- `src/components/wallet/connect-button.tsx` (UPDATED)
  - Simplified logic using `useFarcaster()` context
  - Platform-aware connector selection

### Backend (unchanged)
- `src/lib/auth/middleware.ts`
  - Already supports Quick Auth JWT verification
  - `verifyQuickAuthToken()` - verifies JWT, extracts FID
  - `withAuth()` - middleware wrapper for protected routes

## API Authentication

### Frontend Usage
```typescript
import { useFarcasterAuth } from '@/hooks/useFarcasterAuth';

function MyComponent() {
  const { authFetch, isAuthenticated } = useFarcasterAuth();
  
  const saveData = async () => {
    const res = await authFetch('/api/quiz/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}
```

### Backend Verification
```typescript
import { withAuth } from '@/lib/auth/middleware';

// Protected route
export const POST = withAuth(async (request, auth) => {
  // auth.fid - user's Farcaster ID
  // auth.address - wallet address (if available)
  console.log('User FID:', auth.fid);
});
```

## Wagmi Config

```typescript
const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(),  // MUST be first - used for auto-connect in mini app
    injected(),          // MetaMask, etc.
    coinbaseWallet({ appName: 'Merry Quizmas' }),
  ],
});
```

## Connect Logic

```typescript
// In mini app: use connectors[0] (farcasterMiniApp)
if (isInMiniApp) {
  connect({ connector: connectors[0] });
}

// In browser: use injected or coinbaseWallet
else {
  const connector = injectedConnector || coinbaseConnector;
  connect({ connector });
}
```

## Testing Checklist

- [ ] Test in Warpcast mobile app
- [ ] Test in Warpcast web (desktop)
- [ ] Test in browser with MetaMask
- [ ] Test in browser with Coinbase Wallet
- [ ] Verify Quick Auth token is obtained in mini app
- [ ] Verify Neynar lookup works for browser users
- [ ] Verify API calls include auth headers

---

## Wallet Connection Architecture (End-to-End)

### Files yang Membutuhkan Wallet Connection

#### 1. Core Provider & Hooks
| File | Fungsi | Wallet Hooks |
|------|--------|--------------|
| `src/components/providers/farcaster-provider.tsx` | Central provider, wagmi config | `useConnect`, `useAccount` |
| `src/components/wallet/connect-button.tsx` | Connect/disconnect button | `useAccount`, `useConnect`, `useDisconnect` |
| `src/components/layout/navbar.tsx` | Header navigation | `useAccount`, `useDisconnect` |
| `src/hooks/useFarcasterUser.ts` | User data enrichment | `useAccount` |

#### 2. Pages yang Membutuhkan Wallet
| Page | Path | Wallet Usage | Fallback |
|------|------|--------------|----------|
| Quiz Detail | `/quiz/[id]/page.tsx` | Join quiz, pay entry fee | Show "Connect Wallet" warning |
| Create Quiz | `/create/page.tsx` | Deposit rewards, publish | Block publish button |
| Claim Rewards | `/claim/page.tsx` | Claim onchain rewards | Show "Connect Wallet" card |
| Profile | `/profile/page.tsx` | View stats, balances | Show "Connect Wallet" card |

### Wallet State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FarcasterProvider                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ WagmiProvider (config)                                   │   │
│  │  - chains: [base, baseSepolia]                          │   │
│  │  - connectors: [farcasterMiniApp, injected, coinbase]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AutoConnectWallet                                        │   │
│  │  - Waits for isReady                                    │   │
│  │  - Auto-connects in mini app                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Navbar (Header)                              │
│  - Shows ConnectButton when not connected                       │
│  - Shows user PFP/username when connected                       │
│  - Dropdown menu: Profile, Rewards, Admin, Disconnect           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Page Components                              │
│  - Quiz Detail: handleWalletConnect callback                    │
│  - Create: window.ethereum.request for address                  │
│  - Claim: window.ethereum.request for address                   │
│  - Profile: window.ethereum.request for address                 │
└─────────────────────────────────────────────────────────────────┘
```

### Wallet Address Sources

Ada 2 cara mendapatkan wallet address di app ini:

#### 1. Via Wagmi Hooks (Recommended)
```typescript
import { useAccount } from 'wagmi';

function Component() {
  const { address, isConnected } = useAccount();
  // address sudah tersedia dari wagmi state
}
```

**Digunakan di:**
- `farcaster-provider.tsx` - AutoConnectWallet
- `connect-button.tsx` - ConnectButton
- `navbar.tsx` - Navbar
- `useFarcasterUser.ts` - useFarcasterUser hook

#### 2. Via window.ethereum (Legacy)
```typescript
useEffect(() => {
  if (window.ethereum) {
    window.ethereum.request({ method: 'eth_accounts' })
      .then((accounts) => setAddress(accounts[0]));
  }
}, []);
```

**Digunakan di:**
- `quiz/[id]/page.tsx` - Quiz Detail (via ConnectButton callback)
- `create/page.tsx` - Create Quiz
- `claim/page.tsx` - Claim Page
- `profile/page.tsx` - Profile Page

### Network Checking

Semua pages yang interact dengan blockchain perlu check network:

```typescript
import { getCurrentNetwork, switchToBase } from '@/lib/web3/client';
import { IS_TESTNET, ACTIVE_CHAIN_ID } from '@/lib/web3/config';

// Check network
const network = await getCurrentNetwork();
if (!network.isCorrect) {
  await switchToBase(); // Switch to Base or Base Sepolia
}
```

**Files dengan network check:**
- `connect-button.tsx` - Shows network indicator
- `navbar.tsx` - Shows "Wrong Network" button
- `claim/page.tsx` - Blocks claim if wrong network
- `quiz/[id]/page.tsx` - Implicit via transactions

### Onchain Transaction Flow

#### Quiz Detail Page (`/quiz/[id]`)
```
User clicks "Start Quiz"
    │
    ├── No wallet? → Show "Connect Wallet First" button
    │
    └── Has wallet?
        │
        ├── Quiz has entry fee/stake?
        │   │
        │   ├── Check hasJoinedQuiz() on contract
        │   │
        │   └── Not joined? → joinQuizOnChain()
        │       │
        │       ├── Approve entry fee token
        │       ├── Approve stake token
        │       └── Call contract.joinQuiz()
        │
        └── Start quiz session via API
```

#### Create Quiz Page (`/create`)
```
User clicks "Publish Quiz"
    │
    ├── No wallet? → Alert "Connect wallet first"
    │
    └── Has wallet?
        │
        ├── createQuizOnChain()
        │   │
        │   ├── Approve reward token
        │   └── Call contract.createQuiz()
        │
        └── Save to database with contractQuizId
```

#### Claim Page (`/claim`)
```
User clicks "Claim Reward"
    │
    ├── No wallet? → Show "Connect Wallet" card
    │
    └── Has wallet?
        │
        ├── Check network → Switch if wrong
        │
        ├── Check getClaimableReward() on contract
        │
        └── claimRewardOnChain()
            │
            └── Call contract.claimReward()
```

### ConnectButton Props

```typescript
interface ConnectButtonProps {
  onConnect?: (address: string, farcasterUser?: { fid: number; username?: string } | null) => void;
  showDisconnect?: boolean;  // Show disconnect button
  size?: 'sm' | 'md' | 'lg';
}
```

**Usage patterns:**

```typescript
// In Navbar - no callback, uses internal state
<ConnectButton />

// In Quiz Detail - with callback to get address
<ConnectButton onConnect={handleWalletConnect} />

// With disconnect button
<ConnectButton showDisconnect={true} />
```

### Known Issues & Solutions

#### Issue 1: Duplicate wallet state
**Problem:** Pages use both wagmi hooks AND window.ethereum
**Solution:** Migrate all pages to use wagmi hooks consistently

#### Issue 2: Network mismatch
**Problem:** User on wrong network can't transact
**Solution:** All transaction pages check network first

#### Issue 3: Auto-connect race condition
**Problem:** Auto-connect before SDK ready
**Solution:** AutoConnectWallet waits for `isReady` flag

### Migration Plan (TODO)

1. **Phase 1:** Standardize wallet access
   - [ ] Migrate `create/page.tsx` to use wagmi hooks
   - [ ] Migrate `claim/page.tsx` to use wagmi hooks
   - [ ] Migrate `profile/page.tsx` to use wagmi hooks
   - [ ] Migrate `quiz/[id]/page.tsx` to use wagmi hooks

2. **Phase 2:** Remove window.ethereum direct calls
   - [ ] Remove `window.ethereum.request` from pages
   - [ ] Use `useAccount()` hook everywhere
   - [ ] Use `useSwitchChain()` for network switching

3. **Phase 3:** Unified error handling
   - [ ] Create `useWalletRequired()` hook
   - [ ] Standardize "Connect Wallet" UI across pages
