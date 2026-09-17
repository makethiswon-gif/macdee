import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { openCv } from "./opencv";
import { StudioError } from "./types";

export const REFERENCE_POLICY = "body-first-references-v3";
let cascadeReady: Promise<void> | undefined;

export async function normalizeReference(bytes: Buffer) {
    const source = sharp(bytes, { limitInputPixels: 24_000_000 });
    const meta = await source.metadata();
    if (!meta.format || !["png", "jpeg", "webp"].includes(meta.format) || (meta.pages || 1) !== 1 || !meta.width || !meta.height || Math.min(meta.width, meta.height) < 256) throw new StudioError("가로·세로 256px 이상의 단일 JPG, PNG, WebP 사진을 선택해주세요.");
    return source.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer();
}

export async function detectReferenceFaces(bytes: Buffer) {
    const original = await normalizeReference(bytes);
    const { data, info } = await sharp(original).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { cv } = await openCv();
    cascadeReady ||= (async () => {
        const xml = await readFile(path.join(process.cwd(), "lib/lawyer-studio/models/haarcascade_frontalface_default.xml"));
        cv.FS_createDataFile("/", "studio-frontalface.xml", new Uint8Array(xml), true, false, false);
    })().catch((error) => { cascadeReady = undefined; throw error; });
    await cascadeReady;
    const classifier = new cv.CascadeClassifier(), gray = new cv.Mat(info.height, info.width, cv.CV_8UC1), faces = new cv.RectVector();
    let boxes: { x: number; y: number; width: number; height: number }[];
    try {
        if (!classifier.load("/studio-frontalface.xml")) throw new StudioError("얼굴 검출기를 준비하지 못했습니다. 유료 생성 전 중단했습니다.", 503);
        gray.data.set(data);
        // Conservative consensus avoids mistaking ties, hands and hair for extra faces.
        classifier.detectMultiScale(gray, faces, 1.08, 18, 0, new cv.Size(36, 36), new cv.Size(0, 0));
        boxes = Array.from({ length: faces.size() }, (_, i) => ({ ...faces.get(i) })).sort((a, b) => a.x - b.x);
    } finally { faces.delete(); gray.delete(); classifier.delete(); }
    const meta = await sharp(original).metadata(), sx = meta.width! / info.width, sy = meta.height! / info.height;
    return { original, width: meta.width!, height: meta.height!, boxes: boxes.map(box => ({ x: box.x * sx, y: box.y * sy, width: box.width * sx, height: box.height * sy })) };
}

export async function isolateHeads(bytes: Buffer, expected: 1 | 2): Promise<Buffer[]> {
    const { original, boxes, width, height } = await detectReferenceFaces(bytes);
    if (boxes.length !== expected) throw new StudioError(`얼굴 ${boxes.length}개를 검출했습니다. ${expected}인 촬영에는 각 원본에서 ${expected}명의 얼굴이 선명하게 보여야 합니다. 정면에 가까운 머리·어깨 사진으로 바꿔주세요. 유료 생성은 시작하지 않았습니다.`, 422);
    const crops: Buffer[] = [];
    for (const box of boxes) {
        const left = Math.max(0, Math.floor(box.x - box.width * 0.22));
        const top = Math.max(0, Math.floor(box.y - box.height * 0.5));
        const right = Math.min(width, Math.ceil(box.x + box.width * 1.22));
        const bottom = Math.min(height, Math.ceil(box.y + box.height * 1.22));
        if (box.width < 60) throw new StudioError("얼굴이 너무 작습니다. 더 선명한 머리·어깨 사진을 선택해주세요. 유료 생성 전 중단했습니다.", 422);
        crops.push(await sharp(original).extract({ left, top, width: right - left, height: bottom - top }).resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).png().toBuffer());
    }
    return crops;
}

/** Supplement the visual reference with measured tones; never substitute this for its pixels. */
export async function describeStyle(bytes: Buffer): Promise<string> {
    const original = await normalizeReference(bytes);
    const { data } = await sharp(original).resize(192, 192, { fit: "fill" }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
    const luminance: number[] = [];
    let chroma = 0, warm = 0;
    for (let i = 0; i < data.length; i += 3) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        luminance.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
        chroma += Math.max(r, g, b) - Math.min(r, g, b); warm += r - b;
    }
    luminance.sort((a, b) => a - b);
    const n = luminance.length, median = luminance[Math.floor(n / 2)], spread = luminance[Math.floor(n * 0.9)] - luminance[Math.floor(n * 0.1)];
    const tone = median < 85 ? "Low-key tonal density with deep readable shadows" : median > 180 ? "High-key tonal density with soft bright surfaces" : "Balanced midtone density";
    const contrast = spread > 175 ? "pronounced light-dark separation with controlled highlights" : spread < 90 ? "soft tonal transitions and restrained contrast" : "moderate local contrast and natural highlight rolloff";
    const color = chroma / n < 9 ? "near-neutral monochrome tonality" : chroma / n < 35 ? "restrained low-chroma color" : "richer but believable color separation";
    const temperature = Math.abs(warm / n) < 10 ? "neutral color balance" : warm > 0 ? "gently warm color balance" : "gently cool color balance";
    return `${tone}; ${contrast}; ${color}; ${temperature}. These are measured tonal tendencies supplementing the supplied visual reference. Preserve natural skin texture; the selected shoot mood overrides monochrome or color in the reference. Final grain and softness are applied in postproduction.`;
}
