import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { generateAiSearchContent } from "@/lib/ai/content-generate";
import { parseAiContent } from "@/lib/ai-content";

export const maxDuration = 300;

export async function POST(req: Request) {
    // 특별 백필 시크릿 또는 admin token으로 인증
    const secret = new URL(req.url).searchParams.get("secret");
    if (
        !verifyAdminToken(req) &&
        !(process.env.BACKFILL_SECRET && secret === process.env.BACKFILL_SECRET)
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // macdee 채널의 모든 글 조회 (AI Search 콘텐츠가 여기 저장됨)
    const { data: aiSearchPosts, error: fetchError } = await supabase
        .from("contents")
        .select("id, title, body, lawyer_id, channel")
        .eq("channel", "macdee")
        .eq("status", "published")
        .order("created_at", { ascending: false });

    console.log("[backfill] AI Search posts query result:", {
        error: fetchError,
        count: aiSearchPosts?.length,
        posts: aiSearchPosts?.slice(0, 3).map(p => ({ id: p.id, title: p.title.slice(0, 40) })),
    });

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!aiSearchPosts || aiSearchPosts.length === 0) {
        // 전체 contents 글 수도 확인
        const { data: allPosts } = await supabase
            .from("contents")
            .select("id, channel")
            .limit(10);
        console.log("[backfill] All posts sample:", allPosts?.map(p => p.channel));
        return NextResponse.json({
            message: "No AI Search posts found",
            count: 0,
            debug: { allChannels: allPosts?.map(p => p.channel) },
        });
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
    // 특별 백필 시크릿 또는 admin token으로 인증
    const secret = new URL(req.url).searchParams.get("secret");
    if (
        !verifyAdminToken(req) &&
        !(process.env.BACKFILL_SECRET && secret === process.env.BACKFILL_SECRET)
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 전체 채널 통계 먼저 확인
    const { data: allPosts } = await supabase
        .from("contents")
        .select("channel")
        .eq("status", "published");

    const channelStats = (allPosts || []).reduce((acc: Record<string, number>, p) => {
        acc[p.channel || "null"] = (acc[p.channel || "null"] || 0) + 1;
        return acc;
    }, {});

    // macdee 채널 글 목록 조회 (미리보기) - AI Search 콘텐츠
    const { data: posts, error } = await supabase
        .from("contents")
        .select("id, title, channel, created_at, body")
        .eq("channel", "macdee")
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
        allChannelStats: channelStats,
        instruction: "POST to /api/admin/backfill-ai-search to start backfill",
    });
}
