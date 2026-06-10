import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitOk, getClientIp, tooManyRequests } from "@/lib/ratelimit";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function POST(req: NextRequest) {
    try {
        // 문의 스팸 방어: IP당 분당 3회
        const ip = getClientIp(req);
        if (!(await rateLimitOk("inquiry", ip, 3, "1 m"))) {
            return tooManyRequests();
        }

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

        // 이메일 발송 (비동기 - 에러해도 응답은 성공으로 반환)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter.sendMail({
                from: `"상담문의 알림" <${process.env.EMAIL_USER}>`,
                to: "ceo@lawnald.com",
                subject: `[새 상담문의] ${name}${subject ? ` - ${subject}` : ""}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0038A8;">새로운 상담 문의가 들어왔습니다!</h2>
                        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>이름:</strong> ${name}</p>
                            <p><strong>전화:</strong> ${phone}</p>
                            ${email ? `<p><strong>이메일:</strong> ${email}</p>` : ""}
                            ${firm ? `<p><strong>법무법인/사무소:</strong> ${firm}</p>` : ""}
                            ${subject ? `<p><strong>제목:</strong> ${subject}</p>` : ""}
                        </div>
                        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                            <p><strong>상담 내용:</strong></p>
                            <p style="white-space: pre-wrap; color: #333;">${message}</p>
                        </div>
                    </div>
                `,
            }).catch((err) => console.error("[Inquiries Email] Failed:", err));
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
