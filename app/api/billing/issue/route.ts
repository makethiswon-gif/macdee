import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { TOSS_API_URL, getTossAuthHeader, PLANS, PlanKey } from "@/lib/billing/config";

// POST: Issue billing key from authKey
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { authKey, customerKey, plan } = await request.json();
        if (!authKey || !customerKey || !plan) {
            return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
        }

        if (!(plan in PLANS) || plan === "free") {
            return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
        }

        // Get lawyer
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        // Issue billing key from Toss
        const tossRes = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ authKey, customerKey }),
        });

        const tossData = await tossRes.json();
        if (!tossRes.ok) {
            console.error("[Billing] Toss issue error:", tossData);
            return NextResponse.json({ error: tossData.message || "빌링키 발급 실패" }, { status: 400 });
        }

        const billingKey = tossData.billingKey;
        const cardInfo = tossData.card || {};
        const planInfo = PLANS[plan as PlanKey];

        // Calculate period
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Upsert subscription
        const adminSupabase = await createAdminClient();
        const { data: subscription, error: subError } = await adminSupabase
            .from("subscriptions")
            .upsert({
                lawyer_id: lawyer.id,
                plan,
                status: "active",
                billing_key: billingKey,
                customer_key: customerKey,
                card_last4: cardInfo.number?.slice(-4) || "",
                card_company: cardInfo.company || "",
                amount: planInfo.price,
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                uploads_used: 0,
                uploads_limit: planInfo.uploads,
                updated_at: now.toISOString(),
            }, { onConflict: "lawyer_id" })
            .select()
            .single();

        if (subError) {
            console.error("[Billing] Subscription upsert error:", subError);
            return NextResponse.json({ error: "구독 정보 저장 실패" }, { status: 500 });
        }

        // Execute first payment immediately
        const chargeRes = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                customerKey,
                amount: planInfo.price,
                orderId: `macdee_${lawyer.id}_${Date.now()}`,
                orderName: `macdee ${planInfo.name}`,
            }),
        });

        const chargeData = await chargeRes.json();
        if (!chargeRes.ok) {
            console.error("[Billing] First charge failed:", chargeData);
            // Billing key is still saved, but mark as past_due
            await adminSupabase
                .from("subscriptions")
                .update({ status: "past_due" })
                .eq("id", subscription.id);
            return NextResponse.json({ error: "첫 결제에 실패했습니다: " + (chargeData.message || "알 수 없는 오류") }, { status: 400 });
        }

        console.log(`[Billing] Subscription created: plan=${plan}, lawyer=${lawyer.id}`);
        return NextResponse.json({ subscription, payment: chargeData }, { status: 201 });
    } catch (err) {
        console.error("[Billing] Unexpected error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
