import { NextResponse } from "next/server";
import { generateBlogContentImage } from "@/lib/ai/image-generate";
import { getLawyerDesignDNA } from "@/lib/blog-images/design-dna";
import { extractLogoColor } from "@/lib/blog-images/logo-color";

export const maxDuration = 90;

async function generateShortTitle(content: string, existingTitle: string, apiKey: string): Promise<string> {
    // 기존 제목이 이미 10자 이하면 그대로 사용
    if (existingTitle && Array.from(existingTitle).length <= 10) return existingTitle;

    const source = existingTitle
        ? `제목: ${existingTitle}\n\n본문: ${content.substring(0, 400)}`
        : content.substring(0, 500);

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 30,
                messages: [{ role: "user", content: `다음 블로그 글의 핵심을 8~10자 이내 임팩트 있는 한글 제목으로 만드세요. 절대 10자를 넘기면 안됩니다. 제목만 출력. 따옴표·번호 없이.\n\n${source}` }],
            }),
        });
        if (!res.ok) return existingTitle ? Array.from(existingTitle).slice(0, 10).join("") : "";
        const data = await res.json();
        const t = (data.content?.[0]?.text || "").trim().replace(/^["'"'`]+|["'"'`]+$/g, "").split("\n")[0];
        return Array.from(t).slice(0, 10).join("") || Array.from(existingTitle || "").slice(0, 10).join("");
    } catch {
        return Array.from(existingTitle || "").slice(0, 10).join("");
    }
}

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

        // ── thumbnail / illustration: AI 이미지 단독 ──
        if (cardType === "thumbnail" || cardType === "illustration") {
            const style = cardType === "thumbnail" ? "realistic" : "webtoon";
            try {
                // 썸네일 전용: 이미지 생성과 제목 생성 병렬 실행
                const [img, shortTitle] = await Promise.all([
                    generateBlogContentImage(content, title || "", style),
                    cardType === "thumbnail"
                        ? generateShortTitle(content, title || "", apiKey)
                        : Promise.resolve(""),
                ]);

                const dataUrl = `data:image/png;base64,${img.imageBase64}`;

                let html: string;
                if (cardType === "thumbnail" && shortTitle) {
                    const len = Array.from(shortTitle).length;
                    const fontSize = len <= 6 ? 72 : len <= 8 ? 64 : 56;
                    html = `<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@900&display=swap');</style>
<div style="width:800px;height:800px;position:relative;overflow:hidden;background:#000;">
  <img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.80) 0%,rgba(0,0,0,0.20) 50%,transparent 100%);"></div>
  <div style="position:absolute;bottom:52px;left:0;right:0;padding:0 52px;font-family:'Noto Sans KR',sans-serif;font-weight:900;font-size:${fontSize}px;color:#fff;line-height:1.2;letter-spacing:-2px;word-break:keep-all;overflow-wrap:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-shadow:0 3px 24px rgba(0,0,0,0.7);">${shortTitle}</div>
</div>`;
                } else {
                    html = `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:#000;"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" /></div>`;
                }

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
