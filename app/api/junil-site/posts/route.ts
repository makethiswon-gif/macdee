import { NextResponse } from "next/server";
import { isJunilAdmin, requestCookies } from "@/lib/junil-site/auth";
import { isBoard, type BoardKey } from "@/lib/junil-site/shared";
import { BadInput, cleanInput, createPost, listAllPosts } from "@/lib/junil-site/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
const boardOf = (value: unknown): BoardKey | null => (isBoard(value) ? value : null);

// GET ?board=column — 관리자용 글 목록(임시 저장 포함)
export async function GET(req: Request) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const board = boardOf(new URL(req.url).searchParams.get("board") ?? "column");
    if (!board) return NextResponse.json({ error: "없는 게시판입니다." }, { status: 400 });
    try {
        return NextResponse.json({ posts: await listAllPosts(board) }, { headers: NO_STORE });
    } catch (e) {
        console.error("[junil-site] list", e);
        return NextResponse.json({ error: "글 목록을 불러오지 못했습니다." }, { status: 500 });
    }
}

// POST { board, title, body, … } — 새 글
export async function POST(req: Request) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
    const board = boardOf(body.board ?? "column");
    if (!board) return NextResponse.json({ error: "없는 게시판입니다." }, { status: 400 });
    try {
        const post = await createPost(board, cleanInput(board, body));
        return NextResponse.json({ post }, { headers: NO_STORE });
    } catch (e) {
        if (e instanceof BadInput) return NextResponse.json({ error: e.message }, { status: 400 });
        console.error("[junil-site] create", e);
        return NextResponse.json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
}
