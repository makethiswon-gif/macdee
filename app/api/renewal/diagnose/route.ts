import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitOk, getClientIp, tooManyRequests } from "@/lib/ratelimit";
import nodemailer from "nodemailer";

// 로펌 마케팅 구조 진단 요청 접수.
//
// 왜 /api/inquiries 를 그대로 쓰지 않는가
//  1) 기존 라우트는 message 안에 URL 이 있으면 400 을 낸다(스팸 방어).
//     이 폼은 홈페이지·블로그 URL 을 받는 것이 핵심이라 그 규칙에 걸린다.
//  2) 라이브에서 돌아가는 엔드포인트를 건드리지 않기 위해 분리한다.
//
// 저장은 기존 inquiries 테이블을 그대로 쓴다. 컬럼을 추가하지 않으므로
// 마이그레이션이 필요 없고 /admin/inquiries 화면이 그대로 동작한다.

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

interface Payload {
    firmName?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    practiceAreas?: string;
    region?: string;
    channels?: string[];
    adBudget?: string;
    agencyCount?: string;
    siteUrl?: string;
    blogUrl?: string;
    tracking?: string;
    biggestProblem?: string;
    note?: string;
    /** 허니팟 — 사람은 못 보는 칸 */
    company?: string;
}

const MAX = 2000;
const clip = (v: unknown) => String(v ?? "").trim().slice(0, MAX);

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (!(await rateLimitOk("renewal-diagnose", ip, 3, "1 m"))) {
            return tooManyRequests();
        }

        const body = (await req.json()) as Payload;

        // 허니팟이 채워졌으면 봇 — 조용히 성공 처리
        if (body.company) {
            return NextResponse.json({ success: true });
        }

        const firmName = clip(body.firmName);
        const contactName = clip(body.contactName);
        const phone = clip(body.phone);

        if (!firmName || !contactName || !phone) {
            return NextResponse.json(
                { error: "로펌명, 담당자, 연락처는 필수입니다." },
                { status: 400 }
            );
        }

        // URL 도배 차단 — 단, 전용 URL 칸은 검사하지 않는다.
        // 이 폼은 홈페이지·블로그 주소를 받는 것이 목적이기 때문이다.
        const freeText = [firmName, contactName, clip(body.biggestProblem), clip(body.note)].join(" ");
        if (/(https?:\/\/|www\.)/i.test(freeText)) {
            return NextResponse.json(
                { error: "홈페이지 주소는 아래 전용 칸에 입력해 주세요." },
                { status: 400 }
            );
        }
        // 한국 상담폼에 올 일 없는 문자 → 스팸
        if (/[Ѐ-ӿ]/.test(freeText)) {
            return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
        }

        const channels = Array.isArray(body.channels) ? body.channels.map(clip).filter(Boolean) : [];

        // 구조화 텍스트로 message 한 칸에 담는다(컬럼 추가 없이)
        const rows: [string, string][] = [
            ["핵심 사건 분야", clip(body.practiceAreas)],
            ["지역", clip(body.region)],
            ["현재 운영 채널", channels.join(", ")],
            ["월 광고비 구간", clip(body.adBudget)],
            ["사용 중인 대행사 수", clip(body.agencyCount)],
            ["홈페이지", clip(body.siteUrl)],
            ["블로그", clip(body.blogUrl)],
            ["상담 추적 여부", clip(body.tracking)],
            ["가장 큰 마케팅 문제", clip(body.biggestProblem)],
        ];

        const message =
            rows
                .filter(([, v]) => v)
                .map(([k, v]) => `[${k}] ${v}`)
                .join("\n") + (clip(body.note) ? `\n\n---\n${clip(body.note)}` : "");

        const supabase = await createAdminClient();
        const { error } = await supabase.from("inquiries").insert({
            name: contactName,
            firm: firmName,
            phone,
            email: clip(body.email) || null,
            subject: "로펌 마케팅 구조 진단 요청",
            message: message || "(내용 없음)",
            status: "unread",
        });

        if (error) {
            console.error("[Renewal Diagnose] Insert error:", error);
            return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
        }

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                await transporter.sendMail({
                    from: `"마케팅 진단 요청" <${process.env.EMAIL_USER}>`,
                    to: "ceo@lawnald.com",
                    subject: `[마케팅 진단 요청] ${firmName} · ${contactName}`,
                    text: `로펌명: ${firmName}\n담당자: ${contactName}\n연락처: ${phone}\n이메일: ${clip(body.email) || "-"}\n\n${message}`,
                });
            } catch (e) {
                console.error("[Renewal Diagnose] Mail failed:", e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Renewal Diagnose] Error:", err);
        return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
    }
}
