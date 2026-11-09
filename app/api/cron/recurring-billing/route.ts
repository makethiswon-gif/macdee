import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { chargeBilling, addOneMonth } from "@/lib/billing/charge";
import { fixedTermMonthsByLabel } from "@/lib/makethisone/products";

/** 기간 약정 정기결제의 끝(가입일 + n개월, YYYY-MM-DD). 이 날짜부터는 청구하지 않는다. */
function termEnd(createdAt: string | null | undefined, months: number): string | null {
    if (!createdAt) return null;
    let d = String(createdAt).slice(0, 10);
    for (let i = 0; i < months; i++) d = addOneMonth(d);
    return d;
}

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
        // 기간 약정(예: 준일 3개월 매월 결제)은 정해진 횟수를 다 받았으면 더 청구하지 않고 끝낸다
        const termMonths = fixedTermMonthsByLabel(row.plan);
        const end = termMonths ? termEnd(row.created_at, termMonths) : null;
        if (end && row.next_charge_date >= end) {
            await markCompleted(supabase, row.id);
            results.push({ id: row.id, ok: true, amount: 0, error: "기간 약정 종료 — 청구 안 함" });
            continue;
        }

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
            if (end && addOneMonth(row.next_charge_date) >= end) await markCompleted(supabase, row.id);
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

// 상태만 따로 바꾼다(실패해도 청구일 갱신은 이미 끝났고, 위의 기간 확인이 다음 청구를 막는다)
async function markCompleted(supabase: ReturnType<typeof createServiceClient>, id: string) {
    const { error } = await supabase.from("recurring_billing").update({ status: "completed" }).eq("id", id);
    if (error) console.error("[RecurringBilling] 기간 약정 종료 표시 실패:", error.message);
}
