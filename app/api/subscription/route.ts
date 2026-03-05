import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PLANS, PlanKey } from "@/lib/billing/config";

// GET: Get current subscription
export async function GET() {
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

        const adminSupabase = await createAdminClient();
        const { data: subscription } = await adminSupabase
            .from("subscriptions")
            .select("*")
            .eq("lawyer_id", lawyer.id)
            .single();

        if (!subscription) {
            // Return free plan defaults
            return NextResponse.json({
                subscription: {
                    plan: "free",
                    status: "active",
                    uploads_used: 0,
                    uploads_limit: PLANS.free.uploads,
                    amount: 0,
                },
            });
        }

        // Don't expose billing key to client
        const { billing_key: _bk, ...safeSubscription } = subscription;
        return NextResponse.json({ subscription: safeSubscription });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DELETE: Cancel subscription
export async function DELETE() {
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

        const adminSupabase = await createAdminClient();
        const { error } = await adminSupabase
            .from("subscriptions")
            .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
            })
            .eq("lawyer_id", lawyer.id)
            .eq("status", "active");

        if (error) {
            console.error("[Subscription] Cancel error:", error);
            return NextResponse.json({ error: "해지 처리 실패" }, { status: 500 });
        }

        return NextResponse.json({ message: "구독이 해지되었습니다. 현재 결제 기간까지는 이용 가능합니다." });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// PATCH: Change plan
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { plan } = await request.json();
        if (!(plan in PLANS) || plan === "free") {
            return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
        }

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const planInfo = PLANS[plan as PlanKey];
        const adminSupabase = await createAdminClient();

        const { error } = await adminSupabase
            .from("subscriptions")
            .update({
                plan,
                amount: planInfo.price,
                uploads_limit: planInfo.uploads,
                updated_at: new Date().toISOString(),
            })
            .eq("lawyer_id", lawyer.id);

        if (error) {
            console.error("[Subscription] Plan change error:", error);
            return NextResponse.json({ error: "요금제 변경 실패" }, { status: 500 });
        }

        return NextResponse.json({ message: `${planInfo.name} 요금제로 변경되었습니다.` });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
