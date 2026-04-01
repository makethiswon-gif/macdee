import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { profile, content, title, cardType } = await req.json();

        if (!profile || !content || !cardType) {
            return NextResponse.json({ error: "Missing required fields (profile, content, cardType)" }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
        }

        // Build rich profile context
        const profileImageUrl = profile.profileImages?.[0] || "";
        const officeImageUrl = profile.officeImages?.[0] || "";
        const logoImageUrl = profile.logoImage || "";
        const brandColor = profile.brandColor || "#3563AE";
        const career = (profile.career || []).filter((c: string) => c.trim()).join("\n- ");
        const brandLines = (profile.brandLines || []).filter((b: string) => b.trim()).join(" | ");

        const cardInstructions: Record<string, string> = {
            thumbnail: `Generate a "thumbnail" card (메인 썸네일):
A visually striking main poster for a Naver blog post.
- Display the blog TITLE prominently in large, elegant Korean typography.
- Use the brandColor (${brandColor}) as the primary accent color for gradients, glows, or highlights.
${profileImageUrl ? `- IMPORTANT: Include the lawyer's profile photo using <img src="${profileImageUrl}" style="..."/> — display it as a circular portrait (border-radius:50%) or a stylish cropped element.` : "- No profile photo available. Use abstract geometric shapes and typography-focused design."}
- Show the lawyer's name (${profile.lawyerName}) and title (${profile.jobTitle || "변호사"}) at the bottom.
- Background should use brandColor-based gradient.`,

            profile_intro: `Generate a "profile_intro" card (변호사 프로필 소개):
A professional introduction card showcasing the lawyer.
- Show the lawyer's name (${profile.lawyerName}), title (${profile.jobTitle || "대표변호사"}), and firm (${profile.officeName}).
${profileImageUrl ? `- CRITICAL: Display the lawyer's profile photo prominently using <img src="${profileImageUrl}" style="width:280px;height:350px;object-fit:cover;border-radius:16px;"/>` : "- No profile photo. Use initials in a large circle."}
${logoImageUrl ? `- Include the firm logo: <img src="${logoImageUrl}" style="height:50px;object-fit:contain;"/>` : ""}
- List specialties: ${(profile.specialty || []).join(", ") || "전문분야 없음"}
- Use brandColor (${brandColor}) prominently as accent.
${brandLines ? `- Include brand message: "${brandLines}"` : ""}`,

            summary: `Generate a "summary" card (핵심 요약):
A content card with exactly 3 key takeaways from the blog text.
- Create a highly readable layout with numbered points or styled bullet points.
- Each point should be a concise 1-2 sentence summary.
- Use brandColor (${brandColor}) for accent colors on numbers/icons.
- Premium dark aesthetic with clear hierarchy.
- Show the blog title at the top as context.`,

            career: `Generate a "career" card (경력 소개):
A professional career/credentials card.
- Show the lawyer's name: ${profile.lawyerName}, title: ${profile.jobTitle || "대표변호사"}
- Firm: ${profile.officeName}
${career ? `- List these career items elegantly:\n- ${career}` : "- Display the firm name and specialty areas prominently."}
${profileImageUrl ? `- Include a small circular profile photo: <img src="${profileImageUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:50%;border:3px solid ${brandColor};"/>` : ""}
${logoImageUrl ? `- Include firm logo: <img src="${logoImageUrl}" style="height:40px;object-fit:contain;"/>` : ""}
- Use brandColor (${brandColor}) as accent throughout.`,

            contact: `Generate a "contact" card (문의 안내):
A professional contact/CTA card encouraging consultation.
- Show: ${profile.lawyerName} ${profile.jobTitle || "변호사"} | ${profile.officeName}
${profile.phone ? `- Phone: ${profile.phone}` : ""}
${profile.address ? `- Address: ${profile.address}` : ""}
${profile.website ? `- Website: ${profile.website}` : ""}
- Specialties: ${(profile.specialty || []).join(", ") || "전문분야 없음"}
${logoImageUrl ? `- Include firm logo prominently: <img src="${logoImageUrl}" style="height:60px;object-fit:contain;"/>` : ""}
${profileImageUrl ? `- Include profile photo: <img src="${profileImageUrl}" style="width:150px;height:150px;object-fit:cover;border-radius:50%;border:3px solid ${brandColor};"/>` : ""}
- Use brandColor (${brandColor}) as primary accent.
- Include a clear CTA message like "지금 상담 예약하세요" styled prominently.`,
        };

        const systemPrompt = `You are an elite Korean legal marketing designer. Generate ONE blog image card as pure HTML with inline CSS.

ABSOLUTE RULES:
- INLINE CSS ONLY (style="..."). NO <style> tags. NO external CSS. NO Tailwind.
- Root div MUST be exactly: width:800px; height:800px; position:relative; overflow:hidden;
- Use the brand color ${brandColor} as the PRIMARY accent color throughout (gradients, borders, glows, text highlights).
- Font: font-family:'Pretendard','Noto Sans KR',sans-serif;
- Dark premium aesthetic base (#0B0F1A or similar dark tone).
- When given an image URL, use <img src="URL" style="..." /> to embed it. The URL is a valid data URI or web URL.
- All text must be in Korean where applicable.
- Use CSS gradients, box-shadow glows, flexbox layouts.
- Keep HTML minimal but visually stunning.

${cardInstructions[cardType] || cardInstructions.thumbnail}

OUTPUT: Raw HTML only starting with <div. No JSON, no markdown, no explanation.`;

        const userMessage = `Blog Title: ${title || '제목 없음'}
Blog Content: ${content.substring(0, 1500)}`;

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 2048,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            console.error("Anthropic API error:", anthropicRes.status, errText);
            return NextResponse.json({ error: `Claude API error: ${anthropicRes.status} ${errText}` }, { status: 500 });
        }

        const data = await anthropicRes.json();
        let html = data.content?.[0]?.text || "";

        // Clean up: ensure it starts with <div
        const divStart = html.indexOf("<div");
        if (divStart > 0) html = html.substring(divStart);
        html = html.replace(/```\s*$/g, "").trim();

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            profile_intro: "변호사 프로필",
            summary: "핵심 요약",
            career: "경력 소개",
            contact: "문의 안내",
        };

        return NextResponse.json({
            card: {
                type: cardType,
                name: cardNames[cardType] || cardType,
                html,
            },
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("AI Generation Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
