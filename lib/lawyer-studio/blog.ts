import sharp from "sharp";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { type as text, typeHeight, magazineFonts } from "@/lib/blog-images/magazine-design";
import { contactActions } from "@/lib/blog-images/contact-details";
import { BLOG_LAYOUT_REVISION, cardLabel, type EditorialProfile, type BlogImageCard } from "@/lib/blog-images/card-types";
import type { BriefRenderOptions } from "@/lib/blog-images/brief-renderer";
import { digest } from "@/lib/blog-images/production-store";
import { loadStudioLibrary, readStudioBytes, studioPrefix } from "./store";
import { STUDIO_FORMAT, StudioError, StudioPhotoRequiredError, type StudioLibrary, type StudioSelection, type StudioAsset } from "./types";

export function selectStudioPhotos(library: StudioLibrary, sourceHash: string): StudioSelection[] {
    const approved = library.assets.filter((a) => a.status === "approved").sort((a, b) => a.id.localeCompare(b.id));
    if (!library.blogEnabled || approved.length < 2) throw new StudioError("해당 변호사의 스튜디오 사진 2장 이상을 승인하고 블로그 연결을 켜주세요.", 422);
    const start = parseInt(digest(sourceHash).slice(0, 8), 16) % approved.length;
    return [approved[start], approved[(start + 1) % approved.length]].map((a) => ({ assetId: a.id, version: a.version }));
}
export async function resolveStudioPhotos(profileId: string, selections: StudioSelection[] | undefined): Promise<StudioAsset[]> {
    if (!selections || selections.length !== 2 || selections[0].assetId === selections[1].assetId) throw new StudioError("서로 다른 승인 사진 2장이 필요합니다.", 422);
    return resolveApprovedPhotos(profileId, selections);
}
async function resolveApprovedPhotos(profileId: string, selections: StudioSelection[]): Promise<StudioAsset[]> {
    const library = await loadStudioLibrary(profileId);
    if (!library.blogEnabled) throw new StudioError("이 변호사의 스튜디오 블로그 연결이 해제됐습니다.", 409);
    return selections.map((selected) => {
        const asset = library.assets.find((a) => a.id === selected.assetId && a.version === selected.version && a.status === "approved");
        if (!asset || !asset.renderedPath.startsWith(`${studioPrefix(profileId)}/renders/`)) throw new StudioError("스튜디오 사진의 승인 또는 보정 버전이 바뀌었습니다. 새 원고 구성안을 확인해주세요. 자동 유료 생성은 하지 않았습니다.", 409);
        return asset;
    });
}
export async function checkStudioBlogReady(profile: EditorialProfile, photos: StudioSelection[]) {
    const assets = await resolveStudioPhotos(profile.id, photos);
    for (const asset of assets) await sharp(await readStudioBytes(asset.renderedPath), { limitInputPixels: 24_000_000 }).metadata();
    if (!contactActions(profile).length) throw new StudioError("등록된 대표번호 또는 홈페이지 주소가 필요합니다.", 422);
    magazineFonts();
}
/** Recheck ownership, approval and the rendered version before using any studio asset. */
export async function resolveEditorialStudioPhoto(profileId: string, selections: StudioSelection[] | undefined) {
    if (!selections || selections.length !== 1) throw new StudioError("두 번째 이미지에 사용할 승인 사진 한 장을 확인해주세요.", 422);
    return (await resolveApprovedPhotos(profileId, selections))[0];
}
export async function editorialStudioPhoto(profileId: string, edition: string, role: "info" | "contact" = "info") {
    const library = await loadStudioLibrary(profileId);
    const approved = library.assets.filter(a => a.status === "approved").sort((a, b) => a.id.localeCompare(b.id));
    if (!library.blogEnabled || !approved.length) {
        if (role === "info") throw new StudioPhotoRequiredError(approved.length);
        return undefined;
    }
    // Stable selection, with equal eligibility for grainy, soft and crisp approved photographs.
    const selected = approved[(parseInt(digest(edition).slice(0, 8), 16) + (role === "contact" ? 1 : 0)) % approved.length];
    const selections = [{ assetId: selected.id, version: selected.version }];
    const asset = await resolveEditorialStudioPhoto(profileId, selections);
    return { bytes: await readStudioBytes(asset.renderedPath), kind: "studio" as const, selections };
}
export async function renderStudioBlogCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    const assets = await resolveStudioPhotos(opts.profile.id, opts.plan.studioPhotos);
    const asset = assets[opts.card.type === "illustration" ? 0 : 1], bytes = await readStudioBytes(asset.renderedPath);
    const name = opts.profile.lawyerName.split("||")[0].trim();
    let png: Buffer, width: number, height: number, blocks = 0;
    const issues: string[] = [];
    if (opts.card.type !== "contact") {
        const result = await sharp(bytes).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
        png = result.data; width = result.info.width; height = result.info.height;
    } else {
        magazineFonts(); width = 1200; height = 1500;
        const c = createCanvas(width, height).getContext("2d");
        const image = await sharp(bytes).resize(width, height, { fit: "contain", background: "#191b1c" }).png().toBuffer();
        c.drawImage(await loadImage(image), 0, 0, width, height);
        const shade = c.createLinearGradient(0, 790, 0, height);
        shade.addColorStop(0, "rgba(8,12,12,0)"); shade.addColorStop(0.42, "rgba(8,12,12,0.76)"); shade.addColorStop(1, "rgba(8,12,12,0.96)");
        c.fillStyle = shade; c.fillRect(0, 790, width, height - 790);
        const p = 64, w = width - 2 * p;
        const draw = (value: string, y: number, size: number, maxHeight: number, color = "#ffffff") => {
            while (size > 20 && typeHeight(c, value, w, size, "sans", 1.3) > maxHeight) size -= 2;
            const h = typeHeight(c, value, w, size, "sans", 1.3);
            if (h > maxHeight || y + h > height - 40) issues.push("연락 이미지 문구가 지면을 벗어납니다.");
            text(c, value, p, y, w, size, color, "sans", 1.3); blocks++;
        };
        const primary = contactActions(opts.profile).find((a) => a.href.startsWith("tel:")) || contactActions(opts.profile)[0];
        if (!primary) throw new StudioError("대표번호 또는 홈페이지 주소를 확인해주세요.", 422);
        draw("혼자 판단하기 어렵다면,\n상담에서 함께 짚어보겠습니다.", 985, 47, 135);
        draw(`${opts.profile.officeName} · ${name}`, 1150, 30, 85, "#d6dcd9");
        draw(primary.display, 1260, primary.href.startsWith("tel:") ? 80 : 40, 128);
        draw("상담 문의", 1410, 24, 36, "#c3cbc6");
        png = await sharp(c.canvas.toBuffer("image/png")).png({ compressionLevel: 9 }).toBuffer();
    }
    return { type: opts.card.type, name: cardLabel(opts.card.type, opts.plan), imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width, height,
        model: asset.model, setFormat: STUDIO_FORMAT, studioPhotos: opts.plan.studioPhotos, publicationEdition: opts.plan.publicationEdition,
        warnings: [], designVersion: "editorial-v11", layoutRevision: BLOG_LAYOUT_REVISION, aiGenerated: true,
        altText: opts.card.type === "contact" ? `${name} 상담 문의. ${contactActions(opts.profile).map((a) => a.display).join(" / ")}. AI 연출 사진.` : `${name} 변호사 AI 연출 초상 사진`,
        caption: "AI로 제작한 연출 사진입니다. 실제 사무실 또는 상담 장면이 아닙니다.",
        placement: opts.card.type === "contact" ? "본문 마지막 · 아래에 전화 링크" : "본문 중간 · 변호사 소개", purpose: opts.card.purpose, sourceParagraphId: opts.card.afterParagraphId,
        layoutChecks: { passed: !issues.length, issues, textBlocks: blocks }, ...(opts.card.type === "contact" ? { contactActions: contactActions(opts.profile) } : {}) };
}
