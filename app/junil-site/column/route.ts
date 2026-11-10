import { htmlResponse, renderList } from "@/lib/junil-site/render";
import { listPublished } from "@/lib/junil-site/store";

// 법률사무소 준일 홈페이지 — 법률칼럼 목록 (/junil-site/column)
// 검색 노출이 목적이라 서버에서 완성된 HTML 로 낸다. 분야 필터·검색·더 보기는 site.js 가 화면에서 처리.
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        return htmlResponse(renderList(await listPublished("column")));
    } catch (error) {
        console.error("[junil-site] column list", error);
        // 저장소 장애를 "글 없음"으로 굳히지 않는다 — 잠시 뒤 다시 시도하게 503.
        return new Response("잠시 후 다시 시도해 주세요.", { status: 503, headers: { "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" } });
    }
}
