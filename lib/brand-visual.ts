// 시각물 공통 규율.
//
// 블로그 카드 · 카드뉴스 · 웹툰 렌더러가 전부 여기를 본다.
// 전에는 세 곳이 각자 다른 그라데이션과 그림자를 갖고 있었고,
// 그게 "AI가 만든 이미지" 라는 인상의 실체였다.
//
// ── 원칙 ──
// "무엇이 다른가"는 크게, "어떻게 만드는가"는 하나로.
//
// 변호사별 차이는 design-dna.ts 의 정체성 축이 만든다(지면·서체·이미지·판형).
// 이 파일은 그 차이와 무관하게 전부에 적용되는 규율이다.
// 문학동네와 민음사는 판형도 색도 다르지만, 둘 다 그라데이션을 쓰지 않는다.

/* ═══════════════ 팔레트 ═══════════════ */

export const INK = {
    /** 종이 — 순백이 아니다. 화면에서 인쇄물처럼 읽힌다 */
    paper: "#FBFAF8",
    /** 잉크 — 순검정이 아니다. #000 은 화면에서 구멍처럼 보인다 */
    ink: "#0E1116",
    /** 잉크형 지면의 바탕 */
    inkDeep: "#07111D",
    charcoal: "#2A2E35",
    /** 보조 텍스트 */
    gray: "#6A6F78",
    grayOnDark: "#8794A6",
    /** 구분선 — 회색이 아니라 따뜻한 톤. 종이 위에서 자연스럽다 */
    line: "#E3E1DC",
    lineOnDark: "#1C2B40",
} as const;

/* ═══════════════ 금지 목록 ═══════════════
   이 다섯 개가 "AI 티" 의 실질적 정의다.
   하나라도 들어가면 나머지를 아무리 잘 만들어도 티가 난다. */

export const FORBIDDEN = [
    "그라데이션 — linear-gradient · radial-gradient 전부. 배경은 단색만.",
    "그림자 — box-shadow · text-shadow · drop-shadow 전부. 구분은 1px 선으로.",
    "이미지 위에 글씨 얹기 — 사진과 텍스트는 영역을 나눈다. 검정 오버레이 금지.",
    "장식용 색 막대 — 의미 없는 짧은 컬러 바·L자 코너·점 3개.",
    "큰 라운드 — border-radius 는 2px 까지. 그 이상은 SaaS 신호다.",
] as const;

/* ═══════════════ 규율 (프롬프트 주입용) ═══════════════ */

export function visualDiscipline(): string {
    return `[시각 규율 — 예외 없음]
${FORBIDDEN.map((f) => `- 금지: ${f}`).join("\n")}

[대신 이렇게]
- 배경은 단색 하나. 지면 성격(밝음/어두움)은 아래 DNA 가 정한다.
- 위계는 장식이 아니라 글자 크기 대비와 여백으로 만든다.
- 구분이 필요하면 1px 선. 색은 밝은 지면 ${INK.line}, 어두운 지면 ${INK.lineOnDark}.
- 정렬은 좌측. 중앙 정렬은 감성 카드 신호라 쓰지 않는다.
- 브랜드 컬러는 한 장에 한 곳까지. 넓은 면적을 칠하지 않는다.

[왜]
그림자가 필요하다는 것은 배경이 잘못됐다는 뜻이다.
장식이 필요하다는 것은 여백이 부족하다는 뜻이다.`;
}

/* ═══════════════ 판형 ═══════════════ */

export const FORMATS = {
    square: { w: 800, h: 800, label: "1:1" },
    portrait: { w: 800, h: 1000, label: "4:5" },
} as const;

export type FormatKey = keyof typeof FORMATS;

/* ═══════════════ 타입 스케일 ═══════════════
   한글은 영문보다 행간을 넉넉히. 그게 editorial 인상의 절반이다. */

export const TYPE = {
    display: { size: 58, weight: 700, tracking: -2.4, leading: 1.14 },
    title: { size: 40, weight: 700, tracking: -1.4, leading: 1.28 },
    sub: { size: 26, weight: 500, tracking: -0.6, leading: 1.5 },
    body: { size: 20, weight: 400, tracking: -0.2, leading: 1.75 },
    label: { size: 13, weight: 500, tracking: 2.4, leading: 1 },
    /** 카드 순번 — 카드뉴스에서 순서는 정보다. 크게 쓴다. */
    index: { size: 15, weight: 600, tracking: 2, leading: 1 },
} as const;

/* ═══════════════ 지면별 색 조합 ═══════════════ */

export interface SurfaceColors {
    bg: string;
    fg: string;
    muted: string;
    line: string;
}

export function surfaceColors(kind: "paper" | "ink"): SurfaceColors {
    return kind === "paper"
        ? { bg: INK.paper, fg: INK.ink, muted: INK.gray, line: INK.line }
        : { bg: INK.inkDeep, fg: INK.paper, muted: INK.grayOnDark, line: INK.lineOnDark };
}

/* ═══════════════ 서체 ═══════════════ */

export const FONT_IMPORT =
    "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@500;700&display=swap');";

export const FONT_STACK = {
    gothic: "'Noto Sans KR', sans-serif",
    serif: "'Noto Serif KR', serif",
} as const;

/** 브랜드 컬러 검증. 잘못된 값이 들어와도 렌더가 깨지지 않게. */
export function safeBrandColor(v: string | undefined | null): string {
    return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#3563AE";
}
