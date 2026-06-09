import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { generateAiSearchContent } from "@/lib/ai/content-generate";
import { parseAiContent } from "@/lib/ai-content";

export const maxDuration = 300;

export async function POST(req: Request) {
    if (!verifyAdminToken(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // AI Search 채널의 모든 글 조회
    const { data: aiSearchPosts, error: fetchError } = await supabase
        .from("contents")
        .select("id, title, body, lawyer_id, channel")
        .eq("channel", "ai_search")
        .eq("status", "published")
        .order("created_at", { ascending: false });

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!aiSearchPosts || aiSearchPosts.length === 0) {
        return NextResponse.json({ message: "No AI Search posts found", count: 0 });
    }

    const results: { id: string; title: string; success: boolean; error?: string }[] = [];

    // 각 글을 maxTokens: 5000으로 재생성
    for (const post of aiSearchPosts) {
        try {
            // 변호사 정보 조회 (프롬프트에 필요)
            const { data: lawyer } = await supabase
                .from("lawyers")
                .select("name")
                .eq("id", post.lawyer_id)
                .single();

            if (!lawyer) {
                results.push({
                    id: post.id,
                    title: post.title,
                    success: false,
                    error: "Lawyer not found",
                });
                continue;
            }

            // 현재 본문을 기반으로 AI Search 콘텐츠 재생성 (maxTokens: 5000)
            const aiResult = await generateAiSearchContent(
                post.body || post.title,
                post.title,
                lawyer.name,
                5000 // maxTokens
            );

            if (!aiResult) {
                results.push({
                    id: post.id,
                    title: post.title,
                    success: false,
                    error: "AI generation failed",
                });
                continue;
            }

            const parsed = parseAiContent(aiResult) || {
                title: post.title,
                body: aiResult,
            };

            // DB 업데이트
            const { error: updateError } = await supabase
                .from("contents")
                .update({
                    title: parsed.title || post.title,
                    body: parsed.body || aiResult,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", post.id);

            if (updateError) {
                results.push({
                    id: post.id,
                    title: post.title,
                    success: false,
                    error: updateError.message,
                });
            } else {
                results.push({
                    id: post.id,
                    title: post.title,
                    success: true,
                });
            }
        } catch (err) {
            results.push({
                id: post.id,
                title: post.title,
                success: false,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    const successful = results.filter((r) => r.success).length;
    return NextResponse.json({
        message: `Backfill completed: ${successful}/${results.length} posts updated`,
        total: results.length,
        successful,
        results,
    });
}

export async function GET(req: Request) {
    if (!verifyAdminToken(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // AI Search 채널 글 목록 조회 (미리보기)
    const { data: posts, error } = await supabase
        .from("contents")
        .select("id, title, channel, created_at, body")
        .eq("channel", "ai_search")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = posts?.map((p) => ({
        id: p.id,
        title: p.title,
        currentBodyLength: (p.body || "").length,
        createdAt: p.created_at,
    })) || [];

    return NextResponse.json({
        message: "Preview of AI Search posts to be backfilled",
        count: posts?.length || 0,
        posts: stats,
        instruction: "POST to /api/admin/backfill-ai-search to start backfill",
    });
}
