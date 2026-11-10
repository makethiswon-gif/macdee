import { htmlResponse, renderMissing, renderPost } from "@/lib/junil-site/render";
import { getPublishedBySlug, listPublished } from "@/lib/junil-site/store";

// 법률칼럼 글 한 편 (/junil-site/column/{주소})
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    let { slug } = await params;
    try { slug = decodeURIComponent(slug); } catch { /* 그대로 */ }
    try {
        const post = await getPublishedBySlug("column", slug);
        if (!post) return htmlResponse(renderMissing(), { status: 404, cache: "no-store" });
        const siblings = await listPublished("column");
        return htmlResponse(renderPost(post, { origin: new URL(req.url).origin, siblings }));
    } catch (error) {
        console.error("[junil-site] column post", error);
        return new Response("잠시 후 다시 시도해 주세요.", { status: 503, headers: { "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" } });
    }
}
