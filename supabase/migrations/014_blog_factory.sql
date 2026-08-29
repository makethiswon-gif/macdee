-- 블로그 공장 (docs/BLOG_FACTORY_PLAN.md)
-- 1) 검수 승인 상태(approved) 추가 — 승인된 원고만 발행기가 집어간다
-- 2) blog_profiles ↔ lawyers 매핑 — 발행된 글을 맥디 변호사 블로그(contents)에 자동 반영
-- 3) 멱등 동기화 — contents.source_post_id 로 같은 원고가 두 번 실리지 않게

-- ── 1. 프로필 ↔ SaaS 변호사 매핑 ──
ALTER TABLE blog_profiles
  ADD COLUMN IF NOT EXISTS lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL;

-- ── 2. 원고 상태에 approved 추가 + 동기화 시각 ──
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft','ready','approved','publishing','published','failed'));

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS site_synced_at TIMESTAMPTZ;

-- 발행기 watch 모드가 집어갈 큐
CREATE INDEX IF NOT EXISTS blog_posts_approved_idx
  ON blog_posts (created_at)
  WHERE status = 'approved';

-- ── 3. 맥디 블로그(contents) 멱등 동기화 ──
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS source_post_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS contents_source_post_idx
  ON contents (source_post_id)
  WHERE source_post_id IS NOT NULL;
