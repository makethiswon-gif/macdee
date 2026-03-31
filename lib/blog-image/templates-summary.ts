import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg, officeImg } = assets;

    // 1. Warm Cream Beige Background with optional faint image
    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.3) saturate(0.85) brightness(1.15)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        
        ctx.fillStyle = "rgba(244, 240, 230, 0.9)"; // 90% opaque warm beige
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
    }
    
    // Add film grain texture
    drawFilmGrain(ctx, 0.03);

    // 2. Pure Typography Focus
    const pad = 120; // Safe margins
    ctx.textBaseline = "top";

    if (logoImg) {
        // Discreet logo at bottom right or top right
        const lh = 30;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.filter = "grayscale(100%) opacity(0.5)"; // discrete
        ctx.drawImage(logoImg, S - pad - lw, pad, lw, lh);
        ctx.filter = "none";
    }

    // 3. Giant Left-aligned Typography 
    // Join points into one continuous message if there are multiple.
    let textBody = "";
    if (summaryPoints.length > 0) {
        textBody = summaryPoints.join("\n");
        if (textBody.length > 100) {
            textBody = summaryPoints.slice(0, 2).join("\n"); 
        }
    } else {
        textBody = "문제의 핵심을 정확히 파악하여 빠르고 유리하게 대응하세요.";
    }

    // The Quote Mark (Top Left)
    ctx.textAlign = "left";
    // Using deep dark pure black tone
    ctx.fillStyle = "#1C1C1E"; 
    ctx.font = `900 120px serif`; 
    ctx.fillText("“", pad, pad + 60);

    // Highlighting marker logic
    // Using a light, washed-out version of the accent color mapped cleanly to beige
    // Transparent tint acts exactly like a marker highlight.
    const highlighterOpacity = 0.35;

    // The Core Message (Massive size, left aligned)
    ctx.fillStyle = "#1C1C1E";

    drawAutoShrinkText(
        ctx,
        textBody,
        pad,          // Left aligned
        pad + 260,
        S - pad * 2,
        450,          // Max height before shrinking
        76,           // Max Initial Font (Extremely massive)
        FONT_BLACK,
        "900",
        {
            shadow: false,
            highlightPattern: { color: rgba(accent, highlighterOpacity), type: "first-line" }
        }
    );
}
