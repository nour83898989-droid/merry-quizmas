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
