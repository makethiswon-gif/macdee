import sharp from "sharp";
import { parseFilters, type StudioFilters, type StudioProportion } from "./types";
import { reshapeStudioPixels } from "./proportions";

function noise(x: number, y: number, seed: number) {
    let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ seed;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295 - 0.5;
}
/** Deterministic luminance grain, not a model edit. One setting always reproduces the same pixels. */
export function tonePixels(data: Uint8Array, width: number, height: number, settings: StudioFilters, seed: number) {
    const s = parseFilters(settings), gain = 2 ** s.exposure;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        const luminance = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
        const radius = ((x / width - 0.5) ** 2 + (y / height - 0.5) ** 2) * 2;
        const grain = (noise(x, y, seed) * 0.75 + noise(x >> 1, y >> 1, seed ^ 713) * 0.25) * s.grain * (0.65 + 0.6 * Math.sin(Math.PI * luminance));
        for (let c = 0; c < 3; c++) {
            let v = (luminance + (data[i + c] / 255 - luminance) * s.saturation) * gain;
            v = (v - 0.18) * s.contrast + 0.18;
            if (v > 0.6) v = 0.6 + (v - 0.6) / (1 + s.highlights * (v - 0.6) * 3);
            v *= 1 - s.vignette * radius;
            data[i + c] = Math.max(0, Math.min(255, Math.round(v * 255 + grain)));
        }
    }
    return data;
}
export async function finishStudioPhoto(original: Buffer, settings: StudioFilters, seed: number | string, preview = false, proportions: StudioProportion[] = []) {
    const s = parseFilters(settings);
    let pipe = sharp(original, { limitInputPixels: 24_000_000 }).rotate().flatten({ background: "#ededeb" })
        .resize(s.longEdge, s.longEdge, { fit: "inside", withoutEnlargement: true }).removeAlpha().toColourspace("srgb");
    if (s.softness > 0) pipe = pipe.blur(0.3 + s.softness);
    const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
    const pixels = await reshapeStudioPixels(data, info.width, info.height, proportions);
    tonePixels(pixels, info.width, info.height, s, typeof seed === "string" ? parseInt(seed.slice(0, 8), 16) : seed);
    // Preview is derived from final-resolution pixels, so grain scale matches the saved file.
    let result = sharp(pixels, { raw: { width: info.width, height: info.height, channels: 3 } });
    if (preview) result = result.resize(1000, 1000, { fit: "inside", withoutEnlargement: true });
    return result.withMetadata({ exif: { IFD0: { ImageDescription: "AI-generated staged portrait. Not a photograph of an actual consultation or office." } } })
        .jpeg({ quality: s.jpegQuality, chromaSubsampling: "4:4:4" }).toBuffer();
}
