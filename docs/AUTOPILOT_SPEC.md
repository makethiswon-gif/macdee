# 맥디 자율주행 마케팅 — 기술 설계서 (Autopilot Spec)

> 목표: "변호사가 구독하고 클릭 몇 번이면 마케팅이 자동으로 돌아가는 플랫폼".
> 현재 맥디는 *변호사가 직접 조작하는 AI 콘텐츠 생성기*다. 이 문서는 그것을 *스스로 굴러가는 AI 마케팅 직원*으로 바꾸는 설계다.
> 작성 기준: 실제 코드베이스(`scratch/macdee`)를 읽고 작성. 모든 테이블/함수/파일 경로는 실재한다.

---

## 0. TL;DR (한 장 요약)

- **자율 루프**: `주제 자동발굴 → 콘텐츠 생성 → 광고규정 자동점검(게이트) → 발행 → 성과측정 → 피드백`.
- **핵심 통찰**: 부품(`/profile`·`/consulting`·`/tone`·생성 파이프라인·`review→approved→published` 상태흐름)은 *이미 다 있다*. 빠진 건 **① 한 번의 온보딩, ② 사람 손 없이 주기적으로 돌리는 잡 큐(scheduler), ③ 감독 화면 1개, ④ 광고규정 자동 게이트** 뿐이다.
- **스케줄러**: Vercel Cron 1개(`*/15`) + DB 잡 큐(`FOR UPDATE SKIP LOCKED`). 변호사별 cadence/시각은 전부 데이터로 표현.
- **냉정한 현실**: **네이버 블로그 완전 자동발행은 불가**(공식 API 없음, 봇 자동화는 ToS 위반·계정 정지 위험). → 자체블로그·인스타·구글색인은 진짜 자동, **네이버는 "원클릭 반자동"**. 하이브리드가 유일한 안전한 길.
- **안전장치**: 광고규정 위반 책임은 변호사에게 귀속. 기본값은 `검토 후 발행`, `전체 자동`은 명시적 옵트인 + 컴플라이언스 게이트 통과 필수.

---

## 1. 현재 아키텍처 (그라운드 트루스)

### 1.1 스택
- Next.js 16 App Router / TypeScript / Tailwind
- Supabase (PostgreSQL, RLS) — `lib/supabase/server.ts`에 `createClient()`(세션), **`createServiceClient()`(서비스롤, 세션 불필요 → 크론 워커용)** 존재
- 멀티 LLM: `lib/ai/providers.ts` (OpenAI + Anthropic + Gemini)
- Toss Payments 정기결제 (`lib/billing/config.ts`)
- **`vercel.json` 없음 → 크론 미설정 (신규로 추가해야 함)**

### 1.2 핵심 테이블 (`supabase-schema.sql`, `migrations/`)
| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| `lawyers` | `specialty TEXT[]`, `region`, `office_name`, `bar_number`, `schema_data JSONB` | 온보딩 정보의 1차 저장소. `schema_data`에 `/tone` 산출 `customPrompt` 보관 |
| `uploads` | `type(pdf/audio/memo/url/faq)`, `raw_text`, `structured_data` | 콘텐츠 입력 소스 |
| `contents` | `channel(blog/instagram/macdee/google)`, `status(draft/review/approved/published/failed)`, `upload_id(nullable)` | **`upload_id`가 nullable → 업로드 없이도 콘텐츠 생성 가능(자율발굴 콘텐츠)**. `status`에 이미 `review`/`approved` 단계 존재 = 게이트 삽입점 |
| `publications` | `channel`, `external_id`, `external_url`, `status(published/failed/deleted)` | **외부 발행 결과 저장소로 그대로 재사용 가능** |
| `analytics` | `views`, `clicks`, `inquiries`, `date` | 성과 피드백 입력 |
| `subscriptions` | `plan('free'/'30'/'50'/'100'/'unlimited')`, `uploads_used`, `uploads_limit(NULL=무제한)`, `current_period_end` | cadence가 한도 초과 시 자동 skip(plan gating)에 사용 |
| `inquiries` | 문의 폼 | 전환 신호 |

추가 마이그레이션: `005_lawyer_websites`, `006~009_blog_profiles`, `008_blog_visits`(체류시간/referrer).

### 1.3 재사용할 핵심 코드
- **생성 엔진** `lib/ai/generate.ts`
  - `preprocessUpload(rawText)` → `{ masked_text, case_type, key_points[], result_summary, strategic_points[] }`
  - `generateContent(...)` (L443) — 단일 채널
  - **`generateAllChannels(rawText, { blogStyle, sourceType, customPrompt })`** (L502) — 5채널 일괄. **순수 함수에 가까워 잡 워커에서 그대로 호출 가능.**
- **PII 마스킹** `lib/ai/mask-pii.ts` → `maskPII(rawText)` (정규식 엔진)
- **현재 생성 흐름** `app/api/contents/generate/route.ts`: `createClient()` → `uploads`에서 `raw_text` 조회 → `maskPII()` → `generateAllChannels()` → `contents`에 `status:'review'`로 insert
- **현재 발행 흐름** `app/api/publish/route.ts`: `contents.status='published'`로 변경 + `publications`에 **내부 URL**(`/blog/[slug]/...`)만 기록. **외부 채널로는 전송하지 않음.** 네이버는 콘텐츠 상세(`app/(dashboard)/contents/[id]/page.tsx`)의 `convertToRichHtml()` + Copy 버튼으로 변호사가 수동 복붙.
- **온보딩 재료**: `app/(dashboard)/profile`, `/consulting`(설문 — **현재 DB 미저장, 일회성 출력만**), `/tone`(`app/api/profile/analyze-tone` — 블로그 URL 크롤→`customPrompt`. ⚠️ Vercel 50s 타임아웃 명시)

---

## 2. 목표 아키텍처

```
[온보딩 1회] ──> autopilot_config(캠페인 설정)
                       │
        ┌──────────────�“tick” cron (*/15)──────────────┐
        ▼                                               │
  ① 주제 자동발굴 ─> topic_candidates                    │
        ▼                                               │
  ② 콘텐츠 생성  (generateAllChannels 재사용)             │
        ▼                                               │
  ③ 광고규정 게이트 (compliance_reports) ──block──> 감독화면(승인 인박스)
        ▼ pass                                          │
  ④ 발행 (publish_jobs: 자체/인스타 자동 · 네이버 반자동)   │
        ▼                                               │
  ⑤ 성과 측정 (analytics + citation_checks)              │
        └──────── 피드백: 전환 잘 되는 주제 가중 ─────────┘
```

변호사는 `[마케팅 시작]` 이후 **`/autopilot` 감독 화면 하나**만 본다.

---

## 3. 데이터 모델 (신규 마이그레이션 `010_autopilot.sql` ~)

> 컨벤션: 기존과 동일하게 `lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE`, RLS는 `lawyer_id IN (SELECT id FROM lawyers WHERE user_id = auth.uid())` 패턴. **크론 워커는 `createServiceClient()`로 RLS 우회.**

```sql
-- 010_autopilot.sql

-- 캠페인(자율주행 설정) — 변호사당 1개로 시작
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT '기본 캠페인',
  is_active BOOLEAN DEFAULT false,
  approval_mode TEXT DEFAULT 'review' CHECK (approval_mode IN ('review','full_auto')),
  cadence_per_week INT DEFAULT 3,
  preferred_dow INT[] DEFAULT '{1,3,5}',      -- 월=1
  preferred_hour INT DEFAULT 10,
  channels TEXT[] DEFAULT '{blog,instagram,google,macdee}',
  blog_style TEXT DEFAULT 'column',
  target_case_types TEXT[] DEFAULT '{}',       -- 예: {음주운전, 이혼소송}
  target_keywords TEXT[] DEFAULT '{}',
  topic_source TEXT DEFAULT 'keyword_auto' CHECK (topic_source IN ('keyword_auto','upload_pool','faq')),
  goals TEXT,                                  -- consulting 설문값(현재 버려지는 데이터) 보관
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 콘텐츠 캘린더(예약 슬롯)
CREATE TABLE content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  topic TEXT,
  topic_candidate_id UUID,                     -- FK(topic_candidates) optional
  source_upload_id UUID REFERENCES uploads(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  state TEXT DEFAULT 'planned'
    CHECK (state IN ('planned','generating','review','approved','scheduled','published','skipped','failed')),
  content_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 잡 큐 (멱등 + 재시도)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES content_calendar(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('discover','generate','compliance','publish','measure','citation')),
  idempotency_key TEXT UNIQUE,                 -- hash(campaign_id + slot_date + job_type)
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  result JSONB,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_jobs_due ON jobs (status, scheduled_at) WHERE status = 'queued';

-- 주제 후보(자율발굴 BRAIN)
CREATE TABLE topic_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  intent TEXT,                                 -- info | conversion | defensive
  volume INT,                                  -- 네이버 검색광고 API 월검색량
  trend NUMERIC,                               -- DataLab 기울기
  citation_gap NUMERIC,                        -- AI엔진 미인용 점수
  score NUMERIC,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','queued','used','skipped')),
  cycle_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 키워드 데이터 24h 캐시(API 쿼터 보호)
CREATE TABLE keyword_cache (
  keyword TEXT PRIMARY KEY,
  data JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- 광고규정 점검 결과
CREATE TABLE compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  verdict TEXT CHECK (verdict IN ('pass','warn','block')),
  risk_score NUMERIC,
  flags JSONB DEFAULT '[]',                     -- [{span, category, severity, reason}]
  disclosure_ok BOOLEAN,
  auto_fixed BOOLEAN DEFAULT false,
  rules_version TEXT,
  reviewer_attorney_id UUID,                    -- 제6조 검토 변호사
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 인용 모니터링
CREATE TABLE citation_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  engine TEXT,                                  -- chatgpt | perplexity | gemini | naver
  cited BOOLEAN,
  rank INT,
  snippet TEXT,                                 -- 저장 전 maskPII() 적용
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 외부 채널 연동 자격증명
CREATE TABLE channel_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,                        -- instagram | wordpress | tistory
  access_token TEXT,                            -- 암호화 저장
  refresh_token TEXT,
  external_account_id TEXT,                      -- ig_user_id 등
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  UNIQUE(lawyer_id, channel)
);

-- 발행 잡(외부 채널)
CREATE TABLE publish_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,                        -- selfblog | instagram | wordpress | naver
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  state TEXT DEFAULT 'queued'
    CHECK (state IN ('queued','running','done','failed','manual_required')),
  attempts INT DEFAULT 0,
  result_url TEXT,
  error TEXT
);
```

기존 테이블 변경:
```sql
ALTER TABLE contents ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE contents ADD COLUMN calendar_id UUID REFERENCES content_calendar(id) ON DELETE SET NULL;
-- (선택) contents.status에 'scheduled' 추가하려면 CHECK 제약 재정의
```
신규 테이블 전부 RLS ENABLE + own 정책. `keyword_cache`만 서비스롤 전용(RLS로 유저 접근 차단).

---

## 4. 스케줄러 / 잡 큐

### 4.1 왜 틱(tick) 패턴인가
Vercel Cron 표현식은 글로벌이라 "변호사별 주 3회·각자 다른 시각"을 직접 못 돌린다. → **크론은 단순 펄스만 주고, 실제 스케줄은 DB에 둔다.**

### 4.2 `vercel.json` (신규)
```json
{ "crons": [ { "path": "/api/cron/tick", "schedule": "*/15 * * * *" } ] }
```
> Vercel은 크론을 **GET**으로 호출. 핸들러에서 `Authorization: Bearer ${process.env.CRON_SECRET}` 검증. Hobby 플랜은 함수 타임아웃이 짧으니 **Pro 필요**(아래 9.3).

### 4.3 `GET /api/cron/tick` — 디스패처
```
1. CRON_SECRET 검증
2. supabase = createServiceClient()
3. 도래 잡 집기:
   SELECT * FROM jobs
   WHERE status='queued' AND scheduled_at <= now()
   ORDER BY scheduled_at
   FOR UPDATE SKIP LOCKED      -- 동시 tick 안전, 중복 처리 방지
   LIMIT N;                    -- N=함수 1회 처리량(예 5)
4. 각 잡 status='running', locked_at=now()
5. job_type별 워커 호출(아래). 성공→'done', 실패→attempts++ & 지수백오프 재큐(scheduled_at=now()+2^attempts·분), max_attempts 초과→'failed' + 변호사 알림
```
> Supabase RPC(`select ... for update skip locked`)는 Postgres 함수로 감싸 호출하거나, `pg_advisory_xact_lock` 사용. 동기 LLM 호출이 길면 **잡을 잘게**(generate 1건=1잡) 쪼개 함수 타임아웃 회피.

### 4.4 멱등성
`jobs.idempotency_key = sha256(campaign_id + slot_date + job_type)` UNIQUE → tick 중복·enqueue 중복 시 충돌로 무시(`ON CONFLICT DO NOTHING`).

---

## 5. 코드 리팩터 (잡 워커 추출)

핵심: 라우트 핸들러에 묶인 비즈니스 로직을 **워커가 호출 가능한 순수 함수**로 추출하고, 라우트는 얇은 래퍼로 남긴다.

| 신규 파일 | 추출 원본 | 내용 |
|---|---|---|
| `lib/jobs/run-generate.ts` | `app/api/contents/generate/route.ts` (POST 본문) | `runGenerate({ lawyerId, uploadId?, brief?, blogStyle, customPrompt, channels })`. 내부에서 `createServiceClient()` 사용. `uploadId` 있으면 기존 흐름, 없으면 `brief`(BRAIN 산출)를 `generateAllChannels`에 주입. 결과 `contents`에 `status:'review'`, `campaign_id/calendar_id` 채워 insert |
| `lib/jobs/run-compliance.ts` | (신규) | §6 컴플라이언스 게이트 |
| `lib/jobs/run-publish.ts` | `app/api/publish/route.ts` (L60~94) | `publications` 기록 + `publish_jobs` enqueue(채널별) |
| `lib/jobs/run-measure.ts` | `app/api/analytics` 집계 로직 | 발행 후 7일 views/clicks/inquiries 롤업 → 캠페인 점수 |
| `lib/jobs/run-discover.ts` | (신규) | §7 BRAIN |
| `lib/jobs/run-citation.ts` | (신규) | §8.2 인용 모니터링 |

기존 라우트(`/api/contents/generate`, `/api/publish`)는 추출 함수를 호출하도록 1~2줄로 축소 → 수동 UI 흐름 그대로 유지(회귀 위험 최소).

---

## 6. 광고규정 컴플라이언스 게이트 (자율주행의 안전장치)

> 규범: 변호사법 §23 → 광고 규칙(2024.10) → **광고 규정(2025.2.6 개정)** → 검색서비스 운영 가이드라인(MOJ 2025.5)의 4단 체계.
> 현재 맥디는 프롬프트 지시(`PII_ENFORCEMENT`)만 있고 **실제 검출 엔진이 없다.** → 신규 `lib/compliance/`.

### 6.1 3계층 엔진
1. **Tier-A 결정론적 매처** `lib/compliance/rules.ts`
   JSON 룰북 + 정규식(표면형 변형 대응: `최\s*고`, `1\s*위`, `No\.?\s*1`, `승소\s*보장`, `전관`).
   카테고리·심각도: `승소보장/전액환불`·`전관`=critical(block), `최고/유일/1위/만족도1위`=high, `무료상담/할인쿠폰/구체보수액·수임료비교`=high, `별점·등급·순위`=high, `타 변호사 비방`=critical.
2. **Tier-B LLM 분류기** `lib/compliance/classify.ts`
   `claude-haiku`(저비용)로 룰이 못 잡는 함의형("압도적 결과", "패소한 적 없는") 판정. (`app/api/consulting/route.ts`의 Anthropic 직접호출 패턴 복제.) 출력 `{ flags:[{span,category,severity,reason}], disclosure_ok }`.
3. **Tier-C 의무표시 검사**
   본문에 **광고책임변호사 실명**(`lawyers` 프로필) + **"AI 보조 작성 · 변호사 OOO 검토"**(제6조) 문구 존재 여부. `generate.ts`가 붙이는 기존 꼬리말을 **법정 문구로 교체**.

### 6.2 판정 & 자동교정
`risk = Σ severity_weight`. critical 1개 또는 임계 초과 → **block**; high → **auto_rewrite**(플래그 span을 LLM에 주고 안전 치환, 재검사 최대 2회); low → **pass**. 결과 `compliance_reports`에 저장.

### 6.3 게이트 배치 (물리적 차단)
```
generate(→ status:'review') ─> run-compliance
   pass  : contents.status='approved' → publish_jobs enqueue 허용
   block : status='review' 유지 + compliance_flags 표시 + 감독화면 강제 노출(알림톡)
```
**`approval_mode='full_auto'`라도 block 건은 반드시 감독화면으로 올린다.** 이게 무인 운영의 법적 안전장치.

> 한계: 룰+LLM도 100% 못 잡는다. 엔진은 **보조**이며 면책이 아니다. 최종 책임은 변호사. 제6조 변협 AI시스템 인증은 외부 행정 절차(코드로 충족 불가, 등록 상태 플래그만 관리).

---

## 7. 주제 자동발굴 BRAIN (`run-discover.ts`)

> 현재는 변호사가 매번 `upload_id`를 줘야 생성된다. BRAIN은 그 앞단에서 `lawyers.specialty[] + region`만으로 "이번 주기 주제 N개"를 스스로 정한다.

### 7.1 데이터 소스 (합법성 명시)
| 소스 | 용도 | 합법성 |
|---|---|---|
| **네이버 검색광고 API `/keywordstool`** | 월검색량(`monthlyPcQcCnt`/`monthlyMobileQcCnt`) + 연관키워드 | ✅ 공식 (1차 소스). 계정+쿼터 필요 → `keyword_cache` 필수 |
| 네이버 DataLab API | 트렌드 기울기·계절성(연말 상속, 1월 이혼) | ✅ 공식 |
| 자동완성/연관검색어(`ac.search.naver.com`) | 롱테일 intent | ⚠️ 비공식·ToS 회색 → 보조·저빈도·캐시만 |
| AI citation probe | 멀티LLM(`lib/ai/providers.ts`)에 `"{지역} {분야} 변호사 추천"` 질의 → 본인 미인용=gap | ✅ 자체 API 재사용(추가 인프라 0) |
| 경쟁 콘텐츠 갭 | `lib/ai/blog-scraper.ts`(`scrapeNaverBlog`) 재사용 | ⚠️ 스크래핑 ToS 주의 |

### 7.2 랭킹 & 시딩
`score = w1·log(검색량) + w2·트렌드 + w3·전환의도(위자료/비용/절차 가중) + w4·citation_gap + w5·경쟁갭 − w6·중복`.
상위 후보 → LLM이 `{ case_type:분야, key_points:[쟁점], result_summary:"일반 해설형", strategic_points:[키워드 intent] }` **브리프 합성** → 이 객체를 **`generateAllChannels`에 그대로 주입**(시그니처 재사용, 함수 수정 거의 불필요). 관련 업로드(승소사례)가 있으면 우선 결합(E-E-A-T↑).

---

## 8. 발행 (`run-publish.ts` + `publish_jobs`)

### 8.1 채널별 자동화 매트릭스 (냉정하게)
| 채널 | 진짜 자동? | 방법 |
|---|---|---|
| **자체 도메인 블로그** | ✅ 완전 자동 | 이미 `/blog/[slug]` 호스팅 중. `contents` 공개 토글 = 발행 |
| **Instagram(전문계정)** | ✅ 자동 | Graph API 2-step(`/media`→`/media_publish`), 캐러셀=카드뉴스. 24h당 100건. 전문계정+FB연동·앱심사 필요. 커버는 Storage public URL 사용 |
| **WordPress/티스토리** | ✅ 자동 | REST API. 보조 채널 |
| **Google** | △ | 글 발행은 자체사이트면 자동. Indexing API는 일반글 불가 → **사이트맵 ping/IndexNow**로 색인 유도 |
| **네이버 블로그** | ❌ 자동 불가 | 공식 글쓰기 API 사실상 폐기. 봇 자동화=ToS 위반·저품질/정지 → **금지**. → **원클릭 반자동**(8.2) |

### 8.2 네이버 원클릭 반자동
`convertToRichHtml()`(콘텐츠 상세 페이지) 확장 → **버튼 하나로** (1) 서식 그대로 클립보드 복사 + (2) 네이버 글쓰기창 deep-link 오픈 + (3) 이미지 zip 다운로드. 변호사는 붙여넣기·발행만. 발행 후 "네이버 URL 붙여넣기" → `publications.external_url` 채움(=모니터링 연결). `publish_jobs.state='manual_required'`로 감독화면/알림톡에 "발행 대기" 카드 노출.

> 체감상 자동이지만 **"네이버 100% 무인"은 과장 금지** — 거기서 신뢰 깨짐.

---

## 9. 온보딩 + 감독 화면

### 9.1 `/onboarding` 위저드 (5스텝, 1회) — 기존 폼 재조립
1. **사무소/프로필** — `lawyers`(name·office·region·phone·bar_number). `/profile` 폼 재사용
2. **분야·타깃** — `specialty[]` + `target_case_types[]` + region. `/consulting`의 SPECIALTIES 칩 재사용
3. **브랜드 톤** — `/tone`(`analyze-tone`) 호출 → `customPrompt`. 블로그 없으면 프리셋(전문가형/공감형/단정형)
4. **자동화 정책** — `cadence_per_week`(2/3/5), `approval_mode`(review/full_auto), 금지표현 강도, 채널 선택
5. **확인 → `[마케팅 시작]`** — `campaigns.is_active=true`, 향후 14일치 `content_calendar` 슬롯 + `jobs(generate)` enqueue

> `/consulting`의 firmSize/budget/goals도 `campaigns.goals`에 저장(현재 버려지는 데이터 회수).

### 9.2 `/autopilot` 감독 화면 (기존 `/dashboard` 대체 홈)
- **상태 배너**: "자율주행 ON · 이번 주 3건 예약 · 다음 발행 화 10시" + `검토↔자동` 토글
- **승인 인박스**: `contents.status='review'`를 카드로(=`/publish` 카드 재사용) → `[승인] [수정] [건너뛰기]`. `full_auto`면 비어 있고 **block 플래그 건만** 노출
- **이번 주 캘린더**: `content_calendar` 7일 뷰
- **성과 요약**: `analytics`+`blog_visits` 재사용 + `citation_checks` 주간 인용 여부

### 9.3 최소 버튼
`마케팅 시작/일시정지` · 승인 인박스 3버튼 · `검토↔자동` 토글. 그 외 일상 버튼 없음.

---

## 10. 신규 API 라우트

| 메서드/경로 | 용도 |
|---|---|
| `GET /api/cron/tick` | 잡 큐 디스패처(Vercel Cron) |
| `POST /api/campaigns` / `PATCH /api/campaigns/[id]` | 캠페인 CRUD, 저장 시 캘린더+잡 enqueue |
| `POST /api/autopilot/start` / `pause` | `is_active` 토글 |
| `POST /api/contents/[id]/approve` / `skip` | 승인 인박스 액션 → publish 잡 enqueue |
| `POST /api/compliance/check` | 단건 점검(수동 트리거용) |
| `GET /api/brain/calendar` / `POST /api/brain/discover` | 주제 발굴/캘린더 |
| `POST /api/channels/instagram/connect` (OAuth) | 채널 연동 |

---

## 11. 환경변수 (신규)
```
CRON_SECRET=               # Vercel Cron 인증
NAVER_SEARCHAD_API_KEY=    # 검색광고 API
NAVER_SEARCHAD_SECRET=
NAVER_SEARCHAD_CUSTOMER_ID=
NAVER_DATALAB_CLIENT_ID=   # (선택) 트렌드
NAVER_DATALAB_CLIENT_SECRET=
META_APP_ID=               # Instagram Graph
META_APP_SECRET=
ENCRYPTION_KEY=            # channel_connections 토큰 암호화
```
(기존: `SUPABASE_SERVICE_ROLE_KEY`, `TOSS_SECRET_KEY`, LLM 키 재사용)

---

## 12. 구현 로드맵 (PR 단위)

| # | PR | 내용 | 가치/리스크 |
|---|---|---|---|
| **1** | `jobs` 큐 + `tick` 크론 + 생성로직 추출 | `lib/jobs/run-generate.ts` 추출, `vercel.json` 추가, 수동 생성을 잡으로 전환 | 회귀 위험 최소, 토대 |
| **2** | `campaigns` + `/onboarding` 위저드 + `autopilot_config` | 온보딩 1회 수집, consulting 데이터 저장 | 즉시 체감 ↑ |
| **3** | `/autopilot` 감독 화면 + 승인 인박스 | `/publish` 카드 재사용 + 토글 | "통제감" UX |
| **4** | **컴플라이언스 게이트**(Tier-A→C) + `compliance_reports` | 자동발행 안전장치 | **이게 있어야 full_auto 가능** |
| **5** | BRAIN(`run-discover`, 검색광고 API) + `content_calendar` | 업로드 없이 자율 생성 | "스스로 굴러감" 완성 |
| **6** | 자동발행(`publish_jobs`: 자체블로그→인스타) + 네이버 원클릭 | 마지막 손길 제거 | 인스타 앱심사 부담 |
| **7** | `citation_checks` + `run-measure` 피드백 | 자기개선 루프 | 비결정적 노이즈 관리 |

**첫 MVP = PR 1~3** ("구독 → 설정 → 자동 생성 → 승인"의 뼈대). PR 4 이후 진짜 무인.

---

## 13. 리스크 & 한계 (정직하게)

- **네이버 자동발행 불가** — 봇 발행 시도 금지(계정 정지). 반자동이 정답.
- **컴플라이언스는 보조** — 룰+LLM도 회피·은유 표현에 취약. 책임은 변호사. `full_auto` 기본 off 권장.
- **Vercel 함수 타임아웃** — `generateAllChannels`는 4채널 LLM 동시호출 → Hobby 한계 초과. **Pro(maxDuration 300s) 필수** 또는 채널별 잡 분할. `analyze-tone`에 이미 50s 타임아웃 흔적.
- **품질 드리프트** — 무인 주 3회는 동일 case_type 반복·환각 위험. `topic_candidates` dedup + 주기적 휴먼 스팟체크.
- **인스타 운영부담** — 개인계정 불가(전문계정+FB+앱심사), 토큰 만료 관리.
- **비용 선형 증가** — 변호사 × cadence × 채널 × LLM 토큰. plan별 `uploads_limit` 강제 필수(초과 시 자동 skip).

---

## 14. 핵심 권고 한 줄
> **"발행 버튼을 `jobs`/`publish_jobs` 큐 디스패처로 바꾸는 것"이 첫 PR.** 그 위에 온보딩·감독화면·컴플라이언스·BRAIN을 얹으면 "구독 후 클릭 몇 번"이 완성된다. 진짜 자동(자체블로그·인스타·색인) + 네이버 원클릭 반자동 하이브리드가 현실적이고 안전한 최종형이다.
