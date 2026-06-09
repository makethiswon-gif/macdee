import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/admin-auth";

export const maxDuration = 60;

export async function POST(req: Request) {
    // 특별 시크릿으로 인증
    const secret = new URL(req.url).searchParams.get("secret");
    if (
        !verifyAdminToken(req) &&
        !(process.env.BACKFILL_SECRET && secret === process.env.BACKFILL_SECRET)
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lawyerSlug } = await req.json();
    if (!lawyerSlug) {
        return NextResponse.json({ error: "lawyerSlug required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 변호사 찾기
    const { data: lawyer, error: lawyerError } = await supabase
        .from("lawyers")
        .select("id")
        .eq("slug", lawyerSlug)
        .single();

    if (lawyerError || !lawyer) {
        return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });
    }

    // 해당 변호사의 모든 published 글을 draft로 변경
    const { data: updated, error: updateError, count } = await supabase
        .from("contents")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("lawyer_id", lawyer.id)
        .eq("status", "published")
        .select("id, title");

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        message: `${lawyerSlug} 변호사의 ${updated?.length || 0}개 글이 비공개로 전환됨`,
        lawyerSlug,
        count: updated?.length || 0,
        posts: updated?.map(p => ({ id: p.id, title: p.title.slice(0, 50) })) || [],
    });
}
