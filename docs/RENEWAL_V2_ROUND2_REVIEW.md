# Renewal V2 — Round 02 / 움직임과 화면 구조의 재설계

2026-09-07. 대표 선택 전 **히어로 코드 프로토타입** 단계. 전체 페이지 적용·main 병합·프로덕션 배포는 하지 않는다.

## 비교

| 시안 | 한 줄 정의 | 시그니처 | 주요 위험 |
|---|---|---|---|
| D / TYPE IN CONTROL / 키네틱 타이포 | 활자 자체가 화면 전체를 점유하는 마케팅 선언 | 화면 크기의 ‘모든 것.’, 입체 활자 벨트, 스크롤 원근·포인터 기울기 | 브랜드 스튜디오처럼 읽힐 수 있어 후속 업무·운영 사례가 중요 |
| E / ONE OPERATING FIELD / 오비탈 필드 | 여섯 업무가 하나의 공간에서 함께 움직이는 운영 필드 | 화면을 넘어서는 6개 궤도, 서비스 hover/키보드 초점에 대응하는 회선 강조 | 추상적 기술 기업으로 보일 수 있어 실제 업무명이 반드시 함께 보여야 함 |
| F / OPEN THE WHOLE / 아퍼처 | 대각선 빛의 틈이 열리는 건축적 장면 | 정적인 전용 3D 배경 위 셔터 개방, 광선 스캔, 밝은 업무 영역으로 전환 | 하드웨어·영상 브랜드 인상이 강할 수 있음 |

### D — 디자인 원리 5개

1. 활자를 작은 설명 영역이 아닌 화면의 구조로 사용한다.
2. 확정 문장의 ‘모든 것.’을 화면 크기로 확대한다.
3. 업무 영문명은 장식용 SVG 벨트에서 움직이고 실제 서비스 링크는 고정한다.
4. 붉은 화면·검은 활자·밝은 업무 면의 극단적 크기 대비를 사용한다.
5. 데스크톱 상담 버튼은 오른쪽 여백에, 모바일은 설명 직후에 배치한다.

### E — 디자인 원리 5개

1. 작은 중앙 배지 대신 화면 가장자리 밖으로 잘리는 운영 필드를 만든다.
2. 서로 다른 여섯 궤도가 공통 공간에서 돌아간다. 가짜 성과 지표는 없다.
3. 검붉은 공간과 밝은 리본을 대비시켜 깊이를 만든다.
4. 서비스에 포인터·키보드 초점을 주면 해당 궤도만 선명해진다.
5. 업무 링크는 움직이지 않으며 모바일에서는 두 열로 재배치한다.

### F — 디자인 원리 5개

1. 작은 아이콘 대신 화면을 가로지르는 대각선 공간을 사용한다.
2. 전용 생성 그래픽의 표면과 빛으로 물성을 만든다.
3. 이미지 자체는 정지시켜 LCP를 안정화하고, 앞쪽 반투명 셔터만 스크롤에 반응한다.
4. 확정 제목·본문·상담 버튼은 처음부터 보이고 마스크와 분리한다.
5. 푸른 반짝임은 한 영역에 제한하며 모션 감소 설정에서는 정지 장면을 제공한다.

## 구현 범위와 보존

- 신규: `/renewal/concepts/kinetic`, `/orbit`, `/aperture`.
- 비교 허브 `/renewal/concepts`를 두 번째 실험 화면으로 교체.
- 기존 A/B/C(`/editorial`, `/cinema`, `/blueprint`) 보존.
- 원본 `/renewal`, 서비스 페이지, 관리자, 매거진 slug, 제품 페이지는 수정하지 않음.
- 히어로 제목·본문·CTA·업무명·실제 수치는 기존 카피/데이터 그대로 사용.
- `data/renewal/*.ts`, robots flags, 루트 verification, 기존 canonical 정책, 의존성/lockfile 무변경.
- 신규 페이지 canonical은 페이지별 absolute. 내부 마케팅/비교 링크는 `path()` 사용.
- 모든 정보는 서버 HTML에 존재. 움직임은 aria-hidden 장식에만 적용.
- 수동 일시정지·실시간 reduced-motion 변경·장식 영역이 화면 밖으로 벗어날 때 정지·탭 가림 상태 정지 처리.
- 모션은 CSS transform/opacity와 이벤트당 rAF 갱신. 지속적인 JS 프레임 루프·스크롤 가로채기 없음.
- 헤더/푸터 색상 및 폰트 오버라이드는 새 시안/비교 허브에만 한정.

## 작업 격리

공유 원본 폴더에서 다른 세션이 main 작업을 재개한 것을 감지하여, 이번 변경만 전용 worktree로 이동했다.

- 디자인 브랜치: `design/renewal-v2`
- 전용 작업 폴더: `C:/클로드/renewal-v2-verify-20260907`
- 원본 폴더: `C:/Users/incbc/.gemini/antigravity/scratch/macdee` — 다른 Claude 세션의 main 작업과 분리.
- 원본의 사용자 임시/미추적 파일은 열거나 수정·커밋하지 않았다.
- 이번 작업은 main 커밋·병합·프로덕션 배포를 하지 않는다.

## 폰트·이미지

기설치 Pretendard의 라이선스된 가변 폰트 서브셋을 별도 `Renewal Study` CSS family로 재사용한다. 원본 파일은 변경하지 않는다. 새 의존성은 없다. `font-display: optional`과 히어로용 11개 서브셋(286,092 bytes) preload를 사용한다. 나머지 서브셋은 실제 사용하는 문자에 대해서만 요청된다. 저속 연결에서 시스템 폰트로 남을 수 있으며 늦은 교체보다 레이아웃 안정성을 우선한다. SIL OFL 전문은 `public/renewal/study-fonts/LICENSE.txt`에 포함했다.

아퍼처의 배경은 이미지 생성 스킬로 만든 추상 그래픽 1개다. 고객·사건·실제 시설 사진을 나타내지 않는다. 서비스 정보·카피는 HTML로 구현한다. Sites 스킬은 기존 구조/의존성 보존과 시각 검수에 적용했고, 호스팅은 대표 지시대로 Vercel 브랜치 프리뷰를 사용한다.

- 생성 방식: 내장 image generation, 새 이미지 1장.
- 원본: `C:/Users/incbc/.codex/generated_images/01a077a3-6caf-7972-bba4-5c1a1768955d/exec-afbe6dbd-771c-467b-b875-c8e01f3819ee.png`
- 프로젝트 자산: `public/renewal/studies/aperture.webp` (1536×1024, 127,888 bytes).
- 원본 구도는 유지하고 WebP quality 82로 인코딩. 디자인의 장면 개방은 브라우저의 반투명 도형으로 표현.

생성 프롬프트:

```text
Use case: stylized-concept
Asset type: abstract raster hero artwork for a bold motion-graphic law-firm marketing website; atmospheric artwork only.
Scene/backdrop: black charcoal void, subtle depth, large dark negative area at center-left reserved for a foreground headline added later in HTML.
Subject: a monumental diagonal aperture/slit made from EXACTLY SIX broad brushed-silver metal fins, in a close parallel sequence like a precision optical shutter, opening a dramatic razor-wide luminous icy-blue fissure.
Style/medium: high-end architectural CGI with photorealistic material depth, sculptural modernist restraint, precision-machined broad metal surfaces, polished reflections with very fine brushed grain.
Composition/framing: 1536x1024 landscape. Entire composition diagonal, enormous slit rising from lower-left to upper-right, extreme macro crop spanning the image edges. The graphic is strongest on the right half. Six broad fins have a clear stepped rhythm and substantial sculptural thickness; spacious charcoal region at center-left.
Lighting/mood: dramatic controlled studio lighting, silver highlights, a luminous icy-blue fissure, subtle cobalt reflections and a tiny cyan edge; powerful, architectural, restrained.
Constraints: one artwork, no text, no letters, no typography, no logo, no watermark, no UI, no website screenshot. No round torus, no spheres, no literal numeral 1, no lawyer, gavel, scales, or law-book clichés.
```

## 카피 변경 제안

없음. 새 이름·비교 설명·검토 메모는 대표 선택을 위한 시안 안내이며 홈페이지 영업 카피의 변경이 아니다.

## 다음 단계

대표가 D/E/F 중 방향과 모션 강도를 선택한 뒤에만 전 페이지로 확장한다. 세 방향을 무차별 혼합하지 않는다. 브랜치 프리뷰 검토와 main 병합 승인도 별도다.

## 최종 검증 기록

코드 기준 커밋: `2fc3c34d646456d05dff0cc488aff137991b7f7c`.

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npm run build` | 통과, 138개 정적 페이지 생성. 기존 middleware→proxy 권고 경고는 남아 있음 |
| 기존 홈·비교 허브·A/B/C | 1440/375 × 일반/JS 끔/reduced-motion, 30개 실행 통과 |
| 신규 D/E/F | 같은 조건 18개 실행 통과, 원문 카피 일치·가로 넘침 없음·숨겨진 히어로 정보 없음 |
| 내부 링크 curl | 홈 추출 24개 전부 200. 기존/비교 시안 합집합 31개 링크·앵커 통과. 신규 시안 추출 20개 링크도 전부 200 |
| `curl -A "ChatGPT-User"` | 홈/허브/A/B/C/D/E/F 8페이지 원본 HTML 확인. 히어로·본문 존재, 각 canonical absolute, 일반 robots noindex 없음, named-bot 정책 보존 |
| 초기 CLS | 신규 3시안 × 2해상도 × 일반/reduced-motion 전부 0 |
| 상호작용 중 CLS | 신규 3시안 × 2해상도 전부 0 |
| LCP | 일반 모드 6개 모두 정적인 제목 또는 정적인 배경. 로컬 측정 296~636ms — 실제 인터넷/실사용자 성능 보장이 아님 |
| 실제 모션 | 450ms 간격 transform/opacity/stroke 변화 + 500ms 간격 화면 픽셀 변화 확인 |
| 정지·복귀 | 키보드 정지→초점 이동 후 유지, 정지 중 스크롤·포인터, 재생, 장식 영역 offscreen 정지·복귀 통과 |
| 모션 감소 | 초기 설정, 실행 중 실시간 변경, 원복, 수동 정지 상태 보존 모두 통과 |
| 탭 가림 | `document.hidden` + `visibilitychange` 시뮬레이션에서 정지 프레임 확인. 네이티브 OS 탭 전환 실측이라고 주장하지 않음 |
| 키보드·메뉴 | 8개 메뉴/탐색 실행 통과. desktop dropdown/모바일 메뉴·Escape·비교 링크 확인. dropdown 본문 대비 15.52 이상, 설명 8.57 이상 |
| 보존 범위 diff | 이번 변경에서 원본 renewal 홈, data/renewal, flags, root layout, admin, SiteHeader/SiteFooter 원본 파일, package/lockfile 변경 없음 |

검수 과정에서 발견한 reduced-motion 라벨 교체에 의한 미세 CLS, 장식 활자의 모션 중 텍스트 레이아웃 이동, 늦게 교체되는 장식 화살표 글꼴, dropdown/푸터 테마 충돌을 수정한 뒤 위 테스트를 다시 실행했다.

### 로컬 확인

- 최종 production build: http://localhost:3101/renewal/concepts
- D: http://localhost:3101/renewal/concepts/kinetic
- E: http://localhost:3101/renewal/concepts/orbit
- F: http://localhost:3101/renewal/concepts/aperture
- 개발 서버: http://localhost:3102/renewal/concepts

### Vercel 브랜치 프리뷰

GitHub의 Vercel commit status 및 deployment status 모두 `success` 확인.

https://macdee-m26y51o3j-incbccc-7155s-projects.vercel.app/renewal/concepts

이 프리뷰는 기존 Vercel 접근 보호가 적용되어 비인증 curl 요청은 **302 → Vercel SSO**로 이동한다. 보호 설정은 변경하지 않았다. 위 HTTP/화면 검증은 동일 커밋의 로컬 production build 기준이며, 원격 인증 후 화면까지 검수했다고 주장하지 않는다.

### 결과 파일

- 신규 시안 18개 검증/1440·375 스크린샷: `C:/클로드/renewal-v2-round2-qa/verified/`
- 원본 및 A/B/C 30개 회귀 검증/스크린샷: `C:/클로드/renewal-v2-round2-qa/baseline-final/`
- 메뉴·비교 탐색 8개 검증/스크린샷: `C:/클로드/renewal-v2-round2-qa/navigation-final/`
- 각 폴더의 `report.json`에 상세 결과. 고객 데이터·폼 제출 없이 읽기 전용으로 검증했다.

대표 결정 필요: D/E/F 방향, 모션 강도, 선택안의 후속 운영 사례·서비스 면과 연결 방식. 아직 전 페이지 적용 또는 main 병합을 승인받은 상태가 아니다.
