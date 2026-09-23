import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { createItem, isCrewToken, isPreview, listItems, TableMissingError } from "@/lib/deepmakai/server";
import { IDEA_CATEGORIES, KINDS, LIMITS, MEMBER_KEYS, type Kind } from "@/lib/deepmakai/shared";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

function fail(error: unknown) {
    if (error instanceof TableMissingError) {
        return NextResponse.json({ error: "table_missing" }, { status: 503 });
    }
    console.error("[deepmakai] items", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export async function GET(req: Request, { params }: Ctx) {
    const { token } = await params;
    if (!isCrewToken(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const kind = new URL(req.url).searchParams.get("kind") as Kind | null;
    if (!kind || !KINDS.includes(kind)) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
    try {
        const items = await listItems(kind);
        return NextResponse.json({ items, preview: isPreview() }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        return fail(e);
    }
}

export async function POST(req: Request, { params }: Ctx) {
    const { token } = await params;
    if (!isCrewToken(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!(await rateLimitOk("deepmakai-write", getClientIp(req), 60, "1 m"))) return tooManyRequests();

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

    const kind = body.kind as Kind;
    const author = String(body.author || "");
    const text = String(body.body || "").trim();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!KINDS.includes(kind)) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
    if (!MEMBER_KEYS.includes(author as never)) return NextResponse.json({ error: "bad_author" }, { status: 400 });
    if (!text || text.length > LIMITS.body) return NextResponse.json({ error: "bad_body" }, { status: 400 });
    if (title.length > LIMITS.title) return NextResponse.json({ error: "bad_title" }, { status: 400 });
    if ((kind === "idea" || kind === "notice") && !title) return NextResponse.json({ error: "title_required" }, { status: 400 });

    const meta: Record<string, unknown> = {};
    if (kind === "idea") {
        const category = String(body.category || "");
        meta.category = IDEA_CATEGORIES.includes(category as never) ? category : "기타";
    }
    if (kind === "notice") {
        const date = String(body.date || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) meta.date = date;
        const place = String(body.place || "").trim();
        if (place) meta.place = place.slice(0, 80);
    }

    try {
        const item = await createItem({
            kind, author, body: text,
            title: kind === "talk" ? null : title,
            status: kind === "idea" ? "new" : null,
            meta,
        });
        return NextResponse.json({ item }, { status: 201 });
    } catch (e) {
        return fail(e);
    }
}
