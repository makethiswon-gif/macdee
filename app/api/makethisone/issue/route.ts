import { NextResponse } from "next/server";
import { getTossAuthHeader, TOSS_API_URL } from "@/lib/billing/config";
import { createServiceClient } from "@/lib/supabase/server";
import { addOneMonth } from "@/lib/billing/charge";
import { getPlan } from "@/lib/makethisone/products";
import { finalizeContract, loadContract } from "@/lib/makethisone/contract-server";

export async function POST(request: Request) {
    try {
        const { authKey, customerKey, plan, contractId } = await request.json();
        
        if (!authKey || !customerKey || !plan) {
            return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
        }

        const found = getPlan(String(plan));
        const planInfo = found ? { name: `메이크디스원 ${found.name}`, price: found.price } : null;
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
        // 결제 전 전자계약에 적은 광고주 정보(이름·이메일)
        const contract = contractId ? await loadContract(String(contractId)).catch(() => null) : null;

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
                customerEmail: contract?.party.email || "contact@makethis1.com",
            }),
        });

        const chargeData = await chargeRes.json();
        if (!chargeRes.ok) {
            console.error("[MakeThisOne] Charge failed:", chargeData);
            return NextResponse.json({ error: "결제 승인 실패: " + (chargeData.message || "") }, { status: 400 });
        }

        // 정기결제 자동청구를 위해 빌링키/고객키 저장 (다음 청구일 = 한 달 뒤) + 영수증 기록
        try {
            const supabase = createServiceClient();
            const today = new Date().toISOString().slice(0, 10);
            await supabase.from("recurring_billing").insert({
                customer_name: contract?.party.name || planInfo.name,
                customer_email: contract?.party.email || null,
                plan: planInfo.name,
                billing_key: billingKey,
                customer_key: customerKey,
                amount: planInfo.price,
                status: "active",
                next_charge_date: addOneMonth(today),
            });
            // 최초 결제 영수증 기록 (관리자 영수증 조회용)
            await supabase.from("payments").insert({
                order_id: orderId,
                payment_key: chargeData.paymentKey || null,
                amount: planInfo.price,
                order_name: planInfo.name,
                payment_type: "subscription",
                receipt_url: chargeData.receipt?.url || null,
                status: chargeData.status || "DONE",
                paid_at: chargeData.approvedAt || new Date().toISOString(),
            });
        } catch (e) {
            console.error("[MakeThisOne] recurring_billing/payments save error:", e);
        }

        // 계약서 PDF 를 결제자 이메일로(실패해도 결제는 완료)
        const contractMail = await finalizeContract(contractId ? String(contractId) : null, { kind: "plan", productId: String(plan), orderId, amount: planInfo.price, paidAt: chargeData.approvedAt || null });
        if (contractId && !contractMail.ok) console.error("[MakeThisOne] contract mail:", contractMail.reason);

        return NextResponse.json({ success: true, payment: chargeData, contractEmail: contractMail.ok ? contractMail.email : null }, { status: 200 });

    } catch (err) {
        console.error("[MakeThisOne] API error:", err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
