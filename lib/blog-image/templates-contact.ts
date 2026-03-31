/**
 * Contact Image Templates — 4 Premium CTA Designs
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawCircleImage, drawGradientOverlay,
    roundRect, rgba, contrastColor,
    type RenderInput, type Assets,
} from "./renderer";

const S = SIZE;

export function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const tid = (input.templateId ?? 0) % 4;
    const { lawyerName, officeName, phone, address, specialty } = input.profile;
    const { accent, profileImg, officeImg, logoImg } = assets;

    switch (tid) {
        case 0: return c0_cleanHorizontal(ctx, lawyerName, officeName, phone, address, specialty, profileImg, officeImg, logoImg, accent);
        case 1: return c1_darkPremium(ctx, lawyerName, officeName, phone, address, specialty, profileImg, officeImg, logoImg, accent);
        case 2: return c2_photoBg(ctx, lawyerName, officeName, phone, address, specialty, profileImg, officeImg, logoImg, accent);
        case 3: return c3_splitProfile(ctx, lawyerName, officeName, phone, address, specialty, profileImg, officeImg, logoImg, accent);
        default: return c0_cleanHorizontal(ctx, lawyerName, officeName, phone, address, specialty, profileImg, officeImg, logoImg, accent);
    }
}

type Img = import("@napi-rs/canvas").Image | null;

// ════════════════════════════════════════
// C0: 클린 가로형
// ════════════════════════════════════════
function c0_cleanHorizontal(ctx: SKRSContext2D, name: string, office: string, phone: string, address: string, specialty: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    ctx.fillStyle = "#0A0E1A";
    ctx.fillRect(0, 0, S, S);

    // Accent top
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, S, 5);

    // Large profile circle
    if (profileImg) {
        drawCircleImage(ctx, profileImg, S / 2, 300, 160, rgba(accent, 0.3), 4);
    } else {
        ctx.beginPath();
        ctx.arc(S / 2, 300, 160, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.1);
        ctx.fill();
        ctx.font = `900 100px ${FONT_BLACK}`;
        ctx.fillStyle = rgba(accent, 0.4);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name[0], S / 2, 300);
    }

    // Name
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `900 36px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name} 변호사`, S / 2, 500);

    // Office
    if (office) {
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = accent;
        ctx.fillText(office, S / 2, 548);
    }

    // Specialty tags
    if (specialty?.length) {
        const tags = specialty.slice(0, 4);
        const tagY = 590;
        ctx.font = `500 13px ${FONT_REGULAR}`;
        let totalW = 0;
        const widths = tags.map(t => ctx.measureText(t).width + 24);
        widths.forEach(w => totalW += w + 8);
        let x = (S - totalW + 8) / 2;
        tags.forEach((tag, i) => {
            ctx.fillStyle = rgba(accent, 0.1);
            roundRect(ctx, x, tagY, widths[i], 28, 14);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.fillText(tag, x + 12, tagY + 7);
            x += widths[i] + 8;
        });
    }

    // Divider
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(S / 2 - 40, 648, 80, 2);

    // Contact info
    const infoY = 680;
    ctx.font = `500 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    if (phone) ctx.fillText(`📞 ${phone}`, S / 2, infoY);
    if (address) {
        ctx.font = `400 14px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`📍 ${address}`, S / 2, infoY + 36);
    }

    // CTA
    ctx.fillStyle = accent;
    roundRect(ctx, S / 2 - 120, S - 120, 240, 52, 26);
    ctx.fill();
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillStyle = contrastColor(accent);
    ctx.fillText("지금 상담하기", S / 2, S - 100);

    ctx.textAlign = "left";

    if (logoImg) {
        const lh = 36;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, S - 56, lw, lh);
    }
}

// ════════════════════════════════════════
// C1: 다크 프리미엄
// ════════════════════════════════════════
function c1_darkPremium(ctx: SKRSContext2D, name: string, office: string, phone: string, address: string, specialty: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    ctx.fillStyle = "#0A0E1A";
    ctx.fillRect(0, 0, S, S);

    // § Watermark
    ctx.font = `900 400px serif`;
    ctx.fillStyle = rgba(accent, 0.03);
    ctx.textBaseline = "top";
    ctx.fillText("§", S - 380, S - 420);

    // Accent bar left
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 8, S);

    // Logo
    if (logoImg) {
        const lh = 48;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, 56, 60, lw, lh);
    }

    // Office
    ctx.font = `700 14px ${FONT_BOLD}`;
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.fillText(office || "법률 전문", 56, 128);

    // Name large
    ctx.font = `900 48px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name} 변호사`, 56, 164);

    // Specialty
    if (specialty?.length) {
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(specialty.join(" · "), 56, 228);
    }

    // Divider
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(56, 268, S - 112, 1);

    // Profile + contact info
    const infoX = profileImg ? 280 : 56;
    if (profileImg) {
        drawCircleImage(ctx, profileImg, 160, 420, 100, rgba(accent, 0.25), 3);
    }

    ctx.font = `500 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    if (phone) {
        ctx.fillText("전화번호", infoX, 316);
        ctx.font = `700 22px ${FONT_BOLD}`;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(phone, infoX, 342);
    }
    if (address) {
        ctx.font = `500 16px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText("주소", infoX, 396);
        ctx.font = `500 15px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText(address, infoX, 422);
    }

    // Brand lines
    const brandLines = (globalThis as any).__brandLines as string[] | undefined;
    // CTA box
    ctx.fillStyle = accent;
    roundRect(ctx, 56, S - 140, S - 112, 56, 12);
    ctx.fill();
    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillStyle = contrastColor(accent);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("무료 상담 예약하기", S / 2, S - 112);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Phone bottom
    ctx.font = `500 13px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText(`📞 ${phone || "전화 문의"}`, 56, S - 64);
}

// ════════════════════════════════════════
// C2: 포토 배경
// ════════════════════════════════════════
function c2_photoBg(ctx: SKRSContext2D, name: string, office: string, phone: string, address: string, specialty: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    if (officeImg) {
        drawCover(ctx, officeImg, 0, 0, S, S);
    } else {
        ctx.fillStyle = "#0A0E1A";
        ctx.fillRect(0, 0, S, S);
    }

    drawGradientOverlay(ctx, "full", "#000000", 0.4, 0.88);

    // Center card
    const cardW = S - 160;
    const cardH = 520;
    const cardX = 80;
    const cardY = (S - cardH) / 2;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    // Profile
    const profileCX = S / 2;
    if (profileImg) {
        drawCircleImage(ctx, profileImg, profileCX, cardY + 90, 64, rgba(accent, 0.3), 3);
    }

    // Name
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `900 32px ${FONT_BLACK}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`${name} 변호사`, S / 2, cardY + 176);

    if (office) {
        ctx.font = `500 15px ${FONT_REGULAR}`;
        ctx.fillStyle = accent;
        ctx.fillText(office, S / 2, cardY + 220);
    }

    // Divider
    ctx.fillStyle = rgba(accent, 0.4);
    ctx.fillRect(S / 2 - 32, cardY + 256, 64, 2);

    // Contact
    ctx.font = `500 16px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    if (phone) ctx.fillText(`📞 ${phone}`, S / 2, cardY + 284);
    if (address) {
        ctx.font = `400 14px ${FONT_REGULAR}`;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`📍 ${address}`, S / 2, cardY + 318);
    }

    // CTA
    ctx.fillStyle = accent;
    roundRect(ctx, S / 2 - 110, cardY + cardH - 80, 220, 48, 24);
    ctx.fill();
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillStyle = contrastColor(accent);
    ctx.fillText("상담 문의하기", S / 2, cardY + cardH - 62);

    ctx.textAlign = "left";

    if (logoImg) {
        const lh = 32;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, (S - lw) / 2, S - 56, lw, lh);
    }
}

// ════════════════════════════════════════  
// C3: 스플릿 프로필
// ════════════════════════════════════════
function c3_splitProfile(ctx: SKRSContext2D, name: string, office: string, phone: string, address: string, specialty: string[], profileImg: Img, officeImg: Img, logoImg: Img, accent: string) {
    ctx.fillStyle = "#0A0E1A";
    ctx.fillRect(0, 0, S, S);

    // Left accent column
    const leftW = 360;
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, leftW, S);

    // Profile on accent
    if (profileImg) {
        drawCircleImage(ctx, profileImg, leftW / 2, 320, 120, contrastColor(accent), 4);
    } else {
        ctx.beginPath();
        ctx.arc(leftW / 2, 320, 120, 0, Math.PI * 2);
        ctx.fillStyle = rgba(contrastColor(accent), 0.15);
        ctx.fill();
        ctx.font = `900 80px ${FONT_BLACK}`;
        ctx.fillStyle = contrastColor(accent);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name[0], leftW / 2, 320);
    }

    // Name on accent
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `900 28px ${FONT_BLACK}`;
    ctx.fillStyle = contrastColor(accent);
    ctx.fillText(`${name} 변호사`, leftW / 2, 470);

    if (office) {
        ctx.font = `500 14px ${FONT_REGULAR}`;
        ctx.fillStyle = rgba(contrastColor(accent), 0.7);
        ctx.fillText(office, leftW / 2, 510);
    }

    // Specialty tags on accent
    if (specialty?.length) {
        ctx.font = `500 12px ${FONT_REGULAR}`;
        ctx.fillStyle = rgba(contrastColor(accent), 0.6);
        ctx.fillText(specialty.slice(0, 3).join(" · "), leftW / 2, 544);
    }

    ctx.textAlign = "left";

    // Right side: contact info
    const rx = leftW + 56;

    // Logo
    if (logoImg) {
        const lh = 40;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, rx, 64, lw, lh);
    }

    ctx.font = `700 14px ${FONT_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("CONTACT INFORMATION", rx, 132);

    // Phone
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 14px ${FONT_REGULAR}`;
    ctx.fillText("전화번호", rx, 192);
    ctx.font = `700 24px ${FONT_BOLD}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(phone || "-", rx, 214);

    // Address
    ctx.font = `500 14px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("주소", rx, 280);
    ctx.font = `500 15px ${FONT_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(address || "-", rx, 304);

    // CTA
    ctx.fillStyle = accent;
    const ctaW = S - leftW - 112;
    roundRect(ctx, rx, S - 140, ctaW, 52, 12);
    ctx.fill();
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.fillStyle = contrastColor(accent);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("지금 상담하기", rx + ctaW / 2, S - 114);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
}
