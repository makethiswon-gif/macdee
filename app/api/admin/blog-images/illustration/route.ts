import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get("admin_token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { context, title } = body;

        if (!context && !title) {
            return NextResponse.json({ error: "Context or title is required" }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
        }

        // Build a concise subject description for DALL-E
        const subject = title 
        const prompt = `Create a single panel illustration from a high-quality, modern Korean webtoon.
Topic context for the scene: ${subject}

CRITICAL STYLE RULES (MUST FOLLOW):
- Style: Trendy Korean Webtoon (네이버 웹툰 스타일). Clean, confident line art with cel-shading.
- Subject: A highly expressive, emotional, or dramatic scene directly related to the topic. (e.g., a shocked person looking at a phone, a tense confrontation, someone holding their forehead in despair, a warm comforting handshake).
- Shading & Colors: Simple flat colors with crisp cel-shading. Use a restricted, minimal, highly atmospheric color palette (e.g., moody blues, dramatic sunset oranges, or sterile office greys). NO messy gradients or 3D rendering.
- Background: Extremely minimal. Just a solid pastel color, a simple speed-line effect, or a very basic room corner. DO NOT draw complex backgrounds; leave plenty of empty "negative space" for text to be placed later.
- Avoid text: NO text, NO speech bubbles, NO words, NO letters anywhere.
- Render Quality: 4k, crisp comic book ink style. This must look like a professional, expensive webtoon panel, NOT an old newspaper cartoon or abstract painting.`;

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
                style: "natural", // Natural produces warm, hand-drawn editorial style matching reference
                response_format: "b64_json"
            }),
        });

        if (!res.ok) {
            const errBase = await res.text();
            console.error("[DALL-E 3 error]", errBase);
            return NextResponse.json({ error: "DALL-E 3 error" }, { status: 500 });
        }

        const data = await res.json();
        const base64Image = data.data[0].b64_json;
        if (!base64Image) {
            return NextResponse.json({ error: "No image generated" }, { status: 500 });
        }

        // Return standard data URI
        const imageUrl = `data:image/png;base64,${base64Image}`;
        return NextResponse.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error("[blog-images/illustration] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
