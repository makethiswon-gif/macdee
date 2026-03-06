import { NextResponse } from "next/server";

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch { return false; }
}

// POST: Generate magazine article with Claude
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { prompt, category } = await request.json();
        if (!prompt) return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });

        const systemPrompt = `당신은 'macdee insights'의 전문 에디터입니다. macdee(맥디)는 변호사를 위한 AI 법률 마케팅 플랫폼입니다.

[macdee 핵심 정보]
- 판결문/녹취/메모 업로드 → 개인정보 자동 비식별화 → 네이버 블로그, 인스타 카드뉴스, 구글 SEO 기사, AI검색 프로필 4채널 동시 생성
- 가격: 월 49,000원(30건)~179,000원(무제한). 기존 대행사 월 100~300만원 대비 90% 절감
- 웹사이트: makethis1.com

[⚠️ SEO 필수 규칙 — 반드시 지키세요]
1. title: 반드시 20~55자. 핵심 키워드 포함, 호기심 유발
2. meta_title: 반드시 25~55자. title과 다른 표현 사용
3. meta_description: 반드시 90~150자. 핵심 내용 요약, 행동 유도 문구 포함
4. excerpt: 반드시 60~180자. 검색 결과 미리보기용 요약
5. body: 반드시 2500자 이상. ## 소제목 최소 3개 이상 포함. 마크다운 형식
6. tags: 관련 키워드 3~5개

[기사 작성 규칙]
- 반드시 경어체(~합니다, ~입니다, ~됩니다)로 작성
- 한국 독자 대상, 자연스럽고 따뜻한 한국어 사용
- 본문에 핵심 키워드 자연스럽게 3~5회 반복
- ## 소제목으로 구조화 (최소 3개)
- 마지막에 **핵심 정리** 박스 포함 (> 블록쿼트 사용 금지, **굵은 글씨**로 정리)
- 본문에 --- 수평선 사용 금지
- 카테고리: ${category || "법률정보"}
- macdee 소개나 마케팅 관련 주제 → 위의 macdee 정보 활용

[⛔ 절대 사용 금지 표현 — AI스러운 문체 차단]
다음 표현이 하나라도 나오면 실패로 간주합니다:
- "~에 대해 알아보겠습니다"
- "~을 살펴보겠습니다"
- "~하는 것이 중요합니다"
- "이번 글에서는"
- "결론적으로"
- "마무리하며"
- "지금까지 ~에 대해"
- "~해 보세요" (명령형)
- "~라고 할 수 있습니다"
- 과도한 물음표 반복 ("왜일까요? 무엇일까요?")
- "~라는 점에서 주목할 만합니다"

[✅ 추구하는 문체]
- 경험 많은 마케팅 전문가가 후배에게 설명하듯 담백하고 신뢰감 있는 어투
- 데이터와 사실 기반의 단정적 서술 ("~한 것으로 나타났습니다", "~라는 결과가 있습니다")
- 짧은 문장과 긴 문장을 섞어 리듬감 있게
- 독자가 "이 사람 진짜 현업에 있구나"라고 느낄 수 있도록
- 구어적 표현 적절히 섞기 ("솔직히 말하면", "가장 큰 문제는")

[출력 형식] 아래 구분자 형식으로 정확히 출력하세요. JSON이 아닙니다:

===TITLE===
(여기에 제목, 20~55자)
===META_TITLE===
(여기에 메타 제목, 25~55자)
===META_DESCRIPTION===
(여기에 메타 설명, 90~150자)
===EXCERPT===
(여기에 요약문, 60~180자)
===TAGS===
(여기에 태그, 콤마 구분)
===CATEGORY===
${category || "법률정보"}
===BODY===
(여기에 마크다운 본문, 2500자 이상, ## 소제목 3개 이상)

구분자 형식을 정확히 지키세요. 다른 텍스트는 추가하지 마세요.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 8192,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Magazine AI] Claude error:", err);

            if (err.includes("credit balance is too low")) {
                return NextResponse.json({ error: "Anthropic API 크레딧이 소진되었습니다." }, { status: 402 });
            }

            return NextResponse.json({ error: `AI 생성 실패: ${err}` }, { status: 500 });
        }

        const data = await res.json();
        const rawContent = data.content?.[0]?.text || "";

        // Parse delimiter-based format
        const article = parseDelimiterFormat(rawContent, category || "법률정보");

        if (article) {
            return NextResponse.json({ article });
        }

        // Fallback: try JSON parsing (in case model outputs JSON anyway)
        const jsonArticle = tryParseJSON(rawContent);
        if (jsonArticle) {
            return NextResponse.json({ article: jsonArticle });
        }

        // Last resort: return raw content split into the body
        console.warn("[Magazine AI] Could not parse response, returning raw as body.");
        return NextResponse.json({
            article: {
                title: "AI 생성 기사",
                body: rawContent,
                excerpt: rawContent.substring(0, 150),
                meta_title: "AI 생성 기사",
                meta_description: rawContent.substring(0, 155),
                tags: [],
                category: category || "법률정보",
            },
        });
    } catch (err) {
        console.error("[Magazine AI] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// ─── Parse delimiter-based format ───
function parseDelimiterFormat(text: string, defaultCategory: string) {
    const sections: Record<string, string> = {};
    const delimiters = ["TITLE", "META_TITLE", "META_DESCRIPTION", "EXCERPT", "TAGS", "CATEGORY", "BODY"];

    for (let i = 0; i < delimiters.length; i++) {
        const startMarker = `===${delimiters[i]}===`;
        const startIdx = text.indexOf(startMarker);
        if (startIdx === -1) continue;

        const contentStart = startIdx + startMarker.length;

        // Find the next delimiter
        let contentEnd = text.length;
        for (let j = i + 1; j < delimiters.length; j++) {
            const nextMarker = `===${delimiters[j]}===`;
            const nextIdx = text.indexOf(nextMarker, contentStart);
            if (nextIdx !== -1) {
                contentEnd = nextIdx;
                break;
            }
        }

        sections[delimiters[i]] = text.substring(contentStart, contentEnd).trim();
    }

    // Must have at least title and body
    if (!sections["TITLE"] && !sections["BODY"]) return null;

    const tags = sections["TAGS"]
        ? sections["TAGS"].split(",").map(t => t.trim()).filter(Boolean)
        : [];

    return {
        title: sections["TITLE"] || "AI 생성 기사",
        meta_title: sections["META_TITLE"] || sections["TITLE"] || "AI 생성 기사",
        meta_description: sections["META_DESCRIPTION"] || (sections["EXCERPT"] || "").substring(0, 155),
        excerpt: sections["EXCERPT"] || (sections["BODY"] || "").substring(0, 150),
        tags,
        category: sections["CATEGORY"] || defaultCategory,
        body: sections["BODY"] || "",
    };
}

// ─── Try parsing JSON (fallback) ───
function tryParseJSON(text: string) {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;

    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    try {
        return JSON.parse(jsonStr);
    } catch {
        try {
            return JSON.parse(jsonStr.replace(/\\n/g, "\n"));
        } catch {
            try {
                const sanitized = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
                return JSON.parse(sanitized);
            } catch {
                return null;
            }
        }
    }
}
