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

/** 국내 번호면 010-1234-5678 꼴로, 아니면 null. +82·82 로 시작하면 0 으로 바꿔 본다. */
function koreanPhone(raw: string): string | null {
    let d = raw.replace(/[^\d+]/g, "");
    if (d.startsWith("+")) {
        if (!d.startsWith("+82")) return null;
        d = "0" + d.slice(3).replace(/^0/, "");
    } else if (d.startsWith("82") && d.length >= 11) {
        d = "0" + d.slice(2).replace(/^0/, "");
    }
    d = d.replace(/\D/g, "");
    const m =
        d.match(/^(01[016789])(\d{3,4})(\d{4})$/) || // 휴대폰
        d.match(/^(02)(\d{3,4})(\d{4})$/) || // 서울
        d.match(/^(0[3-6][1-5])(\d{3,4})(\d{4})$/) || // 지역번호
        d.match(/^(070|050\d?)(\d{3,4})(\d{4})$/) || // 인터넷·안심번호
        d.match(/^(1[5-9]\d{2})(\d{4})$/); // 대표번호 1588-0000
    return m ? m.slice(1).join("-") : null;
}

// 같은 번호가 10분 안에 또 신청하면 메일은 처음 한 번만(같은 서버 인스턴스 안에서 보는 최선 노력).
const sentAt = new Map<string, number>();
const recentlySent = (tel: string) => (sentAt.get(tel) ?? 0) > Date.now() - 10 * 60e3;
const markSent = (tel: string) => {
    sentAt.set(tel, Date.now());
    if (sentAt.size > 500) for (const [k, t] of sentAt) if (t < Date.now() - 10 * 60e3) sentAt.delete(k);
};

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
    // 2026-11-23 외국 번호(+44·+972)·가짜 이름 봇이 한꺼번에 들어와 막음: 국내 번호만 받는다(+82 는 0 으로 바꿔 본다).
    const tel = koreanPhone(lead.tel);
    if (!tel) return reply(origin, { error: "국내 휴대폰·전화번호로 적어 주세요(예: 010-1234-5678)." }, 400);
    lead.tel = tel;
    if (!/^[가-힣ㄱ-ㅎa-zA-Z][가-힣ㄱ-ㅎa-zA-Z\s.·()-]{0,39}$/.test(lead.name)) return reply(origin, { error: "성함을 다시 확인해 주세요." }, 400);
    if (!lead.agree) return reply(origin, { error: "개인정보 수집·이용에 동의해 주세요." }, 400);
    if (/(https?:\/\/|www\.)/i.test(`${lead.name} ${lead.body}`) || /[Ѐ-ӿ]/.test(`${lead.name} ${lead.body}`)) {
        return reply(origin, { error: "잘못된 요청입니다." }, 400);
    }

    // 사람인지 보는 흔적: 페이지를 연 뒤 걸린 시간(el, ms)과 칸에 직접 입력한 횟수(ki). 랜딩의 신청서 스크립트가 보낸다.
    // 수상하면 저장만 하고(지워지지 않게) 메일은 보내지 않는다. 봇이 눈치채지 않게 응답은 똑같이 '접수됨'.
    const el = typeof body.el === "number" ? body.el : -1;
    const ki = typeof body.ki === "number" ? body.ki : -1;
    const suspect: string[] = [];
    if (el < 3000) suspect.push(el < 0 ? "시간 없음" : `너무 빠름 ${el}ms`);
    if (ki < 1) suspect.push(ki < 0 ? "입력 기록 없음" : "직접 입력 없음");
    if (recentlySent(tel)) suspect.push("같은 번호 10분 안 재신청");

    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600e3).toISOString(); // 2026-11-19T21:03:00.000Z 꼴(한국 시각)
    const id = `${kst.slice(0, 19).replace(/[-:T]/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id, receivedAt: now.toISOString(), origin, ...lead, el, ki, ...(suspect.length ? { suspect } : {}) };

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

    if (suspect.length) {
        console.warn("[junil-lead] 수상한 신청(메일 안 보냄):", id, suspect.join(", "));
        return reply(origin, { ok: true, id });
    }
    markSent(tel);

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
