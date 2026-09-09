import type { BlogImageCard } from "./card-types";

/** One layout repair, never a silent paid-art retry or an invented copy rewrite. */
export async function repairImageLayout(card: BlogImageCard,
    repairLayout: () => Promise<BlogImageCard>, checkpoint: (card: BlogImageCard) => Promise<void>): Promise<BlogImageCard> {
    const preserve = async (value: BlogImageCard) => {
        // Old checkpoints may contain an AI verdict; it is not part of this workflow.
        delete value.designReview;
        delete value.releaseToken;
        await checkpoint(value);
        return value;
    };
    let result = await preserve(card);
    if (!result.layoutChecks?.passed) {
        try {
            const repaired = await repairLayout();
            result = await preserve({ ...repaired, artDataUrl: card.artDataUrl, artSourceHash: card.artSourceHash, model: card.model, productionId: card.productionId });
            result.warnings.push("동일한 시각물을 재사용해 넓은 지면으로 자동 재편집했습니다.");
        } catch {
            result.warnings.push("자동 재편집을 완료하지 못했습니다. 이전 결과는 보존했습니다.");
        }
    }
    return result;
}
