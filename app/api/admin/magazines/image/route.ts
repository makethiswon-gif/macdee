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

        // Premium photorealistic editorial styles for magazine covers
        const VISUAL_STYLES = [
            {
                name: "Cinematic Editorial Portrait",
                desc: "High-end editorial photography like GQ or Vogue. Cinematic lighting, shallow depth of field (bokeh), sharp focus on the subject. Natural but dramatic lighting with deep shadows. Photorealistic.",
            },
            {
                name: "Minimalist Still Life",
                desc: "Trendy, clean, and minimalist still life photography. Objects arranged with precision on a neutral or pastel background. Soft diffused studio lighting, sharp details. Think Monocle magazine or premium lifestyle brands.",
            },
            {
                name: "Documentary Street Photography",
                desc: "Candid, realistic street photography style. Natural sunlight, slight film grain, capturing a genuine moment in a modern city like Seoul. Dynamic composition with a sense of movement and authentic atmosphere.",
            },
            {
                name: "Architectural Symmetry",
                desc: "Clean, symmetrical architectural photography. Modern office buildings, glass, steel, and concrete. Beautiful natural light casting sharp geometric shadows. Extremely high resolution, perfectly straight lines, photorealistic.",
            },
            {
                name: "Moody Cinematic Close-up",
                desc: "Extremely close-up macro photography with a moody, dark cinematic atmosphere. Heavy contrast between shadows and warm light. High texture detail (e.g., paper, wood, fabric, skin). Emotional and intense.",
            },
            {
                name: "Warm Golden Hour",
                desc: "Beautiful golden hour photography. Warm, soft sunlight wrapping around the subject, creating long shadows and a glowing atmosphere. Highly realistic, comforting yet professional aesthetic.",
            }
        ];

        // Pick a style based on hash of title for consistency but variety
        const styleIndex = title.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0) % VISUAL_STYLES.length;
        const style = VISUAL_STYLES[styleIndex];

        const prompt = `Create a photorealistic, trendy magazine cover photograph for a premium legal technology publication called "macdee insights".

ARTICLE CONTEXT:
Title: "${title}"
Summary: ${bodySnippet}
Category: ${category || "법률정보"}

VISUAL STYLE: ${style.name}
${style.desc}

CRITICAL REQUIREMENTS:
1. The image MUST be a realistic PHOTOGRAPH. Do not use 3D renders, illustrations, or flat graphics.
2. The image MUST visually represent the SPECIFIC topic of this article through a clever photographic metaphor.
3. Absolutely NO text, NO words, NO letters, NO numbers, NO watermarks anywhere in the image.
4. 1:1 square ratio, ultra high quality, 8k resolution, photorealistic.
5. The image should look like it was shot by a professional photographer for a premium magazine cover.
6. Use trendy, modern aesthetic choices (good composition, lighting, and color grading).`;


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
            console.error("[Magazine Image] DALL-E 3 error:", errText);
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
