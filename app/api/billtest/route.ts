import { NextResponse } from "next/server";
import { getTossAuthHeader, TOSS_API_URL } from "@/lib/billing/config";
import { createServiceClient } from "@/lib/supabase/server";

// 빌링 파이프라인 검증용 임시 테스트 (1,000원). 검증 후 파일 삭제 예정.
export async function POST(request: Request) {
    try {
        const { authKey, customerKey } = await request.json();
        if (!authKey || !customerKey) {
            return NextResponse.json({ error: "authKey/customerKey 필요" }, { status: 400 });
        }

        // 1) 빌링키 발급 (키·MID가 맞아야 성공)
        const issueRes = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
            method: "POST",
            headers: { Authorization: getTossAuthHeader(), "Content-Type": "application/json" },
            body: JSON.stringify({ authKey, customerKey }),
        });
        const issueData = await issueRes.json();
        if (!issueRes.ok) {
            return NextResponse.json({ step: "issue", error: issueData.message, code: issueData.code }, { status: 400 });
        }
        const billingKey = issueData.billingKey;

        // 2) 1,000원 청구
        const orderId = `billtest_${Date.now()}`;
        const chargeRes = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
            method: "POST",
            headers: { Authorization: getTossAuthHeader(), "Content-Type": "application/json" },
            body: JSON.stringify({ customerKey, amount: 1000, orderId, orderName: "빌링 검증 테스트", customerEmail: "test@makethis1.com" }),
        });
        const chargeData = await chargeRes.json();
        if (!chargeRes.ok) {
            return NextResponse.json({ step: "charge", error: chargeData.message, code: chargeData.code }, { status: 400 });
        }

        // 3) recurring_billing 저장 (next_charge_date=오늘 → 크론이 즉시 잡도록)
        const supabase = createServiceClient();
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from("recurring_billing").insert({
            customer_name: "[테스트] 빌링 검증",
            customer_email: null,
            plan: "테스트",
            billing_key: billingKey,
            customer_key: customerKey,
            amount: 1000,
            status: "active",
            next_charge_date: today,
        });

        return NextResponse.json({ success: true, paymentKey: chargeData.paymentKey, status: chargeData.status });
    } catch (err) {
        console.error("[billtest] error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
