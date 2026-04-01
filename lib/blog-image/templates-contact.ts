import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, drawFilmGrain, rgba, roundRect,
    type RenderInput, type Assets, hexToRgb, hasTransparency
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

// ── Shared: parse phones ──
function getPhones(phone: string | undefined): string[] {
    if (!phone) return [];
    return phone.split(",").map(p => p.trim()).filter(Boolean);
}

// ==========================================
// 1. CLASSIC (기존) — 유지 (좌 사진, 우 텍스트 명함형)
// ==========================================
function renderContactClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website, jobTitle } = input.profile;
    const { profileImg, officeImg, logoImg, rawBrandColor } = assets;

    ctx.fillStyle = "#F9F8F4";
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
        ctx.restore();
    } else if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, leftW, S);
        ctx.clip();
        ctx.filter = "grayscale(40%)";
        drawCover(ctx, officeImg, 0, 0, leftW, S);
        ctx.restore();
    } else {
        ctx.fillStyle = rawBrandColor;
        ctx.fillRect(0, 0, leftW, S);
    }

    // Divider shadow
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(leftW - 1, 0, 2, S);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let currY = 170;
    ctx.fillStyle = rawBrandColor;
    ctx.font = `900 68px ${FONT_BLACK}`;
    ctx.fillText(lawyerName || "변호사", centerX, currY);
    currY += 60;

    ctx.font = `600 20px ${FONT_REGULAR}`;
    ctx.fillStyle = "#333333";
    ctx.fillText(`${officeName || "법률사무소"} ${jobTitle || "대표변호사"}`, centerX, currY);
    currY += 55;

    ctx.fillStyle = rawBrandColor;
    ctx.fillRect(centerX - 40, currY, 80, 2);
    currY += 75;

    ctx.fillStyle = "#333333";
    ctx.globalAlpha = 0.85;
    if (address) {
        drawAutoShrinkText(ctx, address, centerX, currY, rightW - 100, 100, 18, FONT_REGULAR, "500", { shadow: false, minFontSize: 14 });
        currY += 100;
    } else currY += 60;

    ctx.globalAlpha = 1.0;
    const phones = getPhones(phone);
    if (phones.length > 0) {
        ctx.fillStyle = rawBrandColor;
        ctx.font = `800 32px ${FONT_BOLD}`;
        phones.forEach(p => {
            ctx.fillText(p, centerX, currY);
            currY += 48;
        });
        currY += 40;
    }

    if (website) {
        ctx.fillStyle = "#333333";
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
// 2. TRENDY — 다크 센터형 연락처
// ==========================================
function renderContactTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, logoImg } = assets;
    const pad = 100;

    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.02);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Logo
    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, pad, lw, lh);
    }

    // Label
    ctx.fillStyle = accent;
    ctx.font = `700 16px ${FONT_BOLD}`;
    ctx.textBaseline = "top";
    ctx.fillText("CONTACT", S / 2, pad + 80);

    // Accent line
    ctx.fillStyle = accent;
    ctx.fillRect(S / 2 - 25, pad + 110, 50, 3);

    // Name + Office
    let currY = S / 2 - 120;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `900 56px ${FONT_BLACK}`;
    ctx.textBaseline = "middle";
    ctx.fillText(lawyerName || "변호사", S / 2, currY);
    currY += 50;

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(officeName || "법률사무소", S / 2, currY);
    currY += 80;

    // Phone — biggest element
    const phones = getPhones(phone);
    if (phones[0]) {
        ctx.fillStyle = accent;
        ctx.font = `800 48px ${FONT_BOLD}`;
        ctx.fillText(phones[0], S / 2, currY);
        currY += 55;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `700 28px ${FONT_BOLD}`;
        ctx.fillText(phones[1], S / 2, currY);
        currY += 60;
    } else currY += 30;

    // Address
    if (address) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textBaseline = "top";
        drawAutoShrinkText(ctx, address, S / 2, currY, S - pad * 2, 80, 18, FONT_REGULAR, "400", { center: true });
    }

    // Bottom line
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(pad, S - pad - 30, S - pad * 2, 1);
    if (website) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = `400 16px ${FONT_REGULAR}`;
        ctx.textBaseline = "middle";
        ctx.fillText(website, S / 2, S - pad);
    }
}

// ==========================================
// 3. COOL — 모노톤 상하 분할형
// ==========================================
function renderContactCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, officeImg, logoImg } = assets;

    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, S, S);

    // Top half — office image desaturated
    const topH = S * 0.4;
    if (officeImg) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, S, topH);
        ctx.clip();
        ctx.filter = "grayscale(100%) contrast(1.3)";
        drawCover(ctx, officeImg, 0, 0, S, topH);
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, S, topH);
    }

    // Accent separator
    ctx.fillStyle = accent;
    ctx.fillRect(0, topH - 2, S, 3);

    drawFilmGrain(ctx, 0.03);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Logo in top area
    if (logoImg) {
        const lh = 50;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, topH / 2 - 25, lw, lh);
    }

    // Content below separator
    let currY = topH + 80;

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 48px ${FONT_BOLD}`;
    ctx.fillText(`${officeName || ""} ${lawyerName}`, S / 2, currY);
    currY += 80;

    // Phone
    const phones = getPhones(phone);
    if (phones[0]) {
        ctx.fillStyle = accent;
        ctx.font = `800 52px ${FONT_BOLD}`;
        ctx.fillText(phones[0], S / 2, currY);
        currY += 60;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `400 28px ${FONT_REGULAR}`;
        ctx.fillText(phones[1], S / 2, currY);
        currY += 70;
    } else currY += 40;

    // Address
    if (address) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textBaseline = "top";
        drawAutoShrinkText(ctx, address, S / 2, currY, S - 200, 80, 18, FONT_REGULAR, "400", { center: true });
        currY += 70;
    }

    if (website) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = `400 16px ${FONT_REGULAR}`;
        ctx.textBaseline = "middle";
        ctx.fillText(website, S / 2, S - 80);
    }
}

// ==========================================
// 4. WARM — 크림톤 센터 명함
// ==========================================
function renderContactWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, logoImg } = assets;
    const [r, g, b] = hexToRgb(accent);

    // Cream background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, S, S);

    // Subtle warm gradient
    const grad = ctx.createLinearGradient(0, S, 0, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Subtle border
    ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 60, S - 120, S - 120);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Logo
    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 120, lw, lh);
    }

    let currY = S / 2 - 100;

    // Name
    ctx.fillStyle = "#2C2520";
    ctx.font = `700 52px ${FONT_BOLD}`;
    ctx.fillText(`${lawyerName} 변호사`, S / 2, currY);
    currY += 50;

    // Office
    ctx.fillStyle = "#6B5E56";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(officeName || "법률사무소", S / 2, currY);
    currY += 60;

    // Accent dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(S / 2, currY, 4, 0, Math.PI * 2);
    ctx.fill();
    currY += 40;

    // Phone
    const phones = getPhones(phone);
    if (phones[0]) {
        ctx.fillStyle = accent;
        ctx.font = `800 48px ${FONT_BOLD}`;
        ctx.fillText(phones[0], S / 2, currY);
        currY += 55;
    }
    if (phones[1]) {
        ctx.fillStyle = "#6B5E56";
        ctx.font = `700 28px ${FONT_BOLD}`;
        ctx.fillText(phones[1], S / 2, currY);
        currY += 60;
    } else currY += 30;

    // Address
    if (address) {
        ctx.fillStyle = "#6B5E56";
        ctx.textBaseline = "top";
        drawAutoShrinkText(ctx, address, S / 2, currY, S - 200, 80, 18, FONT_REGULAR, "400", { center: true });
    }

    // Website at bottom
    if (website) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.4)`;
        ctx.font = `400 16px ${FONT_REGULAR}`;
        ctx.textBaseline = "middle";
        ctx.fillText(website, S / 2, S - 100);
    }
}

// ==========================================
// 5. TRADITIONAL — 명조체 클래식 명함
// ==========================================
function renderContactTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { lawyerName, officeName, phone, address, website } = input.profile;
    const { accent, logoImg } = assets;

    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(0, 0, S, S);
    drawFilmGrain(ctx, 0.03);

    // Classic border
    ctx.strokeStyle = rgba(accent, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Logo
    if (logoImg) {
        const lh = 60;
        const lw = logoImg.width * (lh / logoImg.height);
        ctx.drawImage(logoImg, S / 2 - lw / 2, 120, lw, lh);
    }

    let currY = S / 2 - 100;

    // Name — serif
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 48px ${FONT_BOLD}`;
    ctx.fillText(lawyerName, S / 2, currY);
    currY += 50;

    // Office — serif
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `400 20px ${FONT_REGULAR}`;
    ctx.fillText(`${officeName || "법무법인"} 대표변호사`, S / 2, currY);
    currY += 60;

    // Accent divider
    ctx.fillStyle = rgba(accent, 0.35);
    ctx.fillRect(S / 2 - 30, currY, 60, 1);
    currY += 50;

    // Phone — serif
    const phones = getPhones(phone);
    if (phones[0]) {
        ctx.fillStyle = rgba(accent, 0.9);
        ctx.font = `700 48px ${FONT_BOLD}`;
        ctx.fillText(phones[0], S / 2, currY);
        currY += 55;
    }
    if (phones[1]) {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `400 28px ${FONT_REGULAR}`;
        ctx.fillText(phones[1], S / 2, currY);
        currY += 60;
    } else currY += 30;

    // Address
    if (address) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textBaseline = "top";
        drawAutoShrinkText(ctx, address, S / 2, currY, S - 200, 80, 18, FONT_REGULAR, "400", { center: true });
    }

    // Website
    if (website) {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = `400 16px ${FONT_REGULAR}`;
        ctx.textBaseline = "middle";
        ctx.fillText(website, S / 2, S - 100);
    }
}
