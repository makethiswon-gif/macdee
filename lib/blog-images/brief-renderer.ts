import type { SKRSContext2D } from "@napi-rs/canvas";
import { editorialDrawing as d, wrapText } from "./editorial-renderer";
import type { BlogImageCard, EditorialProfile } from "./card-types";
import type { ArticleVisualPlan, EditorialStyle, PlannedCard } from "./visual-plan-types";
import { renderMagazineCard } from "./magazine-renderer";

/** Balance short headlines without changing words or overriding manual line breaks. */
export function balanceHeadline(c: SKRSContext2D, text: string, width: number, size: number): string {
    d.ensureFonts(); d.textHeight(c, text, width, size, true);
    if (text.includes("\n")) return text;
    const initial = wrapText(c, text, width);
    if (initial.length < 2) return text;
    let best = initial, score = Infinity;
    for (let ratio = 1; ratio >= 0.55; ratio -= 0.015) {
        const lines = wrapText(c, text, width * ratio);
        if (lines.length !== initial.length) continue;
        const widths = lines.map((s) => c.measureText(s).width);
        const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
        const candidate = widths.reduce((total, w) => total + (w - mean) ** 2, 0);
        if (candidate < score) { best = lines; score = candidate; }
    }
    return best.join("\n");
}
export interface BriefRenderOptions {
    plan: ArticleVisualPlan;
    card: PlannedCard;
    profile: EditorialProfile;
    style?: EditorialStyle;
    art?: Buffer;
    artLabel?: string;
    model?: string;
    headingOverride?: string;
}
export function renderBriefCard(opts: BriefRenderOptions): Promise<BlogImageCard> { return renderMagazineCard(opts); }
