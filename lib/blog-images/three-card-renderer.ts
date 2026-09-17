import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { magazineFonts, magazineLines, setType, type as drawType, typeHeight, rect, rule, type MagazineFace } from "./magazine-design";
import { prepareMagazineLogo } from "./logo-compositor";
import { contactActions } from "./contact-details";
import { EDITORIAL_LAYOUT_REVISION, EDITORIAL_IMAGE_SIZE, EDITORIAL_SET_FORMAT, cardLabel, type EditorialProfile, type BlogImageCard } from "./card-types";
import type { BriefRenderOptions } from "./brief-renderer";
import type { ProofSelection } from "./visual-plan-types";
import { profileEdition } from "./profile-editions";
import { getMagazineIdentity } from "./magazine-identity";
import { contactCopy } from "./three-card-policy";
import { drawPhotoPoster } from "./photo-poster";
import { posterContactHeading } from "./poster-layout";
import { StudioPhotoRequiredError } from "../lawyer-studio/types";
import { resolveLogoTypography } from "./logo-color";
import { paintPhotoText } from "./text-contrast";

// Design-space units, rasterized at 2000px. Photo scale is measured in output pixels.
const W = 1200, H = 1200, P = 72, SCALE = EDITORIAL_IMAGE_SIZE / W;
const INK = "#182522", MUTED = "#505D58", WHITE = "#FFFFFF", MAX_PHOTO_UPSCALE = 2.25;
type Photo = { image: Image; kind: "portrait" | "office" | "studio" | "art" };
// Reviewed contact photographs, matched by content rather than a mutable upload index.
const CONTACT_OFFICE: Record<string, string> = {
    mqaaoypk621p6: "da04c374928579aba9fb554577b73526c465ec79aa176506ba9b3170c544de22",
    mmkfnvun052ja: "51ca5e63df7ca8a0e1d0ff19226ce43519296a41449f18e455b46dff4ed7b8d8",
};
const PROFILE_PLATE: Record<string, string> = {
    mmkfnvun052ja: "c6d25df8f6b687204464f0fef143fff6aa9965ac24e2f3a15af7db1782cd95d2",
};

async function registeredPhoto(profile: EditorialProfile, preferOffice = false): Promise<Photo> {
    const signal = AbortSignal.timeout(8_000);
    const sourcesByKind = [["portrait", profile.profileImages], ["office", profile.officeImages]] as const;
    for (const [kind, sources] of preferOffice ? [...sourcesByKind].reverse() : sourcesByKind) {
        const ordered = [...new Set(sources)];
        const preferred = preferOffice && kind === "office" ? CONTACT_OFFICE[profile.id] : kind === "portrait" ? PROFILE_PLATE[profile.id] : undefined;
        if (preferred) ordered.sort((a, b) => Number(createHash("sha256").update(b).digest("hex") === preferred) - Number(createHash("sha256").update(a).digest("hex") === preferred));
        for (const source of ordered.slice(0, 10)) {
            if (signal.aborted) break;
            try {
                const bytes = await readBrandAsset(source, signal), meta = await sharp(bytes).metadata();
                const score = Math.min(meta.width || 0, meta.height || 0);
                // Respect the registered order and portrait intent, not sharpness or pixel-count rankings.
                if (score >= 32 && Math.max(meta.width || 0, meta.height || 0) >= 64) return { image: await loadImage(await sharp(bytes).rotate().png().toBuffer()), kind };
            } catch { /* Another registered image may still be readable. */ }
        }
    }
    throw new Error("사용 가능한 등록 사진이 없습니다. 사진·로고 관리에서 변호사 또는 로펌 사진을 확인한 뒤 이미지만 다시 시도해주세요. 유료 이미지 생성은 시작하지 않았습니다.");
}

export async function prepareEditorialThree(profile: EditorialProfile, proof: ProofSelection, title: string, editorialPhoto?: BriefRenderOptions["editorialPhoto"], contactPhoto = editorialPhoto) {
    if (!contactActions(profile).some(a => a.href.startsWith("tel:"))) throw new Error("상담 이미지에 사용할 대표 전화번호를 등록해주세요. 유료 생성은 시작하지 않았습니다.");
    const plan = { version: "visual-plan-v11" as const, sourceHash: proof.sourceHash, question: "", thesis: "", cards: [], paragraphs: [],
        setFormat: EDITORIAL_SET_FORMAT, proofSelection: proof, publicationEdition: `${EDITORIAL_SET_FORMAT}:${profile.id}` };
    const dimensions: { type: string; width: number; height: number }[] = [];
    for (const type of ["info", "contact"] as const) {
        const result = await renderEditorialThree({ profile, plan, card: { type, ...contactCopy(title), evidence: [], afterParagraphId: "", purpose: "" },
            editorialPhoto: type === "info" ? editorialPhoto : contactPhoto });
        if (!result.layoutChecks?.passed) throw new Error(`신뢰·연락 지면을 확인해주세요: ${result.layoutChecks?.issues.join(" ")}. 유료 생성은 시작하지 않았습니다.`);
        dimensions.push({ type, width: result.width, height: result.height });
    }
    return dimensions;
}

export async function renderEditorialThree(opts: BriefRenderOptions): Promise<BlogImageCard> {
    if (opts.card.type === "info" && (opts.editorialPhoto?.kind !== "studio" || opts.editorialPhoto.selections.length !== 1)) throw new StudioPhotoRequiredError();
    magazineFonts();
    const { profile, card, plan } = opts;
    const identity = getMagazineIdentity(profile), edition = profileEdition(profile);
    const typography = await resolveLogoTypography(profile), accent = typography.primary;
    let protectedRuns = 0;
    const c = createCanvas(EDITORIAL_IMAGE_SIZE, EDITORIAL_IMAGE_SIZE).getContext("2d");
    const boxes: { x: number; y: number; w: number; h: number }[] = [], warnings: string[] = [], issues: string[] = [];
    let photoChecks: BlogImageCard["photoChecks"];
    c.scale(SCALE, SCALE);
    const face: MagazineFace = identity.typography === "serif" ? "display" : "sans";
    rect(c, 0, 0, W, H, WHITE);
    const text = (value: string, x: number, y: number, w: number, maxH: number, size: number, color = INK, font: MagazineFace = "body", min = size, leading = 1.3) => {
        while (size > min && typeHeight(c, value, w, size, font, leading) > maxH) size -= 2;
        const h = typeHeight(c, value, w, size, font, leading);
        if (value) boxes.push({ x, y, w, h });
        if (h > maxH + 1) issues.push("문구가 지정 영역에 맞지 않습니다. 의미를 유지해 문구를 간결하게 승인해주세요.");
        if (color === accent) {
            setType(c, size, font);
            magazineLines(c, value, w).forEach((line, i) => {
                if (paintPhotoText(c, line, x, y + i * Math.ceil(size * leading), size, color)) protectedRuns++;
            });
        } else drawType(c, value, x, y, w, size, color, font, leading);
        return h;
    };
    const photo = (source: Photo, x: number, y: number, w: number, h: number, fit: "cover" | "contain" = "contain") => {
        const img = source.image;
        let scale = fit === "cover" ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
        // Never turn a 400px portrait into a 1600px face. Preserve the complete photo when capped.
        if (source.kind !== "studio" && !(source.kind === "office" && card.type === "contact") && scale * SCALE > MAX_PHOTO_UPSCALE) scale = Math.min(MAX_PHOTO_UPSCALE / SCALE, w / img.width, h / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
        c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); c.restore();
        photoChecks = { source: source.kind, width: img.width, height: img.height,
            areaRatio: Number((Math.min(dw, w) * Math.min(dh, h) / (W * H)).toFixed(3)), upscale: Number((scale * SCALE).toFixed(2)) };
        if (source.kind !== "studio" && Math.min(img.width, img.height) < 600) warnings.push(`원본 ${img.width}×${img.height}px: 원본 크기에 맞춰 사진 영역을 조정했습니다. 그레인과 부드러운 질감은 유지합니다.`);
        if (source.kind === "office" && card.type === "contact" && scale * SCALE > MAX_PHOTO_UPSCALE) warnings.push("등록 공간 사진을 배경으로 확대했습니다. 원본의 부드러운 질감을 유지하며 인공지능 선명화는 하지 않습니다.");
    };
    const firmProfile = /^(법무법인|법률사무소)$/.test(profile.lawyerName.trim());
    const name = (firmProfile ? profile.officeName : profile.lawyerName).trim();
    const brand = profile.officeName || name, label = firmProfile ? "로펌 소개" : profile.jobTitle || "변호사";
    const masthead = async (dark = false, width = W - 2 * P, y = 43) => {
        if (profile.logoImage) try {
            const logo = await prepareMagazineLogo(await readBrandAsset(profile.logoImage));
            const logoW = Math.min(width, 264);
            rect(c, P - 8, y - 19, logoW + 16, 76, logo.lightInk ? INK : WHITE);
            d.picture(c, await loadImage(logo.bytes), P, y - 13, logoW, 64, "contain");
            return; // The uploaded wordmark already names the firm.
        } catch { warnings.push("로고 대신 등록된 로펌명을 표시했습니다."); }
        text(brand, P, y, width, 108, 30, dark ? WHITE : accent, "label", 22);
    };
    const studioPortrait = async (): Promise<Photo> => {
        if (!opts.editorialPhoto) throw new StudioPhotoRequiredError();
        return { image: await loadImage(opts.editorialPhoto.bytes), kind: "studio" };
    };
    let displayedClaims = plan.proofSelection?.claims || [];
    let photoAlt = `${name} 등록 사진`;
    // Style is a tonal override, never a replacement for the saved geometric recipe.
    const recipe = plan.layoutRecipe || "photo-open";
    if (card.type === "thumbnail") {
        if (!opts.art) throw new Error("표지 원본을 확인해주세요.");
        const art: Photo = { image: await loadImage(opts.art), kind: "art" };
        const heading = opts.headingOverride || card.headlineLines?.join("\n") || card.heading;
        photo(art, 0, 0, W, H, "cover");
        const poster = drawPhotoPoster(c, { heading, kicker: card.kicker, emphasis: card.emphasis, brand, brandColor: accent, recipe, repair: opts.repairLayout, forceLight: opts.style === "contrast" });
        protectedRuns += poster.protectedRuns;
        boxes.push(...poster.boxes); issues.push(...poster.issues);
        if (photoChecks && photoChecks.areaRatio < 0.36) issues.push("표지 사진의 실제 면적이 너무 작습니다. 원본과 문구를 확인해주세요.");
    } else if (card.type === "info") {
        if (!plan.proofSelection || plan.proofSelection.profileId !== profile.id) throw new Error("현재 변호사의 승인된 신뢰 자료가 필요합니다.");
        const source = await studioPortrait();
        photoAlt = `${name} 승인 스튜디오 AI 연출 사진`;
        if (!displayedClaims.length) {
            // A photographic plate: keep faces, hands and the full pose without arbitrary square cropping.
            photo(source, 0, 0, W, H);
        } else {
            await masthead();
            photo(source, 610, 134, 518, 470);
            text(name, P, 242, 490, 180, 76, accent, face, 54, 1.22);
            text(label, P, 447, 490, 100, 34, accent, "label", 28);
            const measure = (claims: typeof displayedClaims) => claims.reduce((h, claim, i) => h + 38 + typeHeight(c, claim.text, W - 2 * P, i === 0 ? 45 : 38, i === 0 ? "label" : "body", 1.3) + 24, 0);
            while (displayedClaims.length > 1 && measure(displayedClaims) > H - P - 651) {
                displayedClaims = displayedClaims.slice(0, -1);
                warnings.push("가독성을 위해 보조 경력 한 항목을 생략했습니다. 승인 문구 자체는 수정하지 않았습니다.");
            }
            let y = 651;
            for (let i = 0; i < displayedClaims.length; i++) {
                const claim = displayedClaims[i];
                rule(c, P, y - 17, W - 2 * P, "#CED7D2");
                const scope = claim.scope === "firm" ? "로펌 공통 강점" : firmProfile ? "소속 변호사 경력" : `${name} · 주요 경력`;
                text(scope, P, y, W - 2 * P, 38, 24, accent, "label"); y += 38;
                y += text(claim.text, P, y, W - 2 * P, H - P - y, i === 0 ? 45 : 38, i === 0 ? INK : MUTED, i === 0 ? "label" : "body") + 24;
            }
        }
    } else if (card.type === "contact") {
        const primary = contactActions(profile).find(a => a.href.startsWith("tel:"));
        if (!primary) throw new Error("등록된 대표번호가 필요합니다.");
        const source = opts.editorialPhoto ? await studioPortrait() : await registeredPhoto(profile, true);
        const portraitPanel = source.kind === "portrait";
        if (portraitPanel) {
            // A registered cutout is a real asset, not a full-bleed environmental photograph.
            photo(source, 0, 0, W, 728);
            rect(c, 0, 728, W, H - 728, "#152E34");
        } else photo(source, 0, 0, W, H, "cover");
        const heading = posterContactHeading([plan.question, plan.cards.find(c => c.type === "thumbnail")?.heading, card.heading].filter(Boolean).join(" "));
        const poster = drawPhotoPoster(c, { heading, kicker: heading.split("\n")[0] + " 상담", name: firmProfile ? name : `${name} ${label}`, brand, brandColor: accent, phone: primary.display, portraitPanel, recipe: edition?.cover || recipe, forceLight: opts.style === "contrast" });
        protectedRuns += poster.protectedRuns;
        boxes.push(...poster.boxes); issues.push(...poster.issues);
    } else throw new Error("새 이미지 세트는 표지·신뢰·연락 3장입니다.");
    for (const b of boxes) if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) issues.push("문구가 지면 경계를 벗어납니다.");
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) issues.push("문구 영역이 서로 겹칩니다.");
    }
    const bytes = await sharp(c.canvas.toBuffer("image/png")).png({ compressionLevel: 9 }).toBuffer();
    return { type: card.type, name: cardLabel(card.type, plan), imageDataUrl: `data:image/png;base64,${bytes.toString("base64")}`, width: EDITORIAL_IMAGE_SIZE, height: EDITORIAL_IMAGE_SIZE,
        altText: card.type === "thumbnail" ? opts.headingOverride || card.heading : card.type === "info" ? `${photoAlt}${displayedClaims.length ? `. ${displayedClaims.map(claim => `${claim.scope === "firm" ? "로펌" : "변호사"}: ${claim.text}`).join(". ")}` : ""}` : `${name} 상담 문의. ${contactActions(profile).find(a => a.href.startsWith("tel:"))?.display}`,
        warnings: [...new Set(warnings)], model: opts.model, layout: opts.style, layoutRecipe: recipe, photoChecks,
        designVersion: "editorial-v11", layoutRevision: EDITORIAL_LAYOUT_REVISION, setFormat: EDITORIAL_SET_FORMAT,
        brandTypography: { ...typography, protectedRuns },
        ...(opts.editorialPhoto ? { studioPhotos: opts.editorialPhoto.selections, aiGenerated: true } : {}),
        publicationEdition: plan.publicationEdition, proofSelection: plan.proofSelection, proofToken: plan.proofToken,
        purpose: card.purpose, sourceParagraphId: card.afterParagraphId,
        placement: card.type === "thumbnail" ? "제목 아래 · 도입 앞" : card.type === "info" ? "본문 설명 이후 · 마무리 문단 앞" : "본문 마지막 · 바로 아래 실제 전화 링크",
        layoutChecks: { passed: !issues.length, issues: [...new Set(issues)], textBlocks: boxes.length },
        ...(card.type === "contact" ? { contactActions: contactActions(profile).filter(a => a.href.startsWith("tel:")) } : {}) };
}
