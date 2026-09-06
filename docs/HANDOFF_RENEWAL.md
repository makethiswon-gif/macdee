# /renewal 인수인계 (→ Codex)

> 작성 2026-08-29. 이 문서는 진입용 요약이다.
> **살아있는 명세는 `RENEWAL_PLAN.md`(508줄)** — 결정과 근거가 전부 거기 있다.
> 이 문서와 계획서가 다르면 계획서가 맞다.

---

## 0. 한 줄 상황

makethis1.com 홈페이지 전면 리뉴얼. **`/renewal` 데모에서 개발이 사실상 끝났고**
(Phase 1~14 중 QA까지 완료), 남은 것은 **루트 교체 실행(대표 승인 대기)** 과
아래 §5 의 미해결 항목들이다. 라이브 홈(`/`)은 아직 옛날 그대로다 — 의도된 상태.

- 데모: https://www.makethis1.com/renewal (배포됨, 검색봇만 noindex)
- 리포: github.com/makethiswon-gif/macdee · main 브랜치, 전부 푸시됨
- 스택: Next.js 16 App Router · React 19 · Tailwind v4 · Supabase · Vercel

## 1. 브랜드 전제 (틀리면 안 되는 사실)

- 브랜드는 **MAKETHIS1 (메이크디스원)** 하나로 통일. macdee(맥디)는 회사가 만든
  AI 제품이며, 마케팅 사이트의 주인공에서 내려왔다. **제품과 앱(/dashboard,
  /login, 구독·결제)은 삭제 금지** — 살아있는 유료 서비스다.
- 포지셔닝: "로펌의 외부 마케팅 본부". 카피 축: **"로펌 마케팅에 필요한 모든 것,
  메이크디스원 하나로"**. ("하나의 팀이 끝까지 관리합니다"는 대표 지시로 폐기됨)
- 대표: **김원영** (법무법인 혜안·고구려·JY법률사무소 + 삼성메디슨·KT 마케팅).
  **Samsung Medison·KT는 실제 고객사이기도 하다** (소규모 대행 수행 — 대표 확인).
  파트너 목록에서 빼면 안 된다. 팀 6명 프로필은 `data/renewal/site.ts`.
- 설립연도는 **쓰지 않는다** — 기존 자산에 2019/2023/"7년+" 셋이 충돌, 미확정.
- §42 원칙: 가짜 수치·고객·후기·경력 생성 절대 금지. 보장 표현("1위 보장",
  "상위노출 보장", "AI 추천 보장") 금지. ChatGPT Ads 는 조건부 표현만.

## 2. 코드 지도

```
app/renewal/            페이지 12개 + layout + flags.ts + renewal.css + og.png
  page.tsx              홈: Hero → Problem → PartnerLogos → ClientJourney →
                        GlobalThread → CaseStudies → ServicesSection →
                        PlansSection → WhyMakethis1 → InvariantClause →
                        InsightsPreview → FinalCTA
  magazine/, magazine/[slug]/   INSIGHTS 리스킨 (교체 시 app/magazine 대체)
components/renewal/     공용 + home/ 섹션 컴포넌트. primitives.tsx 가 기본 어휘
data/renewal/site.ts    ★ 단일 소스: NAV·카피·팀·파트너·플랜(가격)·path() 헬퍼
data/renewal/services.ts  서비스 6페이지 내용 (정의→대상→문제→프로세스→지표→FAQ)
data/renewal/cases.ts   Case Study — 실데이터 3건 등록됨 (호남 로펌 외)
app/api/renewal/diagnose/  진단 폼 API (inquiries 테이블 재사용, 컬럼 추가 없음)
```

### 핵심 메커니즘 — 모르면 부순다

1. **`path()` + `DEMO_BASE`** (`data/renewal/site.ts`): 모든 내부 링크·canonical·
   og:url·sitemap 이 이 헬퍼를 통과한다. 데모 기간엔 `/renewal` 접두어,
   `DEMO_BASE = ""` 로 바꾸면 전 사이트가 최종 URL로 일괄 전환된다.
   **링크를 하드코딩하지 말 것** — 하드코딩 `/renewal` 은 DEMO_BASE 정의 한 곳뿐.
2. **`flags.ts` 색인 정책**: 일반 `robots` 메타는 **비워두고** googlebot·Yeti·
   bingbot 이름 지정 noindex만 단다. 3번 실패로 얻은 결론 —
   `X-Robots-Tag: noindex` 도, robots.txt `Disallow` 도 **OpenAI 계열 리더가
   본문 읽기를 거부하게 만든다** (ChatGPT "fetch 실패"). robots.txt 본문에
   `renewal` 문자열 자체를 넣지 말 것(주석도 파서가 오탐).
3. **모션**: framer-motion 미사용(의도). CSS + IntersectionObserver
   (`Reveal.tsx` 변형 5종) + `useScrollProgress`(rAF 1회, CSS 변수 --p만 씀).
   숨김 상태는 전부 `html.mt-js` 아래 — **JS 없이도 본문이 보여야 한다**
   (안 지키면 렌더링형 크롤러에 빈 화면이 나간다. 실제로 겪은 사고).
   `prefers-reduced-motion` 대응 필수. 가로 스크롤 방지는 `overflow-x: clip`
   (`hidden` 은 sticky를 깨뜨린다).
4. **canonical**: 루트 레이아웃에 canonical 절대 금지(하위 전체 상속 버그 —
   주석으로 박혀 있음). 페이지마다 자기 canonical + `title: { absolute }`
   (루트의 " | macdee" 템플릿 차단). 데모 매거진의 canonical 은 라이브
   `/magazine` 을 가리킨다(중복 색인 방지, 교체 후 무수정).
5. **`app/layout.tsx` 의 verification 메타 4건**(Google 2 + 네이버 2) **절대 삭제 금지**.
6. 디자인 토큰: `renewal.css` 의 `--mt-*`. 액센트 #3563AE(다크 위 #8AB4F8),
   다크면 #07111D. 금지: 그라데이션·그림자·이미지 위 글씨·장식 색막대·큰 라운드.

## 3. 교체 절차 (이미 확정 — RENEWAL_PLAN §6.2.1 원문이 기준)

대표 승인이 떨어지면: ① `DEMO_BASE=""` → ② 디렉터리 이동(컴포넌트 무수정,
기존 홈은 `_legacy/` 보관) → ③ 레이아웃 병합(renewal.css·헤더/푸터를 루트로,
배지·flags 제거, macdee 스키마 걷어내기, verification 유지) → ④ 리다이렉트
(§4.3 표: `/makethisone`→`/`, `/renewal/*`→`/` **필수**, `/insights`→`/magazine`;
`/makethisone/subscribe` 예외를 와일드카드보다 먼저) → ⑤ 배포 검증 →
⑥ GSC·네이버 재제출.

**보존 목록(§6.2.2, 대표 지시)**: 관리자 전체(/admin/*), AI 맥디 제품 전체
(/dashboard 등), /blog/*, /site/*, 매거진 slug, 기존 리다이렉트 18건 — 무변경.

## 4. 검증 습관 (이 프로젝트에서 실제로 쓴 것)

```bash
npx tsc --noEmit -p tsconfig.json     # 타입
npm run build                          # 정적 생성 확인 (renewal 전 페이지 ○)
# 링크 전수: 홈 HTML에서 href 뽑아 로컬 3000에 curl — 내부 79개 전수 200 이력
# 크롤러 검증: curl -A "ChatGPT-User" 로 원본 HTML에 Hero 텍스트 존재 확인
# dev 서버는 .next/dev/lock 으로 단일 인스턴스 — 죽은 node 가 남으면 npx kill-port 3000
```

배포는 push → Vercel 자동. 커밋 메시지는 한국어, 본문에 "왜"를 남기는 관행.

## 5. 미해결 (열려 있는 것)

| 항목 | 상태 |
|---|---|
| **루트 교체 실행** | 절차 확정, **대표 승인 대기** — 이게 다음 큰 일 |
| 운영 정책 7건 (§10.1) | 온보딩 기간·회의 주기·검수 절차·데이터 보관·이관·이해상충 — **미확정이라 페이지에 안 씀**. 확정되면 FAQ/How-we-operate 에 반영 |
| How We Operate 의 Design/CRO·Data 담당 | 실명 미확인 — 확인 전 역할 추가 금지 |
| 푸터 "고객 로그인" | 새 포지셔닝과 어색하나 구독자 경로라 유지 중 — 대표 판단 대기 |
| 설립연도 | 3개 값 충돌 — 확정 전 스키마·카피에 쓰지 않음 |
| `/terms` title 중복 | 기존 버그(" | macdee | macdee…"), 범위 밖이라 미수정 |
| 교체 후 SEO | 신규 서비스 페이지들은 색인 제로에서 시작 — 당분간 유입은 매거진 91편 |

## 6. 관련이지만 별개인 작업 (건드릴 때 주의)

- 블로그 카드/정보그래픽 파이프라인(`lib/brand-visual.ts`,
  `lib/blog-images/design-dna.ts`·`infographic.ts`)이 renewal 과 같은 시각
  규율을 공유한다. renewal.css 토큰을 바꾸면 이쪽 톤도 함께 검토.
- 네이버 발행기(`publisher/publish.mjs`), 블로그 공장, 진단 리포트는 별도 트랙.
