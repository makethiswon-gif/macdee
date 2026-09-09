// Registered brand and explicit editorial family determine identity.
// Practice-based defaults replace ID-hashed palettes, fonts and layouts.

import type { EditorialProfile } from "./card-types";
import type { ArtDirection, EditorialStyle } from "./visual-plan-types";

export type PaletteKey = ArtDirection["palette"];

export type AccentShape = "dash" | "vbar" | "dots";
export type MastheadStyle = "rules" | "block";
export type LayoutFamily = "journal" | "poster" | "column" | "atlas" | "ledger" | "dossier";

const FAMILIES: readonly LayoutFamily[] = ["journal", "poster", "column", "atlas", "ledger", "dossier"];

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

export function getMagazineIdentity(profile: Pick<EditorialProfile, "id" | "lawyerName" | "brandColor" | "dnaSalt" | "designFamily" | "specialty">): MagazineIdentity {
    // Explicit art direction wins. Otherwise choose an editorial system by registered practice,
    // never by lawyer ID, the current article, or unapproved research/credentials.
    const practice = (profile.specialty || []).join(" ");
    const suggested: LayoutFamily = /의료|기업|조세|금융/.test(practice) ? "ledger"
        : /건설|부동산|재개발/.test(practice) ? "atlas"
        : /이혼|가사|가정|학교|성폭력/.test(practice) ? "journal"
        : /상속|유언/.test(practice) ? "column"
        : /회생|파산|채무/.test(practice) ? "poster" : "dossier";
    const family = profile.designFamily && profile.designFamily !== "auto" && FAMILIES.includes(profile.designFamily) ? profile.designFamily : suggested;
    const recipes: Record<LayoutFamily, { typography: "serif" | "sans"; palette: PaletteKey }> = {
        journal: { typography: "serif", palette: "forest" }, poster: { typography: "sans", palette: "vermilion" },
        column: { typography: "serif", palette: "burgundy" }, atlas: { typography: "sans", palette: "teal" },
        ledger: { typography: "sans", palette: "cobalt" }, dossier: { typography: "sans", palette: "graphite" },
    };
    const { typography } = recipes[family], palette = brandPalette(profile.brandColor) ?? recipes[family].palette;
    const style: EditorialStyle = "paper";
    return { typography, style, palette, family, label: `${palette} · ${family} · ${typography} · ${style}` };
}

/** 기획 프롬프트에 붙이는 시리즈 규정. 기획 모델이 이 지면 안에서 장면을 설계하게 한다. */
export function identityDirective(id: MagazineIdentity): string {
    return `
이 사무소의 시리즈 규정(변경 불가): palette는 반드시 "${id.palette}", typography는 반드시 "${id.typography}". ` +
        `지면 가족은 ${id.family}. composition은 split. 글자는 별도 조판한다. 시각물에는 텍스트 여백을 만들지 말고 대상과 관계를 선명하게 보여준다. 브랜드 색은 포인트로만 사용하고 모든 사진에 같은 색 필터를 씌우지 않는다. 콘셉트·모티프·장면은 원고에서 설계한다. 네 장에 같은 소품을 반복하지 않는다.`;
}

/** 팔레트·서체를 변호사 값으로 강제한다. 장면·구도는 기획 모델의 몫 그대로. */
export function lockDirection(direction: ArtDirection | undefined, id: MagazineIdentity): ArtDirection | undefined {
    if (!direction) return direction;
    return { ...direction, palette: id.palette, typography: id.typography,
        composition: "split" };
}
