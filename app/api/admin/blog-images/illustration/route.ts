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

        // Prompt precisely matched to the user's reference illustration style:
        // Warm hand-drawn character art with bold ink outlines, natural skin tones,
        // soft watercolor-like flat coloring, editorial magazine quality.
        const prompt = `A single full-body character illustration in a warm, modern Korean editorial style for the following subject: ${subject}

CRITICAL STYLE (must follow exactly):
- Bold, thick black ink outlines (like a comic or manhwa) around every shape
- Warm, natural color palette: realistic skin tones, navy/charcoal clothing, warm beige/cream background
- Soft, flat coloring with subtle cel-shading (NOT vector art, NOT geometric, NOT cubist)
- The character should look like a stylish, modern Korean professional (lawyer, office worker, or professional relevant to the topic)
- Character should be doing an action clearly related to the topic (e.g., reading documents for a legal topic, holding a gavel for court topics, comforting someone for family law)
- Realistic human proportions (NOT chibi, NOT cartoon), fashionable casual-professional outfit
- Clean, simple background with at most one accent color blob (like a blue or warm-toned shape behind the character)
- NO text, NO words, NO letters anywhere in the image
- The overall feel should be like a premium Korean magazine editorial illustration`;

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
