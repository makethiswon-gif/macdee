import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawCover, drawFilmGrain, drawWrappedText, drawAutoShrinkText,
    type RenderInput, type Assets, hasTransparency, rgba, roundRect, hexToRgb
} from "./renderer";

const S = SIZE;

export function renderCareerTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderCareerTrendy(ctx, input, assets);
        case "cool": return renderCareerCool(ctx, input, assets);
        case "warm": return renderCareerWarm(ctx, input, assets);
        case "traditional": return renderCareerTraditional(ctx, input, assets);
        case "classic":
        default: return renderCareerClassic(ctx, input, assets);
    }
}

// ── Shared Helpers ──
function prepareCareerText(career: string[] | undefined): string {
    if (!career || career.length === 0) return "등록된 약력이 없습니다.";
    return career.map(item => {
        if (!item) return "";
        const t = item.trim();
        if (!t) return "";
        return (t.startsWith("-") || t.startsWith("·")) ? t : `· ${t}`;
    }).join("\n");
}

// ==========================================
// 1. CLASSIC (기존: 깊은 스튜디오 음영)
// ==========================================
function renderCareerClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career } = input.profile;
    const { profileImg, officeImg } = assets;

    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.2) saturate(0.8) brightness(0.55)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#E8E2D2";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
    } else {
        ctx.fillStyle = "#2E2A27";
        ctx.fillRect(0, 0, S, S);
    }

    const shadowGrad = ctx.createLinearGradient(0, 0, S, 0);
    shadowGrad.addColorStop(0, "rgba(20, 18, 16, 0.95)");
    shadowGrad.addColorStop(0.5, "rgba(20, 18, 16, 0.7)");
    shadowGrad.addColorStop(1, "rgba(20, 18, 16, 0.2)");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.04);

    const watermarkText = officeName ? officeName.toUpperCase() : "ATTORNEY PROFILE";
    ctx.font = `900 160px ${FONT_BLACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(watermarkText, 30, 0);

    if (profileImg) {
        if (hasTransparency(profileImg)) {
            const targetH = S * 0.9;
            let scale = targetH / profileImg.height;
            let targetW = profileImg.width * scale;
            const maxW = S * 0.65;
            if (targetW > maxW) {
                scale = maxW / profileImg.width;
                targetW = profileImg.width * scale;
            }
            ctx.drawImage(profileImg, S - targetW - 20, S - profileImg.height * scale, targetW, profileImg.height * scale);
        } else {
            ctx.save();
            const w = S * 0.6;
            ctx.rect(S - w, 0, w, S);
            ctx.clip();
            ctx.globalAlpha = 0.8;
            drawCover(ctx, profileImg, S - w, 0, w, S);
            ctx.restore();
            ctx.fillStyle = shadowGrad;
            ctx.fillRect(0, 0, S, S);
        }
    }

    const padX = 100;
    const contentMaxW = S * 0.55;
    let currY = 110;

    if (officeName) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = `600 14px ${FONT_REGULAR}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(officeName, padX, currY);
        ctx.fillRect(padX, currY + 24, 24, 1);
        currY += 45;
    }

    ctx.font = `900 80px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    const nameMet = ctx.measureText(lawyerName);
    ctx.fillText(lawyerName, padX, currY);
    
    ctx.font = `400 22px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    drawWrappedText(ctx, `${officeName}\n${jobTitle}`, padX + nameMet.width + 24, currY + 22, contentMaxW - nameMet.width - 24, 30);
    
    currY += 160;

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    drawAutoShrinkText(ctx, prepareCareerText(career), padX, currY, contentMaxW, S - currY - 60, 20, FONT_REGULAR, "500", { shadow: false, minFontSize: 12 });
}

// ==========================================
// 2. TRENDY (젊고 감각적인 디자인)
// ==========================================
function renderCareerTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, career } = input.profile;
    const { accent, darkBg, profileImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Thick geometric frames
    ctx.strokeStyle = accent;
    ctx.lineWidth = 16;
    ctx.strokeRect(40, 40, S - 80, S - 80);

    ctx.fillStyle = accent;
    ctx.fillRect(40, S - 200, S - 80, 160);

    if (profileImg) {
        if (hasTransparency(profileImg)) {
            let scale = (S * 0.85) / profileImg.height;
            let targetW = profileImg.width * scale;
            ctx.drawImage(profileImg, S - targetW - 60, S - profileImg.height * scale - 160, targetW, profileImg.height * scale);
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(S * 0.5, 40);
            ctx.lineTo(S - 40, 40);
            ctx.lineTo(S - 40, S - 200);
            ctx.lineTo(S * 0.8, S - 200);
            ctx.clip();
            drawCover(ctx, profileImg, S * 0.5, 40, S * 0.5, S - 240);
            ctx.restore();
        }
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    
    ctx.font = `900 64px ${FONT_BLACK}`;
    ctx.fillText("PROFILE", 100, 100);

    ctx.font = `700 80px ${FONT_BOLD}`;
    ctx.fillText(lawyerName, 100, 180);

    // Career list
    const careerText = prepareCareerText(career);
    drawAutoShrinkText(ctx, careerText, 100, 300, S * 0.6, S - 540, 22, FONT_REGULAR, "700", { lineGap: 1.6 });

    // Bottom banner text
    ctx.fillStyle = darkBg;
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillText(`${jobTitle}의 확신과 비전`, 100, S - 150);
}

// ==========================================
// 3. COOL (냉철한 형사전문: 타임라인 그리드)
// ==========================================
function renderCareerCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, career } = input.profile;
    const { accent, darkBg, profileImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 1; i < 5; i++) {
        ctx.strokeRect(S * 0.2 * i, 0, 1, S);
    }

    if (profileImg) {
        if (hasTransparency(profileImg)) {
            const th = S * 0.95;
            const tw = profileImg.width * (th / profileImg.height);
            ctx.drawImage(profileImg, S - tw, S - th, tw, th);
            ctx.fillStyle = "rgba(0,0,0,0.4)"; // overlay slightly to merge
            ctx.fillRect(S - tw, S - th, tw, th);
        } else {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.filter = "grayscale(100%)";
            drawCover(ctx, profileImg, S * 0.5, 0, S * 0.5, S);
            ctx.restore();
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(S * 0.5, 0, S * 0.5, S);
        }
    }

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `400 24px ${FONT_REGULAR}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("ATTORNEY AT LAW", 100, 100);

    ctx.fillStyle = accent;
    ctx.fillRect(100, 140, 40, 4);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 80px ${FONT_BOLD}`;
    ctx.fillText(lawyerName, 100, 180);

    ctx.font = `400 24px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(jobTitle || "대표변호사", 100, 270);

    // Timeline line
    const startY = 360;
    const endY = S - 100;
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(105, startY, 2, endY - startY);

    const points = career ? career.filter(Boolean).slice(0, 6) : [];
    const step = (endY - startY) / Math.max(points.length, 1);
    
    ctx.font = `500 20px ${FONT_REGULAR}`;
    points.forEach((pt, i) => {
        const y = startY + (i * step);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(106, y + 10, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        drawWrappedText(ctx, pt.replace(/^[-·]\s*/, ""), 130, y, S * 0.5, 28);
    });
}

// ==========================================
// 4. WARM (따뜻한: 베이지 바탕, 둥근 프레임)
// ==========================================
function renderCareerWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, career } = input.profile;
    const { accent, profileImg } = assets;

    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, S, S);

    const [r, g, b] = hexToRgb(accent);
    const grad = ctx.createLinearGradient(0, S, S, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b}, 0.1)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    if (profileImg) {
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, Math.max(S * 0.6, S - 400), 100, 320, 400, 160);
        ctx.clip();
        drawCover(ctx, profileImg, Math.max(S * 0.6, S - 400), 100, 320, 400);
        ctx.restore();
    }

    ctx.fillStyle = accent;
    ctx.font = `700 24px ${FONT_BOLD}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(jobTitle, 100, 140);

    ctx.fillStyle = "#332D2B";
    ctx.font = `900 72px ${FONT_BLACK}`;
    ctx.fillText(`${lawyerName} 변호사`, 100, 180);

    ctx.fillStyle = "rgba(51, 45, 43, 0.1)";
    ctx.fillRect(100, 280, S * 0.45, 2);

    ctx.fillStyle = "#665E5C";
    const careerText = prepareCareerText(career);
    drawAutoShrinkText(ctx, careerText, 100, 320, S * 0.45, S - 400, 22, FONT_REGULAR, "500", { lineGap: 1.8 });

    // Floating shape accent
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S - 100, S - 150, 60, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
// 5. TRADITIONAL (전통적: 세리프, 클래식 리스트)
// ==========================================
function renderCareerTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, career } = input.profile;
    const { accent, darkBg, profileImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 60, S - 120, S - 120);

    if (profileImg) {
        if (hasTransparency(profileImg)) {
            let scale = (S * 0.8) / profileImg.height;
            let targetW = profileImg.width * scale;
            ctx.drawImage(profileImg, S - targetW - 80, S - profileImg.height * scale - 60, targetW, profileImg.height * scale);
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.rect(S - 420, 100, 320, S - 200);
            ctx.clip();
            drawCover(ctx, profileImg, S - 420, 100, 320, S - 200);
            ctx.restore();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.strokeRect(S - 430, 90, 340, S - 180);
        }
    }

    ctx.fillStyle = accent;
    ctx.font = `700 24px ${FONT_SERIF_BOLD}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`— ${officeName || "법률사무소"} ⏤`, 120, 120);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 80px ${FONT_SERIF_BOLD}`;
    ctx.fillText(lawyerName, 120, 180);

    // A classic list with serif font
    const points = career ? career.filter(Boolean) : [];
    
    let y = 320;
    const availableH = S - y - 100;
    const rowH = Math.min(40, availableH / Math.max(points.length, 1));

    points.forEach(pt => {
        ctx.fillStyle = accent;
        ctx.font = `400 20px ${FONT_SERIF_REGULAR}`;
        ctx.fillText("✦", 120, y);

        ctx.fillStyle = "rgba(255,255,255,0.85)";
        drawWrappedText(ctx, pt.replace(/^[-·]\s*/, ""), 150, y, S * 0.4, 30);
        
        // Increase Y by number of lines wrapped
        const tempCtxCount = Math.ceil(ctx.measureText(pt).width / (S * 0.4));
        y += Math.max(rowH, rowH * tempCtxCount);
    });
}
