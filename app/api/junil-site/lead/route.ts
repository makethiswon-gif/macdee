import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitOk, getClientIp } from "@/lib/ratelimit";

// 법률사무소 준일 랜딩(junilcriminal.com · junilcivil.com · junildui.com)의 상담 신청 접수.
// 랜딩 사이트는 따로 떨어진 Vercel 프로젝트(junil-landing)이고, 접수만 이곳에서 받는다(메일 계정·저장소가 여기 있음).
// 1) 비공개 저장소(junil-leads 버킷)에 한 건씩 JSON 으로 남기고 2) 메일로 알린다. 메일이 실패해도 저장은 남는다.
// 받는 사람: 환경변수 JUNIL_LEAD_TO(쉼표로 여러 명), 없으면 대표 메일 + 준일 공식 메일(2026-11-19 대표 지시 "준일에도 보내").

const ALLOWED = new Set([
    "https://junilcriminal.com",
    "https://junilcivil.com",
    "https://junildui.com",
    "https://www.makethis1.com",
    "http://localhost:8791", // 로컬 시안 미리보기
]);
const BUCKET = "junil-leads";
const TO = (process.env.JUNIL_LEAD_TO || "ceo@lawnald.com,junil@junil.kr").split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null) {
    const h: Record<string, string> = { Vary: "Origin" };
    if (origin && ALLOWED.has(origin)) {
        h["Access-Control-Allow-Origin"] = origin;
        h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
        h["Access-Control-Allow-Headers"] = "Content-Type";
        h["Access-Control-Max-Age"] = "86400";
    }
    return h;
}
const reply = (origin: string | null, body: object, status = 200) =>
    NextResponse.json(body, { status, headers: cors(origin) });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const db = createServiceClient();
    const { data } = await db.storage.getBucket(BUCKET);
    if (!data) {
        const { error } = await db.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) throw new Error(`버킷을 만들지 못했습니다: ${error.message}`);
    } else if (data.public) {
        throw new Error("상담 신청 버킷이 공개 상태입니다.");
    }
    bucketReady = true;
}

export function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get("origin");
    if (!origin || !ALLOWED.has(origin)) return reply(origin, { error: "허용되지 않은 요청입니다." }, 403);
    if (!(await rateLimitOk("junil-lead", getClientIp(req), 3, "1 m"))) {
        return reply(origin, { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return reply(origin, { error: "잘못된 요청입니다." }, 400);
    }
    // 봇: 숨김 칸이 채워졌으면 접수한 척하고 버린다.
    if (str(body.website, 200)) return reply(origin, { ok: true });

    const lead = {
        name: str(body.name, 40),
        tel: str(body.tel, 30),
        field: str(body.field, 60),
        body: str(body.body, 3000),
        agree: body.agree === true,
        page: str(body.page, 200),
    };
    if (!lead.name || !lead.tel) return reply(origin, { error: "성함과 연락처를 적어 주세요." }, 400);
    if (lead.tel.replace(/\D/g, "").length < 9) return reply(origin, { error: "연락처를 다시 확인해 주세요." }, 400);
    if (!lead.agree) return reply(origin, { error: "개인정보 수집·이용에 동의해 주세요." }, 400);
    if (/(https?:\/\/|www\.)/i.test(`${lead.name} ${lead.body}`) || /[Ѐ-ӿ]/.test(`${lead.name} ${lead.body}`)) {
        return reply(origin, { error: "잘못된 요청입니다." }, 400);
    }

    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600e3).toISOString(); // 2026-11-19T21:03:00.000Z 꼴(한국 시각)
    const id = `${kst.slice(0, 19).replace(/[-:T]/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id, receivedAt: now.toISOString(), origin, ...lead };

    let saved = false;
    try {
        await ensureBucket();
        const { error } = await createServiceClient().storage.from(BUCKET)
            .upload(`${kst.slice(0, 7)}/${id}.json`, JSON.stringify(record, null, 2), { contentType: "application/json", upsert: false });
        if (error) throw error;
        saved = true;
    } catch (e) {
        console.error("[junil-lead] 저장 실패:", e instanceof Error ? e.message : e);
    }

    let mailed = false;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
            const site = origin.replace(/^https?:\/\//, "");
            const when = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
            const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
            await transporter.sendMail({
                from: `"준일 상담 신청" <${process.env.EMAIL_USER}>`,
                to: TO,
                subject: `[준일 상담 신청] ${lead.name} · ${lead.field || "분야 미선택"} (${site})`.slice(0, 150),
                text: [
                    `법률사무소 준일 랜딩에서 상담 신청이 들어왔습니다.`,
                    "",
                    `성함: ${lead.name}`,
                    `연락처: ${lead.tel}`,
                    `사건 분야: ${lead.field || "-"}`,
                    `문의 내용:`,
                    lead.body || "-",
                    "",
                    `접수 페이지: ${site}`,
                    `접수 시각: ${when}`,
                    `접수 번호: ${id}`,
                ].join("\n"),
            });
            mailed = true;
        } catch (e) {
            console.error("[junil-lead] 메일 실패:", e instanceof Error ? e.message : e);
        }
    }

    if (!saved && !mailed) return reply(origin, { error: "접수에 실패했습니다." }, 500);
    return reply(origin, { ok: true, id });
}
