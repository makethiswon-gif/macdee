/**
 * 계약이 끝나 변호사 계정까지 지운 블로그 주소(/blog/<slug>). 404 대신 410(영구 삭제)으로 답해
 * 구글이 더 빨리 색인에서 빼게 한다 — 2026-11-12 서치콘솔 '찾을 수 없음(404)' 165건 중 이 다섯 블로그가 130여 건.
 * 이 목록은 DB 에 그 slug 의 변호사가 없을 때만 넣는다. 같은 주소로 블로그를 다시 열면 여기서 지워야 한다.
 */
export const REMOVED_BLOG_SLUGS: ReadonlySet<string> = new Set([
    "gut2000-t691", // 전성배
    "baram-i5rd", // 법률사무소 바람(2026-11-05 계약 취소)
    "yhko-1p65",
    "yyj0917-f1g6",
    "hsxisue-z4l3",
]);

/** /blog/<지운 slug> 와 그 아래 모든 주소면 true. */
export function isRemovedBlogPath(pathname: string): boolean {
    const match = /^\/blog\/([^/]+)(?:\/|$)/.exec(pathname);
    return !!match && REMOVED_BLOG_SLUGS.has(match[1].toLowerCase());
}

export const REMOVED_BLOG_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>운영을 마친 블로그입니다</title></head><body style="font-family:Pretendard,system-ui,sans-serif;max-width:560px;margin:80px auto;padding:0 20px;color:#222;line-height:1.7"><h1 style="font-size:22px">운영을 마친 블로그입니다</h1><p>이 변호사 블로그는 더 이상 운영하지 않습니다.</p><p><a href="/blog" style="color:#004AAD">다른 변호사 블로그 보기</a></p></body></html>`;
