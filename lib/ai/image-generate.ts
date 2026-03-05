// ─── Gemini 이미지 생성 (웹툰 + 사실적 사진 스타일) ───

// 사건 유형별 장면 매핑 — 더 구체적인 상황 묘사
const CASE_SCENES: Record<string, { webtoon: string; realistic: string }> = {
    "이혼": {
        webtoon: "A dramatic Korean webtoon panel of a couple sitting back to back in a dimly lit living room, scattered family photos on the floor, emotional manhwa style",
        realistic: "A cinematic photograph of two wedding rings on a cracked wooden table, divorce papers in soft background blur, warm golden hour lighting"
    },
    "위자료": {
        webtoon: "A manhwa scene of a person reading legal documents at a desk late at night, city lights through the window, dramatic shadows",
        realistic: "A moody photograph of legal documents, a calculator, and a pen on a mahogany desk, dramatic side lighting"
    },
    "불륜": {
        webtoon: "A dark webtoon panel showing a smartphone screen with message notifications, a person's shadowed silhouette in the background, noir style",
        realistic: "A dramatic close-up photograph of a smartphone on a table with blurred text messages, low key lighting, shallow depth of field"
    },
    "사기": {
        webtoon: "An intense manhwa scene of a person discovering forged documents, dramatic zoom-in on shocked expression, high contrast noir style",
        realistic: "A photograph of scattered financial documents and a magnifying glass on a desk, detective thriller atmosphere, dramatic lighting"
    },
    "폭행": {
        webtoon: "A powerful webtoon courtroom scene with a judge raising a gavel, dramatic angle from below, intense manhwa style",
        realistic: "A striking photograph of a gavel in a courtroom with dramatic spotlight, justice and law atmosphere"
    },
    "상속": {
        webtoon: "A Korean webtoon scene of a family gathering around a table with a will document, mixed emotions, warm-toned manhwa style",
        realistic: "A photograph of an old family photo album next to legal documents, warm nostalgic lighting, shallow depth of field"
    },
    "부동산": {
        webtoon: "A manhwa scene of a person looking at apartment blueprints with construction in the background, urban style",
        realistic: "An architectural photograph of apartment buildings at golden hour, construction documents in foreground, professional tone"
    },
    "노동": {
        webtoon: "A webtoon panel of an empty office desk with a resignation letter, fluorescent lighting, melancholic manhwa atmosphere",
        realistic: "A photograph of an empty office chair and desk with personal items being packed, cold corporate lighting"
    },
    "교통사고": {
        webtoon: "A dramatic manhwa scene of a rainy intersection at night with car headlights, motion blur effect, intense atmosphere",
        realistic: "A dramatic photograph of a rainy city intersection at night, reflections on wet asphalt, car headlights creating lens flare"
    },
    "명예훼손": {
        webtoon: "A webtoon scene showing a person in front of multiple screens displaying online comments, cyberpunk manhwa style with neon colors",
        realistic: "A photograph of a person silhouetted against multiple glowing computer screens in a dark room, tech noir atmosphere"
    },
    "성범죄": {
        webtoon: "An abstract manhwa panel of the scales of justice in deep shadow, minimal dark composition, solemn atmosphere",
        realistic: "A dramatic photograph of the scales of justice in shadow, minimal composition with strong chiaroscuro lighting"
    },
    "채권": {
        webtoon: "A webtoon scene of stacked financial documents with a calculator, numbers floating in the air, business manhwa style",
        realistic: "A photograph of neatly stacked financial documents with a calculator casting long shadows, dramatic lighting"
    },
    "형사": {
        webtoon: "A intense Korean webtoon courtroom scene with a defendant and lawyer, dramatic spotlight on the defense table",
        realistic: "A cinematic photograph of a courtroom interior, soft light streaming through tall windows, empty defendant's chair"
    },
    "음주운전": {
        webtoon: "A stark manhwa panel of car keys next to a glass on a bar counter, dramatic reflection, noir style",
        realistic: "A moody photograph of car keys and a glass on a bar counter, with blurred city lights in the background"
    },
    "의료": {
        webtoon: "A webtoon scene of medical documents and stethoscope on a desk, sterile blue hospital lighting, medical manhwa style",
        realistic: "A photograph of medical records and a stethoscope on a white desk, clean hospital lighting, clinical atmosphere"
    },
};

const DEFAULT_SCENE = {
    webtoon: "A dramatic Korean webtoon courtroom scene with warm light streaming through windows, a lawyer standing with confidence, cinematic manhwa style",
    realistic: "A cinematic photograph of a modern courtroom interior, warm golden light streaming through tall windows, law books and gavel on the desk"
};

function getScene(caseType: string, style: "webtoon" | "realistic"): string {
    for (const [keyword, scenes] of Object.entries(CASE_SCENES)) {
        if (caseType.includes(keyword)) return scenes[style];
    }
    return DEFAULT_SCENE[style];
}

/**
 * 업로드 내용을 분석하여 최적의 이미지 프롬프트를 생성합니다.
 */
function buildImagePrompt(
    caseType: string,
    hookText: string,
    style: "webtoon" | "realistic",
    context?: {
        keyPoints?: string[];
        resultSummary?: string;
        maskedText?: string;
    }
): string {
    const scene = getScene(caseType, style);

    // 핵심 키워드를 추출하여 프롬프트에 반영
    let contextClue = "";
    if (context?.keyPoints?.length) {
        contextClue = `\nKey themes from the case: ${context.keyPoints.slice(0, 3).join(", ")}`;
    }
    if (context?.resultSummary) {
        contextClue += `\nCase outcome mood: ${context.resultSummary.includes("승소") ? "triumphant, hopeful" : context.resultSummary.includes("패소") ? "somber, reflective" : "neutral, contemplative"}`;
    }

    if (style === "webtoon") {
        return `Create a high-quality Korean webtoon (만화) illustration.

Style: Korean manhwa art style with clean bold lines, vibrant colors, dramatic lighting
Quality: Professional-grade webtoon panel, premium art quality
Composition: Cinematic framing, dynamic angle

Scene: ${scene}
Hook: "${hookText}"${contextClue}

Rules:
- NO text, NO words, NO letters, NO numbers, NO watermarks
- Square ratio (1:1), 1024x1024
- Dark moody atmosphere with selective warm/cool highlights
- Must look like a panel from a top-tier Korean legal drama webtoon (법정 웹툰)`;
    } else {
        return `Create a photorealistic, cinematic photograph for a professional legal story.

Style: Editorial photography, like a still from a Korean legal drama (K-drama)
Quality: High-end commercial photography, DSLR quality
Composition: Rule of thirds, shallow depth of field, cinematic color grading

Scene: ${scene}
Mood inspired by: "${hookText}"${contextClue}

Rules:
- NO text, NO words, NO letters, NO numbers, NO watermarks
- Square ratio (1:1), 1024x1024
- Dramatic lighting (chiaroscuro or golden hour)
- Color palette: muted, desaturated with selective warm tones
- Must look like a premium stock photograph for a law firm website`;
    }
}

/**
 * Gemini로 카드뉴스 배경 이미지를 생성합니다.
 * 웹툰 스타일 또는 사실적 사진 스타일을 랜덤으로 선택합니다.
 *
 * @param caseType - 사건 유형
 * @param hookText - 카드1의 훅 텍스트
 * @param context - 사건 상세 데이터 (선택)
 * @returns base64 encoded image data 또는 null
 */
export async function generateCoverImage(
    caseType: string,
    hookText: string,
    context?: {
        keyPoints?: string[];
        resultSummary?: string;
        maskedText?: string;
    }
): Promise<{ imageBase64: string; revisedPrompt: string; style: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] GEMINI_API_KEY not set, trying DALL-E fallback");
        return await generateCoverImageDallE(caseType, hookText);
    }

    // 랜덤으로 스타일 선택 (50/50)
    const style: "webtoon" | "realistic" = Math.random() > 0.5 ? "webtoon" : "realistic";
    const prompt = buildImagePrompt(caseType, hookText, style, context);

    try {
        console.log(`[CoverImage] Generating Gemini ${style} image for: ${caseType}`);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
                }),
            }
        );

        if (!res.ok) {
            const err = await res.text();
            console.error(`[CoverImage] Gemini API error: ${res.status}`, err);
            return await generateCoverImageDallE(caseType, hookText);
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(
            (p: { inlineData?: { mimeType: string; data: string } }) =>
                p.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
            console.warn("[CoverImage] No image in Gemini response, falling back to DALL-E");
            return await generateCoverImageDallE(caseType, hookText);
        }

        console.log(`[CoverImage] Gemini ${style} image generated successfully`);
        return {
            imageBase64: imagePart.inlineData.data,
            revisedPrompt: prompt,
            style,
        };
    } catch (err) {
        console.error("[CoverImage] Gemini image generation failed:", err);
        return await generateCoverImageDallE(caseType, hookText);
    }
}

/**
 * DALL-E 3 폴백 — Gemini 실패 시
 */
async function generateCoverImageDallE(
    caseType: string,
    hookText: string,
): Promise<{ imageBase64: string; revisedPrompt: string; style: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] OPENAI_API_KEY not set, skipping DALL-E fallback");
        return null;
    }

    const scene = getScene(caseType, "realistic");
    const prompt = `Create a cinematic, editorial-quality illustration for a Korean legal story card news.
Style: Atmospheric, modern editorial design. NO text, NO words, NO letters.
Scene: ${scene}
Mood: "${hookText}"
Aspect ratio: square (1:1). Premium, sophisticated feel.
IMPORTANT: ZERO text, ZERO letters, ZERO words in the image.`;

    try {
        console.log(`[CoverImage] DALL-E fallback for: ${caseType}`);
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
            console.error(`[CoverImage] DALL-E error: ${res.status}`, err);
            return null;
        }

        const data = await res.json();
        return {
            imageBase64: data.data[0].b64_json,
            revisedPrompt: data.data[0].revised_prompt || prompt,
            style: "realistic",
        };
    } catch (err) {
        console.error("[CoverImage] DALL-E fallback failed:", err);
        return null;
    }
}
