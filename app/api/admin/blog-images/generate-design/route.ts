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

필수 규칙: 영어 단어 절대 사용 금지 (Legal, Insight, Criminal 등). 모든 텍스트 한국어만.

지시사항:
1. 블로그 본문을 읽고 핵심을 담은 매력적인 한국어 제목을 20자 이내로 직접 작성해서 카드에 넣어.
2. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
3. background: linear-gradient(135deg, ${brandColor}dd 0%, ${brandColor}88 50%, #0a0a0a 100%) 같은 형태로 ${brandColor}를 배경 그라데이션의 주인공으로 사용.
4. 제목을 크고 굵게 (font-size:38~44px, font-weight:800) 중앙 배치.
5. 하단에 "${profile.lawyerName} ${profile.jobTitle || '변호사'}" 이름 작게.
${hasLogo ? `6. 상단에 로펌 로고 <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;" />` : ''}
${hasProfileImg ? `7. 하단 이름 옆에 작은 원형 프로필 사진 <img src="__PROFILE_IMG__" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />` : ''}
8. 제목+이름+로고만 넣을 것. 전문분야, 요약, 카테고리 라벨 넣지 말 것.
9. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            summary: `역할: 법률 블로그 핵심 요약 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

블로그 본문:
${content.substring(0, 1500)}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항:
1. 블로그 본문을 읽고 핵심 포인트를 정확히 3개 뽑아서 카드에 넣어. 반드시 3개, 2개도 4개도 안 됨.
2. 각 포인트는 한국어 1~2문장(40자 이내)으로 간결하게.
3. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
4. 상단에 "핵심 요약" 라벨(${brandColor} 색상) + 블로그 주제를 15자 이내로 요약한 부제목.
5. 3개 포인트를 세로로 나열. 각 포인트 앞에 ${brandColor} 색상 원형 bullet(width:8px, height:8px, border-radius:50%).
6. 각 포인트 사이에 충분한 간격(gap:24px).
${hasLogo ? `7. 하단에 로펌 로고 <img src="__LOGO_IMG__" style="height:40px;object-fit:contain;" />` : ''}
8. 다크 배경. 흰색 텍스트.
9. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            career: `역할: 변호사 경력 소개 이미지를 HTML로 코딩해.

변호사: ${profile.lawyerName} ${profile.jobTitle || "대표변호사"} | ${profile.officeName}
${imgInfo}
${careerText}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만. 연락처/전화번호/주소 넣지 말 것. 경력 정보만.

지시사항:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
2. 상단 영역을 작게: 이름+직함+로펌명 한 줄로.
${hasProfileImg ? `3. 프로필 사진 원형 작게: <img src="__PROFILE_IMG__" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid ${brandColor};" />` : ''}
${hasLogo ? `4. 로펌 로고 작게: <img src="__LOGO_IMG__" style="height:35px;object-fit:contain;" />` : ''}
5. "주요 경력" 라벨(${brandColor} 색상) 후 구분선.
6. 핵심: 경력사항을 한 줄도 빠짐없이 전부 표시. 경력이 많으니 font-size:11px, line-height:1.4로 최대한 빽빽하게 넣어.
7. 각 경력 앞에 작은 ${brandColor} bullet(•).
8. word-break:keep-all. 텍스트가 넘치면 안 됨.
9. 다크 배경. 흰색 텍스트.
10. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            contact: `역할: 변호사 명함 스타일 문의 안내 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항 - 명함(비즈니스 카드) 디자인:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
2. 명함처럼 깔끔하고 정돈된 레이아웃:
   - 상단 40%: ${brandColor} 계열 그라데이션 배경 영역에 로펌명, 로고, 변호사 이름+직함을 크게.
   - 하단 60%: 어두운 배경에 연락처 정보를 정돈되게 나열.
${hasProfileImg ? `3. 프로필 사진을 상단과 하단 경계에 걸치게 원형으로 크게 배치: <img src="__PROFILE_IMG__" style="width:130px;height:130px;border-radius:50%;object-fit:cover;border:4px solid white;" />` : ''}
${hasLogo ? `4. 상단 영역에 로펌 로고: <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;" />` : ''}
5. 하단에 연락처 정보를 아이콘 없이 라벨+값으로 깔끔하게:
   대표번호: ${profile.phone || '미등록'}
   주소: ${profile.address || '미등록'}
   홈페이지: ${profile.website || '미등록'}
   전문분야: ${specialties}
6. 맨 하단에 "지금 상담 예약하세요" 버튼 (background:${brandColor}, color:white, padding:12px 36px, border-radius:10px, font-weight:700).
7. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,
        };

        const prompt = cardPrompts[cardType];
        if (!prompt) {
            return NextResponse.json({ error: `Unknown card type: ${cardType}` }, { status: 400 });
        }

        const maxTokens = cardType === "career" ? 1800 : 1200;

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
