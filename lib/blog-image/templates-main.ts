import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawCover, drawAutoShrinkText, rgba, hasTransparency, roundRect, drawFilmGrain,
    type RenderInput, type Assets, hexToRgb
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderMainTrendy(ctx, input, assets);
        case "cool": return renderMainCool(ctx, input, assets);
        case "warm": return renderMainWarm(ctx, input, assets);
        case "traditional": return renderMainTraditional(ctx, input, assets);
        case "classic":
        default: return renderMainClassic(ctx, input, assets);
    }
}

// ==========================================
// 1. CLASSIC (기존 중후/보수 스타일)
// ==========================================
function renderMainClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // Background
    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.3) saturate(0.85) brightness(1.15)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
    } else {
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
    }

    const isCutout = hasTransparency(profileImg);
    let layout = 0; // Title Left, Photo Right
    const pad = 80;
    let textX = pad;
    let textY = S / 2 - 200;
    let textAlign: "left" | "right" | "center" = "left";
    let maxTextW = S * 0.55;

    const shadowGrad = ctx.createLinearGradient(0, 0, S * 0.7, 0);
    shadowGrad.addColorStop(0, "rgba(28, 28, 30, 0.95)");
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.03);

    if (profileImg) {
        if (isCutout) {
            const initialTargetH = S * 0.85;
            let scale = initialTargetH / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = initialTargetH;
            const maxW = S * 0.6;
            if (targetW > maxW) {
                scale = maxW / profileImg.width;
                targetW = profileImg.width * scale;
                targetH = profileImg.height * scale;
            }
            ctx.drawImage(profileImg, S - targetW - 40, S - targetH, targetW, targetH);
        } else {
            let frameW = 420;
            let frameH = 680;
            let frameX = S - pad - frameW + 20;
            let frameY = (S - frameH) / 2;
            const r = Math.min(frameW, frameH) / 2;
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            roundRect(ctx, frameX, frameY, frameW, frameH, r);
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            roundRect(ctx, frameX + 8, frameY + 8, frameW - 16, frameH - 16, Math.max(0, r - 8));
            ctx.clip();
            ctx.filter = "contrast(1.05) saturate(0.95)";
            drawCover(ctx, profileImg, frameX + 8, frameY + 8, frameW - 16, frameH - 16);
            ctx.restore();
            
            const dropGrad = ctx.createLinearGradient(0, frameY + frameH - 120, 0, frameY + frameH);
            dropGrad.addColorStop(0, "transparent");
            dropGrad.addColorStop(1, "rgba(28, 28, 30, 0.95)");
            ctx.fillStyle = dropGrad;
            ctx.beginPath();
            roundRect(ctx, frameX + 8, frameY + frameH - 120, frameW - 16, 120, Math.max(0, r - 8));
            ctx.fill();
        }
    }

    ctx.textBaseline = "top";
    ctx.textAlign = textAlign;

    let badges = ["POST"];
    const rawSpecialties = input.profile.specialty || [];
    if (rawSpecialties.length > 0) {
        rawSpecialties.forEach(spec => {
            spec.split(",").forEach(part => {
                const trimmed = part.trim();
                if (trimmed && badges.length < 3) badges.push(trimmed);
            });
        });
    }

    const badgeH = 34;
    const badgeGap = 8;
    const startY = textY - 16 - (badges.length * (badgeH + badgeGap));
    
    for (let i = 0; i < badges.length; i++) {
        const text = badges[i];
        ctx.font = `700 18px ${FONT_BOLD}`;
        const met = ctx.measureText(text);
        const badgeW = met.width + 24;

        ctx.fillStyle = i === 0 ? accent : "rgba(28, 28, 30, 0.95)";
        ctx.beginPath();
        ctx.fillRect(textX, startY + i * (badgeH + badgeGap), badgeW, badgeH);
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(text, textX + 12, startY + i * (badgeH + badgeGap) + 9);
    }

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, textX, textY, maxTextW, S * 0.45, 88, FONT_BLACK, "900", { shadow: false });

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(pad, S - pad - 40, 40, 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 대표변호사`, pad, S - pad - 24);
}

// ==========================================
// 2. TRENDY (젊고 감각적인)
// ==========================================
function renderMainTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, darkBg } = assets;
    
    // Very dark background
    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);
    
    // Vivid Accent Shape
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(S * 0.3, 0);
    ctx.lineTo(S, 0);
    ctx.lineTo(S, S);
    ctx.lineTo(S * 0.7, S);
    ctx.fill();

    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        if (isCutout) {
            let scale = (S * 0.9) / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = S * 0.9;
            ctx.drawImage(profileImg, S - targetW - 20, S - targetH, targetW, targetH);
        } else {
            // Edgy parallelogram crop
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(S * 0.4, 0);
            ctx.lineTo(S, 0);
            ctx.lineTo(S, S);
            ctx.lineTo(S * 0.8, S);
            ctx.clip();
            ctx.filter = "contrast(1.1) saturate(1.2)";
            drawCover(ctx, profileImg, 0, 0, S, S);
            ctx.restore();
        }
    }

    // Bold Typography
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    let specs = input.profile.specialty?.[0] || "법률정보";
    ctx.fillStyle = accent;
    ctx.font = `900 24px ${FONT_BLACK}`;
    ctx.fillText(specs, 60, 100);

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, 60, 140, S * 0.6, S * 0.6, 96, FONT_BLACK, "900", { shadow: true });

    // Bottom name bar
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(60, S - 120, 60, 6);
    ctx.font = `700 20px ${FONT_BOLD}`;
    ctx.fillText(lawyerName + " 변호사", 60, S - 90);
}

// ==========================================
// 3. COOL (냉철한 형사전문)
// ==========================================
function renderMainCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // Dark/Desaturated BG
    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);
    
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.filter = "grayscale(100%) contrast(1.5)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        ctx.save();
        ctx.filter = "grayscale(80%) contrast(1.2)"; // Ice cold look
        if (isCutout) {
            let scale = (S * 0.95) / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = S * 0.95;
            ctx.drawImage(profileImg, S - targetW - 40, S - targetH, targetW, targetH);
        } else {
            // Strict rectangle on the right
            const rectW = S * 0.45;
            ctx.beginPath();
            ctx.rect(S - rectW, 0, rectW, S);
            ctx.clip();
            drawCover(ctx, profileImg, S - rectW, 0, rectW, S);
        }
        ctx.restore();
    }

    // Vertical Line Accent
    ctx.fillStyle = accent;
    ctx.fillRect(50, 80, 4, S - 160);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText((input.profile.specialty?.[0] || "LAW").toUpperCase(), 70, 80);

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, 70, 120, S * 0.5, S * 0.5, 80, FONT_BOLD, "700", { shadow: true, lineGap: 1.4 });

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `700 20px ${FONT_BOLD}`;
    ctx.fillText(lawyerName, 70, S - 100);
}

// ==========================================
// 4. WARM (따뜻한 가사/상속)
// ==========================================
function renderMainWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg } = assets;

    // Light, warm background
    const [r, g, b] = hexToRgb(accent);
    ctx.fillStyle = `rgba(${r},${g},${b}, 0.05)`; // Very light tint of accent
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, S, S); // Override with soft cream, blend could be used if needed
    
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.filter = "sepia(0.3) contrast(0.9)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // Soft gradient overlay
    const grad = ctx.createLinearGradient(0, S, S, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b}, 0.1)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        if (isCutout) {
            let scale = (S * 0.8) / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = S * 0.8;
            ctx.drawImage(profileImg, S - targetW - 60, S - targetH, targetW, targetH);
        } else {
            // Large soft circle
            const radius = 300;
            const cx = S - radius - 60;
            const cy = S / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.clip();
            drawCover(ctx, profileImg, cx - radius, cy - radius, radius * 2, radius * 2);
            ctx.restore();
        }
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    // Badge
    ctx.fillStyle = accent;
    ctx.beginPath();
    roundRect(ctx, 60, 80, 100, 36, 18);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.textAlign = "center";
    ctx.fillText(input.profile.specialty?.[0] || "INFO", 110, 89);

    // Text (Dark Brown/Gray)
    ctx.textAlign = "left";
    ctx.fillStyle = "#332D2B";
    drawAutoShrinkText(ctx, title, 60, 150, S * 0.55, S * 0.5, 76, FONT_BOLD, "700", { shadow: false, lineGap: 1.4 });

    ctx.fillStyle = "#665E5C";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 변호사`, 60, S - 100);
}

// ==========================================
// 5. TRADITIONAL (전통적 명조체)
// ==========================================
function renderMainTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;

    // Deep classic background
    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.globalCompositeOperation = "luminosity";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // Classic Border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, S - 80, S - 80);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        if (isCutout) {
            let scale = (S * 0.7) / profileImg.height;
            let targetW = profileImg.width * scale;
            let targetH = S * 0.7;
            ctx.drawImage(profileImg, S / 2 - targetW / 2, S - targetH - 50, targetW, targetH);
        } else {
            // Centered rectangle at bottom
            const rectW = 400;
            const rectH = 500;
            ctx.save();
            ctx.beginPath();
            ctx.rect(S / 2 - rectW / 2, S - rectH - 50, rectW, rectH);
            ctx.clip();
            drawCover(ctx, profileImg, S / 2 - rectW / 2, S - rectH - 50, rectW, rectH);
            ctx.restore();
            
            // Border around photo
            ctx.strokeStyle = accent;
            ctx.strokeRect(S / 2 - rectW / 2, S - rectH - 50, rectW, rectH);
        }
    }

    // Shadow at bottom to blend text if any, but since it's top-heavy, we add shadow at top
    const topGrad = ctx.createLinearGradient(0, 0, 0, 500);
    topGrad.addColorStop(0, darkBg);
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, S, 500);

    // Typography (Centered Serif)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    ctx.fillStyle = accent;
    ctx.font = `700 18px ${FONT_SERIF_BOLD}`;
    ctx.fillText(`— ${input.profile.specialty?.[0] || "법률정보"} —`, S / 2, 100);

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, S / 2, 150, S * 0.7, 300, 72, FONT_SERIF_BOLD, "700", { center: true, lineGap: 1.5 });

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `400 18px ${FONT_SERIF_REGULAR}`;
    ctx.fillText(`${lawyerName} 변호사`, S / 2, 470); // Just below title area
}
