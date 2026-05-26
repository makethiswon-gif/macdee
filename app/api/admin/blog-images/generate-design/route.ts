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

        // ── AI 콘텐츠 이미지 생성 (thumbnail = 시네마틱 사진, illustration = 웹툰 1컷) ──
        let aiImageDataUrl: string | null = null;
        if (cardType === "thumbnail") {
            try {
                const img = await generateBlogContentImage(content, title || "", "realistic");
                if (img?.imageBase64) aiImageDataUrl = `data:image/png;base64,${img.imageBase64}`;
            } catch (err) {
                console.error("[generate-design] thumbnail AI image failed:", err);
            }
        } else if (cardType === "illustration") {
            try {
                const img = await generateBlogContentImage(content, title || "", "webtoon");
                if (img?.imageBase64) aiImageDataUrl = `data:image/png;base64,${img.imageBase64}`;
            } catch (err) {
                console.error("[generate-design] illustration AI image failed:", err);
            }
        }

        const variationDirective = `
[이 변호사의 디자인 DNA — 동일 변호사 모든 카드 공통]
- 레이아웃: "${dna.layoutFamily.name}" → ${dna.layoutFamily.spec}
- 타이포: "${dna.typoFamily.name}" → ${dna.typoFamily.spec}
- 악센트: "${dna.accentFamily.name}" → ${dna.accentFamily.spec}
- 무드: "${dna.bgMoodFamily.name}" → ${dna.bgMoodFamily.htmlSpec}
`;

        const systemMessage = `당신은 최고급 법률 브랜드를 위한 미니멀리스트 비주얼 디렉터입니다.
레퍼런스: Apple 제품 페이지, Bottega Veneta 광고, 대형 로펌 연간 보고서 표지.

[절대 원칙 — 럭셔리 = 절제]
1. 카드에 들어가는 텍스트 요소는 최대 3개.
2. 각 텍스트는 한 줄. 2줄 이상 금지.
3. 정보 나열·전문분야·경력 목록 절대 금지 (contact 카드 제외).
4. 영어 단어 절대 금지 (Legal, Law, Insight, Attorney 등).
5. 단색 flat 배경 단독 사용 금지. 깊이감 있는 배경.

[CSS 품질]
- 폰트: HTML 첫 줄 <style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');</style>
- 루트 div: position:relative;overflow:hidden;width:800px;height:800px 필수
- 모든 콘텐츠: position:relative;z-index:1 이상

[__AI_IMG__ 슬롯 사용 규칙]
- 사용자가 __AI_IMG__ 를 제공하면, 그것은 AI가 생성한 글 내용 관련 이미지(data URL)다 — 시네마틱 사진 또는 웹툰 1컷.
- 사용법: <img src="__AI_IMG__" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0;" />
- 그 위에 어두운 그라데이션 오버레이 (예: linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85) 100%); z-index:1) 필수.
- 텍스트·로고는 z-index:2 이상, 흰색.
- __AI_IMG__가 있으면 다른 배경 그라데이션·사무실 사진·인물 사진 코드 추가 금지.

출력: <style>...</style>로 시작하는 순수 HTML+인라인CSS만. 설명 없이.`;

        const cardPrompts: Record<string, string> = {

            thumbnail: `법률 블로그 메인 썸네일. 글 내용을 담은 시네마틱 K-드라마 사진 위에 제목·이름 오버레이. 매거진 표지 미감.

${aiImageDataUrl ? `[AI 생성 콘텐츠 사진 — 전체 배경 필수]: <img src="__AI_IMG__" /> (object-fit:cover, 어두운 그라데이션 오버레이 후 텍스트)` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" /> (작게, 하단 코너. 로고에 로펌명 포함되어 있으므로 텍스트로 따로 쓰지 말 것)` : ""}

[절대 금지]
- 변호사 인물 사진/프로필 사진 절대 넣지 말 것 (누끼 사진 합성은 디자인 망침)
- __PROFILE_IMG__ placeholder 사용 금지
- AI 이미지 외 추가 배경 코드 작성 금지

카드 텍스트: 딱 2가지.
1. 제목: ${title?.trim() ? `"${title.trim()}"` : "글 본문 읽고 20자 이내 핵심 제목 1개 직접 작성"}
2. 이름: "${profile.lawyerName} ${profile.jobTitle || "변호사"}" (작게, 제목 아래 또는 코너)

본문 (제목 생성용):
${content.substring(0, 600)}

${variationDirective}

제목·이름 2개만. 다른 텍스트 금지.${aiImageDataUrl ? "\n\n__AI_IMG__는 이미 시네마틱 사진. 추가 배경 코드 작성 금지." : ""}`,

            illustration: `법률 블로그 본문 관련 일러스트 카드. 한국 웹툰(만화) 1컷 위에 제목·이름 오버레이. 본문 내용을 시각적으로 표현하는 카드.

${aiImageDataUrl ? `[AI 생성 웹툰 일러스트 — 전체 배경 필수]: <img src="__AI_IMG__" /> (object-fit:cover, 어두운 그라데이션 오버레이 후 텍스트)` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" /> (작게, 하단 코너)` : ""}

[절대 금지]
- 변호사 인물 사진 합성 금지
- __PROFILE_IMG__ placeholder 사용 금지
- AI 이미지 외 추가 배경 코드 금지

카드 텍스트: 딱 2가지.
1. 짧은 후크 문구 (글 핵심을 한 줄로): "글 본문에서 강렬한 한 문장 추출, 18자 이내"
2. 이름: "${profile.lawyerName} ${profile.jobTitle || "변호사"}" (작게)

본문 (후크 추출용):
${content.substring(0, 600)}

${variationDirective}

후크 + 이름 2개만. 다른 텍스트 금지.`,

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

        // 썸네일/일러스트 카드에서 변호사 인물 사진 안전장치 — Claude가 지시 무시 시 통째로 제거
        if (cardType === "thumbnail" || cardType === "illustration") {
            html = html.replace(/<img[^>]*__PROFILE_IMG__[^>]*\/?>/gi, "");
            html = html.replace(/<img[^>]*__PROFILE_IMG__[^>]*><\/img>/gi, "");
        }

        // Placeholder 치환
        if (aiImageDataUrl) {
            html = html.replace(/__AI_IMG__/g, aiImageDataUrl);
        }
        if (hasProfileImg) {
            const idx = Math.floor(Math.random() * profile.profileImages.length);
            html = html.replace(/__PROFILE_IMG__/g, profile.profileImages[idx]);
        }
        if (hasLogo && profile.logoImage) {
            html = html.replace(/__LOGO_IMG__/g, profile.logoImage);
        }

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            illustration: "관련 일러스트",
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
