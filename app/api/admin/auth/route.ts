import { NextResponse } from "next/server";

const ADMIN_ID = "macdee";
const ADMIN_PW = "02208888md!";

// POST: Admin login
export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (username === ADMIN_ID && password === ADMIN_PW) {
            // Generate a simple session token
            const token = Buffer.from(`${ADMIN_ID}:${Date.now()}:macdee_admin_secret`).toString("base64");

            const response = NextResponse.json({ success: true });
            response.cookies.set("admin_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24, // 24 hours
                path: "/",
            });
            return response;
        }

        return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DELETE: Admin logout
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("admin_token");
    return response;
}

// GET: Check admin auth
export async function GET(request: Request) {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
        const decoded = Buffer.from(token, "base64").toString();
        if (decoded.startsWith(ADMIN_ID) && decoded.includes("macdee_admin_secret")) {
            return NextResponse.json({ authenticated: true, username: ADMIN_ID });
        }
    } catch {
        // invalid token
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
}
