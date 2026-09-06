import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { CARD_LABELS, type BlogImageCard } from "./card-types";
import { contactActions, contactReadiness } from "./contact-details";
import { ContactProfileError } from "./contact-renderer";
import { cardPlacement } from "./visual-plan-types";
import type { BriefRenderOptions } from "./brief-renderer";
import { DEFAULT_DIRECTION, MAGAZINE_PALETTES, magazineFonts, type, typeHeight, fitTitle, rect, rule } from "./magazine-design";

const W = 1024, P = 64, I = W - 2 * P;
/** Complete publication artwork, not HTML cards: semantic type, grid, art and genuine identity. */
export async function renderMagazineCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    magazineFonts();
    const { card, profile } = opts, direction = opts.plan.direction || DEFAULT_DIRECTION;
    const p = MAGAZINE_PALETTES[direction.palette], face = direction.typography;
    const strong = opts.style !== "paper", warnings: string[] = [];
    const heading = opts.headingOverride?.trim() || card.heading;
    if (heading.length > 70) throw new Error("이미지 제목은 70자 이내로 입력해 주세요.");
    const edited = !!opts.headingOverride && opts.headingOverride !== card.heading;
    if (edited) warnings.push("직접 수정한 제목은 원문과 맞는지 다시 확인해 주세요.");
    const headline = !edited && card.headlineLines?.length ? card.headlineLines.join("\n") : heading;
    const measure = createCanvas(W, 1).getContext("2d");
    const th = (s: string, w: number, size: number, f: "body" | "sans" | "serif" = "body") => typeHeight(measure, s, w, size, f);
    const decode = async (b: Buffer) => loadImage(await sharp(b, { limitInputPixels: 24_000_000 }).rotate().png().toBuffer());
    let art: Image | undefined, portrait: Image | undefined, logo: Image | undefined;
    if (card.type === "thumbnail" || card.type === "illustration") {
        if (!opts.art) throw new Error("원고의 시각물이 없습니다. 빈 배경으로 대체하지 않았습니다.");
        art = await decode(opts.art);
    }
    if (card.type === "contact") {
        const missing = contactReadiness(profile);
        if (missing.length) throw new ContactProfileError(`상담 안내에 필요한 ${missing.join("과 ")}을 등록해 주세요.`);
        try { portrait = await decode(await readBrandAsset(profile.profileImages[0])); }
        catch { throw new ContactProfileError("등록된 변호사 사진을 불러오지 못했습니다. 실제 사진을 확인해 주세요."); }
    }
    if (profile.logoImage) try { logo = await decode(await readBrandAsset(profile.logoImage)); } catch { warnings.push("등록 로고를 읽지 못해 사무소명을 표시했습니다."); }
    const brand = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const footerH = Math.max(100, th(brand, logo ? I - 220 : I, 24) + 48);
    let H = 1280;
    const info = card.infographic;
    const compare = info?.kind === "compare" ? info : null;
    const rows = info?.kind === "flow" ? info.steps.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "timeline" ? info.events.map((r) => ({ key: r.when, ...r }))
        : info?.kind === "checklist" ? info.items.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "tiers" ? info.tiers.map((r) => ({ key: r.range, label: r.label, note: "" })) : [];
    const infoTitle = fitTitle(measure, heading, I - 40, 260, 76, face);
    const infoHeader = 156 + infoTitle.h + (card.deck ? th(card.deck, I - 20, 36) + 28 : 0) + 60;
    const keyW = info?.kind === "timeline" || info?.kind === "tiers" ? 242 : 126;
    const rowW = I - keyW - 38;
    const rowHeights = rows.map((r) => Math.max(th(r.key, keyW - 12, keyW > 200 ? 34 : 62, "sans"), th(r.label, rowW, 42, "sans") + (r.note ? th(r.note, rowW, 36) + 18 : 0)) + 68);
    const col = (I - 36) / 2;
    const comparisonHeader = compare ? Math.max(th(compare.leftLabel, col - 48, 38, "sans"), th(compare.rightLabel, col - 48, 38, "sans")) + 54 : 0;
    const comparisonRows = compare?.rows.map((r) => th(r.aspect, I, 28, "sans") + 26 + Math.max(th(r.a, col - 48, 36), th(r.b, col - 48, 36)) + 60) || [];
    if (card.type === "info") {
        if (!info) throw new Error("설명 그래픽의 내용이 없습니다.");
        H = Math.ceil(infoHeader + (compare ? comparisonHeader + comparisonRows.reduce((a, b) => a + b, 0) : rowHeights.reduce((a, b) => a + b, 0)) + footerH + 72);
    }
    const actions = card.type === "contact" ? contactActions(profile) : [];
    const primary = actions[0], web = actions.find((a) => a.href.startsWith("http"));
    const contactTitle = fitTitle(measure, headline, I, 380, 76, face);
    const contactHeroY = 160 + contactTitle.h + 48;
    const leftW = 392, portraitX = 500, portraitW = 460, portraitH = 540;
    const identityH = th(profile.lawyerName, leftW, 78, "serif") + 12 + (profile.jobTitle ? th(profile.jobTitle, leftW, 28) + 12 : 0) + th(profile.officeName, leftW, 28) + 40;
    const points = card.points || [];
    const contactMainH = Math.max(portraitH, identityH);
    const deckY = contactHeroY + contactMainH + 46;
    const deckH = card.deck ? th(card.deck, I, 38) + 34 : 0;
    const pointY = deckY + deckH;
    const pointWidth = points.length === 2 ? (I - 52) / 2 : I;
    const pointHeights = points.map((s) => th(s, pointWidth - 26, 34) + 16);
    const pointH = points.length === 2 ? Math.max(...pointHeights) : pointHeights.reduce((a, b) => a + b, 0);
    const ctaY = pointY + th("상담에서 확인할 내용", I, 28, "sans") + 30 + pointH + 52;
    const contactNumSize = primary?.href.startsWith("tel:") ? 68 : 38;
    const ctaH = primary ? 110 + th(primary.display, I - 94, contactNumSize, "sans") + (web && web !== primary ? th(web.display, I, 27) + 20 : 0) + 40 : 0;
    if (card.type === "contact") H = Math.ceil(ctaY + ctaH + 102);
    if (card.type === "illustration") H = Math.ceil(infoHeader + 632 + footerH + 80);
    if (H > 2800) throw new Error("한 장에 담을 내용이 너무 많습니다. 제목·설명을 줄여 다시 기획해 주세요. 잘린 이미지로 저장하지 않았습니다.");
    const canvas = createCanvas(W, H), c = canvas.getContext("2d");
    rect(c, 0, 0, W, H, p.paper);
    const masthead = (light = false, label = "법률 읽기") => {
        const fg = light ? p.paper : p.ink;
        type(c, label, P, 43, 220, 25, fg, "sans");
        type(c, card.kicker || (card.type === "contact" ? "상담 안내" : "법률 가이드"), W - P - 320, 46, 320, 23, fg);
        rule(c, P, 99, I, light ? "#FFFFFF66" : p.ink);
    };
    const footer = (y = H - footerH, light = false) => {
        const fg = light ? p.paper : p.muted;
        rule(c, P, y, I, light ? "#FFFFFF55" : "#80808055");
        if (logo) { rect(c, P, y + 22, 188, 54, "#FFFFFF"); d.picture(c, logo, P + 8, y + 27, 172, 44, "contain"); }
        type(c, brand, logo ? P + 220 : P, y + 27, logo ? I - 220 : I, 24, fg);
    };
    if (card.type === "thumbnail" && art) {
        const immersive = strong && direction.composition === "immersive";
        if (immersive) {
            d.picture(c, art, 0, 0, W, H);
            // The brief reserves the title field; a local dark scrim guarantees readable light type.
            const shade = c.createLinearGradient(0, 0, 0, H);
            shade.addColorStop(0, p.ink + "F5"); shade.addColorStop(0.30, p.ink + "D9"); shade.addColorStop(0.56, p.ink + "00"); shade.addColorStop(0.86, p.ink + "00"); shade.addColorStop(1, p.ink + "F5");
            c.fillStyle = shade; c.fillRect(0, 0, W, H); masthead(true);
            const deckH = card.deck ? th(card.deck, I - 70, 36) : 0;
            const title = fitTitle(measure, headline, I - 24, Math.min(398, 674 - 178 - deckH), 102, face);
            type(c, title.text, P, 150, I - 24, title.size, p.paper, face, 1.28);
            const deckY = 150 + title.h + 28;
            if (deckY + deckH > 674) throw new Error("표지 문장이 시각물 영역을 침범합니다. 제목이나 설명을 줄여 주세요.");
            if (card.deck) {
                const backing = c.createLinearGradient(0, deckY - 30, 0, deckY + deckH + 22);
                backing.addColorStop(0, p.ink + "00"); backing.addColorStop(0.2, p.ink + "CE"); backing.addColorStop(0.85, p.ink + "CE"); backing.addColorStop(1, p.ink + "00");
                c.fillStyle = backing; c.fillRect(0, deckY - 30, W, deckH + 52);
                type(c, card.deck, P + 24, deckY, I - 70, 36, p.paper);
            }
            rect(c, P, deckY + 8, 4, Math.max(26, deckH - 10), p.accent);
            rect(c, 0, H - footerH - 44, W, footerH + 44, p.ink);
            type(c, opts.artLabel || "AI 설명용 시각물 · 실제 사건 자료 아님", P, H - footerH - 34, I, 21, p.paper);
            footer(H - footerH, true);
        } else {
            masthead();
            const title = fitTitle(measure, headline, I, 335, 88, face);
            type(c, title.text, P, 146, I, title.size, p.ink, face, 1.28);
            const artY = 146 + title.h + 36, artH = H - artY - footerH - 108;
            if (artH < 450) throw new Error("표지 제목이 너무 깁니다. 시각물을 축소하지 않도록 제목을 줄여 주세요.");
            rect(c, 0, artY + 60, W, artH - 10, p.field);
            d.picture(c, art, P, artY, I, artH);
            if (card.deck) {
                const h = th(card.deck, I - 64, 30) + 42;
                rect(c, P + 28, artY + artH - h - 28, I - 56, h, p.paper);
                type(c, card.deck, P + 60, artY + artH - h - 8, I - 120, 30, p.ink);
            }
            type(c, opts.artLabel || "AI 설명용 시각물 · 실제 사건 자료 아님", P, H - footerH - 44, I, 21, p.muted);
            footer();
        }
    } else if (card.type === "illustration" && art) {
        masthead(false, "사건을 보는 관점");
        type(c, infoTitle.text, P, 150, I - 40, infoTitle.size, p.ink, face, 1.28);
        if (card.deck) type(c, card.deck, P, 150 + infoTitle.h + 28, I - 20, 36, p.muted);
        rect(c, 0, infoHeader + 50, W, 480, p.ink);
        d.picture(c, art, P, infoHeader, I, 580);
        type(c, opts.artLabel || "AI 설명용 시각물 · 실제 사건 자료 아님", P, infoHeader + 610, I, 22, p.muted);
        footer();
    } else if (card.type === "info") {
        // Editorial data spread: open rows, strong reading order, no decorative boxes posing as data.
        if (strong) rect(c, 0, 0, W, infoHeader - 28, p.ink);
        masthead(strong, "핵심 정리");
        type(c, infoTitle.text, P, 150, I - 40, infoTitle.size, strong ? p.paper : p.ink, face, 1.28);
        if (card.deck) type(c, card.deck, P, 150 + infoTitle.h + 28, I - 20, 36, strong ? p.paper : p.muted);
        let y = infoHeader;
        if (compare) {
            rect(c, P, y, col, comparisonHeader, p.ink); rect(c, P + col + 36, y, col, comparisonHeader, p.field);
            type(c, compare.leftLabel, P + 24, y + 25, col - 48, 38, "#FFFFFF", "sans");
            type(c, compare.rightLabel, P + col + 60, y + 25, col - 48, 38, "#FFFFFF", "sans"); y += comparisonHeader;
            compare.rows.forEach((r, i) => {
                type(c, r.aspect, P, y + 24, I, 28, p.muted, "sans");
                const v = y + th(r.aspect, I, 28, "sans") + 50;
                type(c, r.a, P + 24, v, col - 48, 36, p.ink);
                type(c, r.b, P + col + 60, v, col - 48, 36, p.ink);
                y += comparisonRows[i]; rule(c, P, y, I, "#80808060");
            });
        } else rows.forEach((r, i) => {
            rule(c, P, y, I, p.ink, i === 0 ? 3 : 1);
            type(c, r.key, P, y + 26, keyW - 12, keyW > 200 ? 34 : 62, p.field, "sans");
            const used = type(c, r.label, P + keyW + 38, y + 28, rowW, 42, p.ink, "sans");
            if (r.note) type(c, r.note, P + keyW + 38, y + 46 + used, rowW, 36, p.muted);
            y += rowHeights[i];
        });
        footer();
    } else if (portrait && primary) {
        masthead(false, "다음 이야기");
        type(c, contactTitle.text, P, 150, I, contactTitle.size, p.ink, face, 1.28);
        rect(c, portraitX - 18, contactHeroY + 20, portraitW + 18, portraitH, p.field);
        rect(c, portraitX, contactHeroY, portraitW, portraitH, "#FFFFFF");
        // Identity is never invented or sent to an image generator. Entire registered portrait is contained.
        d.picture(c, portrait, portraitX, contactHeroY, portraitW, portraitH, "contain");
        let y = contactHeroY;
        y += type(c, profile.lawyerName, P, y, leftW, 78, p.ink, "serif") + 12;
        if (profile.jobTitle) y += type(c, profile.jobTitle, P, y, leftW, 28, p.muted) + 12;
        y += type(c, profile.officeName, P, y, leftW, 28, p.muted) + 40;
        rule(c, P, y, 60, p.field, 4);
        if (card.deck) type(c, card.deck, P, deckY, I, 38, p.ink);
        let py = pointY + type(c, "상담에서 확인할 내용", P, pointY, I, 28, p.muted, "sans") + 30;
        points.forEach((item, i) => {
            const x = points.length === 2 ? P + i * (pointWidth + 52) : P;
            rect(c, x, py + 15, 6, 6, p.field);
            type(c, item, x + 26, py, pointWidth - 26, 34, p.ink);
            if (points.length !== 2) py += pointHeights[i];
        });
        const bg = strong ? p.ink : "#FFFFFF", fg = strong ? p.paper : p.ink;
        rect(c, 0, ctaY, W, ctaH, bg);
        type(c, primary.href.startsWith("tel:") ? "상담 문의" : "홈페이지에서 상담 안내 확인", P, ctaY + 36, I - 250, 27, fg, "sans");
        if (logo) { rect(c, W - P - 206, ctaY + 27, 206, 56, "#FFFFFF"); d.picture(c, logo, W - P - 198, ctaY + 33, 190, 44, "contain"); }
        const numberH = type(c, primary.display, P, ctaY + 96, I - 94, contactNumSize, fg, "sans");
        arrow(c, W - P - 54, ctaY + 115, fg);
        if (web && web !== primary) type(c, web.display, P, ctaY + 116 + numberH, I, 27, fg);
        type(c, "구체적인 판단은 개별 사실관계에 따라 달라질 수 있습니다.", P, H - 75, I, 28, p.muted);
    }
    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: p.paper }).png({ compressionLevel: 9 }).toBuffer();
    if (png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256, dither: 0.6 }).toBuffer();
    if (png.length > 2_000_000) throw new Error("완성 이미지 용량이 너무 큽니다. 시각물을 다시 생성해 주세요.");
    return { type: card.type, name: CARD_LABELS[card.type], imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: W, height: H,
        altText: [heading, card.deck, card.type === "contact" ? `${profile.officeName} ${profile.lawyerName} ${profile.jobTitle} ${actions.map((a) => a.display).join(" / ")}` : ""].filter(Boolean).join(" — "),
        placement: card.type === "contact" ? "본문 마지막 · 바로 아래에 실제 상담 링크 추가" : cardPlacement(card, opts.plan.paragraphs),
        model: opts.model, warnings, designVersion: "editorial-v9", sourceParagraphId: card.afterParagraphId, purpose: card.purpose,
        layout: opts.style || "contrast", ...(actions.length ? { contactActions: actions } : {}) };
}
function arrow(c: SKRSContext2D, x: number, y: number, color: string) {
    c.strokeStyle = color; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 40); c.lineTo(x + 40, y);
    c.lineTo(x + 4, y); c.moveTo(x + 40, y); c.lineTo(x + 40, y + 36); c.stroke();
}
