import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, firm, phone, email, subject, message } = body;

        // Validation
        if (!name || !phone || !message) {
            return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
        }

        const supabase = await createAdminClient();

        // Insert into inquiries table
        const { error } = await supabase.from("inquiries").insert({
            name,
            firm: firm || null,
            phone,
            email: email || null,
            subject: subject || null,
            message,
            status: "unread",
        });

        if (error) {
            console.error("[Inquiries API] Insert error:", error);
            return NextResponse.json({ error: "데이터베이스 저장 실패" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "문의가 성공적으로 접수되었습니다." });
    } catch (err) {
        console.error("[Inquiries API] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
