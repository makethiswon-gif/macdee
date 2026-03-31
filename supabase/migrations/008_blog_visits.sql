-- ============================================================
-- Blog Visits (블로그 방문자 추적)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id TEXT NOT NULL,
  post_id TEXT,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_blog_visits_lawyer_id ON blog_visits(lawyer_id);
CREATE INDEX idx_blog_visits_created_at ON blog_visits(created_at);
CREATE INDEX idx_blog_visits_session_id ON blog_visits(session_id);
CREATE INDEX idx_blog_visits_lawyer_created ON blog_visits(lawyer_id, created_at);

-- RLS disabled for tracking via service role key
ALTER TABLE blog_visits ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "blog_visits_service_role" ON blog_visits
  FOR ALL USING (true) WITH CHECK (true);
