// ─── 6컷 웹툰 생성 ───
// 1. Claude: 사건 분석 → 캐릭터 시트 + 6컷 감정몰입 시나리오
// 2. GPT Image: 각 컷 이미지 생성

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
        description: "일상툰 스타일",
        prompt: "Korean daily-life webtoon style, simple round cute character designs with big heads and small bodies, monochrome pen-and-ink line art with halftone dot shading, expressive minimal faces, hand-drawn casual feel, warm and humorous mood, comic panel layout, similar to Korean slice-of-life manhwa cartoonist style, black and white only",
    },
} as const;

export type WebtoonStyleKey = keyof typeof WEBTOON_STYLES;

export interface WebtoonPanel {
    panel: number;
    scene: string;
    narration: string;
    dialogue?: string;
    emotion: string;
    role: "hook" | "situation" | "shock" | "excuse" | "reversal" | "verdict";
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

// ─── Step 1: Claude 시나리오 생성 (6컷 감정몰입 구조) ───
export async function generateWebtoonScenario(
    maskedText: string,
    caseType: string,
    lawyerRole: string = "auto",
): Promise<WebtoonScenario> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    // 변호사 역할에 따른 시점 안내
    let roleInstruction = "";
    if (lawyerRole === "victim") {
        roleInstruction = `
[변호사 시점 — 매우 중요!!!]
- 이 사건에서 변호사는 **피해자/원고** 측을 대리했습니다.
- 의뢰인 = 피해자/원고입니다. 의뢰인의 입장에서 공감하며 스토리를 구성하세요.
- 상대방(가해자/피고인)이 어떤 억지를 부렸는지, 의뢰인이 어떤 피해를 입었는지 중심으로.
- 변호사는 피해자의 권리를 지켜주는 역할로 묘사하세요.`;
    } else if (lawyerRole === "defendant") {
        roleInstruction = `
[변호사 시점 — 매우 중요!!!]
- 이 사건에서 변호사는 **피고인/가해자** 측을 변호했습니다.
- 의뢰인 = 피고인/피의자입니다. 의뢰인의 입장에서 억울함이나 사정을 풀어주세요.
- 혐의가 과도하다거나, 사실관계가 다르다거나, 양형이 줄어든 성과를 중심으로.
- 변호사는 의뢰인의 정당한 권리를 보호하는 역할로 묘사하세요.
- 절대 피해자 입장에서 스토리를 만들지 마세요.`;
    } else {
        roleInstruction = `
[변호사 시점 — 자동 판별]
- 사건 자료를 분석하여 변호사가 어느 쪽을 대리했는지 스스로 판단하세요.
- 판결문에 "변호인"으로 기재되어 있으면 → 피고인/가해자 측 변호사입니다.
- "고소대리인" 또는 "피해자 대리인"으로 기재되어 있으면 → 피해자 측 변호사입니다.
- 판단한 역할에 맞는 시점으로 스토리를 구성하세요.`;
    }

    const systemPrompt = `당신은 법률 사건을 SNS 바이럴 웹툰 스토리보드로 변환하는 전문가입니다.

변호사가 보내준 사건 자료를 분석하여,
6컷 감정몰입형 웹툰 시나리오를 JSON으로 출력하세요.
${roleInstruction}

[최우선 원칙]
- 웹툰은 "읽는 콘텐츠"가 아니라 "보면서 이해하는 콘텐츠"입니다.
- 한 컷당 narration은 3~5문장. 독자가 상황과 감정을 충분히 이해할 수 있게.
- 너무 짧으면 무슨 얘긴지 모릅니다. 적절히 풀어서 써야 합니다.
- 설명문보다 대사체, 감정체를 우선 사용하세요.
- "~했습니다" 반복 금지. 종결 어미를 다양하게 섞으세요.
- 독자가 읽고 감정이입되도록 만드세요.

[개인정보 비식별화 필수]
- 인명은 절대 사용 금지. "A씨", "의뢰인", "상대방" 등으로 대체.

[6컷 감정몰입 구조 — 반드시 이 순서로]

1컷 (hook / 훅): 무조건 멈추게 만드는 문장
- 여기서 승부 납니다. 평범하면 끝입니다.
- 상황 설명 절대 금지. 궁금증만 던지세요.
- 예시: "남편 바람… 참았는데, 더 충격적인 걸 봤습니다."
- 예시: "이혼 소송에서 진짜 자주 나오는 말입니다."
- narration: 강렬한 훅 1~2문장. 궁금증을 폭발시키세요.

2컷 (situation / 상황 이해): 관계와 배신 상황
- 처음으로 상황을 풀어줍니다.
- 감정 위주로 쓰되, 상황과 관계가 충분히 이해될 정도로 설명.
- 예시: "남편이 바람을 피웠습니다. 처음 알았을 때 그만 만나겠다는 말을 믿었죠. 그 말에 참고 또 참았습니다. 아이들도 있고, 가정을 지키고 싶었으니까요."
- narration: 상황을 대사체로 3~5문장. 독자가 '아, 이런 상황이구나' 이해할 수 있게.

3컷 (shock / 2차 충격): 감정 폭발 포인트
- 여기가 핵심. 독자가 확 몰입하는 지점.
- 예시: "그런데 어느 날 SNS를 보다가 알게 됐습니다. 둘은 계속 만나고 있었습니다. 심지어 사진까지 올리고 있었죠. '그만 만나겠다'는 말이 거짓이었던 겁니다."
- narration: 충격적 사실 3~5문장. 독자의 감정이 폭발하게.

4컷 (excuse / 상대방의 변명): 현실감 부여
- 상대방의 뻔한 변명을 대사로 표현.
- 법률 용어 금지. 일반인 말투로.
- 예시 dialogue: "우리 이미 끝난 사이 아니에요?"
- 예시 dialogue: "저는 피해자입니다."
- narration: 상대방이 어떤 태도를 보이는지 2~3문장으로 설명
- dialogue: 상대방 대사 (필수)

5컷 (reversal / 반전): 결정적 사실
- 법률 콘텐츠의 핵심. "아 이건 걸린다"는 느낌.
- 예시: "기혼자인 걸 알면서 시작한 관계였습니다. 가족 행사 일정까지 알고 있었고, 그러면서도 관계를 이어갔죠."
- 예시: "관계 정리를 요구받고도 계속 만났고, SNS까지 올렸습니다. 증거는 충분했습니다."
- narration: 결정적 반전 2~4문장. 법적 근거가 될 사실을 풀어서.

6컷 (verdict / 판결): 결론은 짧고 강하게
- 판결 결과 + 한 줄 정리
- 예시: "법원, 위자료 3천만 원 인정"
- 그리고 한 줄: "혼인 파탄의 원인이 아니어도 책임은 인정됩니다."
- narration: 판결 결과 + 의미 2~3문장
- dialogue: 교훈 한 문장

[narration 규칙 — 절대 지키세요]
- 각 컷의 narration은 3~5문장 (훅 컷은 1~2문장 OK).
- 독자가 상황, 감정, 맥락을 충분히 이해할 수 있도록 풀어 쓰세요.
- 너무 요약하면 스토리가 전달되지 않습니다. 적당히 길어도 괜찮습니다.
- 대사체/감탄체/의문체를 우선 사용하세요.
- "~했습니다" 반복 금지. 종결 어미를 다양하게.
- 나쁜 예: "의뢰인이 충격을 받았습니다." ← 너무 짧아서 무슨 상황인지 모름
- 좋은 예: "남편이 바람 피운 걸 처음 알았을 때, 그만 만나겠다는 말을 믿었습니다. 그 말에 참고 또 참았죠. 아이들 앞에서 웃으려 애썼고, 이 가정만은 지키고 싶었습니다."

[dialogue 규칙]
- 4컷(변명)에는 dialogue 필수.
- 법률 용어를 일반인 대사로 변환.
- 나쁜 예: "혼인관계가 이미 파탄 상태였다"
- 좋은 예: "이미 우리 끝난 거 아니야?"

[캐릭터 시트 규칙]
- protagonist: 의뢰인 묘사 (나이대, 성별, 외모 특징, 복장)
- antagonist: 상대방 묘사 (있을 경우)
- lawyer: 변호사 묘사 (전문가답고 신뢰감 있게)
- setting: 주요 배경 장소

[인스타그램 캡션 규칙]
- caption: 인스타그램 게시글용 텍스트. 500자 이상.
  - 1인칭 변호사 시점 스토리텔링
  - 첫 줄: 강력한 훅
  - 사건 요약 + 전략 + 결과를 이야기체로
  - 마지막: CTA
  - 실명 절대 금지

[hashtags 규칙 — 매우 중요!!! 반드시 지키세요!!!]
- 반드시 13~20개 생성. 13개 미만 절대 금지.
- # 기호 넣지 마세요 (프론트에서 붙임).
- ❌ 금지: "법률상담", "변호사", "승소사례", "법률사무소" 같은 제네릭 키워드만 출력
- ✅ 필수: 이 사건에서만 나올 수 있는 구체적 키워드 위주.
- 사건 당사자가 인스타그램/네이버에서 실제로 검색할 키워드 중심.
- 사건 내용에서 추출한 특화 키워드가 전체의 80% 이상이어야 합니다.
- 제네릭 키워드는 최대 2~3개까지만 허용.

예시 (상간/위자료 사건):
["상간소송", "위자료3천만원", "불륜위자료", "배우자외도", "SNS증거", "이혼소송", "부정행위손해배상", "상간녀소송", "혼인파탄", "위자료청구", "불륜소송결과", "이혼변호사", "가사소송승소", "외도증거수집", "상간자위자료"]

예시 (사기 사건):
["사기죄성립요건", "투자사기피해", "사기고소방법", "형사고소", "사기무죄판결", "불기소처분", "사기피해구제", "형사전문변호사", "고소장작성", "사기죄판례", "투자금반환", "민사소송병행", "피해자구제"]

예시 (교통사고 사건):
["교통사고합의금", "음주운전사고", "보험금청구", "과실비율", "교통사고전문변호사", "합의금산정", "후유장해", "자동차보험분쟁", "교통사고손해배상", "인신사고", "뺑소니신고", "운전자과실", "교통사고판례"]

[출력 — JSON만, 정확히 6컷]
{
  "character_sheet": {
    "protagonist": "30대 후반 여성, 단발 검은머리, 피곤한 표정, 캐주얼한 옷차림",
    "antagonist": "40대 남성, 짧은 머리, 양복",
    "lawyer": "50대 남성, 안경, 정장, 자신감 있는 미소",
    "setting": "카페, 법원"
  },
  "title": "참았는데, 더 충격적인 걸 봤습니다",
  "summary": "위자료 3천만원 승소 사건",
  "caption": "⚖️ 3천만원 위자료 승소, 어떻게 가능했을까요?...(500자 이상)",
  "hashtags": ["상간소송", "위자료3천만원", "불륜위자료", "배우자외도", "SNS증거", "이혼소송", "부정행위손해배상", "상간녀소송", "혼인파탄", "위자료청구", "불륜소송결과", "이혼변호사", "가사소송승소"],
  "panels": [
    {
      "panel": 1,
      "role": "hook",
      "scene": "어두운 방, 여성이 휴대폰 화면을 응시하는 클로즈업, 푸른 빛만 비치는 얼굴",
      "narration": "남편 바람… 참았는데, 더 충격적인 걸 봤습니다.",
      "emotion": "충격"
    },
    {
      "panel": 2,
      "role": "situation",
      "scene": "카페에서 남편이 고개를 숙이고 사과하는 장면, 여성은 눈물을 참고 있음",
      "narration": "남편이 바람을 피웠습니다. 처음 알았을 때 그만 만나겠다는 말을 믿었죠. 그 말에 참고 또 참았습니다.",
      "emotion": "슬픔"
    },
    {
      "panel": 3,
      "role": "shock",
      "scene": "SNS 화면이 보이는 스마트폰 클로즈업, 둘이 함께 찍은 셀카가 올라와 있음",
      "narration": "그런데 어느 날 SNS를 보다가 알게 됐습니다. 둘은 계속 만나고 있었습니다. 심지어 사진까지 올리고 있었죠.",
      "emotion": "분노"
    },
    {
      "panel": 4,
      "role": "excuse",
      "scene": "법정에서 상대 여성이 변호사 옆에 앉아 억울한 표정을 짓고 있음",
      "narration": "소송을 걸자 상대방은 발빼기 시작했습니다.",
      "dialogue": "이미 끝난 사이 아니었나요? 저는 피해자입니다.",
      "emotion": "냉소"
    },
    {
      "panel": 5,
      "role": "reversal",
      "scene": "변호사가 서류를 들고 자신감 있게 발언, 배경에 대화 기록 증거가 비침",
      "narration": "하지만 결정적인 증거가 있었습니다. 기혼자인 걸 알면서 시작한 관계였죠. 가족 행사 일정까지 알고 있었습니다.",
      "emotion": "긴장"
    },
    {
      "panel": 6,
      "role": "verdict",
      "scene": "법원 판결문 클로즈업, 의뢰인이 안도한 표정, 변호사가 미소짓는 뒷배경",
      "narration": "위자료 3,000만 원 인정.",
      "dialogue": "혼인 파탄의 원인이 아니어도, 책임은 있습니다.",
      "emotion": "안도"
    }
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
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            temperature: 0.8,
            system: systemPrompt,
            messages: [{
                role: "user",
                content: `사건 유형: ${caseType}\n변호사 역할: ${lawyerRole === "victim" ? "피해자/원고 대리" : lawyerRole === "defendant" ? "피고인/가해자 변호" : "자동 판별"}\n\n사건 자료:\n${maskedText.substring(0, 3000)}`,
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

    // ── JSON 복구: 문자열 安의 줄바꿈만 이스케이프 ──
    function repairJSON(raw: string): string {
        // JSON 블록 추출
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start === -1 || end === -1) return raw;
        let json = raw.substring(start, end + 1);

        // 제어문자 제거 (줄바꿈/탭 제외)
        json = json.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

        // 문자 단위 순회: 문자열 안의 줄바꿈만 이스케이프
        let result = "";
        let inString = false;
        let escaped = false;

        for (let i = 0; i < json.length; i++) {
            const ch = json[i];

            if (escaped) {
                result += ch;
                escaped = false;
                continue;
            }

            if (ch === "\\" && inString) {
                result += ch;
                escaped = true;
                continue;
            }

            if (ch === '"') {
                inString = !inString;
                result += ch;
                continue;
            }

            if (inString) {
                if (ch === "\n") { result += "\\n"; continue; }
                if (ch === "\r") { continue; } // skip CR
                if (ch === "\t") { result += "\\t"; continue; }
            }

            result += ch;
        }

        // trailing commas 제거
        result = result.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        return result;
    }

    // 파싱 시도
    try {
        return JSON.parse(clean);
    } catch {
        console.error("[Webtoon] JSON parse failed, attempting repair...");
        try {
            const repaired = repairJSON(text);
            console.log("[Webtoon] Repaired JSON (first 300):", repaired.substring(0, 300));
            return JSON.parse(repaired);
        } catch (e2) {
            console.error("[Webtoon] JSON repair also failed:", e2 instanceof Error ? e2.message : e2);
            console.error("[Webtoon] Raw text (first 500):", text.substring(0, 500));
            // 최소 시나리오 — 사건 자료 기반으로 구성
            return {
                title: caseType || "법률 웹툰",
                summary: maskedText.substring(0, 200),
                caption: "",
                hashtags: [],
                character_sheet: {
                    protagonist: "의뢰인, 갈색 머리, 정장",
                    lawyer: "변호사, 검은 머리, 양복",
                    antagonist: "",
                    setting: "법률 사무소와 법정",
                },
                panels: [
                    { panel: 1, role: "hook" as const, scene: `${caseType} 관련 의뢰인이 법률사무소를 찾아오는 장면`, narration: maskedText.substring(0, 100), dialogue: "변호사님, 사건에 대해 상담드리고 싶습니다.", emotion: "불안" },
                    { panel: 2, role: "situation" as const, scene: "변호사가 사건 서류를 꼼꼼히 검토하는 장면", narration: maskedText.substring(100, 250), dialogue: "사건 내용을 자세히 살펴보겠습니다.", emotion: "진지" },
                    { panel: 3, role: "shock" as const, scene: "사건의 핵심 쟁점이 드러나는 장면", narration: maskedText.substring(250, 400), dialogue: "여기서 중요한 점은...", emotion: "긴장" },
                    { panel: 4, role: "excuse" as const, scene: "법정에서 상대측 주장과 대립하는 장면", narration: maskedText.substring(400, 550), dialogue: "이러한 주장은 근거가 없습니다.", emotion: "분노" },
                    { panel: 5, role: "reversal" as const, scene: "결정적 증거로 반전이 일어나는 장면", narration: maskedText.substring(550, 700), dialogue: "이 증거가 사건의 핵심입니다.", emotion: "결의" },
                    { panel: 6, role: "verdict" as const, scene: "판결 후 의뢰인과 변호사가 함께하는 장면", narration: maskedText.substring(700, 850), dialogue: "좋은 결과를 얻었습니다.", emotion: "안도" },
                ],
            };
        }
    }
}

// ─── Step 2: 이미지 생성 (Flux 2 Pro → GPT Image 1.5 → Imagen 4 Fast → DALL-E 3) ───
export async function generateWebtoonImages(
    scenario: WebtoonScenario,
    style: WebtoonStyleKey = "dramatic",
    profileImageUrl?: string,
): Promise<{ panelIndex: number; imageBase64: string }[]> {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!process.env.REPLICATE_API_TOKEN && !openaiKey && !geminiKey) {
        throw new Error("REPLICATE_API_TOKEN, OPENAI_API_KEY 또는 GEMINI_API_KEY가 필요합니다.");
    }

    const stylePrompt = WEBTOON_STYLES[style]?.prompt || WEBTOON_STYLES.dramatic.prompt;
    const charSheet = scenario.character_sheet;
    const totalPanels = scenario.panels.length;

    // Build character consistency prompt (각 필드 500자 제한)
    const truncate = (s: string, max: number) => s && s.length > max ? s.substring(0, max) + "..." : s;
    const characterPrompt = `Characters:
- 의뢰인: ${truncate(charSheet.protagonist, 500)}
- 변호사: ${truncate(charSheet.lawyer, 500)}
${charSheet.antagonist ? `- 상대방: ${truncate(charSheet.antagonist, 300)}` : ""}
Setting: ${truncate(charSheet.setting, 300)}`;

    const buildPrompt = (panel: WebtoonPanel) => `Create a single comic panel illustration.

Art style: ${stylePrompt}

${characterPrompt}

Panel ${panel.panel}/${totalPanels} - "${panel.emotion}" mood:
Scene: ${truncate(panel.scene, 500)}

Requirements:
- Single panel, square 1:1 ratio
- No speech bubbles, no text, no words, no letters
- Clear emotional expression matching "${panel.emotion}"
- Cinematic composition with dramatic camera angles
- Korean characters and setting
- Focus on VISUAL STORYTELLING`;

    // DALL-E 3 전용 (4000자 제한)
    const buildShortPrompt = (panel: WebtoonPanel) => {
        const p = `Comic panel. ${stylePrompt}. ${truncate(panel.scene, 300)}. Emotion: ${panel.emotion}. Korean characters, cinematic, no text/speech bubbles, square 1:1.`;
        return p.substring(0, 3900);
    };

    // Generate all panels
    const allPanels = scenario.panels.slice(0, totalPanels);
    const engineErrors: string[] = [];

    const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...init, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    };

    // ── 1순위: Replicate Flux 2 Pro (블로그 이미지와 동일 모델로 통일) ──
    const replicateKey = process.env.REPLICATE_API_TOKEN;
    const generateWithReplicate = async (panel: WebtoonPanel): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        if (!replicateKey) return null;
        const prompt = `${buildPrompt(panel)}\n\nABSOLUTE RULE: zero text, zero letters, zero numbers, zero speech bubbles anywhere in the image.`;

        try {
            console.log(`[Webtoon/Flux2] Panel ${panel.panel}/${totalPanels} (${panel.role})...`);
            const createRes = await fetchWithTimeout("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${replicateKey}`,
                    "Prefer": "wait=60",
                },
                body: JSON.stringify({
                    input: {
                        prompt,
                        width: 1024,
                        height: 1024,
                        output_format: "png",
                        output_quality: 95,
                        safety_tolerance: 2,
                        prompt_upsampling: true,
                    },
                }),
            }, 70000);

            if (!createRes.ok) {
                const errText = await createRes.text();
                console.error(`[Webtoon/Flux2] Panel ${panel.panel} error (${createRes.status}):`, errText.substring(0, 200));
                engineErrors.push(`Flux2: ${createRes.status} - ${errText.substring(0, 200)}`);
                return null;
            }

            const prediction = await createRes.json();
            let output = prediction.output;
            if (!output && prediction.status !== "failed") {
                for (let i = 0; i < 30; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                        headers: { "Authorization": `Token ${replicateKey}` },
                    });
                    if (!pollRes.ok) break;
                    const poll = await pollRes.json();
                    if (poll.status === "succeeded") { output = poll.output; break; }
                    if (poll.status === "failed") { engineErrors.push(`Flux2 failed: ${poll.error}`); return null; }
                }
            }
            if (prediction.status === "failed") {
                engineErrors.push(`Flux2 failed: ${prediction.error}`);
                return null;
            }

            const imageUrl: string = Array.isArray(output) ? output[0] : output;
            if (!imageUrl) return null;

            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) return null;
            const buffer = await imgRes.arrayBuffer();
            console.log(`[Webtoon/Flux2] Panel ${panel.panel} ✓`);
            return { panelIndex: panel.panel, imageBase64: Buffer.from(buffer).toString("base64") };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Webtoon/Flux2] Panel ${panel.panel} failed:`, msg);
            engineErrors.push(`Flux2 exception: ${msg.substring(0, 200)}`);
            return null;
        }
    };

    // ── 1순위: GPT Image 1 (최고 프롬프트 이해도) ──
    const generateWithGPTImage = async (panel: WebtoonPanel): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        if (!openaiKey) return null;
        const prompt = buildPrompt(panel);

        try {
            console.log(`[Webtoon/GPT] Panel ${panel.panel}/${totalPanels} (${panel.role})...`);
            const res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${openaiKey}`,
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
                console.error(`[Webtoon/GPT] Panel ${panel.panel} error (${res.status}):`, err);
                engineErrors.push(`GPT: ${res.status} - ${err.substring(0, 200)}`);
                return null;
            }

            const data = await res.json();
            const b64 = data.data?.[0]?.b64_json;
            if (b64) {
                console.log(`[Webtoon/GPT] Panel ${panel.panel} ✓`);
                return { panelIndex: panel.panel, imageBase64: b64 };
            }
            return null;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Webtoon/GPT] Panel ${panel.panel} failed:`, msg);
            engineErrors.push(`GPT exception: ${msg.substring(0, 200)}`);
            return null;
        }
    };

    // ── 2순위: Imagen 4 Fast (가성비 폴백) ──
    const generateWithImagen = async (panel: WebtoonPanel): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        if (!geminiKey) return null;
        const prompt = buildPrompt(panel);

        try {
            console.log(`[Webtoon/Imagen4] Fallback panel ${panel.panel}/${totalPanels}...`);
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-preview-06-06:predict?key=${geminiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        instances: [{ prompt }],
                        parameters: {
                            sampleCount: 1,
                            aspectRatio: "1:1",
                        },
                    }),
                }
            );

            if (!res.ok) {
                const err = await res.text();
                console.error(`[Webtoon/Imagen4] Panel ${panel.panel} error (${res.status}):`, err);
                engineErrors.push(`Imagen4: ${res.status} - ${err.substring(0, 200)}`);
                return null;
            }

            const data = await res.json();
            const b64 = data.predictions?.[0]?.bytesBase64Encoded;
            if (b64) {
                console.log(`[Webtoon/Imagen4] Panel ${panel.panel} ✓ (fallback)`);
                return { panelIndex: panel.panel, imageBase64: b64 };
            }
            return null;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Webtoon/Imagen4] Panel ${panel.panel} failed:`, msg);
            engineErrors.push(`Imagen4 exception: ${msg.substring(0, 200)}`);
            return null;
        }
    };

    // ── 3순위: DALL-E 3 (최종 폴백) ──
    const generateWithDallE = async (panel: WebtoonPanel): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        if (!openaiKey) return null;
        const prompt = buildShortPrompt(panel);

        try {
            console.log(`[Webtoon/DALL-E] Final fallback panel ${panel.panel}/${totalPanels}...`);
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
                const err = await res.text();
                console.error(`[Webtoon/DALL-E] Panel ${panel.panel} error (${res.status}):`, err);
                engineErrors.push(`DALL-E: ${res.status} - ${err.substring(0, 200)}`);
                return null;
            }

            const data = await res.json();
            const b64 = data.data?.[0]?.b64_json;
            if (b64) {
                console.log(`[Webtoon/DALL-E] Panel ${panel.panel} ✓ (final fallback)`);
                return { panelIndex: panel.panel, imageBase64: b64 };
            }
            return null;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Webtoon/DALL-E] Panel ${panel.panel} failed:`, msg);
            engineErrors.push(`DALL-E exception: ${msg.substring(0, 200)}`);
            return null;
        }
    };

    // ── 폴백 체인: Flux 2 Pro → GPT Image 1.5 → Imagen 4 Fast → DALL-E 3 ──
    const generatePanel = async (panel: WebtoonPanel, retries = 1): Promise<{ panelIndex: number; imageBase64: string } | null> => {
        // 1순위: Replicate Flux 2 Pro
        const fluxResult = await generateWithReplicate(panel);
        if (fluxResult) return fluxResult;

        // 2순위: GPT Image 1.5
        const gptResult = await generateWithGPTImage(panel);
        if (gptResult) return gptResult;

        // 3순위: Imagen 4 Fast
        const imagenResult = await generateWithImagen(panel);
        if (imagenResult) return imagenResult;

        // 4순위: DALL-E 3
        const dalleResult = await generateWithDallE(panel);
        if (dalleResult) return dalleResult;

        // 재시도
        if (retries > 0) {
            console.log(`[Webtoon] Retrying panel ${panel.panel}... (${retries} left)`);
            await new Promise(r => setTimeout(r, 2000));
            return generatePanel(panel, retries - 1);
        }
        return null;
    };

    console.log(`[Webtoon] Generating ${totalPanels} panels (Flux 2 Pro → GPT Image → Imagen 4 → DALL-E 3)...`);
    const results = await Promise.all(allPanels.map(p => generatePanel(p)));

    const successful = results.filter((r): r is { panelIndex: number; imageBase64: string } => r !== null);
    console.log(`[Webtoon] ${successful.length}/${totalPanels} images generated successfully`);
    if (successful.length === 0 && engineErrors.length > 0) {
        const uniqueErrors = [...new Set(engineErrors)].slice(0, 5);
        console.error(`[Webtoon] All engines failed. Errors:`, uniqueErrors);
        throw new Error(`이미지 엔진 모두 실패: ${uniqueErrors.join(" | ")}`);
    }
    return successful;
}

// ─── Full pipeline ───
export async function generateWebtoon(
    maskedText: string,
    caseType: string,
    style: WebtoonStyleKey = "dramatic",
    profileImageUrl?: string,
    lawyerRole: string = "auto",
): Promise<WebtoonResult> {
    console.log(`[Webtoon] Starting generation: style=${style}, caseType=${caseType}, hasProfile=${!!profileImageUrl}, lawyerRole=${lawyerRole}`);

    // Step 1: Scenario
    const scenario = await generateWebtoonScenario(maskedText, caseType, lawyerRole);
    console.log(`[Webtoon] Scenario generated: ${scenario.panels.length} panels, title="${scenario.title}"`);

    // Step 2: Images (batched parallel)
    const images = await generateWebtoonImages(scenario, style, profileImageUrl);
    console.log(`[Webtoon] ${images.length}/${scenario.panels.length} images generated`);

    if (images.length === 0) {
        console.error("[Webtoon] No images were generated! Check OPENAI_API_KEY and API status.");
    }

    return { scenario, images, style };
}
