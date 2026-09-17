import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { magazineFonts, type as drawText, typeHeight, rect, rule, type MagazineFace } from "./magazine-design";
import { prepareMagazineLogo } from "./logo-compositor";
import { contactActions } from "./contact-details";
import { BLOG_LAYOUT_REVISION, PROFILE_SET_FORMAT, type BlogImageCard } from "./card-types";
import type { BriefRenderOptions } from "./brief-renderer";
import { profileEdition } from "./profile-editions";
import { beginImageProduction, saveImageProduction, digest } from "./production-store";
import type { EditorialProfile } from "./card-types";
import type { ArticleVisualPlan } from "./visual-plan-types";

const W = 1200, P = 76, INK = "#191D22", MUTED = "#565F66";

/** No manuscript, date, palette lottery or topic-selected claims in the asset key. */
export function fixedProfileCardKey(opts: BriefRenderOptions) {
    const p = opts.profile;
    return digest(JSON.stringify({ version: "profile-card-v1", edition: profileEdition(p)?.id, type: opts.card.type,
        owner: p.id, name: p.lawyerName, office: p.officeName, title: p.jobTitle, logo: p.logoImage,
        ...(opts.card.type === "info" ? { portrait: p.profileImages[0], proof: p.credentialProof } : { phone: p.phone, website: p.website }) }));
}

export async function cachedProfileCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    const id = fixedProfileCardKey(opts);
    const { checkpoint } = await beginImageProduction(id, opts.profile.id, id, { unpaid: true });
    if (!checkpoint.card?.layoutChecks?.passed) {
        checkpoint.card = await renderProfileCard(opts);
        checkpoint.state = "complete";
        await saveImageProduction(checkpoint);
    }
    // Only the pixels are shared. Each article gets its own source-bound release.
    return { ...checkpoint.card, warnings: [...checkpoint.card.warnings], purpose: opts.card.purpose, sourceParagraphId: opts.card.afterParagraphId };
}

export async function prepareProfileCards(profile: EditorialProfile) {
    const edition = profileEdition(profile);
    if (!edition) return;
    const plan: ArticleVisualPlan = { version: "visual-plan-v11", setFormat: PROFILE_SET_FORMAT, publicationEdition: edition.id,
        sourceHash: "", question: "", thesis: "", cards: [], paragraphs: [] };
    for (const type of ["info", "contact"] as const) {
        const card = await cachedProfileCard({ profile, plan, card: { type, heading: "", deck: "", purpose: "", afterParagraphId: "", evidence: [] } });
        if (!card.layoutChecks?.passed) throw new Error("고정 경력·연락 이미지의 문구가 지면에 맞지 않습니다. 공개 강점 문구를 확인해주세요. 유료 생성은 시작하지 않았습니다.");
    }
}

export async function renderProfileCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    magazineFonts();
    const { profile, card } = opts, edition = profileEdition(profile);
    if (!edition || !["info", "contact"].includes(card.type)) throw new Error("변호사 전용 지면을 확인해주세요.");
    const proof = profile.credentialProof;
    if (card.type === "info" && (!proof?.facts.length || proof.owner !== edition.owner)) throw new Error("현재 변호사의 공개 확인 경력 자료가 필요합니다.");
    const H = card.type === "info" ? 1500 : 900;
    const c = createCanvas(W, H).getContext("2d"), boxes: { x: number; y: number; w: number; h: number }[] = [];
    const ink = INK, accent = edition.accent, paper = "#FFFFFF", warnings: string[] = [];
    rect(c, 0, 0, W, H, paper);
    const text = (s: string, x: number, y: number, w: number, size: number, color = ink, face: MagazineFace = "body", leading = 1.4) => {
        const h = typeHeight(c, s, w, size, face, leading);
        if (s) boxes.push({ x, y, w, h });
        drawText(c, s, x, y, w, size, color, face, leading);
        return h;
    };
    const name = edition.owner;
    const logo = async (x: number, y: number, width = 230) => {
        if (!profile.logoImage) return;
        try {
            const prepared = await prepareMagazineLogo(await readBrandAsset(profile.logoImage));
            const img = await loadImage(prepared.bytes);
            rect(c, x, y, width, 65, prepared.lightInk ? INK : "#FFFFFF");
            d.picture(c, img, x + 8, y + 8, width - 16, 49, "contain");
        } catch { warnings.push("로고 대신 등록된 사무소명을 표시했습니다."); }
    };
    const brand = profile.officeName || name;
    const compactName = name.startsWith("법무법인") ? name.replace(" 천안사무소", "\n천안사무소") : `${name} 변호사`;
    if (card.type === "info") {
        const photo = await loadImage(await sharp(await readBrandAsset(profile.profileImages[0]), { limitInputPixels: 24_000_000 }).rotate().png().toBuffer());
        const facts = proof!.facts.slice(0, 2).map((f) => f.text);
        let factX = P, factY = 975, factW = W - 2 * P;
        if (edition.proof === "column") {
            rect(c, 0, 0, 248, H, accent);
            text("주요\n경력", 40, 84, 168, 53, paper, "sans", 1.32);
            await logo(298, 74);
            const nh = text(compactName, 298, 218, 826, name.startsWith("법무법인") ? 64 : 86, ink, "sans", 1.25);
            d.picture(c, photo, 298, 250 + nh, 826, Math.max(360, 640 - nh), "contain");
            factX = 298; factY = 950; factW = 826;
        } else if (edition.proof === "nameplate") {
            text(brand, P, 80, 760, 32, MUTED, "label");
            rule(c, P, 156, W - P * 2, accent, 3);
            const nh = text(compactName, P, 214, W - P * 2, name.startsWith("법무법인") ? 68 : 92, ink, "serif", 1.25);
            d.picture(c, photo, P, 280 + nh, 474, 560, "contain");
            text("주요 경력", 620, 365 + nh, 490, 31, accent, "label");
            text(facts[0], 620, 440 + nh, 490, 48, ink, "label", 1.48);
            factY = 1145; facts.shift();
        } else if (edition.proof === "folio") {
            await logo(P, 70);
            const nh = text(compactName, P, 220, W - P * 2, name.startsWith("법무법인") ? 66 : 88, ink, "serif", 1.28);
            rule(c, P, 245 + nh, W - P * 2, accent, 3);
            d.picture(c, photo, P, 290 + nh, W - P * 2, 540, "contain");
            factY = 1020;
        } else {
            text(brand, P, 80, W - P * 2, 32, MUTED, "label");
            rule(c, P, 160, W - P * 2, accent, 3);
            text(compactName, P, 256, 560, 84, ink, "sans", 1.28);
            text("주요 경력", P, 655, 500, 32, accent, "label");
            d.picture(c, photo, 660, 246, 464, 620, "contain");
            factY = 942;
        }
        if (facts.length) {
            rule(c, factX, factY - 28, factW, "#C4C9CD", 1);
            for (let i = 0; i < facts.length; i++) {
                factY += text(facts[i], factX, factY, factW, i === 0 ? 48 : 41, i === 0 ? ink : MUTED, i === 0 ? "label" : "body", 1.4) + 38;
            }
        }
        text(brand, edition.proof === "column" ? 298 : P, 1410, edition.proof === "column" ? 826 : W - 2 * P, 28, edition.proof === "column" ? MUTED : accent, "label");
    } else {
        const actions = contactActions(profile), primary = actions.find((a) => a.href.startsWith("tel:")) || actions[0];
        if (!primary) throw new Error("등록된 대표번호 또는 홈페이지가 필요합니다.");
        const side = edition.proof === "column" || edition.proof === "portrait-index";
        if (side) {
            rect(c, 0, 0, 28, H, accent);
            text(brand, P, 80, W - 2 * P, 34, MUTED, "label");
            text("혼자 판단하기 어렵다면,\n함께 짚어보겠습니다.", P, 225, W - 2 * P, 66, ink, "sans", 1.38);
            rule(c, P, 488, W - 2 * P, accent, 3);
            text(name, P, 535, W - 2 * P, 34, MUTED, "label");
            text("상담 문의", P, 628, W - 2 * P, 30, accent, "label");
            text(primary.display, P, 694, W - 2 * P, primary.href.startsWith("tel:") ? 88 : 46, ink, "sans", 1.2);
        } else {
            await logo(P, 70);
            text(brand, P, 184, W - 2 * P, 32, MUTED, "label");
            text("지금의 고민,\n상담에서 시작하세요.", P, 280, W - 2 * P, 74, ink, edition.proof === "folio" ? "serif" : "sans", 1.35);
            rect(c, 0, 575, W, H - 575, accent);
            text(`${name} · 상담 문의`, P, 628, W - 2 * P, 32, paper, "label");
            text(primary.display, P, 720, W - 2 * P, primary.href.startsWith("tel:") ? 88 : 46, paper, "sans", 1.2);
        }
    }
    const issues: string[] = [];
    for (const b of boxes) if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) issues.push("문구가 지면 경계를 벗어납니다.");
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) issues.push("문구 영역이 서로 겹칩니다.");
    }
    const png = await sharp(c.canvas.toBuffer("image/png")).png({ compressionLevel: 9 }).toBuffer();
    return { type: card.type, name: card.type === "info" ? "대표 강점·경력" : "상담 연락 안내", imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
        width: W, height: H, warnings, designVersion: "editorial-v11", layoutRevision: BLOG_LAYOUT_REVISION,
        setFormat: PROFILE_SET_FORMAT, publicationEdition: edition.id,
        altText: card.type === "info" ? `${name}. ${proof!.facts.map((f) => f.text).join(". ")}` : `${name} 상담 문의. ${contactActions(profile).map((a) => a.display).join(" / ")}`,
        layoutChecks: { passed: !issues.length, issues: [...new Set(issues)], textBlocks: boxes.length },
        placement: card.type === "info" ? "본문 후반 · 변호사 소개" : "본문 마지막 · 바로 아래에 실제 전화 링크 추가", purpose: card.purpose,
        ...(card.type === "contact" ? { contactActions: contactActions(profile) } : {}) };
}
