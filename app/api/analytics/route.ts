import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch analytics summary for current user
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get("days") || "30");

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Overall stats
        const { data: uploads } = await supabase
            .from("uploads")
            .select("id", { count: "exact" })
            .eq("lawyer_id", lawyer.id);

        const { data: contents } = await supabase
            .from("contents")
            .select("id, channel, status", { count: "exact" })
            .eq("lawyer_id", lawyer.id);

        const { data: publications } = await supabase
            .from("publications")
            .select("id, channel, published_at", { count: "exact" })
            .eq("lawyer_id", lawyer.id);

        const { data: analytics } = await supabase
            .from("analytics")
            .select("*")
            .eq("lawyer_id", lawyer.id)
            .gte("date", since.toISOString().split("T")[0])
            .order("date", { ascending: true });

        // Channel breakdown
        const channelStats: Record<string, { contents: number; published: number; views: number; clicks: number; inquiries: number }> = {};
        for (const ch of ["blog", "instagram", "google", "macdee"]) {
            channelStats[ch] = {
                contents: (contents || []).filter((c) => c.channel === ch).length,
                published: (publications || []).filter((p) => p.channel === ch).length,
                views: 0, clicks: 0, inquiries: 0,
            };
        }

        // Aggregate analytics by channel
        for (const a of analytics || []) {
            // Find the channel via publication
            const pub = (publications || []).find((p) => p.id === a.publication_id);
            if (pub && channelStats[pub.channel]) {
                channelStats[pub.channel].views += a.views;
                channelStats[pub.channel].clicks += a.clicks;
                channelStats[pub.channel].inquiries += a.inquiries;
            }
        }

        // Totals
        const totalViews = (analytics || []).reduce((s, a) => s + a.views, 0);
        const totalClicks = (analytics || []).reduce((s, a) => s + a.clicks, 0);
        const totalInquiries = (analytics || []).reduce((s, a) => s + a.inquiries, 0);

        // Daily data for chart
        const dailyData = (analytics || []).reduce((acc: Record<string, { views: number; clicks: number; inquiries: number }>, a) => {
            const d = a.date;
            if (!acc[d]) acc[d] = { views: 0, clicks: 0, inquiries: 0 };
            acc[d].views += a.views;
            acc[d].clicks += a.clicks;
            acc[d].inquiries += a.inquiries;
            return acc;
        }, {});

        return NextResponse.json({
            overview: {
                totalUploads: uploads?.length || 0,
                totalContents: contents?.length || 0,
                totalPublished: publications?.length || 0,
                totalViews,
                totalClicks,
                totalInquiries,
                ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0",
            },
            channelStats,
            dailyData,
            period: days,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
