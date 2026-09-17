import sharp from "sharp";
import { readBrandAsset } from "./editorial-renderer";
import { prepareMagazineLogo } from "./logo-compositor";

type Bin = { r: number; g: number; b: number; weight: number };
export type LogoTypography = { primary: string; source: "logo" | "profile" | "fallback" };
const hex = (b: Bin) => "#" + [b.r, b.g, b.b].map(v => Math.round(v / b.weight).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Work from the actual registered artwork; neutral lettering must not drown out a coloured symbol. */
export async function extractLogoInk(bytes: Buffer): Promise<string | null> {
    const logo = await prepareMagazineLogo(bytes);
    const { data } = await sharp(logo.bytes).resize(384, 192, { fit: "inside", withoutEnlargement: true }).toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const all = new Map<string, Bin>(), chromatic = new Map<string, Bin>();
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = data.subarray(i, i + 4);
        if (a < 160) continue;
        const weight = a / 255, max = Math.max(r, g, b), min = Math.min(r, g, b);
        const key = `${r >> 4}_${g >> 4}_${b >> 4}`;
        const add = (bins: Map<string, Bin>) => {
            const bin = bins.get(key) || { r: 0, g: 0, b: 0, weight: 0 };
            bin.r += r * weight; bin.g += g * weight; bin.b += b * weight; bin.weight += weight;
            bins.set(key, bin);
        };
        visible += weight; add(all);
        if (max - min >= 16 && (max - min) / Math.max(1, max) >= .1) add(chromatic);
    }
    const top = (bins: Map<string, Bin>) => [...bins.values()].sort((a, b) => b.weight - a.weight)[0];
    const colour = top(chromatic), neutral = top(all);
    // Ignore isolated coloured compression speckles in an otherwise monochrome logo.
    const ink = colour && colour.weight >= Math.max(8, visible * .015) ? colour : neutral;
    return ink ? hex(ink) : null;
}

export async function extractLogoColor(source: string): Promise<string | null> {
    try { return await extractLogoInk(await readBrandAsset(source)); }
    catch { return null; }
}

export async function resolveLogoTypography(profile: { logoImage: string; brandColor: string }): Promise<LogoTypography> {
    const primary = profile.logoImage ? await extractLogoColor(profile.logoImage) : null;
    if (primary) return { primary, source: "logo" };
    if (/^#[\da-f]{6}$/i.test(profile.brandColor)) return { primary: profile.brandColor.toUpperCase(), source: "profile" };
    return { primary: "#174559", source: "fallback" };
}
