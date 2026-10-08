// 변호사 블로그 글 목록의 쪽 주소(2026-10-08).
//
// 공개 주소는 예전 그대로 /blog/{변호사}?page=N 이다. 그런데 searchParams 를 읽는 페이지는 캐시(ISR)되지 않아
// 요청마다 데이터베이스를 읽었다. 그래서 미들웨어가 2쪽부터를 캐시되는 내부 경로 /blog/{변호사}/p/N
// (app/blog/[slug]/p/[page])으로 넘기고(rewrite — 주소창은 그대로), 내부 경로로 직접 들어오면 공개 주소로 돌려보낸다(같은 쪽이 두 주소로 색인되지 않게).
// 미들웨어는 요청마다 한 번만 돌고 rewrite 된 내부 요청에는 다시 돌지 않으므로 돌려보내기가 되풀이되지 않는다.

const BLOG_HOME = /^\/blog\/([^/]+)$/;
const BLOG_LIST_PAGE = /^\/blog\/([^/]+)\/p\/([^/]*)$/;
/** 터무니없이 큰 쪽 번호는 1쪽으로 본다. */
const MAX_PAGE = 100_000;

function pageNumber(value: string | null | undefined): number {
    const parsed = Number.parseInt(value || "1", 10);
    return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= MAX_PAGE ? parsed : 1;
}

export type LawyerBlogPaging = { rewrite: string } | { redirect: string } | null;

/** pathname 은 요청 그대로(퍼센트 인코딩된 채) 받고, 돌려주는 경로도 같은 표기를 쓴다. */
export function lawyerBlogPaging(pathname: string, pageParam: string | null): LawyerBlogPaging {
    const home = BLOG_HOME.exec(pathname);
    if (home) {
        const page = pageNumber(pageParam);
        return page >= 2 ? { rewrite: `/blog/${home[1]}/p/${page}` } : null;
    }
    const internal = BLOG_LIST_PAGE.exec(pathname);
    if (internal) {
        const page = pageNumber(internal[2]);
        return { redirect: page >= 2 ? `/blog/${internal[1]}?page=${page}` : `/blog/${internal[1]}` };
    }
    return null;
}
