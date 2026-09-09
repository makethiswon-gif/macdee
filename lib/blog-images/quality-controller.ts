import type { BlogImageCard } from "./card-types";

type Review = NonNullable<BlogImageCard["designReview"]>;
/** One layout repair, never a silent paid-art retry or an invented copy rewrite. */
export async function inspectAndRepair(card: BlogImageCard, review: (card: BlogImageCard) => Promise<Review>,
    repairLayout: () => Promise<BlogImageCard>, checkpoint: (card: BlogImageCard) => Promise<void>): Promise<BlogImageCard> {
    const inspect = async (value: BlogImageCard, attempts: number) => {
        value.designReview = value.layoutChecks?.passed ? await review(value) : {
            status: "revise", model: "layout-engine", summary: "조판 영역을 자동 재검토합니다.", issues: value.layoutChecks?.issues || ["조판 검증 누락"], repair: "layout",
        };
        value.designReview.attempts = attempts;
        await checkpoint(value);
        return value;
    };
    let result = await inspect(card, 1);
    if (result.designReview?.status === "revise" && result.designReview.repair === "layout") {
        try {
            const repaired = await repairLayout();
            result = await inspect({ ...repaired, artDataUrl: card.artDataUrl, artSourceHash: card.artSourceHash, model: card.model, productionId: card.productionId }, 2);
            result.warnings.push("동일한 시각물을 재사용해 넓은 지면으로 자동 재편집했습니다.");
        } catch {
            result.warnings.push("자동 재편집을 완료하지 못했습니다. 이전 결과는 보존했습니다.");
        }
    }
    return result;
}
