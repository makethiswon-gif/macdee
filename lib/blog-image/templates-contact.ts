import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export async function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website, jobTitle } = input.profile;
    const { profileImg, officeImg, logoImg } = assets;

    // Use raw brand color (best for white background readability)
    const rawBrandColor = input.accentColor || input.profile.brandColor || "#2B4C7E";

    // White/Beige Card Background
    const paperColor = "#F9F8F4"; // Warm premium card paper
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, S, S);

    const leftW = Math.floor(S * 0.45); // Left photo width (45%)
    const rightW = S - leftW;
    const centerX = leftW + (rightW / 2);

    // 1. Left Side: Profile Image
    if (profileImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, S);
        ctx.clip();
        
        drawCover(ctx, profileImg, 0, 0, leftW, S);
        
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(leftW - 1, 0, 1, S);
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(leftW - 2, 0, 1, S);
        ctx.restore();
    } else if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, S);
        ctx.clip();
        
        ctx.filter = "grayscale(40%)";
        drawCover(ctx, officeImg, 0, 0, leftW, S);
        
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(leftW - 1, 0, 1, S);
        ctx.restore();
    } else {
        ctx.fillStyle = rawBrandColor;
        ctx.fillRect(0, 0, leftW, S);
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(leftW - 1, 0, 1, S);
    }

    // 2. Right Side: Card Information
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const baseText = "#333333";
    let currY = 170;

    // Name (Brand Color)
    ctx.fillStyle = rawBrandColor;
    ctx.font = `900 68px ${FONT_BLACK}`;
    ctx.fillText(lawyerName || "변호사", centerX, currY);
    currY += 60;

    // Title & Office
    ctx.font = `600 20px ${FONT_REGULAR}`;
    ctx.fillStyle = baseText;
    const titleStr = `${officeName || "법률사무소"} ${jobTitle || "대표변호사"}`;
    ctx.fillText(titleStr, centerX, currY);
    currY += 55;

    // Divider Line
    ctx.fillStyle = rawBrandColor;
    ctx.fillRect(centerX - 40, currY, 80, 2);
    currY += 75;

    // Address
    ctx.fillStyle = baseText;
    ctx.globalAlpha = 0.85;
    if (address) {
        drawAutoShrinkText(
            ctx,
            address,
            centerX,
            currY,
            rightW - 100,
            100,
            18,
            FONT_REGULAR,
            "500",
            { shadow: false, minFontSize: 14 }
        );
        currY += 100;
    } else {
        currY += 60;
    }

    // Phone
    ctx.globalAlpha = 1.0;
    if (phone) {
        const phones = phone.split(",").map(p => p.trim()).filter(Boolean);
        ctx.fillStyle = rawBrandColor;
        ctx.font = `800 32px ${FONT_BOLD}`;
        phones.forEach(p => {
            ctx.fillText(p, centerX, currY);
            currY += 48;
        });
        currY += 40;
    }

    // Website / Email
    if (website) {
        ctx.fillStyle = baseText;
        ctx.globalAlpha = 0.7;
        ctx.font = `400 18px ${FONT_REGULAR}`;
        ctx.fillText(website, centerX, currY);
        ctx.globalAlpha = 1.0;
    }

    // Logo at bottom
    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        const logoY = S - 150; 
        ctx.drawImage(logoImg, centerX - lw / 2, logoY, lw, lh);
    } else {
        ctx.fillStyle = rawBrandColor;
        ctx.font = `800 24px ${FONT_BOLD}`;
        ctx.fillText(officeName || "LAW FIRM", centerX, S - 120);
    }

    // Paper noise
    await drawFilmGrain(ctx, 0.04);
}
