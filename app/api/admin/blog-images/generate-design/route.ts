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

        // Extract profile data WITHOUT base64 images (those are huge!)
        const brandColor = profile.brandColor || "#3563AE";
        const hasProfileImg = !!(profile.profileImages?.length);
        const hasLogo = !!profile.logoImage;
        const hasOfficeImg = !!(profile.officeImages?.length);
        const allCareer = (profile.career || []).filter((c: string) => c.trim());
        const specialties = (profile.specialty || []).join(", ") || "전문분야 없음";

        const imgInstructions = `
${hasProfileImg ? 'Use <img src="__PROFILE_IMG__" /> for the lawyer photo.' : 'No lawyer photo available.'}
${hasLogo ? 'Use <img src="__LOGO_IMG__" /> for the firm logo.' : ''}
${hasOfficeImg ? 'Use <img src="__OFFICE_IMG__" /> for the office photo.' : ''}`;

        // Build career list string for prompt
        const careerList = allCareer.length > 0
            ? allCareer.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')
            : '경력 정보 없음';

        const cardPrompts: Record<string, string> = {
            thumbnail: `메인 썸네일 포스터. 블로그 제목을 크고 굵은 한국어 텍스트로 중앙에 배치. 하단에 "${profile.lawyerName} 변호사" 이름만 작게 표시.${hasProfileImg ? ' 프로필 사진 원형(200px, border-radius:50%)으로 포함.' : ''}${hasLogo ? ' 로펌 로고(height:80px) 상단에 포함.' : ''} 영어 텍스트 절대 사용 금지. 전문분야/요약 텍스트 넣지 말 것. 제목과 이름만.`,
            
            profile_intro: `변호사 소개 카드. ${profile.lawyerName} ${profile.jobTitle || "대표변호사"}, ${profile.officeName}. 전문분야: ${specialties}.${hasProfileImg ? ' 프로필 사진 크게(280x350px, border-radius:16px) 배치.' : ''}${hasLogo ? ' 로펌 로고(height:80px) 상단.' : ''}`,
            
            summary: `핵심 요약 카드. 블로그 내용에서 핵심 포인트 3가지를 번호 매겨 정리. 제목 상단에 표시. ${brandColor} 컬러로 번호 강조.${hasLogo ? ' 로펌 로고(height:80px) 하단에 포함.' : ''}`,
            
            career: `경력 소개 카드. ${profile.lawyerName} ${profile.jobTitle || "대표변호사"}, ${profile.officeName}.
아래 경력을 번호 리스트로 전부 표시:
${careerList}
${hasProfileImg ? '프로필 사진 원형(120px) 포함.' : ''}${hasLogo ? ' 로펌 로고(height:80px) 포함.' : ''}`,
            
            contact: `문의 안내 카드. 아래 정보를 모두 명확하게 표시:
- ${profile.lawyerName} ${profile.jobTitle || "변호사"}
- ${profile.officeName}
${profile.phone ? '- 대표번호: ' + profile.phone : ''}
${profile.address ? '- 주소: ' + profile.address : ''}
${profile.website ? '- 홈페이지: ' + profile.website : ''}
- 전문분야: ${specialties}
${hasProfileImg ? '- 프로필 사진 원형(150px) 포함.' : ''}
${hasLogo ? '- 로펌 로고 크게(height:80px) 포함.' : ''}
- 하단에 "지금 상담 예약하세요" CTA 버튼 (${brandColor} 배경).`,
        };

        const systemPrompt = `HTML 카드 1장 생성 (800x800px div, inline CSS only).
색상: ${brandColor}를 메인 컬러로 사용. 배경 그라데이션에 ${brandColor} 반영. 텍스트 흰색. 다크 네이비(#0B0F1A) 사용 금지.
폰트: Pretendard,Noto Sans KR,sans-serif. Flexbox. 간결한 HTML.
모든 텍스트는 한국어로만 작성. 영어 사용 금지.
${imgInstructions}
${cardPrompts[cardType] || cardPrompts.thumbnail}
블로그 제목: ${title || '제목 없음'}
블로그 내용: ${content.substring(0, 800)}
<div 로 시작하는 HTML만 출력. 설명 금지.`;

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 1200,
                temperature: 0.6,
                messages: [{ role: "user", content: systemPrompt }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            return NextResponse.json({ error: `Claude ${anthropicRes.status}: ${errText.substring(0, 200)}` }, { status: 500 });
        }

        const data = await anthropicRes.json();
        let html = data.content?.[0]?.text || "";

        // Clean: ensure starts with <div
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
            profile_intro: "변호사 프로필",
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
