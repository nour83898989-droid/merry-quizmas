-- Add reward pools columns to quizzes table
-- Migration: 003_reward_pools

-- Add new columns for reward pool system
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS use_custom_pools BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS reward_pools JSONB DEFAULT '[{"tier": 1, "name": "Speed Champions", "winnerCount": 100, "percentage": 70}, {"tier": 2, "name": "Fast Finishers", "winnerCount": 900, "percentage": 30}]'::jsonb;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(78, 0);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS entry_fee_token VARCHAR(42);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS total_pool_amount NUMERIC(78, 0);

-- Create reward_claims table for tracking individual reward claims
CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  user_fid INTEGER,
  pool_tier INTEGER NOT NULL,
  rank_in_pool INTEGER NOT NULL,
  reward_amount NUMERIC(78, 0) NOT NULL,
  tx_hash VARCHAR(66),
  claimed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, wallet_address)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reward_claims_quiz ON reward_claims(quiz_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_wallet ON reward_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON reward_claims(status);

-- Enable RLS
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;

-- Policies for reward_claims
CREATE POLICY "Anyone can view reward claims" ON reward_claims
  FOR SELECT USING (true);

CREATE POLICY "System can insert reward claims" ON reward_claims
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update reward claims" ON reward_claims
  FOR UPDATE USING (true);
