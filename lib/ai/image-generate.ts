// ─── DALL-E 3 Cover Image Generation for Card News ───

// 사건 유형별 시각적 메타포 매핑
const CASE_VISUAL_THEMES: Record<string, string> = {
    "이혼": "a broken family photo in a dimly lit room, scattered documents on a table, emotional atmosphere, cinematic lighting",
    "위자료": "legal documents and a wedding ring on a wooden desk, dramatic side lighting, melancholic mood",
    "불륜": "a cracked smartphone screen showing social media, dark moody atmosphere, film noir style",
    "사기": "a shattered mirror reflecting distorted faces, noir thriller aesthetic, high contrast",
    "폭행": "a gavel striking in a dark courtroom, dramatic spotlight, justice theme",
    "상속": "an old family home with light streaming through windows, nostalgic yet tense atmosphere",
    "부동산": "architectural blueprints overlapping with a gavel, urban skyline at dusk, professional tone",
    "노동": "an empty office desk with a termination letter, cold fluorescent lighting, corporate atmosphere",
    "교통사고": "a rainy intersection at night with car headlights, reflections on wet asphalt, dramatic atmosphere",
    "명예훼손": "broken words floating in dark space, digital screen fragments, cyberpunk atmosphere",
    "성범죄": "abstract scales of justice in shadow, minimal dark composition, solemn atmosphere",
    "채권": "stacked financial documents casting long shadows, dramatic chiaroscuro lighting",
};

const DEFAULT_VISUAL = "a dramatic courtroom scene with warm light streaming through high windows, legal documents on a desk, cinematic atmosphere";

function getVisualTheme(caseType: string): string {
    // 사건 유형에서 키워드 매칭
    for (const [keyword, theme] of Object.entries(CASE_VISUAL_THEMES)) {
        if (caseType.includes(keyword)) return theme;
    }
    return DEFAULT_VISUAL;
}

/**
 * DALL-E 3로 카드뉴스 첫 장 커버 이미지를 생성합니다.
 * 
 * @param caseType - 사건 유형 (이혼, 사기 등)
 * @param hookText - 카드1의 훅 텍스트 (이미지에 반영할 테마)
 * @returns base64 encoded image data 또는 null (실패 시)
 */
export async function generateCoverImage(
    caseType: string,
    hookText: string,
): Promise<{ imageBase64: string; revisedPrompt: string } | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] OPENAI_API_KEY not set, skipping image generation");
        return null;
    }

    const visualTheme = getVisualTheme(caseType);

    // DALL-E 프롬프트: 텍스트 없이 분위기만 전달하는 아트 스타일
    const prompt = `Create a cinematic, moody, editorial-quality image for a Korean legal story card news cover. 
Style: Dark, atmospheric, minimal, modern editorial design. NO text, NO words, NO letters in the image.
Scene: ${visualTheme}
Mood inspired by: "${hookText}"
Aspect ratio: square (1:1). 
Art direction: Think Vogue Korea meets legal drama. Sophisticated, premium feel. Deep shadows with selective warm lighting. Slight film grain. 
IMPORTANT: The image must contain ZERO text, ZERO letters, ZERO words, ZERO numbers.`;

    try {
        console.log(`[CoverImage] Generating image for case type: ${caseType}`);

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
        const imageBase64 = data.data[0].b64_json;
        const revisedPrompt = data.data[0].revised_prompt || prompt;

        console.log(`[CoverImage] Image generated successfully`);
        return { imageBase64, revisedPrompt };
    } catch (err) {
        console.error("[CoverImage] Image generation failed:", err);
        return null;
    }
}
