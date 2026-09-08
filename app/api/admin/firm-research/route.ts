import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { isStrategyFirmId, isStrategySameOrigin } from "@/lib/portal-strategy";
import { createServiceClient } from "@/lib/supabase/server";
import {
    applyResearchToProfiles, extractHomepageColor, FirmResearchError,
    researchFirmWithAI, researchSetupMissing, type FirmResearchReport,
} from "@/lib/firm-research";

export const dynamic = "force-dynamic";
// 웹 검색 리서치는 수 분 걸릴 수 있다 — 이 라우트만 길게 잡는다.
export const maxDuration = 300;
const noStore = { "Cache-Control": "private, no-store" };

export type FirmResearchRow = {
    firm_id: string; report: FirmResearchReport; model: string | null;
    brand_color: string | null; applied_profiles: { id: string; name: string }[];
    generated_at: string;
};

export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    const db = createServiceClient();
    const { data, error } = await db.from("portal_firm_research")
        .select("firm_id,report,model,brand_color,applied_profiles,generated_at")
        .abortSignal(AbortSignal.timeout(12_000));
    if (error) {
        if (researchSetupMissing(error)) return NextResponse.json({ research: [], setupRequired: true }, { headers: noStore });
        return NextResponse.json({ error: "리서치 기록을 불러오지 못했습니다." }, { status: 500, headers: noStore });
    }
    return NextResponse.json({ research: data || [] }, { headers: noStore });
}

export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
    if (!isStrategySameOrigin(request)) return NextResponse.json({ error: "동일한 사이트에서만 실행할 수 있습니다." }, { status: 403, headers: noStore });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON 요청이 필요합니다." }, { status: 400, headers: noStore }); }
    const firmId = (body as Record<string, unknown>)?.firmId;
    if (!isStrategyFirmId(firmId)) return NextResponse.json({ error: "로펌 ID를 확인해 주세요." }, { status: 400, headers: noStore });

    const db = createServiceClient();
    try {
        const { data: firm, error: firmError } = await db.from("portal_firms").select("id,name").eq("id", firmId).abortSignal(AbortSignal.timeout(12_000)).maybeSingle();
        if (firmError || !firm) return NextResponse.json({ error: "로펌을 찾을 수 없습니다." }, { status: 404, headers: noStore });

        // 교차 확인용 단서 — 등록된 홈페이지·블로그·프로필 정보를 모아 넘긴다.
        const hints: string[] = [];
        const { data: marketing } = await db.from("portal_marketing_profiles").select("profile").eq("firm_id", firmId).abortSignal(AbortSignal.timeout(8_000)).maybeSingle();
        const profile = (marketing?.profile ?? {}) as Record<string, string>;
        if (profile.website_url) hints.push(`공식 홈페이지: ${profile.website_url}`);
        if (profile.naver_blog_url) hints.push(`네이버 블로그: ${profile.naver_blog_url}`);
        if (profile.naver_place_url) hints.push(`네이버 플레이스: ${profile.naver_place_url}`);
        if (profile.instagram_url) hints.push(`인스타그램: ${profile.instagram_url}`);
        const { data: blogProfiles } = await db.from("blog_profiles").select("lawyer_name,office_name,website,address,specialty").abortSignal(AbortSignal.timeout(8_000));
        const norm = (s: string) => s.replace(/법무법인|법률사무소|변호사|사무소|\s+/g, "").toLowerCase();
        for (const row of blogProfiles || []) {
            const office = norm((row.office_name as string) || "");
            const target = norm(firm.name as string);
            if (!office || !target || (!office.includes(target) && !target.includes(office))) continue;
            const name = ((row.lawyer_name as string) || "").split("||")[0];
            hints.push(`등록 변호사: ${name} (${row.office_name})${row.address ? ` · 주소 ${row.address}` : ""}${row.website ? ` · ${row.website}` : ""}${Array.isArray(row.specialty) && row.specialty.length ? ` · 분야 ${(row.specialty as string[]).join(", ")}` : ""}`);
        }

        const { report, model } = await researchFirmWithAI(firm.name as string, hints, request.signal);

        // 브랜드 컬러 — 홈페이지 실측 우선, 실패 시 AI 관찰값.
        const homepageUrl = report.homepage.url || profile.website_url || "";
        const measured = homepageUrl ? await extractHomepageColor(homepageUrl) : { hex: "", source: "" };
        const brandColor = measured.hex || report.homepage.brandColorHex || "";

        const applied = await applyResearchToProfiles(firm.name as string, report, brandColor, db);

        let saved = true;
        let setupRequired = false;
        const now = new Date().toISOString();
        const { error: saveError } = await db.from("portal_firm_research").upsert({
            firm_id: firmId, report, model, brand_color: brandColor || null,
            applied_profiles: applied, generated_at: now, updated_at: now,
        }, { onConflict: "firm_id" }).abortSignal(AbortSignal.timeout(12_000));
        if (saveError) {
            saved = false;
            setupRequired = researchSetupMissing(saveError);
        }

        return NextResponse.json({
            research: { firm_id: firmId, report, model, brand_color: brandColor || null, applied_profiles: applied, generated_at: now } satisfies FirmResearchRow,
            brandColorSource: measured.source || (report.homepage.brandColorHex ? "ai-관찰" : ""),
            saved, ...(setupRequired ? { setupRequired: true } : {}),
        }, { headers: noStore });
    } catch (error) {
        if (error instanceof FirmResearchError) {
            return NextResponse.json({ error: error.message, ...(error.setupRequired ? { setupRequired: true } : {}) }, { status: error.status, headers: noStore });
        }
        console.error("[FirmResearch] failed", error instanceof Error ? error.name : "UnknownError");
        return NextResponse.json({ error: "리서치를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: noStore });
    }
}
