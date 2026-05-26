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

        const brandColor = profile.brandColor || "#3563AE";
        const hasProfileImg = !!(profile.profileImages?.length);
        const hasLogo = !!profile.logoImage;
        const allCareer = (profile.career || []).filter((c: string) => c.trim());
        const specialties = (profile.specialty || []).join(", ") || "전문분야 없음";

        const hasOfficeImg = !!(profile.officeImages?.length);

        // Image placeholder instructions
        const imgInfo = `이미지 플레이스홀더:
${hasProfileImg ? '- 변호사 프로필 사진: <img src="__PROFILE_IMG__" />' : '- 프로필 사진 없음'}
${hasLogo ? '- 로펌 로고: <img src="__LOGO_IMG__" />' : '- 로고 없음'}
${hasOfficeImg ? '- 사무실 사진: <img src="__OFFICE_IMG__" />' : '- 사무실 사진 없음'}`;

        // Profile context (common across all cards)
        const profileContext = `변호사 정보:
- 이름: ${profile.lawyerName}
- 직함: ${profile.jobTitle || "대표변호사"}
- 로펌: ${profile.officeName}
- 전문분야: ${specialties}
- 브랜드컬러: ${brandColor}
${profile.phone ? '- 대표번호: ' + profile.phone : ''}
${profile.address ? '- 주소: ' + profile.address : ''}
${profile.website ? '- 홈페이지: ' + profile.website : ''}`;

        const careerText = allCareer.length > 0
            ? '경력사항:\n' + allCareer.map((c: string) => `- ${c}`).join('\n')
            : '';

        // ── Design Variation System ──
        // Each generation randomly picks a unique combination of style traits
        const layoutStyles = [
            '제목을 왼쪽 정렬하고 오른쪽에 여백을 넓게 두는 비대칭 레이아웃',
            '모든 요소를 중앙 정렬하는 클래식 대칭 레이아웃',
            '대각선 분할(clip-path: polygon) 배경을 사용한 역동적 레이아웃',
            '상단 2/3에 비주얼, 하단 1/3에 텍스트를 배치하는 매거진 레이아웃',
            '좌측에 세로 컬러바(width:6px)를 넣고 텍스트를 우측에 배치하는 에디토리얼 레이아웃',
            '원형 프레임과 곡선 장식 요소를 활용한 유기적 레이아웃',
            '그리드 기반으로 섹션을 나누고 각 섹션에 다른 배경 투명도를 적용하는 모던 레이아웃',
            '전체 카드를 둥근 내부 패널(border-radius:24px, margin:20px)로 감싸는 카드-인-카드 레이아웃',
        ];
        const typographyMoods = [
            '제목 font-size:48px font-weight:900 자간 letter-spacing:-2px 모던 타이트',
            '제목 font-size:36px font-weight:300 자간 letter-spacing:4px 우아하고 가벼운',
            '제목 font-size:42px font-weight:800 세리프 느낌 클래식',
            '제목 font-size:32px font-weight:700 대문자 느낌 강렬한 블록체',
            '제목을 두 줄로 나누어 첫 줄 font-size:28px 두번째 줄 font-size:44px font-weight:900 강약 대비',
            '제목 font-size:38px font-weight:600 둥근 느낌 부드러운 톤',
        ];
        const decorativeElements = [
            '모서리에 가는 선(1px solid rgba(255,255,255,0.15)) 프레임 장식',
            '배경에 큰 원형 그라데이션 블러 bokeh 2~3개 (width:300px, height:300px, border-radius:50%, filter:blur(80px), opacity:0.3)',
            '하단에 가로로 가는 그라데이션 라인 악센트 (height:2px)',
            '배경에 미세한 도트 패턴 (radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px) 20px 20px)',
            '텍스트 뒤에 브랜드컬러의 큰 숫자나 한자를 반투명(opacity:0.06, font-size:300px)으로 배치',
            '상단과 하단에 대비되는 색상 밴드를 넣어 투톤 분위기',
            '장식 없이 미니멀하게 — 여백과 타이포그래피만으로 승부',
            '배경에 사선 스트라이프 패턴 (repeating-linear-gradient, 45deg, rgba(255,255,255,0.03))',
        ];
        const colorVariations = [
            `메인 ${brandColor}를 기본으로 사용`,
            `${brandColor}를 약간 어둡게 변형하여 사용`,
            `${brandColor}를 베이스로 하되 따뜻한 톤(골드 악센트 #D4A853)을 보조색으로`,
            `${brandColor}를 베이스로 하되 차가운 실버(#C0C0C0) 악센트 추가`,
            `${brandColor}와 검정 위주의 모노크롬 느낌`,
        ];

        const systemMessage = `당신은 법률 브랜드 전문 프리미엄 UI/UX 디자이너 겸 프론트엔드 개발자입니다.
생성하는 모든 카드 이미지는 대형 로펌의 공식 브랜드 자산으로 사용되므로, 전문 디자이너가 Figma로 제작한 수준의 완성도가 필요합니다.

[반드시 지켜야 할 CSS 품질 기준]
1. 폰트 임포트: HTML 맨 첫 줄에 반드시 포함 → <style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');</style>
2. 배경: 단색 단독 사용 절대 금지. 최소 3색 멀티-스톱 linear-gradient 또는 radial-gradient 조합으로 광원 느낌 표현.
3. 깊이감: box-shadow를 2~3겹 레이어링 (예: "0 2px 4px rgba(0,0,0,0.2), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"). 요소가 공중에 떠 있는 것처럼 입체적으로.
4. 타이포: letter-spacing, line-height, font-weight 조합으로 고급스러운 위계 구축. 중요 텍스트에 text-shadow 미묘하게.
5. 레이어: 반투명 bokeh 원형(filter:blur), 기하학적 장식선, clip-path 형태 등을 position:absolute로 겹쳐 깊이 추가.
6. 이미지: 프로필/사무실 사진은 object-fit:cover + 정확한 크기. 사진 위 그라데이션 오버레이 필수.
7. Glassmorphism 적극 활용: backdrop-filter:blur(20px), rgba 반투명 배경, 테두리 rgba(255,255,255,0.1).
8. 전체: '저렴한 단순 박스' 디자인 절대 금지. 프리미엄 매거진 광고 또는 고급 앱 UI 수준.

출력 형식: <style>...</style><div style="...">...</div> 형태의 순수 HTML+인라인CSS만. 어떤 설명도 앞뒤에 붙이지 마세요.`;

        const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const variationDirective = `
★ 디자인 변주 지시 (반드시 반영) ★
- 레이아웃: ${pick(layoutStyles)}
- 타이포: ${pick(typographyMoods)}
- 장식: ${pick(decorativeElements)}
- 색감: ${pick(colorVariations)}
이전 생성과 완전히 다른 새로운 시각적 인상을 만들어. 같은 구도를 반복하지 말 것.
`;

        // Card-specific prompts with example HTML reference
        const cardPrompts: Record<string, string> = {
            thumbnail: `역할: 너는 법률 블로그 썸네일을 매번 완전히 새로운 스타일로 디자인하는 크리에이티브 디렉터야. 절대 이전과 같은 구도를 반복하지 마.

${profileContext}
${imgInfo}

블로그 본문:
${content.substring(0, 1000)}

필수 규칙: 영어 단어 절대 사용 금지 (Legal, Insight, Criminal 등). 모든 텍스트 한국어만.

기술 제약 (반드시 지킬 것):
- 800x800px 카드. inline CSS만 사용.
- 루트 div에 position:relative;overflow:hidden;width:800px;height:800px 필수.
- 모든 텍스트/콘텐츠는 position:relative;z-index:1.
- font-family:'Pretendard','Noto Sans KR',sans-serif
${hasOfficeImg ? `- 사무실 사진 사용 가능: <img src="__OFFICE_IMG__" /> (배경, 부분 배경, 반만 쓰기 등 자유롭게)` : ''}
${hasLogo ? `- 로펌 로고 사용 가능: <img src="__LOGO_IMG__" /> (로고에 이미 로펌명 포함. 텍스트로 로펌명 따로 쓰지 말 것). 위치/크기는 자유.` : ''}
${hasProfileImg ? `- 프로필 사진 사용 가능: <img src="__PROFILE_IMG__" /> 원형/사각/반원 등 형태 자유. 크기와 위치도 자유.` : ''}

콘텐츠 규칙:
${title?.trim() ? `- 카드 제목으로 반드시 다음 텍스트를 그대로 사용해. 한 글자도 바꾸지 말 것: "${title.trim()}"` : '- 블로그 본문을 읽고 핵심을 담은 매력적인 한국어 제목을 20자 이내로 직접 작성해서 카드에 넣어.'}
- "${profile.lawyerName} ${profile.jobTitle || '변호사'}" 이름을 어딘가에 표시 (위치/크기 자유).
- 제목+이름+로고+프로필사진만. 전문분야, 요약, 카테고리 라벨 넣지 말 것.

★★★ 핵심 디자인 지시 (이것이 이번 생성의 스타일을 결정함) ★★★
${variationDirective}
위 디자인 지시를 최우선으로 반영해서, 제목 위치, 사진 위치, 배경 처리, 여백, 색상 배치를 전부 이 지시에 맞게 새롭게 구성해. 브랜드컬러 ${brandColor}를 기반으로 하되, 매번 다른 그라데이션 각도와 색상 조합을 시도해.

<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            summary: `역할: 법률 블로그 핵심 요약 이미지를 HTML로 코딩해.

${profileContext}
${imgInfo}

블로그 본문:
${content.substring(0, 1500)}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항:
1. 블로그 본문을 읽고 핵심 포인트를 정확히 3개 뽑아서 카드에 넣어. 반드시 3개, 2개도 4개도 안 됨.
2. 각 포인트는 한국어 1~2문장(40자 이내)으로 간결하게.
3. 800x800px 카드. inline CSS만 사용. 루트 div에 position:relative;overflow:hidden 필수.
${hasOfficeImg ? `4. 배경: 사무실 사진을 블러 처리하여 배경으로 — <img src="__OFFICE_IMG__" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;filter:blur(8px);transform:scale(1.1);" /> 그 위에 반투명 어두운 오버레이: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);"></div>` : '4. 다크 배경(#0c0c14).'}
5. 모든 텍스트/콘텐츠는 position:relative;z-index:1 로 오버레이 위에 표시.
6. 상단에 "핵심 요약" 라벨(${brandColor} 색상) + 블로그 주제를 15자 이내로 요약한 부제목.
7. 3개 포인트를 세로로 나열. 각 포인트 앞에 ${brandColor} 색상 원형 bullet(width:8px, height:8px, border-radius:50%).
8. 각 포인트 사이에 충분한 간격(gap:24px).
${hasLogo ? `9. 하단에 로펌 로고 <img src="__LOGO_IMG__" style="height:40px;object-fit:contain;position:relative;z-index:1;" />` : ''}
10. font-family:'Pretendard','Noto Sans KR',sans-serif

${variationDirective}
<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            career: `역할: 로펌 브랜드 이미지를 HTML로 코딩해.

로펌: ${profile.officeName}
${imgInfo}
브랜드컬러: ${brandColor}
${(profile.brandLines || []).length > 0 ? '브랜드 메시지/슬로건:\n' + (profile.brandLines || []).map((b: string) => `- ${b}`).join('\n') : ''}
전문분야: ${specialties}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 position:relative;overflow:hidden 필수.
${hasOfficeImg ? `2. 배경: 사무실 사진을 전체 배경으로 — <img src="__OFFICE_IMG__" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;" /> 그 위에 ${brandColor} 계열 그라데이션 오버레이: <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(180deg,${brandColor}ee 0%,rgba(0,0,0,0.7) 100%);"></div>` : `2. background: linear-gradient(135deg, ${brandColor} 0%, #0a0a0a 100%)`}
3. 모든 콘텐츠는 position:relative;z-index:1 로 오버레이 위에.
${hasLogo ? `4. 로펌 로고를 크고 중앙에 한 번만: <img src="__LOGO_IMG__" style="height:120px;object-fit:contain;position:relative;z-index:1;" /> (로고에 이미 로펌명이 포함되어 있으므로 텍스트로 로펌명을 따로 쓰지 말 것)` : ''}
5. 로고 아래에 슬로건/브랜드 메시지만 표시. 로펌명 텍스트는 쓰지 말 것.
${(profile.brandLines || []).length > 0 ? '6. 브랜드 메시지/슬로건을 세련되게 표시 (font-size:18~20px, 약간 투명한 흰색).' : '6. 전문분야를 세련되게 나열.'}
7. 전체적으로 고급스러운 브랜드 이미지 느낌.
8. font-family:'Pretendard','Noto Sans KR',sans-serif

${variationDirective}
<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`,

            contact: (() => {
                // Parse phone numbers into separate lines
                const phoneRaw = profile.phone || '';
                const phoneLines = phoneRaw.split(/[,，]/).map((p: string) => p.trim()).filter((p: string) => p);
                const phoneLinesText = phoneLines.length > 0 
                    ? phoneLines.map((p: string) => `   • ${p}`).join('\n') 
                    : '   • 미등록';
                
                return `역할: 변호사 명함 스타일 문의 안내 이미지를 HTML로 코딩해.

${imgInfo}

필수 규칙: 영어 단어 절대 사용 금지. 모든 텍스트 한국어만.

지시사항 - 명함 디자인:
1. 800x800px 카드. inline CSS만 사용. 루트 div에 overflow:hidden 필수.
2. 명함처럼 깔끔하고 정돈된 레이아웃:
   - 상단 35%: ${brandColor} 계열 그라데이션 배경에 로고와 변호사 이름+직함.
   - 하단 65%: 어두운 배경에 연락처 정보.
${hasProfileImg ? `3. 프로필 사진 원형: <img src="__PROFILE_IMG__" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid white;" />` : ''}
${hasLogo ? `4. 로펌 로고 한 번만: <img src="__LOGO_IMG__" style="height:50px;object-fit:contain;" /> (로고에 이미 로펌명 포함. 텍스트로 로펌명 따로 쓰지 말 것)` : ''}
5. 변호사: ${profile.lawyerName} ${profile.jobTitle || '변호사'}
6. 하단 연락처에 반드시 아래 내용을 빠짐없이 전부 표시해:

전화번호 (각각 별도 줄로):
${phoneLinesText}

홈페이지: ${profile.website || '미등록'}
주소: ${profile.address || '미등록'}
전문분야: ${specialties}

7. 위 연락처 정보가 카드에서 반드시 보여야 함. 빠뜨리면 안 됨.
8. HTML을 최대한 간결하게 작성. 꾸밈용 빈 div나 장식 요소 넣지 말 것. 정보 전달에 집중.
9. font-family:'Pretendard','Noto Sans KR',sans-serif

${variationDirective}
<div style="..."> 로 시작하는 HTML만 출력. 설명 금지.`;
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
                model: "claude-opus-4-7",
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

        // Clean up — keep <style> blocks if Claude prepended them
        const styleStart = html.indexOf("<style");
        const divStart = html.indexOf("<div");
        const cutStart = styleStart !== -1 && (divStart === -1 || styleStart < divStart)
            ? styleStart
            : divStart;
        if (cutStart > 0) html = html.substring(cutStart);
        html = html.replace(/```[\s\S]*$/g, "").trim();

        // Replace image placeholders with actual base64 data (random selection)
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
