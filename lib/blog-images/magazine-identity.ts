// 변호사별 매거진 정체성 — 지면의 "누구" 를 결정한다.
//
// V9 는 팔레트·서체를 기획 모델이 글마다 골랐다. 결과: 8개 블로그가 전부
// "같은 스튜디오의 다른 호"로 보였고, 같은 블로그 안에서도 글마다 지면이
// 바뀌어 시리즈 정체성이 없었다.
//
// 원칙 — "무엇이 다른가"는 변호사가, "무엇을 그리나"는 원고가 정한다.
//   변호사 고정: 팔레트 · 서체 계열 · 지면 스타일(paper/contrast)
//   원고별 자유: 콘셉트 · 모티프 · 구도 · 장면 (기획 모델의 몫 그대로)
//
// 팔레트는 임의 해시가 아니라 등록된 브랜드 컬러의 색상(hue)과 가장 가까운
// 팔레트로 맵핑한다 → 로고와 지면이 자연스럽게 어울리고, 결정론적이다.
// 브랜드 컬러가 없거나 무채색이면 이름 해시로 갈린다.

import type { EditorialProfile } from "./card-types";
import type { ArtDirection, EditorialStyle } from "./visual-plan-types";

export type PaletteKey = ArtDirection["palette"];

// 골격(가족·액센트 형태·마스트헤드)은 변호사 고정이 아니라 **글 단위**로 변주된다.
// 잡지의 문법 — 색·서체는 호가 바뀌어도 같지만, 스프레드 레이아웃은 매 기사 다르다.
// 시드는 원고 해시 + 변호사 키 (renderer 가 계산). 같은 글은 재렌더해도 동일.
export type AccentShape = "dash" | "vbar" | "dots";
export type MastheadStyle = "rules" | "block";
export type LayoutFamily = "journal" | "poster" | "column";

export interface MagazineIdentity {
    palette: PaletteKey;
    typography: "serif" | "sans";
    style: EditorialStyle;
    /** 로그·관리화면용 한 줄 */
    label: string;
}

export function fnv(input: string, seed = 0x811c9dc5): number { return fnv1a(input, seed); }

function fnv1a(input: string, seed: number): number {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** hex → hue·채도·명도. 파싱 실패 시 null. */
function hueOf(hex: string | undefined): { h: number; s: number; l: number } | null {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    return { h: h < 0 ? h + 360 : h, s, l };
}

/** 브랜드 색상과 팔레트의 대표 색상을 잇는다.
 *
 *  무채색·검정·흰색은 "색 정보 없음"으로 보고 null(→ 해시 분산)을 반환한다.
 *  실측: 등록 변호사 15명 중 대부분의 brand_color 가 로고에서 추출된 #080808
 *  이었다. 이걸 graphite 로 보내면 전원이 같은 팔레트로 수렴해 정체성 축이
 *  통째로 무너진다 — 색이 진짜 있을 때만 색을 따른다. */
function paletteFromBrand(brandColor: string | undefined): PaletteKey | null {
    const c = hueOf(brandColor);
    if (!c) return null;
    if (c.s < 0.18 || c.l < 0.12 || c.l > 0.92) return null;
    const h = c.h;
    if (h < 15 || h >= 340) return "vermilion";
    if (h < 45) return "amber";
    if (h < 80) return "olive";
    if (h < 150) return "forest";
    if (h < 195) return "teal";
    if (h < 250) return "cobalt";
    if (h < 300) return "aubergine";
    return "burgundy";
}

const PALETTES: PaletteKey[] = ["cobalt", "vermilion", "forest", "aubergine", "graphite", "amber", "burgundy", "teal", "slate", "olive"];

export function getMagazineIdentity(profile: Pick<EditorialProfile, "id" | "lawyerName" | "brandColor" | "dnaSalt">): MagazineIdentity {
    // dna_salt: 두 변호사의 조합이 겹칠 때 관리화면에서 갈라내는 손잡이.
    const key = (profile.id || profile.lawyerName || "default") + "|" + (profile.dnaSalt || "");
    const palette = paletteFromBrand(profile.brandColor)
        ?? PALETTES[fnv1a(key, 0x811c9dc5) % PALETTES.length];
    // 축마다 시드를 분리해 서로 상관이 생기지 않게 한다
    const typography: "serif" | "sans" = fnv1a(key, 0x9e3779b1) % 2 === 0 ? "serif" : "sans";
    const style: EditorialStyle = fnv1a(key, 0x85ebca77) % 2 === 0 ? "contrast" : "paper";
    return { palette, typography, style, label: `${palette} · ${typography} · ${style}` };
}

/** 기획 프롬프트에 붙이는 시리즈 규정. 기획 모델이 이 지면 안에서 장면을 설계하게 한다. */
const PALETTE_WORDS: Record<PaletteKey, string> = {
    cobalt: "잉크블루·아이보리·라임", vermilion: "버밀리언·차콜·크림", forest: "깊은 녹색·페일옐로",
    aubergine: "가지색·라일락", graphite: "차콜·실버·라임", amber: "호박색·짙은 갈색·크림",
    burgundy: "버건디·장미빛 크림·골드", teal: "청록·아이스그린·샛노랑", slate: "청회색·코랄", olive: "올리브·모래빛·오렌지",
};

export function identityDirective(id: MagazineIdentity): string {
    return `\n이 사무소의 시리즈 지면 규정(변경 불가): palette는 반드시 "${id.palette}"(${PALETTE_WORDS[id.palette]}), typography는 반드시 "${id.typography}". ` +
        `콘셉트와 장면은 자유롭게 설계하되 이 팔레트의 배경·빛·재질 안에서 성립해야 한다.`;
}

/** 기획 결과가 무엇이든 시리즈 축은 변호사 값으로 고정한다(믿지 않고 덮어쓴다). */
export function lockDirection(direction: ArtDirection | undefined, id: MagazineIdentity): ArtDirection | undefined {
    if (!direction) return direction;
    return { ...direction, palette: id.palette, typography: id.typography };
}
