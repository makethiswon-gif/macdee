import { detectReferenceFaces } from "./reference-processing";
import type { StudioFramingReview, StudioHeadBalancePolicy, StudioOptions, StudioProportion } from "./types";

export const ANATOMY_POLICY = "natural-scale-v3";
export const HEAD_BALANCE_POLICY = "gentle-head-balance-v2";

export function anatomyDirection(options: StudioOptions) {
    const pair = options.subjectCount === 2;
    return `BODY-FIRST CONSTRUCTION: Establish a complete, normally built adult skeleton, shoulder girdle, rib cage, pelvis and limbs FIRST. Fit the reference identity to the head of that coherent figure. Facial identity means the relationships INSIDE the face, not copying the source photograph's head size relative to the canvas. Retain natural body mass and comfortably fitted clothing; give the torso enough depth and width for the reference person's build.
PROPORTION GUIDE: For a standing adult, aim for roughly 7-7.5 crown-to-chin head lengths from crown to soles, adjusted for the person's credible build; this is a photographic design guide, not a claim about their actual height. In an unforeshortened front or gentle three-quarter view, the shoulder span should read around 2.5-3 head widths, with a real neck, rib cage and pelvis beneath it. Keep ordinary hands, forearms and thighs in the same physical scale. Preserve individual build, never a slender mannequin body. For a seated person retain those SAME anatomical lengths with naturally bent hips and knees; do not count the compressed seated silhouette as standing height. Keep hips visible, thighs long enough to reach the knees and the complete lower legs connected to the feet. Do not compensate with inflated hair, raised suit shoulders or an elongated neck.
${options.scene === "forbes"
        ? "COVER GEOMETRY: Use a prominent knee-up portrait, not a tight face or waist-up crop. Crown to just below knees spans 75-85% of frame height. The entire head including hair should occupy about 14-17% of frame height, not a quarter of the image. Keep chest, waist and hips fully expressed within the crop. Use an 85-105mm-equivalent perspective from at least 3 metres, at upper-chest height with a level sensor. Keep the face and torso at comparable distance from the camera."
        : "ENVIRONMENTAL GEOMETRY: A full standing figure spans about 68-75% of frame height; a complete seated figure spans about 52-62%. In BOTH cases the entire head including hair should occupy about 9-10.5% of frame height, not 13-18%. Crown-to-chin head height is a linear measure, separate from the approximate 20% person AREA brief. Use an 85-105mm-equivalent perspective from across the space, approximately 7-10 metres away, with the camera around the subject's abdomen-to-lower-chest height and a level sensor. A seated subject is shot from a correspondingly lower camera position, not from a standing photographer looking down."}
${pair ? "Apply the proportion guide independently to BOTH adults at the same depth. If the paired area is crowded, widen the frame while keeping both heads and bodies at their coherent shared scale; never enlarge either head to distinguish the identities." : "Keep the complete head, neck and body in the same depth plane; avoid a face leaning toward the lens."}
FINAL ANATOMY PRIORITY: Natural head-to-body scale outranks exact person-area targets, face legibility, fashion styling and the apparent head size in any reference. Preserve age and internal facial features. If the framing is crowded, widen the composition; do not compress the torso or shorten legs. Do not enlarge a distant face for recognition.`;
}

// This is a free framing warning, not an anatomical diagnosis or an automatic pixel warp.
export function reviewFaceScale(ratios: number[], expected: 1 | 2, cover: boolean): StudioFramingReview {
    const limit = cover ? 0.125 : 0.078;
    const issues: string[] = [];
    if (ratios.length !== expected) issues.push("얼굴 크기를 안정적으로 측정하지 못했습니다. 머리·어깨·몸통 비율을 직접 확인해주세요.");
    else if (ratios.some(r => r > limit)) issues.push("얼굴이 촬영 비율 기준보다 크게 검출됐습니다. 머리·어깨·몸통 비율을 확인한 뒤 승인해주세요.");
    return { policy: ANATOMY_POLICY, state: ratios.length !== expected ? "unmeasured" : issues.length ? "review" : "measured",
        faceHeightRatios: ratios.map(r => Math.round(r * 10000) / 10000), issues };
}

export async function checkStudioFaceScale(bytes: Buffer, options: StudioOptions): Promise<StudioFramingReview> {
    return (await analyzeStudioAnatomy(bytes, options)).review;
}

type FaceBox = { x: number; y: number; width: number; height: number };
export function initialHeadBalance(boxes: FaceBox[], width: number, height: number, options: StudioOptions, policy: StudioHeadBalancePolicy = HEAD_BALANCE_POLICY): StudioProportion[] {
    if (boxes.length !== (options.subjectCount || 1) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
    const regions: StudioProportion[] = [];
    for (const box of boxes) {
        if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width < 60 || box.height < 60) return [];
        const limit = options.scene === "forbes" ? 0.125 : 0.078;
        const ratio = box.height / height;
        // Ambiguous close-ups are review-only. Never force them into a full-figure target.
        if (ratio > (options.scene === "forbes" ? 0.20 : 0.14)) return [];
        const rw = box.width * 3 / width, rh = box.height * 3 / height;
        const x = (box.x + box.width / 2) / width - rw / 2;
        const y = (box.y + box.height * 0.32) / height - rh / 2;
        // A complete feathering boundary is required; clipped heads cannot be balanced safely.
        if (x < 0 || y < 0 || x + rw > 1 || y + rh > 1) return [];
        // Frozen v1 jobs retain their original finish; new shoots use the owner's fixed 4% reduction.
        const reducedScale = policy === "gentle-head-balance-v1" ? Math.max(90, Math.min(98, Math.round((options.scene === "forbes" ? 0.115 : 0.074) / ratio * 100))) : 96;
        const scale = ratio > limit ? reducedScale : 100;
        regions.push({ kind: "head", x, y, width: rw, height: rh, scaleX: scale, scaleY: scale });
    }
    if (regions.some((a, i) => regions.some((b, j) => i !== j && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height))) return [];
    return regions.filter(r => r.scaleX !== 100);
}

export async function analyzeStudioAnatomy(bytes: Buffer, options: StudioOptions, policy: StudioHeadBalancePolicy = HEAD_BALANCE_POLICY): Promise<{ review: StudioFramingReview; proportions: StudioProportion[] }> {
    try {
        const { boxes, width, height } = await detectReferenceFaces(bytes);
        return { review: reviewFaceScale(boxes.map(b => b.height / height), options.subjectCount || 1, options.scene === "forbes"), proportions: initialHeadBalance(boxes, width, height, options, policy) };
    } catch {
        return { review: reviewFaceScale([], options.subjectCount || 1, options.scene === "forbes"), proportions: [] };
    }
}
