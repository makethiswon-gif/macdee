import { GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { wrapText } from "./editorial-renderer";
import type { ArtDirection } from "./visual-plan-types";

export const MAGAZINE_PALETTES = {
    // 대표 지시(2026-09-07): 트렌디하되 보수적으로, 튀지 않게.
    // 전 팔레트를 톤다운했다 — 잉크는 깊게, 액센트는 채도를 눌러 더스티하게.
    // 형광·네온 계열 금지. 액센트는 작은 장치(대시·바)에만 쓰이므로
    // 낮춘 채도로도 충분히 구분된다.
    cobalt: { ink: "#1B2A44", paper: "#F4F3ED", accent: "#9DB483", field: "#3D5A8F", muted: "#5A6272" },
    vermilion: { ink: "#2B2725", paper: "#F6F1E8", accent: "#C4593F", field: "#96473A", muted: "#6A5F58" },
    forest: { ink: "#1D3A31", paper: "#F2F2E6", accent: "#B7C08A", field: "#44685A", muted: "#566459" },
    aubergine: { ink: "#342B3B", paper: "#F4F0F2", accent: "#B49CC4", field: "#6A5474", muted: "#6A6070" },
    graphite: { ink: "#26292B", paper: "#F1F0EB", accent: "#A9B7A0", field: "#5C6466", muted: "#5E6467" },
    amber: { ink: "#2C231A", paper: "#F6F0E3", accent: "#C99B4E", field: "#8F6E33", muted: "#6E6250" },
    burgundy: { ink: "#362028", paper: "#F5EFEC", accent: "#B98E63", field: "#7E3B4A", muted: "#6E5A60" },
    teal: { ink: "#17322F", paper: "#EFF2EC", accent: "#C9B268", field: "#33685F", muted: "#526560" },
    slate: { ink: "#232B35", paper: "#EFF0F1", accent: "#C97C5F", field: "#526B80", muted: "#5D6570" },
    olive: { ink: "#282B1D", paper: "#F4F2E6", accent: "#C08552", field: "#6B7442", muted: "#626650" },
} as const;
export const DEFAULT_DIRECTION: ArtDirection = { concept: "핵심을 크게 보는 지면", rationale: "이전 구성안과의 호환을 위한 기본 편집", alternatives: [],
    palette: "cobalt", typography: "serif", composition: "immersive", motif: "구체적 대상의 대비" };
export type MagazineFace = "serif" | "sans" | "body" | "label";
let ready = false;
export function magazineFonts() {
    if (ready) return;
    for (const [file, family] of [
        ["noto-serif-kr-korean-700-normal.woff2", "MagazineSerif"],
        ["noto-sans-kr-korean-900-normal.woff2", "MagazineSans"],
        ["noto-sans-kr-korean-700-normal.woff2", "MagazineLabel"],
        ["noto-sans-kr-korean-400-normal.woff2", "MagazineBody"],
    ]) if (!GlobalFonts.register(readFileSync(join(process.cwd(), "public", "fonts", file)), family)) throw new Error("매거진 한글 서체를 불러오지 못했습니다.");
    ready = true;
}
export function setType(c: SKRSContext2D, size: number, face: MagazineFace) {
    c.font = `${size}px "${face === "serif" ? "MagazineSerif" : face === "sans" ? "MagazineSans" : face === "label" ? "MagazineLabel" : "MagazineBody"}"`;
    c.textBaseline = "top";
}
export function magazineLines(c: SKRSContext2D, s: string, w: number): string[] {
    const wrap = (width: number) => s.split("\n").flatMap((paragraph) => {
        const lines: string[] = [];
        let line = "";
        for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
            const candidate = line ? `${line} ${word}` : word;
            if (c.measureText(candidate).width <= width) { line = candidate; continue; }
            if (line) lines.push(line);
            // Only break an individual word when it cannot fit on an empty line.
            const pieces = c.measureText(word).width > width ? wrapText(c, word, width) : [word];
            lines.push(...pieces.slice(0, -1));
            line = pieces.at(-1) || "";
        }
        if (line || !lines.length) lines.push(line);
        return lines;
    });
    const initial = wrap(w);
    if (s.includes("\n") || initial.length < 2 || initial.length > 4 || s.length > 140) return initial;
    let best = initial, bestScore = Infinity;
    for (let ratio = 1; ratio >= 0.65; ratio -= 0.025) {
        const lines = wrap(w * ratio);
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
