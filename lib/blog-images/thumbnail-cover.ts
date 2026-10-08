import type { SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { magazineLines, rect, setType, type MagazineFace } from "./magazine-design";
import { contrastRatio, luminance } from "./text-contrast";
import { profileEdition } from "./profile-editions";
import type { EditorialProfile } from "./card-types";
import type { ThumbnailStyle } from "./thumbnail-copy";

/**
 * 블로그 썸네일(1번 카드) 조판. 2026-10-08 대표 결정 "A와 B 변호사별로 적용".
 * A(band) = 사진 위 64% + 아래 짙은 띠에 흰 제목. B(fullbleed) = 전면 사진 + 위쪽 그라데이션 위 흰 제목.
 * 예전 포스터 조판은 제목 색을 로고 색에서 가져와 어두운 사진 위에서 묻혔고, 정렬·행 들여쓰기가 글마다 달랐다.
 * 이제 제목은 흰색·왼쪽 정렬·최대 3행으로 고정하고, 사무소 색은 분야 표제의 작은 막대에만 쓴다.
 */
export { THUMBNAIL_STYLE_LABELS, COVER_HEADING_RULE, coverArtDirection, coverBriefGuide, type CoverFrame, type ThumbnailStyle } from "./thumbnail-copy";

const W = 1200, H = 1200, M = 72, LEADING = 1.2;
/** A의 사진 높이(설계 단위). 사진 64%, 띠 36%. */
export const BAND_TOP = 768;
const BAND = "#141414", WHITE = "#FFFFFF", FALLBACK_ACCENT = "#E8B86D";
type Box = { x: number; y: number; w: number; h: number };

/** 변호사별 고정 조판(PROFILE_EDITIONS.thumbnail). 지정이 없는 변호사는 ID로 정해 늘 같은 쪽을 쓴다. */
export function thumbnailStyle(profile: Pick<EditorialProfile, "id" | "lawyerName" | "officeName">): ThumbnailStyle {
    const assigned = profileEdition(profile)?.thumbnail;
    if (assigned) return assigned;
    return parseInt(createHash("sha256").update(`thumbnail-style:${profile.id}`).digest("hex").slice(0, 8), 16) % 2 ? "band" : "fullbleed";
}
export const coverFrame = (style: ThumbnailStyle): "cover-band" | "cover-fullbleed" => style === "band" ? "cover-band" : "cover-fullbleed";

/**
 * 사진 연출(빛·시점)을 글마다 돌려 쓴다. 예전에는 거의 모든 표지가 해 질 녘 낮은 햇빛·긴 그림자·바닥의 물건 하나였다.
 * 같은 원고는 늘 같은 연출(재생성해도 결과 방향이 같다). 해 질 녘은 일곱 가지 중 하나로만 남긴다.
 */
export const PHOTO_LOOKS = [
    { id: "overcast", text: "Soft overcast daylight through a large window: no direct sun and no hard cast shadows, gentle even tones, neutral-cool white balance." },
    { id: "blue-hour", text: "Blue hour just after sunset: cool ambient sky light mixed with one or two warm practical lamps, no sun in frame, calm low contrast." },
    { id: "top-down", text: "Overhead top-down view onto a single matte surface in a muted colour, soft diffused light, a graphic arrangement with generous clean surface." },
    { id: "studio", text: "Studio still life on a seamless muted-colour paper backdrop, large soft-box light, minimal soft shadow, a clean modern editorial look." },
    { id: "documentary", text: "Candid documentary moment: an anonymous person seen from behind or only their hands (no face), natural indoor light, shallow depth of field." },
    { id: "evening-interior", text: "Evening interior lit by warm practical lamps, deep but readable shadows, quiet and calm, no sunset light." },
    { id: "golden", text: "Late-afternoon sun with long soft shadows." },
] as const;
export type PhotoLook = (typeof PHOTO_LOOKS)[number];
export function photoLook(sourceHash: string): PhotoLook {
    return PHOTO_LOOKS[parseInt(createHash("sha256").update(`photo-look:${sourceHash}`).digest("hex").slice(0, 8), 16) % PHOTO_LOOKS.length];
}

/** 시리즈 톤 통일: 채도를 조금 낮추고 대비를 살짝 올린다(색 보정만, 모델 호출 없음). */
export async function gradeCoverArt(bytes: Buffer): Promise<Buffer> {
    return sharp(bytes, { limitInputPixels: 24_000_000 }).rotate().modulate({ saturation: 0.88 }).linear(1.05, -6).png().toBuffer();
}

const hex = (rgb: number[]) => "#" + rgb.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase();
/** 사무소 색이 짙은 띠·그라데이션 위에서 안 보이면 같은 색상 계열로 밝힌다(막대에만 쓰므로 3:1 기준). */
export function visibleAccent(color?: string): string {
    let rgb = (/^#[\da-f]{6}$/i.test(color || "") ? color! : FALLBACK_ACCENT).slice(1).match(/../g)!.map(p => parseInt(p, 16));
    for (let k = 0; k < 10 && contrastRatio(luminance(hex(rgb)), luminance(BAND)) < 3; k++) rgb = rgb.map(v => Math.round(v + (255 - v) * 0.2));
    return hex(rgb);
}
/** 제목에서 마지막 마침표를 떼고 행을 정리한다(물음표·느낌표는 둔다). */
export function coverHeading(heading: string): string {
    return heading.split("\n").map(line => line.trim()).filter(Boolean).join("\n").replace(/[.。]$/, "");
}
function fitHeadline(c: SKRSContext2D, heading: string, width: number, maxH: number, maxSize: number, minSize: number) {
    const authored = heading.split("\n").filter(Boolean);
    for (let size = maxSize; ; size -= 2) {
        setType(c, size, "sans");
        // 작성자가 나눈 두 행을 우선 지키고, 넘칠 때만 단어 단위로 다시 나눈다.
        const lines = authored.length > 1 && authored.length <= 3 && authored.every(line => c.measureText(line).width <= width)
            ? authored : magazineLines(c, heading.replace(/\n/g, " "), width);
        const h = lines.length * size * LEADING;
        if ((h <= maxH && lines.length <= 3) || size <= minSize) return { size, lines, h, fits: h <= maxH + 1 && lines.length <= 3 };
    }
}
function paintLines(c: SKRSContext2D, lines: string[], x: number, y: number, size: number, boxes: Box[]) {
    setType(c, size, "sans");
    c.fillStyle = WHITE;
    lines.forEach((line, i) => c.fillText(line, x, y + i * size * LEADING));
    boxes.push({ x, y, w: Math.max(...lines.map(line => c.measureText(line).width)), h: lines.length * size * LEADING });
}
function kickerLabel(c: SKRSContext2D, kicker: string, x: number, y: number, accent: string, boxes: Box[]) {
    const size = 28, face: MagazineFace = "label";
    setType(c, size, face);
    let text = kicker.trim();
    while (text.length > 2 && c.measureText(text).width > W - 2 * M - 22) text = text.slice(0, -1);
    rect(c, x, y + 2, 6, size, accent);
    c.fillStyle = WHITE; c.fillText(text, x + 20, y);
    boxes.push({ x, y, w: 20 + c.measureText(text).width, h: size + 4 });
    return y + size + 4;
}
function brandLine(c: SKRSContext2D, brand: string, x: number, y: number, size: number, face: MagazineFace, color: string, boxes: Box[]) {
    setType(c, size, face);
    let text = brand.trim();
    while (text.length > 2 && c.measureText(text).width > W - 2 * M) text = text.slice(0, -1);
    c.fillStyle = color; c.fillText(text, x, y);
    boxes.push({ x, y, w: c.measureText(text).width, h: size * 1.2 });
    return c.measureText(text).width;
}
/** 흰 제목 아래의 사진 밝기를 재서, 대비가 4.5:1에 못 미치면 그 영역만 더 어둡게 덮는다. */
function protectZone(c: SKRSContext2D, zone: Box) {
    const s = c.canvas.width / W;
    const contrastAt = () => {
        const left = Math.max(0, Math.floor(zone.x * s)), top = Math.max(0, Math.floor(zone.y * s));
        const w = Math.min(c.canvas.width - left, Math.ceil(zone.w * s)), h = Math.min(c.canvas.height - top, Math.ceil(zone.h * s));
        const pixels = c.getImageData(left, top, w, h).data, values: number[] = [];
        const stride = Math.max(4, Math.floor(pixels.length / 4 / 2500) * 4);
        for (let i = 0; i < pixels.length; i += stride) {
            const lin = [pixels[i], pixels[i + 1], pixels[i + 2]].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
            values.push(contrastRatio(1, lin[0] * .2126 + lin[1] * .7152 + lin[2] * .0722));
        }
        values.sort((a, b) => a - b);
        return values[Math.floor(values.length * .1)] || 21;
    };
    let ratio = contrastAt(), steps = 0;
    while (ratio < 4.5 && steps < 6) {
        const g = c.createLinearGradient(0, 0, 0, zone.y + zone.h + 90);
        g.addColorStop(0, "rgba(0,0,0,.2)"); g.addColorStop(.8, "rgba(0,0,0,.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, zone.y + zone.h + 90);
        ratio = contrastAt(); steps++;
    }
    return { ratio, steps };
}

export function drawThumbnailCover(c: SKRSContext2D, input: { style: ThumbnailStyle; heading: string; kicker?: string; brand: string; accent?: string }) {
    const boxes: Box[] = [], issues: string[] = [];
    const accent = visibleAccent(input.accent), heading = coverHeading(input.heading), width = W - 2 * M;
    let contrast = 21;
    c.save();
    if (input.style === "band") {
        rect(c, 0, BAND_TOP, W, H - BAND_TOP, BAND);
        let y = BAND_TOP + 46;
        if (input.kicker?.trim()) y = kickerLabel(c, input.kicker, M, y, accent, boxes) + 26;
        const brandSize = 24, brandY = H - 46 - brandSize;
        const fit = fitHeadline(c, heading, width, brandY - 24 - y, 98, 58);
        paintLines(c, fit.lines, M, y, fit.size, boxes);
        if (!fit.fits) issues.push("제목이 썸네일 띠에 맞지 않습니다. 의미를 유지해 제목을 줄여주세요.");
        brandLine(c, input.brand, M, brandY, brandSize, "body", "rgba(255,255,255,0.72)", boxes);
    } else {
        const g = c.createLinearGradient(0, 0, 0, H * 0.62);
        g.addColorStop(0, "rgba(0,0,0,0.78)"); g.addColorStop(0.55, "rgba(0,0,0,0.42)"); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.fillRect(0, 0, W, H * 0.62);
        let y = 80;
        if (input.kicker?.trim()) y = kickerLabel(c, input.kicker, M, y, accent, boxes) + 28;
        const fit = fitHeadline(c, heading, width, 600 - y, 124, 60); // B는 위쪽이 넓어 제목을 더 크게(휴대폰 목록에서 읽히게)
        // 글자를 칠하기 전에 제목 영역의 대비를 보장한다.
        setType(c, fit.size, "sans");
        const zoneW = Math.max(...fit.lines.map(line => c.measureText(line).width));
        contrast = protectZone(c, { x: M, y, w: zoneW, h: fit.h }).ratio;
        if (input.kicker?.trim()) { boxes.length = 0; kickerLabel(c, input.kicker, M, 80, accent, boxes); } // 덮개 위에 표제를 다시 선명하게
        paintLines(c, fit.lines, M, y, fit.size, boxes);
        if (!fit.fits) issues.push("제목이 썸네일 위쪽 영역에 맞지 않습니다. 의미를 유지해 제목을 줄여주세요.");
        if (contrast < 4.5) issues.push("제목 뒤 사진이 너무 밝아 대비가 부족합니다. 다른 장면으로 다시 만들어주세요.");
        setType(c, 24, "label");
        const labelW = c.measureText(input.brand.trim()).width;
        rect(c, M - 16, H - 104, Math.min(width + 32, labelW + 32), 50, "rgba(0,0,0,0.55)");
        brandLine(c, input.brand, M, H - 92, 24, "label", WHITE, boxes);
    }
    c.restore();
    return { boxes, issues, contrast: Number(contrast.toFixed(2)) };
}
