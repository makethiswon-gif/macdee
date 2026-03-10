export const S = 1000;
export const FONT = "'Pretendard','Noto Sans KR',sans-serif";
export const TS = "0 2px 8px rgba(0,0,0,0.8),0 1px 3px rgba(0,0,0,0.9)";

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
];

export const SL_ALL: SL[] = [
    { style: "num-list" }, { style: "cards" }, { style: "cols" }, { style: "timeline" }, { style: "light-card" },
    { style: "h-bars" }, { style: "big-num" }, { style: "profile-list" }, { style: "overlay" }, { style: "minimal" },
];

export const CL_ALL: CL[] = [
    { style: "center" }, { style: "split" }, { style: "overlay" }, { style: "grid" }, { style: "h-layout" },
    { style: "light" }, { style: "formal" }, { style: "accent" }, { style: "photo-bg" }, { style: "big-name" },
];
