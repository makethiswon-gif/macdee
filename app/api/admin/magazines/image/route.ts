import { NextResponse } from "next/server";

// POST: Generate cover image for magazine using OpenAI gpt-image-1.5 → DALL-E 3 fallback
export async function POST(request: Request) {
    // Admin verify
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title, body, category } = await request.json();
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });

        // Extract key themes from the article content for relevance
        const bodySnippet = (body || "").substring(0, 500);
        const prompt = `Create a photorealistic editorial photograph that directly represents the following article's core topic.

Article title: "${title}"
Article content summary: ${bodySnippet}
Category: ${category || "법률정보"}

IMPORTANT - Content Relevance:
- The image MUST visually represent the specific topic of this article
- If the article discusses marketing costs → show a scene related to advertising, budgets, or marketing
- If the article discusses legal trends → show legal settings, courtrooms, or professional environments  
- If the article discusses technology/AI → show modern tech environments
- If the article discusses lawyer competition → show competitive business scenes
- Think about what specific visual metaphor best represents THIS article's message

Style Requirements:
- High-end editorial photography, not stock photo
- Cinematic lighting, warm professional tones
- Korean business/legal atmosphere
- 1:1 square ratio, ultra high quality
- Absolutely NO text, NO words, NO letters, NO numbers in the image
- Clean, minimal composition with strong focal point`;

        // Try gpt-image-1.5 first
        try {
            const res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-image-1.5",
                    prompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "high",
                    output_format: "png",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                const b64 = data.data?.[0]?.b64_json;
                if (b64) {
                    const dataUrl = `data:image/png;base64,${b64}`;
                    return NextResponse.json({ imageUrl: dataUrl });
                }
            }
            const errText = await res.text().catch(() => "unknown");
            console.error("[Magazine Image] gpt-image-1.5 error:", errText);
        } catch (err) {
            console.error("[Magazine Image] gpt-image-1.5 failed:", err);
        }

        // Fallback: DALL-E 3
        const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "hd",
                response_format: "b64_json",
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Magazine Image] DALL-E 3 error:", err);
            return NextResponse.json({ error: "이미지 생성 실패" }, { status: 500 });
        }

        const data = await res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) {
            return NextResponse.json({ error: "이미지 생성 결과 없음" }, { status: 500 });
        }

        const dataUrl = `data:image/png;base64,${b64}`;
        return NextResponse.json({ imageUrl: dataUrl });
    } catch (err) {
        console.error("[Magazine Image] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
