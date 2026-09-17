import { cardTypesFor, EDITORIAL_SET_FORMAT, type BlogImageCard } from "./card-types";
import { STUDIO_INFO_REQUIRED_MESSAGE } from "../lawyer-studio/types";

export function editorialStudioPhotoMissing(card: BlogImageCard): boolean {
    return card.setFormat === EDITORIAL_SET_FORMAT && card.type === "info"
        && (card.studioPhotos?.length !== 1 || card.photoChecks?.source !== "studio");
}

/** Shared UI policy; the upload API additionally verifies the server signature. */
export function imageReady(card: BlogImageCard | undefined): boolean {
    return !!card && card.designVersion === "editorial-v11" && card.layoutChecks?.passed === true
        && !!card.releaseToken && !!card.setId && !editorialStudioPhotoMissing(card);
}
export function imageSetReady(cards: BlogImageCard[]): boolean {
    const types = cardTypesFor(cards[0]);
    return cards.length === types.length && cards.every(imageReady) && new Set(cards.map((c) => c.setId)).size === 1
        && new Set(cards.map((c) => c.setFormat || "legacy")).size === 1
        && types.every((type) => cards.some((c) => c.type === type));
}

export function imageHoldReason(card: BlogImageCard): string {
    if (editorialStudioPhotoMissing(card)) return STUDIO_INFO_REQUIRED_MESSAGE;
    if (card.designVersion !== "editorial-v11") return "현재 구성으로 이미지를 다시 제작해주세요.";
    if (!card.layoutChecks) return "레이아웃 검사 정보가 없습니다. 다시 처리해주세요.";
    if (!card.layoutChecks.passed) return card.layoutChecks.issues.join(" ") || "글자 배치를 확인해주세요.";
    return "이미지 저장 확인이 필요합니다. 다시 처리해주세요.";
}
