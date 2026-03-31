/**
 * Main Image Templates — 12 Premium Law Firm Designs
 * 1024×1024 server-rendered via @napi-rs/canvas
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawCircleImage, drawGradientOverlay, drawVignette,
    drawWrappedText, drawTextWithShadow, roundRect,
    rgba, contrastColor, darken,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const tid = (input.templateId ?? 0) % 12;
    const { title } = input;
    const { lawyerName, officeName } = input.profile;
    const { profileImg, officeImg, logoImg, accent } = assets;

    switch (tid) {
        case 0: return t0_darkCinematic(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 1: return t1_profileSpotlight(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 2: return t2_editorial(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 3: return t3_glassmorphism(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 4: return t4_split(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 5: return t5_minimalDark(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 6: return t6_lawFirmPremium(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 7: return t7_photoOverlay(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 8: return t8_profileFullshot(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 9: return t9_magazineCover(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 10: return t10_quoteStyle(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        case 11: return t11_accentBlock(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
        default: return t0_darkCinematic(ctx, title, lawyerName, officeName, officeImg, profileImg, logoImg, accent);
    }
}

type Img = import("@napi-rs/canvas").Image | null;

// ── Helper ──
function drawBg(ctx: SKRSContext2D, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, S, S);
}

function drawOfficeBg(ctx: SKRSContext2D, officeImg: Img) {
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
    } else {
        const grad = ctx.createLinearGradient(0, 0, S, S);
        grad.addColorStop(0, "#0B0F1A");
        grad.addColorStop(1, "#1A1F35");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);
    }
}

function drawNameTag(ctx: SKRSContext2D, name: string, office: string, x: number, y: number, color = "#FFFFFF", alpha = 0.7) {
    ctx.font = `500 16px ${FONT_REGULAR}`;
    ctx.fillStyle = rgba(color === "#FFFFFF" ? "#FFFFFF" : "#000000", alpha);
    ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, x, y);
}

function drawLogo(ctx: SKRSContext2D, logoImg: Img, x: number, y: number, h: number) {
    if (!logoImg) return;
    const scale = h / logoImg.height;
    const w = logoImg.width * scale;
    ctx.drawImage(logoImg, x, y, w, h);
}

// ════════════════════════════════════════
// T0: 다크 시네마틱
// ════════════════════════════════════════
function t0_darkCinematic(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);
    drawGradientOverlay(ctx, "bottom", "#000000", 0.1, 0.92);
    drawVignette(ctx, 0.4);

    // Accent bottom bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, S - 6, S, 6);

    // Title
    ctx.font = `900 52px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 72, S - 280, S - 144, 66, { shadow: true, maxLines: 3 });

    // Profile + name
    if (profileImg) {
        drawCircleImage(ctx, profileImg, 92, S - 60, 22, accent);
        drawNameTag(ctx, name, office, 124, S - 54);
    } else {
        drawNameTag(ctx, name, office, 72, S - 54);
    }

    // Logo bottom right
    if (logoImg) drawLogo(ctx, logoImg, S - 180, S - 78, 44);
}

// ════════════════════════════════════════
// T1: 프로필 스포트라이트
// ════════════════════════════════════════
function t1_profileSpotlight(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawBg(ctx, "#0A0E1A");

    // Subtle radial glow
    const grad = ctx.createRadialGradient(S * 0.3, S * 0.5, 0, S * 0.3, S * 0.5, S * 0.6);
    grad.addColorStop(0, rgba(accent, 0.08));
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Large profile circle on the right
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S - 240, S * 0.42, 200, rgba(accent, 0.3), 4);
    } else {
        ctx.beginPath();
        ctx.arc(S - 240, S * 0.42, 200, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.1);
        ctx.fill();
        ctx.font = `900 120px ${FONT_BLACK}`;
        ctx.fillStyle = rgba(accent, 0.3);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name[0], S - 240, S * 0.42);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
    }

    // Office label
    ctx.font = `700 14px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.letterSpacing = "3px";
    ctx.textBaseline = "top";
    ctx.fillText(office || "법률 전문", 72, 80);
    ctx.letterSpacing = "0px";

    // Title
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 72, 140, S * 0.5, 62, { maxLines: 5 });

    // Name + accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(72, S - 100, 36, 3);
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${name} 변호사`, 72, S - 78);

    if (logoImg) drawLogo(ctx, logoImg, S - 180, S - 78, 40);
}

// ════════════════════════════════════════
// T2: 에디토리얼
// ════════════════════════════════════════
function t2_editorial(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);
    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, S, S);

    // Double frame
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, S - 40, S - 40);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, S - 56, S - 56);

    // Top header bar
    ctx.font = `900 14px ${FONT_BOLD}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.fillText(office || name, 48, 42);
    ctx.font = `600 12px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText("LAW COLUMN", S - 48, 44);
    ctx.textAlign = "left";

    // Divider
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(48, 64, S - 96, 2);

    // Title (serif-like bold)
    ctx.font = `900 44px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 56, 100, S - 112, 60, { shadow: true, maxLines: 5 });

    // Bottom bar
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(48, S - 68, S - 96, 1);
    ctx.font = `600 14px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`${name} 변호사`, 56, S - 50);

    // Accent dots
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(S - 56 - i * 14, S - 46, 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? accent : rgba(accent, 0.3);
        ctx.fill();
    }
}

// ════════════════════════════════════════
// T3: 글래스모피즘
// ════════════════════════════════════════
function t3_glassmorphism(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);
    drawVignette(ctx, 0.35);

    // Glass card
    const cardX = 56, cardY = 72, cardW = S - 112, cardH = 420;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    // Glass border
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    // Accent bar inside card
    ctx.fillStyle = accent;
    ctx.fillRect(cardX + 40, cardY + 36, 40, 4);

    // Title inside card
    ctx.font = `900 42px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, cardX + 40, cardY + 60, cardW - 80, 56, { shadow: true, maxLines: 5 });

    // Name inside card bottom
    if (profileImg) {
        drawCircleImage(ctx, profileImg, cardX + 60, cardY + cardH - 40, 18, accent);
        drawNameTag(ctx, name, office, cardX + 88, cardY + cardH - 46);
    } else {
        drawNameTag(ctx, name, office, cardX + 40, cardY + cardH - 46);
    }

    // Logo bottom right
    if (logoImg) drawLogo(ctx, logoImg, S - 180, S - 78, 48);
}

// ════════════════════════════════════════
// T4: 스플릿
// ════════════════════════════════════════
function t4_split(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    // Left accent panel
    const leftW = S * 0.52;
    const grad = ctx.createLinearGradient(0, 0, leftW, S);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, darken(accent, 0.3));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, leftW, S);

    // Right photo panel
    if (officeImg) {
        drawCover(ctx, officeImg, leftW, 0, S - leftW, S);
    } else {
        ctx.fillStyle = "#0A0E1A";
        ctx.fillRect(leftW, 0, S - leftW, S);
    }

    // Vertical accent bar
    const tc = contrastColor(accent);
    ctx.fillStyle = rgba(tc, 0.25);
    ctx.fillRect(44, S * 0.25, 4, 48);

    // Title on accent panel
    ctx.font = `900 44px ${FONT_BLACK}`;
    ctx.fillStyle = tc;
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 44, S * 0.25 + 68, leftW - 88, 58, { maxLines: 5 });

    // Name
    if (profileImg) {
        drawCircleImage(ctx, profileImg, 66, S - 80, 22, rgba(tc, 0.4));
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = rgba(tc, 0.7);
        ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 98, S - 86);
    } else {
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = rgba(tc, 0.7);
        ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 44, S - 80);
    }

    if (logoImg) drawLogo(ctx, logoImg, S - 170, S - 74, 40);
}

// ════════════════════════════════════════
// T5: 미니멀 다크
// ════════════════════════════════════════
function t5_minimalDark(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawBg(ctx, "#0A0E1A");

    // Subtle mesh gradient
    const g1 = ctx.createRadialGradient(S * 0.15, S * 0.85, 0, S * 0.15, S * 0.85, S * 0.5);
    g1.addColorStop(0, rgba(accent, 0.06));
    g1.addColorStop(1, "transparent");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, S, S);

    // Accent left bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 8, S);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i < S; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
    }

    // Office label
    ctx.font = `800 13px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.fillText((office || "법률 전문").toUpperCase(), 48, 72);

    // Big title
    ctx.font = `900 56px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 48, 120, S - 96, 72, { maxLines: 5 });

    // Accent dots
    ctx.fillStyle = accent;
    ctx.fillRect(48, S - 120, 52, 5);
    ctx.fillStyle = rgba(accent, 0.4);
    ctx.fillRect(108, S - 120, 18, 5);

    // Name
    if (profileImg) {
        drawCircleImage(ctx, profileImg, 72, S - 68, 22, accent);
        ctx.font = `700 16px ${FONT_BOLD}`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${name} 변호사`, 104, S - 80);
        if (office) {
            ctx.font = `400 12px ${FONT_REGULAR}`;
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillText(office, 104, S - 58);
        }
    } else {
        ctx.font = `700 16px ${FONT_BOLD}`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(`${name} 변호사`, 48, S - 76);
    }

    if (logoImg) drawLogo(ctx, logoImg, S - 168, S - 78, 42);
}

// ════════════════════════════════════════
// T6: 로펌 프리미엄
// ════════════════════════════════════════
function t6_lawFirmPremium(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    // Dark navy background
    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, "#0B132B");
    grad.addColorStop(1, "#1C2541");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Gold accent line top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // § watermark
    ctx.font = `900 320px serif`;
    ctx.fillStyle = rgba(accent, 0.04);
    ctx.textBaseline = "top";
    ctx.fillText("§", S - 320, S - 360);

    // Logo center-top
    if (logoImg) {
        const lh = 56;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, 72, lw, lh);
    }

    // Office pill
    ctx.font = `800 13px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    const offLabel = office || "법률 전문";
    ctx.textAlign = "center";
    ctx.fillText(offLabel, S / 2, logoImg ? 152 : 100);
    ctx.textAlign = "left";

    // Title centered
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    const titleY = logoImg ? 200 : 160;
    drawWrappedText(ctx, title, S / 2, titleY, S - 160, 64, { maxLines: 5 });
    ctx.textAlign = "left";

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 32, S - 140, 64, 4);

    // Name centered
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S / 2 - 60, S - 90, 22, rgba(accent, 0.4));
        ctx.font = `600 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.textAlign = "center";
        ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, S / 2 + 10, S - 84);
        ctx.textAlign = "left";
    } else {
        ctx.font = `600 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.textAlign = "center";
        ctx.fillText(`${name} 변호사`, S / 2, S - 84);
        ctx.textAlign = "left";
    }
}

// ════════════════════════════════════════
// T7: 포토 오버레이
// ════════════════════════════════════════
function t7_photoOverlay(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);

    // Color grading
    ctx.fillStyle = "rgba(0,20,40,0.25)";
    ctx.fillRect(0, 0, S, S);
    drawGradientOverlay(ctx, "bottom", "#000000", 0.15, 0.88);
    drawVignette(ctx, 0.45);

    // Accent top bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // Office label
    ctx.font = `700 13px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.fillText(office || "법률 전문", 72, S - 300);

    // Title
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 72, S - 270, S - 144, 62, { shadow: true, maxLines: 3 });

    // Name
    ctx.font = `600 15px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    drawTextWithShadow(ctx, `${name} 변호사`, 72, S - 60);

    if (logoImg) drawLogo(ctx, logoImg, S - 180, S - 78, 44);
}

// ════════════════════════════════════════
// T8: 프로필 풀샷
// ════════════════════════════════════════
function t8_profileFullshot(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawBg(ctx, "#0A0E1A");

    // Profile on right (large)
    if (profileImg) {
        ctx.save();
        roundRect(ctx, S * 0.5, 0, S * 0.5, S, 0);
        ctx.clip();
        drawCover(ctx, profileImg, S * 0.45, 0, S * 0.55, S, "top");
        // Gradient fade left
        const fadeGrad = ctx.createLinearGradient(S * 0.45, 0, S * 0.65, 0);
        fadeGrad.addColorStop(0, "#0A0E1A");
        fadeGrad.addColorStop(1, "rgba(10,14,26,0)");
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(S * 0.45, 0, S * 0.25, S);
        ctx.restore();
    }

    // Logo/office top
    if (logoImg) {
        drawLogo(ctx, logoImg, 72, 64, 32);
    } else if (office) {
        ctx.font = `700 14px ${FONT_BOLD}`;
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textBaseline = "top";
        ctx.fillText(office, 72, 72);
    }

    // Office label
    ctx.font = `600 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textBaseline = "top";
    ctx.fillText(office || "법률 전문", 72, 140);

    // Big title left side
    ctx.font = `900 52px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 72, 176, S * 0.48, 66, { maxLines: 5 });

    // Name + accent bar bottom
    ctx.fillStyle = accent;
    ctx.fillRect(72, S - 120, 32, 3);
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name} 변호사`, 72, S - 96);
    if (office) {
        ctx.font = `400 13px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(office, 72, S - 72);
    }
}

// ════════════════════════════════════════
// T9: 매거진 커버
// ════════════════════════════════════════
function t9_magazineCover(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawBg(ctx, "#0A0E1A");

    // Top photo band (40%)
    if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, S, S * 0.4);
        ctx.clip();
        drawCover(ctx, officeImg, 0, 0, S, S * 0.4);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, S, S * 0.4);
        ctx.restore();
    } else {
        ctx.fillStyle = rgba(accent, 0.15);
        ctx.fillRect(0, 0, S, S * 0.4);
    }

    // Accent top line
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // Photo-to-dark gradient
    const fadeG = ctx.createLinearGradient(0, S * 0.3, 0, S * 0.45);
    fadeG.addColorStop(0, "rgba(10,14,26,0)");
    fadeG.addColorStop(1, "#0A0E1A");
    ctx.fillStyle = fadeG;
    ctx.fillRect(0, S * 0.3, S, S * 0.15);

    // Office dot + label
    ctx.beginPath();
    ctx.arc(72, S * 0.48, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.font = `700 13px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textBaseline = "top";
    ctx.fillText(office || "LEGAL COLUMN", 88, S * 0.47);

    // Title
    ctx.font = `900 52px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    drawWrappedText(ctx, title, 72, S * 0.53, S - 144, 66, { maxLines: 4 });

    // Bottom accent band
    ctx.fillStyle = accent;
    ctx.fillRect(0, S - 72, S, 72);

    // Name on accent band
    if (profileImg) {
        drawCircleImage(ctx, profileImg, 92, S - 36, 20, contrastColor(accent));
        ctx.font = `700 14px ${FONT_BOLD}`;
        ctx.fillStyle = contrastColor(accent);
        ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 122, S - 42);
    } else {
        ctx.font = `700 14px ${FONT_BOLD}`;
        ctx.fillStyle = contrastColor(accent);
        ctx.fillText(`${name} 변호사${office ? ` · ${office}` : ""}`, 72, S - 42);
    }
}

// ════════════════════════════════════════
// T10: 인용구 스타일
// ════════════════════════════════════════
function t10_quoteStyle(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawBg(ctx, "#0A0A0A");

    // Large circular profile
    if (profileImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(S - 260, S * 0.38, 210, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, profileImg, S - 470, S * 0.17, 420, 420, "top");
        ctx.restore();
        // Subtle ring
        ctx.strokeStyle = rgba(accent, 0.15);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(S - 260, S * 0.38, 212, 0, Math.PI * 2);
        ctx.stroke();
    } else if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(S - 260, S * 0.38, 210, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, officeImg, S - 470, S * 0.17, 420, 420);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(S - 470, S * 0.17, 420, 420);
        ctx.restore();
    }

    // Logo or office top-left
    if (logoImg) {
        drawLogo(ctx, logoImg, 48, 40, 28);
    } else if (office) {
        ctx.font = `800 14px ${FONT_BOLD}`;
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textBaseline = "top";
        ctx.fillText(office, 48, 42);
    }

    // Quote marks
    ctx.font = `300 72px serif`;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.textBaseline = "top";
    ctx.fillText("\u201C", 48, S * 0.55);
    ctx.save();
    ctx.translate(S * 0.56, S * 0.84);
    ctx.rotate(Math.PI);
    ctx.fillText("\u201C", 0, 0);
    ctx.restore();

    // Title
    ctx.font = `800 46px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    drawWrappedText(ctx, title, 48, S * 0.62, S * 0.58, 60, { maxLines: 4 });

    // Name bottom
    ctx.fillStyle = accent;
    ctx.fillRect(48, S - 80, 32, 3);
    ctx.font = `600 15px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`${name} 변호사`, 48, S - 58);
}

// ════════════════════════════════════════
// T11: 액센트 블록
// ════════════════════════════════════════
function t11_accentBlock(ctx: SKRSContext2D, title: string, name: string, office: string, officeImg: Img, profileImg: Img, logoImg: Img, accent: string) {
    drawOfficeBg(ctx, officeImg);
    drawGradientOverlay(ctx, "full", "#000000", 0.3, 0.7);
    drawVignette(ctx, 0.3);

    // Title with accent highlight blocks
    const words = title.split(" ");
    const line1 = words.slice(0, Math.ceil(words.length * 0.5)).join(" ");
    const line2 = words.slice(Math.ceil(words.length * 0.5)).join(" ");

    ctx.font = `900 46px ${FONT_BLACK}`;
    ctx.textBaseline = "top";

    const drawHighlightLine = (text: string, y: number) => {
        const metrics = ctx.measureText(text);
        const pad = 16;
        ctx.fillStyle = accent;
        roundRect(ctx, 72 - pad, y - 6, metrics.width + pad * 2, 58, 6);
        ctx.fill();
        ctx.fillStyle = contrastColor(accent);
        ctx.fillText(text, 72, y);
    };

    drawHighlightLine(line1, 100);
    if (line2) drawHighlightLine(line2, 170);

    // Name
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "#FFFFFF";
    drawTextWithShadow(ctx, `${name} 변호사${office ? ` · ${office}` : ""}`, 72, 260);

    if (logoImg) drawLogo(ctx, logoImg, S - 180, S - 78, 44);
}
