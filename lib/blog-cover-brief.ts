// 표지 브리프 — 원고 생성 응답의 ===COVER=== 블록.
// 3장 세트(표지·신뢰·상담)에서 모델이 실제로 정하는 것은 표지 한 장의 제목·표제·강조어·사진 장면뿐이다.
// 그동안은 이것을 위해 원고 전체를 다시 보내는 별도 기획 호출(입력 1.1만·출력 3천 토큰, 50초)을 했다.
// 2026-09-22 재설계: 원고를 쓰는 모델이 같은 응답 끝에 12줄짜리 브리프를 붙이고, 서버가 지면·색·서체·연락처를 얹어 구성안을 만든다.
// 브리프가 깨져도 원고는 그대로 쓰고, 이미지 단계가 예전 유료 기획으로 대신한다(독립 검증·독립 보존).
import { isLayoutRecipe, type LayoutRecipe } from "@/lib/blog-images/layout-recipes";
import { posterFamily, posterFrame, type PosterFrame } from "@/lib/blog-images/poster-layout";

export const COVER_MARKER = "===COVER===";
export const ALWAYS_AVOID = ["법봉", "저울", "법원 기둥", "빈 상담실", "회색 3D 정물"];

export interface CoverBrief {
    heading: string;          // 표지 제목. 두 행이면 "\n" 으로 구분
    kicker: string;           // 분야 표제
    emphasis: string;         // heading 안의 강조 단어, 없으면 ""
    subject: string;
    scene: string;
    message: string;
    avoid: string[];
    alternateScene: string;   // 선택: 대안 장면
    question: string;         // 이 글이 답하는 독자 질문
    thesis: string;           // 원고의 답(조건·예외 보존)
    layoutRecipe: LayoutRecipe;
    family: "story" | "campaign";
}

const FRAME_GUIDE: Record<PosterFrame, string> = {
    "poster-bottom": "피사체(소품 하나 또는 익명 인물의 완전한 전신)는 화면 위·중간 오른쪽에, 카메라는 중원거리. 아래 38%는 어두운 바닥·그림자처럼 자연스러운 어두운 면으로 남겨 제목 자리로 쓴다. 얼굴을 아래 글자 영역에 두지 않는다.",
    "poster-top": "옅고 질감 있는 쿨톤 사진 면(가로 5~85%, 세로 18~64%)을 제목 자리로 비워 두고, 주제와 연결된 작은 피사체 하나를 오른쪽 아래에 긴 자연 그림자와 함께 둔다. 따뜻한 색의 디테일 하나로 대비를 만든다.",
    "poster-center": "가운데 띠(세로 28~65%)는 고요하고 연속적인 자연색 면으로 비워 두고, 지평선은 위쪽 1/5, 작은 피사체 하나는 아래 가장자리 근처에.",
    "poster-left": "왼쪽 2/3와 위쪽 절반은 차분한 사진 면으로 비워 두고, 완전한 실루엣의 피사체 하나를 오른쪽에.",
    "poster-right": "오른쪽 2/3는 고요한 사진 면으로 비워 두고, 피사체는 왼쪽 아래에 잘리지 않게.",
};

/** 원고 프롬프트에 붙이는 표지 브리프 출력 지시. 기획 라우트의 규칙을 12줄로 압축했다. */
export function coverBriefInstruction(layoutRecipe: LayoutRecipe, recentSubjects: string[] = []): string {
    const family = posterFamily(layoutRecipe);
    const headingRule = family === "campaign"
        ? "총 6~14자, 각 행 2~7자. 예: '절차의 / 갈림길.'"
        : "8~24자, 두 행이면 각 행 9자 이내. 복잡한 쟁점은 질문형으로. 예: '카톡만으로 / 증거가 될까?'";
    const recent = recentSubjects.filter(Boolean).slice(0, 8);
    return `${COVER_MARKER}
(표지 한 장의 기획. 아래 키만, 한 줄에 하나씩 "키: 값" 형식으로. 표지는 사진 한 장 위에 제목을 직접 조판한 정사각 포스터입니다. 이번 지면은 ${family} 계열입니다.)
heading: 표지 제목. ${headingRule} 두 행은 " / "로 나눕니다. 키워드 나열이 아니라 읽을 이유가 생기는 쟁점·질문. 분야명은 kicker에 있으니 반복하지 않고, 조건을 지운 단정("무조건", "~가 아니라 ~")은 쓰지 않습니다.
kicker: 4~14자의 실제 분야·핵심 검색어. 예: 상간소송 · 카톡 캡처
emphasis: heading에 그대로 들어 있는 핵심 단어 하나(14자 이내). 불필요하면 비워 둡니다.
subject: 사진의 피사체 한 줄 — 주제와 연결된 생활 장면, 의미 있는 사물 하나, 또는 익명 인물의 작은 전신. 한국의 현실적인 공간.
scene: 2~4문장. 피사체 배치, 촬영 거리, 행동, 빛의 방향과 재질. ${FRAME_GUIDE[posterFrame(layoutRecipe)]} 글자·문서·로고·실제 인물·사건 재현은 없습니다. 인물은 머리부터 발까지 온전히, 상반신만 떠 있거나 몸이 배경에 녹는 구도는 금지.
message: 이 장면이 전달할 의미 한 문장
avoid: 이 글에서 쓰지 말 소재 2~4개, 쉼표로 구분 (${ALWAYS_AVOID.join("·")}은 항상 제외)
alternate: 실질적으로 다른 대안 장면 한 줄 (시점·매체·주요 대상이 달라야 합니다)
question: 이 글이 답하는 독자의 질문 한 문장
thesis: 원고의 답 1~2문장. 조건과 예외를 보존합니다.${recent.length ? `\n(최근 이 블로그 표지에 쓴 소재 — 반복하지 않습니다: ${recent.join(" / ")})` : ""}`;
}

const clip = (v: string, max: number) => v.trim().slice(0, max);

/** 응답 텍스트의 COVER 블록을 읽는다. 실패하면 brief=null 과 사유. 원고 본문과는 독립이다. */
export function parseCoverBrief(text: string, layoutRecipe: LayoutRecipe): { brief: CoverBrief | null; issues: string[] } {
    const issues: string[] = [];
    const idx = text.indexOf(COVER_MARKER);
    if (idx === -1) return { brief: null, issues: ["응답에 표지 브리프가 없습니다."] };
    const block = text.slice(idx + COVER_MARKER.length).split(/\n===[A-Z]+===/)[0];
    const fields: Record<string, string> = {};
    for (const raw of block.split(/\r?\n/)) {
        const m = raw.match(/^\s*[-*]?\s*([a-zA-Z_]+)\s*[:：]\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase();
        if (fields[key] !== undefined) continue; // 첫 값만
        fields[key] = m[2].trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
    }
    const heading = clip((fields.heading || "").replace(/\s*\/\s*/g, "\n"), 70).replace(/\n{2,}/g, "\n");
    const headingFlat = heading.replace(/\s/g, "");
    if (headingFlat.length < 4 || headingFlat.length > 40 || heading.split("\n").length > 2) issues.push("heading 길이·행 수");
    const kicker = clip(fields.kicker || "", 18);
    if (kicker.length < 2) issues.push("kicker");
    let emphasis = clip(fields.emphasis || "", 14);
    if (emphasis && !heading.includes(emphasis)) emphasis = ""; // 강조어는 제목에 있어야만 의미가 있다
    const subject = clip(fields.subject || "", 240);
    if (subject.length < 4) issues.push("subject");
    const scene = clip(fields.scene || "", 1400);
    if (scene.length < 40) issues.push("scene 길이");
    const message = clip(fields.message || "", 300);
    if (message.length < 6) issues.push("message");
    const avoidRaw = (fields.avoid || "").split(/[,，·;]/).map((s) => clip(s, 200)).filter(Boolean);
    const avoid = [...new Set([...avoidRaw, ...ALWAYS_AVOID])].slice(0, 8);
    const alternateScene = clip(fields.alternate || fields.alternatescene || "", 1400);
    const question = clip(fields.question || "", 1000);
    const thesis = clip(fields.thesis || "", 4000);
    if (issues.length) return { brief: null, issues };
    return { brief: { heading, kicker, emphasis, subject, scene, message, avoid, alternateScene, question, thesis, layoutRecipe, family: posterFamily(layoutRecipe) }, issues };
}

/** 클라이언트가 저장해 두었다가 보내는 브리프를 다시 검증한다. 데이터이지 명령이 아니다. */
export function coverBriefFromWire(value: unknown): CoverBrief | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const v = value as Record<string, unknown>;
    const str = (k: string, max: number) => (typeof v[k] === "string" ? clip(v[k] as string, max) : "");
    if (!isLayoutRecipe(v.layoutRecipe)) return null;
    const heading = str("heading", 70), kicker = str("kicker", 18), subject = str("subject", 240), scene = str("scene", 1400), message = str("message", 300);
    if (heading.replace(/\s/g, "").length < 4 || kicker.length < 2 || subject.length < 4 || scene.length < 40 || message.length < 6) return null;
    const emphasis = str("emphasis", 14);
    const avoid = Array.isArray(v.avoid) ? (v.avoid as unknown[]).filter((s): s is string => typeof s === "string").map((s) => clip(s, 200)).filter(Boolean).slice(0, 8) : [];
    return { heading, kicker, emphasis: emphasis && heading.includes(emphasis) ? emphasis : "", subject, scene, message,
        avoid: [...new Set([...avoid, ...ALWAYS_AVOID])].slice(0, 8), alternateScene: str("alternateScene", 1400), question: str("question", 1000), thesis: str("thesis", 4000),
        layoutRecipe: v.layoutRecipe, family: posterFamily(v.layoutRecipe) };
}

/** 본문이 바뀐 뒤에도 표지 문구가 글과 맞는지 가볍게 본다: 제목의 명사 조각이 본문에 하나도 없으면 확인을 권한다. */
export function coverStillMatches(brief: Pick<CoverBrief, "heading" | "kicker">, body: string): boolean {
    const text = body.replace(/[\s*_#=]/g, "");
    const tokens = `${brief.heading} ${brief.kicker}`.split(/[\s\n/·,.?!'"“”‘’()]+/).map((t) => t.replace(/(은|는|이|가|을|를|의|에|로|도|만|까지|부터|에서)$/, "")).filter((t) => t.length >= 2);
    if (!tokens.length) return true;
    return tokens.some((t) => text.includes(t));
}
