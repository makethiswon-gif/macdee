import { NextResponse } from "next/server";
import { getClientIp, rateLimitOk, tooManyRequests } from "@/lib/ratelimit";
import { BOARD_COOKIE, BOARD_DAYS, boardLogin } from "@/lib/deepmakai/board-auth";

export const dynamic = "force-dynamic";

// POST { password }: 계약 링크 모음 비밀번호 확인 → 30일 쿠키(경로 /deepmakai).
export async function POST(request: Request) {
    if (!(await rateLimitOk("deepmakai-board", getClientIp(request), 5, "10 m"))) return tooManyRequests("잠시 후 다시 시도해 주세요.");
    let password = "";
    try { password = String((await request.json()).password ?? ""); } catch { /* 빈 값으로 처리 */ }
    if (!password) return NextResponse.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
    const r = await boardLogin(password);
    if (r === "unset") return NextResponse.json({ error: "비밀번호가 설정되지 않았습니다." }, { status: 503 });
    if (r === "locked") return NextResponse.json({ error: "틀린 시도가 많아 잠시 잠겼습니다. 1시간 뒤 다시 시도해 주세요." }, { status: 429 });
    if (r === "wrong") {
        // 틀린 비밀번호를 빠르게 연달아 넣지 못하게 응답을 조금 늦춘다.
        await new Promise((ok) => setTimeout(ok, 1200));
        return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(BOARD_COOKIE, r.cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/deepmakai", maxAge: BOARD_DAYS * 86400 });
    return res;
}
