// ─── 업로드 내용 기반 Gemini(나노바나나) 이미지 생성 ───
// 1. Claude가 사건 요약을 분석하여 구체적 장면 프롬프트 생성
// 2. Gemini가 해당 프롬프트로 웹툰/사진 이미지 생성

/**
 * Claude로 사건 내용에 맞는 구체적인 이미지 장면을 설계합니다.
 * 예: 불륜 사건 → "결혼반지를 낀 남자와 젊은 여성이 카페에서 몰래 만나는 장면"
 */
async function generateScenePromptWithClaude(
    caseType: string,
    hookText: string,
    context?: {
        keyPoints?: string[];
        resultSummary?: string;
        maskedText?: string;
    },
    style: "webtoon" | "realistic" = "webtoon"
): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] No ANTHROPIC_API_KEY, using basic prompt");
        return buildFallbackPrompt(caseType, hookText, style);
    }

    const caseDetails = [
        context?.maskedText ? `사건 내용 요약: ${context.maskedText}` : "",
        context?.keyPoints?.length ? `핵심 쟁점: ${context.keyPoints.join(", ")}` : "",
        context?.resultSummary ? `결과: ${context.resultSummary}` : "",
        `사건 유형: ${caseType}`,
        `카드뉴스 훅: ${hookText}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `당신은 법률 사건을 시각적 장면으로 변환하는 아트 디렉터입니다.
주어진 법률 사건 내용을 분석하여, 그 사건의 핵심 장면을 한 컷 이미지로 표현할 구체적인 영어 프롬프트를 만들어주세요.

[중요 규칙]
- 등장인물의 구체적 외모/옷차림/표정/자세를 묘사하세요
- 장소(카페, 법정, 사무실, 아파트 등)를 구체적으로 설정하세요
- 감정과 분위기를 시각적으로 표현하세요 (표정, 조명, 날씨)
- 사건의 핵심 상황을 한 장면으로 압축하세요
- 실제 얼굴이나 실명은 절대 포함하지 마세요
- 텍스트/글자/숫자는 이미지에 포함하지 마세요
- 한국적 배경과 인물이어야 합니다 (한국 도시, 한국인 캐릭터)

[스타일: ${style === "webtoon" ? "한국 웹툰(만화) - 깔끔한 선화, 극적 구도, 감정 표현이 풍부한 만화 스타일" : "시네마틱 사실적 사진 - K-드라마 스틸컷 같은 고퀄리티 포토"}]

영어로 된 이미지 생성 프롬프트만 출력하세요. 다른 설명 없이 프롬프트만.`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 500,
                system: systemPrompt,
                messages: [{ role: "user", content: caseDetails }],
            }),
        });

        if (!res.ok) {
            console.error("[CoverImage] Claude scene prompt failed:", await res.text());
            return buildFallbackPrompt(caseType, hookText, style);
        }

        const data = await res.json();
        const scenePrompt = data.content?.[0]?.text?.trim() || "";

        if (!scenePrompt) return buildFallbackPrompt(caseType, hookText, style);

        console.log(`[CoverImage] Claude generated scene: ${scenePrompt.substring(0, 100)}...`);
        return scenePrompt;
    } catch (err) {
        console.error("[CoverImage] Claude scene generation error:", err);
        return buildFallbackPrompt(caseType, hookText, style);
    }
}

/**
 * Claude 실패 시 사용하는 기본 프롬프트
 */
function buildFallbackPrompt(caseType: string, hookText: string, style: "webtoon" | "realistic"): string {
    const SCENES: Record<string, { webtoon: string; realistic: string }> = {
        "이혼": {
            webtoon: "Korean webtoon panel: A married couple sitting at opposite ends of a dining table, the woman looking away with tears, the man staring at divorce papers, dim warm apartment lighting, emotional manhwa style",
            realistic: "Cinematic photo: Two wedding rings placed apart on a cracked wooden table, divorce papers between them, golden hour lighting through apartment window"
        },
        "불륜": {
            webtoon: "Korean webtoon panel: A married man nervously meeting a young woman at a hidden corner of a cafe, his wedding ring visible, a shadowy figure of his wife in the background, dramatic manhwa noir style",
            realistic: "Cinematic photo: A smartphone on a cafe table showing chat messages, a coffee cup and wedding ring beside it, shallow depth of field, moody lighting"
        },
        "상간": {
            webtoon: "Korean webtoon panel: A woman discovering her husband's affair, holding a phone with message evidence, shocked expression, split panel showing the husband with another woman, dramatic manhwa style",
            realistic: "Cinematic photo: A woman's hand holding a phone showing messages, tears reflected in the screen, dim bedroom lighting"
        },
        "사기": {
            webtoon: "Korean webtoon panel: A con artist in a suit handing fake investment documents to a trusting elderly person, dark shadows revealing the criminal nature, thriller manhwa style",
            realistic: "Cinematic photo: Fake documents and a pen on a desk, a shadowy figure's hand reaching for money, noir thriller lighting"
        },
        "폭행": {
            webtoon: "Korean webtoon panel: A courtroom scene with the defendant looking down and the victim's lawyer pointing accusingly, dramatic spotlight, justice manhwa style",
            realistic: "Cinematic photo: A judge's gavel coming down in a courtroom, dramatic spotlight, scales of justice in background"
        },
        "교통사고": {
            webtoon: "Korean webtoon panel: A rainy intersection at night, a car's headlights illuminating a pedestrian crosswalk, skid marks on the wet road, dramatic motion blur, manhwa style",
            realistic: "Cinematic photo: Rain-slicked city intersection at night, car headlights reflecting on wet asphalt, traffic signals glowing through raindrops"
        },
    };

    const defaultScene = {
        webtoon: `Korean webtoon panel: A confident Korean lawyer in a suit standing in a modern courtroom, dramatic lighting, legal documents in hand, cinematic manhwa style. Case theme: "${hookText}"`,
        realistic: `Cinematic photo: A modern Korean courtroom with warm golden light through tall windows, legal documents and gavel on desk. Case theme: "${hookText}"`
    };

    for (const [keyword, scenes] of Object.entries(SCENES)) {
        if (caseType.includes(keyword)) return scenes[style];
    }
    return defaultScene[style];
}

/**
 * Gemini(나노바나나)로 카드뉴스 배경 이미지를 생성합니다.
 * Claude가 사건 내용을 분석하여 구체적 장면 프롬프트를 생성한 후
 * Gemini가 해당 프롬프트로 이미지를 생성합니다.
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
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        console.warn("[CoverImage] GEMINI_API_KEY not set, trying DALL-E fallback");
        return await generateCoverImageDallE(caseType, hookText);
    }

    // 랜덤 스타일 (50/50)
    const style: "webtoon" | "realistic" = Math.random() > 0.5 ? "webtoon" : "realistic";

    // Step 1: Claude가 사건 내용 분석 → 구체적 장면 프롬프트 생성
    const sceneDescription = await generateScenePromptWithClaude(caseType, hookText, context, style);

    // Step 2: Gemini에 전달할 최종 프롬프트
    const finalPrompt = style === "webtoon"
        ? `Create a single-panel Korean webtoon (만화) illustration based on this scene:

${sceneDescription}

Style requirements:
- Korean manhwa art style with clean bold lines and dramatic expressions
- Characters should have distinct appearances and visible emotions
- Square aspect ratio (1:1), high quality
- Dark dramatic lighting with selective warm highlights
- NO text, NO words, NO letters, NO numbers anywhere in the image
- Characters should look Korean`

        : `Create a photorealistic cinematic photograph based on this scene:

${sceneDescription}

Style requirements:
- Editorial photography quality, like a still from a Korean drama (K-drama)
- High-end commercial photography, DSLR bokeh effect
- Square aspect ratio (1:1), high quality
- Dramatic lighting (chiaroscuro or golden hour)
- NO text, NO words, NO letters, NO numbers anywhere in the image
- Korean setting and atmosphere`;

    try {
        console.log(`[CoverImage] Generating Gemini ${style} image with Claude-designed scene`);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }],
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

        console.log(`[CoverImage] Gemini ${style} image generated with case-specific scene`);
        return {
            imageBase64: imagePart.inlineData.data,
            revisedPrompt: finalPrompt,
            style,
        };
    } catch (err) {
        console.error("[CoverImage] Gemini image generation failed:", err);
        return await generateCoverImageDallE(caseType, hookText);
    }
}

/**
 * DALL-E 3 폴백
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

    const scene = buildFallbackPrompt(caseType, hookText, "realistic");
    const prompt = `${scene}\nIMPORTANT: ZERO text, ZERO letters, ZERO words in the image. Square 1:1 ratio.`;

    try {
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

        if (!res.ok) return null;

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
