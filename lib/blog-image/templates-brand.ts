/**
 * Brand Image Templates — 4 Premium Designs
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawGradientOverlay, drawCircleImage,
    roundRect, rgba, contrastColor, darken,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderBrandTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const tid = (input.templateId ?? 0) % 4;
    const { lawyerName, officeName, specialty, brandLines } = input.profile;
    const { accent, profileImg, officeImg, logoImg } = assets;

    switch (tid) {
        case 0: return b0_logoCentered(ctx, lawyerName, officeName, specialty, brandLines, profileImg, officeImg, logoImg, accent);
        case 1: return b1_darkEditorial(ctx, lawyerName, officeName, specialty, brandLines, profileImg, officeImg, logoImg, accent);
        case 2: return b2_gradientBold(ctx, lawyerName, officeName, specialty, brandLines, profileImg, officeImg, logoImg, accent);
        case 3: return b3_photoEditorial(ctx, lawyerName, officeName, specialty, brandLines, profileImg, officeImg, logoImg, accent);
        default: return b0_logoCentered(ctx, lawyerName, officeName, specialty, brandLines, profileImg, officeImg, logoImg, accent);
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
// B0: 로고 센터
// ════════════════════════════════════════
function b0_logoCentered(ctx: SKRSContext2D, name: string, office: string, specialty: string[], brandLines: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Mesh gradient
    const g1 = ctx.createRadialGradient(S * 0.2, S * 0.8, 0, S * 0.2, S * 0.8, S * 0.5);
    g1.addColorStop(0, rgba(accent, 0.06));
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, S, S);

    // Accent lines
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);
    ctx.fillRect(0, S - 5, S, 5);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Logo large center
    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, 160, lw, lh);
    }

    // Office name
    ctx.font = `800 14px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.fillText(office || "법률 전문", S / 2, logoImg ? 268 : 200);

    // Divider
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(S / 2 - 32, logoImg ? 304 : 240, 64, 2);

    // Brand lines
    const lines = brandLines?.length ? brandLines : [`${name} 변호사가 함께합니다`];
    const startY = logoImg ? 340 : 276;
    lines.slice(0, 3).forEach((line, i) => {
        ctx.font = `${i === 0 ? "700" : "500"} ${i === 0 ? 28 : 20}px ${i === 0 ? FONT_BOLD : FONT_REGULAR}`;
        ctx.fillStyle = `rgba(255,255,255,${i === 0 ? 0.95 : 0.65})`;
        ctx.fillText(line, S / 2, startY + i * 44);
    });

    // Specialty tags
    if (specialty?.length) {
        const tagY = startY + lines.slice(0, 3).length * 44 + 32;
        ctx.font = `500 13px ${FONT_REGULAR}`;
        const tags = specialty.slice(0, 5);
        let totalW = 0;
        const widths = tags.map(t => ctx.measureText(t).width + 24);
        widths.forEach(w => totalW += w + 8);
        let x = (S - totalW + 8) / 2;
        tags.forEach((tag, i) => {
            ctx.fillStyle = rgba(accent, 0.12);
            roundRect(ctx, x, tagY, widths[i], 28, 14);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.textAlign = "center";
            ctx.fillText(tag, x + widths[i] / 2, tagY + 7);
            ctx.textAlign = "center";
            x += widths[i] + 8;
        });
    }

    // Profile + name at bottom
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S / 2 - 56, S - 100, 24, rgba(accent, 0.3));
        ctx.font = `600 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`${name} 변호사`, S / 2 + 10, S - 108);
    } else {
        ctx.font = `600 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`${name} 변호사`, S / 2, S - 80);
    }

    ctx.textAlign = "left";
}

// ════════════════════════════════════════
// B1: 다크 에디토리얼
// ════════════════════════════════════════
function b1_darkEditorial(ctx: SKRSContext2D, name: string, office: string, specialty: string[], brandLines: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Left bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 8, S);

    // § Watermark
    ctx.font = `900 360px serif`;
    ctx.fillStyle = rgba(accent, 0.03);
    ctx.textBaseline = "top";
    ctx.fillText("§", S - 340, S - 380);

    // Logo
    if (logoImg) {
        const lh = 44;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, 56, 56, lw, lh);
    }

    // Office
    ctx.font = `800 13px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.fillText(office || "법률 전문", 56, 124);

    // Name large
    ctx.font = `900 52px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name}`, 56, 160);
    ctx.font = `700 32px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("변호사", 56, 222);

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(56, 280, 48, 3);

    // Brand lines
    const lines = brandLines?.length ? brandLines : [`의뢰인의 권리를 위해`, `끝까지 함께합니다`];
    lines.slice(0, 3).forEach((line, i) => {
        ctx.font = `${i === 0 ? "700" : "500"} ${i === 0 ? 24 : 18}px ${i === 0 ? FONT_BOLD : FONT_REGULAR}`;
        ctx.fillStyle = `rgba(255,255,255,${i === 0 ? 0.85 : 0.55})`;
        ctx.fillText(line, 56, 316 + i * 40);
    });

    // Specialty at bottom
    if (specialty?.length) {
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(specialty.join(" · "), 56, S - 64);
    }

    // Profile right bottom
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S - 140, S - 140, 80, rgba(accent, 0.2), 3);
    }
}

// ════════════════════════════════════════
// B2: 그라디언트 볼드
// ════════════════════════════════════════
function b2_gradientBold(ctx: SKRSContext2D, name: string, office: string, specialty: string[], brandLines: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg, "#0A0E1A");

    // Dot pattern
    for (let y = 0; y < S; y += 32) {
        for (let x = 0; x < S; x += 32) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.fill();
        }
    }

    const tc = contrastColor(accent);

    // Glass card
    const cardW = S - 160;
    const cardH = 500;
    const cardX = 80;
    const cardY = (S - cardH) / 2;

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Logo
    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, cardY + 48, lw, lh);
    }

    // Office
    ctx.font = `800 13px ${FONT_BOLD}`;
    ctx.fillStyle = rgba(tc, 0.7);
    ctx.fillText(office || "법률 전문", S / 2, cardY + (logoImg ? 128 : 64));

    // Brand lines centered
    const lines = brandLines?.length ? brandLines : [`${name} 변호사가 함께합니다`];
    const startY = cardY + (logoImg ? 172 : 108);
    lines.slice(0, 3).forEach((line, i) => {
        ctx.font = `${i === 0 ? "900" : "500"} ${i === 0 ? 32 : 22}px ${i === 0 ? FONT_BLACK : FONT_REGULAR}`;
        ctx.fillStyle = rgba(tc, i === 0 ? 1 : 0.75);
        ctx.fillText(line, S / 2, startY + i * 48);
    });

    // Name
    ctx.fillStyle = rgba(tc, 0.4);
    ctx.fillRect(S / 2 - 28, cardY + cardH - 92, 56, 2);
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillStyle = rgba(tc, 0.65);
    ctx.fillText(`${name} 변호사`, S / 2, cardY + cardH - 72);

    ctx.textAlign = "left";
}

// ════════════════════════════════════════
// B3: 포토 에디토리얼
// ════════════════════════════════════════
function b3_photoEditorial(ctx: SKRSContext2D, name: string, office: string, specialty: string[], brandLines: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg, "#0A0E1A");

    drawGradientOverlay(ctx, "full", "#000000", 0.5, 0.9);

    // Accent top bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // Logo center top
    if (logoImg) {
        const lh = 64;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, 80, lw, lh);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Profile large
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S / 2, 340, 120, rgba(accent, 0.3), 4);
    }

    // Name
    ctx.font = `900 40px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name} 변호사`, S / 2, profileImg ? 490 : 220);

    // Office
    if (office) {
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = accent;
        ctx.fillText(office, S / 2, profileImg ? 542 : 274);
    }

    // Divider
    ctx.fillStyle = rgba(accent, 0.4);
    const divY = profileImg ? 578 : 312;
    ctx.fillRect(S / 2 - 32, divY, 64, 2);

    // Brand lines
    const lines = brandLines?.length ? brandLines : [`의뢰인의 권리를 위해 끝까지 함께합니다`];
    lines.slice(0, 3).forEach((line, i) => {
        ctx.font = `${i === 0 ? "600" : "400"} ${i === 0 ? 20 : 16}px ${i === 0 ? FONT_BOLD : FONT_REGULAR}`;
        ctx.fillStyle = `rgba(255,255,255,${i === 0 ? 0.8 : 0.55})`;
        ctx.fillText(line, S / 2, divY + 24 + i * 36);
    });

    // Specialty
    if (specialty?.length) {
        ctx.font = `500 13px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(specialty.slice(0, 4).join(" · "), S / 2, S - 56);
    }

    ctx.textAlign = "left";
}
