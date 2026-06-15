// macdee 외부 공유용 OG 이미지(1200x630) 생성 → public/og-image.png 교체
// 실행: node scripts/generate-og-image.mjs
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const W = 1200, H = 630;

// 폰트 등록 (blog-image 렌더러와 동일 패턴)
const fontsDir = join(process.cwd(), "public", "fonts");
for (const f of [
    { file: "noto-sans-kr-korean-400-normal.woff2", fam: "NotoSansKR-400" },
    { file: "noto-sans-kr-korean-700-normal.woff2", fam: "NotoSansKR-700" },
    { file: "noto-sans-kr-korean-900-normal.woff2", fam: "NotoSansKR-900" },
]) {
    const p = join(fontsDir, f.file);
    if (existsSync(p)) GlobalFonts.register(readFileSync(p), f.fam);
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// 1) 깊이감 있는 네이비 그라데이션 배경
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, "#060B1A");
bg.addColorStop(0.55, "#0A1430");
bg.addColorStop(1, "#0B1024");
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// 2) 부드러운 블루 글로우 (오른쪽 상단)
const glow = ctx.createRadialGradient(W * 0.72, H * 0.28, 60, W * 0.72, H * 0.28, 560);
glow.addColorStop(0, "rgba(53, 110, 220, 0.28)");
glow.addColorStop(1, "rgba(53, 110, 220, 0)");
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

// 3) 미세한 대각선 + 점 (테크 무드, 아주 옅게)
ctx.save();
ctx.strokeStyle = "rgba(255,255,255,0.045)";
ctx.lineWidth = 1.5;
for (const off of [-200, 120, 440]) {
    ctx.beginPath();
    ctx.moveTo(off, 0);
    ctx.lineTo(off + 520, H);
    ctx.stroke();
}
const dots = [[210, 120], [990, 160], [1080, 470], [150, 500], [760, 90]];
for (const [x, y] of dots) {
    ctx.beginPath();
    ctx.fillStyle = "rgba(120, 165, 250, 0.55)";
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
}
ctx.restore();

// 4) 가장자리 비네팅 (집중도 ↑)
const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
vig.addColorStop(0, "rgba(0,0,0,0)");
vig.addColorStop(1, "rgba(0,0,0,0.45)");
ctx.fillStyle = vig;
ctx.fillRect(0, 0, W, H);

// 5) 워드마크 "macdee"
ctx.textAlign = "center";
ctx.textBaseline = "middle";
try { ctx.letterSpacing = "-4px"; } catch { /* 일부 버전 미지원 */ }
ctx.fillStyle = "#FFFFFF";
ctx.font = "900 168px NotoSansKR-900";
ctx.fillText("macdee", W / 2, H / 2 - 38);
try { ctx.letterSpacing = "0px"; } catch { /* noop */ }

// 6) 워드마크 아래 블루 그라데이션 악센트 라인
const lineY = H / 2 + 64;
const lineGrad = ctx.createLinearGradient(W / 2 - 130, 0, W / 2 + 130, 0);
lineGrad.addColorStop(0, "rgba(77,139,245,0)");
lineGrad.addColorStop(0.5, "rgba(120,165,250,0.95)");
lineGrad.addColorStop(1, "rgba(77,139,245,0)");
ctx.fillStyle = lineGrad;
ctx.fillRect(W / 2 - 130, lineY, 260, 3);

// 7) 태그라인
ctx.fillStyle = "rgba(255,255,255,0.62)";
ctx.font = "500 40px NotoSansKR-400";
try { ctx.letterSpacing = "2px"; } catch { /* noop */ }
ctx.fillText("변호사 마케팅 자동화 플랫폼", W / 2, lineY + 60);
try { ctx.letterSpacing = "0px"; } catch { /* noop */ }

const out = join(process.cwd(), "public", "og-image.png");
writeFileSync(out, canvas.toBuffer("image/png"));
console.log("생성 완료:", out, `(${W}x${H})`);
