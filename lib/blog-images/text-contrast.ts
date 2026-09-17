import type { SKRSContext2D } from "@napi-rs/canvas";

export function luminance(color: string) {
    const rgb = color.slice(1).match(/../g)!.map(part => {
        const v = parseInt(part, 16) / 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
export const contrastRatio = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

export function textProtection(color: string, background: number[], size: number) {
    // The 2000px original is normally read at mobile width, so even display type needs a strong contrast floor.
    const threshold = 4.5;
    const score = (ink: string) => {
        const light = luminance(ink);
        const ratios = background.map(value => contrastRatio(light, value)).sort((a, b) => a - b);
        return ratios[Math.floor(ratios.length * .1)] || 1;
    };
    let fill = color, direct = score(color);
    const originalContrast = direct;
    if (direct < threshold) {
        const rgb = color.slice(1).match(/../g)!.map(p => parseInt(p, 16));
        const tones = [...background].sort((a, b) => a - b);
        const target = (tones[Math.floor(tones.length / 2)] || 0) < .35 ? 255 : 0;
        // Retain the logo's hue. Near-black/white marks may use their reversed tonal form.
        const steps = Math.max(...rgb) - Math.min(...rgb) < 20 ? [.16, .32, .48, .64, .8, .9] : [.12, .24, .36, .48, .6, .72];
        for (const amount of steps) {
            const tone = "#" + rgb.map(v => Math.round(v + (target - v) * amount).toString(16).padStart(2, "0")).join("").toUpperCase();
            const candidate = score(tone);
            if (candidate > direct) { fill = tone; direct = candidate; }
            if (direct >= threshold) break;
        }
    }
    const ink = luminance(fill);
    const edge = contrastRatio(ink, 1) >= contrastRatio(ink, 0) ? "#FFFFFF" : "#000000";
    return { fill, adjusted: fill !== color, needed: direct < threshold, shadow: originalContrast < threshold,
        edge, direct, threshold, edgeContrast: contrastRatio(ink, luminance(edge)), width: Math.max(.8, Math.min(1.8, size * .012)) };
}

/** Sample the real glyph area, including mixed light/dark photography, before painting it. */
export function paintPhotoText(c: SKRSContext2D, value: string, x: number, y: number, size: number, color: string) {
    if (!value.trim()) return false;
    const scale = c.canvas.width / 1200, m = c.measureText(value);
    const left = Math.max(0, Math.floor((x - m.actualBoundingBoxLeft) * scale));
    const top = Math.max(0, Math.floor((y - m.actualBoundingBoxAscent) * scale));
    const right = Math.min(c.canvas.width, Math.ceil((x + m.actualBoundingBoxRight) * scale));
    const bottom = Math.min(c.canvas.height, Math.ceil((y + m.actualBoundingBoxDescent) * scale));
    const samples: number[] = [];
    if (right > left && bottom > top) {
        const pixels = c.getImageData(left, top, right - left, bottom - top).data;
        const stride = Math.max(4, Math.floor(pixels.length / 4 / 1500) * 4);
        for (let i = 0; i < pixels.length; i += stride) {
            const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
            samples.push(rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722);
        }
    }
    const protection = textProtection(color, samples, size);
    c.save();
    if (protection.needed) {
        c.lineJoin = "round"; c.miterLimit = 2;
        c.strokeStyle = protection.edge; c.lineWidth = protection.width;
        c.shadowColor = protection.edge === "#FFFFFF" ? "rgba(255,255,255,.65)" : "rgba(0,0,0,.65)";
        c.shadowBlur = Math.max(3, Math.min(10, size * .07)) * scale;
        c.shadowOffsetX = 0; c.shadowOffsetY = 0;
        c.strokeText(value, x, y);
    }
    c.shadowColor = protection.shadow ? (protection.edge === "#FFFFFF" ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.5)") : "transparent";
    c.shadowBlur = protection.shadow ? Math.min(8, size * .06) * scale : 0;
    c.shadowOffsetY = protection.shadow && protection.edge === "#000000" ? 1.1 * scale : 0;
    c.fillStyle = protection.fill; c.fillText(value, x, y); c.restore();
    return protection.needed || protection.shadow;
}
