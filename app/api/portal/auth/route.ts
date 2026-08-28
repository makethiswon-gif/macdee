import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { signPortalToken, getPortalSession } from "@/lib/portal-auth";

// 로펌 접속 코드 로그인.
// 대표(admin)는 기존 admin_token 으로 이미 인증되므로 여기를 쓰지 않는다.

export async function POST(request: Request) {
    try {
        const { code } = await request.json();
        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "접속 코드를 입력해 주세요." }, { status: 400 });
        }

        const supabase = createServiceClient();
        const { data: firm, error } = await supabase
            .from("portal_firms")
            .select("id, name")
            .eq("access_code", code.trim())
            .single();

        if (error || !firm) {
            return NextResponse.json({ error: "접속 코드가 올바르지 않습니다." }, { status: 401 });
        }

        const res = NextResponse.json({ ok: true, firm: { id: firm.id, name: firm.name } });
        res.cookies.set("portal_token", signPortalToken(firm.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60,
        });
        return res;
    } catch {
        return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("portal_token", "", { path: "/", maxAge: 0 });
    return res;
}

// 세션 확인 — 클라이언트 앱 초기화용
export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return NextResponse.json({ role: null });
    if (session.role === "admin") return NextResponse.json({ role: "admin" });

    const supabase = createServiceClient();
    const { data: firm } = await supabase
        .from("portal_firms")
        .select("id, name")
        .eq("id", session.firmId!)
        .single();
    return NextResponse.json({ role: "firm", firm });
}
