import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { magazineFonts, MAGAZINE_PALETTES, type, typeHeight, rect } from "./magazine-design";
import { getMagazineIdentity } from "./magazine-identity";
import type { BlogImageCard, EditorialProfile } from "./card-types";

export async function appendImageStrength(card: BlogImageCard, text: string, profile: EditorialProfile): Promise<BlogImageCard> {
    magazineFonts();
    const palette = MAGAZINE_PALETTES[getMagazineIdentity(profile).palette];
    const measure = createCanvas(card.width, 1).getContext("2d");
    const modern = card.designVersion === "editorial-v11", size = modern ? 40 : 30;
    const strip = Math.ceil(typeHeight(measure, text, card.width - 144, size, "sans") + 64);
    if (card.height + strip > 3400) throw new Error("승인 문구를 담을 공간이 부족합니다. 이미지 문구를 줄여 다시 승인해주세요.");
    const canvas = createCanvas(card.width, card.height + strip), ctx = canvas.getContext("2d");
    ctx.drawImage(await loadImage(Buffer.from(card.imageDataUrl.split(",")[1], "base64")), 0, 0);
    rect(ctx, 0, card.height, card.width, strip, palette.ink);
    type(ctx, text, 72, card.height + 32, card.width - 144, size, "#FFFFFF", "sans");
    let png = await sharp(canvas.toBuffer("image/png")).png({ compressionLevel: 9 }).toBuffer();
    if (!modern && png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256 }).toBuffer();
    if (png.length > (modern ? 2_700_000 : 2_000_000)) throw new Error("이미지 용량이 큽니다. 색상을 손실 압축하지 않고 중단했습니다.");
    return { ...card, height: canvas.height, altText: `${card.altText} · ${text}`, imageDataUrl: `data:image/png;base64,${png.toString("base64")}` };
}
