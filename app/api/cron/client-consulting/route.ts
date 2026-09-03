import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { getContentGenerator } from "@/lib/ai/providers";

// 클라이언트 컨설팅 리포트 (대표 지시 2026-08-29)
//
// 포털에 쌓인 로펌별 데이터(상담기록·수임내역·승소사례 구조화, 업무일지,
// 지난 조언)를 AI 가 로펌마다 점검해 강점·약점·전략을 정리하고,
// 전체 총평과 함께 대표 메일(ceo@lawnald.com)로 보낸다.
//
// 실행: Vercel Cron 매주 월 08:00 KST (vercel.json) 또는 관리자 수동 호출.
// ?dry=1 이면 메일 없이 JSON 만 반환(점검용).
// §42 — 조언에 보장·과장 표현 금지. 데이터에 없는 수치를 만들지 않는다.

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const REPORT_TO = process.env.CONSULTING_REPORT_TO || "ceo@lawnald.com";

function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    const header = request.headers.get("authorization");
    if (secret && header === `Bearer ${secret}`) return true;
    return verifyAdminToken(request); // 관리자 수동 실행
}

function parseJson<T>(raw: string): T {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("AI 응답에서 JSON을 찾지 못했습니다");
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

interface FirmAnalysis {
    현황: string;
    강점: string[];
    약점: string[];
    전략: { 제목: string; 실행: string }[];
    이번주_최우선: string;
}

const esc = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const daysAgo = (n: number) => new Date(Date.now() - n * 86400e3).toISOString();

export async function GET(request: Request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const dry = new URL(request.url).searchParams.get("dry") === "1";

    try {
        const supabase = createServiceClient();
        const ai = getContentGenerator();
        const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

        const { data: firms, error: firmsErr } = await supabase
            .from("portal_firms")
            .select("id, name")
            .order("created_at");
        if (firmsErr) return NextResponse.json({ error: firmsErr.message }, { status: 500 });

        const analyses: { name: string; a: FirmAnalysis }[] = [];
        const noData: string[] = [];

        for (const firm of firms || []) {
            // ── 데이터 수집: 최근 30일 자료 · 14일 업무일지 · 마지막 조언 ──
            const [{ data: records }, { data: worklogs }, { data: advice }] = await Promise.all([
                supabase
                    .from("portal_records")
                    .select("type, title, structured, created_at")
                    .eq("firm_id", firm.id)
                    .gte("created_at", daysAgo(30))
                    .order("created_at", { ascending: false })
                    .limit(30),
                supabase
                    .from("portal_worklogs")
                    .select("log_date, items")
                    .eq("firm_id", firm.id)
                    .gte("log_date", daysAgo(14).slice(0, 10))
                    .order("log_date", { ascending: false }),
                supabase
                    .from("portal_advice")
                    .select("advice_date, summary")
                    .eq("firm_id", firm.id)
                    .order("advice_date", { ascending: false })
                    .limit(1),
            ]);

            if (!records?.length && !worklogs?.length) {
                noData.push(firm.name);
                continue;
            }

            const counts = { 상담기록: 0, 수임내역: 0, 판결문: 0, 승소사례: 0, 기타: 0 } as Record<string, number>;
            for (const r of records || []) counts[r.type] = (counts[r.type] || 0) + 1;

            const evidence = [
                `## 최근 30일 자료 요약 (상담 ${counts["상담기록"]}건 · 수임 ${counts["수임내역"]}건 · 판결문 ${counts["판결문"]}건 · 승소사례 ${counts["승소사례"]}건)`,
                ...(records || []).map(
                    (r) => `- [${r.type}] ${r.title}\n  ${JSON.stringify(r.structured ?? {}).slice(0, 700)}`
                ),
                `\n## 최근 14일 MAKETHIS1 업무일지`,
                ...(worklogs || []).map(
                    (w) =>
                        `- ${w.log_date}: ${(w.items as { area: string; title: string }[])
                            .map((i) => `[${i.area}] ${i.title}`)
                            .join(" / ")}`
                ),
                advice?.[0] ? `\n## 직전 조언(${advice[0].advice_date}): ${advice[0].summary}` : "",
            ].join("\n");

            // ── 로펌별 AI 컨설팅 (JSON 이 깨지면 1회 재시도) ──
            let analysis: FirmAnalysis | null = null;
            for (let attempt = 0; attempt < 2 && !analysis; attempt++) {
                try {
                    const res = await ai.generate(
                        [
                            {
                                role: "system",
                                content: `당신은 로펌 마케팅 회사 MAKETHIS1 의 수석 컨설턴트입니다. 아래 클라이언트 로펌의
최근 데이터(상담 유입, 수임, 승소사례, 우리가 수행한 작업)를 근거로 상황을 점검하고 컨설팅합니다.

규칙:
- 데이터에 있는 사실만 근거로 쓴다. 없는 수치·성과를 만들지 않는다. 데이터가 부족한 판단은 "확인 필요"로 쓴다.
- 개인정보(이름 등)는 쓰지 않는다.
- 보장·과장 표현 금지. 실행 가능한 수준으로 구체적으로.
- 반드시 유효한 JSON 만 출력한다(마지막 항목 뒤 쉼표 금지):
{"현황":"2~3문장 — 상담 유입·수임·매출 신호가 어떻게 돌아가는지","강점":["2~4개"],"약점":["2~4개 — 리스크·공백"],"전략":[{"제목":"","실행":"1~2문장"}],"이번주_최우선":"딱 한 가지"}`,
                            },
                            { role: "user", content: `클라이언트: ${firm.name}\n기준일: ${today}\n\n${evidence.slice(0, 14000)}` },
                        ],
                        { maxTokens: 2200 }
                    );
                    analysis = parseJson<FirmAnalysis>(res.content);
                } catch (e) {
                    if (attempt === 1) console.error(`[consulting] ${firm.name} 분석 실패:`, e);
                }
            }
            if (analysis) analyses.push({ name: firm.name, a: analysis });
            else noData.push(`${firm.name} (분석 실패)`);
        }

        // ── 전체 총평 ──
        let overall = "";
        if (analyses.length > 0) {
            const res = await ai.generate(
                [
                    {
                        role: "system",
                        content:
                            "당신은 MAKETHIS1 의 수석 컨설턴트입니다. 클라이언트별 진단 요약을 받아 대표에게 보낼 전체 총평을 씁니다. 3~5문장: 포트폴리오 전반의 흐름, 공통 패턴, 이번 주 대표가 챙길 것 1~2가지. 과장 없이. 일반 텍스트로만.",
                    },
                    {
                        role: "user",
                        content: analyses.map(({ name, a }) => `- ${name}: ${a.현황} / 최우선: ${a.이번주_최우선}`).join("\n"),
                    },
                ],
                { maxTokens: 600 }
            );
            overall = res.content.trim();
        }

        // ── 메일 HTML ──
        const card = (name: string, a: FirmAnalysis) => `
<div style="border:1px solid #e3e1dc;border-radius:4px;padding:20px 22px;margin:0 0 16px;">
  <h2 style="margin:0 0 10px;font-size:16px;color:#0e1116;">${esc(name)}</h2>
  <p style="margin:0 0 14px;font-size:13.5px;line-height:1.7;color:#2a2e35;">${esc(a.현황)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.65;">
    <tr>
      <td style="vertical-align:top;width:50%;padding-right:12px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.08em;color:#3563ae;font-weight:700;">강점</p>
        ${a.강점.map((s) => `<p style="margin:0 0 4px;color:#2a2e35;">· ${esc(s)}</p>`).join("")}
      </td>
      <td style="vertical-align:top;width:50%;padding-left:12px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:.08em;color:#9e2b25;font-weight:700;">약점 · 리스크</p>
        ${a.약점.map((s) => `<p style="margin:0 0 4px;color:#2a2e35;">· ${esc(s)}</p>`).join("")}
      </td>
    </tr>
  </table>
  <p style="margin:14px 0 6px;font-size:11px;letter-spacing:.08em;color:#6a6f78;font-weight:700;">전략</p>
  ${a.전략.map((s) => `<p style="margin:0 0 6px;font-size:13px;color:#2a2e35;"><b>${esc(s.제목)}</b> — ${esc(s.실행)}</p>`).join("")}
  <p style="margin:12px 0 0;padding:10px 12px;background:#f2f5fa;border-left:3px solid #3563ae;font-size:13px;color:#0e1116;"><b>이번 주 최우선</b> — ${esc(a.이번주_최우선)}</p>
</div>`;

        const html = `
<div style="max-width:680px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0e1116;">
  <p style="font-size:11px;letter-spacing:.2em;color:#3563ae;font-weight:700;margin:0 0 6px;">MAKETHIS1 · CLIENT CONSULTING</p>
  <h1 style="font-size:20px;margin:0 0 4px;">클라이언트 컨설팅 리포트</h1>
  <p style="font-size:12.5px;color:#6a6f78;margin:0 0 18px;">${today} · 분석 ${analyses.length}곳${noData.length ? ` · 자료 부족 ${noData.length}곳` : ""}</p>
  ${overall ? `<div style="padding:16px 18px;background:#0e1116;border-radius:4px;margin:0 0 20px;"><p style="margin:0 0 6px;font-size:11px;letter-spacing:.08em;color:#8ab4f8;font-weight:700;">총평</p><p style="margin:0;font-size:13.5px;line-height:1.75;color:#fbfaf8;">${esc(overall)}</p></div>` : ""}
  ${analyses.map(({ name, a }) => card(name, a)).join("")}
  ${noData.length ? `<p style="font-size:12px;color:#9aa0a8;margin:4px 0 0;">자료가 없어 이번 분석에서 제외: ${noData.map(esc).join(", ")} — 포털에 자료가 쌓이면 자동으로 포함됩니다.</p>` : ""}
  <p style="font-size:11.5px;color:#9aa0a8;margin:20px 0 0;line-height:1.6;">이 리포트는 포털에 등록된 자료·업무일지를 근거로 AI가 작성했습니다. 데이터에 없는 수치는 쓰지 않으며, 판단이 어려운 항목은 "확인 필요"로 표시됩니다.</p>
</div>`;

        if (dry) {
            return NextResponse.json({ ok: true, dry: true, firms: analyses.length, noData, overall, analyses });
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return NextResponse.json({ error: "EMAIL_USER/EMAIL_PASS 미설정" }, { status: 500 });
        }
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
            from: `"MAKETHIS1 컨설팅" <${process.env.EMAIL_USER}>`,
            to: REPORT_TO,
            subject: `[MAKETHIS1] 클라이언트 컨설팅 리포트 — ${today} (${analyses.length}곳)`,
            html,
        });

        return NextResponse.json({ ok: true, sentTo: REPORT_TO, firms: analyses.length, noData });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
