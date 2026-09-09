import { BLOG_CARD_TYPES, type BlogCardType, type BlogImageCard, type EditorialProfile } from "./blog-images/card-types";
import type { ArticleVisualPlan } from "./blog-images/visual-plan-types";

export interface PublishDraft {
    profileId: string;
    title: string;
    body: string;
    field: string | null;
    topic: string | null;
    strengthIds?: string[];
    strengthRevision?: number;
}

export interface PublishBatch {
    postId: string;
    draft: PublishDraft;
    profile: EditorialProfile;
    plan: ArticleVisualPlan;
    cards: Partial<Record<BlogCardType, BlogImageCard>>;
    urls: Partial<Record<BlogCardType, string>>;
}

export function sameDraft(a: PublishDraft | null, b: PublishDraft): boolean {
    return !!a && a.profileId === b.profileId && a.title === b.title && a.body === b.body
        && a.field === b.field && a.topic === b.topic
        && JSON.stringify(a.strengthIds) === JSON.stringify(b.strengthIds) && a.strengthRevision === b.strengthRevision;
}

export function hasCompleteCardSet(images: { type: string }[], required: readonly string[] = BLOG_CARD_TYPES): boolean {
    return required.every((type) => images.some((image) => image.type === type));
}

export async function publishJson<T>(url: string, signal: AbortSignal, payload?: unknown, method = "POST"): Promise<T> {
    const res = await fetch(url, {
        method: payload === undefined ? "GET" : method,
        credentials: "include", signal,
        ...(payload === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
    });
    let data: T & { error?: string };
    try { data = await res.json(); } catch {
        signal.throwIfAborted();
        throw new Error(res.status === 413 ? "이미지 용량이 서버 요청 한도를 초과했습니다 (413)." : `서버 응답을 읽지 못했습니다 (${res.status}).`);
    }
    signal.throwIfAborted();
    if (!res.ok || data.error) throw new Error(data.error || `요청에 실패했습니다 (${res.status}).`);
    return data;
}

/** Never report success when the browser declines the legacy copy command. */
export async function copyBlogHtml(html: string): Promise<void> {
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-9999px;top:0;width:740px;white-space:normal;";
    holder.setAttribute("aria-hidden", "true");
    holder.innerHTML = html;
    document.body.appendChild(holder);
    try {
        // Both formats must describe the same rendered document. Editors may read
        // text/plain for unsupported links; never send raw [label](tel:...) there.
        const plain = holder.innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
            try {
                await navigator.clipboard.write([new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([plain], { type: "text/plain" }),
                })]);
                return;
            } catch { /* Older editors/browsers may still allow selection-based copying. */ }
        }
        const selection = window.getSelection();
        const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
        try {
            if (!selection) throw new Error("선택 영역을 만들 수 없습니다.");
            const range = document.createRange();
            range.selectNodeContents(holder);
            selection.removeAllRanges();
            selection.addRange(range);
            if (!document.execCommand("copy")) throw new Error("클립보드 복사가 허용되지 않았습니다.");
        } finally {
            selection?.removeAllRanges();
            ranges.forEach((range) => selection?.addRange(range));
        }
    } finally {
        holder.remove();
    }
}
