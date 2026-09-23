import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { getItem, isCrewToken, softDeleteItem, TableMissingError, updateItem } from "@/lib/deepmakai/server";
import { IDEA_STATUS, LIMITS, MEMBER_KEYS, type IdeaStatus } from "@/lib/deepmakai/shared";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string; id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown) {
    if (error instanceof TableMissingError) return NextResponse.json({ error: "table_missing" }, { status: 503 });
    console.error("[deepmakai] item", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
}

// 편집·삭제는 글쓴이 본인 또는 PD, 아이디어 상태 변경은 PD만.
const canManage = (member: string, author: string) => member === "pd" || member === author;

export async function PATCH(req: Request, { params }: Ctx) {
    const { token, id } = await params;
    if (!isCrewToken(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!UUID.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
    if (!(await rateLimitOk("deepmakai-write", getClientIp(req), 120, "1 m"))) return tooManyRequests();

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
    const member = String(body.member || "");
    if (!MEMBER_KEYS.includes(member as never)) return NextResponse.json({ error: "bad_member" }, { status: 400 });

    try {
        const item = await getItem(id);
        if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

        if (body.op === "react") {
            // 반응 토글: reactions.fist = [멤버키...]
            const key = String(body.key || "fist").slice(0, 20);
            const list = new Set(item.reactions?.[key] || []);
            if (list.has(member)) list.delete(member); else list.add(member);
            const updated = await updateItem(id, { reactions: { ...item.reactions, [key]: [...list] } });
            return NextResponse.json({ item: updated });
        }
        if (body.op === "status") {
            if (item.kind !== "idea") return NextResponse.json({ error: "not_idea" }, { status: 400 });
            if (member !== "pd") return NextResponse.json({ error: "forbidden" }, { status: 403 });
            const status = String(body.status || "") as IdeaStatus;
            if (!(status in IDEA_STATUS)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
            const updated = await updateItem(id, { status });
            return NextResponse.json({ item: updated });
        }
        if (body.op === "edit") {
            if (!canManage(member, item.author)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
            const patch: { title?: string; body?: string } = {};
            if (typeof body.title === "string") {
                const t = body.title.trim();
                if (t.length > LIMITS.title) return NextResponse.json({ error: "bad_title" }, { status: 400 });
                patch.title = t;
            }
            if (typeof body.body === "string") {
                const t = body.body.trim();
                if (!t || t.length > LIMITS.body) return NextResponse.json({ error: "bad_body" }, { status: 400 });
                patch.body = t;
            }
            const updated = await updateItem(id, patch);
            return NextResponse.json({ item: updated });
        }
        return NextResponse.json({ error: "bad_op" }, { status: 400 });
    } catch (e) {
        return fail(e);
    }
}

export async function DELETE(req: Request, { params }: Ctx) {
    const { token, id } = await params;
    if (!isCrewToken(token)) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!UUID.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
    const member = new URL(req.url).searchParams.get("member") || "";
    if (!MEMBER_KEYS.includes(member as never)) return NextResponse.json({ error: "bad_member" }, { status: 400 });
    try {
        const item = await getItem(id);
        if (!item) return NextResponse.json({ ok: true });
        if (!canManage(member, item.author)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
        await softDeleteItem(id);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return fail(e);
    }
}
