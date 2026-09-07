import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { decryptPortalCredentials, PortalCredentialsConfigurationError } from "@/lib/portal-credentials";
import { MARKETING_SECRET_KEYS, marketingProfileSameOrigin, marketingProfileSetupMissing, type MarketingSecretKey } from "@/lib/portal-marketing-profile";
import { isPortalUuid } from "@/lib/portal-requests";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (session?.role !== "admin") return json({ error: "대표 관리자만 계정 정보를 확인할 수 있습니다." }, 401);
    if (!marketingProfileSameOrigin(request)) return json({ error: "같은 사이트에서 다시 요청해 주세요." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON 입력이 필요합니다." }, 415);
    let firmId: unknown;
    let keys: MarketingSecretKey[] = [];
    try {
        const input = await request.json();
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["firmId", "keys"].includes(key))) throw new Error();
        firmId = input.firmId;
        const requested = input.keys ?? MARKETING_SECRET_KEYS;
        if (!Array.isArray(requested) || requested.some((key) => typeof key !== "string" || !MARKETING_SECRET_KEYS.includes(key as MarketingSecretKey))) throw new Error();
        keys = [...new Set(requested)] as MarketingSecretKey[];
    } catch { return json({ error: "확인할 계정 정보가 올바르지 않습니다." }, 400); }
    if (!isPortalUuid(firmId)) return json({ error: "로펌 정보가 올바르지 않습니다." }, 400);

    const db = createServiceClient();
    const { data, error } = await db.from("portal_marketing_profiles").select("credentials_encrypted").eq("firm_id", firmId).maybeSingle();
    if (error) {
        if (marketingProfileSetupMissing(error)) return json({ setupRequired: true, error: "마케팅 정보 저장소를 준비해 주세요." }, 503);
        return json({ error: "계정 정보를 불러오지 못했습니다." }, 500);
    }
    try {
        const stored = decryptPortalCredentials(firmId, data?.credentials_encrypted);
        const credentials = Object.fromEntries(keys.filter((key) => stored[key]).map((key) => [key, stored[key]]));
        return json({ credentials });
    } catch (error) {
        if (error instanceof PortalCredentialsConfigurationError) return json({ configurationRequired: true, error: "암호화 키 설정이 필요합니다." }, 503);
        return json({ error: "계정 정보를 복호화하지 못했습니다. 암호화 키를 확인해 주세요." }, 500);
    }
}
