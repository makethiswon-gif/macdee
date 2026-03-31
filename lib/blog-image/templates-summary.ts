import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg, officeImg, darkBg } = assets;

    const mainSentence = summaryPoints.length > 0 ? summaryPoints[0] : "문제의 핵심을 정확히 파악하여 빠르고 유리하게 대응하세요.";
    const secondaryPoint = summaryPoints.length > 1 ? summaryPoints[1] : "";
    const pad = 120; // Maximum safe area margins

    // Randomize Layouts (0: Classic Center, 1: Cinematic Left, 2: Cinematic Right)
    const layout = Math.floor(Math.random() * 3);

    // --- BACKGROUND RENDER ---
    if (officeImg) {
        // Cinematic Office Background for all layouts
        ctx.save();
        ctx.filter = "contrast(1.2) grayscale(60%)"; 
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        
        // Heavy studio shadow to make white text completely readable
        ctx.fillStyle = "rgba(28, 28, 30, 0.88)";
        ctx.fillRect(0, 0, S, S);

        // Add a subtle vignette targeting the alignment side
        if (layout === 1 || layout === 2) {
            const gradX0 = layout === 1 ? 0 : S;
            const gradX1 = layout === 1 ? S : 0;
            const alignGrad = ctx.createLinearGradient(gradX0, 0, gradX1, 0);
            alignGrad.addColorStop(0, "rgba(10,10,12,0.6)");
            alignGrad.addColorStop(1, "transparent");
            ctx.fillStyle = alignGrad;
            ctx.fillRect(0, 0, S, S);
        } else {
            // Center emphasis for layout 0
            const alignGrad = ctx.createRadialGradient(S/2, S, 0, S/2, S, S*0.8);
            alignGrad.addColorStop(0, "rgba(10,10,12,0.6)");
            alignGrad.addColorStop(1, "transparent");
            ctx.fillStyle = alignGrad;
            ctx.fillRect(0, 0, S, S);
        }
    } else {
        // Fallback: Solid minimal background (Deep Editorial Navy) if no photo
        ctx.fillStyle = darkBg;
        ctx.fillRect(0, 0, S, S);
        const g1 = ctx.createRadialGradient(0, S, 0, 0, S, S * 0.4);
        g1.addColorStop(0, rgba(accent, 0.08));
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, S, S);
    }

    drawFilmGrain(ctx, 0.03);

    // --- TYPOGRAPHY RENDER ---
    ctx.textBaseline = "top";
    
    // Determine Alignment Metrics
    let align = "center";
    let textX = S / 2;
    let logoX = S / 2;
    let quoteX = S / 2;

    if (layout === 1) {
        align = "left";
        textX = pad;
        logoX = pad;
        quoteX = pad;
    } else if (layout === 2) {
        align = "right";
        textX = S - pad;
        logoX = S - pad;
        quoteX = S - pad;
    }

    ctx.textAlign = align as any;

    // 1. Logo (Discreet)
    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        let drawX = logoX;
        if (align === "center") drawX -= lw / 2;
        if (align === "right") drawX -= lw;
        
        ctx.drawImage(logoImg, drawX, pad, lw, lh);
    }

    // 2. The Quote Mark
    ctx.fillStyle = accent;
    ctx.font = `900 120px serif`; 
    ctx.fillText("“", quoteX, pad + 80);

    // 3. The Core Message (Massive size, auto shrinks if too long)
    ctx.fillStyle = "#FFFFFF";
    
    // X Anchor for drawAutoShrinkText (it handles alignment internally if configured)
    const { height: textH } = drawAutoShrinkText(
        ctx,
        mainSentence,
        textX, 
        pad + 240,
        S - pad * 2,
        320,   // Max height before shrinking
        64,    // Max Initial Font
        FONT_BLACK,
        "900",
        { shadow: false }
    );

    // 4. Optional Secondary Explanation Block right below
    if (secondaryPoint) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        
        // Draw Accent Line
        let lineX = textX;
        if (align === "center") lineX = textX - 30;
        else if (align === "right") lineX = textX - 60;
        ctx.fillRect(lineX, pad + 240 + textH + 50, 60, 2);
        
        drawAutoShrinkText(
            ctx,
            secondaryPoint,
            textX,
            pad + 240 + textH + 80,
            S - pad * 2,
            120,
            24,
            FONT_REGULAR,
            "500",
            { shadow: false }
        );
    }
}
