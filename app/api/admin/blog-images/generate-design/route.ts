import { NextResponse } from "next/server";
import { generateBlogContentImage } from "@/lib/ai/image-generate";
import { getLawyerDesignDNA } from "@/lib/blog-images/design-dna";
import { extractLogoColor } from "@/lib/blog-images/logo-color";

export const maxDuration = 90;

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

        const hasProfileImg = !!(profile.profileImages?.length);
        const hasLogo = !!profile.logoImage;

        // 로고에서 대표 색상 추출 → brandColor로 사용
        let brandColor = profile.brandColor || "#3563AE";
        if (hasLogo && profile.logoImage) {
            const logoColor = await extractLogoColor(profile.logoImage);
            if (logoColor) {
                console.log(`[generate-design] brandColor ${brandColor} → ${logoColor} (extracted from logo)`);
                brandColor = logoColor;
            }
        }

        // 변호사별 디자인 DNA (lawyerId 기반 결정론적)
        const dna = getLawyerDesignDNA(profile.id || profile.lawyerName || "default", brandColor);
        console.log(`[generate-design] DNA for ${profile.lawyerName}: ${dna.layoutFamily.name} / ${dna.typoFamily.name} / ${dna.accentFamily.name}`);

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            illustration: "관련 일러스트",
            contact: "문의 안내",
        };

        // ── thumbnail / illustration: AI 이미지 단독 (텍스트 오버레이·HTML 코딩 단계 없음) ──
        if (cardType === "thumbnail" || cardType === "illustration") {
            const style = cardType === "thumbnail" ? "realistic" : "webtoon";
            // 프로필 사진 첫 번째 장 사용 (없으면 undefined)
            const profileImageUrl = profile.profileImages?.[0] ?? undefined;
            try {
                const img = await generateBlogContentImage(content, title || "", style, profileImageUrl);
                const dataUrl = `data:image/png;base64,${img.imageBase64}`;
                const html = `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:#000;"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" /></div>`;
                return NextResponse.json({
                    card: { type: cardType, name: cardNames[cardType], html },
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[generate-design] ${cardType} AI image error:`, msg);
                return NextResponse.json({ error: msg }, { status: 500 });
            }
        }

        // 이하부터는 contact 카드 전용 (Claude HTML 코딩)
        const variationDirective = `
[이 변호사의 디자인 DNA]
- 무드: "${dna.bgMoodFamily.name}" → ${dna.bgMoodFamily.htmlSpec}
- 타이포: "${dna.typoFamily.name}" → ${dna.typoFamily.spec}
- 악센트: "${dna.accentFamily.name}" → ${dna.accentFamily.spec}
`;

        const systemMessage = `당신은 최고급 법률 브랜드를 위한 미니멀리스트 비주얼 디렉터입니다.
레퍼런스: Apple 제품 페이지, Bottega Veneta 광고, 대형 로펌 연간 보고서 표지.

[CSS 품질]
- 폰트: HTML 첫 줄 <style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');</style>
- 루트 div: position:relative;overflow:hidden;width:800px;height:800px 필수
- 모든 콘텐츠: position:relative;z-index:1 이상

출력: <style>...</style>로 시작하는 순수 HTML+인라인CSS만. 설명 없이.`;

        const cardPrompts: Record<string, string> = {

            contact: (() => {
                const phoneRaw = profile.phone || "";
                const phoneLines = phoneRaw.split(/[,，]/).map((p: string) => p.trim()).filter(Boolean);

                return `변호사 연락처 카드. 명함처럼 깔끔하고 정돈된 레이아웃.

${hasProfileImg ? `프로필 사진 (원형): <img src="__PROFILE_IMG__" />` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" />` : ""}

[카드 표시 정보 — 이것만]
- 이름+직함: ${profile.lawyerName} ${profile.jobTitle || "변호사"}
${phoneLines.length > 0 ? `- 전화: ${phoneLines.join(" / ")}` : ""}
${profile.website ? `- 홈페이지: ${profile.website}` : ""}

레이아웃: 상단 40% = ${brandColor} 그라데이션 배경 + ${hasProfileImg ? "원형 프로필 사진 + 이름" : "이름+직함"}, 하단 60% = 어두운 배경 + 연락처 정보.
연락처는 아이콘 없이 텍스트만 간결하게. 줄 간격 넉넉히.
${hasLogo ? "하단 최하단에 로펌 로고 (height:36px)." : ""}

${variationDirective}

font-family:'Noto Sans KR',sans-serif
800x800px, inline CSS만.`;
            })(),
        };

        const prompt = cardPrompts[cardType];
        if (!prompt) {
            return NextResponse.json({ error: `Unknown card type: ${cardType}` }, { status: 400 });
        }

        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                system: systemMessage,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            return NextResponse.json({ error: `Claude ${anthropicRes.status}: ${errText.substring(0, 200)}` }, { status: 500 });
        }

        const data = await anthropicRes.json();
        let html = data.content?.[0]?.text || "";

        // <style> 블록 유지 (폰트 import용)
        const styleStart = html.indexOf("<style");
        const divStart = html.indexOf("<div");
        const cutStart = styleStart !== -1 && (divStart === -1 || styleStart < divStart)
            ? styleStart
            : divStart;
        if (cutStart > 0) html = html.substring(cutStart);
        html = html.replace(/```[\s\S]*$/g, "").trim();

        // Placeholder 치환 (contact 카드는 프로필 사진·로고만 사용)
        if (hasProfileImg) {
            const idx = Math.floor(Math.random() * profile.profileImages.length);
            html = html.replace(/__PROFILE_IMG__/g, profile.profileImages[idx]);
        }
        if (hasLogo && profile.logoImage) {
            html = html.replace(/__LOGO_IMG__/g, profile.logoImage);
        }

        return NextResponse.json({
            card: { type: cardType, name: cardNames[cardType] || cardType, html },
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("AI Generation Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
