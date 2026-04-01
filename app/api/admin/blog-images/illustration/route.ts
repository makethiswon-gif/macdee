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
            ? `The topic is: "${title}". Additional context: ${(context || "").substring(0, 300)}`
            : `The topic is: ${(context || "").substring(0, 500)}`;

        // Build a highly narrative prompt targeting professional Korean editorial illustrations
        const prompt = `Create a metaphorical, situational, and highly aesthetic editorial illustration for a Korean professional blog. 
Topic context: ${subject}

CRITICAL STYLE RULES:
- Style: Warm, modern hand-drawn editorial illustration with bold ink outlines.
- Subject Matter: DO NOT draw generic people staring at the camera. Draw a metaphor or scene directly relevant to the topic (e.g., a cracked smartphone for digital evidence, a stressed person looking at a huge document, two people at a distance, a hand holding a key).
- Color Palette: Natural skin tones, sophisticated professional colors (navy, beige, olive, warm grey, charcoal). NO neon/garish colors.
- Shading: Soft flats with subtle cel-shading. NOT vector art.
- Avoid text: NO text, NO words, NO letters anywhere.
- The tone should be serious, trusting, and deeply empathetic to the blog topic.`;

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
