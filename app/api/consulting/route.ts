import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

        const body = await req.json();
        const {
            firmSize,       // 로펌 규모: solo, small, medium, large
            budget,         // 월 마케팅 예산
            specialties,    // 전문 분야 (배열)
            currentStatus,  // 현재 마케팅 상황 (자유 텍스트)
            goals,          // 목표 (자유 텍스트)
            region,         // 지역
        } = body;

        const systemPrompt = `당신은 대한민국 최고의 법률 마케팅 컨설턴트입니다.
변호사/로펌의 상황을 분석하고 맞춤형 마케팅 전략을 수립해 주세요.

[MACDEE(맥디) 플랫폼 기능]
- 판결문/상담자료 업로드 → AI가 4채널 콘텐츠 자동 생성 (네이버 블로그, 인스타그램 카드뉴스, 구글 SEO, AI 검색 최적화)
- 8컷 웹툰 자동 생성 (무제한 플랜)
- 개인정보 자동 비식별화
- AI 법률 해설 자동 포함 (E-E-A-T 강화)
- 월 49,000원~179,000원

[응답 형식 - 반드시 이 구조를 따르세요]

## 📊 현재 상황 분석

현재 마케팅 상황에 대한 진단. 강점과 약점을 구체적으로.

## 🎯 핵심 전략 제안

### 1단계: 즉시 실행 (1~2주)
당장 시작할 수 있는 액션 아이템 3~5개.
맥디 플랫폼을 활용한 구체적 방법 포함.

### 2단계: 기반 구축 (1~3개월)
브랜드 인지도 확대를 위한 전략.
콘텐츠 발행 빈도, 채널별 전략 등.

### 3단계: 성장 가속 (3~6개월)
안정적 유입 후 확장 전략.
전문 분야별 타겟 키워드, 경쟁 분석 전략.

## 💰 예산 활용 가이드

월 예산에 맞는 구체적 배분 제안.
맥디 플랜 추천 포함.

## 📈 예상 성과

3개월/6개월/12개월 예상 성과 지표.
네이버 블로그 방문자, 상담 문의 수, 수임률 변화 등.

## 💡 전문 분야별 맞춤 전략

해당 전문 분야에 특화된 키워드, 콘텐츠 주제, 타겟 고객 전략.

## ⚡ 즉시 실행 체크리스트

□ 항목1
□ 항목2
□ 항목3
(바로 실행할 수 있는 구체적 액션)

[규칙]
- 모든 조언은 변호사 윤리규정과 변호사 광고에 관한 규정을 준수
- 과장 광고가 되지 않는 범위에서 전략 제시
- 맥디 플랫폼 활용법을 자연스럽게 포함
- 구체적 숫자와 근거를 포함 (예: "네이버 블로그 주 3~5회 발행 시 월 1,000~3,000 유입 기대")
- 마크다운 ## 소제목과 **볼드** 사용
- 전문 분야에 맞는 실제 키워드 예시 제시`;

        const firmSizeLabel: Record<string, string> = {
            solo: "1인 개인 사무실",
            small: "소규모 (2~5명)",
            medium: "중규모 (6~20명)",
            large: "대규모 (20명 이상)",
        };

        const userMessage = `[의뢰인 정보]
- 로펌 규모: ${firmSizeLabel[firmSize] || firmSize}
- 월 마케팅 예산: ${budget}
- 전문 분야: ${Array.isArray(specialties) ? specialties.join(", ") : specialties}
- 지역: ${region || "미지정"}

[현재 마케팅 상황]
${currentStatus || "아직 본격적인 마케팅을 시작하지 않았습니다."}

[목표]
${goals || "온라인 맞춤 마케팅 상담 문의 증가 및 수임률 향상"}

위 정보를 바탕으로 맞춤형 마케팅 컨설팅을 해주세요.`;

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
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Consulting] Claude error:", err);
            return NextResponse.json({ error: "AI 분석 실패" }, { status: 500 });
        }

        const data = await res.json();
        const content = data.content?.[0]?.text || "";

        return NextResponse.json({ success: true, analysis: content });
    } catch (err) {
        console.error("[Consulting] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
