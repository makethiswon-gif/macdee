import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    FONT_BLACK, FONT_BOLD, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawAutoShrinkText, drawCover, drawWrappedText, roundRect
} from "./renderer";
import {
    type StylePreset, type TextSlot, type PhotoSlot, type DecoSlot, type CtaSlot,
    type Rect, type StyleId, type ExtractedLogoColors, applyLogoColor
} from "./templates-config";

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
    if (fontFamily === 'serif') {
        if (w >= 700) return FONT_SERIF_BOLD;
        return FONT_SERIF_REGULAR;
    } else {
        if (w >= 900) return FONT_BLACK;
        if (w >= 600) return FONT_BOLD;
        return FONT_REGULAR;
    }
}

// === Data Binder ===
export function bindText(rawText: string, dataObj: Record<string, string | string[]>): string {
    let result = rawText;
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
    for (const deco of decos) {
        if (deco.fromPreset) {
            if (deco.type === 'sidebar' && style.decorations.sideBar) {
                const s = style.decorations.sideBar;
                ctx.fillStyle = s.color;
                if (s.position === 'left') ctx.fillRect(0, 0, s.width, canvasSize);
                if (s.position === 'top') ctx.fillRect(0, 0, canvasSize, s.width);
                if (s.position === 'right') ctx.fillRect(canvasSize - s.width, 0, s.width, canvasSize);
                if (s.position === 'bottom') ctx.fillRect(0, canvasSize - s.width, canvasSize, s.width);
            }
            if (deco.type === 'frame' && style.decorations.innerFrame) {
                const f = style.decorations.innerFrame;
                ctx.strokeStyle = f.borderColor;
                ctx.lineWidth = f.borderWidth;
                const inset = f.inset;
                if (f.borderRadius && f.borderRadius > 0) {
                    ctx.beginPath();
                    roundRect(ctx, inset, inset, canvasSize - inset * 2, canvasSize - inset * 2, f.borderRadius);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(inset, inset, canvasSize - inset * 2, canvasSize - inset * 2);
                }
            }
            if (deco.type === 'scanlines' && style.decorations.scanlines) {
                ctx.fillStyle = "rgba(0,0,0,0.08)";
                for (let y = 0; y < canvasSize; y += 4) {
                    ctx.fillRect(0, y, canvasSize, 1);
                }
            }
            if (deco.type === 'circle' && style.decorations.circleAccents) {
                const c = style.decorations.circleAccents;
                ctx.fillStyle = c.color;
                ctx.globalAlpha = c.opacity;
                ctx.beginPath();
                ctx.arc(canvasSize * 0.8, canvasSize * 0.1, 150, 0, Math.PI * 2);
                ctx.fill();
                if (c.count > 1) {
                    ctx.beginPath();
                    ctx.arc(canvasSize * 0.2, canvasSize * 0.9, 80, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
            if (deco.type === 'orb' && style.decorations.gradientOrbs) {
                for (const orb of style.decorations.gradientOrbs) {
                    const cx = (orb.x / 100) * canvasSize;
                    const cy = (orb.y / 100) * canvasSize;
                    const r = orb.size * 3; 
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, orb.color);
                    grad.addColorStop(1, "transparent");
                    ctx.globalAlpha = orb.opacity;
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }
        } else if (deco.rect) {
            const rx = deco.rect.x * canvasSize;
            const ry = deco.rect.y * canvasSize;
            const rw = deco.rect.w * canvasSize;
            const rh = deco.rect.h * canvasSize;
            
            if (deco.type === 'divider') {
                const color = style.decorations.divider?.color || style.colors.accent.primary;
                const opacity = style.decorations.divider?.opacity || 1;
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity;
                const realW = rw > 0 ? rw : style.decorations.divider?.width || 40;
                const realH = rh > 0 ? rh : 2;
                ctx.fillRect(rx, ry, realW, realH);
                ctx.globalAlpha = 1.0;
            }
            if (deco.type === 'underline') {
                ctx.fillStyle = style.colors.accent.primary;
                ctx.fillRect(rx, ry, rw > 0 ? rw : 40, rh > 0 ? rh : 3);
            }
        }
    }
}

export function drawPhotos(ctx: SKRSContext2D, photos: PhotoSlot[], assets: Record<string, any>, style: StylePreset, canvasSize: number) {
    for (const p of photos) {
        const img = assets[p.source];
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
            roundRect(ctx, absX, absY, absW, absH, p.borderRadius);
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
                drawCover(ctx, img, absX, absY, absW, absH);
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
        if (t.role === 'body' || t.role === 'meta' || t.role === 'label') {
            family = style.typography.bodyFont;
            weight = style.typography.bodyWeight;
        }

        if (t.fontOverride) {
            family = t.fontOverride.font || family;
            weight = t.fontOverride.weight || weight;
        }

        const fontName = resolveFont(family, weight);
        const color = resolveColor(t.colorKey, style);

        ctx.fillStyle = color;
        ctx.textAlign = t.align;
        ctx.textBaseline = "top";
        
        let drawX = absX;
        let drawY = absY;
        if (t.align === 'center') drawX += absW / 2;
        if (t.align === 'right') drawX += absW;

        if (t.role === 'category' || t.role === 'label' || t.role === 'meta' || t.role === 'subtitle') {
            // Usually single line
            ctx.font = `${weight} ${t.fontSize}px ${fontName}`;
            ctx.fillText(content, drawX, drawY);
        } else if (t.role === 'body') {
            drawAutoShrinkText(ctx, content, drawX, drawY, absW, absH, t.fontSize, fontName, String(weight), { 
                center: t.align === 'center', 
                lineGap: 1.6, 
                minFontSize: 14 
            });
        } else {
            // title
            drawAutoShrinkText(ctx, content, drawX, drawY, absW, absH, t.fontSize, fontName, String(weight), { 
                center: t.align === 'center', 
                lineGap: 1.3, 
                minFontSize: t.fontSize * 0.5 
            });
        }
    }
}
