# MAKETHIS1 리뉴얼 계획

> 작성 2026-08-28 · Phase 1~2 (현황 분석 · URL/SEO 이전 계획)
>
> **원칙: 라이브 홈페이지는 건드리지 않는다.** 모든 작업은 `/renewal` 데모에서 진행하고,
> 완성 후 한 번에 교체한다.

---

## 1. CURRENT ARCHITECTURE

### 1.1 기술 스택

| 항목 | 현황 |
|---|---|
| Framework | Next.js **16.1.6** App Router / React 19.2.3 |
| 스타일 | Tailwind **v4** (`@theme inline`), CSS 변수는 `app/globals.css` |
| 폰트 | `@fontsource/noto-sans-kr` 자체 호스팅 (300~900) |
| 애니메이션 | framer-motion 12 |
| DB / Auth | Supabase (`@supabase/ssr`, 미들웨어에서 세션 갱신) |
| 결제 | TossPayments (구독 · 빌링키) |
| 배포 | Vercel |
| 이메일 | nodemailer (Gmail) — 문의 알림 |
| 스팸방어 | Upstash Ratelimit + 허니팟 + reCAPTCHA v3 |

### 1.2 현재 공개 URL 맵

| URL | 정체 | 리뉴얼 후 |
|---|---|---|
| `/` | macdee/makethis1 혼합 홈. `HomePageClient.tsx` 906줄 단일 파일 | **전면 교체** |
| `/about` | MACDEE 플랫폼 소개 (SaaS 톤, 월 49,000원 언급) | **전면 교체** (회사·팀) |
| `/makethisone` | 정적 HTML 대행사 사이트 (`public/makethisone/index.html`, 53KB) | **301 → `/`** |
| `/magazine` | 매거진 목록 (91편 발행) | 유지 · INSIGHTS로 리브랜딩 |
| `/magazine/[slug]` | 매거진 본문 | **URL 절대 불변** |
| `/diagnose` | 무료 AI 마케팅 진단 (리드 수집) | 유지 · **신규 메인 CTA 목적지** |
| `/blog/[slug]` | 고객 변호사 블로그 호스팅 | 유지 (마케팅 사이트와 무관) |
| `/blog/[slug]/[postSlug]` | 고객 블로그 글 | 유지 |
| `/site/[slug]` | 고객 홈페이지 빌더 결과물 | 유지 |
| `/terms`, `/refund` | 약관 | 유지 |
| `/m/[code]` | 단축 URL 리다이렉트 | 유지 |
| `/llms.txt`, `/rss.xml`, `/sitemap.xml`, `/robots.txt` | 기계용 | 내용 갱신 |
| `/login`, `/signup`, `/dashboard/*`, `/admin/*` | SaaS 앱 · 관리자 | **유지, 단 마케팅 내비게이션에서 제거** |

### 1.3 기존 리다이렉트 (`next.config.ts`, 18건)

IMWEB 시절 레거시가 전부 살아 있다. **하나도 지우지 않는다.**

- `/COLUMN?idx=`, `/column?idx=`, `/32?idx=` → `/magazine/:idx`
- `/COLUMN`, `/column` → `/magazine`
- `/member/login`, `/member/join` → `/login`, `/signup`
- `/?mode=login`, `/?mode=join` → `/login`, `/signup`
- `/cart`, `/61` → `/`
- `/mypage` → `/dashboard`
- `/lawyer/:slug` → `/blog/:slug`

### 1.4 SEO 자산 현황

- **Google Search Console 인증 2건 + 네이버 사이트인증 2건** — `app/layout.tsx`. 절대 삭제 금지.
- 동적 sitemap (ISR 1시간): 홈 / about / magazine / makethisone / 변호사 블로그 / 블로그 글 / 매거진 글
- `robots.txt`: GPTBot · ClaudeBot · PerplexityBot · Google-Extended 명시 허용 — **이미 GEO 대응이 되어 있다.**
- JSON-LD: 루트 레이아웃에 `WebSite` + `Organization`, 홈에 `SoftwareApplication` + `FAQPage`
- canonical 정책: **루트 레이아웃에 canonical을 두지 않는다**는 규칙이 주석으로 박혀 있음 (하위 전체 상속 버그 방지). 신규 페이지도 각자 canonical을 직접 선언해야 한다.
- 비-canonical 도메인(`makethis1.com`, `aimacdee.com`) → `www.makethis1.com` 301 (미들웨어)

### 1.5 실재하는 자산 (지어내지 않아도 되는 것)

**팀 6명** (`public/makethisone/team/*.webp` 사진 있음):

| 이름 | 직함 | 배경 |
|---|---|---|
| 김나빈 | Director | Boston University Marketing |
| 임유진 | General Manager | 아주대 경제학과 · 파트너 마케팅 총괄 |
| 임미영 | Manager | KBS 방송작가 출신 |
| 문희원 | Assistant Manager | 지역 MBC 기자 출신 |
| 정경재 | Editor | 아주대 법학과 |
| 신재선 | Editor | 중앙대 영문과 |

→ 스펙 §6 "법률을 모르는 마케터에게 맡기지 않는다"를 **실제 이력으로** 증명할 수 있다.

**파트너 로펌 17곳** (실명 공개 중):
법무법인 BHSN · 아이엘 · 양영&정훈 · 새록 · 오른 · 해밀 · 세안 · 율빛 · 류현 · 그날 · 안세 · HANEUM Law · 로앤탑 · 카라 법률사무소 · 이정도 변호사 · Samsung Medison · KT

**기존 공표 수치**: 파트너 로펌 20+ / 완료 프로젝트 100+ / 업력 7년+
→ 스펙 §9·§42는 "검증 가능한 숫자만"을 요구한다. 위 수치는 이미 대외 공표 중이므로 그대로 쓰되, **새 수치를 만들지 않는다.**

**콘텐츠**: 매거진 91편 (법률정보 17 / 칼럼 16 / 나머지 마케팅). 네이버 자동 발행 파이프라인 가동 중.

---

## 2. PROBLEMS — 지금 홈페이지가 잘못 말하고 있는 것

1. **브랜드가 셋이다.** `macdee` / `맥디` / `makethis1` / `메이크디스원`이 한 화면에 섞여 있다. 홈 첫 화면이 좌우 분할("맥디로 갈래, 메이크디스원으로 갈래")이라 방문자에게 선택을 강요한다.
2. **AI가 상품으로 팔리고 있다.** `SoftwareApplication` 스키마, "3분 만에 완성", "판결문 업로드 → 자동 생성". → 콘텐츠 생성 도구 회사로 읽힌다.
3. **가격이 회사를 규정한다.** 홈 FAQ 스키마에 "월 49,000원", "7일 무료 체험", "비용은 10분의 1"이 박혀 있다. 로펌 대표가 통합 마케팅 파트너로 보지 않게 만드는 결정적 요소.
4. **대행사 실적이 홈에 없다.** 팀 6명, 파트너 17곳, 7년 업력이 전부 `/makethisone` 정적 페이지에 갇혀 있다. 정작 홈에는 없다.
5. **`HomePageClient.tsx` 906줄 단일 클라이언트 컴포넌트.** 섹션 재구성이 불가능하고 전부 `"use client"`라 LCP에 불리하다.
6. **서비스별 랜딩이 하나도 없다.** "변호사 네이버 광고", "로펌 SEO" 같은 상업 검색어를 받을 페이지가 없다.

### 2.1 ⚠️ 먼저 결정이 필요한 것 — SaaS 제품을 어떻게 할 것인가

스펙 §19·§34는 **"MACDEE 브랜드 제거, 무료체험 CTA 제거, SaaS 가격표 제거"**를 지시한다.
그런데 `/dashboard`, `/billing`, TossPayments 빌링키, `subscriptions`·`payments` 테이블은 **실제로 돌아가는 유료 제품**이다.

**이 계획이 채택한 전제** (다르면 알려주시면 바로 수정):

- 앱 자체는 **삭제하지 않는다.** `/login`, `/signup`, `/dashboard/*` 전부 그대로 동작한다. 기존 구독자에게 영향 없음.
- 다만 **마케팅 사이트에서 링크하지 않는다.** 새 헤더/푸터/홈에 "시작하기", "무료 체험", 가격표가 등장하지 않는다.
- macdee는 **MAKETHIS1이 내부적으로 쓰는 운영 도구**로 포지션을 내린다. `/makethisone` 정적 페이지가 이미 "광고 대행 고객에게 맥디 무료 제공"이라고 말하고 있어, 이 방향이 기존 메시지와도 맞는다.
- 홈의 `SoftwareApplication` / 가격 `AggregateOffer` 스키마는 **제거**한다. (제품이 홈의 주인공이 아니게 되므로)

---

## 3. NEW INFORMATION ARCHITECTURE

```
/                          홈 — 로펌 마케팅, 여기서 끝냅니다
│
├── /lawfirm-marketing     로펌 통합 마케팅 (WHAT WE DO 허브)
│   ├── /naver-ads         변호사 네이버 광고 · 파워링크
│   ├── /google-ads        변호사 Google Ads
│   ├── /lawfirm-seo       로펌 SEO
│   ├── /geo               로펌 GEO · AI 검색 최적화
│   ├── /lawfirm-blog      변호사 블로그 마케팅
│   ├── /lawfirm-website   변호사 홈페이지 제작·운영
│   └── /conversion        상담 전환 최적화
│
├── /work                  Case Study (CMS)
├── /magazine              INSIGHTS  ← URL 불변, 라벨만 변경
├── /about                 회사 · 팀
├── /diagnose              마케팅 진단 (= 메인 CTA 목적지)
└── /contact               문의 → /contact/thanks
```

### 3.1 `/insights` 문제 — `/magazine`을 유지한다

스펙 §10은 `/insights`를 제안하지만, `/magazine/[slug]` 91편이 이미 색인돼 있고
`/COLUMN?idx=` 레거시 리다이렉트가 전부 `/magazine`을 가리킨다.

**결정: `/magazine`을 실제 URL로 유지하고, UI 라벨만 "INSIGHTS"로 바꾼다.**
`/insights` → `/magazine` 301을 추가해 스펙상의 경로로 들어와도 도달하게 한다.
(`/insights`를 실제 페이지로 만들면 같은 글이 두 URL에 뜨는 canonical 사고가 난다.)

### 3.2 네비게이션

```
LOGO: MAKETHIS1

WHAT WE DO ▾   OUR SYSTEM   WORK   INSIGHTS   ABOUT      [마케팅 진단 요청]
  Paid Media
  SEO
  AI Search / GEO
  Content
  Website
  Data & Conversion
```

푸터에만 남기는 것: 이용약관 · 환불정책 · 사업자정보 · (작게) 고객 로그인

---

## 4. PAGES TO KEEP / REMOVE / REDIRECT

### 4.1 유지 (손대지 않음)

`/magazine`, `/magazine/[slug]`, `/blog/*`, `/site/[slug]`, `/m/[code]`,
`/terms`, `/refund`, `/login`, `/signup`, `/dashboard/*`, `/admin/*`,
`next.config.ts`의 기존 리다이렉트 18건 전부

### 4.2 교체

| 대상 | 방식 |
|---|---|
| `/` | 새 컴포넌트로 전면 교체. `HomePageClient.tsx`는 `_legacy/`로 보관 |
| `/about` | MAKETHIS1 회사·팀 페이지로 재작성 |
| `/diagnose` | 폼 로직 유지, 껍데기만 새 디자인 시스템 적용 |

### 4.3 REDIRECT MAP (신규 추가분)

| FROM | TO | 코드 | 이유 |
|---|---|---|---|
| `/makethisone` | `/` | 301 | 새 홈이 이 페이지를 그대로 대체 |
| `/makethisone/*` | `/` | 301 | 정적 하위 자원 정리 (`/makethisone/subscribe` 제외) |
| `/insights` | `/magazine` | 301 | 스펙 경로 수용, 중복 색인 방지 |
| `/insights/:slug` | `/magazine/:slug` | 301 | 위와 동일 |
| `/services` | `/lawfirm-marketing` | 301 | 흔한 추측 경로 |
| `/portfolio` | `/work` | 301 | 구 대행사 섹션 앵커 |
| `/renewal`, `/renewal/*` | `/` | 301 | **필수.** noindex를 쓰지 않으므로 교체 후 404를 막으려면 반드시 걸어야 한다 |

**금지 사항** — 스펙 §20:
- 전체를 `/`로 몰아넣는 리다이렉트 금지
- 매거진 slug 변경 금지
- 404 대량 발생 금지

`/makethisone/subscribe`는 대시보드 그룹의 결제 페이지다. `/makethisone/*` 와일드카드가
이걸 삼키지 않도록 **더 구체적인 규칙을 먼저** 놓는다.

---

## 5. DESIGN SYSTEM

### 5.1 컬러

```css
--mt-bg:        #FBFAF8   /* OFF WHITE — 순백 금지, 종이 느낌 */
--mt-surface:   #FFFFFF
--mt-ink:       #0E1116   /* 거의 검정 — 본문·헤드라인 */
--mt-charcoal:  #2A2E35
--mt-gray:      #6A6F78   /* 보조 텍스트 */
--mt-line:      #E3E1DC   /* 구분선 — 회색 아닌 따뜻한 톤 */
--mt-accent:    #2A4F8A   /* INK BLUE — 유일한 액센트 */
--mt-accent-sub:#12305C   /* 액센트 심화 (호버/강조) */
```

**액센트 근거**: 기존 브랜드 토큰 `--brand-blue-dark: #2A4F8A`를 그대로 승격시켰다.
기존 자산과 단절되지 않으면서 `#3563AE`보다 채도가 낮아 SaaS 느낌이 빠진다.
사용 규칙: **한 화면에 3곳 이하.** 링크 밑줄, 숫자 강조, CTA 테두리에만.
넓은 면적을 파란색으로 칠하지 않는다 (§13 남색 과잉 금지).

다크 섹션(문제 제기·시스템 다이어그램)에서는 `--mt-ink` 배경 + `--mt-bg` 텍스트로 반전.

### 5.2 타이포그래피

- 한글 본문/제목: **Pretendard** (OFL) — 없으면 Noto Sans KR 폴백
- 영문 Eyebrow/라벨: **Inter** — `letter-spacing: 0.14em`, uppercase, 11~12px
- 숫자: `font-variant-numeric: tabular-nums`

```
display   clamp(2.6rem, 6.2vw, 5.2rem)   700   line-height 1.06   ls -0.03em
h1        clamp(2.1rem, 4.4vw, 3.6rem)   700   1.14
h2        clamp(1.7rem, 3.0vw, 2.6rem)   600   1.22
h3        1.25rem                        600   1.4
body-lg   1.0625rem                      400   1.85
body      0.9375rem                      400   1.8
label     0.6875rem                      500   uppercase Inter
```

한글은 `line-height`를 영문보다 넉넉히 준다 (본문 1.8~1.85). 이게 "editorial" 인상의 절반이다.

### 5.3 레이아웃

```
--mt-max:      1360px
--mt-gutter:   24px (mobile) / 40px (tablet) / 64px (desktop)
섹션 상하 패딩: 88px (mobile) / 140px (desktop)
Hero:          min-height 88vh
```

라운드는 최소화: `4px` (카드), `2px` (버튼). 큰 라운드는 SaaS 신호다.
그림자 대신 **1px 선**으로 면을 나눈다.

### 5.4 모션 (§18 절제)

- 기본: `opacity 0→1`, `translateY 16px→0`, `520ms`, `cubic-bezier(.22,.61,.36,1)`
- 스크롤 리빌은 `IntersectionObserver` + CSS. **framer-motion을 새 컴포넌트에 추가하지 않는다** (§40 번들)
- 예외: Section 02의 "여러 대행사 → MAKETHIS1 수렴" 다이어그램만 SVG 라인 드로잉
- `prefers-reduced-motion: reduce`면 전부 즉시 표시

### 5.5 컴포넌트 목록

```
components/renewal/
  primitives/   Container · Eyebrow · SectionHeader · Button · Reveal · Stat
  layout/       SiteHeader · SiteFooter · ContactCTA
  home/         HeroSection · ProblemSection · MarketingSystem · ChannelGrid
                FutureReady · WhyMakethis1 · CaseStudies · PartnerLogos
                InsightsPreview · FinalCTA
  service/      ServiceHero · ServiceBody · ServiceFAQ · RelatedInsights
```

`primitives`는 서비스 페이지 8개에서 재사용된다. 여기서 대충 만들면 전부 다시 짜야 한다.

---

## 6. SEO MIGRATION PLAN

### 6.1 데모 기간 (지금 ~ 교체 전)

`/renewal` 이하는 검색 **색인**에서 빼되, **크롤러가 본문을 읽는 것은 막지 않는다.**

> **2026-08-28 수정 — noindex 방식 폐기**
> 처음에는 `X-Robots-Tag: noindex` + 페이지 메타 `robots: noindex` 로 막았다.
> 그런데 OpenAI 계열 크롤러(GPTBot · ChatGPT-User · OAI-SearchBot)는 noindex 를
> 존중해 **본문 읽기 자체를 거부한다.** ChatGPT에서 "fetch 실패"로 나타난다.
> 데모를 외부 AI에게 검토시키지 못하면 데모의 의미가 없으므로 방식을 바꿨다.

현재 방식:
1. `robots.txt` 에서 **색인 봇에만** `Disallow: /renewal` — Googlebot · Yeti · Bingbot
2. AI 크롤러(GPTBot · ChatGPT-User · OAI-SearchBot · ClaudeBot · PerplexityBot)와
   `User-agent: *` 는 그대로 허용 → 본문 읽기 가능
3. `sitemap.xml` 에 절대 넣지 않는다
4. 어디에서도 `/renewal` 로 링크하지 않는다 (링크가 없으면 발견 경로가 없다)
5. **교체 시 `/renewal/*` → `/` 301 을 반드시 추가한다** (아래 4.3)

`noindex` 헤더나 메타를 `/renewal` 에 다시 붙이지 말 것. 붙이는 순간 외부 AI 검토가 막힌다.

### 6.1.1 잔여 위험

robots.txt `Disallow` 는 색인을 100% 막지는 못한다. 외부에서 링크가 걸리면 구글이
URL만 색인할 수 있다. 인바운드 링크와 sitemap 등재가 없는 임시 데모라 실질 위험은 낮고,
교체 시점의 301 이 뒤처리를 담당한다.

### 6.2 교체 시점

| 작업 | 내용 |
|---|---|
| 라우트 이동 | `app/renewal/*` → 각 최종 경로. 디렉터리 이름만 바뀌므로 컴포넌트는 무수정 |
| noindex 해제 | 미들웨어 prefix 제거 + 각 페이지 `robots` 제거 |
| canonical | 신규 페이지 전부 자기 URL로 명시 (루트 상속 금지 규칙 준수) |
| sitemap | 신규 8개 서비스 페이지 + `/work` + `/contact` 추가, `/makethisone` 제거 |
| JSON-LD | `SoftwareApplication`·가격 `AggregateOffer` 제거. `Organization` → `ProfessionalService`로 승격 |
| Organization | `name`을 `MAKETHIS1 (메이크디스원)`으로. `alternateName`에 `macdee`는 **남긴다** (브랜드 검색 유입 보존) |
| 메타 | 전 페이지 title/description 재작성 |
| OG | `/og-image.png` 재제작 |
| 내부링크 | `/makethisone` 링크 전수 교체 |
| GSC | 신규 sitemap 제출 + 주요 URL 색인 요청 |
| 네이버 | 서치어드바이저 재수집 요청 |

### 6.3 절대 건드리지 않는 것

- `app/layout.tsx`의 `verification` 블록 (Google 2건 + 네이버 2건)
- 미들웨어의 비-canonical 도메인 301
- 기존 리다이렉트 18건
- `robots.txt`의 AI 봇 허용 목록
- 매거진 slug

### 6.4 홈 메타 (임시)

```
title:       로펌 마케팅 전문 | SEO·GEO·네이버·구글 광고 | MAKETHIS1
description: 네이버 파워링크, Google Ads, 블로그, 홈페이지, SEO·GEO,
             AI 검색과 상담 전환 분석까지. MAKETHIS1이 로펌의 마케팅팀처럼
             전체 마케팅을 통합 운영합니다.
```

배포 직전 실제 검색량으로 재조정. `변호사 광고`, `로펌 마케팅`, `법무법인 광고`는
현재 홈이 이미 잡고 있는 키워드이므로 **새 title에서 빠지면 안 된다.**

---

## 7. GEO / AI SEARCH 구조 (§23)

서비스 페이지 8개는 전부 아래 블록을 순서대로 갖는다. AI가 인용하기 좋은 형태다.

```
1. 정의        "로펌 SEO란 무엇인가" — 한 문단, 정의문으로 시작
2. 대상        누구를 위한 서비스인가
3. 문제        어떤 문제를 해결하는가
4. 프로세스    번호가 붙은 단계 (ol)
5. 측정 지표   무엇을 성과로 보는가
6. FAQ         FAQPage 스키마 동반, 5~7문항
7. 작성/검수   담당자 + 최종 업데이트 날짜
8. 관련 글     /magazine 내부링크 3~5개
```

`robots.txt`가 이미 GPTBot·ClaudeBot·PerplexityBot·Google-Extended를 허용하고 있어
추가 설정은 불필요하다. 구조만 맞추면 된다.

**금지 표현** (§42): "AI 검색 1위 보장", "상위노출 보장", "추천 보장"

---

## 8. IMPLEMENTATION ORDER

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 현황 분석 | ✅ 이 문서 |
| 2 | URL/SEO 이전 계획 | ✅ 이 문서 |
| 3 | 디자인 시스템 (`renewal.css` + primitives) | ✅ |
| 4 | SiteHeader / SiteFooter | ✅ |
| 5 | 홈 10개 섹션 | ✅ `/renewal` |
| 6 | 서비스 페이지 템플릿 + 8개 | ⬜ |
| 7 | `/work` Case Study (CMS 스키마 포함) | ⬜ |
| 8 | `/magazine` INSIGHTS 리스킨 | ⬜ |
| 9 | `/about` 회사·팀 | ⬜ |
| 10 | `/contact` + `/contact/thanks` | ⬜ |
| 11 | 메타 / 스키마 / sitemap | ⬜ |
| 12 | 반응형 QA | ⬜ |
| 13 | 성능 (LCP·CLS·INP) | ⬜ |
| 14 | 최종 QA → **홈페이지 교체** | ⬜ |

---

## 9. 문의 시스템 (§27~28)

`inquiries` 테이블 현재 컬럼: `name, firm, phone, email, subject, message, status`

스펙이 요구하는 추가 항목 (현재 마케팅 상황 / 주요 사건 분야 / 현재 광고비 / 월 예산 / 홈페이지 URL)은
**컬럼을 새로 만들지 않고** 구조화 텍스트로 `message`에 합친다. 기존 관리자 화면(`/admin/inquiries`)이
그대로 동작하고 마이그레이션이 필요 없다.

```
subject = "마케팅 진단 요청"
message = [현재 상황] …
          [주요 분야] …
          [홈페이지] …
          [월 예산] …
          ---
          (자유 입력)
```

기존 방어 로직(허니팟 · URL 차단 · 키릴문자 · reCAPTCHA v3 · IP 3회/분)은 그대로 탄다.
다만 **홈페이지 URL 입력란은 예외 처리**가 필요하다 — 현재 API는 `message`에 URL이 있으면 400을 낸다.
→ URL은 별도 필드로 받아 검사 대상에서 제외하고 서버에서 합친다.

`/contact/thanks`에서 GA4 `generate_lead` 이벤트 발화.

---

## 10. RISKS

| # | 위험 | 대응 |
|---|---|---|
| R1 | **`/renewal` 색인 사고** — 미완성 초안이 검색에 뜨고 교체 후 404 | 색인 봇만 robots.txt Disallow + sitemap 제외 + 인바운드 링크 없음 + 교체 시 301. noindex는 AI 크롤러를 막으므로 쓰지 않는다 |
| R2 | **`/makethisone` 301로 SEO 손실** — 대행사 실적 페이지가 사라짐 | 새 홈이 팀·파트너·포트폴리오를 전부 흡수한 뒤에만 301. 순서를 지킨다 |
| R3 | **canonical 상속 버그 재발** — 루트에 canonical 넣으면 하위 전체 오염 | 신규 페이지마다 개별 선언. 코드 주석으로 이유 명시 |
| R4 | **MACDEE 브랜드 검색 유입 손실** — "맥디" 검색 트래픽 | `Organization.alternateName`에 macdee/맥디 유지 |
| R5 | **`/makethisone/subscribe` 오폭** — 와일드카드 301이 결제 페이지를 삼킴 | 구체 규칙 우선 배치 + 배포 후 실제 확인 |
| R6 | **폰트 추가로 LCP 악화** | Pretendard `swap` + 필요 굵기만(400/500/600/700). 실패 시 Noto Sans KR 폴백 유지 |
| R7 | **framer-motion 번들 증가** | 신규 컴포넌트는 CSS + IntersectionObserver만 사용 |
| R8 | **가짜 데이터 유입** — Case Study 수치 압박 | 실데이터 있는 사례만 등록. 없으면 섹션 자체를 숨긴다 |
| R9 | **SaaS 앱 단절** — 링크 제거로 기존 구독자 로그인 경로 상실 | 푸터에 "고객 로그인" 존치. `/login` URL 불변 |

---

## 11. 방향을 잃었을 때 (§44)

> **MAKETHIS1은 광고를 하나 더 대신해주는 회사가 아니다.
> 로펌의 마케팅 기능 전체를 외부에서 운영하는 회사다.**

각 섹션을 만들 때 던지는 질문:
**이 화면이 "콘텐츠 대행 업체"로 보이는가, "로펌의 마케팅 본부"로 보이는가?**
