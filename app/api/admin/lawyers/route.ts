import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch {
        return false;
    }
}

// GET: List all lawyers
export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = await createAdminClient();
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = 20;
        const offset = (page - 1) * limit;

        const { data: lawyers, count } = await supabase
            .from("lawyers")
            .select(`
        id, user_id, name, slug, email, phone, specialty, region,
        office_name, experience_years, plan, created_at, updated_at
      `, { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Get upload and content counts per lawyer
        const lawyerIds = lawyers?.map((l) => l.id) || [];

        const [uploadCounts, contentCounts, subData] = await Promise.all([
            supabase.from("uploads").select("lawyer_id").in("lawyer_id", lawyerIds),
            supabase.from("contents").select("lawyer_id").in("lawyer_id", lawyerIds),
            supabase.from("subscriptions").select("lawyer_id, plan, status").in("lawyer_id", lawyerIds),
        ]);

        const enriched = lawyers?.map((lawyer) => ({
            ...lawyer,
            uploads_count: uploadCounts.data?.filter((u) => u.lawyer_id === lawyer.id).length || 0,
            contents_count: contentCounts.data?.filter((c) => c.lawyer_id === lawyer.id).length || 0,
            subscription: subData.data?.find((s) => s.lawyer_id === lawyer.id) || null,
        }));

        return NextResponse.json({ lawyers: enriched, total: count || 0, page, limit });
    } catch (err) {
        console.error("[Admin] Lawyers list error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// PATCH: Update lawyer plan (RLS 우회를 위해 직접 service role 클라이언트 사용)
export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { lawyer_id, plan } = await request.json();
        if (!lawyer_id || !plan) {
            return NextResponse.json({ error: "lawyer_id, plan 필수" }, { status: 400 });
        }

        const validPlans = ["free", "30", "50", "100", "unlimited", "pro"];
        if (!validPlans.includes(plan)) {
            return NextResponse.json({ error: "유효하지 않은 플랜" }, { status: 400 });
        }

        // 직접 service role 클라이언트 생성 (RLS 확실히 우회)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
            return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
        }
        const supabase = createDirectClient(supabaseUrl, serviceKey);

        // 1단계: 업데이트
        const { error, count } = await supabase
            .from("lawyers")
            .update({ plan })
            .eq("id", lawyer_id);

        console.log(`[Admin] Update result: error=${error?.message || "none"}, count=${count}`);

        if (error) {
            console.error("[Admin] Plan update error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 2단계: 업데이트 확인
        const { data: updated, error: selectErr } = await supabase
            .from("lawyers")
            .select("id, name, plan")
            .eq("id", lawyer_id)
            .single();

        if (selectErr) {
            console.error("[Admin] Plan verify error:", selectErr);
        }

        const savedPlan = updated?.plan || plan;
        const name = updated?.name || "";
        console.log(`[Admin] Lawyer "${name}" (${lawyer_id}) plan → ${savedPlan} (requested: ${plan})`);

        if (savedPlan !== plan) {
            console.error(`[Admin] ⚠️ Plan mismatch! Requested: ${plan}, Got: ${savedPlan}`);
            return NextResponse.json({ error: `플랜이 저장되지 않았습니다 (현재: ${savedPlan})` }, { status: 500 });
        }

        return NextResponse.json({ success: true, plan: savedPlan, name });
    } catch (err) {
        console.error("[Admin] Plan update error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

