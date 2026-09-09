import { BLOG_CARD_TYPES, type BlogImageCard } from "./card-types";

/** Shared UI policy; the upload API additionally verifies the server signature. */
export function imageReady(card: BlogImageCard | undefined): boolean {
    return !!card && card.designVersion === "editorial-v11" && card.layoutChecks?.passed === true
        && card.designReview?.status === "pass" && !!card.releaseToken && !!card.setId;
}
export function imageSetReady(cards: BlogImageCard[]): boolean {
    return cards.length === 4 && cards.every(imageReady) && new Set(cards.map((c) => c.setId)).size === 1
        && BLOG_CARD_TYPES.every((type) => cards.some((c) => c.type === type));
}

export function imageHoldReason(card: BlogImageCard): string {
    if (card.layoutChecks && !card.layoutChecks.passed) return card.layoutChecks.issues.join(" ");
    if (card.designReview?.status === "unavailable") return "검수 대기 · 생성 이미지는 보존되어 있습니다.";
    if (card.designReview?.repair === "content") return "원문·표현 확인 필요 · 구성안을 수정해주세요.";
    if (card.designReview?.repair === "art") return "시각물 수정 필요 · 검수 의견을 반영해 재생성해주세요.";
    return card.designReview?.summary || "품질 검수가 필요합니다.";
}
