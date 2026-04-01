import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba, roundRect,
    type RenderInput, type Assets, hexToRgb
} from "./renderer";

const S = SIZE;
const PAD = 100;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderSummaryTrendy(ctx, input, assets);
        case "cool": return renderSummaryCool(ctx, input, assets);
        case "warm": return renderSummaryWarm(ctx, input, assets);
        case "traditional": return renderSummaryTraditional(ctx, input, assets);
        case "classic":
        default: return renderSummaryClassic(ctx, input, assets);
    }
}

// ==========================================
// 1. CLASSIC (기존: 큰 따옴표와 핵심 문장 강조)
// ==========================================
function renderSummaryClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg, officeImg, darkBg } = assets;

    const mainSentence = summaryPoints.length > 0 ? summaryPoints[0] : "문제의 핵심을 정확히 파악하여 빠르고 유리하게 대응하세요.";
    const secondaryPoint = summaryPoints.length > 1 ? summaryPoints.slice(1, 3).join("\n\n") : "";
    const pad = 120; 
    const layout = 1; // Left aligned for consistency

    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.2) grayscale(60%)"; 
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        ctx.fillStyle = "rgba(28, 28, 30, 0.88)";
        ctx.fillRect(0, 0, S, S);
        const alignGrad = ctx.createLinearGradient(0, 0, S, 0);
        alignGrad.addColorStop(0, "rgba(10,10,12,0.8)");
        alignGrad.addColorStop(1, "transparent");
        ctx.fillStyle = alignGrad;
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = darkBg;
        ctx.fillRect(0, 0, S, S);
        const g1 = ctx.createRadialGradient(0, S, 0, 0, S, S * 0.4);
        g1.addColorStop(0, rgba(accent, 0.08));
        g1.addColorStop(1, "transparent");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, S, S);
    }

    drawFilmGrain(ctx, 0.03);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const textX = pad;

    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, textX, pad, lw, lh);
    }

    ctx.fillStyle = accent;
    ctx.font = `900 120px serif`; 
    ctx.fillText("“", textX, pad + 80);

    ctx.fillStyle = "#FFFFFF";
    const { height: textH } = drawAutoShrinkText(
        ctx, mainSentence, textX, pad + 240, S - pad * 2, 320, 64, FONT_BLACK, "900", { shadow: false }
    );

    if (secondaryPoint) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(textX, pad + 240 + textH + 40, 60, 2);
        
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        drawAutoShrinkText(
            ctx, secondaryPoint, textX, pad + 240 + textH + 70, S - pad * 2, 300, 28, FONT_REGULAR, "500", { shadow: false, lineGap: 1.5 }
        );
    }
}

// ==========================================
// 2. TRENDY (젊고 감각적인 - 대담한 숫자와 리스트)
// ==========================================
function renderSummaryTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, darkBg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);
    
    // Abstract shapes
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S, 0, 400, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = darkBg;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillText("KEY POINTS", PAD, PAD);
    
    ctx.fillStyle = accent;
    ctx.fillRect(PAD, PAD + 70, 80, 8);

    const points = summaryPoints.slice(0, 4);
    if(points.length === 0) points.push("핵심 내용이 없습니다.");

    const rowH = (S - PAD * 2 - 150) / points.length;
    let y = PAD + 150;

    points.forEach((pt, i) => {
        // Big transparent number
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.font = `900 120px ${FONT_BLACK}`;
        ctx.fillText(`0${i+1}`, PAD, y - 20);

        // Small accent dot
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(PAD + 20, y + 20, 8, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = "#FFFFFF";
        drawAutoShrinkText(ctx, pt, PAD + 50, y, S - PAD * 2 - 50, rowH - 40, 36, FONT_BOLD, "700", { shadow: false, lineGap: 1.4 });
        y += rowH;
    });
}

// ==========================================
// 3. COOL (냉철한 - 얇은 선과 깔끔한 분할)
// ==========================================
function renderSummaryCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, darkBg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Frame
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 60, S - 120, S - 120);

    ctx.fillStyle = accent;
    ctx.fillRect(60, 60, 4, 100); // Top left accent

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    ctx.font = `400 24px ${FONT_REGULAR}`;
    ctx.fillText("SUMMARY", PAD, PAD);

    const points = summaryPoints.slice(0, 5);
    if(points.length === 0) points.push("요약 내용이 없습니다.");

    let y = PAD + 100;
    const availableH = S - PAD - y - 60;
    const rowH = availableH / points.length;

    points.forEach((pt, i) => {
        // Line separator
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(PAD, y, S - PAD * 2, 1);

        // Number
        ctx.fillStyle = accent;
        ctx.font = `700 18px ${FONT_BOLD}`;
        ctx.fillText(`NO.${i+1}`, PAD, y + 20);

        // Text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawAutoShrinkText(ctx, pt, PAD + 80, y + 18, S - PAD * 2 - 80, rowH - 30, 32, FONT_REGULAR, "400", { lineGap: 1.5 });
        
        y += rowH;
    });
}

// ==========================================
// 4. WARM (따뜻한 - 부드러운 박스 레이아웃)
// ==========================================
function renderSummaryWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent } = assets;

    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, S, S);

    const [r, g, b] = hexToRgb(accent);
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, `rgba(${r},${g},${b}, 0.15)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `700 32px ${FONT_BOLD}`;
    ctx.fillText("핵심 요약 포인트", S / 2, PAD);

    const points = summaryPoints.slice(0, 4);
    if(points.length === 0) points.push("요약 포인트가 없습니다.");

    let y = PAD + 80;
    const gap = 24;
    const boxH = (S - PAD * 2 - gap * (points.length - 1) - 80) / points.length;

    points.forEach((pt, i) => {
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0,0,0,0.05)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        ctx.beginPath();
        roundRect(ctx, PAD, y, S - PAD * 2, boxH, 24);
        ctx.fill();

        ctx.shadowColor = "transparent";

        // Number badge
        ctx.fillStyle = `rgba(${r},${g},${b}, 0.1)`;
        ctx.beginPath();
        ctx.arc(PAD + 40, y + boxH / 2, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = accent;
        ctx.font = `700 20px ${FONT_BOLD}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i+1}`, PAD + 40, y + boxH / 2);

        // Text
        ctx.fillStyle = "#332D2B";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        // To accurately vertically center multi-line text, drawAutoShrinkText might need top alignment
        ctx.textBaseline = "top";
        drawAutoShrinkText(ctx, pt, PAD + 90, y + 30, S - PAD * 2 - 120, boxH - 60, 28, FONT_BOLD, "700", { lineGap: 1.4 });

        y += boxH + gap;
    });
}

// ==========================================
// 5. TRADITIONAL (전통적인 명조체 리스트)
// ==========================================
function renderSummaryTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, darkBg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Double Border
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, S - 80, S - 80);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.strokeRect(50, 50, S - 100, S - 100);

    ctx.fillStyle = accent;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `700 48px ${FONT_SERIF_BOLD}`;
    ctx.fillText("주요 쟁점 사항", S / 2, PAD + 20);

    // Ornate divider
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 80, PAD + 90, 160, 2);
    ctx.beginPath();
    ctx.arc(S / 2, PAD + 91, 6, 0, Math.PI * 2);
    ctx.fill();

    const points = summaryPoints.slice(0, 4);
    if(points.length === 0) points.push("주요 쟁점이 없습니다.");

    let y = PAD + 160;
    const availableH = S - PAD - y - 60;
    const rowH = availableH / points.length;

    ctx.textAlign = "left";

    points.forEach((pt, i) => {
        // Bullet
        ctx.fillStyle = accent;
        ctx.save();
        ctx.translate(PAD + 20, y + 20);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-6, -6, 12, 12); // Diamond shape
        ctx.restore();

        // Text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawAutoShrinkText(ctx, pt, PAD + 50, y, S - PAD * 2 - 50, rowH - 20, 36, FONT_SERIF_REGULAR, "400", { lineGap: 1.6 });

        y += rowH;
    });
}
