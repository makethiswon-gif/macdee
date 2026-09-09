import { BLOG_CARD_TYPES, type BlogImageCard } from "./card-types";

/** Shared UI policy; the upload API additionally verifies the server signature. */
export function imageReady(card: BlogImageCard | undefined): boolean {
    return !!card && card.designVersion === "editorial-v11" && card.layoutChecks?.passed === true
        && !!card.releaseToken && !!card.setId;
}
export function imageSetReady(cards: BlogImageCard[]): boolean {
    return cards.length === 4 && cards.every(imageReady) && new Set(cards.map((c) => c.setId)).size === 1
        && BLOG_CARD_TYPES.every((type) => cards.some((c) => c.type === type));
}

export function imageHoldReason(card: BlogImageCard): string {
    if (card.designVersion !== "editorial-v11") return "현재 구성으로 이미지를 다시 제작해주세요.";
    if (!card.layoutChecks) return "레이아웃 검사 정보가 없습니다. 다시 처리해주세요.";
    if (!card.layoutChecks.passed) return card.layoutChecks.issues.join(" ") || "글자 배치를 확인해주세요.";
    return "이미지 저장 확인이 필요합니다. 다시 처리해주세요.";
}
