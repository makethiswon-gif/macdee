/**
 * Blog Image Renderer v3 — Server-side Canvas
 * Uses @napi-rs/canvas for high-quality 1024×1024 PNG generation
 */
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D, type Canvas, type Image } from "@napi-rs/canvas";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

// ── Font Registration (runs once at module load) ──
let fontsLoaded = false;
function ensureFonts() {
    if (fontsLoaded) return;
    const fontsDir = join(process.cwd(), "public", "fonts");
    const fonts = [
        { file: "noto-sans-kr-korean-400-normal.woff2", family: "NotoSansKR", weight: 400 },
        { file: "noto-sans-kr-korean-700-normal.woff2", family: "NotoSansKR", weight: 700 },
        { file: "noto-sans-kr-korean-900-normal.woff2", family: "NotoSansKR", weight: 900 },
    ];
    for (const f of fonts) {
        const p = join(fontsDir, f.file);
        if (existsSync(p)) {
            GlobalFonts.register(readFileSync(p), `NotoSansKR-${f.weight}`);
        }
    }
    fontsLoaded = true;
}

// ── Constants ──
export const SIZE = 1024;
export const FONT_REGULAR = "NotoSansKR-400";
export const FONT_BOLD = "NotoSansKR-700";
export const FONT_BLACK = "NotoSansKR-900";

// ── Color Utilities ──
export function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const c = h.length <= 4 ? h.slice(0, 3) : h.slice(0, 6);
    const full = c.length === 3 ? c.split("").map(ch => ch + ch).join("") : c;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

export function isLightColor(hex: string): boolean {
    const [r, g, b] = hexToRgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.45;
}

export function contrastColor(hex: string): string {
    return isLightColor(hex) ? "#111111" : "#FFFFFF";
}

export function rgba(hex: string, alpha: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function darken(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const f = 1 - amount;
    return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

export function lighten(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return `rgb(${Math.min(255, Math.round(r + (255 - r) * amount))},${Math.min(255, Math.round(g + (255 - g) * amount))},${Math.min(255, Math.round(b + (255 - b) * amount))})`;
}

// ── Text Utilities ──

/** Wrap text into lines fitting maxWidth */
export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
    const words = text.split("");
    const lines: string[] = [];
    let currentLine = "";

    for (const char of words) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = char;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

/** Draw text with shadow */
export function drawTextWithShadow(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    shadowColor = "rgba(0,0,0,0.6)",
    shadowBlur = 8
) {
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
    ctx.restore();
}

/** Draw multi-line text and return total height drawn */
export function drawWrappedText(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    opts?: { shadow?: boolean; maxLines?: number }
): number {
    const lines = wrapText(ctx, text, maxWidth);
    const displayLines = opts?.maxLines ? lines.slice(0, opts.maxLines) : lines;
    for (let i = 0; i < displayLines.length; i++) {
        if (opts?.shadow) {
            drawTextWithShadow(ctx, displayLines[i], x, y + i * lineHeight);
        } else {
            ctx.fillText(displayLines[i], x, y + i * lineHeight);
        }
    }
    return displayLines.length * lineHeight;
}

// ── Image Utilities ──

/** Load image from URL or base64 data URI */
export async function safeLoadImage(src: string): Promise<Image | null> {
    try {
        if (src.startsWith("data:")) {
            const match = src.match(/^data:image\/\w+;base64,(.+)$/);
            if (match) {
                const buf = Buffer.from(match[1], "base64");
                return await loadImage(buf);
            }
        }
        return await loadImage(src);
    } catch (e) {
        console.warn("[BlogImage] Failed to load image:", e);
        return null;
    }
}

/** Draw image covering the entire area (like CSS background-size: cover) */
export function drawCover(
    ctx: SKRSContext2D,
    img: Image,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    objectPosition: "center" | "top" = "center"
) {
    const scale = Math.max(dw / img.width, dh / img.height);
    const sw = dw / scale;
    const sh = dh / scale;
    const sx = (img.width - sw) / 2;
    const sy = objectPosition === "top" ? 0 : (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Draw circular clipped image */
export function drawCircleImage(
    ctx: SKRSContext2D,
    img: Image,
    cx: number,
    cy: number,
    radius: number,
    borderColor?: string,
    borderWidth = 3
) {
    ctx.save();
    if (borderColor) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius + borderWidth, 0, Math.PI * 2);
        ctx.fillStyle = borderColor;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, img, cx - radius, cy - radius, radius * 2, radius * 2, "top");
    ctx.restore();
}

/** Draw rounded rectangle */
export function roundRect(
    ctx: SKRSContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ── Gradient Helpers ──

export function drawGradientOverlay(
    ctx: SKRSContext2D,
    direction: "bottom" | "top" | "full",
    color = "#000000",
    opacity1 = 0,
    opacity2 = 0.85
) {
    const s = SIZE;
    let grad;
    if (direction === "bottom") {
        grad = ctx.createLinearGradient(0, s * 0.3, 0, s);
    } else if (direction === "top") {
        grad = ctx.createLinearGradient(0, 0, 0, s * 0.7);
    } else {
        grad = ctx.createLinearGradient(0, 0, 0, s);
    }
    grad.addColorStop(0, rgba(color, opacity1));
    grad.addColorStop(1, rgba(color, opacity2));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
}

/** Draw dark vignette */
export function drawVignette(ctx: SKRSContext2D, opacity = 0.5) {
    const s = SIZE;
    const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.75);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${opacity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
}

// ── Main Render Function ──

export interface RenderInput {
    title: string;
    summaryPoints: string[];
    profile: {
        lawyerName: string;
        officeName: string;
        phone: string;
        address: string;
        website: string;
        specialty: string[];
        profileImages: string[];
        officeImages: string[];
        logoImage: string;
        brandColor: string;
        brandLines: string[];
    };
    templateId: number;
    imageType: "main" | "summary" | "contact" | "brand";
    accentColor?: string;
}

export async function renderBlogImage(input: RenderInput): Promise<Buffer> {
    ensureFonts();

    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext("2d");

    // Load images
    const profileImg = input.profile.profileImages?.[0]
        ? await safeLoadImage(input.profile.profileImages[0])
        : null;
    const officeImg = input.profile.officeImages?.[0]
        ? await safeLoadImage(input.profile.officeImages[0])
        : null;
    const logoImg = input.profile.logoImage
        ? await safeLoadImage(input.profile.logoImage)
        : null;

    const accent = input.accentColor || input.profile.brandColor || "#2B4C7E";

    const assets = { profileImg, officeImg, logoImg, accent };

    // Dynamic import of template module
    const { renderMainTemplate } = await import("./templates-main");
    const { renderSummaryTemplate } = await import("./templates-summary");
    const { renderContactTemplate } = await import("./templates-contact");
    const { renderBrandTemplate } = await import("./templates-brand");

    switch (input.imageType) {
        case "main":
            renderMainTemplate(ctx, input, assets);
            break;
        case "summary":
            renderSummaryTemplate(ctx, input, assets);
            break;
        case "contact":
            renderContactTemplate(ctx, input, assets);
            break;
        case "brand":
            renderBrandTemplate(ctx, input, assets);
            break;
    }

    return canvas.toBuffer("image/png");
}

export type Assets = {
    profileImg: Image | null;
    officeImg: Image | null;
    logoImg: Image | null;
    accent: string;
};
