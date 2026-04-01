import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, rgba, drawFilmGrain, roundRect,
    type RenderInput, type Assets, hexToRgb
} from "./renderer";

const S = SIZE;

export function renderBrandTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderBrandTrendy(ctx, input, assets);
        case "cool": return renderBrandCool(ctx, input, assets);
        case "warm": return renderBrandWarm(ctx, input, assets);
        case "traditional": return renderBrandTraditional(ctx, input, assets);
        case "classic":
        default: return renderBrandClassic(ctx, input, assets);
    }
}

// ==========================================
// 1. CLASSIC (기존) — 유지
// ==========================================
function renderBrandClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    if (officeImg) {
        ctx.save();
        ctx.filter = "blur(15px) contrast(1.2) saturate(0.85) brightness(1.2)";
        drawCover(ctx, officeImg, -30, -30, S + 60, S + 60);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
        ctx.fillStyle = "rgba(28, 28, 30, 0.8)";
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = "rgba(28, 28, 30, 1)";
        ctx.fillRect(0, 0, S, S);
    }

    drawFilmGrain(ctx, 0.03);

    const topGrad = ctx.createLinearGradient(0, 0, 0, S);
    topGrad.addColorStop(0, "rgba(0,0,0,0.4)");
    topGrad.addColorStop(0.5, "transparent");
    topGrad.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, S, S);

    const tagline = brandLines?.length ? brandLines.join("\n") : `${lawyerName} 변호사가\n당신의 권리를 찾습니다`;
    const pad = 120;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.save();
    ctx.globalAlpha = 0;
    const met = drawAutoShrinkText(ctx, tagline, S / 2, 0, S - pad * 2, 360, 64, FONT_BOLD, "700", { shadow: false });
    ctx.restore();

    const startY = (S / 2) - (met.height / 2) - 40;

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, tagline, S / 2, startY, S - pad * 2, 360, 64, FONT_BOLD, "700", { shadow: false });

    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 20, startY + met.height + 40, 40, 2);

    ctx.font = `600 20px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName} 변호사`, S / 2, startY + met.height + 80);

    ctx.textBaseline = "top";
    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 80, lw, lh);
    }
}

// ==========================================
// 2. TRENDY — 다크 센터 타이포 + 액센트 라인
// ==========================================
function renderBrandTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    // Dark base with very subtle office bg
    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, S, S);
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.filter = "grayscale(100%) blur(10px) contrast(1.3)";
        drawCover(ctx, officeImg, -20, -20, S + 40, S + 40);
        ctx.restore();
    }
    drawFilmGrain(ctx, 0.02);

    const tagline = brandLines?.length ? brandLines.join("\n") : `${lawyerName} 변호사\n당신의 권리를 향한 직진`;
    const pad = 120;

    // Logo
    ctx.textBaseline = "top";
    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad, lw, lh);
    }

    // Accent line
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 30, S / 2 - 200, 60, 4);

    // Tagline — centered, bold
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    const { height: th } = drawAutoShrinkText(ctx, tagline, S / 2, S / 2 - 170, S - pad * 2, 300, 56, FONT_BLACK, "900", { center: true, lineGap: 1.4 });

    // Bottom info
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(pad, S - pad - 60, S - pad * 2, 1);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법률사무소"} | ${lawyerName} 변호사`, S / 2, S - pad - 30);
}

// ==========================================
// 3. COOL — 무채색 센터 타이포 + 프레임
// ==========================================
function renderBrandCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, logoImg } = assets;

    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.04);

    const pad = 120;

    // Thin frame
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 60, S - 120, S - 120);

    // Corner accent marks
    ctx.fillStyle = accent;
    ctx.fillRect(60, 60, 3, 40);
    ctx.fillRect(60, 60, 40, 3);
    ctx.fillRect(S - 63, S - 100, 3, 40);
    ctx.fillRect(S - 100, S - 63, 40, 3);

    const tagline = brandLines?.length ? brandLines.join("\n") : `빈틈없는 전략으로\n승소를 이끕니다`;

    // Logo
    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad + 20, lw, lh);
    }

    // Tagline — centered, bold
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, tagline, S / 2, S / 2 - 100, S - pad * 2, 250, 56, FONT_BOLD, "700", { center: true, lineGap: 1.5 });

    // Divider + name
    ctx.fillStyle = rgba(accent, 0.4);
    ctx.fillRect(S / 2 - 25, S / 2 + 180, 50, 1);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName}`, S / 2, S / 2 + 210);
}

// ==========================================
// 4. WARM — 밝은 크림 센터 레이아웃
// ==========================================
function renderBrandWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;
    const [r, g, b] = hexToRgb(accent);

    // Cream base
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.filter = "sepia(0.3) blur(12px)";
        drawCover(ctx, officeImg, -20, -20, S + 40, S + 40);
        ctx.restore();
    }

    // Subtle accent gradient
    const grad = ctx.createLinearGradient(0, S, 0, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    const pad = 120;
    const tagline = brandLines?.length ? brandLines.join("\n") : `당신의 상처를 이해하고\n새로운 내일을 함께합니다`;

    // Logo
    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad, lw, lh);
    }

    // Accent dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2 - 180, 5, 0, Math.PI * 2);
    ctx.fill();

    // Tagline — centered, dark text
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#2C2520";
    drawAutoShrinkText(ctx, tagline, S / 2, S / 2 - 150, S - pad * 2, 280, 52, FONT_BOLD, "700", { center: true, lineGap: 1.5 });

    // Accent bar + name
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 15, S / 2 + 160, 30, 3);
    ctx.fillStyle = "#6B5E56";
    ctx.font = `600 18px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName} 변호사`, S / 2, S / 2 + 190);
}

// ==========================================
// 5. TRADITIONAL — 명조체 센터 타이포 + 테두리
// ==========================================
function renderBrandTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, logoImg } = assets;

    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.03);

    const pad = 120;

    // Classic border
    ctx.strokeStyle = rgba(accent, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    const tagline = brandLines?.length ? brandLines.join("\n") : `원칙과 신뢰로\n최상의 결과를 증명합니다`;

    // Logo
    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad, lw, lh);
    }

    // Em-dash ornament
    ctx.fillStyle = rgba(accent, 0.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `400 24px ${FONT_REGULAR}`;
    ctx.fillText("—", S / 2, S / 2 - 180);

    // Tagline — serif, centered
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, tagline, S / 2, S / 2 - 140, S - pad * 2, 280, 56, FONT_BOLD, "700", { center: true, lineGap: 1.6 });

    // Accent divider
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(S / 2 - 25, S / 2 + 170, 50, 1);

    // Name — serif
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `400 18px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법무법인"} | ${lawyerName} 변호사`, S / 2, S / 2 + 200);
}
