import { NextResponse } from "next/server";

// POST: Generate cover image for magazine using Gemini
export async function POST(request: Request) {
    // Admin verify
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title, body, category } = await request.json();
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 500 });

        const prompt = `Create a photorealistic, editorial-quality photograph for a Korean legal magazine article.

Article title: "${title}"
Category: ${category || "법률정보"}
Content summary: ${(body || "").substring(0, 300)}

Requirements:
- High-end editorial photography style, like a premium magazine cover
- Related to the article topic, conveying the essence of the legal subject
- Professional, clean, modern aesthetic
- Square 1:1 ratio, high quality
- Cinematic lighting with warm tones
- Korean setting and atmosphere if applicable
- NO text, NO words, NO letters, NO numbers anywhere in the image
- No stock photo feel, should look like original editorial photography`;

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error("[Magazine Image] Gemini error:", err);
            return NextResponse.json({ error: "이미지 생성 실패" }, { status: 500 });
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
            (p: { inlineData?: { mimeType: string; data: string } }) =>
                p.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
            return NextResponse.json({ error: "이미지 생성 결과 없음" }, { status: 500 });
        }

        // Return as data URL
        const mimeType = imagePart.inlineData.mimeType;
        const base64 = imagePart.inlineData.data;
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return NextResponse.json({ imageUrl: dataUrl });
    } catch (err) {
        console.error("[Magazine Image] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
