// 법률사무소 준일 홈페이지(/junil-site) 게시판 — 서버·관리자 화면이 함께 쓰는 값.
// 글 틀(shell.json)과 첫 글(seed.json)은 C:\클로드\junil-site\_src\build.py 가 만든다.

export const BOARDS = {
    column: { label: "법률칼럼", path: "column" },
} as const;
export type BoardKey = keyof typeof BOARDS;
export const BOARD_KEYS = Object.keys(BOARDS) as BoardKey[];

export type PostStatus = "draft" | "published";

/** 목록에 쓰는 정보(본문 제외) */
export type PostMeta = {
    id: string;
    board: BoardKey;
    slug: string;
    title: string;
    category: string;
    /** 글쓴 변호사(구성원 id). null 이면 "법률사무소 준일" */
    lawyerId: number | null;
    /** 게시일 YYYY-MM-DD */
    date: string;
    summary: string;
    /** 대표 이미지 주소(/junil-site/media/…) 또는 빈 값 */
    thumb: string;
    status: PostStatus;
    createdAt: string;
    updatedAt: string;
};
export type Post = PostMeta & { body: string };

export const LIMITS = { title: 120, summary: 300, slug: 60, body: 300_000, image: 8 * 1024 * 1024 };

export const MEDIA_PREFIX = "/junil-site/media/";

/** 제목 → 주소. 한글·영문·숫자만 남기고 빈칸은 붙임표로. */
export function slugify(text: string): string {
    const s = (text || "")
        .replace(/[^가-힣a-zA-Z0-9\s-]/g, " ")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return Array.from(s).slice(0, LIMITS.slug).join("").replace(/-+$/g, "");
}

export function todayKst(): string {
    return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 2026-11-11 → 2026. 11. 11. */
export function kdate(ymd: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "");
    return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.` : ymd || "";
}
