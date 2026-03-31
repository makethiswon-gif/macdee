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
    if (!hex) return [43, 76, 126]; // fallback to #2B4C7E
    
    // Handle "rgb(r, g, b)" fallback just in case
    if (hex.startsWith("rgb")) {
        const match = hex.match(/\d+/g);
        if (match && match.length >= 3) {
            return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
        }
    }

    const h = hex.replace("#", "");
    const c = h.length <= 4 ? h.slice(0, 3) : h.slice(0, 6);
    const full = c.length === 3 ? c.split("").map(ch => ch + ch).join("") : c;
    
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    
    // Completely crush NaN errors
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return [43, 76, 126];
    }
    return [r, g, b];
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
    const nr = Math.floor(r * f);
    const ng = Math.floor(g * f);
    const nb = Math.floor(b * f);
    return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

export function lighten(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    const nr = Math.min(255, Math.floor(r + (255 - r) * amount));
    const ng = Math.min(255, Math.floor(g + (255 - g) * amount));
    const nb = Math.min(255, Math.floor(b + (255 - b) * amount));
    return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

/** Get a very dark background color from an accent hex (10% brightness) */
export function getDeepDarkColor(hex: string): string {
    const [r, g, b] = hexToRgb(hex);
    // Multiply by roughly 10-15%
    const nr = Math.floor(r * 0.12);
    const ng = Math.floor(g * 0.12);
    const nb = Math.floor(b * 0.15);
    return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

/** Force an accent color to be bright enough against dark backgrounds */
export function ensureBrightAccent(hex: string): string {
    let [r, g, b] = hexToRgb(hex);
    // Calculate relative luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 160) {
        // If it's too dark to stand out, lighten it dramatically instead of failing
        return lighten(hex, 0.6); // Boost brightness by 60%
    }
    return hex;
}

/** Extract visually dominant brand color from a logo image */
export function extractDominantColor(img: Image | null, fallback: string): string {
    if (!img) return fallback;
    try {
        const c = createCanvas(50, 50);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i+3];
            if (alpha < 128) continue; // Skip transparency
            
            const pxR = data[i]; const pxG = data[i+1]; const pxB = data[i+2];
            // Skip nearly white or nearly black pixels to avoid extracting the text color
            if ((pxR > 240 && pxG > 240 && pxB > 240) || (pxR < 30 && pxG < 30 && pxB < 30)) continue;
            // Skip very pure greys
            const max = Math.max(pxR, pxG, pxB);
            const min = Math.min(pxR, pxG, pxB);
            if (max - min < 20) continue;

            r += pxR; g += pxG; b += pxB; count++;
        }
        
        if (count === 0) return fallback;
        const outHex = `#${((1 << 24) + (Math.floor(r/count) << 16) + (Math.floor(g/count) << 8) + Math.floor(b/count)).toString(16).slice(1)}`;
        return outHex;
    } catch {
        return fallback;
    }
}

/** Check if an image contains significant transparent pixels (cutout/누끼) */
export function hasTransparency(img: Image | null): boolean {
    if (!img) return false;
    try {
        // Fast 50x50 check
        const c = createCanvas(50, 50);
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let transparentPixels = 0;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 240) transparentPixels++;
        }
        // If more than 5% of pixels are significantly transparent, treat as a cutout (누끼)
        return transparentPixels > (2500 * 0.05);
    } catch {
        return false;
    }
}

// ── Text Utilities ──

/** Wrap text into lines fitting maxWidth, preferring word breaks */
export function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
    const finalLines: string[] = [];
    
    // First, preserve explicit line breaks from the user
    const paragraphs = text.split("\n");
    
    for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
            finalLines.push(""); // Preserve empty lines if requested
            continue;
        }

        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
            // If word itself is longer than maxWidth, we must character-split it
            const wordWidth = ctx.measureText(word).width;
            if (wordWidth > maxWidth) {
                // Flush current line if anything exists
                if (currentLine) {
                    finalLines.push(currentLine.trimEnd());
                    currentLine = "";
                }
                const chars = word.split("");
                for (const char of chars) {
                    const testLine = currentLine + char;
                    if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                        finalLines.push(currentLine);
                        currentLine = char;
                    } else {
                        currentLine = testLine;
                    }
                }
                currentLine += " ";
                continue;
            }

            const testLine = currentLine + (currentLine.length > 0 ? " " : "") + word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
                finalLines.push(currentLine.trimEnd());
                currentLine = word + " ";
            } else {
                currentLine = testLine + " ";
            }
        }
        
        if (currentLine.trim()) finalLines.push(currentLine.trimEnd());
    }
    
    return finalLines;
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
    const hasMore = opts?.maxLines && lines.length > opts.maxLines;
    const displayLines = opts?.maxLines ? lines.slice(0, opts.maxLines) : lines;
    
    if (hasMore) {
        // Append "..." to the last allowed line
        let lastLine = displayLines[displayLines.length - 1];
        lastLine = lastLine.length > 3 ? lastLine.slice(0, -3) + "..." : lastLine + "...";
        displayLines[displayLines.length - 1] = lastLine;
    }

    for (let i = 0; i < displayLines.length; i++) {
        if (opts?.shadow) {
            drawTextWithShadow(ctx, displayLines[i], x, y + i * lineHeight);
        } else {
            ctx.fillText(displayLines[i], x, y + i * lineHeight);
        }
    }
    return displayLines.length * lineHeight;
}

/** 
 * Automatically shrinks text to fit within constraints. 
 * Prevents text cutoff for long titles (Point 4 fix).
 */
export function drawAutoShrinkText(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    initialFontSize: number,
    fontFamily: string,
    fontWeight: string,
    opts?: { shadow?: boolean, highlightPattern?: { color: string, type: "first-line" | "all" } }
): { height: number; lines: string[]; fontSize: number } {
    let currentFontSize = initialFontSize;
    let lines: string[] = [];
    let lineHeight = currentFontSize * 1.3;

    // Linear scale down until it fits
    while (currentFontSize > 24) {
        ctx.font = `${fontWeight} ${currentFontSize}px ${fontFamily}`;
        lines = wrapText(ctx, text, maxWidth);
        lineHeight = currentFontSize * 1.3;

        if (lines.length * lineHeight <= maxHeight) {
            break; // fits perfectly
        }
        currentFontSize -= 2; // shrink down by 2px
    }

    // Set finalized font size
    ctx.font = `${fontWeight} ${currentFontSize}px ${fontFamily}`;
    
    // Draw Highlights if requested
    if (opts?.highlightPattern) {
        ctx.save();
        ctx.fillStyle = opts.highlightPattern.color;
        // The highlight box should extend slightly below and above the text
        const boxPadY = currentFontSize * 0.1;
        const boxH = currentFontSize * 1.25;
        
        for (let i = 0; i < lines.length; i++) {
            if (opts.highlightPattern.type === "first-line" && i > 0) break;
            const w = ctx.measureText(lines[i]).width;
            
            let hx = x;
            if (ctx.textAlign === "center") hx = x - w / 2;
            else if (ctx.textAlign === "right") hx = x - w;
            
            ctx.fillRect(hx, y + i * lineHeight - boxPadY, w, boxH);
        }
        ctx.restore();
    }
    
    // Actually draw text
    for (let i = 0; i < lines.length; i++) {
        if (opts?.shadow) {
            drawTextWithShadow(ctx, lines[i], x, y + i * lineHeight);
        } else {
            ctx.fillText(lines[i], x, y + i * lineHeight);
        }
    }

    return { height: lines.length * lineHeight, lines, fontSize: currentFontSize };
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

let cachedNoiseOverlay: Image | null = null;
export async function drawFilmGrain(ctx: SKRSContext2D, opacity = 0.05) {
    if (!cachedNoiseOverlay) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'>
            <filter id='noiseFilter'>
                <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>
            </filter>
            <rect width='100%' height='100%' filter='url(#noiseFilter)' opacity='0.5'/>
        </svg>`;
        const base64 = Buffer.from(svg).toString('base64');
        cachedNoiseOverlay = await loadImage(`data:image/svg+xml;base64,${base64}`);
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(cachedNoiseOverlay, 0, 0, SIZE, SIZE);
    ctx.restore();
}

// ── Main Render Function ──

export interface RenderInput {
    title: string;
    summaryPoints: string[];
    profile: {
        lawyerName: string;
        jobTitle: string;
        officeName: string;
        phone: string;
        address: string;
        website: string;
        specialty: string[];
        career: string[];
        profileImages: string[];
        officeImages: string[];
        logoImage: string;
        brandColor: string;
        brandLines: string[];
    };
    templateId: number;
    imageType: "main" | "summary" | "contact" | "brand" | "career";
    accentColor?: string;
}

export async function renderBlogImage(input: RenderInput): Promise<Buffer> {
    ensureFonts();

    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext("2d");

    // Load images
    const profiles = input.profile.profileImages || [];
    const offices = input.profile.officeImages || [];
    
    // Randomize which photo is picked (fixes "always the same photo" issue)
    const profileUrl = profiles.length > 0 ? profiles[Math.floor(Math.random() * profiles.length)] : null;
    const officeUrl = offices.length > 0 ? offices[Math.floor(Math.random() * offices.length)] : null;

    const profileImg = profileUrl ? await safeLoadImage(profileUrl) : null;
    const officeImg = officeUrl ? await safeLoadImage(officeUrl) : null;
    const logoImg = input.profile.logoImage ? await safeLoadImage(input.profile.logoImage) : null;

    // Calculate smart colors based on the logo if present, or fallback to the provided brand color
    const providedAccent = input.accentColor || input.profile.brandColor || "#2B4C7E";
    const extractedAccent = extractDominantColor(logoImg, providedAccent);
    
    // We get a beautifully matched dark background (10~15% brightness of the accent color)
    const darkBg = getDeepDarkColor(extractedAccent);
    
    // For text overlay, check if the accent color is too dark and make it bright enough to pop
    const accent = ensureBrightAccent(providedAccent);

    const assets = { profileImg, officeImg, logoImg, accent, darkBg };

    // Dynamic import of template module
    const { renderMainTemplate } = await import("./templates-main");
    const { renderSummaryTemplate } = await import("./templates-summary");
    const { renderContactTemplate } = await import("./templates-contact");
    const { renderBrandTemplate } = await import("./templates-brand");
    const { renderCareerTemplate } = await import("./templates-career");

    switch (input.imageType) {
        case "main":
            await renderMainTemplate(ctx, input, assets);
            break;
        case "summary":
            await renderSummaryTemplate(ctx, input, assets);
            break;
        case "contact":
            await renderContactTemplate(ctx, input, assets);
            break;
        case "brand":
            await renderBrandTemplate(ctx, input, assets);
            break;
        case "career":
            await renderCareerTemplate(ctx, input, assets);
            break;
    }

    return canvas.toBuffer("image/png");
}

export type Assets = {
    profileImg: Image | null;
    officeImg: Image | null;
    logoImg: Image | null;
    accent: string;
    darkBg: string;
};
