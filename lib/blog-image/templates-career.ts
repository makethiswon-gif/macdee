import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawFilmGrain, drawWrappedText, drawAutoShrinkText,
    type RenderInput, type Assets, hasTransparency, rgba
} from "./renderer";

const S = SIZE;

export function renderCareerTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career, brandLines } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // 1. Background Base (Warm Dark Aesthetic)
    if (officeImg) {
        ctx.save();
        // Darkened, desaturated, high contrast
        ctx.filter = "contrast(1.2) saturate(0.8) brightness(0.55)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();

        // Warm Cream Beige Tint via Multiply
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#E8E2D2";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
    } else {
        // Solid dark grey/brown fallback
        ctx.fillStyle = "#2E2A27";
        ctx.fillRect(0, 0, S, S);
    }

    // Apply Deep Shadows (깊은 그림자) specifically from left to right 
    // to give depth to text and make the right side brighter for the person
    const shadowGrad = ctx.createLinearGradient(0, 0, S, 0);
    shadowGrad.addColorStop(0, "rgba(20, 18, 16, 0.95)"); // Deep studio black/brown
    shadowGrad.addColorStop(0.5, "rgba(20, 18, 16, 0.7)");
    shadowGrad.addColorStop(1, "rgba(20, 18, 16, 0.2)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, S, S);

    // FILM GRAIN
    drawFilmGrain(ctx, 0.04);

    // 2. Large Watermark Typography at the top
    const watermarkText = officeName ? officeName.toUpperCase() : "ATTORNEY PROFILE";
    ctx.font = `900 160px ${FONT_BLACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // Stretch tracking/letter-spacing by drawing character by character if needed, 
    // or just rely on the large font size.
    ctx.fillText(watermarkText, 30, 0);

    // 3. Draw Photo on the Right
    if (profileImg) {
        const isCutout = hasTransparency(profileImg);
        if (isCutout) {
            // Cutout (누끼): Draw full scale standing on bottom right
            const targetH = S * 0.9;
            let scale = targetH / profileImg.height;
            let targetW = profileImg.width * scale;

            // Constrain width so it doesn't cover text (Max 60% of canvas)
            const maxW = S * 0.65;
            if (targetW > maxW) {
                scale = maxW / profileImg.width;
                targetW = profileImg.width * scale;
            }

            const dx = S - targetW - 20; 
            const dy = S - profileImg.height * scale;

            ctx.drawImage(profileImg, dx, dy, targetW, profileImg.height * scale);
        } else {
            // Standard photo fallback: Draw a fading photo on the right
            ctx.save();
            const maskGrad = ctx.createLinearGradient(S * 0.4, 0, S, 0);
            maskGrad.addColorStop(0, "rgba(0,0,0,0)");
            maskGrad.addColorStop(0.5, "rgba(0,0,0,1)");
            maskGrad.addColorStop(1, "rgba(0,0,0,1)");
            
            // Apply mask
            ctx.globalCompositeOperation = "destination-in";
            // Wait, we need to draw image first, then mask it? 
            // Better to clip or draw image with globalAlpha.
            ctx.restore();

            // Simple block with soft edges
            const w = S * 0.6;
            const h = S;
            const dx = S - w;
            ctx.save();
            ctx.rect(dx, 0, w, h);
            ctx.clip();
            ctx.globalAlpha = 0.8;
            drawCover(ctx, profileImg, dx, 0, w, h);
            ctx.restore();
            
            // Fade out the left edge of the photo
            ctx.fillStyle = shadowGrad;
            ctx.fillRect(0, 0, S, S);
        }
    }

    // 4. Typography Content Area (Left side)
    const padX = 100;
    const contentMaxW = S * 0.55;
    let currY = 140; // Starting Y position (raised significantly)

    // Category / Office Label (Very small top accent)
    if (officeName) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = `600 14px ${FONT_REGULAR}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(officeName, padX, currY);
        // Underline
        ctx.fillRect(padX, currY + 24, 24, 1);
        currY += 45;
    }

    // Lawyer Name & Title Row
    // Name is huge, Title is smaller next to it or below it
    ctx.font = `900 80px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    const nameMet = ctx.measureText(lawyerName);
    ctx.fillText(lawyerName, padX, currY);
    
    // Title & OfficeName combined
    const titleText = `${officeName}\n${jobTitle}`;
    ctx.font = `400 22px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    drawWrappedText(ctx, titleText, padX + nameMet.width + 24, currY + 22, contentMaxW - nameMet.width - 24, 30);
    
    currY += 120; // Move below name

    currY += 50; // Add space between name and divider

    // Divider Line
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(padX, currY, 60, 2);
    currY += 30;

    // "경력" (Career) Label
    ctx.font = `700 22px ${FONT_BOLD}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("경력", padX, currY);
    currY += 45;

    // Career List Items
    if (career && career.length > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        
        const formattedItems = career.map(item => {
            if (item === null || item === undefined) return "";
            if (item.trim() === "") return ""; // keep empty line as pure empty string
            const trimmed = item.trim();
            const hasBullet = trimmed.startsWith("-") || trimmed.startsWith("·");
            return hasBullet ? trimmed : `· ${trimmed}`;
        });
        
        const careerText = formattedItems.join("\n");
        const remainingHeight = S - currY - 60; // 60px bottom padding

        drawAutoShrinkText(
            ctx,
            careerText,
            padX,
            currY,
            contentMaxW,
            remainingHeight,
            20, // initial maximum font size
            FONT_REGULAR,
            "500",
            { shadow: false, minFontSize: 12 }
        );
    }

}
