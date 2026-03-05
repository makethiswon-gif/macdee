import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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
        office_name, experience_years, created_at, updated_at
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
