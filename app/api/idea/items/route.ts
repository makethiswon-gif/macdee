import { NextResponse } from "next/server";
import { cleanInput, createIdea, isIdeaAuthed, listIdeas, previewLink, requestCookies } from "@/lib/oyk-idea/server";
import { LIMITS, splitInput } from "@/lib/oyk-idea/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
    if (!isIdeaAuthed(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    try {
        return NextResponse.json({ ideas: await listIdeas() }, { headers: NO_STORE });
    } catch (e) {
        console.error("[oyk-idea] list", e);
        return NextResponse.json({ error: "아이디어를 불러오지 못했습니다." }, { status: 500 });
    }
}

// POST: { text } 한 줄 입력(링크·주제 섞여도 됨) 또는 { title, memo, tags, links, ... }
export async function POST(req: Request) {
    if (!isIdeaAuthed(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

    const input = cleanInput(body);
    if (typeof body.text === "string") {
        const { urls, rest } = splitInput(body.text);
        if (rest && !input.title) input.title = rest.slice(0, LIMITS.title);
        input.links = [...(input.links ?? []), ...urls.map((url) => ({ url }))].slice(0, LIMITS.links);
    }
    if (!input.title && !input.links?.length) return NextResponse.json({ error: "주제나 링크를 적어 주세요." }, { status: 400 });

    // 제목·썸네일이 비어 있는 링크만 미리보기를 채운다(북마클릿은 페이지 제목을 같이 보낸다).
    if (input.links?.length) {
        input.links = await Promise.all(input.links.map(async (l) => {
            if (l.title && l.image) return l;
            const p = await previewLink(l.url);
            return { ...p, ...Object.fromEntries(Object.entries(l).filter(([, v]) => v)) };
        }));
    }
    try {
        const idea = await createIdea(input);
        return NextResponse.json({ idea }, { headers: NO_STORE });
    } catch (e) {
        console.error("[oyk-idea] create", e);
        return NextResponse.json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
}
