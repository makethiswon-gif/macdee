import { NextResponse } from "next/server";
import { getContentGenerator } from "@/lib/ai/providers";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan, safe fallback

// Helper to strip markdown json wrapper if present
function parseJSONP(str: string) {
    let clean = str.trim();
    // Try to extract JSON object from between { and }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
}

export async function POST(req: Request) {
    try {
        const { profile, content, title } = await req.json();

        if (!profile || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const claude = getContentGenerator();

        const systemPrompt = `
You are an elite, modern UI/UX Web Designer specializing in generating stunning blog poster images via HTML and CSS.
The user will provide a blog post excerpt, a title, and a lawyer's profile.
Your task is to generate exactly 3 highly stylized, aesthetic 'Image Cards' that the lawyer can screenshot and use in their Naver blog.

# THE THREE CARDS:
1. "thumbnail": A visually striking main poster. Include the title, a sophisticated background, and the lawyer's name.
2. "summary": A content card with a 3-point summary (or key takeaways) of the blog text. Highly readable but extremely premium layout.
3. "contact": A professional contact/outro card showing the lawyer/firm name, specialty, and contact encouragement.

# DESIGN REQUIREMENTS:
- Use INLINE CSS exclusively for styling (\`style="..."\`). DO NOT use external stylesheets or Tailwind classes, as the renderer will strip them.
- Dimension: Each card's outermost \`div\` MUST have \`width: 800px; height: 800px;\` and \`position: relative;\` and \`overflow: hidden;\`.
- Aesthetic: Deep, premium, professional feeling. Use 'macdee.' branding style (dark tones like #0B0F1A, rich gradients, glassmorphism, subtle glows).
- Colors: Incorporate the lawyer's \`brandColor\` elegantly (e.g., as a gradient stop or glow effect). Use #FFFFFF or very light gray for text.
- Typography: Use standard sans-serif (e.g. \`font-family: 'Pretendard', 'Noto Sans KR', sans-serif;\`). Make titles extra large and bold. Use tracking (\`letter-spacing\`) and tight line-heights.
- Backgrounds: Code beautiful CSS backgrounds. example: \`background: radial-gradient(circle at 20% 50%, rgba(...) 0%, #060810 80%);\` or add floating blurred orbs.
- Layout: Use Flexbox extensively (\`display: flex; flex-direction: column; align-items: ...; justify-content: ...\`).
- If profile has \`profileImages\`, you MAY use the first image URL (\`profile.profileImages[0]\`) creatively (e.g., as a background with \`mix-blend-mode: luminosity\` or inside a circular mask). If not, rely entirely on CSS typography and shapes.

# JSON OUTPUT FORMAT:
Output ONLY valid JSON matching this schema:
{
  "cards": [
    {
      "type": "thumbnail",
      "name": "메인 썸네일",
      "html": "<div style='width: 800px; height: 800px; flex-shrink: 0; display: flex; ...'>...</div>"
    },
    ...
  ]
}
Do not include any explanation. Output pure JSON. Keep the HTML/CSS structure as minimal, dense, and clean as possible to prioritize fast generation over unnecessary complexity.
`;

        const userMessage = `
--- LAWYER PROFILE ---
Name: ${profile.lawyerName}
Firm: ${profile.officeName || '미등록'}
Specialties: ${profile.specialty?.join(', ') || '전문분야 없음'}
Brand Color: ${profile.brandColor || '#3563AE'}
Profile Image URL: ${profile.profileImages?.[0] || 'None'}

--- BLOG INPUT ---
Title: ${title || 'No Title Given'}
Content: ${content.substring(0, 3000)} // Using the first 3000 chars for context
`;

        const response = await claude.generate([
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ], {
            temperature: 0.7,
            maxTokens: 4096
        });

        const parsedData = parseJSONP(response.content);

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate designs" }, { status: 500 });
    }
}
