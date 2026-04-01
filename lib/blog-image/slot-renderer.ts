import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    FONT_BLACK, FONT_BOLD, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawAutoShrinkText, drawCover, drawWrappedText, roundRect
} from "./renderer";
import {
    type StylePreset, type TextSlot, type PhotoSlot, type DecoSlot, type CtaSlot,
    type RectConfig, type StyleId
} from "./templates-config";

export interface ExtractedLogoColors {
    primary: string;
    luminance: number;
}

export function applyLogoColor(preset: StylePreset, logoExtracted: ExtractedLogoColors): StylePreset {
    const p = JSON.parse(JSON.stringify(preset)) as StylePreset;
    const rep = logoExtracted.primary;
    if (p.logoColorPolicy.overrideAccent) {
        p.colors.accent.primary = rep;
    }
    const traverse = (obj: any) => {
        for (const k in obj) {
            if (typeof obj[k] === 'string') {
                if (obj[k] === '{{logo.primary}}' || obj[k] === '{{logo.accent}}') {
                    obj[k] = rep;
                }
            } else if (typeof obj[k] === 'object' && obj[k] !== null) {
                traverse(obj[k]);
            }
        }
    };
    traverse(p);
    return p;
}

export function getResolvedStyle(stylePreset: StylePreset, logoExtracted?: ExtractedLogoColors): StylePreset {
    if (logoExtracted) {
        return applyLogoColor(stylePreset, logoExtracted);
    }
    return stylePreset;
}

// === Color / Font Resolvers ===
export function resolveColor(key: string, style: StylePreset): string {
    if (key === 'primary') return style.colors.text.primary;
    if (key === 'secondary') return style.colors.text.secondary;
    if (key === 'muted') return style.colors.text.muted;
    if (key === 'accent') return style.colors.accent.primary;
    if (key === 'onAccent') return style.colors.text.onAccent;
    return key; 
}

export function resolveFont(fontFamily: 'sans' | 'serif', weight: number | string): string {
    const w = Number(weight) || 400;
    let base = "";
    if (fontFamily === 'serif') {
        if (w >= 700) base = FONT_SERIF_BOLD;
        else base = FONT_SERIF_REGULAR;
    } else {
        if (w >= 900) base = FONT_BLACK;
        else if (w >= 600) base = FONT_BOLD;
        else base = FONT_REGULAR;
    }
    return `"${base}", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans CJK KR", sans-serif`;
}

// === Data Binder ===
export function bindText(rawText: string, dataObj: Record<string, string | string[]>): string {
    let result = rawText;
    // HACK: Strip Hanja characters to prevent rendering broken boxes [][][] on server
    result = result.replace(/[\u4e00-\u9faf\u3400-\u4DBF]/g, '');
    result = result.replace(/\(\s*\)/g, ''); // cleanup empty parens if hanja was inside

    const matches = rawText.match(/{{[^}]+}}/g);
    if (!matches) return rawText;

    for (const match of matches) {
        const key = match.replace(/[{}]/g, ''); // e.g. "post.title"
        const value = dataObj[key];
        
        let stringValue = '';
        if (Array.isArray(value)) {
            stringValue = value.join('\n');
        } else if (value) {
            stringValue = String(value);
        }

        result = result.replace(match, stringValue);
    }
    return result;
}

// === Render Slots ===
export function drawDecorations(ctx: SKRSContext2D, decos: DecoSlot[], style: StylePreset, canvasSize: number) {
    const scaleRatio = canvasSize / 1024;
    for (const deco of decos) {
        if (deco.rect) {
            const rx = Math.round(deco.rect.x * canvasSize);
            const ry = Math.round(deco.rect.y * canvasSize);
            const rw = Math.round(deco.rect.w * canvasSize);
            const rh = Math.round(deco.rect.h * canvasSize);
            
            if (deco.type === 'divider') {
                const color = style.decorations.divider?.color || style.colors.accent.primary;
                const opacity = style.decorations.divider?.opacity || 1;
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity;
                const realW = rw > 0 ? rw : Math.round((style.decorations.divider?.width || 40) * scaleRatio);
                const realH = rh > 0 ? rh : Math.max(1, Math.round(2 * scaleRatio));
                ctx.fillRect(rx, ry, realW, realH);
                ctx.globalAlpha = 1.0;
            }
            if (deco.type === 'underline') {
                ctx.fillStyle = style.colors.accent.primary;
                ctx.fillRect(rx, ry, rw > 0 ? rw : Math.round(40 * scaleRatio), rh > 0 ? rh : Math.max(1, Math.round(3 * scaleRatio)));
            }
        }
    }
}

export function drawPhotos(ctx: SKRSContext2D, photos: PhotoSlot[], assets: Record<string, any>, style: StylePreset, canvasSize: number) {
    for (const p of photos) {
        const imgKey = p.source === 'profile' ? 'profileImg' : p.source === 'office' ? 'officeImg' : p.source === 'logo' ? 'logoImg' : 'summaryImg';
        const img = assets[imgKey];
        const { x, y, w, h } = p.rect;
        const absX = x * canvasSize;
        const absY = y * canvasSize;
        const absW = w * canvasSize;
        const absH = h * canvasSize;

        ctx.save();
        ctx.beginPath();
        if (p.shape === 'circle') {
            const radius = Math.min(absW, absH) / 2;
            ctx.arc(absX + radius, absY + radius, radius, 0, Math.PI * 2);
        } else if (p.borderRadius && p.borderRadius > 0) {
            roundRect(ctx, absX, absY, absW, absH, Math.round(p.borderRadius * (canvasSize / 1024)));
        } else {
            ctx.rect(absX, absY, absW, absH);
        }
        ctx.clip();

        if (img) {
            if (p.alpha !== undefined) ctx.globalAlpha = p.alpha;
            if (p.objectFit === 'contain') {
                const imgRatio = img.width / img.height;
                const boxRatio = absW / absH;
                let dw, dh, dx, dy;
                if (imgRatio > boxRatio) {
                    dw = absW;
                    dh = absW / imgRatio;
                    dx = absX;
                    dy = absY + (absH - dh) / 2;
                } else {
                    dh = absH;
                    dw = absH * imgRatio;
                    dy = absY;
                    dx = absX + (absW - dw) / 2;
                }
                ctx.drawImage(img, dx, dy, dw, dh);
            } else {
                // Profile photos: anchor to top so faces aren't cropped on full-body shots
                const objPos = p.source === 'profile' ? 'top' : 'center';
                drawCover(ctx, img, absX, absY, absW, absH, objPos as "center" | "top");
            }
            if (p.alpha !== undefined) ctx.globalAlpha = 1.0;
        } else {
            // Draw fallback
            if (p.fallback === 'solid-bg') {
                ctx.fillStyle = p.source === 'logo' ? "transparent" : style.colors.bg.secondary;
                ctx.fillRect(absX, absY, absW, absH);
            } else if (p.fallback === 'gradient-bg' && style.colors.bg.gradient) {
                const grad = ctx.createLinearGradient(absX, absY, absX + absW, absY + absH);
                grad.addColorStop(0, style.colors.bg.gradient.from);
                grad.addColorStop(1, style.colors.bg.gradient.to);
                ctx.fillStyle = grad;
                ctx.fillRect(absX, absY, absW, absH);
            }
        }

        // Apply photo overlays
        if (p.overlay !== 'none' && style.colors.overlay) {
            const ov = style.colors.overlay;
            if (p.overlay === 'style-default' || p.overlay === 'darken-heavy' || p.overlay === 'lighten') {
                let color = ov.color;
                let opacity = ov.opacity;
                if (p.overlay === 'darken-heavy') opacity = Math.min(ov.opacity + 0.2, 0.9);
                if (p.overlay === 'lighten') {
                    color = style.colors.bg.primary;
                    opacity = 0.7;
                }
                ctx.globalAlpha = opacity;
                
                if (p.overlayDirection === 'bottom') {
                    const gradient = ctx.createLinearGradient(absX, absY, absX, absY + absH);
                    gradient.addColorStop(0, "transparent");
                    gradient.addColorStop(0.5, "transparent");
                    gradient.addColorStop(1, color);
                    ctx.fillStyle = gradient;
                } else if (p.overlayDirection === 'left') {
                    const gradient = ctx.createLinearGradient(absX, absY, absX + absW, absY);
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(0.5, color);
                    gradient.addColorStop(1, "transparent");
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = color;
                }
                ctx.fillRect(absX, absY, absW, absH);
                ctx.globalAlpha = 1.0;
            } else if (p.overlay === 'gradient-bottom') {
                const gradient = ctx.createLinearGradient(absX, absY, absX, absY + absH);
                gradient.addColorStop(0, "transparent");
                gradient.addColorStop(0.3, "transparent");
                gradient.addColorStop(1, ov.color);
                ctx.fillStyle = gradient;
                ctx.globalAlpha = ov.opacity + 0.2;
                ctx.fillRect(absX, absY, absW, absH);
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.restore();
    }
}

export function drawTexts(ctx: SKRSContext2D, texts: TextSlot[], dataObj: Record<string, any>, style: StylePreset, canvasSize: number) {
    const scaleRatio = canvasSize / 1024;
    for (const t of texts) {
        let content = bindText(t.bind, dataObj);
        if (!content) continue;

        if (t.role === 'category' && style.typography.categoryTransform === 'uppercase') {
            content = content.toUpperCase();
        }

        const { x, y, w, h } = t.rect;
        const absX = x * canvasSize;
        const absY = y * canvasSize;
        const absW = w * canvasSize;
        const absH = h * canvasSize;

        // Determine font
        let family = style.typography.titleFont;
        let weight: string | number = style.typography.titleWeight;
        if (t.role === 'body' || t.role === 'meta') {
            family = style.typography.bodyFont;
            weight = style.typography.bodyWeight;
        }

        const fontName = resolveFont(family, weight);
        const color = resolveColor(t.colorKey, style);
        
        const scaledFontSize = Math.round(t.fontSize * scaleRatio);

        ctx.fillStyle = color;
        ctx.textAlign = t.align;
        ctx.textBaseline = "top";
        
        let drawX = Math.round(absX);
        let drawY = Math.round(absY);
        if (t.align === 'center') drawX += Math.round(absW / 2);
        if (t.align === 'right') drawX += Math.round(absW);

        if (t.role === 'category' || t.role === 'meta' || t.role === 'accent') {
            // Usually single line
            ctx.font = `${weight} ${scaledFontSize}px ${fontName}`;
            ctx.fillText(content, drawX, drawY, absW); // 삐져나가지 않도록 강제 제한
        } else if (t.role === 'body') {
            drawAutoShrinkText(ctx, content, drawX, drawY, absW, absH, scaledFontSize, fontName, String(weight), { 
                center: t.align === 'center', 
                lineGap: 1.45, 
                minFontSize: Math.round(9 * scaleRatio),
                maxLines: t.maxLines
            });
        } else {
            // title
            drawAutoShrinkText(ctx, content, drawX, drawY, absW, absH, scaledFontSize, fontName, String(weight), { 
                center: t.align === 'center', 
                lineGap: 1.3, 
                minFontSize: Math.round(scaledFontSize * 0.5),
                maxLines: t.maxLines
            });
        }
    }
}
