-- ============================================================
-- MACDEE Magazine (매거진 블로그) 테이블
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS magazines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT DEFAULT '법률정보',
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  seo_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author TEXT DEFAULT 'MACDEE 에디터',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Public read for published articles
ALTER TABLE magazines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "magazines_public_read" ON magazines
  FOR SELECT USING (status = 'published');

CREATE INDEX idx_magazines_slug ON magazines(slug);
CREATE INDEX idx_magazines_status ON magazines(status);
CREATE INDEX idx_magazines_published ON magazines(published_at DESC);

-- updated_at trigger
CREATE TRIGGER set_magazines_updated_at
  BEFORE UPDATE ON magazines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
