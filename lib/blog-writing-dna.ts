// ─── 변호사별 글쓰기 DNA ───
// 8개 블로그가 같은 출처로 보이지 않도록, 변호사마다 글의 목소리와 뼈대를 갈라놓는다.
// lib/blog-images/design-dna.ts와 같은 방식(FNV-1a 해시)이라 같은 변호사는 언제나 같은 DNA를 받는다.
//
// 고정과 변주를 나눈 이유:
//   전부 랜덤이면 한 변호사의 블로그가 글마다 딴사람이 쓴 것처럼 보인다. 그건 차별화가 아니라 산만함이다.
//   목소리(문체·소제목·강조밀도)는 변호사에 고정해 정체성을 만들고,
//   뼈대와 분량은 글마다 흔들어 같은 틀의 반복을 피한다.

export interface WritingTrait {
    name: string;
    spec: string;
}

export interface WritingDNA {
    voice: WritingTrait;            // 문체 — 변호사 고정
    temperature: WritingTrait;      // 온도 — 변호사 고정. 어미 변주·독자 호명의 세기
    heading: WritingTrait;          // 소제목 형식 — 변호사 고정
    emphasis: EmphasisDensity;      // 강조 밀도 — 변호사 고정
    structures: WritingTrait[];     // 배정된 본문 구조 2~3개 — 이 안에서 글마다 선택
    structure: WritingTrait;        // 이번 글에 선택된 구조
    targetLength: number;           // 이번 글 목표 분량 (공백 포함) — 매거진→네이버 변환 등 기존 호출부가 쓴다
    targetNoSpace: number;          // 이번 글 목표 분량 (공백 제외) — 발행 화면의 글자수와 같은 단위
    honesty: WritingTrait;          // 정직 신호의 방식 — 변호사 고정
    closing: WritingTrait;          // 마무리 방식 — 글마다 선택
    imageCount: number;             // 이번 글 카드 장수 (3~4)
}

export interface EmphasisDensity {
    name: string;
    highlight: [number, number];
    underline: [number, number];
    bold: number;
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

// ─── 카탈로그 ───

const VOICES: WritingTrait[] = [
    { name: "담담한 실무자", spec: "감정을 절제하고 사실만 담담하게 전한다. 단문 위주. 위로하거나 겁주지 않는다. 형용사를 아낀다." },
    { name: "따뜻한 조력자", spec: "먼저 상황을 공감하는 문장으로 문단을 연다. 종결어미를 부드럽게(~하시죠, ~합니다) 섞는다. 다만 감상에 빠지지 않는다." },
    { name: "단정한 강의체", spec: "개념을 정리해 가르치듯 쓴다. 문단마다 한 가지 논점만 다루고, 앞 문단과의 관계를 한 문장으로 이어준다." },
    { name: "대화체 상담", spec: "의뢰인이 실제로 한 말을 큰따옴표로 자주 인용하고, 그 말에 답하는 형식으로 전개한다. 되묻는 문장을 섞는다." },
    { name: "절제된 전문가", spec: "수식어를 거의 쓰지 않는다. 조문과 기준 중심으로 건조하게. 문장이 짧고 단정적이다." },
    { name: "회고형", spec: "지나간 사건을 돌아보며 쓰는 어조. \"그때는\", \"돌이켜보면\" 같은 시점 이동을 쓴다. 사건의 전개를 따라간다." },
];

// 온도 — "AI 티"의 실체는 ~습니다 100% 단조와 빈틈없는 밀도였다.
// 형용사(따뜻하게)는 모델이 못 지키므로 회수로 지정한다. 윤문 가드가 실측 검증한다.
const TEMPERATURES: WritingTrait[] = [
    {
        name: "차분",
        spec: "기본 어미는 ~합니다. 글 전체에서 3~5회만 ~죠/~했죠(공유된 이해), ~인데요(화제 전환), ~거든요(이유 귀띔)를 쓴다. "
            + "법 조문·형량·기한을 말하는 문장에는 쓰지 않는다(정보는 단정 유지). 한 문단에 1회를 넘기지 않는다.",
    },
    {
        name: "친근",
        spec: "기본 어미는 ~합니다. 글 전체에서 6~9회 ~죠/~했죠, ~인데요, ~거든요, ~겁니다(전망)를 섞는다. "
            + "법 조문·형량·기한 문장에는 쓰지 않는다. 한 문단에 1회까지. 독자 호명 문장에서는 특히 부드럽게.",
    },
];

const HEADINGS: WritingTrait[] = [
    { name: "질문형", spec: "소제목을 질문으로 쓴다. 예: \"이 경우에도 처벌될까\", \"합의하면 끝나는 걸까\"" },
    { name: "명사 단정형", spec: "소제목을 명사구로 짧게 끊는다. 예: \"공연성의 경계\", \"측정 시점의 함정\"" },
    { name: "사례 지시형", spec: "소제목에 사건의 구체적 사실을 넣는다. 예: \"12명 방과 3명 방\", \"40분 뒤에 잰 수치\"" },
    { name: "인용형", spec: "소제목을 의뢰인의 말로 쓴다. 작은따옴표로 감싼다. 예: \"'그냥 아는 사이인데요'\"" },
    { name: "진술형", spec: "소제목을 문장으로 쓴다. 예: \"여기서 결론이 갈립니다\", \"수치보다 중요한 게 있습니다\"" },
];

const STRUCTURES: WritingTrait[] = [
    { name: "사례 선행형", spec: "구체적 사례 → 그 사건의 쟁점 → 일반 기준 → 정리 순으로 전개한다." },
    { name: "결론 선행형", spec: "답을 먼저 제시 → 근거 → 반대 결론이 나는 경우 → 조건 정리 순으로 전개한다." },
    { name: "두 사건 대조형", spec: "결론이 갈린 두 사건을 나란히 놓고 → 무엇이 달랐는지 → 그 차이가 일반적으로 갖는 의미 순으로 전개한다." },
    { name: "절차 추적형", spec: "시간 순으로 단계를 따라가며, 각 단계에서 결과가 갈리는 분기점을 짚는다." },
    { name: "오해 교정형", spec: "흔한 오해 두세 개를 차례로 꺼내 각각 반박하고, 실제 기준을 세운다." },
    { name: "질문 응답형", spec: "의뢰인이 실제로 묻는 질문을 하나씩 세우고 답하는 방식으로 전개한다. 다만 형식적인 FAQ 나열이 되면 안 된다." },
];

// 정직 신호 — 예고 문구("솔직히 말씀드리면")로 시작하면 8개 블로그에 같은 지문이 남는다(실측 70%).
// 그래서 '무엇을 밝히는가'를 변호사마다 갈라 두고, 예고 없이 내용으로만 말하게 한다.
const HONESTIES: WritingTrait[] = [
    { name: "실익 먼저", spec: "절차를 밟아도 얻는 것이 적은 경우를 구체적 조건과 함께 밝힌다." },
    { name: "한계 먼저", spec: "이 글이 설명한 방법이 통하지 않는 조건을 하나 짚어 밝힌다." },
    { name: "기다림의 선택", spec: "지금 움직이지 않고 지켜보는 편이 나은 상황을 조건과 함께 밝힌다." },
    { name: "혼자 되는 범위", spec: "변호사 없이 당사자가 직접 처리해도 되는 범위를 구체적으로 선 그어 준다." },
];

// 마무리 — 서류·준비물 목록으로 닫지 않는다(대표 지시 2026-09-17).
// 서류가 많아 보이면 독자는 전화를 미룬다. 실측 45편 중 38편이 '상담 전 준비물'로 끝났다.
// 예시 문장은 넣지 않는다. 예시는 그대로 복제되어 지문이 된다.
const CLOSINGS: WritingTrait[] = [
    { name: "오늘의 한 가지", spec: "독자가 지금 앉은 자리에서 할 수 있는 행동 하나로 닫는다. 서류를 떼거나 모으는 일이 아니라 확인·보존·중단처럼 가볍고 즉시 가능한 일이어야 한다. 왜 그 하나인지 이유를 붙인다." },
    { name: "갈림길 점검", spec: "이 글에서 결론을 가른 조건 두세 가지를 독자가 자기 사안에 대입해 보게 하는 문장으로 닫는다. 목록이 아니라 이어지는 문장으로 쓴다." },
    { name: "가장 가까운 기한", spec: "본문에 나온 기한 가운데 독자에게 가장 먼저 닥치는 것 하나만 다시 짚고, 그 날짜를 세는 기준일이 무엇인지 알려 주며 닫는다." },
    { name: "첫 통화의 모습", spec: "상담은 자료 없이 시작된다는 점을 전한다. 첫 통화에서 변호사가 묻는 두세 가지를 알려 주고, 기억나는 대로 말하면 되며 필요한 자료는 그 뒤에 정해진다는 것으로 닫는다." },
    { name: "도입 회수", spec: "첫 문단의 장면이나 질문으로 돌아가, 글을 다 읽은 지금 그 장면이 어떻게 달리 보이는지 말하며 닫는다. 새 정보를 덧붙이지 않는다." },
];

const EMPHASIS: EmphasisDensity[] = [
    { name: "절제", highlight: [1, 2], underline: [3, 4], bold: 6 },
    { name: "표준", highlight: [2, 3], underline: [5, 7], bold: 10 },
    { name: "적극", highlight: [3, 4], underline: [7, 9], bold: 14 },
];

// 분량 중심값 — 대표 지시(2026-09-07): 리서치급으로 자세히, 3천자 수준.
// 중심을 3,000 부근으로 좁히되 완전히 같으면 그것 자체가 패턴이라 소폭 낙차만 남긴다.
// 목표가 3,600을 넘기면 모델이 따라오지 못하고 800자쯤 미달한다(실측) — 상한 유지.
// V10.7 — 실측 3편(2795·2388·2023 공백제외)이 연속 하한 미달이라 +150 보정.
// 모델은 목표 대비 짧게 쓰는 경향이 있어 목표를 올려 실착지를 3천자대에 맞춘다.
const LENGTH_CENTERS = [3050, 3150, 3250, 3350];

// 공백 제외 기준 목표 — 발행 화면이 공백 제외로 표시하므로 이 단위로 맞춘다.
// 실측(2026-09-17, 45편): 공백 포함 평균 2,663 = 공백 제외 2,035. 전 편이 2,500 미만이었다.
// 글자수 지시만으로는 모델이 따라오지 못한다. 실제 분량은 dnaDirective의 '구조 예산'이 만든다.
const NO_SPACE_CENTERS = [2800, 2880, 2960, 3040];

/**
 * 변호사의 글쓰기 DNA를 뽑는다.
 * @param profileId  blog_profiles.id — 같은 값이면 언제나 같은 목소리가 나온다
 * @param salt       DNA가 다른 변호사와 겹칠 때 어긋내는 값 (blog_profiles.dna_salt)
 * @param postSeed   글 단위로 달라지는 값(주제 등). 구조·분량·이미지 장수만 이걸로 흔든다
 */
export function getWritingDNA(profileId: string, salt = "", postSeed = ""): WritingDNA {
    const key = profileId + salt;

    // ── 변호사 고정 축 ──
    const voice = VOICES[fnv1a(key, 0x811c9dc5) % VOICES.length];
    const temperature = TEMPERATURES[fnv1a(key, 0x94d049bb) % TEMPERATURES.length];
    const heading = HEADINGS[fnv1a(key, 0x9e3779b1) % HEADINGS.length];
    const emphasis = EMPHASIS[fnv1a(key, 0x85ebca77) % EMPHASIS.length];
    const lengthCenter = LENGTH_CENTERS[fnv1a(key, 0xc2b2ae35) % LENGTH_CENTERS.length];

    // 구조는 6종 중 2~3개만 배정한다. 한 변호사가 모든 뼈대를 쓰면 정체성이 흐려지고,
    // 하나만 쓰면 매 글이 같은 틀이라 그것 자체가 지문이 된다.
    const pick = fnv1a(key, 0x27d4eb2f);
    const assignCount = 2 + (pick % 2); // 2 또는 3
    const structures: WritingTrait[] = [];
    for (let i = 0; structures.length < assignCount && i < 32; i++) {
        const cand = STRUCTURES[fnv1a(key + ":s" + i, 0x165667b1) % STRUCTURES.length];
        if (!structures.some((s) => s.name === cand.name)) structures.push(cand);
    }

    // ── 글 단위 변주 축 ──
    const postHash = fnv1a(key + "|" + postSeed, 0x2545f491);
    const structure = structures[postHash % structures.length];

    // 중심값 ±150, 2,850~3,550 안에 가둔다 — 전 편이 리서치급 분량대에 머문다
    const drift = (fnv1a(key + "|" + postSeed, 0x7feb352d) % 301) - 150;
    const targetLength = Math.max(2850, Math.min(3550, lengthCenter + drift));

    const noSpaceCenter = NO_SPACE_CENTERS[fnv1a(key, 0xc2b2ae35) % NO_SPACE_CENTERS.length];
    const targetNoSpace = Math.max(2700, Math.min(3150, noSpaceCenter + Math.round(drift * 0.6)));

    const honesty = HONESTIES[fnv1a(key, 0x5bd1e995) % HONESTIES.length];
    const closing = CLOSINGS[fnv1a(key + "|" + postSeed, 0x1b873593) % CLOSINGS.length];

    // 카드 종류가 썸네일·상황·정보·요약 넷뿐이라 3~4장 사이에서만 흔든다.
    const imageCount = 3 + (fnv1a(key + "|" + postSeed, 0x9e3779b9) % 2); // 3~4

    return { voice, temperature, heading, emphasis, structures, structure, targetLength, targetNoSpace, honesty, closing, imageCount };
}

/** 원고 생성 프롬프트에 끼워 넣을 지시문. */
export function dnaDirective(dna: WritingDNA): string {
    const { voice, temperature, heading, emphasis, structure, targetNoSpace, honesty, closing } = dna;
    return `[이 변호사의 글쓰기 DNA — 아래를 이 글의 기본값으로 삼으세요]
- 문체 "${voice.name}": ${voice.spec}
- 온도 "${temperature.name}": ${temperature.spec}
- 소제목 형식 "${heading.name}": ${heading.spec} 모든 소제목을 이 형식으로 통일하세요. 위 예시 문구는 형식 견본일 뿐이므로 그대로 쓰지 마세요.
- 본문 구조 "${structure.name}": ${structure.spec}
- 강조 밀도 "${emphasis.name}": ==형광펜== ${emphasis.highlight[0]}~${emphasis.highlight[1]}곳, __밑줄__ ${emphasis.underline[0]}~${emphasis.underline[1]}곳, **굵게** ${emphasis.bold}곳 이내.

[사람의 리듬 — 장치의 '역할'만 지정합니다. 문장은 이 글의 내용에서 새로 지으세요]
- 숨 고르기: 글 전체에서 2~3곳. 정보를 더하지 않는 짧은 문장으로, 방금 설명한 내용을 한 발 물러서 평가하거나 독자가 느꼈을 반응을 짚습니다. 모든 소제목마다 넣지 말고, 매번 다른 문형으로 씁니다.
- 독자 호명: 본문 중간에 1회. 이 주제의 독자가 지금 실제로 하고 있을 행동이나 마음 상태를 구체적으로 짚습니다. 칭찬하거나 안심시키는 상투구로 끝내지 말고 다음 설명으로 이어 주세요.
- 정직 신호 "${honesty.name}": 글 전체에서 정확히 1회. ${honesty.spec} 예고하는 말 없이 내용만 말합니다.
- 목록 항목의 길이와 문형은 조금씩 달라야 합니다. 완벽한 병렬은 기계 티가 납니다.

[마무리 방식 "${closing.name}"]
${closing.spec}
마지막 문단은 2~4문장, 목록 없이 씁니다. 서류·증거·준비물 목록, '상담 전 준비'류 소제목으로 끝내지 않습니다.

[분량 설계 — 글자 수가 아니라 구조로 맞춥니다]
- 목표: 공백 제외 ${targetNoSpace - 150}~${targetNoSpace + 150}자.
- 소제목(##) 6~7개. 소제목마다 문단 4~5개. 문단은 3~4문장. 숨 고르기용 한 문장 문단은 예외입니다.
- 전체 문장 수 70개 안팎. 이 구조를 실질 정보로 채우면 목표 분량이 됩니다. 아는 말을 늘려 채우지 마세요.`;
}
