import { NextResponse } from "next/server";

// Allow enough time for image generation (gpt-image-1.5 can take 30-60s)
export const maxDuration = 120;

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

        // Diverse visual styles inspired by PlusX / premium design agencies
        const VISUAL_STYLES = [
            {
                name: "3D Abstract",
                desc: "Sleek 3D rendered abstract composition. Glossy floating geometric shapes (spheres, torus, cubes) with frosted glass textures. Bold gradient lighting in deep blue and warm amber. Soft shadows on a clean midtone background. Think Apple product launch aesthetic.",
            },
            {
                name: "Flat Editorial",
                desc: "Bold flat-color editorial illustration with confident shapes and silhouettes. Limited palette of 3-4 high-contrast colors. Inspired by Bloomberg Businessweek or The Economist covers. Large abstract shapes representing concepts, NO photorealism.",
            },
            {
                name: "Neon Gradient",
                desc: "Dark moody background with vibrant neon gradient mesh or aurora-like glow. Cyberpunk-inspired with electric purple, hot pink, and electric blue. Clean silhouette of a key subject in the foreground. Think Verge or Wired magazine aesthetic.",
            },
            {
                name: "Isometric Scene",
                desc: "Detailed isometric 3D scene depicting the article's topic as a miniature world. Soft pastel colors with clean edges. Like a tiny diorama or city block seen from above. Playful yet professional, inspired by Dropbox or Notion illustrations.",
            },
            {
                name: "Cinematic Moody",
                desc: "Dramatic cinematic photograph with heavy atmosphere. Deep shadows, a single dramatic light source, teal-orange color grading. Subject partially obscured for mystery. Think Netflix promotional poster quality.",
            },
            {
                name: "Minimal Geometric",
                desc: "Ultra-minimalist composition with one or two bold geometric shapes on a solid color background. Strong negative space. Bauhaus-inspired. One accent color against muted background. Think PlusX or Google Material Design.",
            },
            {
                name: "Paper Texture Collage",
                desc: "Mixed-media digital collage with paper textures, torn edges, newspaper clippings aesthetic. Layered composition with subtle grain. Muted earth tones with one pop of color. Think Pentagram or independent zine cover design.",
            },
            {
                name: "Futuristic Data",
                desc: "Abstract data visualization or flowing particle system. Glowing nodes and connections on dark background. Represents information flow, technology, or AI. Inspired by Refik Anadol's data sculptures. Deep space blue with white/golden particles.",
            },
        ];

        // Pick a style based on hash of title for consistency but variety
        const styleIndex = title.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % VISUAL_STYLES.length;
        const style = VISUAL_STYLES[styleIndex];

        const prompt = `Create a premium magazine cover image for a legal technology publication called "macdee insights".

ARTICLE CONTEXT:
Title: "${title}"
Summary: ${bodySnippet}
Category: ${category || "법률정보"}

VISUAL STYLE: ${style.name}
${style.desc}

CRITICAL REQUIREMENTS:
1. The image must visually represent the SPECIFIC topic of this article — find the perfect visual metaphor
2. ${style.name} style — do NOT default to generic "person at desk" or "gavel" imagery
3. Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks
4. 1:1 square ratio, ultra high quality, 4K detail
5. The image should feel like it belongs on the cover of a premium design magazine
6. Make it visually striking — someone should stop scrolling when they see this`;


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
