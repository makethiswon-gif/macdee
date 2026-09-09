import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { prepareMagazineLogo } from "./logo-compositor";
import { magazineFonts, MAGAZINE_PALETTES, type as drawType, typeHeight, fitTitle, rect, rule, type MagazineFace } from "./magazine-design";
import { getMagazineIdentity } from "./magazine-identity";
import { CARD_LABELS, type BlogImageCard } from "./card-types";
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
    const fontSize = (size: number) => modern && size >= 28 ? Math.max(40, size) : size;
    const text = (s: string, x: number, y: number, w: number, size = 32, color: string = p.ink, f: MagazineFace = "body", centered = false) => {
        size = fontSize(size);
        const h = typeHeight(measure, s, w, size, f);
        if (s) boxes.push({ x, y, w, h });
        commands.push((c) => { c.textAlign = centered ? "center" : "left"; drawType(c, s, centered ? x + w / 2 : x, y, w, size, color, f); c.textAlign = "left"; });
        return h;
    };
    const line = (x: number, y: number, w: number) => commands.push((c) => rule(c, x, y, w, `${p.ink}55`));
    const block = (x: number, y: number, w: number, h: number, color: string) => commands.push((c) => rect(c, x, y, w, h, color));
    const picture = (art: Image, x: number, y: number, w: number, h: number, contain = false) => commands.push((c) => d.picture(c, art, x, y, w, h, contain ? "contain" : "cover"));
    const title = (s: string, x: number, y: number, w: number, maxH: number, size = 74, centered = false) => {
        const fitted = fitTitle(measure, s, w, maxH, size, face);
        return text(fitted.text, x, y, w, fitted.size, p.ink, face, centered);
    };
    const decode = async (bytes: Buffer) => loadImage(await sharp(bytes, { limitInputPixels: 24_000_000 }).rotate().png().toBuffer());
    const heading = opts.headingOverride?.trim() || card.heading;
    if (heading.length > 70) throw new Error("이미지 제목은 70자 이내로 입력해주세요.");
    if (opts.headingOverride && opts.headingOverride !== card.heading) warnings.push("수정한 제목과 원문의 일치 여부를 확인해주세요.");
    let y = P;
    const brand = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const actions = card.type === "contact" ? contactActions(profile) : [];

    if ((card.type === "thumbnail" || card.type === "illustration") && !card.infographic) {
        if (!opts.art) throw new Error("원고 시각물이 없습니다.");
        const art = await decode(opts.art);
        if (opts.repairLayout || card.treatment === "guide") {
            y += title(heading, P, y, INNER, 500, 70) + 36;
            picture(art, P, y, INNER, 600, true); y += 644;
            if (card.deck) y += text(card.deck, P, y, INNER, 40) + 24;
        } else if (family === "journal") {
            if (card.kicker) y += text(card.kicker, P, y, INNER, 26, p.muted, "sans", true) + 32;
            y += title(heading, P + 32, y, INNER - 64, 440, 76, true) + 36;
            line(P + 160, y, INNER - 320); y += 36;
            picture(art, P, y, INNER, 560, true); y += 602;
            if (card.deck) y += text(card.deck, P + 32, y, INNER - 64, 40, p.ink, "body", true) + 24;
        } else if (family === "poster") {
            block(0, 0, 24, 800, p.field);
            if (card.kicker) y += text(card.kicker, P, y, INNER, 26, p.muted, "sans") + 28;
            y += title(heading, P, y, INNER, 470, 94) + 38;
            if (card.deck) y += text(card.deck, P, y, INNER - 80, 40) + 32;
            picture(art, 0, y, W, 640, true); y += 676;
        } else if (family === "column") {
            const rail = 180;
            block(P, y, 5, 480, p.field);
            if (card.kicker) text(card.kicker, P + 24, y, rail - 40, 26, p.muted, "sans");
            y += title(heading, P + rail, y, INNER - rail, 550, 76) + 42;
            picture(art, P + rail, y, INNER - rail, 520, true); y += 566;
            if (card.deck) y += text(card.deck, P + rail, y, INNER - rail, 40) + 24;
        } else if (family === "atlas" && card.treatment !== "analysis") {
            picture(art, 0, 0, W, 620, true);
            y = 668;
            if (card.kicker) y += text(card.kicker, P, y, INNER, 26, p.muted, "sans") + 24;
            y += title(heading, P, y, INNER, 410, 80) + 32;
            if (card.deck) y += text(card.deck, P, y, INNER - 80, 32) + 24;
        } else if (family === "ledger" || family === "atlas") {
            const col = 416, photoX = 524;
            picture(art, photoX, 0, W - photoX, 1060, true);
            y = 108;
            if (card.kicker) y += text(card.kicker, P, y, col, 26, p.muted, "sans") + 42;
            y += title(heading, P, y, col, 650, 72) + 48;
            if (card.deck) y += text(card.deck, P, y, col, 30) + 32;
            y = Math.max(1110, y);
        } else {
            if (card.kicker) y += text(card.kicker, P, y, INNER, 26, p.muted, "sans") + 36;
            y += title(heading, P, y, INNER, 390, 74) + 46;
            picture(art, 0, y, W, 490, true); y += 538;
            if (card.deck) y += text(card.deck, P + 180, y, INNER - 180, 32) + 32;
        }
        if (opts.artLabel) y += text(opts.artLabel, P, y + 10, INNER, 24, p.muted) + 30;
    } else if (card.infographic) {
        const info = card.infographic;
        if (!info) throw new Error("정보 그래픽의 근거 데이터가 없습니다.");
        const headerX = family === "ledger" && !opts.repairLayout ? P + 164 : P;
        if (card.kicker) y += text(card.kicker, headerX, y, W - headerX - P, 26, p.muted, "sans") + 24;
        y += title(heading, headerX, y, W - headerX - P, 380, family === "dossier" ? 68 : 76, family === "atlas") + 26;
        if (card.deck) y += text(card.deck, headerX, y, W - headerX - P, 30) + 26;
        y += 26;
        if (info.kind === "compare") {
            const labelW = 180, cellW = (INNER - labelW - 48) / 2;
            const x1 = P + labelW + 24, x2 = x1 + cellW + 24;
            const labelH = Math.max(typeHeight(measure, info.leftLabel, cellW, fontSize(28), "sans"), typeHeight(measure, info.rightLabel, cellW, fontSize(28), "sans"));
            block(x1 - 12, y - 12, cellW + 24, labelH + 24, base.ink);
            text(info.leftLabel, x1, y, cellW, 28, "#FFFFFF", "sans");
            const rh = text(info.rightLabel, x2, y, cellW, 28, p.ink, "sans");
            y += Math.max(90, rh + 28, labelH + 28);
            for (const row of info.rows) {
                line(P, y, INNER); y += 24;
                const a = text(row.aspect, P, y, labelW, 28, p.muted, "sans");
                const b = text(row.a, x1, y, cellW, 32), c = text(row.b, x2, y, cellW, 32);
                y += Math.max(a, b, c) + 34;
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
                        cy += text(row.label, x + 40, cy, colW - 40, 36, p.ink, "sans") + 16;
                        if (row.note) cy += text(row.note, x, cy, colW, 30);
                        rowH = Math.max(rowH, cy - y + 44);
                    });
                    y += rowH;
                }
            } else for (const row of rows) {
                line(P, y, INNER); y += 30;
                if (family === "dossier" || family === "journal" || opts.repairLayout || card.treatment === "guide") {
                    const keyH = text(row.key, P, y, INNER, 27, p.muted, "sans");
                    y += keyH + 16;
                    y += text(row.label, P, y, INNER, 42, p.ink, "sans") + 16;
                    if (row.note) y += text(row.note, P + 120, y, INNER - 120, 31) + 16;
                    y += 24;
                } else {
                    const keyW = family === "ledger" ? 190 : 120;
                    const keyH = text(row.key, P, y, keyW, info.kind === "flow" || info.kind === "checklist" ? 62 : 30, p.field, "sans");
                    let cy = y;
                    cy += text(row.label, P + keyW + 32, cy, INNER - keyW - 32, 39, p.ink, "sans") + 16;
                    if (row.note) cy += text(row.note, P + keyW + 32, cy, INNER - keyW - 32, 31);
                    y = Math.max(y + keyH, cy) + 42;
                }
            }
        }
    } else {
        const missing = contactReadiness(profile);
        if (missing.length) throw new ContactProfileError(`상담 안내에 필요한 ${missing.join("과 ")}을 등록해주세요.`);
        let portrait: Image;
        try { portrait = await decode(await readBrandAsset(profile.profileImages[0])); }
        catch { throw new ContactProfileError("등록된 변호사 사진을 읽지 못했습니다."); }
        const claims = (profile.career || []).slice(0, 2);
        const identityText = (x: number, start: number, w: number, centered = false) => {
            let cy = start;
            cy += text(profile.jobTitle || "변호사", x, cy, w, 28, p.muted, "sans", centered) + 16;
            cy += title(profile.lawyerName, x, cy, w, 380, 86, centered) + 28;
            if (profile.officeName) cy += text(profile.officeName, x, cy, w, 32, p.ink, "sans", centered) + 28;
            for (const claim of claims) cy += text(claim, x, cy, w, 30, p.ink, "body", centered) + 18;
            return cy;
        };
        if (family === "atlas" || family === "journal") {
            picture(portrait, 292, y, 440, 550, true); y += 596;
            y = identityText(P, y, INNER, true);
        } else if (family === "ledger" || family === "column") {
            picture(portrait, P, y, 380, 560, true);
            y = Math.max(y + 600, identityText(500, y + 20, 460));
        } else {
            y += text(profile.officeName || "상담 안내", P, y, INNER, 30, p.muted, "sans") + 24;
            y += title(`${profile.lawyerName} ${profile.jobTitle || "변호사"}`, P, y, INNER, 380, 74) + 40;
            picture(portrait, P, y, 390, 530, true);
            let cy = y + 16;
            for (const claim of claims) cy += text(claim, 516, cy, 444, 33) + 30;
            y = Math.max(y + 574, cy + 32);
        }
        y += 38;
        const contactY = y;
        let contactH = 34;
        for (const action of actions) contactH += typeHeight(measure, action.display, INNER, fontSize(action.href.startsWith("tel:") ? 60 : 28), "sans") + 24;
        contactH += 66;
        block(0, contactY, W, contactH, base.ink);
        y += text("상담 문의", P, y + 28, INNER, 27, "#FFFFFF", "sans") + 52;
        for (const action of actions) y += text(action.display, P, y, INNER, action.href.startsWith("tel:") ? 60 : 28, "#FFFFFF", "sans") + 24;
        y = Math.max(y + 28, contactY + contactH);
    }

    y += 42;
    let logo: Image | undefined, lightLogo = false;
    if (profile.logoImage) try {
        const prepared = await prepareMagazineLogo(await readBrandAsset(profile.logoImage));
        logo = await decode(prepared.bytes); lightLogo = prepared.lightInk;
    } catch { warnings.push("등록 로고를 읽지 못해 사무소명을 표시했습니다."); }
    const brandW = logo ? INNER - 240 : INNER;
    const footerH = Math.max(80, typeHeight(measure, brand, brandW, 26) + 40);
    const height = Math.ceil(Math.max(modern && card.infographic ? 760 : 1120, y + footerH + 34));
    if (height > 3400) throw new Error("한 장에 담을 내용이 많습니다. 문구를 줄여주세요. 잘린 이미지는 저장하지 않았습니다.");
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
    const canvas = createCanvas(W, height), c = canvas.getContext("2d");
    rect(c, 0, 0, W, height, dark ? base.ink : "#FFFFFF");
    for (const command of commands) command(c);
    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: "#FFFFFF" }).png({ compressionLevel: 9 }).toBuffer();
    if (!modern && png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256, dither: 0.6 }).toBuffer();
    if (png.length > (modern ? 2_700_000 : 2_000_000)) throw new Error("이미지 용량이 너무 큽니다. 색상을 손실 압축하지 않고 중단했습니다.");
    return { type: card.type, name: CARD_LABELS[card.type], imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: W, height,
        altText: card.type === "contact" ? `${brand} 상담 안내 · ${actions.map((a) => a.display).join(" / ")}` : [heading, card.deck].filter(Boolean).join(" · "),
        placement: cardPlacement(card, opts.plan.paragraphs), warnings, designVersion: modern ? "editorial-v11" : "editorial-v10", model: opts.model,
        layoutChecks: { passed: !layoutIssues.length, issues: [...new Set(layoutIssues)], textBlocks: boxes.length },
        layout: opts.style || identity.style, sourceParagraphId: card.afterParagraphId, purpose: card.purpose, ...(actions.length ? { contactActions: actions } : {}) };
}
