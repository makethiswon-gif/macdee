# 운영 홈페이지 전환 — 2026-09-07

대표가 “makethis1.com 메인페이지를 수정한 리뉴얼 페이지로 대체, 관리자는 보존, 안내도 병합”을 승인했다. 이 승인은 과거의 main 병합 금지/승인 대기를 대체한다.

## 공개 경로

- `/`: D 키네틱, 블루/화이트, 미니멀 카피, 강화된 마우스 모션.
- `/upgrade`: 기존 고객 통합 상품 전환 안내. STANDARD 월 250만원·블로그 20회, GROWTH 월 500만원·유튜브 20회(쇼츠 12회 포함)·촬영/편집 포함.
- `/consult`: 마케팅 상담. 기존 제품 `/diagnose`와 충돌하지 않도록 분리.
- 서비스 6개·서비스 허브·about/work/contact·매거진 리스킨은 최종 루트 경로로 제공.
- `/renewal` → `/`, `/renewal/upgrade` → `/upgrade`, `/renewal/diagnose` → `/consult`. 나머지 이전 페이지는 대응 경로로 301. 상품 선택 query와 앵커 유지.
- 시안 경로는 홈으로 이동. `/insights`와 기사 경로는 `/magazine`으로 이동.

## 구현·보존

- 승인된 리뉴얼 파일을 단일 소스로 재사용하는 `(marketing)` 전용 레이아웃/진입점을 추가했다. 관리자·제품에 마케팅 헤더/푸터가 끼지 않는다.
- 홈은 기존 `app/page.tsx` 진입점을 유지한다. 숨겨져 있던 `(dashboard)/page.tsx`와 루트 그룹 충돌을 피하고 제품 파일은 보존했다.
- 기존 홈·about·매거진 표현 파일은 라우트가 생기지 않는 `app/_legacy/`에 보관했다. Git의 운영 전 기준은 `00f3662`.
- 최신 main의 블로그 이미지 V10.4를 그대로 채택했다. 관리자·API·lib·대시보드·인증·포털·고객 블로그/사이트·결제·middleware·기존 자산·의존성은 운영 기준과 동일하다.
- 매거진 slug/DB 변경 없음. 최신 main의 query 중복 URL noindex 정책은 리스킨에도 이식했다.
- 기존 `/makethisone/subscribe`, 구독 성공, 구매 성공, 팀 이미지 등 자산은 유지한다. `/makethisone` 및 실제 옛 index.html만 홈으로 301하며 위험한 전체 와일드카드는 쓰지 않는다.
- 공개 페이지의 DEMO 배지/검색 제외 메타를 제거했다. 페이지별 canonical, 서비스/상담/안내 sitemap 및 llms.txt를 새 홈페이지 기준으로 전환했다. Google·네이버 인증 4개, 기존 redirect 15개는 보존한다. 과거 문서의 18개 수치는 실제 config와 달랐다.
- 주소 전환 검수에서 `/#plans`가 하위 페이지의 `#plans`로 바뀌는 path() 오류를 수정하고 회귀 단언을 추가했다.
- `public/renewal`의 글꼴·시안 이미지 자산은 원래 경로를 유지한다. `/renewal/*` 전체 wildcard 대신 실제 페이지와 매거진 기사에만 301을 적용하며, 모든 정적 자산이 리다이렉트 없이 200인지 별도 검증한다.
- 운영 전환 자체는 고객의 요금·계약을 자동으로 바꾸지 않는다. 매체비 별도, VAT·SNS 수량·촬영 일정 등의 기존 협의 조건은 그대로다.

## 검증 방법

- `npx tsc --noEmit`, `npm run build`.
- `QA_PRODUCTION=1 node scripts/test-renewal-rollout.cjs`: 15개 페이지 × PC1440/모바일375 × 일반/JS차단/reduced, 원본 HTML/전체 내부 링크/앵커, CLS/LCP, 모의 폼, 확대 표시.
- `QA_PRODUCTION=1 node scripts/test-renewal-upgrade.cjs`: 사실 보호, STANDARD/GROWTH 안내→상담 선택/가격 메모, 키보드 이동, 4회 모의 제출.
- `node scripts/test-renewal-pointer.cjs`: 정적 제목, 확대된 포인터 이동, 정지/이탈/접근성/터치.
- `node scripts/test-renewal-cutover.cjs`: 운영 기능 파일 비교, 4개 인증 메타, 15개 기존 redirect 보존, 신규 301/query, 실제 기사 3개, 관리자 로그인·제품 동선, sitemap/색인.
- 로컬 QA 서버만 `RENEWAL_QA_READ_ONLY=1`로 실행해 매거진 조회수 기록을 막는다. 테스트 문의는 브라우저에서 가로채고 실제 접수·이메일·고객 업로드·결제는 하지 않는다.
- 증거 폴더: `C:/클로드/renewal-cutover-qa/`. 최종 결과는 `final-assets/`, `upgrade/`, `pointer/`, `cutover-report.json`.

## 최종 로컬 결과

- 타입 검사 및 production 빌드 통과(152개 정적 페이지 생성). 기존 middleware 명칭 변경 안내 경고 외 빌드 오류 없음.
- 최종 실제 production 서버에서 15개 경로 × 2개 너비 × 3개 모드 = 90개 화면 검사 통과. 모든 페이지에서 승인된 브랜드 글꼴의 실제 로딩까지 검증.
- ChatGPT-User 원본 HTML 15개, 내부 링크/앵커 85개 통과. 공개 마케팅 페이지 색인 허용 및 자기 canonical 확인.
- 초기/스크롤 후 측정 CLS 0, 가로 넘침 0, 숨겨진 본문 0, 실행 중 reduced 애니메이션 0, JS 오류·이미지/폰트/스타일/스크립트 HTTP 오류 0.
- 200% 상당 확대 5개 경로, 폼 모의 성공·검증·오류·JS차단 4개 시나리오 통과. PC/모바일의 STANDARD/GROWTH 4회 추가 모의 제출에서 상품명/가격/사용자 메모 보존.
- 정적 디자인 자산 94개 모두 리다이렉트 없이 200. OG PNG 정상. 포인터 좌우 이동 108.416px, 정적 제목 유지, 정지·이탈·reduced·터치 확인.
- 관리자·제품·API 등 보호 파일은 최신 운영 `00f3662`와 동일. 관리자 미인증 진입 차단, 고객 로그인, 포털 스타일 분리, 기존 결제 URL, 인증 메타 4개, 실제 매거진 3편과 301 이동 검증 통과.
- 구현: `5a6fc7f`. 정적 자산 리다이렉트 보호: `28807fb`. 이전 운영 화면은 `_legacy/` 보관.

## 배포·복구

GitHub main에 검증한 통합본을 일반 push하면 기존 Vercel 연동이 운영 배포한다. 강제 push는 사용하지 않는다. main 작업 폴더의 미추적 `_probe2.mts`는 건드리지 않는다.

문제가 발생하면 `00f3662`와 전환 커밋을 비교해 마케팅 전환만 되돌리는 새 커밋을 만든다. 관리자 최신 변경을 통째로 과거로 되돌리는 reset/force push는 금지한다. 기존 화면은 `_legacy/`와 Git에 보관되어 있다.

Search Console·네이버 서치어드바이저 재제출은 계정 작업을 하지 않았으므로 미실행이다. 공개 sitemap은 새 URL을 제공한다.
