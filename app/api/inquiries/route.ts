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
        const { name, firm, phone, email, subject, message, website } = body;

        // --- 봇/스팸 차단 ---
        // 1) 허니팟: 숨김칸이 채워졌으면 봇 → 조용히 거부
        if (website) {
            return NextResponse.json({ success: true }, { status: 200 });
        }
        // 2) 링크 도배(스팸 상담 대부분이 URL 포함) 차단
        const blob = `${name || ""} ${firm || ""} ${message || ""}`;
        if (/(https?:\/\/|www\.)/i.test(blob)) {
            return NextResponse.json({ error: "링크는 포함할 수 없습니다." }, { status: 400 });
        }
        // 3) 키릴문자 등 한국 상담폼에 올 일 없는 문자 → 스팸
        if (/[Ѐ-ӿ]/.test(blob)) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

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

        // 이메일 발송 (await - Vercel 서버리스 함수 종료 전에 완료되어야 함)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await transporter.sendMail({
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
                });
                console.log("[Inquiries Email] Sent to ceo@lawnald.com");
            } catch (emailErr) {
                console.error("[Inquiries Email] Failed:", emailErr);
            }
        } else {
            console.warn("[Inquiries Email] EMAIL_USER or EMAIL_PASS not set");
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
