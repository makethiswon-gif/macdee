import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET: 결제 내역 + 영수증 URL 조회 (관리자)
export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("payments")
        .select("id, order_id, payment_key, amount, order_name, customer_name, customer_email, payment_type, receipt_url, status, credits, fulfilled, paid_at, created_at")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(300);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data || [] });
}
