import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderBrandTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    // 1. Full Office Photo with Grayscale and Heavy Overlays (The Mood)
    if (officeImg) {
        ctx.save();
        ctx.filter = "grayscale(100%) blur(4px)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();

        // 90% Ultra Dark overlay for complete mood control and perfect legibility
        ctx.fillStyle = "rgba(8, 10, 15, 0.9)";
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "#080A0F"; // Very dark void
        ctx.fillRect(0, 0, S, S);
    }

    // Gentle vertical vignette
    const topGrad = ctx.createLinearGradient(0, 0, 0, S);
    topGrad.addColorStop(0, "rgba(0,0,0,0.4)");
    topGrad.addColorStop(0.5, "transparent");
    topGrad.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, S, S);

    // 2. Center Focus Typography (Single Elegant Tagline)
    const tagline = brandLines?.length ? brandLines[0] : `${lawyerName} 변호사가 함께합니다`;
    const pad = 120; // safe zone
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Draw the tagline exactly in the center
    const textCenterY = S / 2 - 40;
    
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(
        ctx,
        tagline,
        pad,
        textCenterY,
        S - pad * 2,
        200,
        56, // starting Large but elegant
        FONT_BLACK,
        "900",
        { shadow: false }
    );

    // Accent mini-divider
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 20, textCenterY + 120, 40, 2);

    // Office Identity Name
    ctx.font = `600 20px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName} 변호사`, S / 2, textCenterY + 160);

    // 3. Top Bottom Sub-branding
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    if (logoImg) {
        const lh = 40;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 80, lw, lh);
    }

}
