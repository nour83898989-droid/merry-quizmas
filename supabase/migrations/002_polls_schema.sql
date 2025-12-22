-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_fid BIGINT NOT NULL,
  creator_address TEXT,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  ends_at TIMESTAMPTZ,
  is_multiple_choice BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  require_token TEXT,
  require_token_amount TEXT,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  voter_fid BIGINT NOT NULL,
  voter_address TEXT,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, voter_fid, option_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_polls_creator ON polls(creator_fid);
CREATE INDEX IF NOT EXISTS idx_polls_ends_at ON polls(ends_at);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voter ON poll_votes(voter_fid);

-- RLS Policies
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read polls
CREATE POLICY "Anyone can read polls" ON polls FOR SELECT USING (true);

-- Anyone can create polls (authenticated via app)
CREATE POLICY "Anyone can create polls" ON polls FOR INSERT WITH CHECK (true);

-- Creator can update their polls
CREATE POLICY "Creator can update polls" ON polls FOR UPDATE USING (true);

-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON poll_votes FOR SELECT USING (true);

-- Anyone can vote
CREATE POLICY "Anyone can vote" ON poll_votes FOR INSERT WITH CHECK (true);

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE polls SET total_votes = total_votes + 1, updated_at = NOW() WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE polls SET total_votes = total_votes - 1, updated_at = NOW() WHERE id = OLD.poll_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote count
DROP TRIGGER IF EXISTS poll_vote_count_trigger ON poll_votes;
CREATE TRIGGER poll_vote_count_trigger
AFTER INSERT OR DELETE ON poll_votes
FOR EACH ROW EXECUTE FUNCTION update_poll_vote_count();
