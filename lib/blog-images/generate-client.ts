import type { BlogImageCard } from "./card-types";
import { publishJson } from "../blog-publish-workflow";

/** One image request per action; additional paid generations are user initiated. */
export async function generateQualityCard(input: Record<string, unknown>, signal: AbortSignal, onCard?: (card: BlogImageCard) => void): Promise<BlogImageCard> {
    const result = await publishJson<{ card: BlogImageCard }>("/api/admin/blog-images/generate-design", signal, { ...input, transport: "asset" });
    if (result.card?.imageUrl && !result.card.imageDataUrl) {
        const response = await fetch(result.card.imageUrl, { signal, credentials: "omit", cache: "no-store" });
        if (!response.ok) throw new Error("완성 이미지 다운로드가 지연됐습니다. 재시도하면 저장된 결과를 다시 받습니다.");
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 16_000_000) throw new Error("완성 이미지 용량을 확인해주세요. 원본은 보존했습니다.");
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
        if (result.card.imageHash && hash !== result.card.imageHash) throw new Error("이미지 파일 검증에 실패했습니다. 저장된 원본에서 다시 복구해주세요.");
        result.card.imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
            reader.readAsDataURL(new Blob([bytes], { type: "image/png" }));
        });
        delete result.card.imageUrl;
    }
    if (!result.card?.imageDataUrl?.startsWith("data:image/png;base64,") || result.card.type !== input.cardType) throw new Error("요청한 종류의 완성 PNG를 받지 못했습니다.");
    onCard?.(result.card);
    return result.card;
}

/** Shared, bounded orchestration for both editors. No automatic paid retries. */
export async function forEachImage<T>(items: readonly T[], task: (item: T) => Promise<void>, signal?: AbortSignal) {
    // Serial execution also bounds native canvas memory in the serverless runtime.
    for (const item of items) { signal?.throwIfAborted(); await task(item); }
}
