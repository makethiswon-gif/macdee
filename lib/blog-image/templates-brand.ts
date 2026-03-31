import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, roundRect, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

type Img = import("@napi-rs/canvas").Image | null;

export function renderBrandTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, profileImg, officeImg, logoImg } = assets;

    // Background: Full office photo
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
    } else {
        ctx.fillStyle = "#1e2430";
        ctx.fillRect(0, 0, S, S);
    }

    // Top subtle gradient to ensure logo and copy are readable
    const topGrad = ctx.createLinearGradient(0, 0, 0, S * 0.4);
    topGrad.addColorStop(0, "rgba(0,0,0,0.85)");
    topGrad.addColorStop(0.5, "rgba(0,0,0,0.4)");
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, S, S * 0.4);

    // Subtle dark gradient around edges for overall cinematic feel
    const radGrad = ctx.createRadialGradient(S/2, S/2, S*0.3, S/2, S/2, S*0.8);
    radGrad.addColorStop(0, "transparent");
    radGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, S, S);

    // Logo (Top Left)
    if (logoImg) {
        const lh = 56;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, 64, 64, lw, lh);
    } else {
        ctx.font = `800 24px ${FONT_BOLD}`;
        ctx.fillStyle = accent;
        ctx.fillText(officeName || "법률 전문", 64, 80);
    }

    // Short Copy / Brand Line (Top Right, or below logo depending on layout. Let's do right-aligned top)
    const tagline = brandLines?.length ? brandLines[0] : `${lawyerName} 변호사가 함께합니다`;
    ctx.font = `500 24px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(tagline, S - 64, 80);
    ctx.textAlign = "left";

    // Bottom Left minimal brand info
    ctx.fillStyle = accent;
    ctx.fillRect(64, S - 120, 32, 4);
    ctx.font = `900 36px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(officeName || "법률 사무소", 64, S - 90);

    // Profile Inset Card (Bottom Right)
    if (profileImg) {
        const cw = 280;
        const ch = 340;
        const cx = S - cw - 64;
        const cy = S - ch - 64;

        // Inset bg/border
        ctx.fillStyle = "#FFFFFF";
        roundRect(ctx, cx, cy, cw, ch, 8);
        ctx.fill();

        // Image within padded bounds
        const imgPad = 12;
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, cx + imgPad, cy + imgPad, cw - imgPad * 2, ch - imgPad * 2 - 80, 4);
        ctx.clip();
        drawCover(ctx, profileImg, cx + imgPad, cy + imgPad, cw - imgPad * 2, ch - imgPad * 2 - 80);
        ctx.restore();

        // Tag under info
        ctx.fillStyle = "#1A1A1A";
        ctx.font = `800 18px ${FONT_BOLD}`;
        ctx.textBaseline = "middle";
        ctx.fillText(`${lawyerName} 대표변호사`, cx + 24, cy + ch - 40);
        
        ctx.fillStyle = accent;
        ctx.font = `600 14px ${FONT_REGULAR}`;
        ctx.fillText("수석 파트너", cx + 24, cy + ch - 18);
    }
}
