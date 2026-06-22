import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

// GET: 정기결제 목록
export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("recurring_billing")
        .select("*")
        .order("next_charge_date", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
}

// POST: 정기결제 등록 (토스 빌링키 전체 값 + 금액 + 다음 청구일)
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const b = await request.json();
        const { customer_name, customer_email, plan, billing_key, customer_key, amount, next_charge_date } = b;
        if (!billing_key || !customer_key || !amount || !next_charge_date) {
            return NextResponse.json({ error: "빌링키·고객키·금액·다음청구일은 필수입니다." }, { status: 400 });
        }
        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from("recurring_billing")
            .insert({
                customer_name: customer_name || null,
                customer_email: customer_email || null,
                plan: plan || null,
                billing_key: String(billing_key).trim(),
                customer_key: String(customer_key).trim(),
                amount: Number(amount),
                status: "active",
                next_charge_date,
            })
            .select("id")
            .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ id: data.id }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DELETE: ?id=
export async function DELETE(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    const supabase = await createAdminClient();
    await supabase.from("recurring_billing").delete().eq("id", id);
    return NextResponse.json({ success: true });
}
