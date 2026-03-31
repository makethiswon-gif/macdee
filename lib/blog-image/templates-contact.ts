import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, rgba, drawCircleImage, drawWrappedText, roundRect, drawFilmGrain,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

type Img = import("@napi-rs/canvas").Image | null;

export async function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address } = input.profile;
    const { accent, profileImg, officeImg, logoImg } = assets;

    // Background: Office Details with warm overlay
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
        
        // Warm/dark gradient overlay
        const grad = ctx.createLinearGradient(0, S * 0.2, 0, S);
        grad.addColorStop(0, "rgba(20, 15, 12, 0.45)"); // Slight warm dark tint
        grad.addColorStop(1, "rgba(10, 8, 8, 0.95)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "#161311"; // Warm dark base
        ctx.fillRect(0, 0, S, S);
    }

    // Top Right Logo
    if (logoImg) {
        const lh = 40;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S - lw - 64, 64, lw, lh);
    }

    // Centered layout block
    const maxW = S - 128;
    const cx = S / 2;

    // Natural/Side profile (circular or pill cutout) in center
    if (profileImg) {
        // Draw soft circular profile centered
        drawCircleImage(ctx, profileImg, cx, 300, 160, "rgba(255,255,255,0.05)", 2);
    }

    // Gentle CTA messaging
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    // Main Persuasion Copy
    ctx.font = `800 36px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("혼자 고민하지 마세요", cx, 520);
    
    ctx.font = `600 20px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("정확한 핵심 쟁점 진단, 지금 변호사와 직접 확인하세요", cx, 576);

    // Call Actions Container
    const cardY = 660;
    const cardH = 180;
    ctx.fillStyle = rgba(accent, 0.15); // soft accent box
    roundRect(ctx, 64, cardY, S - 128, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = rgba(accent, 0.3);
    ctx.lineWidth = 1;
    roundRect(ctx, 64, cardY, S - 128, cardH, 24);
    ctx.stroke();

    // Splitting Contact Info cleanly
    const isLayoutSplit = phone && address;
    
    ctx.textAlign = "left";
    
    if (phone) {
        // "전화문의" label
        ctx.font = `600 15px ${FONT_BOLD}`;
        ctx.fillStyle = rgba(accent, 0.9);
        ctx.fillText("대표 전화상담", 104, cardY + 36);
        
        ctx.font = `800 38px ${FONT_BLACK}`;
        ctx.fillStyle = "#FFFFFF";
        // Phone number string could be quite long.
        drawWrappedText(ctx, phone, 104, cardY + 68, (isLayoutSplit ? maxW / 2 - 40 : maxW - 40), 46, { maxLines: 2 });
    }
    
    if (address) {
        const ax = isLayoutSplit ? S / 2 + 10 : 104;
        
        // Vertical divider if split
        if (isLayoutSplit) {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(S / 2 - 20, cardY + 32, 2, cardH - 64);
        }

        ctx.font = `600 15px ${FONT_BOLD}`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("방문 상담 주소", ax, cardY + 36);
        
        ctx.font = `500 18px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        drawWrappedText(ctx, address, ax, cardY + 70, (isLayoutSplit ? maxW / 2 - 40 : maxW - 40), 28, { maxLines: 3 });
    }

    ctx.textAlign = "left";

    // Sub signature at bottom left
    ctx.font = `600 14px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(`${lawyerName} 변호사 · ${officeName || "법률 서비스"}`, 64, S - 64);

    // Apply strict 3~5% film grain overlay (Texture)
    await drawFilmGrain(ctx, 0.04);
}
