import type { BlogCardType } from "./card-types";
import type { Infographic } from "./infographic";

export type EditorialStyle = "paper" | "contrast";
export type ArtMedium = "photograph" | "illustration";
export interface ArtDirection {
    concept: string;
    rationale: string;
    alternatives: { concept: string; reasonNotChosen: string }[];
    palette: "cobalt" | "vermilion" | "forest" | "aubergine" | "graphite" | "amber" | "burgundy" | "teal" | "slate" | "olive";
    typography: "serif" | "sans";
    composition: "immersive" | "split";
    motif: string;
}
export interface SourceParagraph { id: string; text: string }
export interface SourceEvidence { paragraphId: string; quote: string }
export interface VisualBrief {
    medium: ArtMedium;
    subject: string;
    scene: string;
    message: string;
    avoid: string[];
    direction?: ArtDirection;
}
export interface PlannedCard {
    type: BlogCardType;
    heading: string;
    headlineLines?: string[];
    kicker?: string;
    deck: string;
    purpose: string;
    afterParagraphId: string;
    evidence: SourceEvidence[];
    art?: VisualBrief;
    infographic?: Infographic;
    points?: string[];
    skipReason?: string;
}
export interface ArticleVisualPlan {
    version: "visual-plan-v7" | "visual-plan-v9";
    direction?: ArtDirection;
    planningModel?: string;
    sourceHash: string;
    question: string;
    thesis: string;
    cards: PlannedCard[];
    paragraphs: SourceParagraph[];
}

// Used by the editor and server: a source anchor must survive preview/render round trips.
// Plain text only; HTML is never executed or reinserted into the editor.
export function articleParagraphs(content: string): SourceParagraph[] {
    const text = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<\/?(?:p|div|h[1-6]|li|br)\b[^>]*>/gi, "\n")
        .replace(/<\/?(?:span|strong|em|b|i|u|a|img|ul|ol|table|thead|tbody|tr|td|th|blockquote|figure|figcaption)\b[^>]*>/gi, "").replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
        .replace(/\r/g, "");
    const lines = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    for (const line of lines) {
        // Preserve the complete article, including conclusions after the old 3,000-char cutoff.
        for (let offset = 0; offset < line.length; offset += 1600) chunks.push(line.slice(offset, offset + 1600));
    }
    return chunks.map((text, i) => ({ id: `p${i + 1}`, text }));
}

export function cardPlacement(card: PlannedCard, paragraphs: SourceParagraph[]): string {
    if (card.type === "thumbnail") return "제목 아래 · 도입 앞";
    if (card.type === "contact") return "본문 마지막 · 상담 안내 앞";
    const source = paragraphs.find((p) => p.id === card.afterParagraphId);
    return source ? `“${source.text.slice(0, 52)}${source.text.length > 52 ? "…" : ""}” 문단 다음` : "관련 설명 문단 다음";
}
