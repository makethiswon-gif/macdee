import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR, FONT_SERIF_BOLD, FONT_SERIF_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba, roundRect,
    type RenderInput, type Assets, hexToRgb
} from "./renderer";

const S = SIZE;

export function renderContactTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderContactTrendy(ctx, input, assets);
        case "cool": return renderContactCool(ctx, input, assets);
        case "warm": return renderContactWarm(ctx, input, assets);
        case "traditional": return renderContactTraditional(ctx, input, assets);
        case "classic":
        default: return renderContactClassic(ctx, input, assets);
    }
}

// ==========================================
// 1. CLASSIC (기존: 좌측 사진, 우측 텍스트 명함형)
// ==========================================
function renderContactClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website, jobTitle } = input.profile;
    const { profileImg, officeImg, logoImg, rawBrandColor } = assets;

    const paperColor = "#F9F8F4";
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, S, S);

    const leftW = Math.floor(S * 0.45);
    const rightW = S - leftW;
    const centerX = leftW + (rightW / 2);

    if (profileImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, S);
        ctx.clip();
        drawCover(ctx, profileImg, 0, 0, leftW, S);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(leftW - 1, 0, 1, S);
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        ctx.fillRect(leftW - 2, 0, 1, S);
        ctx.restore();
    } else if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, S);
        ctx.clip();
        ctx.filter = "grayscale(40%)";
        drawCover(ctx, officeImg, 0, 0, leftW, S);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(leftW - 1, 0, 1, S);
        ctx.restore();
    } else {
        ctx.fillStyle = rawBrandColor;
        ctx.fillRect(0, 0, leftW, S);
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(leftW - 1, 0, 1, S);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const baseText = "#333333";
    let currY = 170;

    ctx.fillStyle = rawBrandColor;
    ctx.font = `900 68px ${FONT_BLACK}`;
    ctx.fillText(lawyerName || "변호사", centerX, currY);
    currY += 60;

    ctx.font = `600 20px ${FONT_REGULAR}`;
    ctx.fillStyle = baseText;
    const titleStr = `${officeName || "법률사무소"} ${jobTitle || "대표변호사"}`;
    ctx.fillText(titleStr, centerX, currY);
    currY += 55;

    ctx.fillStyle = rawBrandColor;
    ctx.fillRect(centerX - 40, currY, 80, 2);
    currY += 75;

    ctx.fillStyle = baseText;
    ctx.globalAlpha = 0.85;
    if (address) {
        drawAutoShrinkText(ctx, address, centerX, currY, rightW - 100, 100, 18, FONT_REGULAR, "500", { shadow: false, minFontSize: 14 });
        currY += 100;
    } else currY += 60;

    ctx.globalAlpha = 1.0;
    if (phone) {
        const phones = phone.split(",").map(p => p.trim()).filter(Boolean);
        ctx.fillStyle = rawBrandColor;
        ctx.font = `800 32px ${FONT_BOLD}`;
        phones.forEach(p => {
            ctx.fillText(p, centerX, currY);
            currY += 48;
        });
        currY += 40;
    }

    if (website) {
        ctx.fillStyle = baseText;
        ctx.globalAlpha = 0.7;
        ctx.font = `400 18px ${FONT_REGULAR}`;
        ctx.fillText(website, centerX, currY);
        ctx.globalAlpha = 1.0;
    }

    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, centerX - lw / 2, S - 150, lw, lh);
    } else {
        ctx.fillStyle = rawBrandColor;
        ctx.font = `800 24px ${FONT_BOLD}`;
        ctx.fillText(officeName || "LAW FIRM", centerX, S - 120);
    }

    drawFilmGrain(ctx, 0.04);
}

// ==========================================
// 2. TRENDY (젊고 감각적인: 볼드 다크 테마)
// ==========================================
function renderContactTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address } = input.profile;
    const { accent, darkBg, logoImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Diagonal Split Background
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(S, S * 0.4);
    ctx.lineTo(S, S);
    ctx.lineTo(S * 0.4, S);
    ctx.fill();
    ctx.fillStyle = darkBg;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.font = `900 100px ${FONT_BLACK}`;
    ctx.fillText("CONTACT", 80, 100);
    ctx.fillText("NOW", 80, 200);

    ctx.fillStyle = accent;
    ctx.fillRect(80, 360, 60, 8);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 48px ${FONT_BOLD}`;
    ctx.fillText(`${officeName || "법률사무소"} | ${lawyerName} 변호사`, 80, 420);

    const phones = phone ? phone.split(",").map(p => p.trim()).filter(Boolean) : [];
    if (phones.length > 0) {
        ctx.fillStyle = accent;
        ctx.font = `900 72px ${FONT_BLACK}`;
        ctx.fillText(phones[0], 80, 540);
        if (phones.length > 1) {
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = `700 40px ${FONT_BOLD}`;
            ctx.fillText(phones[1], 80, 640);
        }
    } else {
        ctx.fillStyle = accent;
        ctx.font = `900 64px ${FONT_BLACK}`;
        ctx.fillText("상담 문의 환영", 80, 540);
    }

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    if (address) {
        drawAutoShrinkText(ctx, address, 80, 780, S - 160, 100, 24, FONT_REGULAR, "500", { lineGap: 1.5 });
    }

    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S - lw - 80, 100, lw, lh);
    }
}

// ==========================================
// 3. COOL (냉철한: 상하 분할 및 단색 라인)
// ==========================================
function renderContactCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, darkBg, officeImg, logoImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    const topH = S * 0.45;
    if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, S, topH);
        ctx.clip();
        ctx.filter = "grayscale(100%) contrast(1.2)";
        drawCover(ctx, officeImg, 0, 0, S, topH);
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, S, topH);
    }

    // Divider Line
    ctx.fillStyle = accent;
    ctx.fillRect(0, topH - 2, S, 4);

    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    let cy = topH + 100;
    ctx.font = `700 48px ${FONT_BOLD}`;
    ctx.fillText(`${officeName || "법률사무소"} ${lawyerName} 변호사`, S / 2, cy);
    cy += 120;

    const phones = phone ? phone.split(",").map(p => p.trim()).filter(Boolean) : [];
    ctx.fillStyle = accent;
    ctx.font = `800 64px ${FONT_BOLD}`;
    if (phones[0]) {
        ctx.fillText(phones[0], S / 2, cy);
        cy += 70;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `400 36px ${FONT_REGULAR}`;
        ctx.fillText(phones[1], S / 2, cy);
        cy += 90;
    } else cy += 40;

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    if (address) {
        drawAutoShrinkText(ctx, address, S / 2, cy, S - 200, 100, 20, FONT_REGULAR, "400", { center: true, lineGap: 1.6 });
        cy += 80;
    }

    if (website) {
        ctx.fillText(website, S / 2, cy);
    }

    if (logoImg) {
        const lh = 80;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 80, lw, lh);
    }
}

// ==========================================
// 4. WARM (따뜻한: 전면 크림 톤 중앙 정렬)
// ==========================================
function renderContactWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address } = input.profile;
    const { accent, profileImg, logoImg } = assets;

    ctx.fillStyle = "#FDFBF7";
    ctx.fillRect(0, 0, S, S);

    const [r, g, b] = hexToRgb(accent);
    ctx.fillStyle = `rgba(${r},${g},${b}, 0.05)`;
    ctx.fillRect(0, 0, S, S);

    ctx.strokeStyle = `rgba(${r},${g},${b}, 0.15)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, S - 80, S - 80);

    let cy = 180;

    if (profileImg) {
        const r2 = 120;
        ctx.save();
        ctx.beginPath();
        ctx.arc(S / 2, cy, r2, 0, Math.PI * 2);
        ctx.clip();
        drawCover(ctx, profileImg, S / 2 - r2, cy - r2, r2 * 2, r2 * 2);
        ctx.restore();
        cy += 180;
    }

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.fillStyle = "#332D2B";
    ctx.font = `700 48px ${FONT_BOLD}`;
    ctx.fillText(`${officeName || "법률사무소"} ${lawyerName} 변호사`, S / 2, cy);
    cy += 120;

    const phones = phone ? phone.split(",").map(p => p.trim()).filter(Boolean) : [];
    ctx.fillStyle = accent;
    ctx.font = `800 72px ${FONT_BOLD}`;
    if (phones[0]) {
        ctx.fillText(phones[0], S / 2, cy);
        cy += 80;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(51,45,43,0.7)";
        ctx.font = `700 36px ${FONT_BOLD}`;
        ctx.fillText(phones[1], S / 2, cy);
        cy += 100;
    } else cy += 40;

    ctx.fillStyle = "#665E5C";
    if (address) {
        drawAutoShrinkText(ctx, address, S / 2, cy, S - 300, 100, 22, FONT_REGULAR, "500", { center: true, lineGap: 1.5 });
    }

    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, S - 160, lw, lh);
    }
}

// ==========================================
// 5. TRADITIONAL (전통적: 세리프 및 클래식 명함)
// ==========================================
function renderContactTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, darkBg, logoImg } = assets;

    ctx.fillStyle = darkBg;
    ctx.fillRect(0, 0, S, S);

    // Double frame
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, S - 120, S - 120);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(70, 70, S - 140, S - 140);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";

    let cy = 250;

    if (logoImg) {
        const lh = 70;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 100, lw, lh);
    }

    ctx.font = `700 48px ${FONT_SERIF_BOLD}`;
    ctx.fillText(lawyerName, S / 2, cy);
    cy += 70;

    ctx.font = `400 24px ${FONT_SERIF_REGULAR}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`${officeName || "법무법인"} 대표변호사`, S / 2, cy);
    cy += 60;

    // Divider
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 40, cy, 80, 2);
    cy += 100;

    const phones = phone ? phone.split(",").map(p => p.trim()).filter(Boolean) : [];
    ctx.fillStyle = accent;
    ctx.font = `700 64px ${FONT_SERIF_BOLD}`;
    if (phones[0]) {
        ctx.fillText(phones[0], S / 2, cy);
        cy += 70;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `400 36px ${FONT_SERIF_REGULAR}`;
        ctx.fillText(phones[1], S / 2, cy);
        cy += 90;
    } else cy += 40;

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    if (address) {
        drawAutoShrinkText(ctx, address, S / 2, cy, S - 240, 100, 20, FONT_SERIF_REGULAR, "400", { center: true, lineGap: 1.8 });
        cy += 80;
    }

    if (website) {
        ctx.fillText(website, S / 2, cy);
    }
}
