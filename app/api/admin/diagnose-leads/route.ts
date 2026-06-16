import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

const SUBJECT = "무료 AI 진단 신청";

// GET: 진단 리드 목록 (inquiries에서 진단 신청만 추출 + 점수/블로그 파싱)
export async function GET(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("inquiries")
        .select("id, name, firm, phone, email, message, status, created_at")
        .eq("subject", SUBJECT)
        .order("created_at", { ascending: false })
        .limit(200);

    if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

    const leads = (data || []).map((r) => {
        const msg = r.message || "";
        const blog = msg.match(/블로그:\s*(.+)/)?.[1]?.trim() || "";
        const score = parseInt(msg.match(/진단점수:\s*(\d+)/)?.[1] || "", 10);
        return {
            id: r.id,
            name: r.name,
            field: r.firm || "",
            phone: r.phone || "",
            email: r.email || "",
            blogUrl: blog,
            score: Number.isFinite(score) ? score : null,
            status: r.status || "unread",
            created_at: r.created_at,
        };
    });

    return NextResponse.json({ leads });
}

// PATCH: 후속 상태 변경
export async function PATCH(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });

    const supabase = await createAdminClient();
    const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });

    return NextResponse.json({ success: true });
}
