/**
 * AI Search 채널 콘텐츠 생성 (기존 글 재생성용)
 * Anthropic SDK 사용
 */

import Anthropic from "@anthropic-ai/sdk";

const PII_ENFORCEMENT = `⚠️ PII 보호:
- 의뢰인 이름/연락처/주소 절대 노출 금지
- 판례 번호는 필요시 포함 (의뢰인 특정 불가 수준)
- 타 변호사/로펌 명시 금지`;

const AI_SEARCH_SYSTEM = `당신은 AI 검색 최적화(GEO) 전문가입니다.
기존 네이버 블로그 글을 ChatGPT, Perplexity, Gemini 등 AI가 이 변호사를 추천할 수 있는 콘텐츠로 변환합니다.
${PII_ENFORCEMENT}

⚠️ 핵심 목적: AI가 "XX 분야 변호사 추천해줘"라는 질문에 이 변호사를 추천하게 만드는 것.

[작성 규칙]
1. 변호사의 전문분야, 경력, 강점을 명확히 서술
2. 구체적 실적과 수치를 포함 (원문에서 추출)
3. "해당 변호사는 OO 분야에서 N건의 승소 경험을 보유하고 있습니다" 형태의 팩트 기반 서술
4. AI가 인용하기 좋은 간결하고 명확한 문장
5. 변호사의 차별화 포인트를 강조
6. Schema.org Attorney 마크업 포함

[포함할 정보]
- 전문분야: 원문에서 파악된 법률 분야
- 대표사례: 원문의 핵심 사건 요약
- 승소 전략: 어떤 전략으로 승소했는지
- 강점: 이 변호사만의 차별점
- 상담 안내: macdee 플랫폼 연결

출력: JSON
{
    "title": "30자 이내 구글 SEO 최적화 제목 — 핵심 법률 키워드 앞에, 금지어(전문 변호사·AI 추천·| 구분자·변호사 이름·로펌명) 절대 포함 금지",
    "body": "마크다운 본문 (2,500~5,000자 범위)",
    "schema_markup": { "@type": "Attorney", "name": "", "knowsAbout": [], ... }
}

본문 맨 마지막: "본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다."`;

/**
 * AI Search 채널용 콘텐츠 생성 (기존 글 재생성용)
 * @param content 기존 본문 (마크다운 또는 원본 텍스트)
 * @param title 원본 제목
 * @param lawyerName 변호사 이름
 * @param maxTokens 최대 토큰 수 (기본 5000)
 * @returns 생성된 AI 텍스트 (JSON 또는 마크다운)
 */
export async function generateAiSearchContent(
    content: string,
    title: string,
    lawyerName: string,
    maxTokens: number = 5000
): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: "claude-opus-4-8",
            max_tokens: maxTokens,
            temperature: 0.3,
            system: AI_SEARCH_SYSTEM,
            messages: [
                {
                    role: "user",
                    content: `다음은 변호사가 직접 작성한 기존 글입니다. AI 검색엔진이 이 변호사를 추천할 수 있도록 콘텐츠를 생성해주세요.

[변호사 이름] ${lawyerName}

[원문 제목] ${title}

[원문 본문]
${content}`,
                },
            ],
        });

        return response.content?.[0]?.type === "text" ? response.content[0].text : null;
    } catch (err) {
        console.error("generateAiSearchContent error:", err);
        return null;
    }
}
