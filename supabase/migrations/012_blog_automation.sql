-- 네이버 블로그 다계정 발행 자동화
-- 기준 축은 blog_profiles(관리자가 등록한 변호사)다.
-- contents 테이블은 SaaS 고객(lawyers, UUID) 쪽이라 여기서 쓰지 않는다.

-- ── 1. 변호사별 발행 설정 ──
ALTER TABLE blog_profiles
  ADD COLUMN IF NOT EXISTS naver_blog_id   TEXT,                      -- 네이버 블로그 아이디
  ADD COLUMN IF NOT EXISTS chrome_profile  TEXT,                      -- 크롬 프로필 디렉터리명 (예: Profile 3)
  ADD COLUMN IF NOT EXISTS naver_category  TEXT,                      -- 발행할 블로그 카테고리명
  ADD COLUMN IF NOT EXISTS monthly_quota   INT  DEFAULT 0,            -- 월 발행 횟수
  ADD COLUMN IF NOT EXISTS post_days       INT[] DEFAULT '{}',        -- 발행일 (1~31)
  ADD COLUMN IF NOT EXISTS fields          TEXT[] DEFAULT '{}',       -- 담당 분야
  ADD COLUMN IF NOT EXISTS auto_enabled    BOOLEAN DEFAULT FALSE;     -- 자동 발행 사용 여부

-- ── 2. 원고 ──
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   TEXT NOT NULL REFERENCES blog_profiles(id) ON DELETE CASCADE,

  title        TEXT NOT NULL,
  body         TEXT NOT NULL,              -- 마크다운 (==형광펜== __밑줄__ **굵게**)
  draft_body   TEXT,                       -- 윤문 전 초안
  field        TEXT,                       -- 분야
  topic        TEXT,                       -- 선택한 주제

  card_images  JSONB DEFAULT '[]'::jsonb,  -- [{ "type": "thumbnail", "url": "..." }]

  -- draft: 원고만 있음 / ready: 이미지까지 준비됨 / publishing: 발행기가 집어감
  -- published: 발행 완료 / failed: 실패
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','ready','publishing','published','failed')),

  naver_url    TEXT,                       -- 발행된 글 주소
  error        TEXT,                       -- 실패 사유
  published_at TIMESTAMPTZ,

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_profile_idx ON blog_posts (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_status_idx  ON blog_posts (status);

-- 이번 달 발행 수를 세기 위한 인덱스
CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts (profile_id, published_at DESC)
  WHERE status = 'published';

-- 관리자 전용 테이블이므로 RLS를 켜고 정책을 두지 않는다.
-- 서비스롤 키(createAdminClient)로만 접근한다.
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
