import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadMagazineCover } from "@/lib/supabase/storage";
import nodemailer from "nodemailer";

// 웹검색 + Opus 생성 + 이미지 생성까지 한 번에 처리하므로 넉넉히
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

// Vercel Cron(또는 수동 호출) 인증
function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = request.headers.get("authorization");
    return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
    if (!authorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });

    try {
        const supabase = createServiceClient();

        // 1) 최근 발행 제목 — 주제 중복 회피용
        const { data: recent } = await supabase
            .from("magazines")
            .select("title")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(25);
        const recentTitles = (recent || []).map((r) => r.title).filter(Boolean);

        // 2) 웹검색으로 최신 소식 조사 + 기사 작성
        const article = await generateArticleWithWebSearch(apiKey, recentTitles);
        if (!article || !article.title || !article.body) {
            return NextResponse.json({ error: "기사 생성 실패" }, { status: 500 });
        }

        // 3) 커버 이미지 (best-effort — 실패해도 발행은 진행)
        let coverUrl: string | null = null;
        try {
            coverUrl = await generateCover(article.title, article.body, article.category);
        } catch (e) {
            console.error("[Daily Magazine] cover error:", e);
        }

        // 4) 발행
        const slug = slugify(article.title);
        const nowIso = new Date().toISOString();
        const { data: inserted, error } = await supabase
            .from("magazines")
            .insert({
                title: article.title,
                slug,
                excerpt: article.excerpt || article.body.substring(0, 160),
                body: article.body,
                category: article.category || "법률 마케팅",
                tags: article.tags || [],
                meta_title: article.meta_title || article.title,
                meta_description: article.meta_description || article.excerpt || article.body.substring(0, 155),
                cover_image_url: coverUrl,
                seo_score: seoScore(article),
                status: "published",
                published_at: nowIso,
                author: "macdee 에디터",
            })
            .select("id, slug")
            .single();

        if (error) {
            console.error("[Daily Magazine] insert error:", error);
            return NextResponse.json({ error: "발행 실패", detail: error.message }, { status: 500 });
        }

        const url = `${BASE_URL}/magazine/${inserted.slug}`;
        // 5) 발행 알림(이메일) — best-effort
        await notify(article.title, url).catch((e) => console.error("[Daily Magazine] notify error:", e));

        return NextResponse.json({ success: true, id: inserted.id, title: article.title, url });
    } catch (err) {
        console.error("[Daily Magazine] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// ─── Claude Opus 4.8 + 웹검색으로 기사 생성 ───
interface Article {
    title: string;
    meta_title: string;
    meta_description: string;
    excerpt: string;
    tags: string[];
    category: string;
    body: string;
}

async function generateArticleWithWebSearch(apiKey: string, recentTitles: string[]): Promise<Article | null> {
    const avoid = recentTitles.length
        ? `\n\n[최근 이미 발행한 제목 — 주제·앵글이 겹치지 않게 새로운 소식을 고르세요]\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
        : "";

    const systemPrompt = `당신은 'macdee insights'의 베테랑 에디터입니다. macdee(맥디)는 변호사·법무법인을 위한 AI 마케팅 자동화 플랫폼이며, 운영사는 메이크디스원입니다.

[오늘의 임무]
web_search 도구로 '오늘 기준 가장 최근의' 변호사·법무법인 업계 소식 또는 법률 마케팅/디지털 마케팅 트렌드를 조사한 뒤, 한국 변호사 독자에게 가장 가치 있는 주제 하나를 골라 한 편의 칼럼을 완성하세요. 한국 법률시장과의 관련성을 우선합니다.

[정확성 — 검토 없이 바로 공개되는 글입니다]
- 검색으로 확인된 사실만 단정적으로 서술합니다. 확인되지 않은 통계·수치·판례 번호·인물 발언을 지어내지 마세요.
- 날짜나 출처가 모호하면 "최근", "올해 들어" 처럼 안전하게 표현합니다.
- 특정 매체 기사를 베끼지 말고, 여러 출처의 사실을 종합해 직접 쓴 분석으로 재구성합니다.

[SEO 규칙]
1. title: 20~55자, 핵심 키워드 + 호기심
2. meta_title: 25~55자, title과 다른 표현
3. meta_description: 90~150자, 핵심 요약 + 행동 유도
4. excerpt: 60~180자
5. body: 2,500자 이상. ## 소제목 3개 이상. 마크다운
6. tags: 키워드 3~5개
7. category: "법률 마케팅" 또는 "업계 동향" 중 적합한 것

[문체 — 사람이 쓴 칼럼처럼]
- 경어체(~합니다/~입니다). 데이터·사실 기반의 담백하고 단정적인 서술.
- 짧은 문장과 긴 문장을 섞어 리듬감. ## 소제목으로 구조화, 핵심은 **굵게**.
- 마지막은 변호사 독자에게 주는 실무적 시사점으로 자연스럽게 닫기.

[⛔ 절대 금지 — AI 티가 나면 실패]
"~에 대해 알아보겠습니다 / 살펴보겠습니다", "이번 글에서는", "결론적으로", "마무리하며", "~하는 것이 중요합니다", "~라고 할 수 있습니다", "여러분", 과도한 물음표 반복, 형식적 FAQ/체크리스트 마무리, 본문에 --- 수평선, 검색 과정이나 사고 과정 노출.

[출력 형식] 검색을 마친 뒤, 아래 구분자 형식의 결과물'만' 출력하세요. 그 외의 말(검색 요약, 인사말 등)은 한마디도 붙이지 마세요. JSON이 아닙니다.
===TITLE===
(제목)
===META_TITLE===
(메타 제목)
===META_DESCRIPTION===
(메타 설명)
===EXCERPT===
(요약문)
===TAGS===
(콤마 구분 태그)
===CATEGORY===
(법률 마케팅 또는 업계 동향)
===BODY===
(마크다운 본문, 2,500자 이상, ## 소제목 3개 이상)`;

    const userPrompt = `오늘 기준 최신 변호사 업계 소식 또는 법률 마케팅 트렌드를 웹에서 조사한 뒤, 가장 가치 있는 주제로 macdee insights 칼럼을 작성해 주세요.${avoid}`;

    // 서버 도구(web_search)는 pause_turn으로 끊길 수 있어 짧게 루프
    const messages: Array<{ role: string; content: unknown }> = [{ role: "user", content: userPrompt }];
    let allText = "";

    for (let i = 0; i < 5; i++) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-opus-4-8",
                max_tokens: 16000,
                system: systemPrompt,
                tools: [{ type: "web_search_20260209", name: "web_search" }],
                messages,
            }),
        });

        if (!res.ok) {
            console.error("[Daily Magazine] Claude error:", await res.text());
            return null;
        }

        const data = await res.json();
        const blocks: Array<{ type: string; text?: string }> = data.content || [];
        for (const b of blocks) {
            if (b.type === "text" && b.text) allText += b.text + "\n";
        }

        if (data.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: data.content });
            continue; // 서버가 이어서 처리
        }
        break;
    }

    return parseDelimiterFormat(allText);
}

// ─── 커버 이미지 생성 (OpenAI) → 스토리지 URL ───
async function generateCover(title: string, body: string, category: string): Promise<string | null> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;

    const prompt = `Create a photorealistic, premium magazine cover photograph for a legal-tech publication "macdee insights".
ARTICLE: "${title}" (category: ${category}). ${(body || "").substring(0, 300)}
STYLE: high-end editorial photography, cinematic natural lighting, shallow depth of field, modern and trustworthy mood.
RULES: realistic PHOTOGRAPH only (no 3D/illustration), absolutely NO text/letters/numbers/watermark, 1:1 square, ultra high quality, photorealistic.`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-image-1.5", prompt, n: 1, size: "1024x1024", quality: "high", output_format: "png" }),
    });
    if (!res.ok) {
        console.error("[Daily Magazine] image error:", await res.text());
        return null;
    }
    const data = await res.json();
    const b64: string | null = data.data?.[0]?.b64_json ?? null;
    if (!b64) return null;

    return uploadMagazineCover(`${title.substring(0, 40)}-${Date.now()}`, b64);
}

// ─── 발행 알림 메일 (선택) ───
async function notify(title: string, url: string) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
        from: `"macdee 매거진 자동발행" <${process.env.EMAIL_USER}>`,
        to: "ceo@lawnald.com",
        subject: `[자동발행] ${title}`,
        html: `<div style="font-family:sans-serif"><p>오늘의 매거진이 자동 발행되었습니다.</p>
        <p><strong>${title}</strong></p>
        <p><a href="${url}">${url}</a></p></div>`,
    });
}

// ─── 구분자 파싱 ───
function parseDelimiterFormat(text: string): Article | null {
    const keys = ["TITLE", "META_TITLE", "META_DESCRIPTION", "EXCERPT", "TAGS", "CATEGORY", "BODY"];
    const sections: Record<string, string> = {};

    for (let i = 0; i < keys.length; i++) {
        const start = text.indexOf(`===${keys[i]}===`);
        if (start === -1) continue;
        const contentStart = start + `===${keys[i]}===`.length;
        let end = text.length;
        for (let j = i + 1; j < keys.length; j++) {
            const nextIdx = text.indexOf(`===${keys[j]}===`, contentStart);
            if (nextIdx !== -1) { end = nextIdx; break; }
        }
        sections[keys[i]] = text.substring(contentStart, end).trim();
    }

    if (!sections["TITLE"] || !sections["BODY"]) return null;

    return {
        title: sections["TITLE"],
        meta_title: sections["META_TITLE"] || sections["TITLE"],
        meta_description: sections["META_DESCRIPTION"] || (sections["EXCERPT"] || "").substring(0, 155),
        excerpt: sections["EXCERPT"] || sections["BODY"].substring(0, 150),
        tags: sections["TAGS"] ? sections["TAGS"].split(",").map((t) => t.trim()).filter(Boolean) : [],
        category: sections["CATEGORY"] || "법률 마케팅",
        body: sections["BODY"],
    };
}

// ─── slug / seo (admin 라우트 로직과 동일 규칙) ───
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^가-힣a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
        .substring(0, 80) + "-" + Date.now().toString(36);
}

function seoScore(a: Article): number {
    let score = 0;
    if (a.title.length > 5) score += 10;
    if (a.title.length >= 20 && a.title.length <= 60) score += 15;
    if (a.body.length > 300) score += 10;
    if (a.body.length > 1000) score += 10;
    if ((a.body.match(/##/g) || []).length >= 2) score += 5;
    if (a.meta_title.length >= 20 && a.meta_title.length <= 60) score += 10;
    if (a.meta_description.length >= 80 && a.meta_description.length <= 160) score += 15;
    if (a.excerpt.length >= 50 && a.excerpt.length <= 200) score += 15;
    return Math.min(100, score);
}
