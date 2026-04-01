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

        const hasOfficeImg = !!(profile.officeImages?.length);

        // Image placeholder instructions
        const imgInfo = `이미지 플레이스홀더:
${hasProfileImg ? '- 변호사 프로필 사진: <img src="__PROFILE_IMG__" />' : '- 프로필 사진 없음'}
${hasLogo ? '- 로펌 로고: <img src="__LOGO_IMG__" />' : '- 로고 없음'}
${hasOfficeImg ? '- 사무실 사진: <img src="__OFFICE_IMG__" />' : '- 사무실 사진 없음'}`;

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
2. 800x800px 카드. inline CSS만 사용. 루트 div에 position:relative;overflow:hidden 필수.
${hasOfficeImg ? `3. 배경: 사무실 사진을 전체 배경으로 깔기 — <img src="__OFFICE_IMG__" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" /> 그 위에 어두운 오버레이 div: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(180deg,${brandColor}cc 0%,rgba(0,0,0,0.85) 100%);"></div>` : `3. background: linear-gradient(135deg, ${brandColor}dd 0%, ${brandColor}88 50%, #0a0a0a 100%)`}
4. 모든 텍스트/콘텐츠는 position:relative;z-index:1 로 오버레이 위에 표시.
5. 제목을 크고 굵게 (font-size:38~44px, font-weight:800) 중앙 배치.
6. 하단에 "${profile.lawyerName} ${profile.jobTitle || '변호사'}" 이름 작게.
${hasLogo ? `7. 상단에 로펌 로고 <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;position:relative;z-index:1;" /> (로고에 이미 로펌명이 포함되어 있으므로 텍스트로 로펌명을 따로 쓰지 말 것)` : ''}
${hasProfileImg ? `8. 하단에 프로필 사진을 크게 원형으로: <img src="__PROFILE_IMG__" style="width:150px;height:150px;border-radius:50%;object-fit:cover;position:relative;z-index:1;border:3px solid rgba(255,255,255,0.3);" />` : ''}
9. 제목+이름+로고+프로필사진만. 전문분야, 요약, 카테고리 라벨 넣지 말 것.
10. font-family:'Pretendard','Noto Sans KR',sans-serif

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
3. 800x800px 카드. inline CSS만 사용. 루트 div에 position:relative;overflow:hidden 필수.
${hasOfficeImg ? `4. 배경: 사무실 사진을 블러 처리하여 배경으로 — <img src="__OFFICE_IMG__" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:blur(8px);transform:scale(1.1);" /> 그 위에 반투명 어두운 오버레이: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);"></div>` : '4. 다크 배경(#0c0c14).'}
5. 모든 텍스트/콘텐츠는 position:relative;z-index:1 로 오버레이 위에 표시.
6. 상단에 "핵심 요약" 라벨(${brandColor} 색상) + 블로그 주제를 15자 이내로 요약한 부제목.
7. 3개 포인트를 세로로 나열. 각 포인트 앞에 ${brandColor} 색상 원형 bullet(width:8px, height:8px, border-radius:50%).
8. 각 포인트 사이에 충분한 간격(gap:24px).
${hasLogo ? `9. 하단에 로펌 로고 <img src="__LOGO_IMG__" style="height:40px;object-fit:contain;position:relative;z-index:1;" />` : ''}
10. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            career: `역할: 로펌 브랜드 이미지를 HTML로 코딩해.

로펌: ${profile.officeName}
${imgInfo}
브랜드컬러: ${brandColor}
${(profile.brandLines || []).length > 0 ? '브랜드 메시지/슬로건:\n' + (profile.brandLines || []).map((b: string) => `- ${b}`).join('\n') : ''}
전문분야: ${specialties}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 position:relative;overflow:hidden 필수.
${hasOfficeImg ? `2. 배경: 사무실 사진을 전체 배경으로 — <img src="__OFFICE_IMG__" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" /> 그 위에 ${brandColor} 계열 그라데이션 오버레이: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(180deg,${brandColor}ee 0%,rgba(0,0,0,0.7) 100%);"></div>` : `2. background: linear-gradient(135deg, ${brandColor} 0%, #0a0a0a 100%)`}
3. 모든 콘텐츠는 position:relative;z-index:1 로 오버레이 위에.
${hasLogo ? `4. 로펌 로고를 크고 중앙에 한 번만: <img src="__LOGO_IMG__" style="height:120px;object-fit:contain;position:relative;z-index:1;" /> (로고에 이미 로펌명이 포함되어 있으므로 텍스트로 로펌명을 따로 쓰지 말 것)` : ''}
5. 로고 아래에 슬로건/브랜드 메시지만 표시. 로펌명 텍스트는 쓰지 말 것.
${(profile.brandLines || []).length > 0 ? '6. 브랜드 메시지/슬로건을 세련되게 표시 (font-size:18~20px, 약간 투명한 흰색).' : '6. 전문분야를 세련되게 나열.'}
7. 전체적으로 고급스러운 브랜드 이미지 느낌.
8. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            contact: (() => {
                // Parse phone numbers into separate lines
                const phoneRaw = profile.phone || '';
                const phoneLines = phoneRaw.split(/[,，]/).map((p: string) => p.trim()).filter((p: string) => p);
                const phoneLinesText = phoneLines.length > 0 
                    ? phoneLines.map((p: string) => `   • ${p}`).join('\n') 
                    : '   • 미등록';
                
                return `역할: 변호사 명함 스타일 문의 안내 이미지를 HTML로 코딩해.

${imgInfo}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항 - 명함 디자인:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
2. 명함처럼 깔끔하고 정돈된 레이아웃:
   - 상단 35%: ${brandColor} 계열 그라데이션 배경에 로고와 변호사 이름+직함.
   - 하단 65%: 어두운 배경에 연락처 정보.
${hasProfileImg ? `3. 프로필 사진 원형: <img src="__PROFILE_IMG__" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid white;" />` : ''}
${hasLogo ? `4. 로펌 로고 한 번만: <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;" /> (로고에 이미 로펌명 포함. 텍스트로 로펌명 따로 쓰지 말 것)` : ''}
5. 변호사: ${profile.lawyerName} ${profile.jobTitle || '변호사'}
6. 하단 연락처에 반드시 아래 내용을 빠짐없이 전부 표시해:

전화번호 (각각 별도 줄로):
${phoneLinesText}

홈페이지: ${profile.website || '미등록'}
주소: ${profile.address || '미등록'}
전문분야: ${specialties}

7. 위 연락처 정보가 카드에서 반드시 보여야 함. 빠뜨리면 안 됨.
8. 맨 하단에 "지금 상담 예약하세요" 버튼 (background:${brandColor}, color:white, padding:12px 36px, border-radius:10px, font-weight:700).
9. font-family:'Pretendard','Noto Sans KR',sans-serif

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`;
            })(),
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

        // Replace image placeholders with actual base64 data (random selection)
        if (hasProfileImg) {
            const idx = Math.floor(Math.random() * profile.profileImages.length);
            html = html.replace(/__PROFILE_IMG__/g, profile.profileImages[idx]);
        }
        if (hasLogo && profile.logoImage) {
            html = html.replace(/__LOGO_IMG__/g, profile.logoImage);
        }
        if (hasOfficeImg) {
            const idx = Math.floor(Math.random() * profile.officeImages.length);
            html = html.replace(/__OFFICE_IMG__/g, profile.officeImages[idx]);
        }

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            summary: "핵심 요약",
            career: "로펌 브랜드",
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
