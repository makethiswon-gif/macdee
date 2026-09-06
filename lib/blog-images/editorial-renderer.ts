import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D, type Image } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { safeBrandColor } from "../brand-visual";
import type { Infographic } from "./infographic";
import { CARD_LABELS, CARD_PLACEMENTS, type BlogCardType, type BlogImageCard, type EditorialCopy, type EditorialProfile } from "./card-types";

// No browser CSS, remote fonts, screenshots, randomized image bans or generated HTML.
const W = 1024;
const PAD = 72;
const INNER = W - PAD * 2;
const PAPER = "#F6F4EF";
const INK = "#202A32";
const MUTED = "#56616B";
const LINE = "#D8DCD9";
const REGULAR = "BlogEditorialRegular";
const BOLD = "BlogEditorialBold";
let fontsReady = false;

function ensureFonts() {
    if (fontsReady) return;
    // Explicit paths are also included in Next's server output tracing.
    for (const [file, name] of [
        ["noto-sans-kr-korean-400-normal.woff2", REGULAR],
        ["noto-sans-kr-korean-700-normal.woff2", BOLD],
    ]) {
        const key = GlobalFonts.register(readFileSync(join(process.cwd(), "public", "fonts", file)), name);
        if (!key) throw new Error("한글 서체를 불러오지 못했습니다. 서버의 public/fonts 배포를 확인해 주세요.");
    }
    fontsReady = true;
}

function font(ctx: SKRSContext2D, size: number, bold = false) {
    ctx.font = `${size}px "${bold ? BOLD : REGULAR}", sans-serif`;
    ctx.textBaseline = "top";
}

/** Measured wrapping preserves the entire Korean sentence, including punctuation. */
export function wrapText(ctx: SKRSContext2D, text: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/)) {
        let line = "";
        for (const char of Array.from(paragraph)) {
            if (line && ctx.measureText(line + char).width > width) {
                const split = line.lastIndexOf(" ");
                if (split > line.length * 0.45) {
                    lines.push(line.slice(0, split));
                    line = line.slice(split + 1) + char;
                } else {
                    lines.push(line.trimEnd());
                    line = char.trimStart();
                }
            } else line += char;
        }
        if (line || !paragraph) lines.push(line.trimEnd());
    }
    return lines;
}

function textHeight(ctx: SKRSContext2D, text: string, width: number, size: number, bold = false) {
    font(ctx, size, bold);
    return wrapText(ctx, text, width).length * Math.ceil(size * 1.48);
}

function write(ctx: SKRSContext2D, text: string, x: number, y: number, width: number, size: number, color = INK, bold = false) {
    font(ctx, size, bold);
    ctx.fillStyle = color;
    const lines = wrapText(ctx, text, width);
    const leading = Math.ceil(size * 1.48);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * leading));
    return lines.length * leading;
}

function mix(hex: string, target: number, ratio: number) {
    const parts = hex.slice(1).match(/../g)!.map((p) => Math.round(parseInt(p, 16) * (1 - ratio) + target * ratio));
    return `#${parts.map((p) => p.toString(16).padStart(2, "0")).join("")}`;
}

function rule(ctx: SKRSContext2D, x: number, y: number, width: number, color = LINE) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, 2);
}

function picture(ctx: SKRSContext2D, img: Image, x: number, y: number, w: number, h: number, fit: "cover" | "contain" = "cover") {
    const scale = fit === "cover" ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    ctx.restore();
}

const MAX_ASSET_BYTES = 6 * 1024 * 1024;

/** Only stored, public brand assets may be fetched. Never fetch arbitrary client URLs. */
export async function readBrandAsset(source: string): Promise<Buffer> {
    let bytes: Buffer;
    if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(source)) {
        const b64 = source.slice(source.indexOf(",") + 1);
        if (b64.length > MAX_ASSET_BYTES * 1.4 || !/^[A-Za-z0-9+/=\r\n]+$/.test(b64)) throw new Error("이미지 파일 형식 또는 용량을 확인해 주세요.");
        bytes = Buffer.from(b64, "base64");
    } else {
        const url = new URL(source);
        const storage = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const allowed = storage && url.origin === new URL(storage).origin && url.pathname.startsWith("/storage/v1/object/public/");
        if (!allowed || url.protocol !== "https:" || url.username || url.password) {
            throw new Error("프로필 관리에서 사진을 다시 업로드해 주세요. 공개 저장소 이미지와 업로드 파일만 사용할 수 있습니다.");
        }
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error", cache: "no-store" });
        if (!res.ok || !res.body) throw new Error("등록된 이미지 파일을 불러오지 못했습니다.");
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                length += value.length;
                if (length > MAX_ASSET_BYTES) throw new Error("등록된 이미지가 너무 큽니다.");
                chunks.push(value);
            }
        } finally { await reader.cancel(); }
        bytes = Buffer.concat(chunks);
    }
    if (!bytes.length || bytes.length > MAX_ASSET_BYTES) throw new Error("등록된 이미지 용량을 확인해 주세요.");
    // Decode and bound size before native canvas sees an image (no SVG or decompression bombs).
    const sourceImage = sharp(bytes, { limitInputPixels: 24_000_000 });
    const meta = await sourceImage.metadata();
    if (!meta.format || !["png", "jpeg", "webp"].includes(meta.format)) throw new Error("PNG, JPG, WebP 이미지만 사용할 수 있습니다.");
    return sourceImage.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

export interface RenderEditorialOptions {
    type: BlogCardType;
    profile: EditorialProfile;
    copy: EditorialCopy;
    infographic?: Infographic;
    photo?: Buffer;
    photoLabel?: string;
    model?: string;
    warnings?: string[];
}

function infoRows(info: Infographic) {
    switch (info.kind) {
        case "flow": return info.steps.map((s, i) => ({ key: String(i + 1).padStart(2, "0"), title: s.label, note: s.note || "" }));
        case "timeline": return info.events.map((s) => ({ key: s.when, title: s.label, note: s.note || "" }));
        case "checklist": return info.items.map((s, i) => ({ key: String(i + 1).padStart(2, "0"), title: s.label, note: s.note || "" }));
        case "tiers": return info.tiers.map((s) => ({ key: s.range, title: s.label, note: "" }));
        case "compare": return [];
    }
}

/** Returns a complete opaque PNG; the client never re-renders Korean type or assets. */
export async function renderEditorialCard(opts: RenderEditorialOptions): Promise<BlogImageCard> {
    ensureFonts();
    const { type, profile, copy, infographic } = opts;
    const warnings = [...(opts.warnings || [])];
    const color = safeBrandColor(profile.brandColor);
    const dark = mix(color, 0, 0.6);
    const pale = mix(color, 255, 0.94);
    const measure = createCanvas(W, 1).getContext("2d");
    const headingSize = type === "thumbnail" ? (copy.heading.length > 38 ? 58 : 68) : 54;
    const headingHeight = textHeight(measure, copy.heading, INNER, headingSize, true);
    const headerHeight = 152 + headingHeight;
    // Some model PNGs decode in libvips but not native canvas ("Invalid SVG image").
    // Normalise the container and colour space before compositing; never bill a retry for this.
    const photo = opts.photo ? await loadImage(await sharp(opts.photo, { limitInputPixels: 24_000_000 })
        .rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).toColourspace("srgb").png().toBuffer()) : null;
    if ((type === "thumbnail" || type === "illustration") && !photo) throw new Error("사진 생성에 실패했습니다. 배경 없는 카드로 대체하지 않았습니다.");

    const loadOptional = async (url: string, label: string) => {
        if (!url) return null;
        try { return await loadImage(await readBrandAsset(url)); }
        catch { warnings.push(`${label}을 불러오지 못했습니다. 프로필 관리에서 파일을 확인해 주세요.`); return null; }
    };
    const [logo, portrait] = await Promise.all([
        loadOptional(profile.logoImage, "로고"),
        type === "contact" ? loadOptional(profile.profileImages[0] || "", "변호사 사진") : Promise.resolve(null),
    ]);
    if (type === "info" && !infographic) throw new Error("정보 카드에 원문에서 추출한 내용이 없습니다.");
    const brandLabel = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const footerHeight = Math.max(112, textHeight(measure, brandLabel, logo ? INNER - 258 : INNER, 23) + 62);
    const photoLabel = opts.photoLabel || "내용 이해를 위한 AI 자료사진";
    const thumbnailTitleY = 520 + textHeight(measure, profile.officeName || "법률 이야기", INNER, 25) + 26;

    const rowData = infographic ? infoRows(infographic) : [];
    const keyWidth = infographic && ["timeline", "tiers"].includes(infographic.kind) ? 216 : 70;
    const rowWidth = INNER - keyWidth - 28;
    const rowHeights = rowData.map((r) => Math.max(textHeight(measure, r.key, keyWidth, 30, true),
        textHeight(measure, r.title, rowWidth, 36, true) + (r.note ? 12 + textHeight(measure, r.note, rowWidth, 30) : 0)) + 48);
    const compareWidths = [176, 314, 314];
    const compareHeights = infographic?.kind === "compare" ? infographic.rows.map((r) =>
        Math.max(...[r.aspect, r.a, r.b].map((s, i) => textHeight(measure, s, compareWidths[i], 30, i === 0))) + 44) : [];
    const compareHeadHeight = infographic?.kind === "compare" ? Math.max(
        textHeight(measure, infographic.leftLabel, compareWidths[1], 32, true),
        textHeight(measure, infographic.rightLabel, compareWidths[2], 32, true)) + 36 : 0;
    const pointsHeights = copy.points.map((p) => textHeight(measure, p, INNER - 70, 36) + 42);
    const contactTextWidth = INNER - (portrait ? 184 : 0);
    const role = profile.jobTitle || "변호사";
    const person = profile.lawyerName.endsWith(role) ? profile.lawyerName : `${profile.lawyerName} ${role}`;
    const contactLines = [profile.officeName, person, profile.phone, profile.website].filter(Boolean);
    const contactHeight = Math.max(portrait ? 184 : 0, contactLines.reduce((sum, s, i) => sum + textHeight(measure, s, contactTextWidth, i === 1 ? 36 : 27, i === 1) + 10, 0));
    let H: number;
    if (type === "thumbnail") H = Math.max(1024, thumbnailTitleY + headingHeight + footerHeight + 88);
    else if (type === "illustration") H = 790;
    else if (type === "contact") H = Math.max(1024, headerHeight + pointsHeights.reduce((a, b) => a + b, 0) + contactHeight + 214);
    else H = Math.max(940, headerHeight + rowHeights.reduce((a, b) => a + b, 0) + compareHeights.reduce((a, b) => a + b, 0) + compareHeadHeight + footerHeight + 36);
    H = Math.ceil(H);
    if (H > 2300) throw new Error("정보가 한 장에 너무 많습니다. 원고에서 정리할 부분을 줄여 다시 생성해 주세요.");
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

    const brandFooter = (y: number) => {
        rule(ctx, PAD, y, INNER);
        if (logo) {
            // Preserve official logo colours and aspect ratio on an opaque white plate.
            ctx.fillStyle = "#FFFFFF"; ctx.fillRect(PAD, y + 20, 230, 66);
            picture(ctx, logo, PAD + 12, y + 28, 206, 48, "contain");
        }
        write(ctx, brandLabel, logo ? PAD + 258 : PAD, y + 28, logo ? INNER - 258 : INNER, 23, MUTED);
    };

    if (type === "thumbnail") {
        picture(ctx, photo!, 0, 0, W, 472);
        ctx.fillStyle = dark; ctx.fillRect(0, 472, W, H - 472);
        write(ctx, profile.officeName || "법률 이야기", PAD, 520, INNER, 25, "#DCE4E9");
        write(ctx, copy.heading, PAD, thumbnailTitleY, INNER, headingSize, "#FFFFFF", true);
        ctx.fillStyle = PAPER; ctx.fillRect(0, H - footerHeight - 44, W, footerHeight + 44);
        // Keep even the caption off the photograph, legible on a solid surface.
        write(ctx, photoLabel, PAD, H - footerHeight - 32, INNER, 18, MUTED);
        brandFooter(H - footerHeight);
    } else if (type === "illustration") {
        picture(ctx, photo!, 0, 0, W, 650);
        write(ctx, opts.photoLabel || "내용 이해를 위한 AI 자료사진", PAD, 674, INNER, 22, MUTED);
        write(ctx, profile.officeName || profile.lawyerName, PAD, 716, INNER, 24, INK, true);
    } else {
        ctx.fillStyle = pale; ctx.fillRect(0, 0, W, headerHeight - 20);
        write(ctx, type === "info" ? "본문에서 짚어볼 내용" : "읽고 나서, 기억할 것", PAD, 56, INNER, 25, dark, true);
        if (type === "contact" && logo) {
            ctx.fillStyle = "#FFFFFF"; ctx.fillRect(W - PAD - 230, 35, 230, 58);
            picture(ctx, logo, W - PAD - 218, 41, 206, 46, "contain");
        }
        write(ctx, copy.heading, PAD, 110, INNER, headingSize, INK, true);
        let y = headerHeight;
        if (type === "contact") {
            copy.points.forEach((p, i) => {
                write(ctx, String(i + 1).padStart(2, "0"), PAD, y + 4, 52, 27, dark, true);
                write(ctx, p, PAD + 70, y, INNER - 70, 36);
                y += pointsHeights[i];
                rule(ctx, PAD, y - 20, INNER);
            });
            const bandY = Math.max(y + 16, H - contactHeight - 164);
            ctx.fillStyle = dark; ctx.fillRect(0, bandY, W, H - bandY);
            let lineY = bandY + 44;
            if (portrait) {
                ctx.fillStyle = "#FFFFFF"; ctx.fillRect(PAD, lineY, 146, 184);
                picture(ctx, portrait, PAD, lineY, 146, 184, "contain");
            }
            const x = PAD + (portrait ? 184 : 0);
            contactLines.forEach((s, i) => {
                lineY += write(ctx, s, x, lineY, contactTextWidth, i === 1 ? 36 : 27, "#FFFFFF", i === 1) + 10;
            });
            write(ctx, "구체적인 판단은 사실관계에 따라 달라질 수 있습니다.", PAD, H - 63, INNER, 22, "#DCE4E9");
        } else if (infographic?.kind === "compare") {
            const xs = [PAD, PAD + 208, PAD + 554];
            ctx.fillStyle = dark; ctx.fillRect(PAD - 20, y, INNER + 40, compareHeadHeight);
            ["구분", infographic.leftLabel, infographic.rightLabel].forEach((s, i) => write(ctx, s, xs[i], y + 18, compareWidths[i], 32, "#FFFFFF", true));
            y += compareHeadHeight;
            infographic.rows.forEach((r, i) => {
                if (i % 2 === 0) { ctx.fillStyle = pale; ctx.fillRect(PAD - 20, y, INNER + 40, compareHeights[i]); }
                [r.aspect, r.a, r.b].forEach((s, k) => write(ctx, s, xs[k], y + 22, compareWidths[k], 30, INK, k === 0));
                y += compareHeights[i];
                rule(ctx, PAD - 20, y, INNER + 40);
            });
            brandFooter(H - footerHeight);
        } else {
            rowData.forEach((r, i) => {
                write(ctx, r.key, PAD, y + 24, keyWidth, 30, dark, true);
                const used = write(ctx, r.title, PAD + keyWidth + 28, y + 24, rowWidth, 36, INK, true);
                if (r.note) write(ctx, r.note, PAD + keyWidth + 28, y + 36 + used, rowWidth, 30, MUTED);
                y += rowHeights[i];
                rule(ctx, PAD, y, INNER);
            });
            brandFooter(H - footerHeight);
        }
    }

    // Compress without browser re-capture; keep the single-image upload below 4.5 MB.
    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: PAPER }).png({ compressionLevel: 9 }).toBuffer();
    if (png.length > 2_500_000) png = await sharp(png).png({ palette: true, colours: 256, dither: 0.6 }).toBuffer();
    if (png.length > 2_500_000) throw new Error("완성 이미지 용량이 너무 큽니다. 사진을 줄여 다시 생성해 주세요.");
    return {
        type, name: CARD_LABELS[type], imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
        width: W, height: H, altText: copy.heading, placement: CARD_PLACEMENTS[type],
        model: opts.model, warnings, designVersion: "editorial-v6",
    };
}
