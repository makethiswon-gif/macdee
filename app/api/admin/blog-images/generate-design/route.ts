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

        const cardInstructions: Record<string, string> = {
            thumbnail: `Generate a "thumbnail" card: A visually striking main poster. Include the blog title prominently, a sophisticated CSS background (gradients, glows), and the lawyer's name at the bottom.`,
            summary: `Generate a "summary" card: A content card with exactly 3 key takeaways from the blog text. Highly readable layout with numbered points or icons. Premium dark aesthetic.`,
            contact: `Generate a "contact" card: A professional contact/outro card showing the lawyer's name, firm name, specialty areas, and a call-to-action message encouraging consultation.`,
        };

        const systemPrompt = `You are an elite UI designer. Generate exactly ONE blog image card as pure HTML with inline CSS.

RULES:
- INLINE CSS ONLY (style="..."). No external CSS, no <style> tags, no Tailwind.
- Root div MUST be: width:800px; height:800px; position:relative; overflow:hidden;
- Dark premium aesthetic. Base: #0B0F1A. Use brandColor as accent.
- Font: 'Pretendard','Noto Sans KR',sans-serif. Bold titles, letter-spacing.
- Use CSS gradients, subtle glows, flexbox layouts.
- Keep HTML minimal and dense.

${cardInstructions[cardType] || cardInstructions.thumbnail}

OUTPUT FORMAT - Output ONLY the raw HTML string starting with <div. No JSON wrapper, no explanation, no markdown. Just the HTML.`;

        const userMessage = `LAWYER: ${profile.lawyerName} | ${profile.officeName || '미등록'} | ${(profile.specialty || []).join(', ') || '전문분야 없음'} | Brand: ${profile.brandColor || '#3563AE'}
TITLE: ${title || '제목 없음'}
CONTENT: ${content.substring(0, 1500)}`;

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
        // Remove trailing markdown backticks if present
        html = html.replace(/```\s*$/g, "").trim();

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            summary: "핵심 요약",
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
