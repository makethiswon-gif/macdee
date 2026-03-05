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

// GET: List all contents
export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = await createAdminClient();
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const status = url.searchParams.get("status") || "";
        const channel = url.searchParams.get("channel") || "";
        const limit = 20;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("contents")
            .select("id, upload_id, lawyer_id, channel, title, status, created_at, updated_at", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) query = query.eq("status", status);
        if (channel) query = query.eq("channel", channel);

        const { data: contents, count } = await query;

        // Enrich with lawyer names
        const lawyerIds = [...new Set(contents?.map((c) => c.lawyer_id) || [])];
        const { data: lawyers } = await supabase
            .from("lawyers")
            .select("id, name, office_name")
            .in("id", lawyerIds);

        const lawyerMap = new Map(lawyers?.map((l) => [l.id, l]) || []);
        const enriched = contents?.map((c) => ({
            ...c,
            lawyer_name: lawyerMap.get(c.lawyer_id)?.name || "알 수 없음",
            office_name: lawyerMap.get(c.lawyer_id)?.office_name || "",
        }));

        return NextResponse.json({ contents: enriched, total: count || 0, page, limit });
    } catch (err) {
        console.error("[Admin] Contents list error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
