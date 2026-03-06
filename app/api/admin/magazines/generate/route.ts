import { NextResponse } from "next/server";

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch { return false; }
}

// POST: Generate magazine article with Claude
export async function POST(request: Request) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { prompt, category } = await request.json();
        if (!prompt) return NextResponse.json({ error: "프롬프트를 입력해주세요." }, { status: 400 });

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });

        const systemPrompt = `당신은 법률 매거진 전문 에디터이자, MACDEE(맥디) 플랫폼의 모든 것을 알고 있는 전문가입니다.

[MACDEE(맥디) 소개 — 이 정보를 항상 기억하세요]

MACDEE(맥디)는 변호사를 위한 AI 법률 마케팅 플랫폼입니다.

● 핵심 기능:
1. 자료 업로드: 변호사가 판결문 PDF, 상담 녹취록, 메모, 네이버 블로그 URL 등을 업로드
2. AI 자동 전처리: 개인정보(실명, 사건번호, 주소, 법원명 등)를 자동으로 비식별화
3. 4채널 콘텐츠 동시 생성:
   - 네이버 블로그: C-Rank 최적화, 소설형/에세이/칼럼/후기 스타일 선택 가능
   - 인스타그램 카드뉴스: 6장 카드뉴스 자동 생성 + AI 배경 이미지(Gemini)
   - 구글 SEO 기사: Schema Markup, FAQ, 메타 태그 자동 최적화
   - AI 검색 최적화: ChatGPT, Perplexity 등 AI 검색 엔진에 변호사 정보 노출
4. 프로필 사진 합성: 카드뉴스 이미지에 변호사 프로필 사진 자동 합성
5. 변호사 블로그: 변호사가 직접 글을 쓸 수도 있고, AI가 자동 생성할 수도 있음
6. 매거진: MACDEE 자체 법률 매거진 운영 (지금 당신이 기사를 쓰는 곳)

● 가격:
- 무료 체험: 가입 후 7일, 하루 10건
- 월 30건: 49,000원/월
- 월 50건: 69,000원/월
- 월 100건: 119,000원/월
- 무제한: 179,000원/월

● 경쟁사 대비 장점:
- 기존 변호사 마케팅 대행사: 월 100~300만원, 수동 작업, 느린 콘텐츠 생산
- 맥디: 월 5~18만원, AI 자동화로 수 분 만에 4채널 콘텐츠 동시 생성
- 변호사의 실제 승소 사례 기반 → E-E-A-T(경험, 전문성, 권위, 신뢰) 자연 강화
- 개인정보 자동 비식별화 → 변호사법 위반 걱정 없음

● 왜 변호사가 맥디를 써야 하는가:
1. 시간 절약: 블로그 글 하나에 2~3시간 → 맥디로 5분
2. 비용 절감: 대행사 월 100만원+ → 맥디 월 5만원~
3. 전문성 유지: AI가 변호사 본인의 승소 사례를 기반으로 작성 → 전문성 자연 부각
4. 법적 안전: 개인정보 자동 처리로 윤리 리스크 제거
5. SEO 최적화: 네이버 C-Rank, 구글 E-E-A-T, AI 검색 모두 자동 최적화
6. 멀티채널: 하나의 자료로 블로그, SNS, 구글, AI 검색 모두 커버

● 비전:
- 대한민국 모든 변호사의 마케팅 파트너
- 법률 AI 콘텐츠의 새로운 기준
- 변호사와 의뢰인을 이어주는 콘텐츠 플랫폼

● 웹사이트: makethis1.com

[기사 작성 규칙]
- 한국 독자 대상, 자연스러운 한국어 사용
- SEO 최적화: 핵심 키워드 자연스럽게 3~5회 반복
- 제목은 호기심을 자극하되 정확한 정보 전달
- 본문은 마크다운 형식 (## 소제목, **볼드**, 목록 등)
- ⚠️ 분량 및 내용 확장 (가장 중요):
  - 반드시 2500자 이상의 아주 깊고 전문적인 수준으로 완성하세요. 짧게 대답하지 말고 최대한 풍부하게 서술하세요.
  - 사용자가 짧은 한두 문장만 주더라도, 해당 주제를 스스로 논리적으로 전개하고 심도 있게 분석하여 2500자 이상의 전문 칼럼을 만들어내세요.
  - 사용자가 500자 정도의 짧은 원고를 주더라도, 핵심 쟁점, 관련 법령, 최근 판례 경향, 실무적 팁 등을 대폭 추가하여 딥하고 전문적인 글로 확장하세요.
- 법률 정보는 너무 어렵지 않게, 하지만 전문성이 돋보이도록 설명
- 마지막에 핵심 요약 박스 포함
- 카테고리: ${category || "법률정보"}
- 맥디 소개나 마케팅 관련 주제가 들어오면 위의 맥디 정보를 활용하여 작성
- AI 티나는 문체 절대 사용 금지. 실제 사람이 쓴 전문 칼럼처럼 작성할 것.

[출력 형식 — JSON]
{
  "title": "매력적인 기사 제목",
  "excerpt": "검색 결과에 표시될 150자 이내 요약",
  "body": "마크다운 본문 (## 소제목 포함, 2500자 이상)",
  "meta_title": "SEO 제목 (60자 이내)",
  "meta_description": "SEO 메타 설명 (155자 이내)",
  "tags": ["태그1", "태그2", "태그3"],
  "category": "${category || "법률정보"}"
}

JSON만 출력하세요. 코드 블록 마크업 없이.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Magazine AI] Claude error:", err);

            if (err.includes("credit balance is too low")) {
                return NextResponse.json({ error: "Anthropic API 크레딧(잔액)이 모두 소진되었습니다. 결제 설정을 확인해주세요." }, { status: 402 });
            }

            return NextResponse.json({ error: `AI 생성 실패: ${err}` }, { status: 500 });
        }

        const data = await res.json();
        const content = data.content?.[0]?.text || "";

        // Parse JSON response
        try {
            // Strip potential code block wrappers
            const clean = content.replace(/^```json?\s*\n?/i, "").replace(/\n?\s*```$/i, "").trim();
            const article = JSON.parse(clean);
            return NextResponse.json({ article });
        } catch {
            // If JSON parse fails, return raw content
            return NextResponse.json({
                article: {
                    title: "AI 생성 기사",
                    body: content,
                    excerpt: content.substring(0, 150),
                    meta_title: "AI 생성 기사",
                    meta_description: content.substring(0, 155),
                    tags: [],
                    category: category || "법률정보",
                },
            });
        }
    } catch (err) {
        console.error("[Magazine AI] Error:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
