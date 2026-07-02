import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";


export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = await createAdminClient();
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "30");

        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString();

        // Get all lawyers
        const { data: lawyers } = await supabase
            .from("lawyers")
            .select("id, name, slug, office_name, brand_color, profile_image_url")
            .order("created_at", { ascending: false });

        if (!lawyers || lawyers.length === 0) {
            return NextResponse.json({ lawyers: [], totals: { visitors: 0, pageviews: 0, avgDuration: 0 } });
        }

        // Get all blog visits in period — 페이지네이션으로 전량 조회 (Supabase 기본 1000행 제한 회피)
        type VisitRow = { lawyer_id: string; post_id: string | null; session_id: string; page_path: string | null; duration_seconds: number | null; created_at: string };
        const allVisits: VisitRow[] = [];
        const VISIT_PAGE = 1000;
        for (let from = 0; ; from += VISIT_PAGE) {
            const { data, error } = await supabase
                .from("blog_visits")
                .select("lawyer_id, post_id, session_id, page_path, duration_seconds, created_at")
                .gte("created_at", sinceStr)
                .order("created_at", { ascending: false })
                .range(from, from + VISIT_PAGE - 1);
            if (error || !data || data.length === 0) break;
            allVisits.push(...(data as VisitRow[]));
            if (data.length < VISIT_PAGE) break;
        }

        // 방문된 post_id의 제목만 조회 (상태 무관, 청크로 나눠 1000행/URL 길이 제한 회피)
        const neededPostIds = [...new Set(allVisits.map(v => v.post_id).filter(Boolean))] as string[];
        const contentMap = new Map<string, string>();
        const ID_CHUNK = 150;
        for (let i = 0; i < neededPostIds.length; i += ID_CHUNK) {
            const ids = neededPostIds.slice(i, i + ID_CHUNK);
            const { data: rows } = await supabase.from("contents").select("id, title").in("id", ids);
            for (const c of (rows || [])) contentMap.set(c.id, c.title);
        }

        // Aggregate per lawyer
        const lawyerStats = lawyers.map(lawyer => {
            const lawyerVisits = allVisits.filter(v => v.lawyer_id === lawyer.id);
            const uniqueSessions = new Set(lawyerVisits.map(v => v.session_id));
            const totalDuration = lawyerVisits.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
            const avgDuration = lawyerVisits.length > 0 ? Math.round(totalDuration / lawyerVisits.length) : 0;

            // Daily breakdown
            const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {};
            for (const v of lawyerVisits) {
                const date = v.created_at.split("T")[0];
                if (!dailyMap[date]) dailyMap[date] = { views: 0, sessions: new Set() };
                dailyMap[date].views++;
                dailyMap[date].sessions.add(v.session_id);
            }
            const daily = Object.entries(dailyMap)
                .map(([date, d]) => ({ date, views: d.views, visitors: d.sessions.size }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Top posts
            const postMap: Record<string, { views: number; sessions: Set<string>; totalDuration: number }> = {};
            for (const v of lawyerVisits) {
                if (!v.post_id) continue;
                if (!postMap[v.post_id]) postMap[v.post_id] = { views: 0, sessions: new Set(), totalDuration: 0 };
                postMap[v.post_id].views++;
                postMap[v.post_id].sessions.add(v.session_id);
                postMap[v.post_id].totalDuration += v.duration_seconds || 0;
            }
            const topPosts = Object.entries(postMap)
                .map(([postId, d]) => ({
                    postId,
                    title: contentMap.get(postId) || "제목 없음",
                    views: d.views,
                    visitors: d.sessions.size,
                    avgDuration: d.views > 0 ? Math.round(d.totalDuration / d.views) : 0,
                }))
                .sort((a, b) => b.views - a.views)
                .slice(0, 5);

            return {
                id: lawyer.id,
                name: lawyer.name,
                slug: lawyer.slug,
                office_name: lawyer.office_name || "",
                brand_color: lawyer.brand_color || "#3563AE",
                profile_image_url: lawyer.profile_image_url || "",
                visitors: uniqueSessions.size,
                pageviews: lawyerVisits.length,
                avgDuration,
                daily,
                topPosts,
            };
        });

        // Filter to only lawyers with visits (but also include those without for overview)
        const withVisits = lawyerStats.filter(l => l.pageviews > 0);
        const withoutVisits = lawyerStats.filter(l => l.pageviews === 0);

        // Total stats
        const totalVisitors = new Set(allVisits.map(v => v.session_id)).size;
        const totalPageviews = allVisits.length;
        const totalDuration = allVisits.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
        const totalAvgDuration = allVisits.length > 0 ? Math.round(totalDuration / allVisits.length) : 0;

        // Global daily trend
        const globalDailyMap: Record<string, { views: number; sessions: Set<string> }> = {};
        for (const v of allVisits) {
            const date = v.created_at.split("T")[0];
            if (!globalDailyMap[date]) globalDailyMap[date] = { views: 0, sessions: new Set() };
            globalDailyMap[date].views++;
            globalDailyMap[date].sessions.add(v.session_id);
        }
        const globalDaily = Object.entries(globalDailyMap)
            .map(([date, d]) => ({ date, views: d.views, visitors: d.sessions.size }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            lawyers: [...withVisits, ...withoutVisits],
            totals: {
                visitors: totalVisitors,
                pageviews: totalPageviews,
                avgDuration: totalAvgDuration,
                lawyersWithTraffic: withVisits.length,
            },
            globalDaily,
            period: days,
        });
    } catch (err) {
        console.error("[Admin] Blog analytics error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
