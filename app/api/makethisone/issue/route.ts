import { NextResponse } from "next/server";
import { getTossAuthHeader, TOSS_API_URL } from "@/lib/billing/config";
import { createServiceClient } from "@/lib/supabase/server";
import { addOneMonth } from "@/lib/billing/charge";

const MTO_PLANS = {
    basic: { name: "메이크디스원 베이직", price: 1200000 },
    standard: { name: "메이크디스원 스탠다드", price: 2000000 },
    premium: { name: "메이크디스원 프리미엄", price: 3000000 },
};

export async function POST(request: Request) {
    try {
        const { authKey, customerKey, plan } = await request.json();
        
        if (!authKey || !customerKey || !plan) {
            return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
        }

        const planInfo = MTO_PLANS[plan as keyof typeof MTO_PLANS];
        if (!planInfo) {
            return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
        }

        // 1. 빌링키 발급 요청
        const issueRes = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ authKey, customerKey }),
        });

        const issueData = await issueRes.json();
        if (!issueRes.ok) {
            console.error("[MakeThisOne] Toss issue error:", issueData);
            return NextResponse.json({ error: issueData.message || "빌링키 발급 실패" }, { status: 400 });
        }

        const billingKey = issueData.billingKey;

        // 2. 첫 결제 바로 승인
        const orderId = `mto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const chargeRes = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                customerKey,
                amount: planInfo.price,
                orderId,
                orderName: planInfo.name,
                customerEmail: "contact@makethis1.com", // 임시 이메일
            }),
        });

        const chargeData = await chargeRes.json();
        if (!chargeRes.ok) {
            console.error("[MakeThisOne] Charge failed:", chargeData);
            return NextResponse.json({ error: "결제 승인 실패: " + (chargeData.message || "") }, { status: 400 });
        }

        // 정기결제 자동청구를 위해 빌링키/고객키 저장 (다음 청구일 = 한 달 뒤)
        try {
            const supabase = createServiceClient();
            const today = new Date().toISOString().slice(0, 10);
            await supabase.from("recurring_billing").insert({
                customer_name: planInfo.name,
                customer_email: null,
                plan: planInfo.name,
                billing_key: billingKey,
                customer_key: customerKey,
                amount: planInfo.price,
                status: "active",
                next_charge_date: addOneMonth(today),
            });
        } catch (e) {
            console.error("[MakeThisOne] recurring_billing save error:", e);
        }

        return NextResponse.json({ success: true, payment: chargeData }, { status: 200 });

    } catch (err) {
        console.error("[MakeThisOne] API error:", err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
