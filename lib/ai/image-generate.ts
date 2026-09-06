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
): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.warn("[CoverImage] No ANTHROPIC_API_KEY, using basic prompt");
        return buildFallbackPrompt(caseType, hookText);
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

[사람을 넣지 마세요 — 가장 중요]
얼굴·손·전신 전부 금지입니다. 생성된 인물은 아무리 잘 나와도 만든 티가 납니다.
사람 대신 그가 남긴 흔적을 담으세요. 비어 있는 의자, 두 개의 컵, 벗어둔 안전모.

[한국 법조계에 없는 물건 금지]
법봉(gavel), 정의의 여신상, 저울 — 전부 미국 드라마 소품입니다.
한국 법정에는 없습니다. 변호사가 보면 즉시 가짜라고 판단합니다.

[대신 이런 것]
사건에서 실제로 오가는 물건 — 합의서, 진단서, 내용증명 봉투, 블랙박스 메모리카드,
임대차계약서, 거래내역서, 견적서, 출입기록, 공사 자재, 등기부등본.
또는 사건이 벌어진 빈 공간 — 아무도 없는 사무실, 주차장, 공사장, 복도.

[촬영]
- 자연광. 극적인 조명·역광·황금시간 금지
- 정면 또는 45도 탑다운. 얕은 심도 금지 — 전체가 또렷하게
- 배경은 단순하게. 한국의 실제 사무실·주거 환경
- 글자·숫자는 이미지에 넣지 마세요

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
            return buildFallbackPrompt(caseType, hookText);
        }

        const data = await res.json();
        const scenePrompt = data.content?.[0]?.text?.trim() || "";

        if (!scenePrompt) return buildFallbackPrompt(caseType, hookText);

        console.log(`[CoverImage] Claude generated scene: ${scenePrompt.substring(0, 100)}...`);
        return scenePrompt;
    } catch (err) {
        console.error("[CoverImage] Claude scene generation error:", err);
        return buildFallbackPrompt(caseType, hookText);
    }
}

/**
 * Claude 실패 시 사용하는 기본 프롬프트
 */
function buildFallbackPrompt(caseType: string, hookText: string): string {
    // Claude 호출이 실패했을 때만 쓰는 폴백.
    //
    // 이전 폴백에는 법봉·정의의 저울·법정·찢어진 결혼반지·비 오는 교차로가
    // 하드코딩돼 있었다. 한국 법정에 법봉과 저울은 없다 — 미국 드라마 소품이다.
    // 변호사가 보면 바로 가짜라고 판단하는 요소라 전부 뺐다.
    //
    // 지금은 사건에서 실제로 오가는 서류와 사물만 쓴다. 사람은 넣지 않는다.
    const SCENES: Record<string, string> = {
        이혼: "Two sets of house keys and a folded family register document on a plain wooden table, morning daylight from a window, no people",
        상간: "A closed notebook, a single coffee cup and a smartphone face down on a cafe table, even indoor light, no people",
        형사: "A sealed certified-mail envelope and a plain manila case folder on a grey desk, flat daylight, no people",
        사기: "A stack of contract papers, a pen and a bank passbook arranged on an office desk, even overhead light, no people",
        교통사고: "A dashcam memory card, car key and a vehicle repair estimate laid on a workshop counter, diffused daylight, no people",
        의료: "A clipboard with a blank medical chart and a stethoscope on a clinic desk, soft daylight through blinds, no people",
        노무: "A hard hat resting on a folded work uniform beside a time-attendance sheet, plain daylight, no people",
        부동산: "A lease agreement, apartment keys and a property register document on a plain desk, even daylight, no people",
    };

    const key = Object.keys(SCENES).find((k) => caseType.includes(k) || hookText.includes(k));
    const scene = key
        ? SCENES[key]
        : "A plain manila document folder, a pen and a closed notebook on an uncluttered office desk, even daylight, no people";

    return `Photograph this scene: ${scene}. Style: plain documentary still life, everything in focus, no bokeh, no dramatic lighting, muted natural colors, Korean office setting. STRICT: no people, no faces, no hands. No gavel, no scales of justice, no courtroom. No readable text or numbers.`;
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

    // 스타일 분기를 없앴다.
    // 전에는 Math.random() 으로 웹툰/사진을 매번 뒤집었다. 같은 블로그에
    // 두 스타일이 번갈아 나오면 사람이 고른 게 아니라는 신호가 된다.
    // 지금은 한 종류 — 사물과 공간을 담는 자료사진만 만든다.
    // 반환값의 style 필드는 호출부가 기록용으로 쓰므로 라벨만 남긴다.
    const style = "documentary";

    // Step 1: Claude가 사건 내용 분석 → 구체적 장면 프롬프트 생성
    const sceneDescription = await generateScenePromptWithClaude(caseType, hookText, context);

    // "cinematic" "dramatic lighting" "shallow depth of field" 를 전부 뺐다.
    // 이 셋이 겹치면 무엇을 찍든 생성 이미지처럼 보인다.
    // 지향점은 광고 사진이 아니라 자료 사진이다.
    const finalPrompt =
        `Photograph this scene:\n\n${sceneDescription}\n\n` +
        "Style: plain documentary still life. Even diffused daylight, no dramatic or directional lighting. " +
        "Everything in focus - no shallow depth of field, no bokeh. Straight-on or 45-degree top-down angle. " +
        "Muted natural colors, uncluttered background. Korean office or domestic setting. " +
        "STRICT: no people, no faces, no hands, no body parts. No gavel, no scales of justice, no courtroom. " +
        "No readable text, letters, or numbers anywhere. No logos.";

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
): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    // 사람도 극적 연출도 쓰지 않는다.
    //
    // 이전 프롬프트는 "single dramatic", "tense couple at dining table",
    // "hand passing money", "courtroom moment", "dramatic chiaroscuro lighting"
    // 를 지시했다. 이 조합이 곧 "AI 이미지"의 정의다.
    // 사람 얼굴과 손은 생성 흔적이 가장 잘 드러나는 부위이기도 하다.
    //
    // 지향점을 광고 스틸에서 자료 사진으로 바꿨다. 사건에 실제로 존재하는
    // 서류와 사물, 사람이 빠져나간 공간만 담는다.
    const NO = "STRICT: no people, no faces, no hands, no body parts. "
        + "No gavel, no scales of justice, no courtroom, no judge. "
        + "No readable text, letters or numbers. No logos. "
        + "No dramatic lighting, no bokeh, no shallow depth of field.";

    const LOOK = "Style: plain documentary still life. Even diffused daylight. Everything in focus. "
        + "Straight-on or 45-degree top-down angle. Muted natural colors, uncluttered background. "
        + "Korean office or domestic setting. Square 1:1.";

    const fallback = `Photograph a plain manila document folder, a pen and a closed notebook on an uncluttered desk. ${LOOK} ${NO}`;

    if (!apiKey) return fallback;

    const systemPrompt = `You are a photo editor for Korean legal blog articles.
Read the article and choose ONE still-life or empty-space photograph that belongs with it.
Then write a single English image-generation prompt for it.

[NO PEOPLE — most important]
No faces, no hands, no bodies. Generated people always look generated.
Photograph what a person left behind instead: an empty chair, two cups, a hard hat set down.

[NOT IN KOREAN LAW]
Never use a gavel, scales of justice, a blindfolded statue, or a courtroom bench.
Korean courts do not use gavels. These are American TV props and Korean lawyers spot them instantly.

[USE INSTEAD]
Objects that actually change hands in the case — settlement agreement, medical certificate,
certified-mail envelope, dashcam memory card, lease contract, bank statement, repair estimate,
entry log, construction material, property register.
Or the emptied space where it happened — an office after hours, a parking garage, a clinic corridor.

[HOW IT IS SHOT]
${LOOK}
It should look like a reference photograph, not an advertisement.

[STRICT]
${NO}

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
): Promise<{ imageBase64: string }> {
    const scenePrompt = await generateBlogScenePromptWithClaude(blogContent, title);
    const finalPrompt = `${scenePrompt} ABSOLUTE RULE: zero text, zero letters, zero numbers, zero speech bubbles anywhere in the image.`;

    console.log(`[BlogContentImg] prompt: ${scenePrompt.substring(0, 120)}...`);

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

        console.warn(`[BlogContentImg] Replicate 429 — ${waitMs}ms 후 재시도 ${attempt + 1}/${MAX_ATTEMPTS - 1}`);
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

    console.log("[BlogContentImg] Flux 2 Pro success");

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

    const scene = buildFallbackPrompt(caseType, hookText);
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
