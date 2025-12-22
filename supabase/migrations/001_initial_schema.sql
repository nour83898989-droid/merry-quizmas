-- Quiz App Database Schema
-- Migration: 001_initial_schema

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet VARCHAR(42) NOT NULL,
  creator_fid INTEGER,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  questions_json JSONB NOT NULL,
  reward_token VARCHAR(42) NOT NULL,
  reward_amount NUMERIC(78, 0) NOT NULL,
  winner_limit INTEGER NOT NULL DEFAULT 100,
  time_per_question INTEGER NOT NULL DEFAULT 15,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  stake_token VARCHAR(42),
  stake_amount NUMERIC(78, 0),
  nft_enabled BOOLEAN DEFAULT false,
  nft_artwork_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  current_winners INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attempts table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  user_fid INTEGER,
  session_id VARCHAR(64) NOT NULL UNIQUE,
  answers_json JSONB,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  completion_time_ms INTEGER,
  score INTEGER DEFAULT 0,
  total_questions INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT false,
  reward_claimed BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, wallet_address)
);

-- Winners table (leaderboard)
CREATE TABLE winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  user_fid INTEGER,
  username VARCHAR(50),
  rank INTEGER NOT NULL,
  completion_time_ms INTEGER NOT NULL,
  reward_amount NUMERIC(78, 0) NOT NULL,
  nft_token_id VARCHAR(78),
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification tokens table
CREATE TABLE notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fid INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL,
  notification_url TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_fid, platform)
);

-- Indexes for performance
CREATE INDEX idx_quizzes_status ON quizzes(status);
CREATE INDEX idx_quizzes_creator ON quizzes(creator_wallet);
CREATE INDEX idx_attempts_quiz ON attempts(quiz_id);
CREATE INDEX idx_attempts_wallet ON attempts(wallet_address);
CREATE INDEX idx_attempts_session ON attempts(session_id);
CREATE INDEX idx_winners_quiz ON winners(quiz_id);
CREATE INDEX idx_winners_rank ON winners(quiz_id, rank);

-- Row Level Security Policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Quizzes: Anyone can read active quizzes, creators can manage their own
CREATE POLICY "Anyone can view active quizzes" ON quizzes
  FOR SELECT USING (status = 'active' OR status = 'completed');

CREATE POLICY "Creators can insert quizzes" ON quizzes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update own quizzes" ON quizzes
  FOR UPDATE USING (true);

-- Attempts: Users can view their own attempts, system can insert/update
CREATE POLICY "Users can view own attempts" ON attempts
  FOR SELECT USING (true);

CREATE POLICY "System can insert attempts" ON attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update attempts" ON attempts
  FOR UPDATE USING (true);

-- Winners: Anyone can view leaderboard
CREATE POLICY "Anyone can view winners" ON winners
  FOR SELECT USING (true);

CREATE POLICY "System can insert winners" ON winners
  FOR INSERT WITH CHECK (true);

-- Notification tokens: Users can manage their own tokens
CREATE POLICY "Users can view own tokens" ON notification_tokens
  FOR SELECT USING (true);

CREATE POLICY "Users can insert tokens" ON notification_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tokens" ON notification_tokens
  FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for quizzes updated_at
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for notification_tokens updated_at
CREATE TRIGGER update_notification_tokens_updated_at
  BEFORE UPDATE ON notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
