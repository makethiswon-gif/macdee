import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { getWritingDNA } from "@/lib/blog-writing-dna";

// 블로그(=변호사×분야) 하나하나의 발행 설정. 크롬 프로필, 카테고리, 담당 분야.
// 담당 분야가 주제 추천 범위를 제한하므로, 여기가 8개 블로그의 주제 충돌을 막는 지점이다.

function monthStartKst(): string {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1)).toISOString();
}

export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = await createAdminClient();

        // lawyer_id 는 마이그레이션 014 이후에만 존재 — 없으면 빼고 다시 읽는다
        const BASE_COLS =
            "id, lawyer_name, office_name, specialty, fields, naver_blog_id, chrome_profile, naver_category, monthly_quota, dna_salt";
        let migrated = true;
        let profiles: Record<string, unknown>[] | null = null;
        {
            const r1 = await supabase.from("blog_profiles").select(`${BASE_COLS}, lawyer_id`).order("created_at");
            if (r1.error && /lawyer_id/.test(r1.error.message)) {
                migrated = false;
                const r2 = await supabase.from("blog_profiles").select(BASE_COLS).order("created_at");
                if (r2.error) return NextResponse.json({ error: r2.error.message }, { status: 500 });
                profiles = r2.data;
            } else if (r1.error) {
                return NextResponse.json({ error: r1.error.message }, { status: 500 });
            } else {
                profiles = r1.data;
            }
        }

        // 이번 달 발행 수
        const { data: published } = await supabase
            .from("blog_posts")
            .select("profile_id")
            .eq("status", "published")
            .gte("published_at", monthStartKst());

        const counts: Record<string, number> = {};
        for (const row of published || []) {
            counts[row.profile_id as string] = (counts[row.profile_id as string] || 0) + 1;
        }

        const items = (profiles || []).map((p) => {
            const dna = getWritingDNA(p.id as string, (p.dna_salt as string) || "");
            return {
                id: p.id,
                lawyerName: String(p.lawyer_name || "").split("||")[0] || "(이름 없음)",
                officeName: p.office_name || "",
                specialty: p.specialty || [],
                fields: p.fields || [],
                naverBlogId: p.naver_blog_id || "",
                chromeProfile: p.chrome_profile || "",
                naverCategory: p.naver_category || "",
                monthlyQuota: p.monthly_quota ?? 0,
                dnaSalt: p.dna_salt || "",
                lawyerId: ((p as Record<string, unknown>).lawyer_id as string) || "",
                publishedThisMonth: counts[p.id as string] || 0,
                dna: {
                    voice: dna.voice.name,
                    heading: dna.heading.name,
                    emphasis: dna.emphasis.name,
                    structures: dna.structures.map((s) => s.name),
                },
            };
        });

        return NextResponse.json({ profiles: items, migrated });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id } = body;
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if ("naverBlogId" in body) patch.naver_blog_id = String(body.naverBlogId || "").trim() || null;
        if ("chromeProfile" in body) patch.chrome_profile = String(body.chromeProfile || "").trim() || null;
        if ("naverCategory" in body) patch.naver_category = String(body.naverCategory || "").trim() || null;
        if ("monthlyQuota" in body) patch.monthly_quota = Math.max(0, Number(body.monthlyQuota) || 0);
        if ("dnaSalt" in body) patch.dna_salt = String(body.dnaSalt || "");
        if ("lawyerId" in body) patch.lawyer_id = String(body.lawyerId || "").trim() || null;
        if ("fields" in body) {
            const list = Array.isArray(body.fields)
                ? body.fields
                : String(body.fields || "").split(",");
            patch.fields = list.map((f: string) => String(f).trim()).filter(Boolean);
        }

        const supabase = await createAdminClient();
        const { error } = await supabase.from("blog_profiles").update(patch).eq("id", id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
