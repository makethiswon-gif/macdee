// 변호사별 디자인 DNA.
//
// lawyerId 를 결정론적으로 해시해 4개 축에서 값을 뽑는다.
// 같은 변호사는 영원히 같은 DNA → 브랜드 일관성.
//
// ══ 2026-08 개정 — 축을 통째로 바꿨다 ══
//
// 이전에는 8^4 = 4096 조합이었다. 그런데 조합이 아무리 많아도 8개 블로그를
// 나란히 놓으면 같은 공장에서 나온 게 보였다. 이유는 가르는 축이
// **장식 축**이었기 때문이다 —
//   layout  : 텍스트를 좌상단에? 우하단에?
//   typo    : Noto Sans 900? 300? (8종 중 7종이 "색상 흰색"으로 끝났다)
//   accent  : 2px 선? 6px 선? L자? 점 3개?
//   bgMood  : 8종 중 7종이 어두운 그라데이션
// 결국 4096개가 전부 "어두운 배경 + 흰 글씨 + 짧은 컬러 선" 의 변주였다.
//
// 신문 가판대에서 신문을 구분하는 것은 제호·판형·흑백 비율이지 괘선 두께가 아니다.
// 그래서 조합 수를 3×2×3×2 = 36 으로 줄이고 차이의 크기를 키웠다.
// 36개는 전부 육안으로 구분된다. 8명에게는 충분하고, 100명이 되면 축을 하나 더 얹는다.
//
// 공통 규율(그라데이션·그림자·이미지 위 글씨 금지)은 lib/brand-visual.ts 에 있다.
// "무엇이 다른가"는 여기서, "어떻게 만드는가"는 거기서.

import { FORMATS, FONT_STACK, surfaceColors, type FormatKey, type SurfaceColors } from "@/lib/brand-visual";

/* ═══════════════ 해시 ═══════════════ */

function fnv1a(input: string, seed = 0x811c9dc5): number {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/* ═══════════════ 축 1 — 지면 성격 ═══════════════
   가장 크게 갈리는 축. 멀리서 봐도 구분된다. */

export type SurfaceKind = "paper" | "ink" | "split";

export interface SurfaceFamily {
    key: SurfaceKind;
    name: string;
    /** Claude 에게 주는 지시 */
    spec: string;
    /** 렌더러가 쓰는 실제 색 */
    colors: SurfaceColors;
    /** split 일 때 아래쪽 면의 색 */
    secondary?: SurfaceColors;
}

function surfaceFamilies(): SurfaceFamily[] {
    const paper = surfaceColors("paper");
    const ink = surfaceColors("ink");
    return [
        {
            key: "paper",
            name: "종이형",
            spec: `배경 전체를 ${paper.bg} 단색으로. 글자는 ${paper.fg}. 인쇄물처럼 밝고 담백하게. 그라데이션 없음.`,
            colors: paper,
        },
        {
            key: "ink",
            name: "잉크형",
            spec: `배경 전체를 ${ink.bg} 단색으로. 글자는 ${ink.fg}. 깊고 조용하게. 그라데이션·광원 효과 없음.`,
            colors: ink,
        },
        {
            key: "split",
            name: "분할형",
            spec: `가로로 화면을 나눈다. 위 55% 는 ${ink.bg} 에 ${ink.fg} 글자, 아래 45% 는 ${paper.bg} 에 ${paper.fg} 글자. 경계는 직선 한 줄, 그라데이션으로 섞지 않는다.`,
            colors: ink,
            secondary: paper,
        },
    ];
}

/* ═══════════════ 축 2 — 서체 계열 ═══════════════ */

export type TypefaceKind = "gothic" | "serif";

export interface TypefaceFamily {
    key: TypefaceKind;
    name: string;
    stack: string;
    spec: string;
}

function typefaceFamilies(): TypefaceFamily[] {
    return [
        {
            key: "gothic",
            name: "고딕",
            stack: FONT_STACK.gothic,
            spec: `제목은 Noto Sans KR 700, 자간 -1.4px. 본문은 400. 현대적이고 단정한 인상.`,
        },
        {
            key: "serif",
            name: "명조",
            stack: FONT_STACK.serif,
            spec: `제목은 Noto Serif KR 700, 자간 -1px. 본문은 Noto Sans KR 400 으로 섞는다(본문까지 명조면 읽기 어렵다). 문서·논문 같은 무게.`,
        },
    ];
}

/* ═══════════════ 축 3 — 이미지 정책 ═══════════════
   "사진을 쓰느냐 마느냐" 는 인상을 근본적으로 가른다.
   장식을 바꾸는 것보다 훨씬 크게 다르게 보인다. */

export type ImageryKind = "photo" | "diagram" | "type";

export interface ImageryFamily {
    key: ImageryKind;
    name: string;
    spec: string;
}

function imageryFamilies(): ImageryFamily[] {
    return [
        {
            key: "photo",
            name: "사진 사용",
            spec: `사진을 쓰되 글씨를 그 위에 얹지 않는다. 사진은 상단 또는 좌측의 독립된 면을 차지하고, 텍스트는 별도 면에 둔다. 검정 오버레이 금지.`,
        },
        {
            key: "diagram",
            name: "도표 중심",
            spec: `사진을 쓰지 않는다. 절차 흐름·타임라인·체크리스트·비교표 같은 도표가 주인공이다. 선과 여백으로만 그린다. 아이콘 남발 금지.`,
        },
        {
            key: "type",
            name: "타이포 전용",
            spec: `사진도 도표도 쓰지 않는다. 문장 하나와 여백만으로 구성한다. 글자 크기 대비가 유일한 장치다.`,
        },
    ];
}

/* ═══════════════ 축 4 — 판형 ═══════════════ */

export interface FormatFamily {
    key: FormatKey;
    name: string;
    w: number;
    h: number;
}

function formatFamilies(): FormatFamily[] {
    return [
        { key: "square", name: "정사각 1:1", ...FORMATS.square },
        { key: "portrait", name: "세로 4:5", ...FORMATS.portrait },
    ];
}

/* ═══════════════ 공개 API ═══════════════ */

export interface DesignDNA {
    surface: SurfaceFamily;
    typeface: TypefaceFamily;
    imagery: ImageryFamily;
    format: FormatFamily;
}

export function getLawyerDesignDNA(lawyerId: string): DesignDNA {
    const id = lawyerId || "default";
    // 축마다 시드를 분리해야 서로 상관이 생기지 않는다
    const a = fnv1a(id, 0x811c9dc5);
    const b = fnv1a(id, 0x9e3779b1);
    const c = fnv1a(id, 0x85ebca77);
    const d = fnv1a(id, 0xc2b2ae35);

    const surfaces = surfaceFamilies();
    const typefaces = typefaceFamilies();
    const imageries = imageryFamilies();
    const formats = formatFamilies();

    return {
        surface: surfaces[a % surfaces.length],
        typeface: typefaces[b % typefaces.length],
        imagery: imageries[c % imageries.length],
        format: formats[d % formats.length],
    };
}

/** 사람이 읽는 한 줄 요약. 로그·관리화면용. */
export function describeDNA(dna: DesignDNA): string {
    return `${dna.surface.name} · ${dna.typeface.name} · ${dna.imagery.name} · ${dna.format.name}`;
}

/** 프롬프트에 넣을 DNA 지시 블록. */
export function dnaDirective(dna: DesignDNA): string {
    return `[이 변호사의 지면 — 다른 변호사와 확실히 달라야 하는 부분]
- 지면 성격: ${dna.surface.name} → ${dna.surface.spec}
- 서체: ${dna.typeface.name} → ${dna.typeface.spec}
- 이미지 정책: ${dna.imagery.name} → ${dna.imagery.spec}
- 판형: ${dna.format.name} (${dna.format.w}x${dna.format.h}px)`;
}
