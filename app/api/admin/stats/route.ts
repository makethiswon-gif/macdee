import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Verify admin token helper
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

// GET: Admin dashboard stats
export async function GET(request: Request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabase = await createAdminClient();

        // Get all stats in parallel
        const [
            { count: totalLawyers },
            { count: totalUploads },
            { count: totalContents },
            { count: publishedContents },
            { data: recentLawyers },
            { data: recentUploads },
            { data: subscriptions },
        ] = await Promise.all([
            supabase.from("lawyers").select("*", { count: "exact", head: true }),
            supabase.from("uploads").select("*", { count: "exact", head: true }),
            supabase.from("contents").select("*", { count: "exact", head: true }),
            supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "published"),
            supabase.from("lawyers").select("id, name, email, office_name, created_at").order("created_at", { ascending: false }).limit(10),
            supabase.from("uploads").select("id, type, title, status, created_at, lawyer_id").order("created_at", { ascending: false }).limit(10),
            supabase.from("subscriptions").select("plan, status, amount"),
        ]);

        // Calculate revenue
        const activeSubscriptions = subscriptions?.filter((s) => s.status === "active") || [];
        const monthlyRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
        const planDistribution: Record<string, number> = {};
        activeSubscriptions.forEach((s) => {
            planDistribution[s.plan] = (planDistribution[s.plan] || 0) + 1;
        });

        return NextResponse.json({
            stats: {
                totalLawyers: totalLawyers || 0,
                totalUploads: totalUploads || 0,
                totalContents: totalContents || 0,
                publishedContents: publishedContents || 0,
                activeSubscriptions: activeSubscriptions.length,
                monthlyRevenue,
                planDistribution,
            },
            recentLawyers: recentLawyers || [],
            recentUploads: recentUploads || [],
        });
    } catch (err) {
        console.error("[Admin] Stats error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
