import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get("admin_token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { context } = body; // e.g., the summary points text joined

        if (!context) {
            return NextResponse.json({ error: "Context text is required" }, { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
        }

        // The specialized prompt reverse-engineered from the user's uploaded style, adapted to fit the context
        const prompt = `A trendy, minimalist 2D flat vector illustration that clearly represents the core subject matter of the following text: "${context}"

Strict visual style constraints: 
1. Very bold, thick, continuous black ink outlines defining all shapes. 
2. Absolutely NO gradients, NO complex shading, NO 3D rendering. Only flat solid block colors. 
3. Limited and earthy muted color palette: olive green, warm brown, beige, pure black, and white.
4. If characters are included, they should have minimal facial features (just dots for eyes, simple line for mouth).
5. The illustration must strongly and directly depict the legal or business subject matter provided above, maintaining the trendy graphic aesthetic. Do NOT just draw a random casual character doing nothing.
6. The background must be pure off-white or cream. Absolutely NO TEXT OR WORDS in the image.`;

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
                style: "vivid", // Vivid generally works better for punchy graphic styles
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
