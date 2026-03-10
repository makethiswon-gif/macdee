import { NextRequest, NextResponse } from "next/server";

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
                model: "claude-3-5-haiku-latest",
                max_tokens: 300,
                messages: [{
                    role: "user",
                    content: `다음 블로그 글의 핵심 내용을 정확히 3줄로 요약해주세요. 각 줄은 한국어로 작성하고 줄바꿈(\\n)으로 구분해주세요. 문장은 간결하고 전문적인 톤으로 작성해주세요. 번호나 기호 없이 문장만 작성해주세요.

제목: ${title || ""}
내용: ${content}`,
                }],
            }),
        });

        const data = await res.json();
        const summary = data.content?.[0]?.text || "";
        return NextResponse.json({ summary });
    } catch (err) {
        console.error("AI summary error:", err);
        return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }
}
