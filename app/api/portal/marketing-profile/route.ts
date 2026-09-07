import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { decryptPortalCredentials, encryptPortalCredentials, PortalCredentialsConfigurationError } from "@/lib/portal-credentials";
import {
    MARKETING_SECRET_KEYS, emptySecretPresence, marketingProfileSameOrigin, marketingProfileSetupMissing,
    validateClearSecrets, validateMarketingProfile, validateMarketingSecrets,
    type MarketingSecrets,
} from "@/lib/portal-marketing-profile";
import { isPortalUuid } from "@/lib/portal-requests";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

function resolveFirmId(session: { role: "admin" | "firm"; firmId: string | null }, request: Request, bodyFirmId?: unknown) {
    if (session.role === "firm") return session.firmId;
    return typeof bodyFirmId === "string" ? bodyFirmId : new URL(request.url).searchParams.get("firm");
}

function setupError(admin: boolean) {
    return json({ setupRequired: true, error: admin ? "마케팅 정보 저장소를 준비해 주세요. 018_portal_marketing_profiles.sql을 적용해야 합니다." : "마케팅 정보 메뉴를 준비 중입니다. 담당자에게 문의해 주세요." }, 503);
}

function securityError(error: unknown, admin: boolean) {
    if (error instanceof PortalCredentialsConfigurationError) {
        return json({ configurationRequired: true, error: admin ? "암호화 키 PORTAL_CREDENTIALS_KEY 설정이 필요합니다." : "보안 저장소를 준비 중입니다. 담당자에게 문의해 주세요." }, 503);
    }
    return json({ error: "마케팅 정보를 안전하게 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
}

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "로그인이 필요합니다." }, 401);
    const admin = session.role === "admin";
    const firmId = resolveFirmId(session, request);
    if (!isPortalUuid(firmId)) return json({ error: "로펌 정보가 올바르지 않습니다." }, 400);

    const db = createServiceClient();
    const { data, error } = await db.from("portal_marketing_profiles")
        .select("profile,credentials_encrypted,updated_by,updated_at").eq("firm_id", firmId).maybeSingle();
    if (error) return marketingProfileSetupMissing(error) ? setupError(admin) : json({ error: "마케팅 정보를 불러오지 못했습니다." }, 500);
    try {
        const secrets = decryptPortalCredentials(firmId, data?.credentials_encrypted);
        const secretPresence = emptySecretPresence();
        for (const key of MARKETING_SECRET_KEYS) secretPresence[key] = typeof secrets[key] === "string" && !!secrets[key];
        return json({ profile: data?.profile ?? {}, secretPresence, updatedBy: data?.updated_by ?? null, updatedAt: data?.updated_at ?? null });
    } catch (error) { return securityError(error, admin); }
}

export async function PATCH(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "로그인이 필요합니다." }, 401);
    if (!marketingProfileSameOrigin(request)) return json({ error: "같은 사이트에서 다시 저장해 주세요." }, 403);
    if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "JSON 입력이 필요합니다." }, 415);
    const admin = session.role === "admin";
    let input: Record<string, unknown>;
    try {
        const parsed = await request.json();
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("입력 형식이 올바르지 않습니다.");
        input = parsed as Record<string, unknown>;
        if (Object.keys(input).some((key) => !["firmId", "profile", "secrets", "clearSecrets"].includes(key))) throw new Error("허용되지 않은 입력 항목이 있습니다.");
    } catch (error) { return json({ error: error instanceof Error ? error.message : "입력 형식이 올바르지 않습니다." }, 400); }
    const firmId = resolveFirmId(session, request, input.firmId);
    if (!isPortalUuid(firmId)) return json({ error: "로펌 정보가 올바르지 않습니다." }, 400);

    let profile: ReturnType<typeof validateMarketingProfile>;
    let incomingSecrets: ReturnType<typeof validateMarketingSecrets>;
    let clearSecrets: ReturnType<typeof validateClearSecrets>;
    try {
        profile = validateMarketingProfile(input.profile ?? {});
        incomingSecrets = validateMarketingSecrets(input.secrets ?? {});
        clearSecrets = validateClearSecrets(input.clearSecrets);
    } catch (error) { return json({ error: error instanceof Error ? error.message : "입력 내용을 확인해 주세요." }, 400); }

    const db = createServiceClient();
    const { data: current, error: readError } = await db.from("portal_marketing_profiles")
        .select("profile,credentials_encrypted").eq("firm_id", firmId).maybeSingle();
    if (readError) return marketingProfileSetupMissing(readError) ? setupError(admin) : json({ error: "기존 마케팅 정보를 확인하지 못했습니다." }, 500);
    try {
        const credentials = decryptPortalCredentials(firmId, current?.credentials_encrypted) as MarketingSecrets;
        for (const key of clearSecrets) delete credentials[key];
        for (const [key, value] of Object.entries(incomingSecrets)) if (value) credentials[key as keyof MarketingSecrets] = value;
        const mergedProfile = { ...((current?.profile as Record<string, string> | null) ?? {}), ...profile };
        const { data, error } = await db.from("portal_marketing_profiles").upsert({
            firm_id: firmId, profile: mergedProfile, credentials_encrypted: encryptPortalCredentials(firmId, credentials),
            updated_by: session.role, updated_at: new Date().toISOString(),
        }, { onConflict: "firm_id" }).select("profile,updated_by,updated_at").single();
        if (error) {
            if (marketingProfileSetupMissing(error)) return setupError(admin);
            if (error.code === "23503") return json({ error: "로펌을 찾을 수 없습니다." }, 400);
            return json({ error: "마케팅 정보를 저장하지 못했습니다. 입력 내용은 유지됩니다." }, 500);
        }
        const secretPresence = emptySecretPresence();
        for (const key of MARKETING_SECRET_KEYS) secretPresence[key] = typeof credentials[key] === "string" && !!credentials[key];
        return json({ profile: data.profile, secretPresence, updatedBy: data.updated_by, updatedAt: data.updated_at });
    } catch (error) { return securityError(error, admin); }
}
