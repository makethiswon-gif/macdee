// 변호사별 매거진 정체성 — 지면의 "누구" 를 결정한다.
//
// V10.4 — 대표 지시로 팔레트도 글 단위(원고 분위기)로 풀었다.
// 변호사 고정으로 남는 것: 서체 계열 · 명암(밝은/어두운 지면).
// 색과 골격과 장면은 전부 원고가 정한다. 팔레트는 기획 모델이
// 원고 분위기로 고르며(10종), 색-무드 매칭 지침은 visual-planner 에 있다.
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

export function getMagazineIdentity(profile: Pick<EditorialProfile, "id" | "lawyerName" | "brandColor" | "dnaSalt">): MagazineIdentity {
    // dna_salt: 두 변호사의 조합이 겹칠 때 관리화면에서 갈라내는 손잡이.
    const key = (profile.id || profile.lawyerName || "default") + "|" + (profile.dnaSalt || "");
    const typography: "serif" | "sans" = fnv1a(key, 0x9e3779b1) % 2 === 0 ? "serif" : "sans";
    const style: EditorialStyle = fnv1a(key, 0x85ebca77) % 2 === 0 ? "contrast" : "paper";
    return { typography, style, label: `${typography} · ${style}` };
}

/** 기획 프롬프트에 붙이는 시리즈 규정. 기획 모델이 이 지면 안에서 장면을 설계하게 한다. */
export function identityDirective(id: MagazineIdentity): string {
    return `
이 사무소의 시리즈 규정(변경 불가): typography는 반드시 "${id.typography}". ` +
        `palette는 잠그지 않는다 — 이 원고의 분위기에 가장 맞는 것을 10종에서 고르되, 직전 글과 같은 색을 관성으로 반복하지 마라.`;
}

/** 서체만 변호사 값으로 고정한다. 팔레트는 원고 분위기(기획 모델)의 몫. */
export function lockDirection(direction: ArtDirection | undefined, id: MagazineIdentity): ArtDirection | undefined {
    if (!direction) return direction;
    return { ...direction, typography: id.typography };
}
