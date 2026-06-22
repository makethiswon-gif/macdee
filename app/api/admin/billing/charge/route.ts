import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";
import { chargeBilling, addOneMonth } from "@/lib/billing/charge";

// POST { id }: 해당 정기결제를 토스로 즉시 청구 (관리자 수동 트리거)
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

        const supabase = await createAdminClient();
        const { data: row } = await supabase.from("recurring_billing").select("*").eq("id", id).single();
        if (!row) return NextResponse.json({ error: "구독을 찾을 수 없습니다." }, { status: 404 });

        const result = await chargeBilling({
            billingKey: row.billing_key,
            customerKey: row.customer_key,
            amount: row.amount,
            orderName: `${row.plan || "정기결제"} (${row.next_charge_date})`,
            customerEmail: row.customer_email,
        });

        if (!result.ok) {
            await supabase.from("recurring_billing").update({ status: "past_due" }).eq("id", id);
            return NextResponse.json({ error: `청구 실패: ${result.error}`, code: result.code }, { status: 400 });
        }

        // 성공 → 다음 청구일 +1개월, 기록 갱신
        await supabase
            .from("recurring_billing")
            .update({
                status: "active",
                last_charged_at: new Date().toISOString(),
                last_payment_key: result.paymentKey || null,
                next_charge_date: addOneMonth(row.next_charge_date),
            })
            .eq("id", id);

        return NextResponse.json({ success: true, amount: row.amount, paymentKey: result.paymentKey });
    } catch (err) {
        console.error("[Admin Billing Charge] error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
