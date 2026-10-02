# 클로드 구독 작업기 (2026-09-29)

블로그 발행 화면(`/admin/blog-publish`) 맨 위 **AI 실행 · API 크레딧 / 클로드 구독** 선택. 구독을 고르면 Claude 호출을 API 대신 대표 PC 에 로그인된 Claude Code(구독)로 처리한다.

## 동작
웹 서버(Vercel)는 구독 로그인을 쓸 수 없다. 그래서 서버는 작업을 Supabase 비공개 저장소 `owner-briefings/claude-subscription/` 대기열에 넣고, 대표 PC 의 **작업기**가 가져가 `claude -p` 로 처리해 결과를 돌려놓는다. 서버 쪽은 `lib/ai/subscription-relay.ts`, 작업기는 `scripts/claude-subscription-worker.mjs`.

| 화면 기능 | 구독 적용 | 비고 |
|---|---|---|
| 원고 생성·재창작 | O | 보통 2~4분. 서버 대기 한도 285초 |
| 부분 수정 | O | |
| 주제 추천 | O | 작업기가 꺼져 있으면 기본 후보로 대신하지 않고 오류로 알림 |
| 표지 기획(모델 호출이 필요한 경우만) | O | 원고 응답의 표지 브리프가 있으면 원래 AI 호출이 없다 |
| 표지 원본 이미지 | X | OpenAI API — 그대로 유료 |

## 켜기
`C:\클로드\claude-subscription-worker\start.cmd` 실행(창을 켜 두는 동안만 동작). 화면의 "● 내 PC 작업기 연결됨"이 초록이면 준비된 것.
전제: 이 PC 에서 `claude` 가 구독 계정으로 로그인돼 있을 것(`claude auth status` → claude.ai). 작업기는 시작할 때 이를 확인한다.
저장소의 작업기를 고치면 `C:\클로드\claude-subscription-worker\` 의 사본도 같이 바꾼다.

## 안전 장치
- Claude Code 는 `--tools ""`(도구 없음) + `--safe-mode`. 붙여넣은 글에 "PC 에서 명령을 실행하라"가 있어도 실행하지 못하고, 개인 CLAUDE.md·메모리·스킬도 섞이지 않는다(시험: 주입 문구는 요약만 하고 무시).
- `ANTHROPIC_API_KEY` 는 자식 프로세스에서 지운다(남아 있으면 구독이 아니라 API 로 과금된다).
- 작업기가 꺼져 있으면(생존 신호 45초 초과) 서버는 유료 작업 잠금을 걸기 전에 503 으로 알린다.
- 작업 ID 는 API 와 분리(`engineOperationId`). API 실패(예: 크레딧 소진 429)가 보존돼 있어도 구독으로 새로 처리된다. API 경로의 ID 는 예전 그대로다.
- 서버가 시간 초과로 끝나도 작업기는 `blog-paid-operations/{id}/response.json` 에 결과를 남긴다 → 화면의 "저장된 원고 응답 복구(무료)"로 받는다.
- 원고 본문은 작업기 로그에 남기지 않는다(단계·시간·토큰 수만). 로그: `%LOCALAPPDATA%\macdee-claude-worker\worker.log`.

## 한계
- PC 가 꺼졌거나 절전이면 구독 실행은 불가(API 로 전환).
- 구독 사용량(5시간·주간 한도)이 줄어든다. 한도에 걸리면 화면에 초기화 시각과 함께 표시된다.
- 구독 응답에는 사고 토큰 분리 수치가 없어 비용 패널에 사고 토큰이 0으로 나온다. 금액은 0원(구독)으로 표시한다.
- 동시 처리 기본 2건(`--concurrency`).

## 시험
`node scripts/test-claude-subscription.cjs` — 가짜 저장소·가짜 작업기로 대기열 왕복, 미수령 회수(504), 오프라인 503, 복구, 한도 메시지, 원고·수정·주제 라우트, 비용 0원.
