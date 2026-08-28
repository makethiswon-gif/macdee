import crypto from "crypto";

// Client Portal 인증.
//
// 두 역할:
//   admin — 대표. 기존 /admin 로그인(admin_token 쿠키)을 그대로 인정한다.
//   firm  — 로펌. 대표가 발급한 접속 코드로 로그인 → portal_token 쿠키.
//
// portal_token = base64url("portal:{firmId}:{exp}:{hmac}")
// 서명 비밀은 ADMIN_TOKEN_SECRET 을 공유한다(별도 키 관리 지점을 늘리지 않는다).

const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

function hmac(payload: string): string {
    return crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
}

export function signPortalToken(firmId: string): string {
    const exp = Math.floor(Date.now() / 1000) + THIRTY_DAYS;
    const payload = `portal:${firmId}:${exp}`;
    return Buffer.from(`${payload}:${hmac(payload)}`).toString("base64url");
}

export function verifyPortalToken(token: string | undefined | null): string | null {
    if (!token || !TOKEN_SECRET) return null;
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const parts = decoded.split(":");
        if (parts.length !== 4 || parts[0] !== "portal") return null;
        const [, firmId, expStr, sig] = parts;
        const payload = `portal:${firmId}:${expStr}`;
        const expected = hmac(payload);
        if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
        if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
        return firmId;
    } catch {
        return null;
    }
}

/** admin_token 쿠키 값 검증 — lib/admin-auth 와 같은 스킴, 쿠키 "값"을 받는 버전 */
export function verifyAdminCookieValue(token: string | undefined | null): boolean {
    if (!token || !TOKEN_SECRET) return false;
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const lastColon = decoded.lastIndexOf(":");
        if (lastColon === -1) return false;
        const payload = decoded.substring(0, lastColon);
        const sig = decoded.substring(lastColon + 1);
        if (!payload.startsWith(ADMIN_ID)) return false;
        return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(hmac(payload), "hex"));
    } catch {
        return false;
    }
}

export interface PortalSession {
    role: "admin" | "firm";
    firmId: string | null; // admin 은 요청별로 firm 을 선택한다
}

/** Route Handler 용 — Request 헤더에서 세션을 읽는다 */
export function getPortalSession(request: Request): PortalSession | null {
    const cookie = request.headers.get("cookie") ?? "";
    const admin = cookie.match(/admin_token=([^;]+)/)?.[1];
    if (verifyAdminCookieValue(admin)) return { role: "admin", firmId: null };
    const portal = cookie.match(/portal_token=([^;]+)/)?.[1];
    const firmId = verifyPortalToken(portal);
    if (firmId) return { role: "firm", firmId };
    return null;
}
