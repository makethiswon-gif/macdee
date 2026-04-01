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
        const hasOfficeImg = !!(profile.officeImages?.length);
        const allCareer = (profile.career || []).filter((c: string) => c.trim());
        const specialties = (profile.specialty || []).join(", ") || "전문분야 없음";

        const imgTags = `${hasProfileImg ? '<img src="__PROFILE_IMG__" />를 변호사 사진으로 사용.' : ''}
${hasLogo ? '<img src="__LOGO_IMG__" />를 로펌 로고로 사용.' : ''}
${hasOfficeImg ? '<img src="__OFFICE_IMG__" />를 사무실 사진으로 사용.' : ''}`;

        const careerLines = allCareer.map((c: string) => `• ${c}`).join('\n');

        // Each card type gets its OWN complete prompt - no shared blog content except for summary
        const prompts: Record<string, string> = {
            thumbnail: `800x800px HTML 카드 1장. inline CSS only. ${brandColor} 메인 컬러. 흰색 텍스트. 영어 금지.
${imgTags}
내용: 블로그 제목 "${title || '제목 없음'}"을 크고 굵게 중앙 배치. 하단에 "${profile.lawyerName} 변호사" 이름만 작게.
${hasLogo ? '상단에 로펌 로고(height:80px).' : ''}
절대 금지: 글 요약, 전문분야, 핵심포인트, 부연설명. 오직 제목+이름+로고만 넣을 것.
<div 로 시작하는 HTML만 출력.`,

            summary: `800x800px HTML 카드 1장. inline CSS only. ${brandColor} 메인 컬러. 흰색 텍스트. 영어 금지.
${imgTags}
내용: 블로그 핵심 요약 카드.
상단에 제목: "${title || '제목 없음'}"
본문에서 핵심 포인트 3개를 bullet point(•)로 정리. 번호 사용하지 말 것.
각 포인트는 2줄 이내로 간결하게.
${hasLogo ? '하단에 로펌 로고(height:80px).' : ''}
블로그 본문: ${content.substring(0, 800)}
<div 로 시작하는 HTML만 출력.`,

            career: `800x800px HTML 카드 1장. inline CSS only. ${brandColor} 메인 컬러. 흰색 텍스트. 영어 금지.
${imgTags}
내용: 경력 소개 카드.
${profile.lawyerName} ${profile.jobTitle || "대표변호사"} | ${profile.officeName}
${hasProfileImg ? '프로필 사진 원형(100px).' : ''}
${hasLogo ? '로펌 로고(height:80px).' : ''}
아래 경력사항을 빠짐없이 전부 세로로 나열:
${careerLines}
경력이 많으므로 font-size:13~14px로 작게, line-height:1.6으로 빽빽하게 배치.
글 요약이나 블로그 내용 절대 넣지 말 것.
<div 로 시작하는 HTML만 출력.`,

            contact: `800x800px HTML 카드 1장. inline CSS only. ${brandColor} 메인 컬러. 흰색 텍스트. 영어 금지.
${imgTags}
내용: 문의 안내 카드. 아래 연락처 정보만 표시:
${profile.lawyerName} ${profile.jobTitle || "변호사"}
${profile.officeName}
${profile.phone ? '대표번호: ' + profile.phone : ''}
${profile.address ? '주소: ' + profile.address : ''}
${profile.website ? '홈페이지: ' + profile.website : ''}
전문분야: ${specialties}
${hasProfileImg ? '프로필 사진 원형(150px).' : ''}
${hasLogo ? '로펌 로고 크게(height:80px).' : ''}
하단에 "지금 상담 예약하세요" CTA 버튼.
절대 금지: 블로그 요약, 핵심포인트, 글 내용. 연락처 정보만 넣을 것.
<div 로 시작하는 HTML만 출력.`,
        };

        const prompt = prompts[cardType];
        if (!prompt) {
            return NextResponse.json({ error: `Unknown card type: ${cardType}` }, { status: 400 });
        }

        // Career card needs more tokens for long career lists
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
                temperature: 0.5,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            return NextResponse.json({ error: `Claude ${anthropicRes.status}: ${errText.substring(0, 200)}` }, { status: 500 });
        }

        const data = await anthropicRes.json();
        let html = data.content?.[0]?.text || "";

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
        if (hasOfficeImg && profile.officeImages[0]) {
            html = html.replace(/__OFFICE_IMG__/g, profile.officeImages[0]);
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
