import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawGradientOverlay, drawWrappedText, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

type Img = import("@napi-rs/canvas").Image | null;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, profileImg, officeImg, logoImg } = assets;

    // Background: Office with 20% dark overlay
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "#1e2430";
        ctx.fillRect(0, 0, S, S);
    }
    
    // Gradient overlay to ensure text is readable on the left
    const grad = ctx.createLinearGradient(0, 0, S * 0.7, 0);
    grad.addColorStop(0, "rgba(0,0,0,0.8)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.4)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Profile Photo on the right (taking ~40% of screen)
    if (profileImg) {
        // Draw profile image covering the right side
        // Profile should fill a box of roughly W=400, H=SIZE, aligned to right
        const pw = S * 0.45;
        // Keep aspect ratio
        const scale = Math.max(pw / profileImg.width, S / profileImg.height);
        const drawW = profileImg.width * scale;
        const drawH = profileImg.height * scale;
        // Position at right edge, aligned to bottom
        const dx = S - pw; // exactly pin to right bound pw
        const dy = S - drawH;
        
        ctx.save();
        ctx.beginPath();
        // Mask it so it only occupies the right 45% neatly, or soft gradient mask
        ctx.rect(dx, 0, pw, S);
        ctx.clip();
        
        // Actually, just drawing it large looks better if it's a person
        ctx.drawImage(profileImg, dx + (pw - drawW)/2, dy, drawW, drawH);
        ctx.restore();
        
        // Overlap a small gradient at the bottom of profile to fade it down
        const pGrad = ctx.createLinearGradient(0, S - 150, 0, S);
        pGrad.addColorStop(0, "transparent");
        pGrad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = pGrad;
        ctx.fillRect(dx, S - 150, pw, 150);
    }

    // Logo
    if (logoImg) {
        const lh = 48;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, 64, 64, lw, lh);
    }

    // Top Brand Line
    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.fillText(`${officeName || "법률 전문"} · ${lawyerName} 변호사`, 64, logoImg ? 144 : 80);

    // Title (Max 2 lines, large typography)
    ctx.font = `900 68px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    // x=64, y=centered roughly around 340
    // maxWidth = remaining space minus padding
    const maxTextWidth = profileImg ? S * 0.55 - 64 : S - 128;
    
    // Draw text with maxLines = 2
    const totalLinesH = drawWrappedText(ctx, title, 64, 280, maxTextWidth, 88, { maxLines: 2, shadow: true });

    // Decorative Accent Bar below title
    ctx.fillStyle = accent;
    ctx.fillRect(64, 280 + totalLinesH + 32, 60, 6);
}
