import crypto from "crypto";

const ADMIN_ID = process.env.ADMIN_ID ?? "macdee";
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";

export function verifyAdminToken(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token || !TOKEN_SECRET) return false;
    try {
        const decoded = Buffer.from(token, "base64url").toString();
        const lastColon = decoded.lastIndexOf(":");
        if (lastColon === -1) return false;
        const payload = decoded.substring(0, lastColon);
        const sig = decoded.substring(lastColon + 1);
        if (!payload.startsWith(ADMIN_ID)) return false;
        const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"));
    } catch {
        return false;
    }
}
