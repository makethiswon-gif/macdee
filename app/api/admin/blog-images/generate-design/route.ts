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
            thumbnail: `Main poster card. Large title text, lawyer name "${profile.lawyerName}" at bottom.${hasProfileImg ? ' Include circular profile photo (200px, border-radius:50%).' : ''} Background: gradient using ${brandColor} as dominant color.`,
            
            profile_intro: `Lawyer intro card. Name: ${profile.lawyerName}, Title: ${profile.jobTitle || "대표변호사"}, Firm: ${profile.officeName}. Specialties: ${specialties}.${hasProfileImg ? ' Large profile photo (280x350px, border-radius:16px) on the left side.' : ''}${hasLogo ? ' Firm logo (height:40px) at top.' : ''}`,
            
            summary: `3-point summary of blog content. Numbered list with key takeaways. Title at top. Use ${brandColor} for number circles.`,
            
            career: `Career/credentials card. ${profile.lawyerName} ${profile.jobTitle || "대표변호사"}, ${profile.officeName}.
Show ALL career items as a vertical list with clean formatting:
${careerList}
${hasProfileImg ? 'Small circular photo (100px) at top.' : ''}${hasLogo ? ' Firm logo at top.' : ''}`,
            
            contact: `Contact card. Show ALL of this info clearly:
- Name: ${profile.lawyerName} ${profile.jobTitle || "변호사"}
- Firm: ${profile.officeName}
${profile.phone ? '- 대표번호: ' + profile.phone : ''}
${profile.address ? '- 주소: ' + profile.address : ''}
${profile.website ? '- 홈페이지: ' + profile.website : ''}
- 전문분야: ${specialties}
${hasProfileImg ? '- Include circular profile photo (150px).' : ''}
${hasLogo ? '- Include firm logo prominently (height:50px).' : ''}
- Bottom CTA button: "지금 상담 예약하세요" styled with ${brandColor} background.`,
        };

        const systemPrompt = `Generate 1 HTML card (800x800px div, inline CSS only).
COLOR SCHEME: Use ${brandColor} as the PRIMARY/MAIN color. Background should be gradient featuring ${brandColor}. Text: white. Do NOT use dark navy or #0B0F1A as main color. The card should FEEL like ${brandColor} is the brand's signature color.
Font: Pretendard,Noto Sans KR,sans-serif. Flexbox layout. Keep HTML short.
${imgInstructions}
Card: ${cardPrompts[cardType] || cardPrompts.thumbnail}
Blog title: ${title || '제목 없음'}
Blog: ${content.substring(0, 800)}
Output raw HTML only. Start with <div. No explanation.`;

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
