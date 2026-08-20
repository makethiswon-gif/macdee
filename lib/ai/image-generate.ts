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
                model: "claude-haiku-4-5",
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
 * GPT Image 2로 카드뉴스 배경 이미지를 생성합니다.
 * Claude가 사건 내용을 분석하여 구체적 장면 프롬프트를 생성한 후
 * GPT Image 2가 최고 품질 이미지를 생성합니다. 폴백: Gemini → DALL-E 3
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
    // 랜덤 스타일 (50/50)
    const style: "webtoon" | "realistic" = Math.random() > 0.5 ? "webtoon" : "realistic";

    // Step 1: Claude가 사건 내용 분석 → 구체적 장면 프롬프트 생성
    const sceneDescription = await generateScenePromptWithClaude(caseType, hookText, context, style);

    const finalPrompt = style === "webtoon"
        ? `Create a single-panel Korean webtoon (만화) illustration based on this scene:\n\n${sceneDescription}\n\nStyle: Korean manhwa art style, clean lines, natural and restrained facial expressions (emotive but NOT exaggerated or over-dramatic), distinct Korean characters, consistent tasteful character design, square 1:1, high quality, soft even lighting. NO text/words/letters/numbers in the image.`
        : `Create a photorealistic editorial photograph based on this scene:\n\n${sceneDescription}\n\nStyle: clean editorial photography, DSLR shallow depth of field, square 1:1, high quality, BRIGHT natural mid-to-high-key lighting (not dark, not moody), airy and professional. Korean setting. NO text/words/letters/numbers in the image.`;

    // Step 2: GPT Image 2 이미지 생성 (주 엔진)
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        try {
            console.log(`[CoverImage] Generating GPT Image 2 ${style} image`);
            const res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-image-2",
                    prompt: finalPrompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "high",
                    output_format: "png",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.data?.[0]?.b64_json) {
                    console.log(`[CoverImage] GPT Image 2 ${style} image generated successfully`);
                    return { imageBase64: data.data[0].b64_json, revisedPrompt: finalPrompt, style };
                }
            } else {
                const err = await res.text();
                console.error(`[CoverImage] GPT Image 2 error: ${res.status}`, err);
            }
        } catch (err) {
            console.error("[CoverImage] GPT Image 2 failed:", err);
        }
    }

    // Step 3: Imagen 4.0 폴백 (webtoon-generate.ts와 동일한 predict 엔드포인트)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        try {
            console.log(`[CoverImage] Trying Imagen 4.0 ${style} fallback`);
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${geminiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        instances: [{ prompt: finalPrompt }],
                        parameters: { sampleCount: 1, aspectRatio: "1:1" },
                    }),
                }
            );

            if (res.ok) {
                const data = await res.json();
                const b64 = data.predictions?.[0]?.bytesBase64Encoded;
                if (b64) {
                    console.log(`[CoverImage] Imagen 4.0 ${style} fallback succeeded`);
                    return { imageBase64: b64, revisedPrompt: finalPrompt, style };
                }
            } else {
                console.error(`[CoverImage] Imagen 4.0 error (${res.status}):`, await res.text());
            }
        } catch (err) {
            console.error("[CoverImage] Imagen 4.0 fallback failed:", err);
        }
    }

    // Step 4: DALL-E 3 최종 폴백
    return await generateCoverImageDallE(caseType, hookText);
}

// ─── 블로그 카드용 콘텐츠 이미지 생성 ───
// 블로그 본문을 분석하여 글 주제에 맞는 시네마틱 사진 또는 한국 웹툰 1컷을 생성.
// 텍스트는 이미지에 넣지 않고 HTML이 오버레이.

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function generateBlogScenePromptWithClaude(
    blogContent: string,
    title: string,
    style: "realistic" | "webtoon",
): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const fallback = style === "webtoon"
        ? `Korean webtoon (manhwa) panel illustration depicting a Korean legal scene related to: "${title || "legal consultation"}". Dramatic expressions, clean bold lines, dramatic lighting, Korean characters. NO text, NO letters, NO speech bubbles, NO words. Square 1:1, ultra high quality.`
        : `Cinematic K-drama photograph depicting a Korean legal scene related to: "${title || "legal consultation"}". DSLR bokeh, dramatic chiaroscuro lighting, Korean setting, professional film still aesthetic. NO text, NO letters, NO documents with readable writing. Square 1:1, ultra high quality.`;

    if (!apiKey) return fallback;

    const systemPrompt = `You are an art director translating Korean legal blog content into a single dramatic ${style === "webtoon" ? "Korean webtoon panel" : "cinematic K-drama photograph"}.

[YOUR JOB]
Read the Korean blog content and produce ONE English image-generation prompt that captures the heart of the case in a single visual scene.

[REQUIREMENTS]
- ${style === "webtoon"
        ? "Style: Korean manhwa (webtoon) — clean bold linework, dramatic expressions, distinctly Korean characters, manhwa color palette and shading"
        : "Style: Cinematic K-drama still photograph — DSLR shallow depth of field, dramatic chiaroscuro lighting, editorial film aesthetic, distinctly Korean setting"}
- Depict ONE specific scene that conveys the legal situation viscerally (e.g., divorce → tense couple at dining table; fraud → suspicious documents and hand passing money; assault case → courtroom moment)
- Korean people, Korean settings, Korean architecture/clothing where relevant
- Strong emotional tone matching the case gravity
- Square 1:1 composition with clear focal point

[STRICTLY FORBIDDEN]
- NO text, NO letters, NO numbers, NO speech bubbles, NO words, NO readable signs or documents (text will be overlaid via HTML)
- NO Western settings or non-Korean characters
- NO recognizable real people (no real faces)
- NO graphic violence, NO blood

Output ONLY the English image prompt. No explanation, no quotes, no markdown.`;

    const userMsg = title
        ? `Title: ${title}\n\nContent:\n${blogContent.substring(0, 1500)}`
        : blogContent.substring(0, 1500);

    try {
        const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 400,
                system: systemPrompt,
                messages: [{ role: "user", content: userMsg }],
            }),
        }, 6000);

        if (!res.ok) {
            console.error("[BlogContentImg] Claude scene gen failed:", await res.text());
            return fallback;
        }

        const data = await res.json();
        const prompt = data.content?.[0]?.text?.trim() || "";
        return prompt || fallback;
    } catch (err) {
        console.error("[BlogContentImg] Claude scene gen error/timeout:", err instanceof Error ? err.message : err);
        return fallback;
    }
}

/**
 * 블로그 카드용 콘텐츠 이미지 생성 (Replicate Flux 1.1 Pro).
 * style="realistic": 시네마틱 K-드라마 스틸컷 (메인 썸네일용)
 * style="webtoon": 한국 웹툰 1컷 (일러스트 카드용)
 */
export async function generateBlogContentImage(
    blogContent: string,
    title: string,
    style: "realistic" | "webtoon",
): Promise<{ imageBase64: string }> {
    const scenePrompt = await generateBlogScenePromptWithClaude(blogContent, title, style);
    const finalPrompt = `${scenePrompt} ABSOLUTE RULE: zero text, zero letters, zero numbers, zero speech bubbles anywhere in the image.`;

    console.log(`[BlogContentImg] ${style} prompt: ${scenePrompt.substring(0, 120)}...`);

    const replicateKey = process.env.REPLICATE_API_TOKEN;
    if (!replicateKey) {
        throw new Error("REPLICATE_API_TOKEN not configured");
    }

    // Replicate에 예측 요청 (Prefer: wait=60 으로 동기 응답)
    // 429 대응: 썸네일·상황이미지 카드가 동시에 요청되는데, Replicate 잔액이 $5 미만이면
    // burst 한도가 1로 떨어져 둘 중 하나가 반드시 throttle된다. 서버가 준 retry_after만큼
    // 기다렸다 재시도한다. (429는 즉시 돌아오므로 maxDuration 90초 안에 들어온다)
    const deadline = Date.now() + 78000;
    let createRes!: Response;
    let lastErrText = "";

    const MAX_ATTEMPTS = 3;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        createRes = await fetchWithTimeout("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${replicateKey}`,
                "Prefer": "wait=60",
            },
            body: JSON.stringify({
                input: {
                    prompt: finalPrompt,
                    width: 1024,
                    height: 1024,
                    output_format: "png",
                    output_quality: 95,
                    safety_tolerance: 2,
                    prompt_upsampling: true,
                },
            }),
        }, Math.max(5000, Math.min(70000, deadline - Date.now())));

        if (createRes.ok) break;

        lastErrText = await createRes.text();
        if (createRes.status !== 429) break;
        if (attempt === MAX_ATTEMPTS - 1) break; // 마지막 시도 뒤에는 기다리지 않는다

        // {"retry_after":10} 형태. 파싱 실패 시 5초.
        let retryAfterSec = 5;
        try {
            const parsed = JSON.parse(lastErrText) as { retry_after?: number };
            if (typeof parsed.retry_after === "number") retryAfterSec = parsed.retry_after;
        } catch { /* 기본값 사용 */ }
        const waitMs = Math.min(retryAfterSec * 1000 + 500, 15000);

        // 재시도해도 시간이 모자라면 포기 (빈손보다 명확한 에러가 낫다)
        if (Date.now() + waitMs + 15000 > deadline) break;

        console.warn(`[BlogContentImg] Replicate 429 (${style}) — ${waitMs}ms 후 재시도 ${attempt + 1}/${MAX_ATTEMPTS - 1}`);
        await new Promise((r) => setTimeout(r, waitMs));
    }

    if (!createRes.ok) {
        if (createRes.status === 429 && lastErrText.includes("$5.0 in credit")) {
            throw new Error("Replicate 크레딧이 $5 미만이라 이미지 생성 속도 제한(분당 6건·동시 1건)에 걸렸습니다. Replicate 크레딧을 충전해주세요.");
        }
        throw new Error(`Replicate HTTP ${createRes.status}: ${lastErrText.substring(0, 300)}`);
    }

    const prediction = await createRes.json();

    // wait=60 으로 동기 응답을 받았지만 아직 processing 중일 경우 폴링
    let output = prediction.output;
    if (!output && prediction.status !== "failed") {
        const predId = prediction.id;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
                headers: { "Authorization": `Token ${replicateKey}` },
            });
            if (!pollRes.ok) break;
            const poll = await pollRes.json();
            if (poll.status === "succeeded") { output = poll.output; break; }
            if (poll.status === "failed") throw new Error(`Replicate failed: ${poll.error}`);
        }
    }

    if (prediction.status === "failed") {
        throw new Error(`Replicate failed: ${prediction.error}`);
    }

    // output은 이미지 URL (배열 또는 문자열)
    const imageUrl: string = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) {
        throw new Error("Replicate returned no output URL");
    }

    console.log(`[BlogContentImg] Flux 2 Pro ${style} success`);

    // URL → base64 변환
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch image from Replicate CDN: ${imgRes.status}`);
    const buffer = await imgRes.arrayBuffer();
    const imageBase64 = Buffer.from(buffer).toString("base64");

    return { imageBase64 };
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
        console.warn("[CoverImage] OPENAI_API_KEY not set, skipping gpt-image-1-mini fallback");
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
                model: "gpt-image-1-mini",
                prompt,
                n: 1,
                size: "1024x1024",
                quality: "medium",
                output_format: "png",
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
        console.error("[CoverImage] gpt-image-1-mini fallback failed:", err);
        return null;
    }
}
