import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { IDEA_COOKIE, IDEA_COOKIE_MAX_AGE, checkPassword, issueIdeaToken } from "@/lib/oyk-idea/server";

export const dynamic = "force-dynamic";

// POST: 관리자 계정으로 로그인 — 이 브라우저에 180일짜리 아이디어 창고 쿠키를 준다.
export async function POST(req: Request) {
    if (!(await rateLimitOk("oyk-idea-login", getClientIp(req), 5, "1 m"))) {
        return tooManyRequests("로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.");
    }
    let body: { username?: unknown; password?: unknown };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

    if (!checkPassword(String(body.username ?? ""), String(body.password ?? ""))) {
        await new Promise((r) => setTimeout(r, 800)); // 대입 공격 늦추기
        return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(IDEA_COOKIE, issueIdeaToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: IDEA_COOKIE_MAX_AGE,
        path: "/",
    });
    return res;
}

// DELETE: 이 브라우저에서 로그아웃
export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(IDEA_COOKIE);
    return res;
}
