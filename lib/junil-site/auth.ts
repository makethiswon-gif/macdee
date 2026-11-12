import crypto from "crypto";
import { verifyAdminTokenValue } from "@/lib/admin-auth";

// 준일 홈페이지 관리자 모드 로그인.
// 계정 두 개: 맥디 관리자(ADMIN_ID/ADMIN_PW)와 준일 직원용(JUNIL_ADMIN_ID/JUNIL_ADMIN_PW).
// 준일 계정은 Vercel 환경변수에만 둔다(저장소가 공개라 코드·커밋에 넣지 않음).
// 컴퓨터마다 한 번 로그인하면 30일 유지. 이미 /admin 에 로그인한 브라우저(admin_token)도 통과.

export const JUNIL_COOKIE = "junil_admin";
export const JUNIL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const ADMIN_PW = process.env.ADMIN_PW ?? "";
const JUNIL_ID = process.env.JUNIL_ADMIN_ID ?? "";
const JUNIL_PW = process.env.JUNIL_ADMIN_PW ?? "";
const ACCOUNTS = ([[ADMIN_ID, ADMIN_PW], [JUNIL_ID, JUNIL_PW]] as [string, string][]).filter(([i, p]) => i && p && !i.includes(":"));

const sign = (payload: string) => crypto.createHmac("sha256", SECRET).update(`junil-site|${payload}`).digest("hex");

export function issueJunilToken(id: string): string {
    const payload = `${id}:${Date.now()}:${crypto.randomBytes(12).toString("hex")}`;
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
        return ACCOUNTS.some(([a]) => a === id) && Date.now() - Number(issued) < JUNIL_COOKIE_MAX_AGE * 1000;
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

/** 맞으면 로그인한 계정 아이디, 틀리면 null */
export function checkPassword(id: string, pw: string): string | null {
    if (!SECRET) return null;
    const a = crypto.createHash("sha256").update(`${id}\n${pw}`).digest();
    let hit: string | null = null;
    for (const [i, p] of ACCOUNTS) {
        const b = crypto.createHash("sha256").update(`${i}\n${p}`).digest();
        if (crypto.timingSafeEqual(a, b)) hit = i;
    }
    return hit;
}
