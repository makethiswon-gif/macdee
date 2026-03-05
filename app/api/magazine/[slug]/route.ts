import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// GET: Public magazine article by slug
export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const supabase = await createAdminClient();

        const { data: magazine, error } = await supabase
            .from("magazines")
            .select("*")
            .eq("slug", slug)
            .single();

        if (error || !magazine) {
            return NextResponse.json({ error: "기사를 찾을 수 없습니다." }, { status: 404 });
        }

        // Increment view count
        await supabase
            .from("magazines")
            .update({ view_count: (magazine.view_count || 0) + 1 })
            .eq("id", magazine.id);

        return NextResponse.json({ magazine });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
