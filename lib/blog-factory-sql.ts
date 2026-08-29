// 블로그 공장 마이그레이션 SQL — supabase/migrations/014_blog_factory.sql 과 동일.
// 관리자 화면에서 복사해 Supabase SQL Editor 에 붙여넣을 수 있게 노출한다
// (portal-setup-sql.ts 와 같은 패턴).

export const BLOG_FACTORY_SQL = `-- 블로그 공장 (docs/BLOG_FACTORY_PLAN.md)
ALTER TABLE blog_profiles
  ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL;

ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft','ready','approved','publishing','published','failed'));

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS site_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS blog_posts_approved_idx
  ON blog_posts (created_at)
  WHERE status = 'approved';

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS source_post_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS contents_source_post_idx
  ON contents (source_post_id)
  WHERE source_post_id IS NOT NULL;`;
