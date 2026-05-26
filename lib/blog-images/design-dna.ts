// 변호사별 디자인 DNA 시스템.
// lawyerId를 결정론적으로 해시해서 4개의 디자인 축에서 family 인덱스를 뽑는다.
// 같은 변호사는 영원히 같은 DNA → 브랜드 일관성. 다른 변호사는 거의 항상 다른 조합 → 차별화.
// 8^4 = 4096 조합. 100명 규모에선 충돌 거의 없음.

export interface DesignFamily {
    name: string;
    spec: string;
}

export interface BgMoodFamily {
    name: string;
    htmlSpec: string;
    aiPromptHint: string;
}

export interface DesignDNA {
    layoutFamily: DesignFamily;
    typoFamily: DesignFamily;
    accentFamily: DesignFamily;
    bgMoodFamily: BgMoodFamily;
}

// ─── FNV-1a 32bit hash. 같은 입력은 항상 같은 출력. ───
function fnv1a(input: string, seed = 0x811c9dc5): number {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

// 같은 lawyerId에서 서로 다른 4개 축의 인덱스를 뽑기 위해 시드 4개를 분리.
function hashIndices(lawyerId: string): [number, number, number, number] {
    const a = fnv1a(lawyerId, 0x811c9dc5);
    const b = fnv1a(lawyerId, 0x9e3779b1);
    const c = fnv1a(lawyerId, 0x85ebca77);
    const d = fnv1a(lawyerId, 0xc2b2ae35);
    return [a % 8, b % 8, c % 8, d % 8];
}

// ─── Family 카탈로그 ───

function layoutFamilies(): DesignFamily[] {
    return [
        { name: "centered-symmetric", spec: "카드 정중앙 세로축에 텍스트를 배치하고 좌우를 완전히 비움. 텍스트는 최소화하고 여백을 70% 이상." },
        { name: "bottom-anchor", spec: "하단 25%에만 텍스트, 상단 75%는 순수 비주얼 (사진/그라데이션/AI 배경)." },
        { name: "corner-asymmetric-tl", spec: "좌측 상단 코너에만 텍스트 (max-width:50%), 나머지 영역은 비주얼 또는 여백으로." },
        { name: "corner-asymmetric-br", spec: "우측 하단 코너에만 텍스트 (max-width:50%), 나머지 영역은 비주얼 또는 여백으로." },
        { name: "diagonal-split", spec: "clip-path polygon(0 0, 100% 0, 100% 60%, 0 100%)로 배경 2분할. 위쪽 큰 면은 비주얼, 아래쪽 작은 면에 텍스트." },
        { name: "top-anchor-flush", spec: "상단 25%에만 텍스트 (제목 + 이름), 하단 75%는 비주얼." },
        { name: "vertical-thirds", spec: "세로 3분할: 상단 1/4는 라벨/로고, 중앙 1/2는 메인 텍스트, 하단 1/4는 이름/정보. 각 구역 명확히 분리." },
        { name: "offset-grid", spec: "12-column grid 기반 비대칭 배치: 텍스트는 column 2-7, 시각 요소는 column 8-12 (또는 반대). 가독성 위해 그리드 라인 의식." },
    ];
}

function typoFamilies(): DesignFamily[] {
    return [
        { name: "ultra-bold-modern", spec: "Noto Sans KR 900, font-size:52px, letter-spacing:-3px, line-height:1.0 (Apple/Bottega Veneta 스타일). 색상 흰색." },
        { name: "elegant-light-spaced", spec: "Noto Sans KR 300, font-size:40px, letter-spacing:6px, line-height:1.4 (luxury editorial). 색상 흰색." },
        { name: "editorial-medium", spec: "Noto Sans KR 500, font-size:46px, letter-spacing:0, line-height:1.2 (Vogue/MoMA 미술관). 색상 흰색." },
        { name: "condensed-impact", spec: "Noto Sans KR 800, font-size:48px, letter-spacing:-2px, font-stretch:condensed 느낌 (transform:scaleX(0.9) 사용). 색상 흰색." },
        { name: "serif-classic", spec: "@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&display=swap') 추가. Noto Serif KR 700, font-size:44px, letter-spacing:-1px (대형 로펌 클래식). 색상 흰색." },
        { name: "mono-architect", spec: "@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap') 추가하고 한글은 Noto Sans KR 700 유지, 숫자/영문은 JetBrains Mono. font-size:38px, letter-spacing:2px (테크 모던). 색상 흰색." },
        { name: "display-extra-bold", spec: "Noto Sans KR 900, font-size:60px, letter-spacing:-4px, line-height:0.95 (대담한 표지). 색상 흰색." },
        { name: "humanist-balanced", spec: "Noto Sans KR 500-700 혼용 (제목 700, 부제 500), font-size:42px, letter-spacing:1px, line-height:1.3 (자연스러운 본문 톤). 색상 흰색." },
    ];
}

function accentFamilies(brandColor: string): DesignFamily[] {
    return [
        { name: "thin-line-bottom-2px", spec: `하단 중앙 또는 좌측에 ${brandColor} 색상 2px 가로선 (width:60px) 하나만.` },
        { name: "thick-line-side-6px", spec: `좌측 가장자리 전체에 ${brandColor} 색상 6px 세로선 (top:0; bottom:0).` },
        { name: "L-corner-top-left", spec: `좌측 상단에 ${brandColor} 색상 L자형 (width:48px; height:48px; border-top:3px solid; border-left:3px solid; 절대 위치).` },
        { name: "L-corner-bottom-right", spec: `우측 하단에 ${brandColor} 색상 L자형 (width:48px; height:48px; border-bottom:3px solid; border-right:3px solid; 절대 위치).` },
        { name: "full-border-inset-1px", spec: `카드 안쪽 여백 24px에 1px solid rgba(255,255,255,0.12) 전체 inset 테두리.` },
        { name: "dot-divider-3", spec: `텍스트 위 또는 아래에 점 3개 가로 배치 (각 점: ${brandColor} 6px 원, gap:12px). 단순 구분자.` },
        { name: "number-marker", spec: `좌측 상단에 ${brandColor} 색상 큰 일련번호 "01" (font-family:monospace; font-size:14px; letter-spacing:4px; opacity:0.7).` },
        { name: "pure-negative-space", spec: "장식 0. 순수 여백과 타이포만으로 균형. 어떤 선·점·테두리도 추가하지 말 것." },
    ];
}

function bgMoodFamilies(brandColor: string): BgMoodFamily[] {
    return [
        {
            name: "deep-dark-cinematic",
            htmlSpec: `배경: 검정 #0A0A0A 베이스 + 우측 상단에 ${brandColor} radial-gradient(circle, ${brandColor}40 0%, transparent 60%) 단일 광원. 강한 명암 대비.`,
            aiPromptHint: "deep dark cinematic chiaroscuro lighting, near-black background with single dramatic light source, high contrast film noir mood, ultra moody atmosphere",
        },
        {
            name: "warm-sepia-editorial",
            htmlSpec: `배경: linear-gradient(135deg, #2A1810 0%, #1A0F08 100%) + 우측에 따뜻한 amber radial-gradient(circle at 70% 30%, #D4A574 0%, transparent 50%, transparent). 황금시간 톤.`,
            aiPromptHint: "warm golden hour editorial photography, sepia and amber tones, soft warm light, magazine cover aesthetic, vintage premium feel",
        },
        {
            name: "cool-architectural",
            htmlSpec: `배경: linear-gradient(180deg, #1A2030 0%, #0D1218 100%) + 좌측에 차가운 cyan radial-gradient(circle at 30% 50%, #4A7FA8 0%, transparent 50%). 차가운 회청색.`,
            aiPromptHint: "cool blue-gray architectural photography, brutalist modern minimalism, soft overcast light, concrete and steel tones, contemporary museum aesthetic",
        },
        {
            name: "bright-minimal",
            htmlSpec: `배경: linear-gradient(180deg, #F8F5F0 0%, #E8E2D8 100%) (크림/오프화이트). 텍스트는 #1A1A1A 검정으로 변경 필수. 부드러운 자연광 느낌.`,
            aiPromptHint: "bright minimal Apple product page aesthetic, diffused natural daylight, white and cream tones, ultra-clean composition, premium minimalism",
        },
        {
            name: "monochrome-grain",
            htmlSpec: `배경: linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%) + ::after 의사요소로 filter:url() 또는 background-image:repeating-linear-gradient로 미세한 grain 텍스처. 흑백 다큐.`,
            aiPromptHint: "black and white cinematic documentary photography, fine film grain texture, monochrome high contrast, gritty editorial mood",
        },
        {
            name: "brand-gradient-radial",
            htmlSpec: `배경: radial-gradient(circle at 50% 50%, ${brandColor} 0%, ${brandColor}80 30%, #0A0A0A 100%). 브랜드컬러가 중심에서 강하게 확산.`,
            aiPromptHint: "brand color centered radial gradient, abstract luminous composition, premium brand impact, deep saturated tones radiating outward",
        },
        {
            name: "marble-luxury",
            htmlSpec: `배경: linear-gradient(135deg, #2A2520 0%, #1A1612 100%) + 하단에 따뜻한 brass radial-gradient. 럭셔리 로비 느낌. 텍스처는 background-image:url('data:...') 대신 그라데이션 레이어링으로 표현.`,
            aiPromptHint: "luxury marble and brass textures, warm dramatic lobby lighting, premium hotel lobby aesthetic, deep stone and gold tones, opulent atmosphere",
        },
        {
            name: "concrete-modern",
            htmlSpec: `배경: linear-gradient(180deg, #3A3A3A 0%, #1A1A1A 100%) + 우측 상단에 차가운 white radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 50%). 노출 콘크리트 톤.`,
            aiPromptHint: "exposed concrete modern minimalism, cool gray tones, brutalist architectural detail, soft directional natural light, contemporary gallery space",
        },
    ];
}

// ─── 공개 API ───

export function getLawyerDesignDNA(lawyerId: string, brandColor: string): DesignDNA {
    const safeColor = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#3563AE";
    const safeId = lawyerId || "default";
    const [i1, i2, i3, i4] = hashIndices(safeId);

    return {
        layoutFamily: layoutFamilies()[i1],
        typoFamily: typoFamilies()[i2],
        accentFamily: accentFamilies(safeColor)[i3],
        bgMoodFamily: bgMoodFamilies(safeColor)[i4],
    };
}
