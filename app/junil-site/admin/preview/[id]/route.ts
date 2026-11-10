import { isJunilAdmin, requestCookies } from "@/lib/junil-site/auth";
import { htmlResponse, renderMissing, renderPost } from "@/lib/junil-site/render";
import { getPost, listPublished } from "@/lib/junil-site/store";

// 관리자 미리보기 (/junil-site/admin/preview/{id}) — 임시 저장 글도 공개 페이지와 같은 모습으로 본다.
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!isJunilAdmin(requestCookies(req))) return Response.redirect(new URL("/junil-site/admin", req.url), 302);
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return htmlResponse(renderMissing("column"), { status: 404, cache: "no-store" });
    const siblings = await listPublished(post.board);
    const state = post.status === "published" ? "발행된 글" : "임시 저장 글(아직 공개되지 않음)";
    return htmlResponse(renderPost(post, { origin: new URL(req.url).origin, siblings, preview: state }), { cache: "no-store" });
}
