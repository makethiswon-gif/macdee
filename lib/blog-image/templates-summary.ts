/**
 * Summary Image Templates — 6 Premium Designs
 * Shows 6-8 key points from blog content
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawGradientOverlay, drawVignette,
    drawWrappedText, roundRect, rgba, contrastColor,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderSummaryTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const tid = (input.templateId ?? 0) % 6;
    const { title, summaryPoints } = input;
    const { lawyerName, officeName } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    switch (tid) {
        case 0: return s0_numberedList(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        case 1: return s1_cardGrid(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        case 2: return s2_timeline(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        case 3: return s3_darkCards(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        case 4: return s4_accentBars(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        case 5: return s5_minimalClean(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
        default: return s0_numberedList(ctx, title, summaryPoints, lawyerName, officeName, officeImg, logoImg, accent);
    }
}

type Img = import("@napi-rs/canvas").Image | null;

function drawOfficeBg(ctx: SKRSContext2D, officeImg: Img, baseColor = "#0A0E1A") {
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
        ctx.fillRect(0, 0, S, S);
    } else {
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, S, S);
    }
}

// ════════════════════════════════════════
// S0: 넘버링 리스트 (다크)
// ════════════════════════════════════════
function s0_numberedList(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Accent top bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // Title
    ctx.font = `900 36px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 64, 48, S - 128, 46, { maxLines: 2 });

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(64, 152, 48, 3);

    // Points
    const pts = points.slice(0, 8);
    const startY = 180;
    const itemH = Math.min(96, (S - startY - 100) / pts.length);

    pts.forEach((pt, i) => {
        const y = startY + i * itemH;

        // Number circle
        ctx.beginPath();
        ctx.arc(88, y + 16, 16, 0, Math.PI * 2);
        ctx.fillStyle = i < 3 ? accent : rgba(accent, 0.6);
        ctx.fill();
        ctx.font = `800 13px ${FONT_BOLD}`;
        ctx.fillStyle = contrastColor(accent);
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1).padStart(2, "0"), 88, y + 12);
        ctx.textAlign = "left";

        // Text
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawWrappedText(ctx, pt, 120, y + 4, S - 192, 22, { maxLines: 3 });
    });

    // Name bottom
    ctx.font = `500 14px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 64, S - 52);

    if (logoImg) {
        const lh = 36;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S - lw - 64, S - 60, lw, lh);
    }
}

// ════════════════════════════════════════
// S1: 카드 그리드
// ════════════════════════════════════════
function s1_cardGrid(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Subtle gradient
    const g = ctx.createRadialGradient(S * 0.5, S * 0.3, 0, S * 0.5, S * 0.3, S * 0.6);
    g.addColorStop(0, rgba(accent, 0.04));
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // Title
    ctx.font = `900 32px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 56, 44, S - 112, 42, { maxLines: 2 });

    // Accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(56, 136, 40, 3);

    // Cards grid (2 columns)
    const pts = points.slice(0, 8);
    const cols = 2;
    const cardPad = 16;
    const gridX = 56;
    const gridY = 164;
    const cardW = (S - 112 - cardPad) / cols;
    const rows = Math.ceil(pts.length / cols);
    const cardH = Math.min(100, (S - gridY - 100) / rows - cardPad);

    pts.forEach((pt, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gridX + col * (cardW + cardPad);
        const cy = gridY + row * (cardH + cardPad);

        // Card bg
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        roundRect(ctx, cx, cy, cardW, cardH, 12);
        ctx.fill();

        // Card border
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        roundRect(ctx, cx, cy, cardW, cardH, 12);
        ctx.stroke();

        // Number
        ctx.font = `800 28px ${FONT_BLACK}`;
        ctx.fillStyle = rgba(accent, 0.5);
        ctx.fillText(String(i + 1).padStart(2, "0"), cx + 16, cy + 14);

        // Text
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        drawWrappedText(ctx, pt, cx + 16, cy + 48, cardW - 32, 19, { maxLines: 3 });
    });

    // Name
    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 56, S - 44);
}

// ════════════════════════════════════════
// S2: 타임라인
// ════════════════════════════════════════
function s2_timeline(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Title
    ctx.font = `900 34px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 64, 48, S - 128, 44, { maxLines: 2 });

    ctx.fillStyle = accent;
    ctx.fillRect(64, 148, 40, 3);

    const pts = points.slice(0, 8);
    const startY = 180;
    const lineX = 96;
    const itemH = Math.min(96, (S - startY - 80) / pts.length);

    // Timeline vertical line
    ctx.fillStyle = rgba(accent, 0.2);
    ctx.fillRect(lineX, startY, 2, pts.length * itemH - 16);

    pts.forEach((pt, i) => {
        const y = startY + i * itemH;

        // Dot on timeline
        ctx.beginPath();
        ctx.arc(lineX + 1, y + 10, 6, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();

        // Inner dot
        ctx.beginPath();
        ctx.arc(lineX + 1, y + 10, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#0A0E1A";
        ctx.fill();

        // Number
        ctx.font = `700 12px ${FONT_BOLD}`;
        ctx.fillStyle = accent;
        ctx.textAlign = "right";
        ctx.fillText(String(i + 1).padStart(2, "0"), lineX - 16, y + 6);
        ctx.textAlign = "left";

        // Text
        ctx.font = `500 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        drawWrappedText(ctx, pt, lineX + 24, y, S - lineX - 88, 21, { maxLines: 3 });
    });

    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 64, S - 44);
}

// ════════════════════════════════════════
// S3: 다크 카드 (phot bg)
// ════════════════════════════════════════
function s3_darkCards(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Title with accent underline
    ctx.font = `900 32px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 56, 44, S - 112, 42, { maxLines: 2 });

    ctx.fillStyle = accent;
    ctx.fillRect(56, 138, 48, 3);

    const pts = points.slice(0, 8);
    const startY = 168;
    const itemH = Math.min(92, (S - startY - 90) / pts.length);

    pts.forEach((pt, i) => {
        const y = startY + i * itemH;

        // Left accent bar
        ctx.fillStyle = i < 2 ? accent : rgba(accent, 0.5);
        roundRect(ctx, 56, y + 2, 4, itemH - 14, 2);
        ctx.fill();

        // Number
        ctx.font = `800 12px ${FONT_BOLD}`;
        ctx.fillStyle = accent;
        ctx.fillText(String(i + 1).padStart(2, "0"), 76, y + 4);

        // Text
        ctx.font = `500 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        drawWrappedText(ctx, pt, 76, y + 22, S - 148, 20, { maxLines: 3 });
    });

    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 56, S - 48);

    if (logoImg) {
        const lh = 36;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S - lw - 56, S - 56, lw, lh);
    }
}

// ════════════════════════════════════════
// S4: 액센트 바
// ════════════════════════════════════════
function s4_accentBars(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Accent left bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 8, S);

    // Title
    ctx.font = `900 34px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 40, 48, S - 80, 44, { maxLines: 2 });

    ctx.fillStyle = accent;
    ctx.fillRect(40, 146, 48, 3);

    const pts = points.slice(0, 8);
    const startY = 176;
    const itemH = Math.min(96, (S - startY - 90) / pts.length);

    pts.forEach((pt, i) => {
        const y = startY + i * itemH;

        // Horizontal bar background
        const barAlpha = 0.03 + (i % 2) * 0.02;
        ctx.fillStyle = `rgba(255,255,255,${barAlpha})`;
        roundRect(ctx, 40, y, S - 80, itemH - 8, 8);
        ctx.fill();

        // Number
        ctx.font = `800 24px ${FONT_BLACK}`;
        ctx.fillStyle = rgba(accent, 0.4);
        ctx.fillText(String(i + 1).padStart(2, "0"), 56, y + 10);

        // Text
        ctx.font = `500 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        drawWrappedText(ctx, pt, 56, y + 42, S - 152, 20, { maxLines: 2 });
    });

    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 40, S - 44);
}

// ════════════════════════════════════════
// S5: 미니멀 클린
// ════════════════════════════════════════
function s5_minimalClean(ctx: SKRSContext2D, title: string, points: string[], name: string, office: string, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Accent line top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 4);

    // Title
    ctx.font = `900 34px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 64, 44, S - 128, 44, { maxLines: 2 });

    const pts = points.slice(0, 8);
    const startY = 148;
    const itemH = Math.min(100, (S - startY - 80) / pts.length);

    // Subtle divider
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(64, startY - 8, S - 128, 1);

    pts.forEach((pt, i) => {
        const y = startY + i * itemH;

        // Dot
        ctx.beginPath();
        ctx.arc(78, y + 14, 4, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();

        // Text
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        drawWrappedText(ctx, pt, 100, y + 4, S - 172, 22, { maxLines: 3 });
    });

    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 64, S - 44);
}
