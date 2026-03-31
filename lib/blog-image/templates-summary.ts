import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawAutoShrinkText, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg } = assets;

    // 1. Solid minimal background
    // Base dark navy/black (Deep Editorial Navy)
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, S, S);
    
    // Very subtle gradient matching accent
    const g1 = ctx.createRadialGradient(0, S, 0, 0, S, S * 0.4);
    g1.addColorStop(0, rgba(accent, 0.08));
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, S, S);

    // 2. Pure Typography Focus
    const pad = 120; // Maximum safe area margins
    ctx.textBaseline = "top";

    if (logoImg) {
        // Very small discreet logo top center
        const lh = 36;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad, lw, lh);
    }

    // 3. Giant Quote
    const mainSentence = summaryPoints.length > 0 ? summaryPoints[0] : "문제의 핵심을 정확히 파악하여 빠르고 유리하게 대응하세요.";
    const secondaryPoint = summaryPoints.length > 1 ? summaryPoints[1] : "";

    // The Quote Mark
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = `900 120px serif`; 
    ctx.fillText("“", S / 2, pad + 100);

    // The Core Message (Massive size, auto shrinks if too long)
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";

    const { height: textH } = drawAutoShrinkText(
        ctx,
        mainSentence,
        pad,
        pad + 260,
        S - pad * 2,
        280,   // Max height before shrinking
        64,    // Max Initial Font
        FONT_BLACK,
        "900",
        { shadow: false }
    );

    // Optional Secondary Explanation Block right below
    if (secondaryPoint) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(S / 2 - 30, pad + 260 + textH + 50, 60, 2);
        
        ctx.textAlign = "center";
        drawAutoShrinkText(
            ctx,
            secondaryPoint,
            pad,
            pad + 260 + textH + 80,
            S - pad * 2,
            120,
            24,
            FONT_REGULAR,
            "500",
            { shadow: false }
        );
    }
}
