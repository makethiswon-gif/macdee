export const S = 1000;
export const FONT = "'Pretendard','Noto Sans KR',sans-serif";
export const TS = "0 2px 8px rgba(0,0,0,0.8),0 1px 3px rgba(0,0,0,0.9)";

/**
 * Parse hex color to RGB, handling #RGB, #RRGGBB, and #RRGGBBAA formats
 */
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const c = h.length <= 4 ? h.slice(0, 3) : h.slice(0, 6);
    const full = c.length === 3 ? c.split("").map(ch => ch + ch).join("") : c;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

/** Returns true if a hex color is considered "light" (luminance > 0.45) */
export function isLightColor(hex: string): boolean {
    const [r, g, b] = hexToRgb(hex);
    // Relative luminance (sRGB)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.45;
}

/** Returns #111 for light backgrounds, #fff for dark backgrounds */
export function getContrastColor(hex: string): string {
    return isLightColor(hex) ? "#111" : "#fff";
}

/** Returns appropriate sub-text color (less prominent) */
export function getSubContrastColor(hex: string): string {
    return isLightColor(hex) ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";
}

/** Text shadow appropriate for the background */
export function getContrastShadow(hex: string): string {
    return isLightColor(hex)
        ? "0 1px 3px rgba(255,255,255,0.3)"
        : "0 2px 8px rgba(0,0,0,0.8),0 1px 3px rgba(0,0,0,0.9)";
}

export type TxtPos = "center" | "bl" | "tl" | "br";
export type PhotoUse = "none" | "full" | "left" | "right" | "top";

export interface ML { txtPos: TxtPos; photo: PhotoUse; deco: "bar-l" | "bar-t" | "circle" | "diag" | "pill" | "box" | "none" | "stripe" | "grid"; titleScale: number; }
export interface SL { style: "num-list" | "cards" | "cols" | "timeline" | "light-card" | "h-bars" | "big-num" | "profile-list" | "overlay" | "minimal"; }
export interface CL { style: "center" | "split" | "overlay" | "grid" | "h-layout" | "light" | "formal" | "accent" | "photo-bg" | "big-name"; }

export const ML_ALL: ML[] = [
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "bar-t", titleScale: 1.4 },
    { txtPos: "tl", photo: "right", deco: "bar-l", titleScale: 1 },
    { txtPos: "center", photo: "full", deco: "box", titleScale: 1.3 },
    { txtPos: "tl", photo: "none", deco: "circle", titleScale: 1.1 },
    { txtPos: "bl", photo: "none", deco: "diag", titleScale: 1.3 },
    { txtPos: "tl", photo: "top", deco: "bar-l", titleScale: 1 },
    { txtPos: "center", photo: "none", deco: "stripe", titleScale: 1.4 },
    { txtPos: "bl", photo: "full", deco: "pill", titleScale: 1.2 },
    { txtPos: "tl", photo: "none", deco: "grid", titleScale: 1.1 },
    { txtPos: "center", photo: "full", deco: "none", titleScale: 1.35 }, // 10: Center poster
    { txtPos: "tl", photo: "full", deco: "box", titleScale: 1 }, // 11: Newspaper
    { txtPos: "center", photo: "full", deco: "bar-t", titleScale: 1.4 }, // 12: Strikethrough
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.15 }, // 13: Cafe/Food
    { txtPos: "center", photo: "full", deco: "box", titleScale: 1.5 }, // 14: Highlighter (Ref 1/3)
    { txtPos: "bl", photo: "full", deco: "pill", titleScale: 1.2 }, // 15: Serif Badge (Ref 5)
    { txtPos: "center", photo: "full", deco: "box", titleScale: 1.6 }, // 16: Photo + Bold Highlight Blocks (New Ref 1)
    { txtPos: "bl", photo: "none", deco: "none", titleScale: 1.3 },  // 17: White BG + Grayscale Portrait Top (New Ref 2)
    { txtPos: "tl", photo: "none", deco: "circle", titleScale: 1.3 }, // 18: White BG + Circular Accent Portrait (New Ref 3)
    { txtPos: "tl", photo: "right", deco: "none", titleScale: 1.4 },  // 19: Dark Editorial + Right Portrait (New Ref 4)
    { txtPos: "tl", photo: "right", deco: "diag", titleScale: 1.3 },  // 20: Black/Accent Split + Portrait Overlap (New Ref 5)
];

export const SL_ALL: SL[] = [
    { style: "num-list" }, { style: "cards" }, { style: "cols" }, { style: "timeline" }, { style: "light-card" },
    { style: "h-bars" }, { style: "big-num" }, { style: "profile-list" }, { style: "overlay" }, { style: "minimal" },
    { style: "timeline" }, // 10: Horizontal Process Timeline (Ref 4)
    { style: "cards" },    // 11: Giant Colored Numbers Cards (Ref 2)
];

export const CL_ALL: CL[] = [
    { style: "center" }, { style: "split" }, { style: "overlay" }, { style: "grid" }, { style: "h-layout" },
    { style: "light" }, { style: "formal" }, { style: "accent" }, { style: "photo-bg" }, { style: "big-name" },
];

export interface BL { style: "logo-center" | "name-bold" | "minimal" | "gradient" | "stripe" | "circle" | "split-tone" | "pattern" | "light-clean" | "dark-accent"; }
export const BL_ALL: BL[] = [
    { style: "logo-center" }, { style: "name-bold" }, { style: "minimal" }, { style: "gradient" }, { style: "stripe" },
    { style: "circle" }, { style: "split-tone" }, { style: "pattern" }, { style: "light-clean" }, { style: "dark-accent" },
];
