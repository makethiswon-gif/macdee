import { NextResponse } from "next/server";

export const maxDuration = 120; // DALL-E 3 can take up to 30-45 seconds

async function compressToJpeg(b64: string): Promise<string> {
    try {
        const sharp = (await import("sharp")).default;
        const buf = Buffer.from(b64, "base64");
        // Convert to high-quality JPEG (much smaller than raw PNG base64)
        const resized = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
        return `data:image/jpeg;base64,${resized.toString("base64")}`;
    } catch (err) {
        console.error("Compression error:", err);
        return `data:image/png;base64,${b64}`;
    }
}

export async function POST(request: Request) {
    // Admin verify
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title, summary } = await request.json();
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) return NextResponse.json({ error: "OPENAI_API_KEY 미설정" }, { status: 500 });

        const bodySnippet = (summary || "").substring(0, 500);

        const prompt = `Create a premium, photorealistic photograph for a professional legal blog.

CONTEXT:
Title: "${title}"
Summary: ${bodySnippet}

CRITICAL REQUIREMENTS:
1. The image MUST be a realistic PHOTOGRAPH. Do not use 3D renders, vector illustrations, or flat graphic art.
2. The image MUST visually represent the SPECIFIC topic of this legal article through a clear photographic metaphor (e.g., if it's about divorce, show a divided object or two wedding rings; if it's about a car accident, show a realistic rainy road, etc.).
3. Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks anywhere in the image. DALL-E must not generate any text.
4. Professional tone: Clean, high-end photography, cinematic lighting, corporate or modern aesthetic.
5. 1:1 square ratio, extremely high quality, 8k resolution.`;

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
            const errText = await res.text();
            console.error("[Blog Photo Image] DALL-E 3 error:", errText);
            return NextResponse.json({ error: "이미지 생성 실패" }, { status: 500 });
        }

        const data = await res.json();
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) {
            return NextResponse.json({ error: "이미지 생성 결과 없음" }, { status: 500 });
        }

        const dataUrl = await compressToJpeg(b64);
        return NextResponse.json({ imageUrl: dataUrl });
    } catch (err) {
        console.error("[Blog Photo Image] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
