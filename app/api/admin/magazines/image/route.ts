import { NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { uploadMagazineCover } from "@/lib/supabase/storage";

// Allow enough time for image generation (gpt-image-2 can take 30-60s)
export const maxDuration = 120;

// POST: Generate cover image for magazine using GPT Image 2 -> gpt-image-1-mini fallback
export async function POST(request: Request) {
    // Admin verify (서명 검증)
    if (!verifyAdminToken(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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


        // 1순위: GPT Image 2
        let b64: string | null = null;
        const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-image-2",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "high",
                output_format: "png",
            }),
        });

        if (res.ok) {
            const data = await res.json();
            b64 = data.data?.[0]?.b64_json ?? null;
        } else {
            const errText = await res.text();
            console.error("[Magazine Image] GPT Image 2 error:", errText);
        }

        // 2순위: gpt-image-1-mini 폴백
        if (!b64) {
            console.log("[Magazine Image] Falling back to gpt-image-1-mini");
            const fallbackRes = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-image-1-mini",
                    prompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "medium",
                    output_format: "png",
                }),
            });
            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                b64 = fallbackData.data?.[0]?.b64_json ?? null;
            } else {
                console.error("[Magazine Image] gpt-image-1-mini fallback error:", await fallbackRes.text());
            }
        }
        if (!b64) {
            return NextResponse.json({ error: "이미지 생성 실패 (GPT Image 2 및 gpt-image-1-mini 모두 실패)" }, { status: 500 });
        }

        // base64를 DB에 직접 넣으면 페이지가 비대해져 크롤링 실패하므로, 반드시 스토리지 URL만 저장
        const key = `${(title || "magazine").substring(0, 40)}-${Date.now()}`;
        const storageUrl = await uploadMagazineCover(key, b64);
        if (!storageUrl) {
            // 업로드 실패 시 base64로 떨어뜨리지 않고 명시적 실패 처리 (페이지 비대화 방지)
            return NextResponse.json({ error: "이미지 저장에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
        }
        return NextResponse.json({ imageUrl: storageUrl });
    } catch (err) {
        console.error("[Magazine Image] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
