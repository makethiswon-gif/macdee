import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";


export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, title } = await request.json();
    if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 400,
                messages: [{
                    role: "user",
                    content: `당신은 법률 블로그 콘텐츠 요약 전문가입니다.

아래 블로그 글을 읽고, 독자가 꼭 알아야 할 **핵심 내용 3가지**를 요약해주세요.

규칙:
- 정확히 3개의 문장을 작성하세요
- 각 문장은 줄바꿈으로 구분하세요
- 각 문장은 15~30자 이내로 간결하게 작성하세요
- "~입니다", "~됩니다" 등 경어체를 사용하세요
- 번호, 기호, 따옴표 없이 문장만 작성하세요
- 법률 용어는 쉽게 풀어서 설명하세요

제목: ${title || ""}
내용:
${content.slice(0, 3000)}`,
                }],
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("AI API error:", res.status, errText);
            return NextResponse.json({ error: "AI API failed" }, { status: 500 });
        }

        const data = await res.json();
        const summary = data.content?.[0]?.text || "";
        return NextResponse.json({ summary });
    } catch (err) {
        console.error("AI summary error:", err);
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
