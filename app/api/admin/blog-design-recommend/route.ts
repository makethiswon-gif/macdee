import { NextRequest, NextResponse } from "next/server";

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch {
        return false;
    }
}

/**
 * AI 디자인 추천 API
 * 포스팅 제목 + 변호사 프로필 분석 → 최적 디자인 변형 + 색상 팔레트 추천
 */
export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { postTitle, postSummary, profile } = await request.json();
    if (!postTitle) return NextResponse.json({ error: "No title" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    try {
        const lawyerInfo = profile ? `
변호사: ${profile.lawyerName || ""}
사무소: ${profile.officeName || ""}
전문분야: ${(profile.specialty || []).join(", ") || "일반"}
프로필사진: ${profile.profileImages?.length > 0 ? "있음" : "없음"}
사무실사진: ${profile.officeImages?.length > 0 ? "있음" : "없음"}
로고: ${profile.logoImage ? "있음" : "없음"}
브랜드컬러: ${profile.brandColor || "없음"}` : "";

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 600,
                messages: [{
                    role: "user",
                    content: `당신은 프리미엄 법률 블로그 이미지 디자인 전문가입니다.

포스팅 제목과 변호사 프로필을 보고, 가장 적합한 디자인 스타일과 색상 팔레트를 추천하세요.

## 포스팅 정보
제목: ${postTitle}
요약: ${postSummary || "없음"}
${lawyerInfo}

## 디자인 기준
- 메인 이미지 (mainVariant): 0~50 중 택1. 프로필사진이 있으면 사진을 활용하는 변형(0,2,10,17,18,19,20,33,38)을 선호. 없으면 타이포그래피 중심(7,21,22,27,29,36,37,39) 추천.
- 요약 이미지 (summaryVariant): 0~41 중 택1. 정보가 많으면 cards/timeline(1,3), 간결하면 minimal/big-num(9,6).
- 상담안내 이미지 (contactVariant): 0~39 중 택1.
- 브랜드 이미지 (brandVariant): 0~44 중 택1. 로고 있으면 logo-center(0,15), 사진있으면 photo-editorial(10,12).

## 색상 팔레트 기준 (paletteIndex: 0~49)
- 형사/음주운전 등 심각한 주제: 다크 네이비 프리미엄 (26~30)
- 이혼/가정 등 감성적 주제: 웜 크림 & 브라운 (16~20, 11~15)
- 부동산/계약 등 프로페셔널: 프로페셔널 블루 (0~5)
- 기업/비즈니스: 차콜 & 골드 (31~35)
- 의료/손해배상: 소프트 블루그레이 (21~25)
- 환경/행정: 포레스트 그린 (36~40)
- 세련된 느낌 원할 때: Modern Slate (46~50)
- 변호사 브랜드컬러가 있으면 그에 어울리는 팔레트 선택

## 응답 형식 (반드시 이 JSON만 출력)
{"mainVariant":숫자,"summaryVariant":숫자,"contactVariant":숫자,"brandVariant":숫자,"paletteIndex":숫자,"reason":"한줄 이유"}`,
                }],
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("[DesignRecommend] API error:", res.status, errText);
            return NextResponse.json({ error: "AI API failed" }, { status: 500 });
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || "";

        // JSON 파싱
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            console.error("[DesignRecommend] No JSON in response:", text);
            return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
        }

        const recommendation = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ recommendation });
    } catch (err) {
        console.error("[DesignRecommend] Error:", err);
        return NextResponse.json({ error: "Failed to generate recommendation" }, { status: 500 });
    }
}
