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
    heading: WritingTrait;          // 소제목 형식 — 변호사 고정
    emphasis: EmphasisDensity;      // 강조 밀도 — 변호사 고정
    structures: WritingTrait[];     // 배정된 본문 구조 2~3개 — 이 안에서 글마다 선택
    structure: WritingTrait;        // 이번 글에 선택된 구조
    targetLength: number;           // 이번 글 목표 분량 (공백 포함)
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

const EMPHASIS: EmphasisDensity[] = [
    { name: "절제", highlight: [1, 2], underline: [3, 4], bold: 6 },
    { name: "표준", highlight: [2, 3], underline: [5, 7], bold: 10 },
    { name: "적극", highlight: [3, 4], underline: [7, 9], bold: 14 },
];

// 변호사별 분량 중심값. 짧게 쓰는 블로그와 길게 쓰는 블로그가 갈리도록.
// ±400을 해도 2,000~4,000 안에 정확히 들어가는 값만 쓴다.
// 범위 밖으로 나가 잘리면 2,000과 4,000에 값이 몰려 그것 자체가 패턴이 된다.
// 목표가 3,600을 넘기면 모델이 따라오지 못하고 800자쯤 미달한다(실측).
// 실제로 지켜지는 구간에서만 중심값을 잡는다. 상한을 낮춰도 블로그 간 낙차는 충분하다.
const LENGTH_CENTERS = [2300, 2550, 2800, 3050, 3300];

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

    // 중심값 ±300, 2,000~3,600 안에 가둔다
    const drift = (fnv1a(key + "|" + postSeed, 0x7feb352d) % 601) - 300;
    const targetLength = Math.max(2000, Math.min(3600, lengthCenter + drift));

    // 카드 종류가 썸네일·상황·정보·요약 넷뿐이라 3~4장 사이에서만 흔든다.
    const imageCount = 3 + (fnv1a(key + "|" + postSeed, 0x9e3779b9) % 2); // 3~4

    return { voice, heading, emphasis, structures, structure, targetLength, imageCount };
}

/** 원고 생성 프롬프트에 끼워 넣을 지시문. */
export function dnaDirective(dna: WritingDNA): string {
    const { voice, heading, emphasis, structure, targetLength } = dna;
    return `[이 변호사의 글쓰기 DNA — 아래를 이 글의 기본값으로 삼으세요]
- 문체 "${voice.name}": ${voice.spec}
- 소제목 형식 "${heading.name}": ${heading.spec} 모든 소제목을 이 형식으로 통일하세요.
- 본문 구조 "${structure.name}": ${structure.spec}
- 강조 밀도 "${emphasis.name}": ==형광펜== ${emphasis.highlight[0]}~${emphasis.highlight[1]}곳, __밑줄__ ${emphasis.underline[0]}~${emphasis.underline[1]}곳, **굵게** ${emphasis.bold}곳 이내.
- 분량: 공백 포함 ${targetLength - 200}~${targetLength + 200}자.`;
}
