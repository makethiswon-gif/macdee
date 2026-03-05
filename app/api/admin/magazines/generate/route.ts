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

        const systemPrompt = `당신은 법률 매거진 전문 에디터입니다.
주어진 주제에 대해 고품질 매거진 기사를 작성합니다.

[작성 규칙]
- 한국 독자 대상, 자연스러운 한국어 사용
- SEO 최적화: 핵심 키워드 자연스럽게 3~5회 반복
- 제목은 호기심을 자극하되 정확한 정보 전달
- 본문은 마크다운 형식 (## 소제목, **볼드**, 목록 등)
- 1500~3000자 분량
- 법률 정보는 정확하게, 쉬운 용어로 설명
- 마지막에 핵심 요약 박스 포함
- 카테고리: ${category || "법률정보"}

[출력 형식 — JSON]
{
  "title": "매력적인 기사 제목",
  "excerpt": "검색 결과에 표시될 150자 이내 요약",
  "body": "마크다운 본문 (## 소제목 포함)",
  "meta_title": "SEO 제목 (60자 이내)",
  "meta_description": "SEO 메타 설명 (155자 이내)",
  "tags": ["태그1", "태그2", "태그3"],
  "category": "${category || "법률정보"}"
}

JSON만 출력하세요. 코드 블록 마크업 없이.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Magazine AI] Claude error:", err);
            return NextResponse.json({ error: "AI 생성 실패" }, { status: 500 });
        }

        const data = await res.json();
        const content = data.content?.[0]?.text || "";

        // Parse JSON response
        try {
            // Strip potential code block wrappers
            const clean = content.replace(/^```json?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();
            const article = JSON.parse(clean);
            return NextResponse.json({ article });
        } catch {
            // If JSON parse fails, return raw content
            return NextResponse.json({
                article: {
                    title: "AI 생성 기사",
                    body: content,
                    excerpt: content.substring(0, 150),
                    meta_title: "AI 생성 기사",
                    meta_description: content.substring(0, 155),
                    tags: [],
                    category: category || "법률정보",
                },
            });
        }
    } catch (err) {
        console.error("[Magazine AI] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
