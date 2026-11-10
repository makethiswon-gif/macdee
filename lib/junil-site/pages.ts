import { htmlResponse, renderList, renderMissing, renderPost } from "./render";
import type { BoardKey } from "./shared";
import { getPublished, listPublished } from "./store";

// 게시판 공개 페이지(목록·글)의 라우트 핸들러 본체 — app/junil-site/{column|cases|news} 가 불러 쓴다.
// 검색 노출이 목적이라 서버에서 완성된 HTML 로 낸다. 분야 필터·검색·더 보기는 site.js 가 화면에서 처리.

// 저장소 장애를 "글 없음"으로 굳히지 않는다 — 잠시 뒤 다시 시도하게 503.
const busy = () => new Response("잠시 후 다시 시도해 주세요.", { status: 503, headers: { "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" } });

export async function listPage(board: BoardKey): Promise<Response> {
    try {
        return htmlResponse(renderList(board, await listPublished(board)));
    } catch (error) {
        console.error(`[junil-site] ${board} list`, error);
        return busy();
    }
}

/** key: 글 주소(slug) 또는 글 번호(case-63 처럼 다른 페이지가 걸어 둔 고정 번호) */
export async function postPage(board: BoardKey, req: Request, key: string): Promise<Response> {
    try { key = decodeURIComponent(key); } catch { /* 그대로 */ }
    try {
        const post = await getPublished(board, key);
        if (!post) return htmlResponse(renderMissing(board), { status: 404, cache: "no-store" });
        const siblings = await listPublished(board);
        return htmlResponse(renderPost(post, { origin: new URL(req.url).origin, siblings }));
    } catch (error) {
        console.error(`[junil-site] ${board} post`, error);
        return busy();
    }
}
