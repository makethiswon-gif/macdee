import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
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
        const { context, title } = await request.json();

        if (!context && !title) {
            return NextResponse.json({ error: "Context or title is required" }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
        }

        const subject = title 
            ? `Topic: "${title}". Context: ${(context || "").substring(0, 300)}`
            : `Topic: ${(context || "").substring(0, 500)}`;

        // High-end, premium abstract/atmospheric background prompt
        const prompt = `Create a premium, subtle, and highly aesthetic abstract background texture suitable for a high-end Korean corporate or legal blog post about this ${subject}.

CRITICAL STYLE RULES:
- MUST be an abstract, atmospheric, or beautifully textured background (like elegant dark marble, frosted glass, soft cinematic lighting illuminating a premium desk, elegant geometric folds, or muted architectural gradients).
- MUST NOT contain any recognizable human faces or specific characters.
- MUST NOT contain any text, words, or letters whatsoever.
- The mood should be professional, trustworthy, sophisticated, and slightly muted so that text can be placed over it.
- Use a refined and harmonious high-end color palette (e.g., charcoal, navy, warm beige, deep olive, or soft metallic tones). No garish or neon colors.
- The composition should be mostly uncluttered to allow typography to shine on top.`;

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
                style: "natural", // Natural ensures photography/texture realism over vector art
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

        const imageUrl = `data:image/png;base64,${base64Image}`;
        return NextResponse.json({ success: true, url: imageUrl });

    } catch (error) {
        console.error("[blog-images/background] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
