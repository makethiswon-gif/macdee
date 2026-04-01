import type { SKRSContext2D } from "@napi-rs/canvas";
import {
    SIZE, FONT_BOLD, FONT_BLACK, FONT_REGULAR,
    drawCover, drawAutoShrinkText, rgba, hasTransparency, roundRect, drawFilmGrain,
    drawGradientOverlay, drawVignette,
    type RenderInput, type Assets, hexToRgb
} from "./renderer";

const S = SIZE;

export function renderMainTemplate(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const style = input.designStyle || "classic";
    switch (style) {
        case "trendy": return renderMainTrendy(ctx, input, assets);
        case "cool": return renderMainCool(ctx, input, assets);
        case "warm": return renderMainWarm(ctx, input, assets);
        case "traditional": return renderMainTraditional(ctx, input, assets);
        case "classic":
        default: return renderMainClassic(ctx, input, assets);
    }
}

// ── Shared: draw photo on right side ──
function drawProfileRight(ctx: SKRSContext2D, profileImg: any, isCutout: boolean, pad: number) {
    if (!profileImg) return;
    if (isCutout) {
        const targetH = S * 0.85;
        let scale = targetH / profileImg.height;
        let targetW = profileImg.width * scale;
        if (targetW > S * 0.6) {
            scale = (S * 0.6) / profileImg.width;
            targetW = profileImg.width * scale;
        }
        ctx.drawImage(profileImg, S - targetW - 40, S - profileImg.height * scale, targetW, profileImg.height * scale);
    } else {
        const frameW = 420, frameH = 680;
        const frameX = S - pad - frameW + 20;
        const frameY = (S - frameH) / 2;
        const r = Math.min(frameW, frameH) / 2;

        ctx.save();
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameW, frameH, r);
        ctx.clip();
        drawCover(ctx, profileImg, frameX, frameY, frameW, frameH);
        ctx.restore();

        // Bottom fade inside pill
        const dropGrad = ctx.createLinearGradient(0, frameY + frameH - 150, 0, frameY + frameH);
        dropGrad.addColorStop(0, "transparent");
        dropGrad.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = dropGrad;
        ctx.beginPath();
        roundRect(ctx, frameX, frameY, frameW, frameH, r);
        ctx.fill();
    }
}

// ── Shared: draw specialty badge ──
function drawBadge(ctx: SKRSContext2D, text: string, x: number, y: number, bgColor: string, textColor: string, rounded = false) {
    ctx.font = `700 16px ${FONT_BOLD}`;
    const met = ctx.measureText(text);
    const bw = met.width + 28;
    const bh = 32;
    ctx.fillStyle = bgColor;
    if (rounded) {
        ctx.beginPath();
        roundRect(ctx, x, y, bw, bh, 16);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, bw, bh);
    }
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x + 14, y + 8);
}

// ==========================================
// 1. CLASSIC (기존 중후/보수 스타일) — 유지
// ==========================================
function renderMainClassic(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 80;

    // Background
    if (officeImg) {
        ctx.save();
        ctx.filter = "contrast(1.3) saturate(0.85) brightness(1.15)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
        ctx.restore();
    } else {
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(0, 0, S, S);
    }

    // Left shadow
    const shadowGrad = ctx.createLinearGradient(0, 0, S * 0.7, 0);
    shadowGrad.addColorStop(0, "rgba(28, 28, 30, 0.95)");
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.03);

    const isCutout = hasTransparency(profileImg);
    drawProfileRight(ctx, profileImg, isCutout, pad);

    // Badges
    const textX = pad;
    const textY = S / 2 - 200;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    let badges = ["POST"];
    const rawSpecialties = input.profile.specialty || [];
    rawSpecialties.forEach(spec => {
        spec.split(",").forEach(part => {
            const t = part.trim();
            if (t && badges.length < 3) badges.push(t);
        });
    });

    const badgeH = 34, badgeGap = 8;
    const startY = textY - 16 - (badges.length * (badgeH + badgeGap));
    for (let i = 0; i < badges.length; i++) {
        ctx.font = `700 18px ${FONT_BOLD}`;
        const met = ctx.measureText(badges[i]);
        const bw = met.width + 24;
        ctx.fillStyle = i === 0 ? accent : "rgba(28, 28, 30, 0.95)";
        ctx.fillRect(textX, startY + i * (badgeH + badgeGap), bw, badgeH);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(badges[i], textX + 12, startY + i * (badgeH + badgeGap) + 9);
    }

    // Title
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, textX, textY, S * 0.55, S * 0.45, 88, FONT_BLACK, "900", { shadow: false });

    // Bottom signature
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(pad, S - pad - 40, 40, 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 대표변호사`, pad, S - pad - 24);
}

// ==========================================
// 2. TRENDY (젊고 감각적인) — 완전 리디자인
//    컨셉: 미니멀한 다크 + 강렬한 액센트 라인 + 대형 타이틀
//    classic과 동일 구도(좌 텍스트/우 사진)이지만 톤이 다름
// ==========================================
function renderMainTrendy(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;
    const pad = 80;

    // 1. Dark base
    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, S, S);

    // 2. Office image (very subtle, high contrast)
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.filter = "contrast(1.5) saturate(0)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // 3. Left gradient for readability
    const grad = ctx.createLinearGradient(0, 0, S * 0.65, 0);
    grad.addColorStop(0, "rgba(12,12,12,1)");
    grad.addColorStop(1, "rgba(12,12,12,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.02);

    // 4. Profile photo on right (same structure as classic)
    const isCutout = hasTransparency(profileImg);
    drawProfileRight(ctx, profileImg, isCutout, pad);

    // 5. Accent bar — single bold horizontal line
    ctx.fillStyle = accent;
    ctx.fillRect(pad, S / 2 - 240, 60, 6);

    // 6. Specialty label
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const spec = input.profile.specialty?.[0] || "법률정보";
    ctx.fillStyle = accent;
    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillText(spec.toUpperCase(), pad, S / 2 - 220);

    // 7. Title — large, white, clean
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, pad, S / 2 - 180, S * 0.52, S * 0.42, 80, FONT_BLACK, "900");

    // 8. Bottom: thin line + name
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(pad, S - 100, S - pad * 2, 1);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `700 18px ${FONT_BOLD}`;
    ctx.fillText(`${lawyerName} 변호사`, pad, S - 80);

    // Accent dot at end of name
    const nameW = ctx.measureText(`${lawyerName} 변호사`).width;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(pad + nameW + 16, S - 70, 4, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
// 3. COOL (냉철한 형사전문) — 완전 리디자인
//    컨셉: 모노크롬 + 날카로운 직선 + 최소한의 색상 포인트
//    classic 구도 유지하되, 흑백/무채색 무드
// ==========================================
function renderMainCool(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;
    const pad = 80;

    // 1. Deep dark base
    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, S, S);

    // 2. Office image — strictly desaturated
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.filter = "grayscale(100%) contrast(1.4)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // 3. Left shadow for text
    const grad = ctx.createLinearGradient(0, 0, S * 0.65, 0);
    grad.addColorStop(0, "rgba(17,17,20,0.98)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.04);

    // 4. Profile — desaturated
    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        ctx.save();
        ctx.filter = "grayscale(90%) contrast(1.15)";
        drawProfileRight(ctx, profileImg, isCutout, pad);
        ctx.restore();
    }

    // 5. Thin vertical accent line
    ctx.fillStyle = accent;
    ctx.fillRect(pad - 16, pad, 3, S - pad * 2);

    // 6. Small label
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `400 14px ${FONT_REGULAR}`;
    ctx.fillText((input.profile.specialty?.[0] || "LAW").toUpperCase(), pad, pad);

    // 7. Title — clean bold
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, pad, pad + 30, S * 0.52, S * 0.5, 76, FONT_BOLD, "700");

    // 8. Bottom name
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `400 16px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 변호사`, pad, S - pad);
}

// ==========================================
// 4. WARM (따뜻한 가사/상속) — 완전 리디자인
//    컨셉: 밝은 크림 톤 + 부드러운 그림자 + 정갈한 레이아웃
//    classic 구도 유지하되, 라이트 모드
// ==========================================
function renderMainWarm(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg } = assets;
    const pad = 80;
    const [r, g, b] = hexToRgb(accent);

    // 1. Warm cream background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, S, S);

    // 2. Very subtle office image
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.filter = "sepia(0.4) blur(3px)";
        drawCover(ctx, officeImg, -6, -6, S + 12, S + 12);
        ctx.restore();
    }

    // 3. Subtle accent gradient at bottom
    const grad = ctx.createLinearGradient(0, S * 0.7, 0, S);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, `rgba(${r},${g},${b},0.06)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // 4. Profile photo — pill shape, right side
    const isCutout = hasTransparency(profileImg);
    if (profileImg) {
        if (isCutout) {
            const targetH = S * 0.8;
            let scale = targetH / profileImg.height;
            let targetW = profileImg.width * scale;
            if (targetW > S * 0.55) {
                scale = (S * 0.55) / profileImg.width;
                targetW = profileImg.width * scale;
            }
            ctx.drawImage(profileImg, S - targetW - 50, S - profileImg.height * scale, targetW, profileImg.height * scale);
        } else {
            // Rounded rectangle frame
            const fw = 380, fh = 540;
            const fx = S - pad - fw, fy = (S - fh) / 2;
            ctx.save();
            ctx.beginPath();
            roundRect(ctx, fx, fy, fw, fh, 40);
            ctx.clip();
            drawCover(ctx, profileImg, fx, fy, fw, fh);
            ctx.restore();
        }
    }

    // 5. Rounded accent badge
    const spec = input.profile.specialty?.[0] || "법률정보";
    drawBadge(ctx, spec, pad, pad, accent, "#FFFFFF", true);

    // 6. Title — dark brown text
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "#2C2520";
    drawAutoShrinkText(ctx, title, pad, pad + 60, S * 0.5, S * 0.45, 72, FONT_BOLD, "700");

    // 7. Bottom name — muted
    ctx.fillStyle = accent;
    ctx.fillRect(pad, S - pad - 40, 30, 3);
    ctx.fillStyle = "#6B5E56";
    ctx.font = `600 16px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 변호사`, pad, S - pad - 22);
}

// ==========================================
// 5. TRADITIONAL (전통 로펌 명조체) — 완전 리디자인
//    컨셉: classic과 동일 구도 + 명조체 타이포 + 격조있는 테두리
// ==========================================
function renderMainTraditional(ctx: SKRSContext2D, input: RenderInput, assets: Assets) {
    const { title } = input;
    const { lawyerName } = input.profile;
    const { accent, profileImg, officeImg, darkBg } = assets;
    const pad = 80;

    // 1. Deep dark base
    ctx.fillStyle = "#0E0E10";
    ctx.fillRect(0, 0, S, S);

    // 2. Office image — very subtle luminosity
    if (officeImg) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.filter = "grayscale(50%) contrast(1.1)";
        drawCover(ctx, officeImg, 0, 0, S, S);
        ctx.restore();
    }

    // 3. Left shadow
    const grad = ctx.createLinearGradient(0, 0, S * 0.65, 0);
    grad.addColorStop(0, "rgba(14,14,16,0.97)");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    drawFilmGrain(ctx, 0.03);

    // 4. Classic inner border
    ctx.strokeStyle = rgba(accent, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(50, 50, S - 100, S - 100);

    // 5. Profile photo — same as classic
    const isCutout = hasTransparency(profileImg);
    drawProfileRight(ctx, profileImg, isCutout, pad);

    // 6. Small serif label with em-dash
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(accent, 0.8);
    ctx.font = `400 16px ${FONT_REGULAR}`;
    const spec = input.profile.specialty?.[0] || "법률정보";
    ctx.fillText(`— ${spec}`, pad, S / 2 - 240);

    // 7. Title — serif, white
    ctx.fillStyle = "#FFFFFF";
    drawAutoShrinkText(ctx, title, pad, S / 2 - 200, S * 0.52, S * 0.42, 72, FONT_BOLD, "700", { lineGap: 1.5 });

    // 8. Accent thin divider + name
    ctx.fillStyle = rgba(accent, 0.4);
    ctx.fillRect(pad, S - pad - 50, 50, 1);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `400 16px ${FONT_REGULAR}`;
    ctx.fillText(`${lawyerName} 변호사`, pad, S - pad - 30);
}
