import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const lawyerId = url.searchParams.get("lawyer_id");
    if (!lawyerId) {
        return NextResponse.json({ error: "lawyer_id required" }, { status: 400 });
    }

    try {
        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from("contents")
            .select("id, title, body, channel, created_at")
            .eq("lawyer_id", lawyerId)
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(200);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ posts: data || [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
