import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET: Public magazine list
export async function GET(request: Request) {
    try {
        const supabase = await createAdminClient();
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") || "1");
        const category = url.searchParams.get("category") || "";
        const limit = 12;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("magazines")
            .select("id, title, slug, excerpt, category, tags, cover_image_url, view_count, published_at, author", { count: "exact" })
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);

        const { data, count } = await query;
        return NextResponse.json({ magazines: data || [], total: count || 0, page, limit });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
