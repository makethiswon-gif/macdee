// Anthropic 모델 ID 를 한 곳에서 정한다 — 2026-09-29 Sonnet 5 → Sonnet 5.5 전환.
// 단가는 lib/ai/pricing.ts, 요청 규칙의 모델별 차이는 아래 minimalThinking 주석에 있다.
//
// 되돌릴 때: SONNET_MODEL 만 "claude-sonnet-5" 로 바꾸면 minimalThinking 도 자동으로 예전 값({type:"disabled"})으로 돌아간다.
// (두 값은 짝이다: 5.5 에서 disabled 는 400, Sonnet 5 에서 between_tools 는 400 — 2026-09-29 count_tokens 로 확인.)
export const SONNET_MODEL = "claude-sonnet-5-5";

/**
 * Opus 5.5 — 2026-10-11 대표 지시로 블로그 발행의 모든 Claude 호출이 쓰는 모델.
 * 단가 입력 $4·출력 $20 /백만 토큰(Sonnet 5.5 의 2배). 사고를 끌 수 없다: thinking disabled·between_tools·budget_tokens 가 모두 400 이고
 * (2026-10-11 실제 호출로 확인) 깊이는 output_config.effort 로만 정한다. effort 기본값은 medium 이라 호출마다 명시한다.
 * 되돌릴 때: BLOG_WRITING_MODEL 을 SONNET_MODEL 로, BLOG_EFFORT 를 "high" 로 바꾸고 유료 응답 ID 버전은 올려 둔 채 둔다.
 */
export const OPUS_MODEL = "claude-opus-5-5";

/** 블로그 발행(주제 추천·원고·부분 수정·표지 구성안 기획)이 함께 쓰는 모델. 표지 사진은 OpenAI(BLOG_PHOTO_MODEL)라 이 값과 무관하다. */
export const BLOG_WRITING_MODEL = OPUS_MODEL;

const SONNET_5_5 = /^claude-sonnet-5-5\b/;
const OPUS_5_5 = /^claude-opus-5-5\b/;

/**
 * 사고를 최소로 하는 요청값(정형 JSON 처럼 사고가 필요 없고, 켜 두면 max_tokens 를 먹어 응답이 잘리는 호출용).
 *  - Sonnet 5.5: { type: "between_tools" } — 도구가 없는 요청은 사고 없이 바로 답한다. effort high 이하에서만 허용되고
 *    display·budget_tokens 같은 다른 필드와 함께 보내면 400. { type: "disabled" } 는 400.
 *  - 그 이전 모델(Sonnet 5 등): { type: "disabled" }.
 */
export function minimalThinking(model: string): { type: "between_tools" } | { type: "disabled" } {
    return SONNET_5_5.test(model) ? { type: "between_tools" } : { type: "disabled" };
}

/**
 * 글을 쓰고 고치는 호출(블로그 원고·부분 수정·로펌 리서치)의 노력 단계. 2026-09-29 대표 지시로 medium → high(Sonnet 5.5 의 기본값과 같다).
 * 2026-10-06 실측: 5.5 의 high 는 원고 한 편에 사고만 2만 토큰을 넘게 쓴다(두 건 모두 사고 20,000·본문 0자로 끊김, 초당 약 124토큰).
 * 대표 결정은 "품질 우선, 토큰은 늘려도 된다" — 그래서 high 를 유지하고 원고 한도 64,000·800초, 부분 수정 32,000·600초, 스트리밍으로 받는다.
 * 비용은 원고 한 편 약 $0.3~0.6(출력 3~6만 토큰 × $10/백만), 시간은 보통 3~7분. 그래도 끊기면 이 값을 "medium" 으로 내린다.
 * 이미지 구성안 기획(visual-planner)은 스키마에 묶인 JSON 이고 거의 안 쓰는 대체 경로라 올리지 않았다(high 유지).
 */
export const WRITING_EFFORT = "high" as const;

/**
 * 블로그 원고·부분 수정의 노력 단계 — 2026-10-11 대표 지시로 high → xhigh(Opus 5.5 와 함께).
 * 로펌 리서치(Sonnet 5.5)는 WRITING_EFFORT 를 그대로 쓴다. xhigh 는 사고를 더 오래 하므로 원고 호출은 한도 96,000 토큰·760초·스트리밍이다.
 * 원고 한 편이 760초 안에 안 끝나면 "응답 시간이 초과됐습니다"로 멈추고 자동 재요청은 하지 않는다 — 그때는 이 값을 "high" 로 내린다.
 */
export const BLOG_EFFORT = "xhigh" as const;

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;
/** 한 단계 낮은 노력 단계(low 는 더 내릴 곳이 없어 null). 블로그 원고가 출력 한도에서 끊겼을 때 한 번 다시 쓰는 단계다(xhigh → high). */
export function lowerEffort(effort: string): string | null {
    const i = EFFORT_LEVELS.indexOf(effort as (typeof EFFORT_LEVELS)[number]);
    return i > 0 ? EFFORT_LEVELS[i - 1] : null;
}

/**
 * 짧은 정형 JSON 호출(주제 추천)에 섞어 보내는 '가볍게' 요청 필드. 모델마다 사고를 줄이는 방법이 다르다.
 *  - Opus 5.5: 사고를 끌 수 없으므로 thinking 을 빼고 effort low 로 대신한다.
 *  - 그 밖(Sonnet 5.5 등): minimalThinking 값.
 * 요청 본문에 `...lightCall(model)` 로 펼친다.
 */
export function lightCall(model: string): { thinking?: { type: "between_tools" } | { type: "disabled" }; output_config?: { effort: "low" } } {
    return OPUS_5_5.test(model) ? { output_config: { effort: "low" } } : { thinking: minimalThinking(model) };
}
