// ─── 8컷 웹툰 생성 ───
// 1. Claude: 사건 분석 → 캐릭터 시트 + 8컷 시나리오
// 2. GPT-4o: 각 컷 이미지 생성 (캐릭터 시트 포함)

// ─── 그림체 프리셋 ───
export const WEBTOON_STYLES = {
    dramatic: {
        label: "극화 만화",
        description: "진지한 법정 드라마풍",
        prompt: "Korean manhwa (만화) style, dramatic ink shading, detailed facial expressions, bold contrast, noir atmosphere",
    },
    soft: {
        label: "감성 일러스트",
        description: "부드럽고 따뜻한 느낌",
        prompt: "Soft pastel watercolor illustration style, warm tones, gentle expressions, dreamy atmosphere, clean lines",
    },
    cinematic: {
        label: "시네마틱",
        description: "실사 영화 스틸컷풍",
        prompt: "Cinematic photography still, K-drama quality, photorealistic, DSLR bokeh, dramatic lighting, Korean actors",
    },
    minimal: {
        label: "미니멀",
        description: "깔끔한 라인 아트",
        prompt: "Clean minimalist line art, simple flat colors, modern illustration, vector-like, minimal details",
    },
} as const;

export type WebtoonStyleKey = keyof typeof WEBTOON_STYLES;

export interface WebtoonPanel {
    panel: number;
    scene: string;
    narration: string;
    dialogue?: string;
    emotion: string;
}

export interface WebtoonScenario {
    character_sheet: {
        protagonist: string;
        antagonist?: string;
        lawyer: string;
        setting: string;
    };
    panels: WebtoonPanel[];
    title: string;
    summary: string;
}

export interface WebtoonResult {
    scenario: WebtoonScenario;
    images: { panelIndex: number; imageBase64: string }[];
    style: WebtoonStyleKey;
}

// ─── Step 1: Claude 시나리오 생성 ───
export async function generateWebtoonScenario(
    maskedText: string,
    caseType: string,
): Promise<WebtoonScenario> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const systemPrompt = `당신은 법률 사건을 8컷 웹툰 스토리보드로 변환하는 전문가입니다.

변호사가 보내준 사건 자료를 분석하여,
8컷 웹툰 시나리오를 JSON으로 출력하세요.

[핵심 규칙]
- 변호사가 직접 맡아 승소한 사건입니다.
- 개인정보는 이미 비식별화되어 있습니다.
- 각 컷은 기승전결 구조를 따르세요:
  1-2컷: 사건 발생/의뢰인의 고민
  3-4컷: 변호사 등장/상담/전략 수립
  5-6컷: 법적 쟁점/위기/갈등
  7컷: 반전/결정적 증거/법정 장면
  8컷: 승소/해결/교훈

[캐릭터 시트 규칙]
- protagonist: 의뢰인 묘사 (나이대, 성별, 외모 특징, 복장)
- antagonist: 상대방 묘사 (있을 경우)
- lawyer: 변호사 묘사 (전문가답고 신뢰감 있게)
- setting: 주요 배경 장소

[출력 - JSON만]
{
  "character_sheet": {
    "protagonist": "30대 후반 여성, 단발 검은머리, 피곤한 표정, 캐주얼한 옷차림",
    "antagonist": "40대 남성, 짧은 머리, 양복",
    "lawyer": "50대 남성, 안경, 정장, 자신감 있는 미소",
    "setting": "법률 사무실, 법원"
  },
  "title": "숨겨진 증거로 뒤집다",
  "summary": "위자료 3천만원 승소 사건",
  "panels": [
    {
      "panel": 1,
      "scene": "밤, 한 여성이 남편의 휴대폰에서 SNS 메시지를 발견하고 충격받는 장면",
      "narration": "그날 밤, 세상이 무너졌다.",
      "dialogue": "",
      "emotion": "충격"
    },
    ... (8컷)
  ]
}

JSON만 출력하세요. 코드 블록 없이.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            temperature: 0.8,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: `사건 유형: ${caseType}\n\n사건 자료:\n${maskedText.substring(0, 3000)}`,
            }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude scenario error: ${res.status} ${err}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/^```json?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();
    return JSON.parse(clean);
}

// ─── Step 2: GPT-4o 이미지 생성 (8컷 병렬) ───
export async function generateWebtoonImages(
    scenario: WebtoonScenario,
    style: WebtoonStyleKey = "dramatic",
    profileImageUrl?: string,
): Promise<{ panelIndex: number; imageBase64: string }[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const stylePrompt = WEBTOON_STYLES[style]?.prompt || WEBTOON_STYLES.dramatic.prompt;
    const charSheet = scenario.character_sheet;

    // Build character consistency prompt
    const characterPrompt = `IMPORTANT - Use these EXACT same characters in EVERY panel:
- Main character (의뢰인): ${charSheet.protagonist}
- Lawyer (변호사): ${charSheet.lawyer}
${charSheet.antagonist ? `- Opponent (상대방): ${charSheet.antagonist}` : ""}
Setting: ${charSheet.setting}
${profileImageUrl ? `
REFERENCE: The lawyer character should resemble the person in this photo: ${profileImageUrl}` : ""}`;

    // Generate panels - 4 at a time to avoid rate limits
    const batch1 = scenario.panels.slice(0, 4);
    const batch2 = scenario.panels.slice(4, 8);

    const generatePanel = async (panel: WebtoonPanel, retries = 2): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        const prompt = `Create a single comic panel illustration.

Art style: ${stylePrompt}

${characterPrompt}

Panel ${panel.panel}/8 - "${panel.emotion}" mood:
Scene: ${panel.scene}

Requirements:
- Single panel, square 1:1 ratio
- No speech bubbles, no text, no words, no letters
- Clear emotional expression matching "${panel.emotion}"
- Cinematic composition with clear focal point
- Korean characters and setting
- Leave space at bottom for narration text overlay`;

        try {
            console.log(`[Webtoon] Generating panel ${panel.panel}/8...`);
            const res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
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

            if (!res.ok) {
                const err = await res.text();
                console.error(`[Webtoon] Panel ${panel.panel} error (${res.status}):`, err);
                return null;
            }

            const data = await res.json();
            const b64 = data.data?.[0]?.b64_json;
            if (b64) {
                console.log(`[Webtoon] Panel ${panel.panel} generated (b64_json)`);
                return { panelIndex: panel.panel, imageBase64: b64 };
            }
            console.error(`[Webtoon] Panel ${panel.panel}: no b64_json in response, keys:`, Object.keys(data.data?.[0] || {}));
            return null;
        } catch (err) {
            console.error(`[Webtoon] Panel ${panel.panel} failed:`, err);
            if (retries > 0) {
                console.log(`[Webtoon] Retrying panel ${panel.panel}... (${retries} left)`);
                await new Promise(r => setTimeout(r, 2000));
                return generatePanel(panel, retries - 1);
            }
            return null;
        }
    };

    console.log(`[Webtoon] Generating batch 1 (panels 1-4)...`);
    const results1 = await Promise.all(batch1.map(p => generatePanel(p)));

    console.log(`[Webtoon] Generating batch 2 (panels 5-8)...`);
    const results2 = await Promise.all(batch2.map(p => generatePanel(p)));

    const results = [...results1, ...results2];
    const successful = results.filter((r): r is { panelIndex: number; imageBase64: string } => r !== null);
    console.log(`[Webtoon] ${successful.length}/${scenario.panels.length} images generated successfully`);
    return successful;
}

// ─── Full pipeline ───
export async function generateWebtoon(
    maskedText: string,
    caseType: string,
    style: WebtoonStyleKey = "dramatic",
    profileImageUrl?: string,
): Promise<WebtoonResult> {
    console.log(`[Webtoon] Starting generation: style=${style}, caseType=${caseType}, hasProfile=${!!profileImageUrl}`);

    // Step 1: Scenario
    const scenario = await generateWebtoonScenario(maskedText, caseType);
    console.log(`[Webtoon] Scenario generated: ${scenario.panels.length} panels, title="${scenario.title}"`);

    // Step 2: Images (batched parallel)
    const images = await generateWebtoonImages(scenario, style, profileImageUrl);
    console.log(`[Webtoon] ${images.length}/8 images generated`);

    if (images.length === 0) {
        console.error("[Webtoon] No images were generated! Check OPENAI_API_KEY and API status.");
    }

    return { scenario, images, style };
}
