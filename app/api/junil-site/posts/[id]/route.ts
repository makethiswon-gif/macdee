import { NextResponse } from "next/server";
import { isJunilAdmin, requestCookies } from "@/lib/junil-site/auth";
import { BadInput, PostNotFound, cleanInput, deletePost, getPost, updatePost } from "@/lib/junil-site/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
type Ctx = { params: Promise<{ id: string }> };

// GET — 글 한 편(본문 포함), 편집기에 불러올 때
export async function GET(req: Request, { params }: Ctx) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const { id } = await params;
    try {
        const post = await getPost(id);
        if (!post) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
        return NextResponse.json({ post }, { headers: NO_STORE });
    } catch (e) {
        console.error("[junil-site] get", e);
        return NextResponse.json({ error: "글을 불러오지 못했습니다." }, { status: 500 });
    }
}

// PATCH — 고치기(임시 저장·발행·발행 내리기 포함)
export async function PATCH(req: Request, { params }: Ctx) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const { id } = await params;
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
    try {
        const current = await getPost(id);
        if (!current) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
        const post = await updatePost(current.board, id, cleanInput(current.board, body));
        return NextResponse.json({ post }, { headers: NO_STORE });
    } catch (e) {
        if (e instanceof PostNotFound) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
        if (e instanceof BadInput) return NextResponse.json({ error: e.message }, { status: 400 });
        console.error("[junil-site] update", e);
        return NextResponse.json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: Ctx) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const { id } = await params;
    try {
        const current = await getPost(id);
        if (!current) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
        await deletePost(current.board, id);
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
    } catch (e) {
        if (e instanceof PostNotFound) return NextResponse.json({ error: "없는 글입니다." }, { status: 404 });
        console.error("[junil-site] delete", e);
        return NextResponse.json({ error: "지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
}
