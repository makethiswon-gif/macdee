import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, rgba, hasTransparency, roundRect,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // 1. Background base
    if (officeImg) {
        ctx.save();
        ctx.filter = "grayscale(100%) blur(6px)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();

        // 85% Dark overlay
        ctx.fillStyle = rgba(darkBg, 0.85);
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = darkBg; 
        ctx.fillRect(0, 0, S, S);
    }

    const isCutout = hasTransparency(profileImg);
    
    // Choose Random Layout Variant (0: Classic Right, 1: Classic Left, 2: Center Bottom)
    // To make sure variations are somewhat stable per input, we can use title length as a crude pseudo-random seed,
    // but the user wants it to change if they click "Re-generate", so Math.random() is perfect.
    const layout = Math.floor(Math.random() * 3);
    const pad = 80;

    // Default typography values
    let textX = pad;
    let textY = S / 2 - 200;
    let textAlign: "left" | "right" | "center" = "left";
    let maxTextW = S * 0.5 - pad * 1.5;

    // Determine coordinate spaces
    if (layout === 0) {
        // Variant A: Title Left, Photo Right
        textAlign = "left";
        textX = pad;
        maxTextW = S * 0.55;
    } else if (layout === 1) {
        // Variant B: Title Right, Photo Left
        textAlign = "right";
        textX = S - pad;
        maxTextW = S * 0.55;
    } else {
        // Variant C: Title Center Top, Photo Center Bottom
        textAlign = "center";
        textX = S / 2;
        textY = pad + 40;
        maxTextW = S - pad * 2;
    }

    // DRAW PHOTO FIRST if it's Center Bottom (so text overlays it if needed), 
    // or draw it after background. Actually, for clean look, draw Photo first, then text, 
    // but we want text to not be obscured. Let's draw photo first.
    if (profileImg) {
        if (isCutout) {
            // Cutout (누끼): Draw full scale standing on bottom
            // Height is usually 80% to 100% of canvas
            const initialTargetH = layout === 2 ? S * 0.7 : S * 0.85;
            let scale = initialTargetH / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = initialTargetH;

            // Prevent wide images from completely covering the sidebar text
            const maxW = layout === 2 ? S : S * 0.6;
            if (targetW > maxW) {
                scale = maxW / profileImg.width;
                targetW = profileImg.width * scale;
                targetH = profileImg.height * scale;
            }

            let dx = 0;
            let dy = S - targetH; // stick to bottom

            if (layout === 0) {
                dx = S - targetW - 40; // bottom right
            } else if (layout === 1) {
                dx = 40; // bottom left
            } else {
                dx = S / 2 - targetW / 2; // bottom center
            }

            ctx.drawImage(profileImg, dx, dy, targetW, targetH);
        } else {
            // Normal Photo: Draw inside Pill Frame
            let frameW = 420;
            let frameH = 680;
            let frameX = 0;
            let frameY = 0;

            if (layout === 0) {
                // Photo on right
                frameX = S - pad - frameW + 20;
                frameY = (S - frameH) / 2;
            } else if (layout === 1) {
                // Photo on left
                frameX = pad - 20;
                frameY = (S - frameH) / 2;
            } else {
                // Photo on bottom center
                frameW = 480;
                frameH = 480;
                frameX = S / 2 - frameW / 2;
                frameY = S - pad - frameH;
            }

            const r = Math.min(frameW, frameH) / 2;
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            roundRect(ctx, frameX, frameY, frameW, frameH, r);
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            roundRect(ctx, frameX + 8, frameY + 8, frameW - 16, frameH - 16, Math.max(0, r - 8));
            ctx.clip();
            ctx.filter = "contrast(1.05) saturate(0.95)";
            drawCover(ctx, profileImg, frameX + 8, frameY + 8, frameW - 16, frameH - 16);
            ctx.restore();
            
            // Smooth gradient mask inside pill
            const dropGrad = ctx.createLinearGradient(0, frameY + frameH - 100, 0, frameY + frameH);
            dropGrad.addColorStop(0, "transparent");
            dropGrad.addColorStop(1, rgba(darkBg, 0.95));
            ctx.fillStyle = dropGrad;
            ctx.beginPath();
            // Since custom roundRect handles simple shapes, use it for the gradient block too
            roundRect(ctx, frameX + 8, frameY + frameH - 100, frameW - 16, 100, Math.max(0, r - 8));
            ctx.fill();
        }
    }

    // TYPOGRAPHY
    ctx.textBaseline = "top";
    ctx.textAlign = textAlign;

    // Accent Dot / Office Name
    let topLabelX = textX;
    if (textAlign === "left") topLabelX += 24;
    else if (textAlign === "right") topLabelX -= 24;

    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(officeName || "법률 서비스", topLabelX, textY - 40);

    // Accent Dot
    ctx.fillStyle = accent;
    if (textAlign === "left") ctx.fillRect(textX, textY - 38, 12, 12);
    else if (textAlign === "right") ctx.fillRect(textX - 12, textY - 38, 12, 12);
    else if (textAlign === "center") {
        const met = ctx.measureText(officeName || "법률 서비스");
        ctx.fillRect(S / 2 - met.width / 2 - 24, textY - 38, 12, 12);
    }

    // Title
    ctx.fillStyle = "#FFFFFF";
    
    // For layout 2 (Center top), textY is 120, max height is 300
    // For layout 0,1, textY is ~300, max height is 400
    const maxTitleH = layout === 2 ? 300 : S * 0.45; 
    
    drawAutoShrinkText(
        ctx, 
        title, 
        textX, 
        textY + 10, 
        maxTextW, 
        maxTitleH, 
        88, 
        FONT_BLACK, 
        "900", 
        { shadow: false }
    );

    // Bottom Signature
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `600 16px ${FONT_REGULAR}`;

    if (layout === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(pad, S - pad - 40, 40, 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(`${lawyerName} 대표변호사`, pad, S - pad - 24);
    } else if (layout === 1) {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(S - pad - 40, S - pad - 40, 40, 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(`${lawyerName} 대표변호사`, S - pad, S - pad - 24);
    } // If layout is 2, the bottom signature isn't as necessary because photo covers it, or we draw it carefully.
    else if (layout === 2 && !profileImg) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(`${lawyerName} 대표변호사`, S / 2, S - pad - 24);
    }
}
