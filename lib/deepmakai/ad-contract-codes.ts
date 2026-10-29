// 딥마카이 광고 계약 서명 주소 코드(서버 전용). macdee 저장소가 공개라 코드를 소스에 적지 않고 서버 비밀값으로 만든다.
// 계약 건마다 광고주(gap)·을(eul) 링크가 따로 있다. 비밀값은 DEEPMAKAI_CONTRACT_SECRET, 없으면 ADMIN_TOKEN_SECRET.
import crypto from "node:crypto";
import { listDeals, type AdDeal } from "@/lib/deepmakai/ad-contract";
import { SHARE, type ShareRole } from "@/lib/deepmakai/revenue-share";

export type SignRole = "gap" | "eul";

function secret(): string {
    return process.env.DEEPMAKAI_CONTRACT_SECRET || process.env.ADMIN_TOKEN_SECRET || "";
}

export function dealCode(deal: AdDeal, role: SignRole): string {
    const s = secret();
    if (!s) return "";
    return crypto.createHmac("sha256", s).update(`deepmakai-ad:${deal.id}:${role}`).digest("base64url").replace(/[-_]/g, "x").slice(0, 16);
}

export function resolveCode(code: string): { deal: AdDeal; role: SignRole } | null {
    if (!/^[A-Za-z0-9]{16}$/.test(code || "")) return null;
    for (const deal of listDeals()) {
        for (const role of ["gap", "eul"] as const) {
            const want = dealCode(deal, role);
            if (want && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(code))) return { deal, role };
        }
    }
    return null;
}

// 광고 수익 배분 약정서(lib/deepmakai/revenue-share.ts): 다섯 당사자마다 링크가 따로 있다.
export function shareCode(role: ShareRole): string {
    const s = secret();
    if (!s) return "";
    return crypto.createHmac("sha256", s).update(`deepmakai-share:${SHARE.id}:${role}`).digest("base64url").replace(/[-_]/g, "x").slice(0, 16);
}

export function resolveShareCode(code: string): ShareRole | null {
    if (!/^[A-Za-z0-9]{16}$/.test(code || "")) return null;
    for (const { role } of SHARE.members) {
        const want = shareCode(role);
        if (want && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(code))) return role;
    }
    return null;
}
