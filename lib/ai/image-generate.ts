// ─── Gemini 웹툰 스타일 배경 이미지 생성 for Card News ───

// 사건 유형별 웹툰 장면 매핑
const CASE_WEBTOON_SCENES: Record<string, string> = {
    "이혼": "A dramatic webtoon scene of a couple sitting apart at a dining table, with a tense emotional atmosphere, soft warm lighting through a window",
    "위자료": "A webtoon panel showing legal documents and a wedding ring on a desk, dramatic lighting, emotional scene",
    "불륜": "A webtoon-style scene of a cracked smartphone showing messages, dark moody manhwa atmosphere",
    "사기": "A Korean webtoon panel of a shadowy figure handing over fake documents, noir thriller style, high contrast",
    "폭행": "A dramatic manhwa courtroom scene with a judge's gavel, intense spotlight, justice atmosphere",
    "상속": "A webtoon scene of an old Korean house (hanok) with family photos, nostalgic yet tense mood",
    "부동산": "A manhwa-style scene of apartment blueprints overlapping with a gavel, urban skyline at dusk",
    "노동": "A webtoon panel of an empty office with a resignation letter, cold lighting, corporate atmosphere",
    "교통사고": "A dramatic manhwa scene of a rainy intersection at night, car headlights reflecting on wet road",
    "명예훼손": "A webtoon scene with digital screens displaying hateful comments, cyberpunk manhwa style",
    "성범죄": "An abstract manhwa panel of scales of justice in shadow, dark minimal composition",
    "채권": "A webtoon scene of stacked financial documents with calculator, dramatic chiaroscuro lighting",
};

const DEFAULT_WEBTOON_SCENE = "A dramatic Korean webtoon courtroom scene with warm light streaming through windows, a lawyer standing with confidence, cinematic manhwa style";

function getWebtoonScene(caseType: string): string {
    for (const [keyword, scene] of Object.entries(CASE_WEBTOON_SCENES)) {
        if (caseType.includes(keyword)) return scene;
    }
    return DEFAULT_WEBTOON_SCENE;
}

/**
 * Gemini (나노바나나) 모델로 카드뉴스 웹툰 스타일 배경 이미지를 생성합니다.
 *
 * @param caseType - 사건 유형 (이혼, 사기 등)
 * @param hookText - 카드1의 훅 텍스트 (이미지에 반영할 테마)
 * @returns base64 encoded image data 또는 null (실패 시)
 */
export async function generateCoverImage(
    caseType: string,
    hookText: string,
): Promise<{ imageBase64: string; revisedPrompt: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] GEMINI_API_KEY not set, skipping image generation");
        return null;
    }

    const webtoonScene = getWebtoonScene(caseType);

    const prompt = `Create a high-quality Korean webtoon (manhwa, 만화) style illustration for a legal card news background image.

Style requirements:
- Korean webtoon (만화) art style with clean lines and vibrant colors
- Dramatic lighting and cinematic composition
- Professional and premium feel, suitable for a law firm
- NO text, NO words, NO letters, NO numbers in the image
- Square aspect ratio (1:1)
- Slightly dark and moody atmosphere with selective warm highlights

Scene: ${webtoonScene}
Theme inspired by: "${hookText}"

The image should look like a panel from a premium Korean legal drama webtoon (법정 웹툰). Make it visually striking and emotionally compelling.`;

    try {
        console.log(`[CoverImage] Generating Gemini webtoon image for: ${caseType}`);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        responseModalities: ["TEXT", "IMAGE"],
                    },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error(`[CoverImage] Gemini API error: ${res.status}`, err);
            // Fallback to DALL-E if Gemini fails
            return await generateCoverImageDallE(caseType, hookText);
        }

        const data = await res.json();

        // Gemini 응답에서 이미지 추출
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
            (p: { inlineData?: { mimeType: string; data: string } }) =>
                p.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
            console.warn("[CoverImage] No image in Gemini response, falling back to DALL-E");
            return await generateCoverImageDallE(caseType, hookText);
        }

        console.log("[CoverImage] Gemini webtoon image generated successfully");
        return {
            imageBase64: imagePart.inlineData.data,
            revisedPrompt: prompt,
        };
    } catch (err) {
        console.error("[CoverImage] Gemini image generation failed:", err);
        // Fallback to DALL-E
        return await generateCoverImageDallE(caseType, hookText);
    }
}

/**
 * DALL-E 3 폴백 — Gemini 이미지 생성 실패 시 사용
 */
async function generateCoverImageDallE(
    caseType: string,
    hookText: string,
): Promise<{ imageBase64: string; revisedPrompt: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] OPENAI_API_KEY not set, skipping DALL-E fallback");
        return null;
    }

    const webtoonScene = getWebtoonScene(caseType);

    const prompt = `Create a cinematic, moody illustration for a Korean legal story card news cover.
Style: Korean webtoon art style, atmospheric, modern editorial design. NO text, NO words, NO letters.
Scene: ${webtoonScene}
Mood inspired by: "${hookText}"
Aspect ratio: square (1:1).
IMPORTANT: The image must contain ZERO text, ZERO letters, ZERO words, ZERO numbers.`;

    try {
        console.log(`[CoverImage] Falling back to DALL-E for: ${caseType}`);
        const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                response_format: "b64_json",
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[CoverImage] DALL-E API error: ${res.status}`, err);
            return null;
        }

        const data = await res.json();
        return {
            imageBase64: data.data[0].b64_json,
            revisedPrompt: data.data[0].revised_prompt || prompt,
        };
    } catch (err) {
        console.error("[CoverImage] DALL-E fallback failed:", err);
        return null;
    }
}
