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

        const prompt = `다음 법률 블로그 글을 분석하여 썸네일용 짧은 제목과 본문 핵심 포인트를 추출해주세요.

## 규칙:
1. shortTitle: 썸네일 이미지에 들어갈 매우 짧고 강렬한 핵심 제목 (최대 20자 내외). 원본 제목이 길어도 핵심만 압축해서 짧게 만드세요.
2. points: 반드시 3~4개의 핵심 포인트를 추출하세요 (절대 5개를 초과하지 마세요).
3. 각 포인트는 길고 복잡하게 쓰지 말고, 1~2문장 이내(최대 40~50자 내외)로 아주 짧게 압축해서 작성하세요.
4. 독자가 모바일 화면에서 한눈에 핵심을 파악할 수 있도록 불필요한 서술어를 빼고 명사형으로 끝맺거나 매우 간결하게 요약하세요.
5. 법률 용어는 정확하되, 일반인도 이해할 수 있는 수준으로 핵심만 짚어주세요.
6. 단순 요약이 아니라 "행동 가능한 인사이트"를 제공하세요 (예: "~법적 검토 필수", "~을 확인하세요").

## 출력 형식:
반드시 다음 형태의 JSON 객체로 반환하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "shortTitle": "음주운전 2진 아웃, 구속 막는 초기 대응법",
  "points": [
    "포인트1 첫 번째 문장. 포인트1 두 번째 문장.",
    "포인트2 첫 번째 문장. 포인트2 두 번째 문장."
  ]
}

${title ? `## 원본 글 제목:\n${title}\n` : ""}
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
        let shortTitle = title || "";
        try {
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                points = parsed;
            } else if (parsed.points) {
                points = parsed.points;
                if (parsed.shortTitle) shortTitle = parsed.shortTitle;
            }
        } catch {
            points = text.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter((l: string) => l.length > 10);
        }

        // Ensure max 4 points for concise display
        if (points.length > 4) points = points.slice(0, 4);

        return NextResponse.json({ shortTitle, points });
    } catch (err) {
        console.error("[blog-summarize] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
