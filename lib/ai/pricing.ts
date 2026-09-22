// 코드 안 단가표(USD / 100만 토큰). 화면의 금액은 이 표로 계산한 "추정"이며 실제 청구액이 아니다.
// 갱신 2026-09-22 — Anthropic 공개 단가. 캐시 읽기는 입력의 0.1배, 캐시 쓰기(5분)는 1.25배.
// 이미지 모델(gpt-image)은 단가를 확인하지 못해 null 로 둔다: 토큰 수만 표시하고 금액은 "미확인"으로 보여 준다.
export const PRICING_UPDATED = "2026-09-22";

export interface TokenPrice { input: number; output: number; cacheRead: number; cacheWrite: number }
export const TOKEN_PRICES: Record<string, TokenPrice> = {
    "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
    "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
    "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export function tokenPrice(model: string): TokenPrice | null {
    return TOKEN_PRICES[model] || null;
}

/** 토큰 수 → 추정 USD. 단가를 모르는 모델은 null. */
export function estimateUsd(model: string, usage: { input: number; cacheRead: number; cacheWrite: number; output: number }): number | null {
    const price = tokenPrice(model);
    if (!price) return null;
    const usd = (usage.input * price.input + usage.cacheRead * price.cacheRead + usage.cacheWrite * price.cacheWrite + usage.output * price.output) / 1_000_000;
    return Math.round(usd * 10_000) / 10_000;
}
