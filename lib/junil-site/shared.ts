// 법률사무소 준일 홈페이지(/junil-site) 게시판 — 서버·관리자 화면이 함께 쓰는 값.
// 글 틀(shell.json)과 첫 글(seed.json)은 C:\클로드\junil-site\_src\build.py 가 만든다.

export const BOARDS = {
    column: { label: "법률칼럼", path: "column", lawyerLabel: "글쓴이", multiLawyer: false, gallery: "", summaryHint: "목록과 검색 결과에 보이는 두세 줄. 비워 두면 본문 앞부분을 씁니다.", thumbHint: "목록 카드와 글 맨 위에 나옵니다. 없어도 됩니다." },
    case: { label: "성공사례", path: "cases", lawyerLabel: "담당 변호사", multiLawyer: true, gallery: "사건 자료 이미지", summaryHint: "글 위쪽 ‘사건 개요’ 상자와 목록 카드에 나옵니다.", thumbHint: "목록 카드에 나옵니다. 비워 두면 사건 자료의 첫 장을 씁니다." },
    news: { label: "준일소식", path: "news", lawyerLabel: "관련 변호사", multiLawyer: true, gallery: "사진", summaryHint: "목록에 보이는 두세 줄. 비워 두면 본문 앞부분을 씁니다.", thumbHint: "목록에 나옵니다. 비워 두면 사진의 첫 장을 씁니다." },
} as const;
export type BoardKey = keyof typeof BOARDS;
export const BOARD_KEYS = Object.keys(BOARDS) as BoardKey[];
export const isBoard = (value: unknown): value is BoardKey => BOARD_KEYS.includes(value as BoardKey);
/** 주소의 게시판 자리(column·cases·news) → 게시판 */
export const boardOfPath = (path: string): BoardKey | null => BOARD_KEYS.find((key) => BOARDS[key].path === path) ?? null;

export type PostStatus = "draft" | "published";

/** 목록에 쓰는 정보(본문 제외) */
export type PostMeta = {
    id: string;
    board: BoardKey;
    slug: string;
    title: string;
    category: string;
    /** 글쓴이·담당·관련 변호사(구성원 id). 첫 번째가 대표. 비면 "법률사무소 준일" */
    lawyerIds: number[];
    /** 게시일 YYYY-MM-DD */
    date: string;
    summary: string;
    /** 대표 이미지 주소 또는 빈 값 */
    thumb: string;
    /** 목록에 쓸 이미지: 대표 이미지 → 자료 이미지 첫 장 → 본문 첫 이미지 (저장할 때 자동으로 정해진다) */
    cover: string;
    status: PostStatus;
    createdAt: string;
    updatedAt: string;
};
export type Post = PostMeta & {
    body: string;
    /** 자료 이미지(성공사례의 판결문 등, 소식의 사진) — 글 위쪽에 따로 나온다 */
    images: string[];
};

export const LIMITS = { title: 120, summary: 300, slug: 60, body: 300_000, image: 8 * 1024 * 1024, images: 12 };

export const MEDIA_PREFIX = "/junil-site/media/";
/** 사이트에 원래 들어 있던 이미지(옮겨 온 성공사례·소식의 자료) */
export const STATIC_IMG_PREFIX = "/junil-site/img/";

/** 올린 이미지(/junil-site/media/…)이거나 사이트에 원래 있던 이미지(/junil-site/img/…)인지 */
export function isSiteImage(url: unknown): boolean {
    return typeof url === "string" && (url.startsWith(MEDIA_PREFIX) || url.startsWith(STATIC_IMG_PREFIX)) && /^[\w./-]+$/.test(url) && !url.includes("..");
}

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
