-- ============================================================
-- Blog Profiles (블로그 이미지 생성용 변호사 프로필)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS blog_profiles (
  id TEXT PRIMARY KEY,
  lawyer_name TEXT NOT NULL DEFAULT '',
  office_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  website TEXT DEFAULT '',
  specialty JSONB DEFAULT '[]'::jsonb,
  profile_images JSONB DEFAULT '[]'::jsonb,
  office_images JSONB DEFAULT '[]'::jsonb,
  logo_image TEXT DEFAULT '',
  brand_color TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS disabled for admin-only access via service role key
ALTER TABLE blog_profiles ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can access
CREATE POLICY "blog_profiles_service_role" ON blog_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER set_blog_profiles_updated_at
  BEFORE UPDATE ON blog_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
