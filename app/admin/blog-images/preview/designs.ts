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
    { txtPos: "center", photo: "full", deco: "none", titleScale: 1.35 },
    { txtPos: "tl", photo: "full", deco: "box", titleScale: 1 },
    { txtPos: "center", photo: "full", deco: "bar-t", titleScale: 1.4 },
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.15 },
    { txtPos: "center", photo: "full", deco: "box", titleScale: 1.5 },
    { txtPos: "bl", photo: "full", deco: "pill", titleScale: 1.2 },
    { txtPos: "center", photo: "full", deco: "box", titleScale: 1.6 },
    { txtPos: "bl", photo: "none", deco: "none", titleScale: 1.3 },
    { txtPos: "tl", photo: "none", deco: "circle", titleScale: 1.3 },
    { txtPos: "tl", photo: "right", deco: "none", titleScale: 1.4 },
    { txtPos: "tl", photo: "right", deco: "diag", titleScale: 1.3 },
    // v21-v50: New variants
    { txtPos: "center", photo: "none", deco: "bar-t", titleScale: 1.4 },
    { txtPos: "tl", photo: "none", deco: "bar-l", titleScale: 1.3 },
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.2 },
    { txtPos: "bl", photo: "full", deco: "box", titleScale: 1.3 },
    { txtPos: "center", photo: "none", deco: "diag", titleScale: 1.3 },
    { txtPos: "tl", photo: "full", deco: "none", titleScale: 1.2 },
    { txtPos: "tl", photo: "none", deco: "circle", titleScale: 1.3 },
    { txtPos: "center", photo: "full", deco: "bar-l", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "circle", titleScale: 1.4 },
    { txtPos: "center", photo: "none", deco: "none", titleScale: 1.3 },
    { txtPos: "bl", photo: "full", deco: "diag", titleScale: 1.2 },
    { txtPos: "tl", photo: "none", deco: "none", titleScale: 1.4 },
    { txtPos: "tl", photo: "right", deco: "bar-l", titleScale: 1.1 },
    { txtPos: "center", photo: "none", deco: "bar-t", titleScale: 1.2 },
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "circle", titleScale: 1.3 },
    { txtPos: "center", photo: "none", deco: "box", titleScale: 1.3 },
    { txtPos: "bl", photo: "full", deco: "bar-t", titleScale: 1.1 },
    { txtPos: "tl", photo: "none", deco: "stripe", titleScale: 1.3 },
    { txtPos: "bl", photo: "full", deco: "none", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "none", titleScale: 1.3 },
    { txtPos: "tl", photo: "none", deco: "none", titleScale: 1.2 },
    { txtPos: "tl", photo: "none", deco: "bar-l", titleScale: 1.2 },
    { txtPos: "bl", photo: "full", deco: "box", titleScale: 1.1 },
    { txtPos: "center", photo: "none", deco: "none", titleScale: 1.4 },
    { txtPos: "bl", photo: "full", deco: "circle", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "none", titleScale: 1.3 },
    { txtPos: "center", photo: "full", deco: "bar-t", titleScale: 1.3 },
    { txtPos: "center", photo: "none", deco: "grid", titleScale: 1.2 },
    { txtPos: "center", photo: "none", deco: "bar-t", titleScale: 1.3 },
];

export const SL_ALL: SL[] = [
    { style: "num-list" }, { style: "cards" }, { style: "cols" }, { style: "timeline" }, { style: "light-card" },
    { style: "h-bars" }, { style: "big-num" }, { style: "profile-list" }, { style: "overlay" }, { style: "minimal" },
    { style: "timeline" }, { style: "cards" },
    // v12-v41: New variants
    { style: "num-list" }, { style: "cards" }, { style: "num-list" }, { style: "cards" }, { style: "cols" },
    { style: "num-list" }, { style: "h-bars" }, { style: "timeline" }, { style: "cols" }, { style: "num-list" },
    { style: "cards" }, { style: "num-list" }, { style: "profile-list" }, { style: "cards" }, { style: "num-list" },
    { style: "h-bars" }, { style: "num-list" }, { style: "cards" }, { style: "overlay" }, { style: "cards" },
    { style: "num-list" }, { style: "cols" }, { style: "num-list" }, { style: "timeline" }, { style: "h-bars" },
    { style: "cards" }, { style: "cols" }, { style: "num-list" }, { style: "cards" }, { style: "num-list" },
];

export const CL_ALL: CL[] = [
    { style: "center" }, { style: "split" }, { style: "overlay" }, { style: "grid" }, { style: "h-layout" },
    { style: "light" }, { style: "formal" }, { style: "accent" }, { style: "photo-bg" }, { style: "big-name" },
    // v10-v39: New variants
    { style: "center" }, { style: "center" }, { style: "center" }, { style: "grid" }, { style: "overlay" },
    { style: "split" }, { style: "center" }, { style: "grid" }, { style: "center" }, { style: "center" },
    { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" },
    { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" },
    { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" },
    { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" }, { style: "center" },
];

export interface BL { style: "logo-center" | "name-bold" | "minimal" | "gradient" | "stripe" | "circle" | "split-tone" | "pattern" | "light-clean" | "dark-accent" | "photo-editorial" | "serif-quote" | "photo-highlight" | "glass-card" | "speech-bubble"; }
export const BL_ALL: BL[] = [
    { style: "logo-center" }, { style: "name-bold" }, { style: "minimal" }, { style: "gradient" }, { style: "stripe" },
    { style: "circle" }, { style: "split-tone" }, { style: "pattern" }, { style: "light-clean" }, { style: "dark-accent" },
    { style: "photo-editorial" }, { style: "serif-quote" }, { style: "photo-highlight" }, { style: "glass-card" }, { style: "speech-bubble" },
    // v15-v44: New variants
    { style: "logo-center" }, { style: "gradient" }, { style: "split-tone" }, { style: "minimal" }, { style: "photo-editorial" },
    { style: "minimal" }, { style: "glass-card" }, { style: "name-bold" }, { style: "logo-center" }, { style: "name-bold" },
    { style: "split-tone" }, { style: "gradient" }, { style: "minimal" }, { style: "gradient" }, { style: "name-bold" },
    { style: "minimal" }, { style: "logo-center" }, { style: "gradient" }, { style: "name-bold" }, { style: "minimal" },
    { style: "gradient" }, { style: "name-bold" }, { style: "minimal" }, { style: "gradient" }, { style: "name-bold" },
    { style: "minimal" }, { style: "gradient" }, { style: "name-bold" }, { style: "minimal" }, { style: "gradient" },
];
