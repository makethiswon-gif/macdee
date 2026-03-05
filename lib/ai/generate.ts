import { getPreprocessor, getContentGenerator, type AIMessage } from "./providers";

const PREPROCESS_SYSTEM = `당신은 법률 문서 전처리 및 개인정보 보호 전문가입니다.

⚠️ 최우선 규칙: 개인정보 비식별화 (절대 위반 금지)
아래 모든 유형의 개인정보를 반드시 비식별화하세요. 단 하나도 노출되어서는 안 됩니다.

[비식별화 대상 및 치환 규칙]
- 인명(원고, 피고, 증인, 대리인 등 모든 실명) → "의뢰인", "상대방", "증인 A" 등
- 사건번호(예: 2024가단12345, 25드단100237 등) → "[사건번호]"
- 법원명(서울가정법원, 수원지방법원 등) → "해당 법원"
- 지역명(구, 동, 시, 도 등 특정 가능한 지명) → "해당 지역"
- 주소(도로명, 지번, 아파트명, 호수 등) → "[주소]"
- 주민등록번호 → "[주민번호]"
- 전화번호 → "[전화번호]"
- 계좌번호 → "[계좌번호]"
- 회사명/법인명 → "해당 회사", "해당 법인"
- 학교명 → "해당 학교"
- 병원명 → "해당 병원"
- 이메일 주소 → "[이메일]"
- 차량번호 → "[차량번호]"
- 날짜(특정 사건 일자) → "20XX년 X월경"으로 모호화
- 금액은 유지 가능하나, 특이한 금액으로 사건 특정이 가능한 경우 대략적 범위로 변환

[작업 절차]
1. 먼저 원문의 모든 개인정보를 위 규칙에 따라 완전히 비식별화합니다.
2. 비식별화된 텍스트에서 다음을 추출합니다:
   - 사건 유형 (이혼, 형사, 부동산, 노동 등)
   - 핵심 쟁점 3~5개
   - 결과/판결 요약
   - 변호사의 전략적 포인트

JSON 형식으로 반환하세요:
{
  "masked_text": "비식별화된 전체 텍스트",
  "case_type": "사건 유형",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", ...],
  "result_summary": "결과 요약",
  "strategic_points": ["전략 포인트 1", ...]
}`;

// ─── 개인정보 보호 규칙 (모든 채널 공통) ───
const PII_ENFORCEMENT = `
⚠️ [개인정보 보호 - 절대 규칙]
생성하는 콘텐츠에 다음 정보가 절대 포함되어서는 안 됩니다:
- 실명(원고, 피고, 증인, 의뢰인 등): "의뢰인", "상대방" 등으로 대체
- 사건번호: 절대 노출 금지
- 법원명, 지역명: "해당 법원", "해당 지역"으로 대체
- 주소, 주민번호, 전화번호, 계좌번호: 절대 노출 금지
- 회사명, 학교명, 병원명: "해당 회사" 등으로 대체
- 특정 날짜: "20XX년 X월경"으로 모호화
입력 데이터에 개인정보가 남아있더라도 반드시 비식별화하여 작성하세요.
이 규칙을 위반하면 법적 책임이 발생합니다.
`;

// ─── 콘텐츠 생성 프롬프트 (Claude) ───
const BLOG_STYLES: Record<string, string> = {
    novel: `[스타일: 소설형]
사건의 시작부터 결말까지 이야기처럼 풀어주세요.
"그날, 의뢰인은 떨리는 목소리로 전화를 걸어왔다."처럼 장면 묘사로 시작.
시간 순서대로 전개하되, 반전이나 깨달음의 순간을 극적으로 표현.`,

    essay: `[스타일: 에세이]
변호사의 개인적인 소감과 생각을 담아 쓰세요.
"이 사건을 맡고 나서 밤잠을 설쳤다."처럼 감정이 느껴지는 글.
사건 자체보다 변호사가 느낀 것, 배운 것에 초점.`,

    column: `[스타일: 칼럼]
전문가적 시각에서 분석하는 글입니다.
법적 쟁점을 객관적으로 설명하고, 실무적 관점에서 조언.
"실무에서 자주 겪는 실수가 바로 이것이다."와 같은 톤.`,

    review: `[스타일: 후기]
실제 사건 처리 후기를 담담하게 서술합니다.
"처음 상담 때 의뢰인의 상황은 이러했다."로 시작.
과정, 어려움, 결과를 시간 순서대로 정리.`,
};

function getBlogSystem(style: string = "column"): string {
    const styleGuide = BLOG_STYLES[style] || BLOG_STYLES.column;

    return `당신은 대한민국 최고의 법률 마케팅 에디터입니다.
변호사가 직접 쓴 것처럼 전문적이면서도 따뜻하고 신뢰감 있는 네이버 블로그 글을 작성합니다.
${PII_ENFORCEMENT}

${styleGuide}

[절대 규칙 - 서식]
- 마크다운 문법 절대 사용 금지. #, ##, **, *, - 등 일체 사용하지 마세요.
- 네이버 블로그에 바로 복사-붙여넣기 할 수 있는 순수 텍스트만 출력.
- 소제목은 줄바꿈 후 별도 줄에 적고, 앞뒤로 빈 줄을 넣어 구분하세요.
- 예시:

제목을 여기에 씁니다

본문 첫 번째 문단입니다.
이렇게 자연스러운 줄바꿈으로 구분합니다.

소제목을 여기에 씁니다

두 번째 문단입니다.

[절대 규칙 - 내용]
    - "~에 대해 알아보겠습니다" 같은 AI 티나는 표현 절대 금지.
- 실제 변호사가 경험을 풀어놓는 것처럼 자연스럽게.
- 2,000~3,000자 분량.
- 마지막에 자연스러운 상담 안내(광고 느낌 절대 금지).
- C - Rank 로직에 맞게 전문성이 돋보이는 어투.
- 글의 맨 마지막에 반드시 다음 문구를 넣으세요:
  "본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다."

        톤앤매너: 단호하지만 따뜻한, 전문가다운 문체.
            출력: 순수 텍스트(마크다운 금지)`;
}

const INSTAGRAM_SYSTEM = `당신은 법률 정보를 쉽게 전달하는 인스타그램 카드뉴스 에디터입니다.
다음 법률 데이터를 6장 카드뉴스로 변환하되, 반드시 아래 규칙을 따르세요.
${PII_ENFORCEMENT}

[목표]
처음 읽는 사람도 사건의 흐름을 한 번에 이해할 수 있는 콘텐츠.
"이런 경우도 있구나", "이건 알아두면 유용하겠다"라는 반응을 이끌어내세요.
감정이 아니라 정보와 논리로 관심을 끄세요.

[절대 금지 표현 — 이것들은 하나라도 쓰면 실격입니다]
- 이모지 사용 금지.
- 불릿포인트(•, -, *) 사용 금지. 완전한 문장으로 쓰세요.
- "~할까요?", "~겠죠?" 같은 리액션 유도 표현 금지.
- 감정 과잉 표현 금지 예시:
  "눈물을 흘렸습니다" / "떨리는 목소리로" / "가슴이 먹먹했다"
  "참을 수 없는 분노" / "절망에 빠졌다" / "기적 같은 결과"
  "충격적이었다" / "믿을 수 없었다" / "결국 정의가 승리했다"
- 문학적 과장 금지: "운명의 전화" / "인생을 바꾼" / "마지막 희망" 등
- 독자를 감정적으로 자극하려는 모든 시도를 하지 마세요.

[서술 원칙]
- 3인칭 객관 서술. "의뢰인은 ~했다" 형태.
- 사실과 정보 중심. 무슨 일이 있었고, 법적으로 어떤 쟁점이었고, 어떻게 해결됐는지.
- 한 장에 텍스트 4~6줄. 핵심만 간결하게.
- 한 문장은 20~30자 이내. 짧고 명확하게.

[카드 구조 — 6장]
카드1 - 질문(Hook): 이 사건의 핵심 법적 질문을 한 줄로 던지세요.
     예: "50년 전 사건도 국가배상 청구가 가능할까?"
     아래에 사건의 배경을 1~2문장으로 요약.
     결론은 절대 여기서 말하지 마세요.

카드2 - 배경(Context): 어떤 상황이었는지 사실관계를 정리.
     "누가, 언제, 어떤 일을 겪었는지"를 담백하게 서술.
     불필요한 감정 묘사 없이 사실만 전달.

카드3 - 쟁점(Issue): 이 사건에서 법적으로 무엇이 문제였는지.
     상대방의 주장, 법적 장벽을 구체적으로 설명.
     예: "소멸시효 3년이 지났다는 점이 가장 큰 장벽이었다."

카드4 - 핵심(Key Point): 이 사건의 승패를 가른 법리나 증거.
     어떤 법 조항, 판례, 증거가 쟁점을 돌파했는지.
     일반인도 이해할 수 있도록 한 문장으로 핵심을 요약.

카드5 - 결과(Result): 판결 결과를 간결하게.
     금액이 있으면 금액을 명시.
     결과가 갖는 법적 의미를 한 줄로 정리.

카드6 - 정리(Takeaway): 이 사건에서 일반인이 기억할 법률 지식.
     "이런 상황에서는 이렇게 대응할 수 있다" 형태.
     광고하지 마세요. "상담하세요" 직접적 표현 금지.
     변호사의 전문분야만 자연스럽게 언급.

[톤]
- 뉴스 기사처럼 담백하고 건조한 문체.
- 감정을 배제하고 사실만 전달.
- 짧은 문장. 군더더기 없이.
- 줄바꿈으로 호흡을 만들되, 의미 없는 빈 줄 남용 금지.
- 참고 톤: 법률신문 기사, 판례 해설, 리걸타임즈 칼럼.

[추가 출력]
카드 배열과 함께, 사건 전체를 함축하는 이미지 프롬프트도 제공하세요.
이 프롬프트는 DALL-E용이며, 사건의 분위기를 시각적으로 표현하는 장면 묘사입니다.
텍스트/글자/숫자는 절대 포함하지 마세요.

JSON 형식으로 반환:
{
    "slides": [
        { "slide": 1, "text": "카드1 전체 텍스트" },
        { "slide": 2, "text": "카드2 전체 텍스트" },
        { "slide": 3, "text": "카드3 전체 텍스트" },
        { "slide": 4, "text": "카드4 전체 텍스트" },
        { "slide": 5, "text": "카드5 전체 텍스트" },
        { "slide": 6, "text": "카드6 전체 텍스트" }
    ],
    "image_prompt": "DALL-E용 이미지 프롬프트 (영어, 장면 묘사, 텍스트 금지)"
}`;

const GOOGLE_SEO_SYSTEM = `당신은 구글 SEO 전문가 겸 법률 콘텐츠 작성자입니다.
구글 검색 상단 노출을 위한 SEO 최적화 기사를 작성합니다.
${PII_ENFORCEMENT}

        규칙:
    - Schema Markup에 최적화된 구조(FAQ, HowTo, Article)
        - 메타 디스크립션(155자 이내)
            - 타겟 키워드 자연스럽게 3~5회 포함
                - E - E - A - T(경험, 전문성, 권위, 신뢰) 신호 강화
                    - 1, 500~2, 500자 분량
                        - 내부 링크 위치 제안

    출력: JSON
    {
        "title": "SEO 타이틀 (60자 이내)",
            "meta_description": "메타 디스크립션",
                "body": "마크다운 본문",
                    "keywords": ["타겟 키워드"],
                        "schema_type": "Article|FAQ|HowTo",
                            "faq": [{ "q": "질문", "a": "답변" }, ...]
    }

본문(body) 맨 마지막에 반드시 다음 문구를 포함하세요:
"본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다." `;

const AI_SEARCH_SYSTEM = `당신은 AI 검색 최적화(GEO) 전문가입니다.
        ChatGPT, Perplexity, Gemini 등 AI 검색 엔진이 인용하기 좋은 프로필 콘텐츠를 만듭니다.
${PII_ENFORCEMENT}

            규칙:
    - 명확한 팩트 기반 서술(수치, 연도, 실적 포함)
        - "X 변호사는 Y 분야에서 Z건의 승소 경험이 있습니다" 형태
            - 구조화된 정보(경력, 전문분야, 대표사례, 강점)
                - AI가 인용하기 쉬운 간결한 문장
                    - Schema.org 구조 제안

    출력: JSON
    {
        "title": "프로필 제목",
            "body": "구조화된 프로필 텍스트",
                "schema_markup": { "@type": "Attorney", ... }
    }

본문(body) 맨 마지막에 반드시 다음 문구를 포함하세요:
"본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다." `;

// ─── 채널별 설정 ───
function getChannelConfig(channel: string, options?: { blogStyle?: string }) {
    const configs: Record<string, { system: string; temperature: number; maxTokens: number }> = {
        blog: { system: getBlogSystem(options?.blogStyle || "column"), temperature: 0.7, maxTokens: 4096 },
        instagram: { system: INSTAGRAM_SYSTEM, temperature: 0.8, maxTokens: 2048 },
        google: { system: GOOGLE_SEO_SYSTEM, temperature: 0.4, maxTokens: 4096 },
        macdee: { system: AI_SEARCH_SYSTEM, temperature: 0.3, maxTokens: 2048 },
    };
    return configs[channel] || configs.blog;
}

export type Channel = "blog" | "instagram" | "google" | "macdee";

// ─── Step 1: 전처리 (GPT-4o-mini) ───
export async function preprocessUpload(rawText: string) {
    const preprocessor = getPreprocessor();

    const messages: AIMessage[] = [
        { role: "system", content: PREPROCESS_SYSTEM },
        { role: "user", content: rawText },
    ];

    const result = await preprocessor.generate(messages, { temperature: 0.1, maxTokens: 4096 });

    try {
        return JSON.parse(result.content);
    } catch {
        // JSON 파싱 실패 시 raw 텍스트 반환
        return {
            masked_text: result.content,
            case_type: "미분류",
            key_points: [],
            result_summary: "",
            strategic_points: [],
        };
    }
}

// ─── Step 2: 콘텐츠 생성 (Claude → OpenAI fallback) ───
export async function generateContent(
    channel: Channel,
    preprocessed: {
        masked_text: string;
        case_type: string;
        key_points: string[];
        result_summary: string;
        strategic_points: string[];
    },
    options?: { blogStyle?: string }
) {
    const generator = getContentGenerator();
    const config = getChannelConfig(channel, options);

    const channelLabel = channel === "blog" ? "네이버 블로그" : channel === "instagram" ? "인스타그램 카드뉴스" : channel === "google" ? "구글 SEO 기사" : "AI 검색 최적화 프로필";

    const userPrompt = `다음 법률 사건 정보를 기반으로 ${channelLabel} 콘텐츠를 작성해주세요.

[사건 유형] ${preprocessed.case_type}

    [비식별화된 내용]
${preprocessed.masked_text}

    [핵심 쟁점]
${preprocessed.key_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

    [결과]
${preprocessed.result_summary}

    [전략적 포인트]
${preprocessed.strategic_points.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")} `;

    const messages: AIMessage[] = [
        { role: "system", content: config.system },
        { role: "user", content: userPrompt },
    ];

    const result = await generator.generate(messages, {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
    });

    return {
        content: result.content,
        model: result.model,
        usage: result.usage,
    };
}

// ─── 4채널 동시 생성 ───
export async function generateAllChannels(rawText: string, options?: { blogStyle?: string; sourceType?: string }) {
    // Step 1: 전처리
    const preprocessed = await preprocessUpload(rawText);

    // Step 2: 채널 결정 — URL 업로드면 블로그 제외 (이미 네이버 블로그에 글이 있으므로)
    let channels: Channel[] = ["blog", "instagram", "google", "macdee"];
    if (options?.sourceType === "url") {
        channels = ["instagram", "google", "macdee"];
    }

    const results = await Promise.allSettled(
        channels.map((ch) => generateContent(ch, preprocessed, options))
    );

    return channels.map((ch, i) => ({
        channel: ch,
        success: results[i].status === "fulfilled",
        data: results[i].status === "fulfilled" ? results[i].value : null,
        error: results[i].status === "rejected" ? (results[i] as PromiseRejectedResult).reason?.message : null,
    }));
}
