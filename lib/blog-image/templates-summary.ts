import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
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

// ── Shared helper: get points ──
function getPoints(summaryPoints: string[], fallback = "핵심 내용을 요약합니다."): string[] {
    const pts = summaryPoints.filter(Boolean);
    return pts.length > 0 ? pts : [fallback];
}

// ==========================================
// 1. CLASSIC (기존) — 유지
// ==========================================
function renderSummaryClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg, officeImg, darkBg } = assets;
    const pad = 120;

    const mainSentence = summaryPoints.length > 0 ? summaryPoints[0] : "문제의 핵심을 정확히 파악하여 빠르고 유리하게 대응하세요.";
    const secondaryPoint = summaryPoints.length > 1 ? summaryPoints.slice(1, 3).join("\n\n") : "";

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
    ctx.fillText("\u201C", textX, pad + 80);

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
// 2. TRENDY — 깔끔한 넘버링 리스트
//    다크 배경 + 액센트 넘버 + 클린 타이포
// ==========================================
function renderSummaryTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg } = assets;
    const pad = 100;

    // Dark base
    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.02);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Logo
    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, pad, pad, lw, lh);
    }

    // Section title
    ctx.fillStyle = accent;
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillText("KEY POINTS", pad, pad + 70);

    // Thin accent line
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad + 100, 40, 3);

    // Points list
    const points = getPoints(summaryPoints).slice(0, 4);
    const startY = pad + 140;
    const availH = S - startY - pad;
    const rowH = availH / points.length;

    points.forEach((pt, i) => {
        const y = startY + i * rowH;

        // Number
        ctx.fillStyle = accent;
        ctx.font = `900 28px ${FONT_BLACK}`;
        ctx.fillText(`${String(i + 1).padStart(2, "0")}`, pad, y);

        // Separator line
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(pad, y + rowH - 4, S - pad * 2, 1);

        // Text
        ctx.fillStyle = "#FFFFFF";
        drawAutoShrinkText(ctx, pt, pad + 70, y + 2, S - pad * 2 - 70, rowH - 20, 28, FONT_REGULAR, "400", { lineGap: 1.5 });
    });
}

// ==========================================
// 3. COOL — 모노톤 요약
//    무채색 배경 + 얇은 프레임 + 작은 액센트
// ==========================================
function renderSummaryCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent, logoImg } = assets;
    const pad = 100;

    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.04);

    // Thin border
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad - 20, pad - 20, S - (pad - 20) * 2, S - (pad - 20) * 2);

    // Accent mark on top-left corner
    ctx.fillStyle = accent;
    ctx.fillRect(pad - 20, pad - 20, 3, 60);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `400 14px ${FONT_REGULAR}`;
    ctx.fillText("SUMMARY", pad, pad);

    // Points list — clean, minimal
    const points = getPoints(summaryPoints).slice(0, 5);
    const startY = pad + 60;
    const availH = S - startY - pad;
    const rowH = availH / points.length;

    points.forEach((pt, i) => {
        const y = startY + i * rowH;

        // Thin horizontal rule
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(pad, y, S - pad * 2, 1);

        // Accent number dot
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(pad + 8, y + 22, 3, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        drawAutoShrinkText(ctx, pt, pad + 30, y + 10, S - pad * 2 - 30, rowH - 20, 26, FONT_REGULAR, "400", { lineGap: 1.5 });
    });
}

// ==========================================
// 4. WARM — 밝은 카드형 요약
//    크림 배경 + 부드러운 카드 + 포인트 컬러
// ==========================================
function renderSummaryWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent } = assets;
    const pad = 100;
    const [r, g, b] = hexToRgb(accent);

    // Cream background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, S, S);

    // Very subtle accent gradient
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Section title
    ctx.fillStyle = accent;
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillText("핵심 요약", pad, pad);

    // Accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(pad, pad + 30, 30, 3);

    // Points — clean list with left accent
    const points = getPoints(summaryPoints).slice(0, 4);
    const startY = pad + 70;
    const availH = S - startY - pad;
    const rowH = availH / points.length;

    points.forEach((pt, i) => {
        const y = startY + i * rowH;

        // Left accent bar
        ctx.fillStyle = accent;
        ctx.fillRect(pad, y + 6, 3, rowH - 24);

        // Text
        ctx.fillStyle = "#2C2520";
        drawAutoShrinkText(ctx, pt, pad + 24, y + 8, S - pad * 2 - 24, rowH - 24, 28, FONT_REGULAR, "400", { lineGap: 1.5 });
    });
}

// ==========================================
// 5. TRADITIONAL — 명조체 요약
//    다크 배경 + 세리프 타이포 + 격조있는 간격
// ==========================================
function renderSummaryTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { summaryPoints } = input;
    const { accent } = assets;
    const pad = 100;

    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.03);

    // Inner border
    ctx.strokeStyle = rgba(accent, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Label — serif with em-dash
    ctx.fillStyle = rgba(accent, 0.7);
    ctx.font = `400 16px ${FONT_REGULAR}`;
    ctx.fillText("— 주요 쟁점 사항", pad, pad);

    // Points — serif, ample spacing
    const points = getPoints(summaryPoints, "주요 쟁점이 없습니다.").slice(0, 4);
    const startY = pad + 60;
    const availH = S - startY - pad;
    const rowH = availH / points.length;

    points.forEach((pt, i) => {
        const y = startY + i * rowH;

        // Thin separator
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(pad, y, S - pad * 2, 1);

        // Accent diamond
        ctx.fillStyle = rgba(accent, 0.5);
        ctx.save();
        ctx.translate(pad + 8, y + 22);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();

        // Text — serif
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        drawAutoShrinkText(ctx, pt, pad + 30, y + 10, S - pad * 2 - 30, rowH - 20, 28, FONT_REGULAR, "400", { lineGap: 1.6 });
    });
}
