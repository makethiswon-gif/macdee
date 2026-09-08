// 변호사별 매거진 정체성 — 지면의 "누구" 를 결정한다.
//
// V10.6 — 대표 지시: "변호사마다 색감이 비슷하니 변호사별로 색감과 디자인
// 형식을 모두 바꿔라. 대신 아주 깔끔하고 시인성 좋게."
// → 팔레트(10)·골격 가족(3)·서체(2)·명암(2)을 전부 변호사 해시로 고정한다.
//   조합 120가지 — 등록 변호사끼리 겹칠 확률이 낮고, 겹치면 dna_salt 로 가른다.
//
// 원칙 — "무엇이 다른가"는 변호사가, "무엇을 그리나"는 원고가 정한다.
//   변호사 고정: 팔레트 · 골격 가족 · 서체 계열 · 명암(paper/contrast)
//   원고별 자유: 콘셉트 · 모티프 · 장면 · 미세 조판(밴드 폭·괘선·제목 크기 등)
//
// V10.4 에서 팔레트를 원고 분위기로 풀었더니 기획 모델이 차분한 색만 관성으로
// 골라 변호사들이 전부 비슷해졌다. 색은 다시 변호사 축으로 되돌린다.

import type { EditorialProfile } from "./card-types";
import type { ArtDirection, EditorialStyle } from "./visual-plan-types";

export type PaletteKey = ArtDirection["palette"];

export type AccentShape = "dash" | "vbar" | "dots";
export type MastheadStyle = "rules" | "block";
export type LayoutFamily = "journal" | "poster" | "column";

const PALETTE_KEYS: readonly PaletteKey[] = ["cobalt", "vermilion", "forest", "aubergine", "graphite", "amber", "burgundy", "teal", "slate", "olive"];
const FAMILIES: readonly LayoutFamily[] = ["journal", "poster", "column"];

// 팔레트 field 색의 색상(hue) 기준표 — magazine-design 의 field 값에서 계산.
// (이 파일은 관리화면 클라이언트에서도 쓰여 canvas 의존인 design 모듈을 import 못한다.)
// graphite 는 무채색이라 hue 후보에서 제외 — 무채/미등록 브랜드는 해시로 배정된다.
const PALETTE_HUES: readonly [PaletteKey, number][] = [
    ["vermilion", 8], ["amber", 38], ["olive", 71], ["forest", 157], ["teal", 170],
    ["slate", 207], ["cobalt", 219], ["aubergine", 281], ["burgundy", 347],
];

/** 등록 브랜드 컬러가 유채색이면 가장 가까운 hue 의 팔레트를 돌려준다. */
function brandPalette(hex: string | undefined): PaletteKey | null {
    const match = (hex || "").trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) return null;
    const n = parseInt(match[1], 16);
    const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    // 무채색·극단 명도는 "색 정보 없음" — 로고 추출 검정(#080808)이 대표 사례.
    if (s < 0.18 || l < 0.12 || l > 0.92) return null;
    const hue = 60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    let best: PaletteKey = PALETTE_HUES[0][0], bestDist = 361;
    for (const [key, h] of PALETTE_HUES) {
        const dist = Math.min(Math.abs(hue - h), 360 - Math.abs(hue - h));
        if (dist < bestDist) { best = key; bestDist = dist; }
    }
    return best;
}

export interface MagazineIdentity {
    typography: "serif" | "sans";
    style: EditorialStyle;
    palette: PaletteKey;
    family: LayoutFamily;
    /** 로그·관리화면용 한 줄 */
    label: string;
}

// FNV-1a + murmur3 최종 믹서. 순수 FNV의 하위 비트는 입력 바이트 패리티의
// 선형 결합이라 %2·%3 에 쓰면 축끼리 동조한다(serif↔paper 완전 상관 실측).
// 믹서가 상위 비트를 하위로 눈사태시켜 작은 나머지 연산도 독립적으로 만든다.
export function fnv(input: string, seed = 0x811c9dc5): number { return fnv1a(input, seed); }

function fnv1a(input: string, seed: number): number {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

export function getMagazineIdentity(profile: Pick<EditorialProfile, "id" | "lawyerName" | "brandColor" | "dnaSalt">): MagazineIdentity {
    // dna_salt: 두 변호사의 조합이 겹칠 때 관리화면에서 갈라내는 손잡이.
    // 축별 솔트는 시드가 아니라 입력 문자열에 붙인다 — FNV 시드만 바꾸면
    // 축들이 서로 동조해(sans↔paper) 조합 충돌이 속출한다. 실측으로 확인.
    const key = (profile.id || profile.lawyerName || "default") + "|" + (profile.dnaSalt || "");
    const roll = (axis: string, n: number) => fnv1a(key + "#" + axis, 0x811c9dc5) % n;
    const typography: "serif" | "sans" = roll("typo", 2) === 0 ? "serif" : "sans";
    const style: EditorialStyle = roll("style", 2) === 0 ? "contrast" : "paper";
    // 브랜드 컬러(심층 리서치·로고에서 수집)가 유채색이면 그 색과 가장 가까운
    // 팔레트로 — 로고·홈페이지와 지면이 자연스럽게 어울린다. 없으면 해시 배정.
    const palette = brandPalette(profile.brandColor) ?? PALETTE_KEYS[roll("palette", PALETTE_KEYS.length)];
    const family = FAMILIES[roll("family", FAMILIES.length)];
    return { typography, style, palette, family, label: `${palette} · ${family} · ${typography} · ${style}` };
}

/** 기획 프롬프트에 붙이는 시리즈 규정. 기획 모델이 이 지면 안에서 장면을 설계하게 한다. */
export function identityDirective(id: MagazineIdentity): string {
    return `
이 사무소의 시리즈 규정(변경 불가): palette는 반드시 "${id.palette}", typography는 반드시 "${id.typography}". ` +
        `시각물의 빛·배경·소재 색도 이 팔레트 무드에 맞춘다. 콘셉트·모티프·장면은 원고에서 새로 설계한다.`;
}

/** 팔레트·서체를 변호사 값으로 강제한다. 장면·구도는 기획 모델의 몫 그대로. */
export function lockDirection(direction: ArtDirection | undefined, id: MagazineIdentity): ArtDirection | undefined {
    if (!direction) return direction;
    return { ...direction, palette: id.palette, typography: id.typography };
}
