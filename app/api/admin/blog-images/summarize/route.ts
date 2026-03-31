/**
 * AI Summary API — Extract 6-8 key points from blog content
 * Uses Claude to generate detailed summary points for blog images
 */
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { content, title } = await request.json();
        if (!content) {
            return NextResponse.json({ error: "content is required" }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI API 키 미설정" }, { status: 500 });
        }

        const prompt = `다음 법률 블로그 글을 분석하여 핵심 포인트를 추출해주세요.

## 규칙:
1. 반드시 6~8개의 핵심 포인트를 추출하세요.
2. 각 포인트는 2문장으로 작성하세요 (핵심 내용 + 구체적 설명/법적 근거).
3. 독자가 이 포인트만 봐도 글의 핵심 내용을 파악할 수 있도록 근거가 되는 법률, 판례, 제도 등의 구체적 정보를 포함하세요.
4. 법률 용어는 정확하되, 일반인도 이해할 수 있는 수준으로 작성하세요.
5. 각 포인트는 서로 다른 내용을 다뤄야 합니다.
6. 단순 요약이 아니라 "행동 가능한 인사이트"를 제공하세요 (예: "~해야 합니다", "~을 확인하세요").

## 출력 형식:
JSON 배열로 반환하세요. 다른 텍스트 없이 순수 JSON만 반환하세요.

예시:
["포인트1 첫 번째 문장. 포인트1 두 번째 문장.", "포인트2 첫 번째 문장. 포인트2 두 번째 문장."]

${title ? `## 글 제목:\n${title}\n` : ""}
## 글 내용:
${content.substring(0, 6000)}`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2000,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("[blog-summarize] AI error:", errText);
            return NextResponse.json({ error: "AI 요약 실패" }, { status: 500 });
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || "";

        // Parse JSON from response
        let points: string[] = [];
        try {
            // Try direct JSON parse
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            points = JSON.parse(cleaned);
        } catch {
            // Fallback: split by newlines
            points = text
                .split("\n")
                .map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim())
                .filter((l: string) => l.length > 10);
        }

        // Ensure 6-8 points
        if (points.length > 8) points = points.slice(0, 8);

        return NextResponse.json({ points });
    } catch (err) {
        console.error("[blog-summarize] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
