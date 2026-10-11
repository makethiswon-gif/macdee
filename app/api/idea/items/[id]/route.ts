import { NextResponse } from "next/server";
import { IdeaNotFound, addLinkToIdea, cleanInput, deleteIdea, isIdeaAuthed, previewLink, requestCookies, updateIdea } from "@/lib/oyk-idea/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

function fail(e: unknown, what: string) {
    if (e instanceof IdeaNotFound) return NextResponse.json({ error: "이미 지워진 아이디어입니다." }, { status: 404 });
    console.error(`[oyk-idea] ${what}`, e);
    return NextResponse.json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
}

// PATCH: 고칠 필드만 보낸다. { addLink: url } 이면 미리보기를 붙여 자료 목록 끝에 더한다.
export async function PATCH(req: Request, { params }: Ctx) {
    if (!isIdeaAuthed(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const { id } = await params;
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

    try {
        if (typeof body.addLink === "string") {
            const url = body.addLink.trim();
            if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "http(s) 링크만 넣을 수 있습니다." }, { status: 400 });
            return NextResponse.json({ idea: await addLinkToIdea(id, await previewLink(url)) });
        }
        return NextResponse.json({ idea: await updateIdea(id, cleanInput(body)) });
    } catch (e) {
        return fail(e, "update");
    }
}

export async function DELETE(req: Request, { params }: Ctx) {
    if (!isIdeaAuthed(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const { id } = await params;
    try {
        await deleteIdea(id);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return fail(e, "delete");
    }
}
