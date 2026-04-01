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

// ── Shared: format career text ──
function prepareCareerText(career: string[] | undefined): string {
    if (!career || career.length === 0) return "등록된 약력이 없습니다.";
    return career.map(item => {
        if (!item) return "";
        const t = item.trim();
        if (!t) return "";
        return (t.startsWith("-") || t.startsWith("·")) ? t : `· ${t}`;
    }).join("\n");
}

// ── Shared: draw profile photo fading from right ──
function drawFadingProfileRight(ctx: SKRSContext2D, profileImg: any, shadowGrad: any) {
    if (!profileImg) return;
    const isCutout = hasTransparency(profileImg);
    if (isCutout) {
        const targetH = S * 0.9;
        let scale = targetH / profileImg.height;
        let targetW = profileImg.width * scale;
        if (targetW > S * 0.65) {
            scale = (S * 0.65) / profileImg.width;
            targetW = profileImg.width * scale;
        }
        ctx.drawImage(profileImg, S - targetW - 20, S - profileImg.height * scale, targetW, profileImg.height * scale);
    } else {
        const w = S * 0.55;
        ctx.save();
        ctx.beginPath();
        ctx.rect(S - w, 0, w, S);
        ctx.clip();
        ctx.globalAlpha = 0.7;
        drawCover(ctx, profileImg, S - w, 0, w, S);
        ctx.restore();
        // Re-apply left shadow to fade photo edge
        if (shadowGrad) {
            ctx.fillStyle = shadowGrad;
            ctx.fillRect(0, 0, S, S);
        }
    }
}

// ==========================================
// 1. CLASSIC (기존) — 유지
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

    // Watermark
    ctx.font = `900 160px ${FONT_BLACK}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText((officeName || "ATTORNEY").toUpperCase(), 30, 0);

    drawFadingProfileRight(ctx, profileImg, shadowGrad);

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
// 2. TRENDY — 다크 + 볼드 이름 + 깔끔한 리스트
// ==========================================
function renderCareerTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 100;

    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.filter = "grayscale(100%) contrast(1.4)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    const grad = ctx.createLinearGradient(0, 0, S * 0.6, 0);
    grad.addColorStop(0, "rgba(12,12,12,1)");
    grad.addColorStop(1, "rgba(12,12,12,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.02);
    drawFadingProfileRight(ctx, profileImg, grad);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Small label
    ctx.fillStyle = accent;
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillText("PROFILE", pad, pad);

    // Accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad + 30, 40, 3);

    // Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 72px ${FONT_BLACK}`;
    ctx.fillText(lawyerName, pad, pad + 55);

    // Job title
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || ""} ${jobTitle || "대표변호사"}`, pad, pad + 140);

    // Career list
    const careerText = prepareCareerText(career);
    const listY = pad + 200;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    drawAutoShrinkText(ctx, careerText, pad, listY, S * 0.48, S - listY - pad, 18, FONT_REGULAR, "400", { minFontSize: 12, lineGap: 1.7 });
}

// ==========================================
// 3. COOL — 모노크롬 + 타임라인 느낌
// ==========================================
function renderCareerCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 100;

    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.filter = "grayscale(100%) contrast(1.3)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    const grad = ctx.createLinearGradient(0, 0, S * 0.6, 0);
    grad.addColorStop(0, "rgba(17,17,20,0.98)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.04);

    if (profileImg) {
        ctx.save();
        ctx.filter = "grayscale(90%) contrast(1.15)";
        drawFadingProfileRight(ctx, profileImg, grad);
        ctx.restore();
    }

    // Vertical accent line
    ctx.fillStyle = accent;
    ctx.fillRect(pad - 16, pad, 3, S - pad * 2);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `400 14px ${FONT_REGULAR}`;
    ctx.fillText("ATTORNEY AT LAW", pad, pad);

    // Name
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 64px ${FONT_BOLD}`;
    ctx.fillText(lawyerName, pad, pad + 30);

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || ""} ${jobTitle || ""}`, pad, pad + 110);

    // Career list
    const careerText = prepareCareerText(career);
    const listY = pad + 170;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    drawAutoShrinkText(ctx, careerText, pad, listY, S * 0.48, S - listY - pad, 18, FONT_REGULAR, "400", { minFontSize: 12, lineGap: 1.7 });
}

// ==========================================
// 4. WARM — 밝은 크림 톤 약력
// ==========================================
function renderCareerWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 100;
    const [r, g, b] = hexToRgb(accent);

    // Cream base
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.filter = "sepia(0.3) blur(4px)";
        drawCover(ctx, officeImg, -8, -8, S + 16, S + 16);
        ctx.restore();
    }

    // Profile — rounded rect on right
    if (profileImg) {
        const isCutout = hasTransparency(profileImg);
        if (isCutout) {
            const targetH = S * 0.8;
            let scale = targetH / profileImg.height;
            let targetW = profileImg.width * scale;
            if (targetW > S * 0.5) {
                scale = (S * 0.5) / profileImg.width;
                targetW = profileImg.width * scale;
            }
            ctx.drawImage(profileImg, S - targetW - 50, S - profileImg.height * scale, targetW, profileImg.height * scale);
        } else {
            const fw = 340, fh = 480;
            const fx = S - pad - fw, fy = (S - fh) / 2;
            ctx.save();
            ctx.beginPath();
            roundRect(ctx, fx, fy, fw, fh, 30);
            ctx.clip();
            drawCover(ctx, profileImg, fx, fy, fw, fh);
            ctx.restore();
        }
    }

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Accent bar + label
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad, 3, 40);
    ctx.fillStyle = accent;
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillText(jobTitle || "대표변호사", pad + 16, pad);

    // Name
    ctx.fillStyle = "#2C2520";
    ctx.font = `900 64px ${FONT_BLACK}`;
    ctx.fillText(lawyerName, pad, pad + 50);

    // Office
    ctx.fillStyle = "#6B5E56";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText(officeName || "", pad, pad + 130);

    // Separator
    ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
    ctx.fillRect(pad, pad + 170, S * 0.4, 1);

    // Career list
    const careerText = prepareCareerText(career);
    const listY = pad + 200;
    ctx.fillStyle = "#4A403A";
    drawAutoShrinkText(ctx, careerText, pad, listY, S * 0.42, S - listY - pad, 18, FONT_REGULAR, "400", { minFontSize: 12, lineGap: 1.7 });
}

// ==========================================
// 5. TRADITIONAL — 명조체 약력
// ==========================================
function renderCareerTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, jobTitle, officeName, career } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 100;

    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.filter = "grayscale(50%) contrast(1.1)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    const grad = ctx.createLinearGradient(0, 0, S * 0.6, 0);
    grad.addColorStop(0, "rgba(14,14,16,0.97)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.03);

    // Border
    ctx.strokeStyle = rgba(accent, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    // Profile
    if (profileImg) {
        drawFadingProfileRight(ctx, profileImg, grad);
    }

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Label — serif
    ctx.fillStyle = rgba(accent, 0.6);
    ctx.font = `400 16px ${FONT_SERIF_REGULAR}`;
    ctx.fillText(`— ${officeName || "법률사무소"}`, pad, pad);

    // Name — serif
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 64px ${FONT_SERIF_BOLD}`;
    ctx.fillText(lawyerName, pad, pad + 35);

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 18px ${FONT_SERIF_REGULAR}`;
    ctx.fillText(jobTitle || "대표변호사", pad, pad + 115);

    // Separator
    ctx.fillStyle = rgba(accent, 0.2);
    ctx.fillRect(pad, pad + 155, S * 0.4, 1);

    // Career list — serif
    const careerText = prepareCareerText(career);
    const listY = pad + 185;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    drawAutoShrinkText(ctx, careerText, pad, listY, S * 0.45, S - listY - pad, 18, FONT_SERIF_REGULAR, "400", { minFontSize: 12, lineGap: 1.7 });
}
