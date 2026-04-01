import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { profile, content, title, cardType } = await req.json();

        if (!profile || !content || !cardType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
        }

        const brandColor = profile.brandColor || "#3563AE";
        const hasProfileImg = !!(profile.profileImages?.length);
        const hasLogo = !!profile.logoImage;
        const allCareer = (profile.career || []).filter((c: string) => c.trim());
        const specialties = (profile.specialty || []).join(", ") || "전문분야 없음";

        // Image placeholder instructions
        const imgInfo = `이미지 플레이스홀더:
${hasProfileImg ? '- 변호사 프로필 사진: <img src="__PROFILE_IMG__" />' : '- 프로필 사진 없음'}
${hasLogo ? '- 로펌 로고: <img src="__LOGO_IMG__" />' : '- 로고 없음'}`;

        // Profile context (common across all cards)
        const profileContext = `변호사 정보:
- 이름: ${profile.lawyerName}
- 직함: ${profile.jobTitle || "대표변호사"}
- 로펌: ${profile.officeName}
- 전문분야: ${specialties}
- 브랜드컬러: ${brandColor}
${profile.phone ? '- 대표번호: ' + profile.phone : ''}
${profile.address ? '- 주소: ' + profile.address : ''}
${profile.website ? '- 홈페이지: ' + profile.website : ''}`;

        const careerText = allCareer.length > 0
            ? '경력사항:\n' + allCareer.map((c: string) => `- ${c}`).join('\n')
            : '';

        // Card-specific prompts with example HTML reference
        const cardPrompts: Record<string, string> = {
            thumbnail: `역할: 법률 블로그 메인 썸네일 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

블로그 본문:
${content.substring(0, 1000)}

지시사항:
1. 블로그 본문을 읽고 핵심을 담은 매력적인 제목을 20자 이내로 직접 작성해서 카드에 넣어.
2. 800x800px 카드. inline CSS만 사용.
3. ${brandColor}를 메인 그라데이션 컬러로 사용.
4. 제목을 크고 굵게 (font-size:38~44px, font-weight:800) 중앙 배치.
5. 하단에 "${profile.lawyerName} ${profile.jobTitle || '변호사'}" 이름 작게.
${hasLogo ? `6. 상단에 로펌 로고 <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;" />` : ''}
${hasProfileImg ? `7. 하단 이름 옆에 작은 원형 프로필 사진 <img src="__PROFILE_IMG__" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />` : ''}
8. 영어 텍스트 사용 금지. 전문분야/요약 넣지 말 것. 제목+이름+로고만.
9. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            summary: `역할: 법률 블로그 핵심 요약 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

블로그 본문:
${content.substring(0, 1500)}

지시사항:
1. 블로그 본문을 읽고 핵심 포인트 3가지를 직접 뽑아서 카드에 넣어.
2. 각 포인트는 한국어 1~2문장으로 간결하게.
3. 800x800px 카드. inline CSS만 사용.
4. 상단에 "핵심 요약" 라벨 + 블로그 주제를 15자 이내로 요약한 부제목.
5. 본문에 3개 포인트를 깔끔하게 나열. 번호 매기지 말고 bullet(•) 또는 구분선 사용.
6. ${brandColor}를 포인트 색상으로 사용.
${hasLogo ? `7. 하단에 로펌 로고 <img src="__LOGO_IMG__" style="height:40px;object-fit:contain;" />` : ''}
8. 다크 배경 (#0c0c14 ~ #1a1a2e 계열). 흰색 텍스트.
9. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            career: `역할: 변호사 경력 소개 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}
${careerText}

지시사항:
1. 800x800px 카드. inline CSS만 사용.
2. 상단에 변호사 이름, 직함, 로펌명 표시.
${hasProfileImg ? `3. 프로필 사진 원형으로 표시: <img src="__PROFILE_IMG__" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid ${brandColor};" />` : ''}
${hasLogo ? `4. 로펌 로고: <img src="__LOGO_IMG__" style="height:45px;object-fit:contain;" />` : ''}
5. 경력사항을 빠짐없이 전부 세로 리스트로 표시. font-size:13px, line-height:1.6으로 빽빽하게.
6. ${brandColor}를 포인트 컬러로 사용.
7. 다크 배경. 흰색 텍스트.
8. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            contact: `역할: 변호사 문의 안내 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

지시사항:
1. 800x800px 카드. inline CSS만 사용.
2. 상단에 변호사 이름 크게, 직함, 로펌명.
${hasProfileImg ? `3. 프로필 사진 원형: <img src="__PROFILE_IMG__" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid ${brandColor};" />` : ''}
${hasLogo ? `4. 로펌 로고 크게: <img src="__LOGO_IMG__" style="height:60px;object-fit:contain;" />` : ''}
5. 연락처 정보를 라벨+값 형태로 명확하게 전부 표시:
   ${profile.phone ? '대표번호: ' + profile.phone : ''}
   ${profile.address ? '주소: ' + profile.address : ''}
   ${profile.website ? '홈페이지: ' + profile.website : ''}
   전문분야: ${specialties}
6. 하단에 "지금 상담 예약하세요" CTA 버튼 (${brandColor} 배경, 흰색 텍스트, border-radius:12px).
7. ${brandColor}를 라벨/포인트 색상으로 사용.
8. 다크 배경. 흰색 텍스트.
9. 블로그 내용이나 요약 절대 넣지 말 것. 연락처 정보만.
10. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,
        };

        const prompt = cardPrompts[cardType];
        if (!prompt) {
            return NextResponse.json({ error: `Unknown card type: ${cardType}` }, { status: 400 });
        }

        const maxTokens = cardType === "career" ? 1500 : 1200;

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: maxTokens,
                temperature: 0.6,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            return NextResponse.json({ error: `Claude ${anthropicRes.status}: ${errText.substring(0, 200)}` }, { status: 500 });
        }

        const data = await anthropicRes.json();
        let html = data.content?.[0]?.text || "";

        // Clean up
        const divStart = html.indexOf("<div");
        if (divStart > 0) html = html.substring(divStart);
        html = html.replace(/```[\s\S]*$/g, "").trim();

        // Replace image placeholders with actual base64 data
        if (hasProfileImg && profile.profileImages[0]) {
            html = html.replace(/__PROFILE_IMG__/g, profile.profileImages[0]);
        }
        if (hasLogo && profile.logoImage) {
            html = html.replace(/__LOGO_IMG__/g, profile.logoImage);
        }

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            summary: "핵심 요약",
            career: "경력 소개",
            contact: "문의 안내",
        };

        return NextResponse.json({
            card: { type: cardType, name: cardNames[cardType] || cardType, html },
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("AI Generation Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
