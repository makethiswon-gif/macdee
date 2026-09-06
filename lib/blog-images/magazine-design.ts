import { GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { wrapText } from "./editorial-renderer";
import type { ArtDirection } from "./visual-plan-types";

export const MAGAZINE_PALETTES = {
    cobalt: { ink: "#122445", paper: "#F3F4EA", accent: "#C4E36C", field: "#294C9C", muted: "#515968" },
    vermilion: { ink: "#282626", paper: "#F7F0E4", accent: "#E6472F", field: "#A92D24", muted: "#625953" },
    forest: { ink: "#163B32", paper: "#F1F2DB", accent: "#D1DF85", field: "#34634F", muted: "#4D6257" },
    aubergine: { ink: "#322438", paper: "#F4EEF4", accent: "#D3B8E9", field: "#624469", muted: "#68586D" },
    graphite: { ink: "#222727", paper: "#F0F0E9", accent: "#D5EB75", field: "#535D5A", muted: "#58605A" },
    // V10.2 — 5종 추가. 실측에서 등록 변호사 다수의 브랜드색이 무채색이라 해시로
    // 갈리는데, 풀이 5종이면 활동 8명 중 충돌이 잦았다. 10종이면 체감 충돌이 준다.
    amber: { ink: "#2A1F12", paper: "#F7EFDF", accent: "#FFB53F", field: "#A6690F", muted: "#6E5A3C" },
    burgundy: { ink: "#351520", paper: "#F6EDE9", accent: "#F2B33D", field: "#8C2540", muted: "#6E5560" },
    teal: { ink: "#0F2F2C", paper: "#EDF3EE", accent: "#FFCC5C", field: "#1F6E63", muted: "#4C6660" },
    slate: { ink: "#202833", paper: "#EEF0F3", accent: "#FF7A59", field: "#4A6076", muted: "#5B6672" },
    olive: { ink: "#23281A", paper: "#F4F3E4", accent: "#FF8C42", field: "#5A6B2F", muted: "#5F6650" },
} as const;
export const DEFAULT_DIRECTION: ArtDirection = { concept: "핵심을 크게 보는 지면", rationale: "이전 구성안과의 호환을 위한 기본 편집", alternatives: [],
    palette: "cobalt", typography: "serif", composition: "immersive", motif: "구체적 대상의 대비" };
export type MagazineFace = "serif" | "sans" | "body";
let ready = false;
export function magazineFonts() {
    if (ready) return;
    for (const [file, family] of [
        ["noto-serif-kr-korean-700-normal.woff2", "MagazineSerif"],
        ["noto-sans-kr-korean-900-normal.woff2", "MagazineSans"],
        ["noto-sans-kr-korean-400-normal.woff2", "MagazineBody"],
    ]) if (!GlobalFonts.register(readFileSync(join(process.cwd(), "public", "fonts", file)), family)) throw new Error("매거진 한글 서체를 불러오지 못했습니다.");
    ready = true;
}
export function setType(c: SKRSContext2D, size: number, face: MagazineFace) {
    c.font = `${size}px "${face === "serif" ? "MagazineSerif" : face === "sans" ? "MagazineSans" : "MagazineBody"}"`;
    c.textBaseline = "top";
}
function magazineLines(c: SKRSContext2D, s: string, w: number): string[] {
    const initial = wrapText(c, s, w);
    if (s.includes("\n") || initial.length < 2 || initial.length > 4 || s.length > 140) return initial;
    let best = initial, bestScore = Infinity;
    for (let ratio = 1; ratio >= 0.65; ratio -= 0.025) {
        const lines = wrapText(c, s, w * ratio);
        if (lines.length !== initial.length) continue;
        const widths = lines.map((line) => c.measureText(line).width);
        const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
        const score = widths.reduce((sum, n) => sum + (n - mean) ** 2, 0);
        if (score < bestScore) { bestScore = score; best = lines; }
    }
    return best;
}
export function typeHeight(c: SKRSContext2D, s: string, w: number, size: number, face: MagazineFace = "body", leading = 1.42) {
    setType(c, size, face); return magazineLines(c, s, w).length * Math.ceil(size * leading);
}
export function type(c: SKRSContext2D, s: string, x: number, y: number, w: number, size: number, color: string, face: MagazineFace = "body", leading = 1.42) {
    setType(c, size, face); c.fillStyle = color;
    const lines = magazineLines(c, s, w), step = Math.ceil(size * leading);
    lines.forEach((line, i) => c.fillText(line, x, y + i * step));
    return lines.length * step;
}
export function fitTitle(c: SKRSContext2D, s: string, w: number, maxH: number, preferred: number, face: MagazineFace) {
    // 디자이너 규칙: 행이 많은 표제는 크기를 낮춘다.
    // 3행짜리를 최대 크기로 앉히면 "겨우 들어간" 지면이 된다 — 큰 표제는
    // 1~2행일 때의 특권이고, 행이 늘면 글자가 아니라 여백이 무게를 만든다.
    const step = (n: number) => Math.ceil(n * 1.28);
    const linesAt = (size: number) => Math.round(typeHeight(c, s, w, size, face, 1.28) / step(size));
    const n = linesAt(preferred);
    if (n >= 4) preferred = Math.min(preferred, 60);
    else if (n === 3) preferred = Math.min(preferred, 76);
    for (let size = preferred; size >= 44; size -= 2) {
        const h = typeHeight(c, s, w, size, face, 1.28);
        // An intentional editorial line break must not produce a one-syllable orphan.
        if (s.includes("\n") && s.split("\n").some((line) => c.measureText(line).width > w)) continue;
        if (h <= maxH) return { text: s, size, h };
    }
    throw new Error("제목이 지면에 비해 깁니다. 제목을 줄여 주세요. 글자를 잘라 저장하지 않았습니다.");
}
export function rect(c: SKRSContext2D, x: number, y: number, w: number, h: number, color: string) {
    c.fillStyle = color; c.fillRect(x, y, w, h);
}
export function rule(c: SKRSContext2D, x: number, y: number, w: number, color: string, h = 1) { rect(c, x, y, w, h, color); }
