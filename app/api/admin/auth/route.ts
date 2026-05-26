import { NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const ADMIN_PW = process.env.ADMIN_PW ?? "";
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";

function generateToken(): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const payload = `${ADMIN_ID}:${Date.now()}:${nonce}`;
    const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
    return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyToken(token: string): boolean {
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const lastColon = decoded.lastIndexOf(":");
        if (lastColon === -1) return false;
        const payload = decoded.substring(0, lastColon);
        const sig = decoded.substring(lastColon + 1);
        const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
    } catch {
        return false;
    }
}

// POST: Admin login
export async function POST(request: Request) {
    try {
        if (!ADMIN_PW || !TOKEN_SECRET) {
            console.error("[Admin Auth] ADMIN_PW or ADMIN_TOKEN_SECRET not configured");
            return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
        }

        const { username, password } = await request.json();

        if (username === ADMIN_ID && password === ADMIN_PW) {
            const token = generateToken();

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

    if (verifyToken(token)) {
        return NextResponse.json({ authenticated: true, username: ADMIN_ID });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
}
