-- ============================================================
-- Lawyer Websites (홈페이지 빌더) 테이블
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS lawyer_websites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
  html_content TEXT DEFAULT '',
  css_content TEXT DEFAULT '',
  chat_history JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT false,
  template TEXT DEFAULT 'blank',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_lawyer_website UNIQUE (lawyer_id)
);

ALTER TABLE lawyer_websites ENABLE ROW LEVEL SECURITY;

-- Public read for published websites
CREATE POLICY "lawyer_websites_public_read" ON lawyer_websites
  FOR SELECT USING (is_published = true);

-- Owner can manage their own website
CREATE POLICY "lawyer_websites_owner_all" ON lawyer_websites
  FOR ALL USING (
    lawyer_id IN (
      SELECT id FROM lawyers WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lawyer_websites_lawyer ON lawyer_websites(lawyer_id);

-- updated_at trigger
CREATE TRIGGER set_lawyer_websites_updated_at
  BEFORE UPDATE ON lawyer_websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
