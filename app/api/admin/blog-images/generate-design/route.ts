import { NextResponse } from "next/server";
import { generateBlogContentImage } from "@/lib/ai/image-generate";
import { getLawyerDesignDNA } from "@/lib/blog-images/design-dna";
import { extractLogoColor } from "@/lib/blog-images/logo-color";
import { verifyAdminToken } from "@/lib/admin-auth";

export const maxDuration = 90;

// A 썸네일용 상황형 훅 — 독자가 공감할 2~3줄(제목과 다르게, 마지막 줄은 질문형 권장)
async function generateSituationalHook(content: string, existingTitle: string, apiKey: string): Promise<string[]> {
    const fallback = (): string[] => {
        const t = (existingTitle || "법률 이슈").trim();
        return [Array.from(t).slice(0, 16).join("")];
    };
    const source = existingTitle
        ? `제목: ${existingTitle}\n\n본문: ${content.substring(0, 600)}`
        : content.substring(0, 700);
    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 120,
                messages: [{
                    role: "user",
                    content: `이 블로그 글의 '상황'을 독자가 공감할 짧은 썸네일 훅으로 만드세요.

규칙:
- 2~3줄. 각 줄 최대 12자.
- 제목을 그대로 쓰지 말 것(비슷해도 안 됨). 독자가 처한 '상황/질문'으로 표현.
- 마지막 줄은 궁금증을 자극하는 질문형 권장.
- 예: ["면접교섭 거부","자녀 소재를 모를 때","이행명령이 가능할까?"]
- JSON만 출력: {"lines":["...","..."]}

${source}`,
                }],
            }),
        });
        if (!res.ok) return fallback();
        const data = await res.json();
        const raw = (data.content?.[0]?.text || "").trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return fallback();
        const parsed = JSON.parse(match[0]) as { lines?: string[] };
        const lines = (parsed.lines || []).map((l) => Array.from(String(l)).slice(0, 14).join("")).filter(Boolean).slice(0, 3);
        return lines.length ? lines : fallback();
    } catch {
        return fallback();
    }
}

// D 요약카드용 본문 요약 — "이런 경우라면 이렇게 준비하세요" 톤 2~3줄
async function generateSummaryLines(content: string, existingTitle: string, apiKey: string): Promise<string[]> {
    const source = existingTitle ? `제목: ${existingTitle}\n\n본문: ${content.substring(0, 1200)}` : content.substring(0, 1400);
    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 200,
                messages: [{
                    role: "user",
                    content: `이 블로그 글의 핵심을 마무리 요약 카드용 2~3줄로 정리하세요.

규칙:
- "상담 받으세요"류 광고 톤 금지. "이런 경우라면 이렇게 준비하세요" 같은 신뢰형 톤.
- 각 줄 최대 30자. 실질 조언/핵심 포인트.
- JSON만 출력: {"lines":["...","..."]}

${source}`,
                }],
            }),
        });
        if (!res.ok) return [];
        const data = await res.json();
        const raw = (data.content?.[0]?.text || "").trim();
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return [];
        const parsed = JSON.parse(match[0]) as { lines?: string[] };
        return (parsed.lines || []).map((l) => String(l).slice(0, 40)).filter(Boolean).slice(0, 3);
    } catch {
        return [];
    }
}

export async function POST(req: Request) {
    if (!verifyAdminToken(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
            illustration: "상황 이미지",
            info: "정보 정리",
            contact: "요약·안내",
        };

        // C(정보형)·D(요약)용 본문 요약 라인 (Claude HTML 프롬프트에 주입)
        const summaryLines = (cardType === "contact")
            ? await generateSummaryLines(content, title || "", apiKey)
            : [];

        // ── thumbnail / illustration: AI 이미지 단독 ──
        if (cardType === "thumbnail" || cardType === "illustration") {
            const style = cardType === "thumbnail" ? "realistic" : "webtoon";
            try {
                // 썸네일: 이미지 + 상황훅 생성 병렬
                const [img, hookLines] = await Promise.all([
                    generateBlogContentImage(content, title || "", style),
                    cardType === "thumbnail"
                        ? generateSituationalHook(content, title || "", apiKey)
                        : Promise.resolve<string[] | null>(null),
                ]);

                const dataUrl = `data:image/png;base64,${img.imageBase64}`;

                let html: string;
                if (cardType === "thumbnail" && hookLines && hookLines.length) {
                    const last = hookLines.length - 1;
                    const logoTag = hasLogo && profile.logoImage
                        ? `<img src="${profile.logoImage}" style="position:absolute;top:26px;left:30px;height:28px;opacity:0.9;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.45));" />`
                        : "";
                    // 사진 위에 밝은 텍스트 패널(중명도↑) + 상황형 훅. 마지막 줄만 브랜드컬러 강조.
                    const lineHtml = hookLines.map((l, i) => {
                        const isLast = i === last;
                        const size = isLast ? 48 : 34;
                        return `<div style="font-family:'Noto Sans KR',sans-serif;font-weight:${isLast ? 900 : 700};font-size:${size}px;color:${isLast ? brandColor : "#1A1A1A"};line-height:1.24;letter-spacing:-1.8px;">${l}</div>`;
                    }).join("");
                    html = `<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');</style>
<div style="width:800px;height:800px;position:relative;overflow:hidden;background:#e9edf2;">
  <img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.28),transparent 46%);"></div>
  ${logoTag}
  <div style="position:absolute;bottom:44px;left:44px;right:44px;background:rgba(255,255,255,0.95);border-radius:26px;padding:34px 38px;box-shadow:0 24px 60px rgba(0,0,0,0.30);">
    <div style="width:46px;height:5px;border-radius:3px;background:${brandColor};margin-bottom:18px;"></div>
    ${lineHtml}
  </div>
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

            // C. 정보형 — 본문 보고 형식(단계/체크리스트/비교/순서도) 자동 선택
            info: `이 블로그 글의 핵심을 '정보형 시각자료' 한 장으로 정리하세요.

[형식 — 본문에 가장 잘 맞는 것 하나를 스스로 선택]
1) 단계별 절차 (3~5단계: 번호 + 짧은 제목 + 한 줄 설명)
2) 체크리스트 (3~5항목: 체크 아이콘 + 항목)
3) 비교 (A vs B, 2열 대조)
4) 순서도 (간단한 화살표 흐름)

[내용 규칙 — 매우 중요]
- 본문에 실제로 있는 내용만. 없는 내용 지어내기 절대 금지.
- 정보 개수 3~5개. 한 장에 과하지 않게.
- 상단에 짧은 헤더(주제) 1줄, 그 아래 항목들.
- 글 제목을 그대로 반복하지 말 것.

[본문]
${content.substring(0, 2500)}

[디자인]
- 밝고 정돈된 인포그래픽. 흰색/아주 옅은 회색 배경. 브랜드컬러 ${brandColor}는 번호·아이콘·강조선에만 절제해서.
- 항목은 카드/구분선/여백으로 명확히 구조화. 모바일에서도 읽히게 폰트 충분히 크게.
${variationDirective}

font-family:'Noto Sans KR',sans-serif
800x800px, inline CSS만.`,

            // D. 요약 + 안내 — 세로 명함이 아니라 '가로형 요약 배너' + 왜 연락해야 하는지 맥락
            contact: (() => {
                const phoneRaw = profile.phone || "";
                const phoneLines = phoneRaw.split(/[,，]/).map((p: string) => p.trim()).filter(Boolean);
                const summaryBlock = summaryLines.length
                    ? summaryLines.map((l) => `- ${l}`).join("\n")
                    : "(본문 핵심을 신뢰형 톤으로 2~3줄 직접 요약)";

                return `블로그 글 마무리용 '요약 + 안내' 카드. 세로 명함형 금지 — 상단 요약이 주인공인 배너형.

[상단 60% — 요약(주인공, 밝은 배경)]
- 헤더 한 줄: "이런 경우라면, 이렇게 준비하세요" 같은 신뢰형 톤 (광고·자극 문구 금지)
- 핵심 요약 2~3줄:
${summaryBlock}

[하단 40% — 안내(작게 정리, ${brandColor} 톤 배경)]
${hasProfileImg ? `- 변호사 사진: 작은 원형(지나치게 크지 않게). <img src="__PROFILE_IMG__" />` : ""}
- ${profile.lawyerName} ${profile.jobTitle || "변호사"}
${phoneLines.length > 0 ? `- 전화: ${phoneLines.join(" / ")}` : ""}
${profile.website ? `- 홈페이지: ${profile.website}` : ""}
${hasLogo ? `- 로펌 로고: 작게(height:30px). <img src="__LOGO_IMG__" />` : ""}

[원칙]
- "상담 받으세요" 같은 직접 광고 대신 '준비 방법 안내' 톤으로 신뢰감.
- 사진·로고는 작게. 요약 텍스트가 시각적 주인공.
- 연락처는 아이콘 없이 텍스트만 한 줄 정리.
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
