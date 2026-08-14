import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitOk, getClientIp, tooManyRequests } from "@/lib/ratelimit";
import { scrapeUrl } from "@/lib/ai/blog-scraper";
import nodemailer from "nodemailer";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface Report {
    score: number;
    summary: string;
    findings: Array<{ title: string; detail: string }>;
    next: string;
}

export async function POST(req: NextRequest) {
    try {
        // 비용·남용 방어: IP당 10분에 3회
        const ip = getClientIp(req);
        if (!(await rateLimitOk("diagnose", ip, 3, "10 m"))) {
            return tooManyRequests();
        }

        const { name, blogUrl, phone, email, field } = await req.json();
        if (!name || !blogUrl) {
            return NextResponse.json({ error: "이름과 블로그 주소를 입력해주세요." }, { status: 400 });
        }
        if (!phone && !email) {
            return NextResponse.json({ error: "연락받을 전화번호 또는 이메일을 입력해주세요." }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "서비스 설정 오류" }, { status: 500 });

        // 블로그 본문 일부 스크래핑 (실패해도 진행)
        let blogSample = "";
        let blogTitle = "";
        try {
            const scraped = await scrapeUrl(blogUrl);
            blogTitle = scraped.title || "";
            blogSample = (scraped.text || "").slice(0, 1500);
        } catch {
            /* 스크래핑 실패 시 웹검색만으로 진단 */
        }

        const report = await analyze({ apiKey, name, blogUrl, blogTitle, blogSample, field });
        if (!report) {
            return NextResponse.json({ error: "진단 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
        }

        // 리드 저장 (inquiries 재사용) + 운영자 알림
        try {
            const supabase = await createAdminClient();
            await supabase.from("inquiries").insert({
                name,
                firm: field || null,
                phone: phone || null,
                email: email || null,
                subject: "무료 AI 진단 신청",
                message: `블로그: ${blogUrl}\n분야: ${field || "-"}\n진단점수: ${report.score}\n\n${report.summary}`,
                status: "unread",
            });
        } catch (e) {
            console.error("[Diagnose] lead save error:", e);
        }
        notify(name, phone, email, blogUrl, report.score).catch((e) => console.error("[Diagnose] notify error:", e));

        return NextResponse.json({ report });
    } catch (err) {
        console.error("[Diagnose] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

async function analyze(input: {
    apiKey: string;
    name: string;
    blogUrl: string;
    blogTitle: string;
    blogSample: string;
    field?: string;
}): Promise<Report | null> {
    const system = `당신은 변호사 온라인 마케팅 진단 전문가입니다. 의뢰한 변호사의 온라인 노출 상태를 냉정하고 구체적으로 진단합니다. 진단의 목적은 변호사가 '내 온라인 마케팅에 개선이 필요하다'고 자각하고 macdee(맥디)를 통해 해결하도록 돕는 것입니다.

[진단 방법]
- web_search 도구로 변호사 이름/사무소/블로그를 실제 검색해, (1) 구글·네이버 노출 상태, (2) ChatGPT·Perplexity 같은 AI 검색이 이 변호사를 인용·추천할 만한 근거가 있는지, (3) 블로그 콘텐츠의 SEO·전문성 수준을 파악합니다.
- 제공된 블로그 본문 일부도 참고합니다.
- 확인되지 않은 사실을 지어내지 말고, 검색·자료로 뒷받침되는 범위에서 단정합니다.

[톤]
- 막연한 칭찬이나 겁주기 금지. 데이터 기반의 담백하고 전문적인 어조.
- 변호사가 읽고 '정확하다, 이 사람들 진짜 안다'고 느끼게.

[출력 형식] 아래 구분자 형식'만' 출력하세요. 다른 말 금지.
===SCORE===
(0~100 사이 정수. 온라인 마케팅 종합 점수. 대부분의 변호사는 40~75 사이입니다. 후하게 주지 마세요.)
===SUMMARY===
(2~3문장 종합 진단. 현재 상태를 솔직하게.)
===FINDINGS===
(개선이 필요한 핵심 3가지. 각 줄: 제목 | 한두 문장 설명. 정확히 3줄.)
===NEXT===
(이 문제들을 macdee가 어떻게 자동으로 해결하는지 2문장 + 7일 무료체험 권유 1문장. 광고처럼 과하지 않게.)`;

    const user = `[변호사] ${input.name}
[분야] ${input.field || "미입력"}
[진단 대상 주소] ${input.blogUrl} (네이버 블로그·홈페이지 등 채널)
[페이지 제목] ${input.blogTitle || "-"}

[본문 일부]
${input.blogSample || "(본문을 가져오지 못했습니다 — 웹검색으로 노출 상태를 진단해 주세요)"}

위 변호사의 온라인 마케팅을 웹에서 조사한 뒤 진단해 주세요.`;

    const messages: Array<{ role: string; content: unknown }> = [{ role: "user", content: user }];
    let allText = "";

    for (let i = 0; i < 5; i++) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": input.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-opus-5",
                max_tokens: 8000,
                system,
                tools: [{ type: "web_search_20260209", name: "web_search" }],
                messages,
            }),
        });
        if (!res.ok) {
            console.error("[Diagnose] Claude error:", await res.text());
            return null;
        }
        const data = await res.json();
        const blocks: Array<{ type: string; text?: string }> = data.content || [];
        for (const b of blocks) if (b.type === "text" && b.text) allText += b.text + "\n";
        if (data.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: data.content });
            continue;
        }
        break;
    }

    return parseReport(allText);
}

function parseReport(text: string): Report | null {
    const get = (key: string, next: string[]) => {
        const start = text.indexOf(`===${key}===`);
        if (start === -1) return "";
        const from = start + key.length + 6;
        let end = text.length;
        for (const n of next) {
            const idx = text.indexOf(`===${n}===`, from);
            if (idx !== -1) { end = idx; break; }
        }
        return text.substring(from, end).trim();
    };

    const scoreRaw = get("SCORE", ["SUMMARY", "FINDINGS", "NEXT"]);
    const summary = get("SUMMARY", ["FINDINGS", "NEXT"]);
    const findingsRaw = get("FINDINGS", ["NEXT"]);
    const next = get("NEXT", []);

    if (!summary && !findingsRaw) return null;

    const score = Math.max(0, Math.min(100, parseInt(scoreRaw.replace(/[^0-9]/g, ""), 10) || 60));
    const findings = findingsRaw
        .split("\n")
        .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
        .filter(Boolean)
        .map((l) => {
            const [title, ...rest] = l.split("|");
            return { title: title.trim(), detail: rest.join("|").trim() };
        })
        .filter((f) => f.title)
        .slice(0, 4);

    return { score, summary, findings, next };
}

async function notify(name: string, phone: string, email: string, blogUrl: string, score: number) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
        from: `"macdee 무료진단 리드" <${process.env.EMAIL_USER}>`,
        to: "ceo@lawnald.com",
        subject: `[무료진단 리드] ${name} (${score}점)`,
        html: `<div style="font-family:sans-serif">
            <h2 style="color:#3563AE">새 무료진단 리드</h2>
            <p><strong>이름:</strong> ${name}</p>
            <p><strong>연락처:</strong> ${phone || "-"} / ${email || "-"}</p>
            <p><strong>블로그:</strong> <a href="${blogUrl}">${blogUrl}</a></p>
            <p><strong>진단점수:</strong> ${score}</p>
            <p style="color:#666;font-size:12px">진단 직후라 관심도가 높습니다. 빠르게 후속 연락하세요.</p>
        </div>`,
    });
}
