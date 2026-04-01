import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
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
// 1. CLASSIC (기존: 블러 처리된 배경과 세리프 중앙 정렬)
// ==========================================
function renderBrandClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    if (officeImg) {
        ctx.save();
        ctx.filter = "blur(15px) contrast(1.2) saturate(0.85) brightness(1.2)";
        drawCover(ctx, officeImg, -30, -30, S+60, S+60);
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
    const met = drawAutoShrinkText(ctx, tagline, S / 2, 0, S - pad * 2, 360, 64, FONT_SERIF_BOLD, "700", { shadow: false });
    ctx.restore();

    const startY = (S / 2) - (met.height / 2) - 40;

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, tagline, S / 2, startY, S - pad * 2, 360, 64, FONT_SERIF_BOLD, "700", { shadow: false });

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
// 2. TRENDY (젊고 감각적인: 대담한 타이포)
// ==========================================
function renderBrandTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg, darkBg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    if (officeImg) {
        ctx.save();
        ctx.filter = "grayscale(100%) opacity(0.2) contrast(1.5)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // Huge accent shape
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S * 0.8, S * 0.2, 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = darkBg;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 1.0;

    const tagline = brandLines?.length ? brandLines.join("\n") : `${lawyerName} 변호사\n당신의 권리를 향한 직진`;
    
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, 100, 100, lw, lh);
    }

    ctx.fillStyle = accent;
    ctx.font = `900 120px ${FONT_BLACK}`;
    ctx.fillText("BRAND", 100, 220);
    ctx.fillText("STORY", 100, 320);

    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, tagline, 100, 500, S - 200, 300, 56, FONT_BLACK, "900", { lineGap: 1.3 });

    ctx.fillStyle = accent;
    ctx.fillRect(100, 850, 60, 8);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `700 24px ${FONT_BOLD}`;
    ctx.fillText(`${officeName || "LAW OFFICE"} | ${lawyerName} 변호사`, 100, 880);
}

// ==========================================
// 3. COOL (냉철한: 날카롭고 얇은 그리드 디자인)
// ==========================================
function renderBrandCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, darkBg, logoImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    // Target grid
    for(let i=1; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(S * 0.1 * i, 0);
        ctx.lineTo(S * 0.1 * i, S);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, S * 0.1 * i);
        ctx.lineTo(S, S * 0.1 * i);
        ctx.stroke();
    }

    const tagline = brandLines?.length ? brandLines.join("\n") : `빈틈없는 논리로\n승소를 이끌어냅니다`;

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Frame
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(100, 100, S - 200, S - 200);

    ctx.fillStyle = accent;
    ctx.fillRect(100, 100, 10, 10);
    ctx.fillRect(S - 110, 100, 10, 10);
    ctx.fillRect(100, S - 110, 10, 10);
    ctx.fillRect(S - 110, S - 110, 10, 10);

    drawAutoShrinkText(ctx, tagline, S / 2, S / 2 - 40, S - 300, 400, 64, FONT_BOLD, "700", { center: true, lineGap: 1.6 });

    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 30, S / 2 + 120, 60, 2);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName} 변호사`, S / 2, S / 2 + 160);

    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 140, lw, lh);
    }
}

// ==========================================
// 4. WARM (따뜻한: 부드러운 여백과 라운드)
// ==========================================
function renderBrandWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, S, S);

    const [r, g, b] = hexToRgb(accent);
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, `rgba(${r},${g},${b}, 0.1)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Soft pill shape with office image if exists
    if (officeImg) {
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, 100, 100, S - 200, 400, 200);
        ctx.clip();
        ctx.filter = "sepia(0.2) contrast(0.9)";
        drawCover(ctx, officeImg, 100, 100, S - 200, 400);
        ctx.restore();
    } else {
        ctx.fillStyle = `rgba(${r},${g},${b}, 0.05)`;
        ctx.beginPath();
        roundRect(ctx, 100, 100, S - 200, 400, 200);
        ctx.fill();
        
        if (logoImg) {
            const lh = 100;
            const lw = logoImg.width * (lh / logoImg.height);
            ctx.drawImage(logoImg, S / 2 - lw / 2, 250, lw, lh);
        }
    }

    const tagline = brandLines?.length ? brandLines.join("\n") : `당신의 상처를 이해하고\n새로운 내일을 함께합니다`;
    
    ctx.fillStyle = "#332D2B";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    drawAutoShrinkText(ctx, tagline, S / 2, 650, S - 200, 200, 56, FONT_BOLD, "700", { center: true, lineGap: 1.5 });

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S / 2, 800, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#665E5C";
    ctx.font = `600 22px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법률 서비스"} · ${lawyerName} 변호사`, S / 2, 860);
}

// ==========================================
// 5. TRADITIONAL (전통적: 고급스러운 테두리와 명조체)
// ==========================================
function renderBrandTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, brandLines } = input.profile;
    const { accent, darkBg, logoImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Elaborate borders
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, S - 120, S - 120);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(70, 70, S - 140, S - 140);
    ctx.strokeRect(50, 50, S - 100, S - 100);

    const tagline = brandLines?.length ? brandLines.join("\n") : `원칙과 신뢰로\n최상의 결과를 증명합니다`;

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    drawAutoShrinkText(ctx, tagline, S / 2, S / 2, S - 200, 400, 64, FONT_SERIF_BOLD, "700", { center: true, lineGap: 1.8 });

    ctx.fillStyle = accent;
    ctx.font = `400 32px ${FONT_SERIF_REGULAR}`;
    ctx.fillText("—", S / 2, S / 2 - 200);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `400 24px ${FONT_SERIF_REGULAR}`;
    ctx.fillText(`${officeName || "법무법인"} | ${lawyerName} 변호사`, S / 2, S / 2 + 200);

    if (logoImg) {
        ctx.textBaseline = "top";
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 100, lw, lh);
    }
}
