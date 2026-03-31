import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, rgba, hasTransparency, roundRect, drawFilmGrain,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // 1. Background Base (Warm & Flash Aesthetic)
    if (officeImg) {
        ctx.save();
        // On-camera flash look: hard contrast, slightly desaturated, bright exposed
        ctx.filter = "contrast(1.3) saturate(0.85) brightness(1.15)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();

        // Warm Cream Beige Tint via Multiply
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
    } else {
        // Solid Cream Beige fallback
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
    }

    const isCutout = hasTransparency(profileImg);
    
    // The user explicitly requested the portrait to ALWAYS be on the bottom right.
    let layout = 0; // 0 represents: Title Left, Photo Right
    const pad = 80;

    // Default typography values
    let textX = pad;
    let textY = S / 2 - 200;
    let textAlign: "left" | "right" | "center" = "left";
    let maxTextW = S * 0.5 - pad * 1.5;

    // The Layouts and Shadows
    let shadowGrad;
    if (layout === 0) {
        // Variant 0: Title Left, Photo Right
        textAlign = "left";
        textX = pad;
        maxTextW = S * 0.55;
        // Shadow on the left to support white text
        shadowGrad = ctx.createLinearGradient(0, 0, S * 0.7, 0);
    } else if (layout === 1) {
        // Variant 1: Title Right, Photo Left
        textAlign = "right";
        textX = S - pad;
        maxTextW = S * 0.55;
        // Shadow on the right to support white text
        shadowGrad = ctx.createLinearGradient(S, 0, S * 0.3, 0);
    } else {
        // Variant 2: Title Center Top, Photo Center Bottom
        textAlign = "center";
        textX = S / 2;
        textY = pad + 40;
        maxTextW = S - pad * 2;
        // Shadow on the top to support white text
        shadowGrad = ctx.createLinearGradient(0, 0, 0, S * 0.6);
    }

    // Apply Deep Shadows (깊은 그림자) for text readability
    shadowGrad.addColorStop(0, "rgba(28, 28, 30, 0.95)"); // Deep studio black
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, S, S);

    // FILM GRAIN applied over background but underneath portraits/text
    drawFilmGrain(ctx, 0.03);

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
            const dropGrad = ctx.createLinearGradient(0, frameY + frameH - 120, 0, frameY + frameH);
            dropGrad.addColorStop(0, "transparent");
            // Match the deep studio black of the shadow
            dropGrad.addColorStop(1, "rgba(28, 28, 30, 0.95)");
            ctx.fillStyle = dropGrad;
            ctx.beginPath();
            // Since custom roundRect handles simple shapes, use it for the gradient block too
            roundRect(ctx, frameX + 8, frameY + frameH - 120, frameW - 16, 120, Math.max(0, r - 8));
            ctx.fill();
        }
    }

    // TYPOGRAPHY
    ctx.textBaseline = "top";
    ctx.textAlign = textAlign;

    // Category Badges (POST + Multiple Specialties)
    let badges = ["POST"];
    const rawSpecialties = input.profile.specialty || [];
    if (rawSpecialties.length > 0) {
        rawSpecialties.forEach(spec => {
            spec.split(",").forEach(part => {
                const trimmed = part.trim();
                // Max 3 badges total to keep design clean and avoid overlapping title too much
                if (trimmed && badges.length < 3) badges.push(trimmed);
            });
        });
    }

    const badgeH = 34;
    const badgeGap = 8;
    const totalBadgesHeight = badges.length * (badgeH + badgeGap);
    const startY = textY - 16 - totalBadgesHeight;
    
    for (let i = 0; i < badges.length; i++) {
        const text = badges[i];
        ctx.font = `700 18px ${FONT_BOLD}`;
        const met = ctx.measureText(text);
        const badgeW = met.width + 24;

        let bx = textX;
        if (textAlign === "center") bx = S / 2 - badgeW / 2;
        else if (textAlign === "right") bx = textX - badgeW;
        
        // Highlight first badge (Name) with accent color, remaining use a sharp deep studio black
        ctx.fillStyle = i === 0 ? accent : "rgba(28, 28, 30, 0.95)";
        
        const by = startY + i * (badgeH + badgeGap);
        ctx.fillRect(bx, by, badgeW, badgeH);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(text, bx + 12, by + 9);
    }

    // Title (White on Deep Shadow)
    // For layout 2 (Center top), textY is 120, max height is 300
    // For layout 0,1, textY is ~300, max height is 400
    const maxTitleH = layout === 2 ? 300 : S * 0.45; 
    
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(
        ctx, 
        title, 
        textX, 
        textY, 
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
