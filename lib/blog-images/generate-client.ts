import type { BlogImageCard } from "./card-types";
import { publishJson } from "../blog-publish-workflow";

/** Split a confirmed art correction into its own request, respecting server time limits. */
export async function generateQualityCard(input: Record<string, unknown>, signal: AbortSignal, onCard?: (card: BlogImageCard) => void): Promise<BlogImageCard> {
    const call = async (body: Record<string, unknown>) => {
        const result = await publishJson<{ card: BlogImageCard }>("/api/admin/blog-images/generate-design", signal, body);
        if (!result.card?.imageDataUrl?.startsWith("data:image/png;base64,") || result.card.type !== body.cardType) throw new Error("요청한 종류의 완성 PNG를 받지 못했습니다.");
        onCard?.(result.card);
        return result.card;
    };
    const first = await call(input);
    if (!input.renderOnly && first.productionId && first.artSourceHash && first.designReview?.status === "revise" && first.designReview.repair === "art") {
        try {
            return await call({ ...input, attemptId: `${first.productionId}-art-repair`, artFeedback: first.designReview.issues });
        } catch (error) {
            if (signal.aborted) throw error;
            first.warnings.push("시각물 자동 수정 요청을 완료하지 못했습니다. 첫 번째 결과는 보존했으며 검수 대기 상태입니다.");
        }
    }
    return first;
}
