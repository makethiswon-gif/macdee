import { NextResponse } from "next/server";
import { generateBlogCardBackground } from "@/lib/ai/image-generate";
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
        const hasOfficeImg = !!(profile.officeImages?.length);

        // 로고 이미지에서 대표 색상을 추출해 brandColor로 사용 (변호사 정체성과 자동 일치).
        // 추출 실패하거나 로고가 없으면 profile.brandColor → 기본값 순으로 폴백.
        let brandColor = profile.brandColor || "#3563AE";
        if (hasLogo && profile.logoImage) {
            const logoColor = await extractLogoColor(profile.logoImage);
            if (logoColor) {
                console.log(`[generate-design] brandColor ${brandColor} → ${logoColor} (extracted from logo)`);
                brandColor = logoColor;
            }
        }

        const specialties = (profile.specialty || []).slice(0, 2).join(" · ") || "";
        const brandLines: string[] = (profile.brandLines || []).filter((b: string) => b.trim());
        const tagline = brandLines[0] || "";

        // ── 변호사별 디자인 DNA (lawyerId 기반 결정론적) ──
        // 같은 변호사는 영원히 같은 layout/typo/accent/bgMood 조합 → 브랜드 일관성.
        // 다른 변호사는 거의 항상 다른 조합 (8^4 = 4096) → 차별화.
        const dna = getLawyerDesignDNA(profile.id || profile.lawyerName || "default", brandColor);
        console.log(`[generate-design] DNA for ${profile.lawyerName}: ${dna.layoutFamily.name} / ${dna.typoFamily.name} / ${dna.accentFamily.name} / ${dna.bgMoodFamily.name}`);

        // ── AI 배경 이미지 생성 (thumbnail / career 카드만) ──
        // 텍스트가 전혀 없는 시네마틱 분위기 배경. DNA의 무드 힌트로 같은 변호사 일관성 유지.
        let aiBgDataUrl: string | null = null;
        if (cardType === "thumbnail" || cardType === "career") {
            try {
                const bg = await generateBlogCardBackground(content, cardType, brandColor, dna.bgMoodFamily.aiPromptHint);
                if (bg?.imageBase64) {
                    aiBgDataUrl = `data:image/png;base64,${bg.imageBase64}`;
                }
            } catch (err) {
                console.error("[generate-design] AI background failed, will fall back to office photo/gradient:", err);
            }
        }

        const bgSpec = aiBgDataUrl
            ? `배경: AI 생성 시네마틱 배경 이미지를 전체에 깔고 (object-fit:cover, z-index:0), 그 위에 linear-gradient(to bottom, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.85) 100%) 오버레이로 텍스트 가독성 확보. DNA 무드(${dna.bgMoodFamily.name})에 맞춰 어두운 톤 오버레이 강도 조정.`
            : dna.bgMoodFamily.htmlSpec;

        const variationDirective = `
[이 변호사의 디자인 DNA — 같은 변호사의 모든 카드는 이 DNA를 동일하게 유지해야 함]
- 레이아웃 family: "${dna.layoutFamily.name}"
  → ${dna.layoutFamily.spec}
- 타이포 family: "${dna.typoFamily.name}"
  → ${dna.typoFamily.spec}
- 악센트 family: "${dna.accentFamily.name}"
  → ${dna.accentFamily.spec}
- 무드 family: "${dna.bgMoodFamily.name}"
  → ${bgSpec}
`;

        // ── System message ──
        const systemMessage = `당신은 최고급 법률 브랜드를 위한 미니멀리스트 비주얼 디렉터입니다.
레퍼런스: Apple 제품 페이지, Bottega Veneta 광고, 대형 로펌 연간 보고서 표지.

[절대 원칙 — 럭셔리 = 절제]
1. 카드에 들어가는 텍스트 요소는 최대 3개. 제목 + 이름 + 로고가 전부. 그 이상 금지.
2. 각 텍스트는 한 줄로 끝낼 것. 2줄 이상 넘어가는 문장 금지.
3. 카드 면적의 최소 50% 이상은 여백 또는 순수 비주얼(사진/그라데이션)이어야 함.
4. 전문분야, 경력, 주소, 전화번호, 요약 나열 등 정보 목록 절대 금지 (contact 카드 제외).
5. 영어 단어 절대 금지 (Legal, Law, Insight, Attorney 등).
6. 단색 flat 배경 단독 사용 금지. 항상 깊이감 있는 배경.

[CSS 품질]
- 폰트: HTML 첫 줄 <style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');</style>
- 사진: object-fit:cover + 그라데이션 오버레이 필수
- 그림자: box-shadow 레이어링으로 텍스트/요소에 깊이감
- 루트 div: position:relative;overflow:hidden;width:800px;height:800px 필수
- 모든 콘텐츠: position:relative;z-index:1 이상

[__AI_BG__ 슬롯 사용 규칙 — 매우 중요]
- 사용자가 프롬프트에서 __AI_BG__ 를 제공하면, 그것은 AI가 생성한 시네마틱 textless 배경 이미지(data URL)다.
- 사용 방법: <img src="__AI_BG__" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0;" />
- 그 위에 <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.85) 100%); z-index:1;"></div> 으로 어두운 그라데이션 오버레이 필수.
- 모든 텍스트·로고는 z-index:2 이상에 배치. 흰색 또는 거의 흰색 컬러로.
- __AI_BG__ 가 있으면 다른 배경 그라데이션·사무실 사진 코드를 추가하지 말 것. AI 배경이 최우선.

출력: <style>...</style>로 시작하는 순수 HTML+인라인CSS만. 설명 없이.`;

        // ── Card prompts ──
        const cardPrompts: Record<string, string> = {

            thumbnail: `법률 블로그 메인 썸네일을 디자인해. 매거진 표지/Apple 제품 페이지 같은 editorial 미감.

${aiBgDataUrl ? `[AI 생성 배경 이미지 — 전체 배경으로 사용 필수]: <img src="__AI_BG__" /> (object-fit:cover로 전체 깔고, 어두운 그라데이션 오버레이 후 그 위에 텍스트)` : hasOfficeImg ? `사무실 배경 사진: <img src="__OFFICE_IMG__" />` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" /> (작게, 하단 코너에. 로고에 로펌명 포함되어 있으므로 텍스트로 로펌명 따로 쓰지 말 것)` : ""}

[절대 금지 — 매우 중요]
- 변호사 인물 사진/프로필 사진/포트레이트 절대 넣지 말 것
- <img> 태그로 사람 얼굴 이미지를 합성하지 말 것
- __PROFILE_IMG__ 같은 placeholder 절대 사용 금지
- 누끼 딴 인물 사진을 배경 위에 얹는 것은 디자인 품질을 망침. 우리는 매거진 표지 미감을 원함.

카드에 들어갈 텍스트: 딱 2가지만.
1. 제목: ${title?.trim() ? `"${title.trim()}"` : "블로그 본문을 읽고 20자 이내 핵심 제목 1개 직접 작성"}
2. 이름: "${profile.lawyerName} ${profile.jobTitle || "변호사"}" (작게, 제목 아래 또는 코너에)

콘텐츠 참고 (제목 생성용으로만):
${content.substring(0, 600)}

${variationDirective}

위 디자인 지시를 정확히 따라서 제목과 이름 딱 2개만 넣어. 다른 텍스트 추가 금지.${aiBgDataUrl ? "\n\n[중요] __AI_BG__는 이미 시네마틱한 분위기를 담은 textless 배경이다. 추가 배경 그라데이션·사무실 사진·인물 사진 코드 작성하지 말 것. __AI_BG__ + 어두운 오버레이 + 텍스트만." : ""}`,

            summary: `법률 블로그 핵심 요약 카드를 디자인해.

${hasOfficeImg ? `배경용 사무실 사진: <img src="__OFFICE_IMG__" />` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" />` : ""}

블로그 본문:
${content.substring(0, 1200)}

[텍스트 구성 — 이것만]
- 상단: 소형 라벨 "핵심" (font-size:12px, letter-spacing:4px, ${brandColor} 색상)
- 중앙: 본문에서 뽑은 핵심 키워드 또는 짧은 구문 3개. 각 줄 최대 18자. 번호(01 02 03) 앞에 붙임.
- 하단: ${hasLogo ? "로펌 로고" : `"${profile.lawyerName} ${profile.jobTitle || "변호사"}"`}

3개 키워드/구문 예시 형태: "증거 확보가 먼저입니다" / "협의이혼의 함정" / "위자료 산정 기준"
각 항목은 완전한 문장이 아닌 임팩트 있는 짧은 구문으로.

${variationDirective}

텍스트는 라벨 + 3줄 + 로고/이름, 총 5개 이하. 그 이상 금지.`,

            career: `로펌 브랜드 이미지 카드를 디자인해.

${aiBgDataUrl ? `[AI 생성 배경 이미지 — 전체 배경으로 사용 필수]: <img src="__AI_BG__" /> (object-fit:cover로 전체 깔고, 어두운 그라데이션 오버레이 후 그 위에 로고/슬로건)` : hasOfficeImg ? `배경용 사무실 사진: <img src="__OFFICE_IMG__" />` : ""}
${hasLogo ? `로펌 로고 (크게, 중심): <img src="__LOGO_IMG__" />` : `로펌명: ${profile.officeName}`}
브랜드컬러: ${brandColor}
${tagline ? `슬로건/브랜드메시지: "${tagline}"` : specialties ? `전문분야: ${specialties}` : ""}

[텍스트 구성 — 이것만]
${hasLogo
    ? `- 로고 하나 (크게, 카드 중앙 또는 하단 1/3)`
    : `- 로펌명 텍스트 (크게, font-size:36px 이상)`}
${tagline
    ? `- 슬로건 1줄: "${tagline}" (작게, font-size:16~18px, 투명도 낮게)`
    : specialties ? `- 전문분야 1줄: "${specialties}" (font-size:16px, 투명도 낮게)` : ""}

로고 외 텍스트는 슬로건/전문분야 1줄만. 그 이상 절대 금지.
${aiBgDataUrl ? "__AI_BG__를 전체 배경으로 강하게 사용. 럭셔리 브랜드 화보 느낌. 추가 배경 코드 작성 금지." : "사무실 사진이 있으면 전체 배경으로 강하게 사용. 브랜드 화보 느낌."}

${variationDirective}`,

            contact: (() => {
                const phoneRaw = profile.phone || "";
                const phoneLines = phoneRaw.split(/[,，]/).map((p: string) => p.trim()).filter(Boolean);

                return `변호사 연락처 카드를 디자인해. 명함처럼 깔끔하고 정돈된 레이아웃.

${hasProfileImg ? `프로필 사진 (원형): <img src="__PROFILE_IMG__" />` : ""}
${hasLogo ? `로펌 로고: <img src="__LOGO_IMG__" />` : ""}

[카드에 표시할 정보 — 이것만]
- 이름+직함: ${profile.lawyerName} ${profile.jobTitle || "변호사"}
${phoneLines.length > 0 ? `- 전화: ${phoneLines.join(" / ")}` : ""}
${profile.website ? `- 홈페이지: ${profile.website}` : ""}

레이아웃: 상단 40% = ${brandColor} 그라데이션 배경 + ${hasProfileImg ? "원형 프로필 사진 + 이름" : "이름+직함"}, 하단 60% = 어두운 배경 + 연락처 정보
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

        // Keep <style> blocks Claude prepends for font imports
        const styleStart = html.indexOf("<style");
        const divStart = html.indexOf("<div");
        const cutStart = styleStart !== -1 && (divStart === -1 || styleStart < divStart)
            ? styleStart
            : divStart;
        if (cutStart > 0) html = html.substring(cutStart);
        html = html.replace(/```[\s\S]*$/g, "").trim();

        // 썸네일/career 카드에서는 변호사 인물 사진 절대 금지.
        // Claude가 지시 무시하고 <img src="__PROFILE_IMG__" />를 넣었다면 통째로 제거.
        if (cardType === "thumbnail" || cardType === "career") {
            html = html.replace(/<img[^>]*__PROFILE_IMG__[^>]*\/?>/gi, "");
            html = html.replace(/<img[^>]*__PROFILE_IMG__[^>]*><\/img>/gi, "");
        }

        // Replace image placeholders
        if (aiBgDataUrl) {
            html = html.replace(/__AI_BG__/g, aiBgDataUrl);
        }
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
