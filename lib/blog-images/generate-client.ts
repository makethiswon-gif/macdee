import type { BlogImageCard } from "./card-types";
import { publishJson } from "../blog-publish-workflow";

/** One image request per action; additional paid generations are user initiated. */
export async function generateQualityCard(input: Record<string, unknown>, signal: AbortSignal, onCard?: (card: BlogImageCard) => void): Promise<BlogImageCard> {
    const result = await publishJson<{ card: BlogImageCard }>("/api/admin/blog-images/generate-design", signal, input);
    if (!result.card?.imageDataUrl?.startsWith("data:image/png;base64,") || result.card.type !== input.cardType) throw new Error("요청한 종류의 완성 PNG를 받지 못했습니다.");
    onCard?.(result.card);
    return result.card;
}
