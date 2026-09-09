import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { isStrategySameOrigin } from "@/lib/portal-strategy";
import { createServiceClient } from "@/lib/supabase/server";
import { briefingCandidates, legacyCandidates, loadStrengthLibrary, researchCandidates, saveStrengthLibrary, StrengthStoreError } from "@/lib/blog-strengths-store";
import { validProfileId } from "@/lib/blog-strengths";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const fail = (e: unknown) => NextResponse.json({ error: e instanceof Error ? e.message : "강점 저장소 오류" }, { status: e instanceof StrengthStoreError ? e.status : 500, headers });
export async function GET(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    try {
        const id = new URL(request.url).searchParams.get("profileId");
        if (!validProfileId(id)) throw new StrengthStoreError("변호사를 선택해주세요.", 400);
        const db = createServiceClient();
        const { data: profile, error } = await db.from("blog_profiles").select("id,lawyer_name,office_name,brand_lines,fields,specialty").eq("id", id).single();
        if (error || !profile) throw new StrengthStoreError("변호사 프로필을 찾을 수 없습니다.", 404);
        const library = await loadStrengthLibrary(id, db);
        const { data: firms, error: firmsError } = await db.from("portal_firms").select("id,name").order("name");
        if (firmsError) throw new StrengthStoreError("로펌 목록을 읽지 못했습니다.");
        const params = new URL(request.url).searchParams;
        const candidateFirmId = params.has("firmId") ? params.get("firmId") || "" : library.firmId;
        if (candidateFirmId && !firms?.some((firm) => firm.id === candidateFirmId)) throw new StrengthStoreError("로펌 ID를 확인해주세요.", 400);
        return NextResponse.json({ library, firms, fields: profile.fields?.length ? profile.fields : profile.specialty || [],
            legacy: legacyCandidates(profile), research: candidateFirmId ? await researchCandidates(candidateFirmId, db) : null,
            briefings: await briefingCandidates(db) }, { headers });
    } catch (e) { return fail(e); }
}
export async function POST(request: Request) {
    if (!verifyAdminToken(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    if (!isStrategySameOrigin(request)) return NextResponse.json({ error: "동일한 사이트에서 저장해주세요." }, { status: 403, headers });
    try { return NextResponse.json({ library: await saveStrengthLibrary(await request.json()) }, { headers }); }
    catch (e) { return fail(e); }
}
