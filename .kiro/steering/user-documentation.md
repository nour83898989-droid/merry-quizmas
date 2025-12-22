# 📚 Merry Quizmas - User Documentation

## Overview

**Merry Quizmas** adalah mini app Farcaster untuk membuat dan bermain kuis dengan hadiah token onchain. Aplikasi ini berjalan di Base network (Sepolia untuk testnet) dan terintegrasi penuh dengan smart contract untuk manajemen reward pool.

**URL**: https://merry-quizmas.vercel.app

---

## 🎯 Fitur Utama

### 1. Quiz (Kuis)
- Buat kuis dengan pertanyaan pilihan ganda
- Deposit reward token ke smart contract
- Sistem reward pool dengan multiple tier
- Entry fee dan stake requirement (opsional)
- Time-based ranking (lebih cepat = rank lebih tinggi)

### 2. Polls (Polling)
- Buat polling dengan multiple options
- Single atau multiple choice voting
- Anonymous voting option
- Time-limited polls

### 3. Rewards (Hadiah)
- Claim reward langsung ke wallet
- Real onchain transactions
- Support multiple token types

### 4. Profile
- Lihat statistik quiz
- Token balances
- Recent activity

---

## 🔐 Authentication Flow

### Di Farcaster Mini App
1. App otomatis mendeteksi context Farcaster
2. Quick Auth untuk mendapatkan token
3. Wallet terkoneksi otomatis dari Farcaster

### Di Browser (Desktop)
1. Harus punya akun Farcaster
2. Connect wallet yang terhubung dengan FID
3. Neynar API lookup untuk verifikasi FID

**PENTING**: Aplikasi ini membutuhkan akun Farcaster. User tanpa FID tidak bisa menggunakan fitur utama.

---

## 📱 User Flows

### A. Bermain Quiz

```
Home → Quizzes → Pilih Quiz → Quiz Detail → Start Quiz → Play → Result → Claim
```

**Langkah Detail:**

1. **Browse Quizzes** (`/quizzes`)
   - Lihat daftar quiz aktif
   - Filter berdasarkan reward, spots tersisa
   - Lihat info: jumlah pertanyaan, waktu, reward

2. **Quiz Detail** (`/quiz/[id]`)
   - Lihat rules dan reward tiers
   - Connect wallet jika belum
   - Jika ada entry fee/stake → approve token
   - Klik "Start Quiz"

3. **Join Quiz (Onchain)**
   - Jika quiz punya `contract_quiz_id`:
     - Check apakah sudah join di contract
     - Approve entry fee token (jika ada)
     - Approve stake token (jika ada)
     - Call `joinQuiz()` di contract
     - Tunggu tx confirmation

4. **Play Quiz** (`/quiz/[id]/play`)
   - Countdown 3 detik
   - Jawab pertanyaan satu per satu
   - Timer per pertanyaan
   - Submit jawaban → feedback → next
   - Hasil akhir: score, rank, reward

5. **Claim Reward** (`/claim`)
   - Lihat pending rewards
   - Klik "Claim" atau "Claim All"
   - Sign transaction di wallet
   - Token masuk ke wallet

### B. Membuat Quiz

```
Home → Create → Basic Info → Questions → Rewards → Settings → Preview → Publish
```

**Langkah Detail:**

1. **Basic Info** (Step 1)
   - Judul quiz (min 3 karakter)
   - Deskripsi (opsional)

2. **Questions** (Step 2)
   - Tambah pertanyaan
   - 4 pilihan jawaban per pertanyaan
   - Tandai jawaban benar
   - Minimal 1 pertanyaan

3. **Rewards** (Step 3)
   - Pilih reward token (dropdown)
   - Masukkan total reward amount
   - Entry fee (opsional)
   - Custom pool distribution (opsional)
   - Default: 70% untuk top 100, 30% untuk 101-1000

4. **Settings** (Step 4)
   - Time per question (10-120 detik)
   - Start/End time (opsional)
   - Stake requirement (opsional)

5. **Preview & Publish** (Step 5)
   - Review semua settings
   - Connect wallet
   - Publish → Onchain transaction:
     - Approve reward token
     - Call `createQuiz()` di contract
     - Deposit reward ke contract
   - Save ke database

### C. Voting di Poll

```
Home → Polls → Pilih Poll → Vote → See Results
```

1. **Browse Polls** (`/polls`)
   - Lihat polling aktif
   - Filter by status

2. **Poll Detail** (`/polls/[id]`)
   - Baca pertanyaan
   - Pilih option(s)
   - Submit vote
   - Lihat hasil (setelah vote)

### D. Membuat Poll

```
Home → Polls → Create → Fill Form → Publish
```

1. **Create Poll** (`/polls/create`)
   - Judul/pertanyaan
   - Options (min 2, max 10)
   - End time (opsional)
   - Multiple choice toggle
   - Anonymous voting toggle

---

## 💰 Onchain Transaction Flows

### Quiz Creation (Creator)
```
1. User fills quiz form
2. Frontend calls createQuizOnChain():
   a. Check reward token allowance
   b. If insufficient → approveToken() → wallet popup
   c. Wait for approval tx
   d. Call contract.createQuiz() → wallet popup
   e. Wait for tx confirmation
3. Save quiz to database with contract_quiz_id & deposit_tx_hash
```

### Quiz Join (Player)
```
1. User clicks "Start Quiz"
2. If quiz has entry_fee or stake:
   a. Check if already joined on contract
   b. If not joined:
      - Approve entry fee token (if needed)
      - Approve stake token (if needed)
      - Call contract.joinQuiz() → wallet popup
      - Wait for tx confirmation
3. Create attempt in database
4. Start quiz session
```

### Reward Claim (Winner)
```
1. User goes to /claim page
2. Click "Claim" on reward
3. Frontend calls claimRewardOnChain():
   a. Check claimable amount on contract
   b. Call contract.claimReward() → wallet popup
   c. Wait for tx confirmation
4. Update database status to 'claimed'
5. Refresh token balances
```

---

## 🗄️ Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `quizzes` | Quiz definitions, questions, rewards, contract info |
| `attempts` | User quiz attempts, answers, scores |
| `winners` | Quiz winners with ranks and rewards |
| `reward_claims` | Reward claim records with tx_hash |
| `polls` | Poll definitions with options |
| `poll_votes` | User votes on polls |
| `admin_users` | Admin/moderator accounts |
| `banned_users` | Banned user records |
| `notification_tokens` | Farcaster notification tokens |

### Key Fields

**quizzes:**
- `contract_quiz_id` - ID used in smart contract
- `deposit_tx_hash` - Transaction hash of reward deposit
- `reward_pools` - JSON array of tier configurations
- `entry_fee`, `entry_fee_token` - Entry fee settings
- `stake_token`, `stake_amount` - Stake requirements

**attempts:**
- `session_id` - Unique session identifier
- `answers_json` - User's answers
- `completion_time_ms` - Time to complete (for ranking)

**winners:**
- `rank` - Overall rank
- `pool_tier` - Which reward tier
- `rank_in_pool` - Rank within tier
- `claim_tx_hash` - Claim transaction hash

---

## 🔗 Smart Contract

**QuizRewardPool Contract**
- Network: Base Sepolia (testnet)
- Address: `0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731`

### Functions

| Function | Description |
|----------|-------------|
| `createQuiz()` | Create quiz, deposit reward tokens |
| `joinQuiz()` | Join quiz, pay entry fee/stake |
| `claimReward()` | Claim reward as winner |
| `returnStake()` | Return stake after quiz ends |
| `setWinner()` | Set winner (owner only) |
| `setWinnersBatch()` | Set multiple winners |

---

## 🪙 Supported Tokens

### Testnet (Base Sepolia)
| Token | Address |
|-------|---------|
| tSUP | `0x91d143D0c9CE96AF2172424A7B943E07a70BE080` |
| tBANGER | `0xb3C87A2a914CD4BeB8534e624be1216b9163862a` |
| tUSDC | `0x783EFc4DCBf2ADD464AD38839f26dE3c51882f04` |

### Mainnet (Base)
| Token | Address |
|-------|---------|
| SUP | `0xa69f80524381275a7ffdb3ae01c54150644c8792` |
| BANGER | `0x2800f7bbdd38e84f38ef0a556705a62b5104e91b` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

---

## 👮 Admin Features

Akses: `/admin` (hanya untuk admin/moderator)

### Roles
- **super_admin**: Full access, manage other admins
- **admin**: Moderate quizzes, ban users
- **moderator**: Approve/reject quizzes

### Features
- Dashboard statistics
- Quiz moderation (approve/reject)
- User management (ban/unban)
- Admin management (add/remove)

---

## ⚙️ Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Farcaster
NEYNAR_API_KEY=

# Network
NEXT_PUBLIC_USE_TESTNET=true

# Contract
NEXT_PUBLIC_QUIZ_CONTRACT_ADDRESS=0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731
```

---

## 🚨 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Wallet not connected" | No wallet detected | Connect wallet via navbar |
| "Wrong network" | Not on Base/Base Sepolia | Click "Switch Network" |
| "Transaction rejected" | User cancelled tx | Try again, approve in wallet |
| "Already attempted" | User already played quiz | Cannot replay same quiz |
| "No spots available" | Winner limit reached | Quiz is full |
| "Quiz not active" | Quiz ended or paused | Find another quiz |

---

## 📝 Notes for Developers

1. **Testnet Mode**: Set `NEXT_PUBLIC_USE_TESTNET=true` untuk testing
2. **Mock Data**: Semua mock data sudah dihapus, semua transaksi real onchain
3. **FID Required**: User harus punya Farcaster account
4. **Gas Fees**: User perlu ETH di Base untuk gas fees
5. **Token Approval**: Setiap token perlu di-approve sebelum transfer

---

## 🔄 Version History

- **v1.0**: Initial release dengan quiz dan polls
- **v1.1**: Integrasi smart contract QuizRewardPool
- **v1.2**: Multi-tier reward pools
- **v1.3**: Farcaster mini app support dengan Quick Auth


---

## 📊 Flow Diagrams

### Quiz Lifecycle

```
┌──────────────────────────────────────────