import crypto from "crypto";
import { verifyAdminTokenValue } from "@/lib/admin-auth";

// 준일 홈페이지 관리자 모드 로그인.
// 새 비밀번호를 만들지 않고 맥디 관리자 계정(ADMIN_ID/ADMIN_PW)을 그대로 쓴다 — 아이디어 창고(lib/oyk-idea)와 같은 방식.
// 컴퓨터마다 한 번 로그인하면 30일 유지. 이미 /admin 에 로그인한 브라우저(admin_token)도 통과.

export const JUNIL_COOKIE = "junil_admin";
export const JUNIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const ADMIN_PW = process.env.ADMIN_PW ?? "";

const sign = (payload: string) => crypto.createHmac("sha256", SECRET).update(`junil-site|${payload}`).digest("hex");

export function issueJunilToken(): string {
    const payload = `${ADMIN_ID}:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;
    return Buffer.from(`${payload}:${sign(payload)}`).toString("base64url");
}

function verifyJunilToken(token: string | undefined): boolean {
    if (!token || !SECRET) return false;
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const cut = decoded.lastIndexOf(":");
        if (cut === -1) return false;
        const payload = decoded.slice(0, cut);
        const sig = Buffer.from(decoded.slice(cut + 1), "hex");
        const expected = Buffer.from(sign(payload), "hex");
        if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return false;
        const [id, issued] = payload.split(":");
        return id === ADMIN_ID && Date.now() - Number(issued) < JUNIL_COOKIE_MAX_AGE * 1000;
    } catch {
        return false;
    }
}

/** 쿠키 값 읽기 함수(next/headers cookies().get 또는 요청 헤더)를 받아 판단한다. */
export function isJunilAdmin(read: (name: string) => string | undefined): boolean {
    if (verifyJunilToken(read(JUNIL_COOKIE))) return true;
    const admin = read("admin_token");
    return !!admin && verifyAdminTokenValue(admin);
}

export function requestCookies(req: Request) {
    const header = req.headers.get("cookie") || "";
    return (name: string) => header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
}

export function checkPassword(id: string, pw: string): boolean {
    if (!ADMIN_PW || !SECRET) return false;
    const a = Buffer.from(`${id}\n${pw}`);
    const b = Buffer.from(`${ADMIN_ID}\n${ADMIN_PW}`);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
