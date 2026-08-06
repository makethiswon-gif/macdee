import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { chargeBilling, addOneMonth } from "@/lib/billing/charge";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return request.headers.get("authorization") === `Bearer ${secret}`;
}

// 매일 실행: 오늘이 청구일(이거나 지난) 활성 정기결제를 자동청구
export async function GET(request: Request) {
    if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: due, error } = await supabase
        .from("recurring_billing")
        .select("*")
        .eq("status", "active")
        .lte("next_charge_date", today);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const results: Array<{ id: string; ok: boolean; amount?: number; error?: string }> = [];

    for (const row of due || []) {
        const result = await chargeBilling({
            billingKey: row.billing_key,
            customerKey: row.customer_key,
            amount: row.amount,
            orderName: `${row.plan || "정기결제"} (${row.next_charge_date})`,
            customerEmail: row.customer_email,
        });

        if (result.ok) {
            await supabase
                .from("recurring_billing")
                .update({
                    last_charged_at: new Date().toISOString(),
                    last_payment_key: result.paymentKey || null,
                    next_charge_date: addOneMonth(row.next_charge_date),
                })
                .eq("id", row.id);
            // 영수증 기록 (관리자 영수증 조회용)
            const { error: payErr } = await supabase.from("payments").insert({
                order_id: result.orderId,
                payment_key: result.paymentKey || null,
                amount: row.amount,
                order_name: `${row.plan || "정기결제"} (${row.next_charge_date})`,
                customer_email: row.customer_email || null,
                customer_name: row.customer_name || null,
                payment_type: "subscription_recurring",
                receipt_url: result.receiptUrl || null,
                status: result.status || "DONE",
                paid_at: result.approvedAt || new Date().toISOString(),
            });
            if (payErr) console.error("[RecurringBilling] payments insert error:", payErr);
            results.push({ id: row.id, ok: true, amount: row.amount });
        } else {
            await supabase.from("recurring_billing").update({ status: "past_due" }).eq("id", row.id);
            results.push({ id: row.id, ok: false, error: result.error });
        }
    }

    return NextResponse.json({ charged: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}
