// OYK POST 아이디어 창고 — 클라이언트와 서버가 함께 쓰는 형식. 서버 전용 코드는 server.ts에.

export const STATUSES = {
    seed: "씨앗",
    research: "취재",
    script: "대본",
    making: "제작",
    done: "발행",
    hold: "보류",
} as const;
export type Status = keyof typeof STATUSES;
export const STATUS_KEYS = Object.keys(STATUSES) as Status[];
/** 진행 막대에 그리는 순서(보류 제외) */
export const PIPELINE: Status[] = ["seed", "research", "script", "making", "done"];

export type IdeaLink = {
    url: string;
    title?: string;
    image?: string;
    site?: string;
};

export type Idea = {
    id: string;
    title: string;
    memo: string;
    links: IdeaLink[];
    tags: string[];
    status: Status;
    star: boolean;
    /** 시의성 마감일 YYYY-MM-DD — 이 날이 지나면 영상 가치가 떨어지는 주제 */
    due: string | null;
    createdAt: string;
    updatedAt: string;
};

export const LIMITS = { title: 200, memo: 20_000, tags: 12, tag: 24, links: 30, url: 2_000 } as const;

const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;

/** 붙여넣은 글에서 링크와 나머지 글(제목 후보)을 나눈다. 끝의 문장부호는 링크에서 뗀다. */
export function splitInput(text: string): { urls: string[]; rest: string } {
    const urls = [...new Set((text.match(URL_RE) || []).map((u) => u.replace(/[),.;!?\]]+$/, "")))];
    const rest = text.replace(URL_RE, " ").replace(/\s+/g, " ").trim();
    return { urls, rest };
}

export function hostOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\.|^m\./, ""); } catch { return url; }
}

/** 오늘(한국 시간) YYYY-MM-DD */
export function todayKst(): string {
    return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 마감까지 남은 날(오늘=0, 지남=음수) */
export function daysLeft(due: string): number {
    return Math.round((Date.parse(due) - Date.parse(todayKst())) / 86_400_000);
}

export function normalizeTags(input: unknown): string[] {
    const raw = Array.isArray(input) ? input : String(input ?? "").split(/[,#\s]+/);
    const tags = raw.map((t) => String(t).replace(/^#/, "").trim().slice(0, LIMITS.tag)).filter(Boolean);
    return [...new Set(tags)].slice(0, LIMITS.tags);
}

/** 대본메이커 세션에 붙여 넣을 취재 메모 */
export function toBrief(idea: Idea): string {
    const lines = [`# ${idea.title}`, ""];
    const meta = [`상태: ${STATUSES[idea.status]}`];
    if (idea.tags.length) meta.push(`태그: ${idea.tags.map((t) => `#${t}`).join(" ")}`);
    if (idea.due) meta.push(`시의성 마감: ${idea.due}`);
    lines.push(meta.join(" · "), "");
    if (idea.memo.trim()) lines.push("## 메모", idea.memo.trim(), "");
    if (idea.links.length) {
        lines.push("## 자료");
        for (const l of idea.links) lines.push(`- ${l.title ? `${l.title} — ` : ""}${l.url}`);
    }
    return lines.join("\n").trim() + "\n";
}
