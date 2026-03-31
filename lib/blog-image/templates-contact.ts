import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export async function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address } = input.profile;
    const { accent, officeImg, darkBg } = assets;

    // 1. Solid minimal background (Warm Flash Magazine Mode)
    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.3) saturate(0.85) brightness(1.15)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        
        // Warm Cream Beige Tint via Multiply
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();

        // 85% shadow mask to preserve legibility for the signature typography
        ctx.fillStyle = "rgba(28, 28, 30, 0.85)";
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "rgba(28, 28, 30, 1)"; // Deep studio dark
        ctx.fillRect(0, 0, S, S);
    }

    const pad = 120; // Maximum safe area margins

    // 2. The Signature Core
    // We remove all shapes, buttons, and noisy UI boxes.
    // Pure typography. 
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Top message
    ctx.font = `600 24px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("더 늦기 전에 상담을 시작하십시오.", S / 2, 280);

    // Giant Phone Number
    if (phone) {
        ctx.fillStyle = "#FFFFFF";
        drawAutoShrinkText(
            ctx,
            phone,
            S / 2, // Centered X
            340,
            S - pad * 2,
            120,    
            96, // start massive
            FONT_BLACK,
            "900",
            { shadow: false }
        );
    }

    // Divider
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(S / 2 - 40, 500, 80, 2);

    // Firm & Lawyer Name Hierarchy
    ctx.font = `800 24px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.fillText(`${officeName || "법률 서비스"} 대표변호사 ${lawyerName}`, S / 2, 560);

    // Address Details if Any (Very small and clean)
    if (address) {
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        drawAutoShrinkText(
            ctx,
            address,
            S / 2, // Centered X
            620,
            S - pad * 2,
            60,
            16,
            FONT_REGULAR,
            "500",
            { shadow: false }
        );
    }

    // Apply strict 3~5% film grain overlay (Texture) for human warmth
    await drawFilmGrain(ctx, 0.04);
}
