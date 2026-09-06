# 블로그 이미지 V6 — 2026-09-06

## 목적과 범위

`/admin/blog-images`의 썸네일·정보 정리·요약 안내를 네이버 본문 삽입용으로 개편했다. 자유 생성 HTML을 브라우저에서 찍던 구조를 서버에서 완성한 PNG를 전달하는 구조로 교체했다. 같은 API를 쓰는 `/admin/blog-publish`, `/admin/blog-factory`의 이미지 전달 부분만 함께 변경했다. 리뉴얼 마케팅 페이지, 유료 제품, 원고 생성 모델, DB 스키마, 고객 원고·발행 데이터는 변경하지 않았다.

## 확인된 원인

- 변호사 ID를 해시한 기존 DNA의 3가지 이미지 정책 중 2가지는 사진을 금지했다. 사용자가 사진을 원해도 빈 타이포형 썸네일이나 상황 이미지 생략으로 이어졌다.
- 800×1000 카드가 있어도 이미지 관리자와 블로그 공장은 800×800으로 미리보기·캡처했다.
- 관리자 미리보기는 컨테이너 실측 대신 고정 배율이었다.
- 요약 안내는 모델이 매번 HTML/CSS까지 작성했다. 폰트·이미지 로딩과 캡처 시점에도 의존했다.
- 기존 화면의 모델·소요 시간 설명은 실제 코드와 달랐다.
- 개편 실호출 검증 중에는 정상 PNG를 native canvas가 `Invalid SVG image`로 거부하는 사례도 재현했다. Sharp에서 표준 sRGB PNG로 정규화한 뒤 합성하도록 수정했다. 이미지 모델을 재호출할 필요가 없는 디코더 문제였다.

## 새 역할 분담

1. 사진: GPT Image 2로 주제에 맞는 허구의 자료사진을 생성하거나, 등록된 실제 사무실 사진을 사용한다.
2. 내용: 기존 Claude Sonnet 5로 원문에서 정보 구조와 요약만 JSON으로 추출한다. 없는 법률 기준·금액·기한·성과를 만들지 않도록 지시한다. 최종 법률 검수는 여전히 필요하다.
3. 디자인: 정해진 Canvas 템플릿이 한글·사진·공식 로고를 합성한다. 사진에 제목을 얹지 않고 면을 분리한다.
4. 출력: 가로 1024px, 내용에 따라 높이 가변. 배경은 불투명. 글자를 임의로 잘라 넣지 않는다. 1장 PNG 2.5MB 이하로 제한한다.
5. 미리보기·개별 저장·ZIP·발행 저장은 동일한 PNG를 사용한다. 클라이언트 재캡처가 없다.

기본은 썸네일·정보·요약 3장. 본문 자료사진은 선택 시 1장 추가한다. 변호사별 등록 브랜드 컬러·로고·사진을 사용하며, 임의 ID로 사진 사용을 금지하지 않는다. 실제 사무실 사진 옵션은 사진 생성 비용이 없지만 정보·요약의 텍스트 모델 비용은 별도다.

## 모델 선택과 비용

사진 모델은 `gpt-image-2`, 1536×1024, `background: opaque`, PNG. 기본 품질 high, 관리자에서 medium 선택 가능. OpenAI 공식 최신 이미지 모델 문서와 API 규격을 확인하고, 이 프로젝트가 이미 사용하는 OpenAI API 경로와의 운영 단순성까지 고려해 선택했다. 모든 타사 모델과 품질·속도를 실측 비교한 결과라는 뜻은 아니다.

- [GPT Image 2 모델](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Images API 사용·크기·가격 안내](https://developers.openai.com/api/docs/guides/image-generation)
- 대안 검토: [Gemini 이미지 모델](https://ai.google.dev/gemini-api/docs/image-generation), [FLUX.2](https://docs.bfl.ai/flux_2/flux2_overview)

2026-09-06 공식 표의 1536×1024 이미지 출력비 예시: high $0.165, medium $0.041/장. 프롬프트 입력과 텍스트 추출 비용은 추가되며 실제 청구·환율·계정 한도는 별도다. 같은 요청을 타임아웃 후 자동 재실행하거나, 구형 모델로 몰래 대체하지 않는다.

필수 설정: 사진 생성 `OPENAI_API_KEY`, 내용 정리 `ANTHROPIC_API_KEY`. 인증은 기존 관리자 인증을 그대로 사용한다. 키나 로그인 정보를 소스·보고서에 저장하지 않는다.

## 파일 지도

- `app/admin/blog-images/page.tsx`: 입력·사진 방식·품질·카드별 진행/오류/재시도·미리보기·PNG/ZIP.
- `app/api/admin/blog-images/generate-design/route.ts`: 입력 검증, 내용 추출, 사진/렌더러 연결. Node 런타임, 최대 180초.
- `lib/blog-images/photo-generator.ts`: 주제별 자료사진 프롬프트, GPT Image 2 호출. 실고객 사건을 재현한 사진으로 오인시키지 않는다.
- `lib/blog-images/editorial-renderer.ts`: 로컬 한글 폰트, 실측 줄바꿈, 동적 높이, 원본 로고/사진, 불투명 PNG.
- `lib/blog-images/card-types.ts`: 완성 이미지 응답 형식과 삽입 위치.
- `lib/blog-images/infographic.ts`: 데이터 파서. 2항목 허용, 잘못되거나 과도하게 긴 설명을 조용히 버리지 않고 오류 처리.
- `next.config.ts`: 이 API의 서버 패키지에 로컬 한글 폰트 포함.
- `app/admin/layout.tsx`: 이미지 스튜디오에서만 모바일 메뉴로 전환해 가로폭 확보.

응답의 `card.imageDataUrl`, `width`, `height`, `altText`, `placement`, `model`, `warnings`, `designVersion`을 사용한다. 이전 `card.html` 응답을 전제로 한 열린 관리자 탭은 배포 후 새로고침해야 한다.

원격 브랜드 자산은 설정된 Supabase의 공개 스토리지 주소와 업로드된 PNG/JPEG/WebP만 허용한다. 외부 임의 URL·내부 주소는 서버에서 가져오지 않는다. 로고·프로필이 실패하면 경고를 반환한다. 사진 생성 실패를 사진 없는 완성본으로 위장하지 않는다.

## 검증 결과

- 전체 TypeScript 검사 통과.
- Next.js production build 통과(정적 페이지 130개 생성).
- `npm run test:blog-images`: 정보 카드 5종, 2항목, 6항목 긴 비교, 요약, 이미지 크기·불투명 배경·용량, 인증/입력 검증, 임의 URL 거부, 429 시 자동 중복 호출 금지, 정상 생략과 파싱 오류 구분.
- 실제 API: 가상 전세보증금 원고로 GPT Image 2 사진을 생성하고 썸네일 완성. 실제 텍스트 추출을 포함한 정보·요약 카드 완성. 테스트는 고객 DB를 저장·수정하거나 발행하지 않았다.
- `scripts/test-blog-images-ui.cjs`: 로컬 화면/API 가상 응답으로 부분 실패→한 장 재시도→미리보기→PNG 바이트 동일성→ZIP 검증. 1440px 데스크톱과 390px 모바일, 페이지 오류 없음.
- 편집기·생성 API·새 모듈의 ESLint 오류 없음. 기존 `app/admin/layout.tsx`의 로그인 effect 내 동기 setState 규칙 오류는 변경 전 코드에도 있는 항목이며 인증 동작 변경은 이번 범위에서 제외했다.
- 결과/화면 캡처: `C:\클로드\blog-images-qa`. 모두 가상 검수용 원고·프로필이며 실제 고객 사례 자료가 아니다.

## 실행

```text
npm run test:blog-images
node scripts/test-blog-images.cjs --out <검수결과폴더>
node scripts/test-blog-images-ui.cjs <검수결과폴더>
```

UI 검증은 localhost 3100의 개발/빌드 서버가 필요하다. 모든 관리자 API를 가상 응답으로 대체한다. `--live`는 유료 사진 1회와 텍스트 추출 2회를 요청할 수 있으므로 의도적으로 사용할 때만 실행한다. `--live --reuse-photo`는 이미 저장한 모델 사진을 재사용한다.

공개 배포·Git 커밋·푸시는 하지 않았다. 기존 사용자 변경 `.gitignore`, `docs/AUTOPILOT_SPEC.md`, `supabase/.temp/`는 보존했다. 네이버 실제 발행과 운영 DB 업로드는 이번 검증에서 실행하지 않았다.
