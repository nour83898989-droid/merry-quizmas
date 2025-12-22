-- Admin Roles Migration
-- Migration: 004_admin_roles

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'moderator', -- 'super_admin', 'admin', 'moderator'
  created_by VARCHAR(42),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add moderation fields to quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS moderated_by VARCHAR(42);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add banned field to track banned users
CREATE TABLE banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  reason TEXT,
  banned_by VARCHAR(42) NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- NULL = permanent
);

-- Indexes
CREATE INDEX idx_admin_users_wallet ON admin_users(wallet_address);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_banned_users_wallet ON banned_users(wallet_address);
CREATE INDEX idx_quizzes_moderation ON quizzes(moderation_status);

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view admins" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Super admins can manage admins" ON admin_users FOR ALL USING (true);

CREATE POLICY "Anyone can view bans" ON banned_users FOR SELECT USING (true);
CREATE POLICY "Admins can manage bans" ON banned_users FOR ALL USING (true);

-- Insert default super admin (deployer wallet)
INSERT INTO admin_users (wallet_address, role) 
VALUES ('0x26331e0d4c7fc168462d56ec36629d22012f4d88', 'super_admin')
ON CONFLICT (wallet_address) DO NOTHING;

-- Trigger for admin_users updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
