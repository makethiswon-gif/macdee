import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, rgba, drawWrappedText,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

type Img = import("@napi-rs/canvas").Image | null;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, profileImg, officeImg, logoImg } = assets;

    // 6:4 Split Layout
    // Left 60% = Text area, Right 40% = Image area
    const leftW = S * 0.6;
    const rightW = S * 0.4;

    // Right side: Profile or Detail Image
    ctx.save();
    ctx.beginPath();
    ctx.rect(leftW, 0, rightW, S);
    ctx.clip();
    if (profileImg) {
        // Slightly desaturated or rich photo
        drawCover(ctx, profileImg, leftW, 0, rightW, S);
    } else if (officeImg) {
        drawCover(ctx, officeImg, leftW, 0, rightW, S);
    } else {
        ctx.fillStyle = "#1e2430";
        ctx.fillRect(leftW, 0, rightW, S);
    }
    // Deep overlay on the photo side to blend with the dark editorial look
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(leftW, 0, rightW, S);
    ctx.restore();

    // Left side: Dark solid/gradient background
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, leftW, S);
    ctx.clip();
    
    // Base dark navy/black
    ctx.fillStyle = "#0D1117";
    ctx.fillRect(0, 0, leftW, S);
    
    // Subtle gradient mesh matching accent
    const g1 = ctx.createRadialGradient(0, S, 0, 0, S, S * 0.5);
    g1.addColorStop(0, rgba(accent, 0.1));
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, leftW, S);

    // Accent line at top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, leftW, 6);

    // Typography
    const pad = 64;
    ctx.textBaseline = "top";

    if (logoImg) {
        const lh = 40;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, pad, pad, lw, lh);
    }

    // Point 1 - Huge and Bold (Typographic Hierarchy)
    const pt1 = summaryPoints.length > 0 ? summaryPoints[0] : "사건의 핵심 쟁점을 파악하는 것이 우선입니다.";
    const pt2 = summaryPoints.length > 1 ? summaryPoints[1] : "법률 전문가의 조력을 통해 빠르고 정확하게 대응하세요.";
    const remainingPts = summaryPoints.length > 2 ? summaryPoints.slice(2, 5) : []; // Up to 3 more small points

    ctx.font = `900 42px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    
    // Top highlight mark
    ctx.fillStyle = accent;
    ctx.font = `900 80px serif`; // Quote mark
    ctx.fillText("“", pad - 10, 140);
    
    // Draw Point 1
    ctx.font = `900 42px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    const pt1H = drawWrappedText(ctx, pt1, pad, 190, leftW - pad * 2, 60, { maxLines: 4 });

    // Draw Point 2 (Medium text for secondary hierarchy)
    ctx.font = `600 24px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const pt2H = drawWrappedText(ctx, pt2, pad, 190 + pt1H + 32, leftW - pad * 2, 38, { maxLines: 3 });

    // Draw remaining points as small bullets if any
    let bulletY = 190 + pt1H + 32 + pt2H + 48;
    if (remainingPts.length > 0) {
        remainingPts.forEach((pt) => {
            // Bullet
            ctx.beginPath();
            ctx.arc(pad + 6, bulletY + 12, 4, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.fill();

            ctx.font = `400 18px ${FONT_REGULAR}`;
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            const bh = drawWrappedText(ctx, pt, pad + 24, bulletY, leftW - pad * 2 - 24, 28, { maxLines: 2 });
            bulletY += bh + 20;
        });
    }

    ctx.restore();
}
