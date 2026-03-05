-- ============================================================
-- MACDEE Database Schema
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ============================================================

-- lawyers 테이블
CREATE TABLE lawyers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  specialty TEXT[] DEFAULT '{}',
  region TEXT,
  bio TEXT,
  profile_image_url TEXT,
  office_name TEXT,
  office_address TEXT,
  experience_years INTEGER,
  bar_number TEXT,
  schema_data JSONB DEFAULT '{}',
  brand_color TEXT DEFAULT '#3563AE',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- uploads 테이블
CREATE TABLE uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'audio', 'memo', 'url', 'faq')),
  title TEXT,
  file_url TEXT,
  file_name TEXT,
  raw_text TEXT,
  structured_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- contents 테이블
CREATE TABLE contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('blog', 'instagram', 'macdee', 'google')),
  title TEXT NOT NULL,
  slug TEXT,
  body TEXT NOT NULL,
  meta_description TEXT,
  tags TEXT[] DEFAULT '{}',
  card_news_data JSONB,
  schema_markup JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- publications 테이블
CREATE TABLE publications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  external_id TEXT,
  external_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'failed', 'deleted'))
);

-- analytics 테이블
CREATE TABLE analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  publication_id UUID REFERENCES publications(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  inquiries INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- subscriptions 테이블
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  toss_customer_key TEXT,
  toss_billing_key TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Own data policies
CREATE POLICY "lawyers_own" ON lawyers
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "uploads_own" ON uploads
  FOR ALL USING (lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid()));

CREATE POLICY "contents_own" ON contents
  FOR ALL USING (lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid()));

CREATE POLICY "publications_own" ON publications
  FOR ALL USING (lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid()));

CREATE POLICY "analytics_own" ON analytics
  FOR ALL USING (lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid()));

CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid()));

-- Public read policies
CREATE POLICY "lawyers_public_read" ON lawyers
  FOR SELECT USING (true);

CREATE POLICY "contents_public_read" ON contents
  FOR SELECT USING (status = 'published' AND channel = 'macdee');

-- ============================================================
-- Slug auto-generation trigger
-- ============================================================

CREATE OR REPLACE FUNCTION generate_lawyer_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REPLACE(NEW.name, ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lawyer_slug
  BEFORE INSERT ON lawyers
  FOR EACH ROW EXECUTE FUNCTION generate_lawyer_slug();

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lawyers_updated_at
  BEFORE UPDATE ON lawyers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_contents_updated_at
  BEFORE UPDATE ON contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
