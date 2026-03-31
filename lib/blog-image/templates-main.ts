import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, rgba, roundRect,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // 1. Background: Grayscale blurred office photo with heavy dark overlay
    if (officeImg) {
        ctx.save();
        ctx.filter = "grayscale(100%) blur(6px)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();

        // 85% Dark overlay to kill messy details completely
        ctx.fillStyle = rgba(darkBg, 0.85);
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = darkBg; // Deep brand dark
        ctx.fillRect(0, 0, S, S);
    }

    const pad = 80; // Massive margins
    const rightW = profileImg ? S * 0.45 : 0;
    const leftW = profileImg ? S - rightW - pad + 40 : S - pad * 2;

    // 2. Profile Photo (structured inset frame, NOT floating cutout)
    if (profileImg) {
        const frameW = 420;
        const frameH = 680;
        const frameX = S - pad - frameW + 20; // slightly pushed right
        const frameY = (S - frameH) / 2;

        // Pill-shaped elegant border
        const r = Math.min(frameW, frameH) / 2; // Perfect semicircle on top and bottom

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        roundRect(ctx, frameX, frameY, frameW, frameH, r);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, frameX + 8, frameY + 8, frameW - 16, frameH - 16, r - 8);
        ctx.clip();
        
        ctx.filter = "contrast(1.05) saturate(0.95)"; // slight cinematic grade
        drawCover(ctx, profileImg, frameX + 8, frameY + 8, frameW - 16, frameH - 16);
        ctx.restore();

        // Subtle gradient mask at bottom of the inset frame to blend it into the void
        const dropGrad = ctx.createLinearGradient(0, frameY + frameH - 100, 0, frameY + frameH);
        dropGrad.addColorStop(0, "transparent");
        dropGrad.addColorStop(1, rgba(darkBg, 0.95));
        ctx.fillStyle = dropGrad;
        ctx.fillRect(frameX + 8, frameY + frameH - 100, frameW - 16, 100);
    }

    // 3. Typography
    ctx.textBaseline = "top";
    
    // Top Bar (Accent dot)
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad, 12, 12);
    
    // Office Name
    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(officeName || "법률 서비스", pad + 24, pad - 2);

    // Giant Title using drawAutoShrinkText
    // We want it visually centered vertically in relation to the frame
    ctx.fillStyle = "#FFFFFF";
    
    const maxTitleH = S * 0.45; 
    const centerY = S / 2 - maxTitleH / 2;
    
    drawAutoShrinkText(
        ctx, 
        title, 
        pad, 
        centerY + 40, 
        leftW - pad, 
        maxTitleH, 
        88, 
        FONT_BLACK, 
        "900", 
        { shadow: false } // pure flat
    );

    // Bottom Signature 
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(pad, S - pad - 40, 40, 2);
    
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${lawyerName} 대표변호사`, pad, S - pad - 24);
}
