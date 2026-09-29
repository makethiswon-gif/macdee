// Anthropic 모델 ID 를 한 곳에서 정한다 — 2026-09-29 Sonnet 5 → Sonnet 5.5 전환.
// 단가는 lib/ai/pricing.ts, 요청 규칙의 모델별 차이는 아래 minimalThinking 주석에 있다.
//
// 되돌릴 때: SONNET_MODEL 만 "claude-sonnet-5" 로 바꾸면 minimalThinking 도 자동으로 예전 값({type:"disabled"})으로 돌아간다.
// (두 값은 짝이다: 5.5 에서 disabled 는 400, Sonnet 5 에서 between_tools 는 400 — 2026-09-29 count_tokens 로 확인.)
export const SONNET_MODEL = "claude-sonnet-5-5";

/** 블로그 원고·부분 수정·이미지 구성안 기획·주제 추천이 함께 쓰는 모델. */
export const BLOG_WRITING_MODEL = SONNET_MODEL;

const SONNET_5_5 = /^claude-sonnet-5-5\b/;

/**
 * 사고를 최소로 하는 요청값(정형 JSON 처럼 사고가 필요 없고, 켜 두면 max_tokens 를 먹어 응답이 잘리는 호출용).
 *  - Sonnet 5.5: { type: "between_tools" } — 도구가 없는 요청은 사고 없이 바로 답한다. effort high 이하에서만 허용되고
 *    display·budget_tokens 같은 다른 필드와 함께 보내면 400. { type: "disabled" } 는 400.
 *  - 그 이전 모델(Sonnet 5 등): { type: "disabled" }.
 */
export function minimalThinking(model: string): { type: "between_tools" } | { type: "disabled" } {
    return SONNET_5_5.test(model) ? { type: "between_tools" } : { type: "disabled" };
}
