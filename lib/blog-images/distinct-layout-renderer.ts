import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { prepareMagazineLogo } from "./logo-compositor";
import { magazineFonts, MAGAZINE_PALETTES, type as drawType, typeHeight, fitTitle, rect, rule, type MagazineFace } from "./magazine-design";
import { getMagazineIdentity } from "./magazine-identity";
import { BLOG_LAYOUT_REVISION, CARD_LABELS, type BlogImageCard } from "./card-types";
import { contactActions, contactReadiness } from "./contact-details";
import { ContactProfileError } from "./contact-renderer";
import { cardPlacement } from "./visual-plan-types";
import type { BriefRenderOptions } from "./brief-renderer";

const W = 1024, P = 64, INNER = W - 2 * P;

/** Separate geometric systems, not palette variants of the same template. */
export async function renderDistinctCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    magazineFonts();
    const { card, profile } = opts, identity = getMagazineIdentity(profile);
    const modern = opts.plan.version === "visual-plan-v11";
    const family = modern ? identity.family : identity.family === "atlas" || identity.family === "poster" ? "atlas"
        : identity.family === "ledger" || identity.family === "journal" ? "ledger" : "dossier";
    const base = MAGAZINE_PALETTES[identity.palette];
    const dark = (opts.style || identity.style) === "contrast";
    const p = dark ? { ...base, ink: base.paper, paper: base.ink, muted: "#CCD1D1", field: base.accent } : base;
    const face: MagazineFace = identity.typography;
    const measure = createCanvas(W, 1).getContext("2d");
    const commands: ((c: SKRSContext2D) => void)[] = [];
    const warnings: string[] = [];
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const text = (s: string, x: number, y: number, w: number, size = 42, color: string = p.ink, f: MagazineFace = "body", centered = false, leading = 1.48) => {
        const h = typeHeight(measure, s, w, size, f, leading);
        if (s) boxes.push({ x, y, w, h });
        commands.push((c) => { c.textAlign = centered ? "center" : "left"; drawType(c, s, centered ? x + w / 2 : x, y, w, size, color, f, leading); c.textAlign = "left"; });
        return h;
    };
    const line = (x: number, y: number, w: number) => commands.push((c) => rule(c, x, y, w, `${p.ink}55`));
    const block = (x: number, y: number, w: number, h: number, color: string) => commands.push((c) => rect(c, x, y, w, h, color));
    const picture = (art: Image, x: number, y: number, w: number, h: number, contain = false) => commands.push((c) => d.picture(c, art, x, y, w, h, contain ? "contain" : "cover"));
    const title = (s: string, x: number, y: number, w: number, maxH: number, size = 74, centered = false, color: string = p.ink) => {
        const fitted = fitTitle(measure, s, w, opts.repairLayout ? 1200 : Math.max(maxH, 640), size, face);
        return text(fitted.text, x, y, w, fitted.size, color, face, centered, 1.28);
    };
    const decode = async (bytes: Buffer) => loadImage(await sharp(bytes, { limitInputPixels: 24_000_000 }).rotate().png().toBuffer());
    const heading = opts.headingOverride?.trim() || card.heading;
    const plannedHeadline = card.headlineLines?.join("\n");
    const headline = !opts.headingOverride && plannedHeadline?.replace(/\s/g, "") === heading.replace(/\s/g, "") ? plannedHeadline : heading;
    if (heading.length > 70) throw new Error("이미지 제목은 70자 이내로 입력해주세요.");
    if (opts.headingOverride && opts.headingOverride !== card.heading) warnings.push("수정한 제목과 원문의 일치 여부를 확인해주세요.");
    let y = P;
    const brand = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const actions = card.type === "contact" ? contactActions(profile) : [];

    if ((card.type === "thumbnail" || card.type === "illustration") && !card.infographic) {
        if (!opts.art) throw new Error("원고 시각물이 없습니다.");
        const art = await decode(opts.art);
        const centered = family === "poster" && !opts.repairLayout;
        const imageFirst = family === "atlas" && !opts.repairLayout;
        const fullBleed = ["atlas", "poster", "dossier"].includes(family) && !opts.repairLayout;
        const artX = fullBleed ? 0 : P, artW = fullBleed ? W : INNER;
        // Follow the artwork's ratio instead of letterboxing a landscape into a tall half-column.
        const artH = Math.round(artW * art.height / art.width);
        const plate = () => { picture(art, artX, y, artW, artH, true); y += artH + 40; };
        if (imageFirst) { y = 0; plate(); }
        if (family === "journal" && !opts.repairLayout) { line(P, y, INNER); y += 28; }
        if (card.kicker) y += text(card.kicker, P, y, INNER, 28, p.muted, "label", centered) + 24;
        const titleX = family === "column" ? P + 48 : P;
        const titleW = W - titleX - P;
        const headStart = y;
        if (family === "dossier" && !opts.repairLayout) {
            const h = typeHeight(measure, headline, INNER, 72, face, 1.28);
            block(0, y - 16, W, h + 80, base.ink);
            y += title(headline, P, y + 20, INNER, 640, 72, false, "#FFFFFF") + 96;
        } else y += title(headline, titleX, y, titleW, 640, family === "poster" ? 88 : 76, centered) + 32;
        if (family === "column") block(P, headStart + 8, 3, y - headStart - 40, p.field);
        if (family === "ledger") { line(P, y, INNER); y += 32; }
        if (!imageFirst) plate();
        if (card.deck) y += text(card.deck, P, y, INNER, 42, p.ink, "body", centered) + 16;
        if (opts.artLabel) y += text(opts.artLabel, P, y + 10, INNER, 24, p.muted) + 30;
    } else if (card.infographic) {
        const info = card.infographic;
        if (!info) throw new Error("정보 그래픽의 근거 데이터가 없습니다.");
        const headerX = P;
        if (card.kicker) y += text(card.kicker, headerX, y, W - headerX - P, 26, p.muted, "sans") + 24;
        y += title(heading, headerX, y, W - headerX - P, 380, family === "dossier" ? 68 : 76, family === "atlas") + 26;
        if (card.deck) y += text(card.deck, headerX, y, W - headerX - P, 42) + 26;
        y += 26;
        if (info.kind === "compare") {
            const gap = 40, cellW = (INNER - gap) / 2, x1 = P, x2 = P + cellW + gap;
            const labelH = Math.max(typeHeight(measure, info.leftLabel, cellW - 48, 38, "label", 1.48), typeHeight(measure, info.rightLabel, cellW - 48, 38, "label", 1.48));
            block(x1, y, cellW, labelH + 40, base.ink);
            block(x2, y, cellW, labelH + 40, dark ? "#FFFFFF18" : "#EFF2F3");
            text(info.leftLabel, x1 + 24, y + 20, cellW - 48, 38, "#FFFFFF", "label");
            text(info.rightLabel, x2 + 24, y + 20, cellW - 48, 38, p.ink, "label");
            y += labelH + 70;
            for (const row of info.rows) {
                line(P, y, INNER); y += 22;
                y += text(row.aspect, P, y, INNER, 30, p.muted, "label") + 14;
                const a = text(row.a, x1, y, cellW, 38), b = text(row.b, x2, y, cellW, 38);
                y += Math.max(a, b) + 32;
            }
        } else {
            const rows = info.kind === "flow" ? info.steps.map((r, i) => ({ ...r, key: String(i + 1) }))
                : info.kind === "timeline" ? info.events.map((r) => ({ ...r, key: r.when }))
                : info.kind === "checklist" ? info.items.map((r, i) => ({ ...r, key: String(i + 1) }))
                : info.tiers.map((r) => ({ label: r.label, note: "", key: r.range }));
            if ((family === "atlas" || family === "poster") && info.kind === "checklist" && !opts.repairLayout && card.treatment !== "guide") {
                const colW = (INNER - 48) / 2;
                for (let i = 0; i < rows.length; i += 2) {
                    let rowH = 0;
                    rows.slice(i, i + 2).forEach((row, col) => {
                        const x = P + col * (colW + 48); line(x, y, colW);
                        let cy = y + 24;
                        block(x, cy + 8, 20, 20, p.field);
                        cy += text(row.label, x + 40, cy, colW - 40, 40, p.ink, "label") + 16;
                        if (row.note) cy += text(row.note, x, cy, colW, 38);
                        rowH = Math.max(rowH, cy - y + 44);
                    });
                    y += rowH;
                }
            } else for (const row of rows) {
                line(P, y, INNER); y += 30;
                if (info.kind === "timeline" || info.kind === "tiers") {
                    y += text(row.key, P, y, INNER, 32, p.muted, "label") + 12;
                    y += text(row.label, P, y, INNER, 44, p.ink, "label") + 14;
                    if (row.note) y += text(row.note, P, y, INNER, 38) + 12;
                    y += 24;
                } else {
                    const keyW = 64;
                    const keyH = text(row.key.padStart(2, "0"), P, y + 6, keyW, 34, p.muted, "label");
                    let cy = y;
                    cy += text(row.label, P + keyW + 24, cy, INNER - keyW - 24, 44, p.ink, "label") + 14;
                    if (row.note) cy += text(row.note, P + keyW + 24, cy, INNER - keyW - 24, 38);
                    y = Math.max(y + keyH + 6, cy) + 32;
                }
            }
        }
    } else {
        const missing = contactReadiness(profile);
        if (missing.length) throw new ContactProfileError(`상담 안내에 필요한 ${missing.join("과 ")}을 등록해주세요.`);
        let portrait: Image;
        try {
            const source = await readBrandAsset(profile.profileImages[0]);
            // Remove only uniform exterior margins. Keep the real portrait and its top edge;
            // a landscape upload canvas must not reduce the person to a tiny full-body cutout.
            const normalized = await sharp(source, { limitInputPixels: 24_000_000 }).rotate().png().toBuffer();
            const trimmed = await sharp(normalized).trim({ threshold: 8 }).png().toBuffer().catch(() => normalized);
            portrait = await decode(await sharp(trimmed).resize(480, 640, { fit: "cover", position: "north" }).png().toBuffer());
        }
        catch { throw new ContactProfileError("등록된 변호사 사진을 읽지 못했습니다."); }
        const claims = (profile.career || []).slice(0, 1);
        const identityText = (x: number, start: number, w: number, centered = false) => {
            let cy = start;
            cy += text(profile.jobTitle || "변호사", x, cy, w, 32, p.muted, "label", centered) + 16;
            cy += title(profile.lawyerName, x, cy, w, 380, 86, centered) + 28;
            if (profile.officeName) cy += text(profile.officeName, x, cy, w, 38, p.ink, "label", centered) + 28;
            for (const claim of claims) cy += text(claim, x, cy, w, 36, p.ink, "body", centered) + 18;
            return cy;
        };
        if (family === "poster") {
            y = identityText(P, y, INNER, true);
            picture(portrait, 302, y, 420, 560, true); y += 596;
        } else if (["ledger", "column", "journal", "atlas"].includes(family)) {
            picture(portrait, P, y, 416, 555, true);
            y = Math.max(y + 555, identityText(524, y + 32, W - 524 - P));
        } else {
            y += text(profile.officeName || "상담 안내", P, y, INNER, 32, p.muted, "label") + 24;
            y += title(`${profile.lawyerName} ${profile.jobTitle || "변호사"}`, P, y, INNER, 380, 74) + 40;
            picture(portrait, P, y, 416, 555, true);
            let cy = y + 16;
            for (const claim of claims) cy += text(claim, 524, cy, W - 524 - P, 36) + 28;
            y = Math.max(y + 555, cy + 32);
        }
        y += 38;
        const contactY = y, backgroundIndex = commands.length;
        y += 32;
        y += text("상담 문의", P, y, INNER, 28, "#FFFFFF", "label") + 18;
        for (const action of actions) {
            const display = action.href.startsWith("http") ? action.display.replace(/^https?:\/\//, "").replace(/\/$/, "") : action.display;
            y += text(display, P, y, INNER, action.href.startsWith("tel:") ? 64 : 32, "#FFFFFF", "label") + 20;
        }
        y += 16;
        const contactHeight = y - contactY;
        commands.splice(backgroundIndex, 0, (c) => rect(c, 0, contactY, W, contactHeight, base.ink));
    }

    y += 42;
    let logo: Image | undefined, lightLogo = false;
    if (profile.logoImage) try {
        const prepared = await prepareMagazineLogo(await readBrandAsset(profile.logoImage));
        logo = await decode(prepared.bytes); lightLogo = prepared.lightInk;
    } catch { warnings.push("등록 로고를 읽지 못해 사무소명을 표시했습니다."); }
    const brandW = logo ? INNER - 240 : INNER;
    const footerH = Math.max(88, typeHeight(measure, brand, brandW, 26, "body", 1.48) + 40);
    const height = Math.ceil(Math.max(760, y + footerH + 34));
    if (height > 7500) throw new Error("지면의 안전한 처리 범위를 초과했습니다. 원문은 보존했고 자동으로 재생성하지 않습니다.");
    if (height > 2500) warnings.push("내용이 긴 지면입니다. 모바일 가독성을 확인한 뒤 필요하면 항목을 편집해주세요.");
    const footerY = height - footerH - 24;
    line(P, footerY, INNER);
    if (logo) {
        block(P, footerY + 12, 206, 70, lightLogo ? base.ink : "#FFFFFF");
        picture(logo, P + 10, footerY + 24, 186, 44, true);
    }
    text(brand, logo ? P + 240 : P, footerY + 26, brandW, 26, p.muted);
    const layoutIssues: string[] = [];
    if (boxes.some((b) => b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > height)) layoutIssues.push("문구 영역이 이미지 경계를 벗어납니다.");
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) layoutIssues.push("문구 영역이 서로 겹칩니다.");
    }
    const outputWidth = modern ? 1200 : W, scale = outputWidth / W;
    const outputHeight = Math.ceil(height * scale);
    const canvas = createCanvas(outputWidth, outputHeight), c = canvas.getContext("2d");
    c.scale(scale, scale);
    rect(c, 0, 0, W, height, dark ? base.ink : "#FFFFFF");
    for (const command of commands) command(c);
    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: "#FFFFFF" }).png({ compressionLevel: 9 }).toBuffer();
    if (!modern && png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256, dither: 0.6 }).toBuffer();
    if (png.length > 16_000_000) throw new Error("이미지 파일의 안전한 처리 범위를 초과했습니다. 원본은 보존했습니다.");
    return { type: card.type, name: CARD_LABELS[card.type], imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: outputWidth, height: outputHeight,
        altText: card.type === "contact" ? `${brand} 상담 안내 · ${actions.map((a) => a.display).join(" / ")}` : [heading, card.deck].filter(Boolean).join(" · "),
        placement: cardPlacement(card, opts.plan.paragraphs), warnings, designVersion: modern ? "editorial-v11" : "editorial-v10", layoutRevision: BLOG_LAYOUT_REVISION, model: opts.model,
        layoutChecks: { passed: !layoutIssues.length, issues: [...new Set(layoutIssues)], textBlocks: boxes.length },
        layout: opts.style || identity.style, sourceParagraphId: card.afterParagraphId, purpose: card.purpose, ...(actions.length ? { contactActions: actions } : {}) };
}
