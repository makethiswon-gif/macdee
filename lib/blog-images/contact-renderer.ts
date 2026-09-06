import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { safeBrandColor } from "../brand-visual";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { contactActions, contactReadiness } from "./contact-details";
import { CARD_LABELS, type BlogImageCard, type EditorialProfile } from "./card-types";
import type { ArticleVisualPlan, EditorialStyle, PlannedCard } from "./visual-plan-types";

export class ContactProfileError extends Error {}

/** Real portrait + source-grounded question + usable destination. No generative identity edits. */
export async function renderContactCard(opts: { plan: ArticleVisualPlan; card: PlannedCard; profile: EditorialProfile; style?: EditorialStyle; headingOverride?: string }): Promise<BlogImageCard> {
    const { profile, card } = opts;
    const missing = contactReadiness(profile);
    if (missing.length) throw new ContactProfileError(`상담 안내 이미지에 필요한 ${missing.join("과 ")}을 사진·로고 관리에서 등록해 주세요. 사진 없는 완성본으로 대체하지 않았습니다.`);
    d.ensureFonts();
    const W = 1024, P = 64, I = W - P * 2, leftW = 418, rightX = 550, rightW = 410;
    const accent = safeBrandColor(profile.brandColor), ink = d.mix(accent, 0, 0.72);
    const bg = "#F7F8FA", muted = "#58636F", white = "#FFFFFF";
    const strong = opts.style !== "paper";
    const warnings: string[] = [];
    const heading = opts.headingOverride?.trim() || card.heading;
    if (heading.length > 70) throw new ContactProfileError("이미지 제목은 70자 이내로 입력해 주세요.");
    if (opts.headingOverride && opts.headingOverride !== card.heading) warnings.push("직접 수정한 상담 문구는 원문과 맞는지 확인해 주세요.");
    const decode = async (url: string) => loadImage(await sharp(await readBrandAsset(url)).rotate().png().toBuffer());
    let portrait;
    try { portrait = await decode(profile.profileImages[0]); }
    catch { throw new ContactProfileError("등록된 변호사 사진을 불러오지 못했습니다. 사진·로고 관리에서 확인해 주세요. 인물을 새로 생성하거나 빈 사진으로 대체하지 않았습니다."); }
    let logo = null;
    if (profile.logoImage) { try { logo = await decode(profile.logoImage); } catch { warnings.push("등록 로고를 불러오지 못해 사무소명을 표시했습니다."); } }
    const measure = createCanvas(W, 1).getContext("2d");
    const th = (s: string, w: number, size: number, bold = false) => d.textHeight(measure, s, w, size, bold);
    const titleH = th(heading, leftW, 62, true), deckH = card.deck ? th(card.deck, leftW, 32) + 30 : 0;
    const points = card.points || [];
    const pointH = points.map((p) => th(p, leftW - 26, 28) + 24);
    const copyH = titleH + 30 + deckH + (points.length ? 34 + th("상담에서 함께 확인할 내용", leftW, 23, true) + 22 + pointH.reduce((a, b) => a + b, 0) : 0);
    const identityH = th(profile.lawyerName, rightW, 54, true) + (profile.jobTitle ? th(profile.jobTitle, rightW, 27) + 12 : 0) + th(profile.officeName, rightW, 27) + 38;
    const heroY = 166, photoH = 548;
    const heroH = Math.max(copyH, photoH + identityH + 34);
    const actions = contactActions(profile), phone = actions.find((a) => a.href.startsWith("tel:")), web = actions.find((a) => a.href.startsWith("http"));
    const primary = phone || web!;
    const primarySize = phone ? 62 : 38;
    const ctaH = 154 + th(primary.display, I - 154, primarySize, true) + (phone && web ? th(web.display, I - 50, 28) + 32 : 0);
    const ctaY = heroY + heroH + 62, H = Math.ceil(ctaY + ctaH + 104);
    if (H > 2800) throw new ContactProfileError("상담 안내에 담긴 문장이 너무 깁니다. 구성안의 제목과 설명을 줄여 다시 기획해 주세요. 내용을 잘라 저장하지 않았습니다.");
    const canvas = createCanvas(W, H), c = canvas.getContext("2d");
    const fill = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    fill(0, 0, W, H, bg);
    fill(W - 16, 0, 16, ctaY, accent);
    if (logo) { fill(P, 32, 296, 72, white); d.picture(c, logo, P + 12, 42, 272, 52, "contain"); }
    else d.write(c, profile.officeName || profile.lawyerName, P, 47, 570, 29, ink, true);
    d.write(c, "CONSULTATION", 697, 50, 260, 25, muted);
    d.rule(c, P, 125, I, "#CBD2D9");

    let y = heroY;
    y += d.write(c, heading, P, y, leftW, 62, ink, true) + 30;
    if (card.deck) y += d.write(c, card.deck, P, y, leftW, 32, muted) + 30;
    if (points.length) {
        d.rule(c, P, y + 6, 42, accent); y += 34;
        y += d.write(c, "상담에서 함께 확인할 내용", P, y, leftW, 23, muted, true) + 22;
        points.forEach((p) => {
            fill(P, y + 13, 7, 7, accent);
            y += d.write(c, p, P + 26, y, leftW - 26, 28, ink) + 24;
        });
    }
    // Contain, never face-crop/stretch or regenerate the registered person.
    fill(rightX - 14, heroY + 18, rightW + 14, photoH, d.mix(accent, 255, 0.9));
    fill(rightX, heroY, rightW, photoH, white);
    d.picture(c, portrait, rightX, heroY, rightW, photoH, "contain");
    let nameY = heroY + photoH + 34;
    nameY += d.write(c, profile.lawyerName, rightX, nameY, rightW, 54, ink, true) + 12;
    if (profile.jobTitle) nameY += d.write(c, profile.jobTitle, rightX, nameY, rightW, 27, muted) + 12;
    d.write(c, profile.officeName, rightX, nameY, rightW, 27, muted);

    const panel = strong ? ink : white, fg = strong ? white : ink;
    fill(0, ctaY, W, ctaH, panel); fill(P, ctaY + 36, 42, 5, accent);
    d.write(c, phone ? "상담 문의" : "홈페이지에서 상담 안내 확인", P, ctaY + 65, I - 150, 28, fg);
    const numberY = ctaY + 119;
    const numberH = d.write(c, primary.display, P, numberY, I - 154, primarySize, fg, true);
    const ax = W - P - 68, ay = numberY + 20;
    c.strokeStyle = fg; c.lineWidth = 4; c.beginPath(); c.moveTo(ax, ay + 42); c.lineTo(ax + 42, ay); c.lineTo(ax + 8, ay); c.moveTo(ax + 42, ay); c.lineTo(ax + 42, ay + 34); c.stroke();
    if (phone && web) d.write(c, web.display, P, numberY + numberH + 32, I - 50, 28, fg);
    d.write(c, "구체적인 판단은 개별 사실관계에 따라 달라질 수 있습니다.", P, H - 69, I, 23, muted);
    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: bg }).png({ compressionLevel: 9 }).toBuffer();
    if (png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256 }).toBuffer();
    if (png.length > 2_000_000) throw new ContactProfileError("상담 안내 이미지 용량이 너무 큽니다. 등록 사진 크기를 확인해 주세요.");
    return { type: "contact", name: CARD_LABELS.contact, imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: W, height: H,
        altText: `${heading} — ${profile.officeName} ${profile.lawyerName} ${profile.jobTitle}. ${actions.map((a) => a.display).join(" / ")}`,
        placement: "본문 마지막 · 바로 아래에 실제 상담 링크 추가", purpose: "글의 고민을 실제 변호사와 상담할 수 있도록 사진·이름·연락처를 안내합니다.", warnings,
        designVersion: "editorial-v8", sourceParagraphId: card.afterParagraphId, layout: opts.style || "contrast", contactActions: actions };
}
