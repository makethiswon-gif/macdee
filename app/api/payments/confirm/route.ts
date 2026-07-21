import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { TOSS_API_URL, getTossAuthHeader } from "@/lib/billing/config";
import { getCreditPack } from "@/lib/billing/one-time";
import nodemailer from "nodemailer";

// POST: 일회성(단건) 결제 승인 + 기록 (수동 처리용 — 자동 크레딧 반영 없음)
export async function POST(request: Request) {
    try {
        // 메이크디스원은 대행 서비스라 macdee 로그인 없이도 결제 가능(구독 흐름과 동일).
        // 로그인돼 있으면 구매자 정보를 첨부하고, 아니면 익명 기록 + 관리자 알림으로 수동 처리.
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { paymentKey, orderId, amount } = await request.json();
        if (!paymentKey || !orderId) {
            return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
        }

        // orderId 형식: otp_{packId}_{timestamp}_{rand}
        const packId = String(orderId).split("_")[1] || "";
        const pack = getCreditPack(packId);
        if (!pack) {
            return NextResponse.json({ error: "유효하지 않은 상품입니다." }, { status: 400 });
        }

        // 🔒 보안: 클라이언트가 보낸 금액이 아니라 서버의 팩 정가로 승인한다.
        // (조작된 금액이면 토스가 실제 결제액과 불일치로 거부 → 미승인)
        const expectedAmount = pack.price;
        if (Number(amount) !== expectedAmount) {
            return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
        }

        let lawyer: { id: string; name: string } | null = null;
        if (user) {
            const { data } = await supabase
                .from("lawyers")
                .select("id, name")
                .eq("user_id", user.id)
                .single();
            lawyer = data;
        }

        // 토스 결제 승인
        const tossRes = await fetch(`${TOSS_API_URL}/payments/confirm`, {
            method: "POST",
            headers: {
                Authorization: getTossAuthHeader(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentKey, orderId, amount: expectedAmount }),
        });
        const tossData = await tossRes.json();
        if (!tossRes.ok) {
            console.error("[Payments] Toss confirm error:", tossData);
            return NextResponse.json({ error: tossData.message || "결제 승인 실패" }, { status: 400 });
        }

        // 기록 (수동 처리 → fulfilled=false)
        const admin = await createAdminClient();
        const { error: insErr } = await admin.from("payments").insert({
            lawyer_id: lawyer?.id || null,
            pack_id: pack.id,
            order_id: orderId,
            payment_key: paymentKey,
            amount: expectedAmount,
            credits: pack.credits,
            order_name: pack.name,
            customer_email: user?.email || null,
            status: tossData.status || "DONE",
            fulfilled: false,
            paid_at: tossData.approvedAt || new Date().toISOString(),
        });
        if (insErr) {
            // 결제는 됐는데 기록 실패 — 운영자가 토스 대시보드로 확인 가능하도록 로그만
            console.error("[Payments] insert error:", insErr);
        }

        // 운영자 알림 (수동 처리 안내) — best-effort
        notify(pack, user?.email || "", lawyer?.name || "", amount).catch((e) =>
            console.error("[Payments] notify error:", e),
        );

        return NextResponse.json({ success: true, pack: pack.name, credits: pack.credits });
    } catch (err) {
        console.error("[Payments] Unexpected error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

async function notify(
    pack: { name: string; credits: number; price: number },
    email: string,
    lawyerName: string,
    amount: number,
) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
        from: `"macdee 단건결제" <${process.env.EMAIL_USER}>`,
        to: "ceo@lawnald.com",
        subject: `[단건결제] ${pack.name} (${Number(amount).toLocaleString()}원)`,
        html: `<div style="font-family:sans-serif">
            <h2 style="color:#3563AE">일회성 결제가 접수되었습니다 — 수동 처리 필요</h2>
            <p><strong>상품:</strong> ${pack.name} (콘텐츠 ${pack.credits}건)</p>
            <p><strong>금액:</strong> ${Number(amount).toLocaleString()}원</p>
            <p><strong>구매자:</strong> ${lawyerName || "(이름없음)"} / ${email}</p>
            <p style="color:#666;font-size:12px">결제 기록만 저장됨(자동 크레딧 반영 없음). 계정에 ${pack.credits}건을 수동으로 추가해 주세요.</p>
        </div>`,
    });
}
