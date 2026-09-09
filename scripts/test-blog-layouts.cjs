// Real raster renderers; synthetic subjects only. No AI calls or production writes.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript"), crypto = require("node:crypto");
const sharp = require("sharp"), { createCanvas } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { title, article, profile, rawPlan, variants } = require("./blog-images-v7-fixtures.cjs");
const { validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { renderBriefCard } = require("../lib/blog-images/brief-renderer.ts");
const { appendImageStrength } = require("../lib/blog-images/strength-strip.ts");
const { getMagazineIdentity } = require("../lib/blog-images/magazine-identity.ts");
const out = path.resolve(process.env.BLOG_STRENGTHS_TEST_OUT || "C:/클로드/blog-strengths-review"); fs.mkdirSync(out, { recursive: true });
const boxes = [], proto = Object.getPrototypeOf(createCanvas(1, 1).getContext("2d")), original = proto.fillText;
proto.fillText = function (text, x, y, ...args) {
    const w = this.measureText(text).width, size = parseFloat(this.font);
    const left = this.textAlign === "center" ? x - w / 2 : this.textAlign === "right" ? x - w : x;
    assert.ok(left >= -1 && y >= -1 && left + w <= this.canvas.width + 2 && y + size <= this.canvas.height + 2, `Text outside PNG: ${text}`);
    boxes.push({ ctx: this, x: left, y, w, h: size, text });
    return original.call(this, text, x, y, ...args);
};
(async () => {
    const artCanvas = createCanvas(1400, 1000), c = artCanvas.getContext("2d");
    c.fillStyle = "#CED8DB"; c.fillRect(0, 0, 1400, 1000);
    c.fillStyle = "#FFFFFF"; c.fillRect(100, 140, 490, 720); c.fillRect(800, 140, 490, 720);
    c.fillStyle = "#46605C";
    for (let i = 0; i < 6; i++) { c.fillRect(150, 240 + i * 82, 380, 12); c.fillRect(850, 240 + i * 82, 370, 12); }
    c.fillStyle = "#AA6E4C"; c.fillRect(790, 325, 50, 96); c.fillRect(790, 570, 50, 96);
    const art = artCanvas.toBuffer("image/png");
    const portrait = createCanvas(600, 760), pc = portrait.getContext("2d");
    pc.fillStyle = "#D6DDDC"; pc.fillRect(0, 0, 600, 760);
    pc.fillStyle = "#708684"; pc.beginPath(); pc.arc(300, 238, 110, 0, Math.PI * 2); pc.fill();
    pc.beginPath(); pc.ellipse(300, 670, 220, 270, 0, 0, Math.PI * 2); pc.fill();
    const subject = "data:image/png;base64," + portrait.toBuffer("image/png").toString("base64");
    const plan = validateVisualPlan(rawPlan(variants[2]), title, article, false);
    const families = ["journal", "poster", "column", "atlas", "ledger", "dossier"], signatures = new Set(), index = [];
    for (const family of families) {
        const p = { ...profile, id: "same-profile-for-geometry-test", designFamily: family, career: ["검수용 승인 문구 · 실제 경력 아님", "원본과 날짜별 정리본을 함께 확인"], profileImages: [subject] };
        assert.equal(getMagazineIdentity(p).family, family);
        for (const style of ["paper", "contrast"]) for (const card of plan.cards) {
            const start = boxes.length;
            let result = await renderBriefCard({ plan, card, profile: p, style, art, artLabel: "검수용 도판 · 실제 사건 자료 아님" });
            assert.ok(result.layoutChecks?.passed, `${family}/${style}/${card.type}: ${result.layoutChecks?.issues}`);
            if (card.type === "thumbnail") result = await appendImageStrength(result, p.career[0], p);
            const local = boxes.slice(start);
            for (let i = 0; i < local.length; i++) for (let j = i + 1; j < local.length; j++) {
                const a = local[i], b = local[j]; if (a.ctx !== b.ctx) continue;
                const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                assert.ok(w <= 1 || h <= 1, `Text overlap ${family}/${card.type}: ${a.text} <> ${b.text}`);
            }
            const bytes = Buffer.from(result.imageDataUrl.split(",")[1], "base64"), stats = await sharp(bytes).stats();
            assert.ok(stats.channels.some((c) => c.stdev > 10), "Nonblank canvas"); assert.ok(bytes.length <= 2_000_000);
            if (style === "paper" && card.type === "thumbnail") signatures.add(crypto.createHash("sha256").update(await sharp(bytes).resize(64, 80, { fit: "fill" }).greyscale().raw().toBuffer()).digest("hex"));
            const name = `${family}-${style}-${card.type}.png`; fs.writeFileSync(path.join(out, name), bytes); index.push({ family, style, type: card.type, name, width: result.width, height: result.height });
        }
        for (const variant of variants) {
            const pp = validateVisualPlan(rawPlan(variant), title, article, false);
            await renderBriefCard({ plan: pp, card: pp.cards[2], profile: p, style: "paper" });
        }
        for (const treatment of ["feature", "analysis", "guide"]) for (const type of ["thumbnail", "illustration"]) {
            const planned = { ...plan.cards.find((c) => c.type === type), treatment };
            if (type === "illustration") { delete planned.art; planned.infographic = variants[3]; }
            const result = await renderBriefCard({ plan, card: planned, profile: p, style: "paper", art });
            assert.ok(result.layoutChecks.passed, `${family}/${type}/${treatment}: ${result.layoutChecks.issues}`);
            const png = Buffer.from(result.imageDataUrl.split(",")[1], "base64");
            fs.writeFileSync(path.join(out, `${family}-${treatment}-${type}.png`), png);
        }
    }
    assert.equal(signatures.size, 6, "Six different grayscale compositions with the exact same profile, color and artwork");
    fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>변호사별 지면 검수</title><style>body{margin:24px;font:16px system-ui;color:#222;background:#eef0f0;letter-spacing:0}section{padding:24px 0;border-top:1px solid #999}h1{font-size:24px}h2{font-size:18px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}figure{margin:0}img{width:100%;height:auto}figcaption{font-size:12px;padding:8px 0}@media(max-width:600px){body{margin:16px}.grid{grid-template-columns:1fr}}</style><h1>변호사별 지면 검수</h1><p>가상 프로필과 검수용 도판. 실제 고객의 사진·경력·원고가 아닙니다.</p>${families.map((family) => `<section><h2>${family}</h2><div class="grid">${index.filter((v) => v.family === family && v.style === "paper").map((v) => `<figure><img src="${v.name}" alt="${v.family} ${v.type}" width="${v.width}" height="${v.height}"><figcaption>${v.type}</figcaption></figure>`).join("")}</div></section>`).join("")}</html>`);
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ images: index.length, grayscaleDistinct: signatures.size, boxes: boxes.length, index }, null, 2));
    console.log(`PASS: ${index.length} PNGs, ${boxes.length} measured text lines, six grayscale-distinct layouts, all five infographics. Gallery: ${out}`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
