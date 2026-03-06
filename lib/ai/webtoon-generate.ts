// ─── 4컷 만화 생성 ───
// 1. Claude: 사건 분석 → 캐릭터 시트 + 4컷 시나리오 (텍스트 풍부)
// 2. GPT Image: 각 컷 이미지 생성 (캐릭터 시트 포함)

// ─── 그림체 프리셋 ───
export const WEBTOON_STYLES = {
    dramatic: {
        label: "극화 만화",
        description: "진지한 법정 드라마풍",
        prompt: "Korean modern webtoon style, professional legal drama, realistic character design, clean and sophisticated coloring, serious but not dark, detailed facial expressions, high quality manhwa",
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
    caption: string;
    hashtags: string[];
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

    const systemPrompt = `당신은 법률 사건을 4컷 만화 스토리보드로 변환하는 전문가입니다.

변호사가 보내준 사건 자료를 분석하여,
4컷 만화 시나리오를 JSON으로 출력하세요.

[핵심 규칙]
- 변호사가 직접 맡아 승소한 사건입니다.
- ⚠️ 개인정보 비식별화 필수: 인명은 절대 사용하지 마세요. 반드시 "A씨", "B씨", "의뢰인", "상대방" 등으로 대체하세요.
- 입력에 [이름] 또는 실명이 있더라도 출력에는 절대 포함하지 마세요.
- 4컷 기승전결 구조:
  1컷(기): 사건 발생, 의뢰인의 고민과 상황
  2컷(승): 변호사 등장, 상담 및 전략 수립
  3컷(전): 법정 대결, 위기 또는 반전
  4컷(결): 승소, 해결, 교훈

[narration 규칙 - 매우 중요]
- 각 컷의 narration은 3~4문장으로 풍부하게 작성하세요.
- 사건의 핵심 내용, 감정, 법적 쟁점을 상세히 서술하세요.
- 독자가 narration만 읽어도 사건의 흐름을 완전히 이해할 수 있어야 합니다.
- 실명은 절대 사용하지 마세요.

[캐릭터 시트 규칙]
- protagonist: 의뢰인 묘사 (나이대, 성별, 외모 특징, 복장)
- antagonist: 상대방 묘사 (있을 경우)
- lawyer: 변호사 묘사 (전문가답고 신뢰감 있게)
- setting: 주요 배경 장소

[인스타그램 아기글 규칙 - 매우 중요]
- caption: 인스타그램 게시글용 텍스트. 500자 이상.
  - 1인칭 변호사 시점 스토리텔링 형식으로 작성
  - 첫 줄: 강력한 훅 ("3천만원 위자료 승소, 어떻게 가능했을까요?")
  - 사건 요약 + 전략 + 결과를 이야기체로
  - 마지막: CTA ("비슷한 상황이라면 프로필 링크를 확인해주세요")
  - 실명 절대 금지

- hashtags: 사건 핵심 키워드 해시태그 10~15개
  - 사건 당사자가 검색할 키워드 중심
  - 예: #위자료소송 #불률소송 #상간소송 #이혼변호사 #속매장 #부정행위 #손해배상소송 #승소사례 #민사소송 #법률상담
  - #일반키워드는 최소한, 사건 특화 키워드 중심

[출력 - JSON만, 정확히 4컷]
{
  "character_sheet": {
    "protagonist": "30대 후반 여성, 단발 검은머리, 피곤한 표정, 캐주얼한 옷차림",
    "antagonist": "40대 남성, 짧은 머리, 양복",
    "lawyer": "50대 남성, 안경, 정장, 자신감 있는 미소",
    "setting": "법률 사무실, 법원"
  },
  "title": "숨겨진 증거로 뒤집다",
  "summary": "위자료 3천만원 승소 사건",
  "caption": "⚖️ 3천만원 위자료 승소, 어떻게 가능했을까요?\\n\\n의뢰인은 결혼 3년차에 배우자의 불정행위를 발견하셨습니다. SNS에서 상대방과의 사진이 버젯이 올라와 있었죠...\\n\\n저는 즈시 증거를 확보하고 법적 전략을 수립했습니다. SNS 사진, 메시지 기록, 목격자 진술 등을 체계적으로 정리하여 재판부에 제출했고, 결과적으로 법원은 상대방에게 3,000만원의 위자료를 지급하라는 판결을 내렸습니다.\\n\\n비슷한 상황으로 고민이시라면, 프로필 링크를 통해 상담을 신청해주세요.",
  "hashtags": ["#위자료소송", "#불률소송", "#상간소송", "#이혼변호사", "#승소사례", "#손해배상", "#민사소송", "#법률상담", "#배우자불률", "#불정행위"],
  "panels": [
    {
      "panel": 1,
      "scene": "밤, 한 여성이 남편의 휴대폰에서 SNS 메시지를 발견하고 충격받는 장면",
      "narration": "그날 밤, 세상이 무너졌다. 남편의 휴대폰에서 발견한 메시지들은 3년간의 결혼 생활이 거짓이었음을 말해주고 있었다.",
      "dialogue": "",
      "emotion": "충격"
    },
    ... (총 4컷만)
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
            model: "claude-3-5-sonnet-20240620",
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

    // 이스케이프 되지 않은 개행문자가 들어올 경우를 대비한 최소한의 전처리
    const sanitized = clean.replace(/(?<!\\)\n/g, '\\n').replace(/\\n/g, '\\n');
    // 실제로는 정규식으로 완벽히 쌍따옴표 안의 줄바꿈만 치환하기 어려우므로, 
    // Claude에게 완벽한 JSON을 기대하는 것이 최선입니다. (위의 프롬프트 수정으로 해결됨)

    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("[Webtoon Generate] JSON Parse Error. Raw text from Claude:", text);
        console.error("[Webtoon Generate] Cleaned text:", clean);
        throw e;
    }
}

// ─── Step 2: GPT Image 이미지 생성 (4컷 병렬) ───
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

    // Generate all 4 panels at once
    const allPanels = scenario.panels.slice(0, 4);

    const generatePanel = async (panel: WebtoonPanel, retries = 2): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        const prompt = `Create a single comic panel illustration.

Art style: ${stylePrompt}

${characterPrompt}

Panel ${panel.panel}/4 - "${panel.emotion}" mood:
Scene: ${panel.scene}

Requirements:
- Single panel, square 1:1 ratio
- No speech bubbles, no text, no words, no letters
- Clear emotional expression matching "${panel.emotion}"
- Cinematic composition with clear focal point
- Korean characters and setting
- Leave space at bottom for narration text overlay`;

        try {
            console.log(`[Webtoon] Generating panel ${panel.panel}/4...`);
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

    console.log(`[Webtoon] Generating all 4 panels...`);
    const results = await Promise.all(allPanels.map(p => generatePanel(p)));

    const successful = results.filter((r): r is { panelIndex: number; imageBase64: string } => r !== null);
    console.log(`[Webtoon] ${successful.length}/4 images generated successfully`);
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
    console.log(`[Webtoon] ${images.length}/4 images generated`);

    if (images.length === 0) {
        console.error("[Webtoon] No images were generated! Check OPENAI_API_KEY and API status.");
    }

    return { scenario, images, style };
}
