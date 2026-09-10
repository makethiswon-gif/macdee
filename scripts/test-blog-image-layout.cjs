// Offline raster regression. Optional --review reads local production snapshots, never the network.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict"), ts = require("typescript"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { createCanvas } = require("@napi-rs/canvas");
const { magazineFonts, magazineLines, setType } = require("../lib/blog-images/magazine-design.ts");
const { renderBriefCard } = require("../lib/blog-images/brief-renderer.ts");
const { validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
const fixtures = require("./blog-images-v7-fixtures.cjs");
const out = path.join(root, "tmp", "image-layout-regression"); fs.mkdirSync(out, { recursive: true });
async function save(card, directory, name) {
    assert.equal(card.layoutRevision, 12); assert.ok(card.layoutChecks.passed, JSON.stringify(card.layoutChecks));
    assert.ok(card.height < 2500); assert.ok(Buffer.byteLength(JSON.stringify(card)) < 4_000_000);
    const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64");
    fs.writeFileSync(path.join(directory, name + ".png"), bytes);
    await sharp(bytes).resize({ width: 375 }).png().toFile(path.join(directory, name + "-mobile.png"));
    return bytes;
}
(async () => {
    magazineFonts(); const ctx = createCanvas(1024, 1).getContext("2d");
    setType(ctx, 76, "sans");
    const heading = "빚 9천만원보다 중요한 건 남는 돈";
    const lines = magazineLines(ctx, heading, 600);
    assert.ok(lines.every((line) => !line.startsWith("보다")), "Korean particles stay with the word");
    assert.ok(lines.includes("빚 9천만원보다"));
    assert.deepEqual(magazineLines(ctx, "빚 9천만원보다\n중요한 건\n남는 돈", 896), ["빚 9천만원보다", "중요한 건", "남는 돈"]);
    const photo = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#386a64" } }).png().toBuffer();
    const plans = fixtures.variants.map((v) => validateVisualPlan(fixtures.rawPlan(v), fixtures.title, fixtures.article, false));
    const proto = Object.getPrototypeOf(ctx), original = proto.fillText;
    const printed = [];
    proto.fillText = function (value, x, y, ...args) {
        const width = this.measureText(value).width;
        const left = this.textAlign === "center" ? x - width / 2 : x;
        assert.ok(left >= -1 && left + width <= this.canvas.width + 1, "Text width: " + value);
        assert.ok(y >= 0 && y + parseFloat(this.font) <= this.canvas.height + 1, "Text height: " + value);
        printed.push(value);
        return original.call(this, value, x, y, ...args);
    };
    let count = 0;
    for (const family of ["journal", "poster", "column", "atlas", "ledger", "dossier"]) {
        for (const style of ["paper", "contrast"]) {
            for (const plan of plans) {
                const profile = { ...fixtures.profile, designFamily: family };
                for (const card of plan.cards) {
                    const result = await renderBriefCard({ plan, card, profile, art: photo, style });
                    assert.ok(result.layoutChecks.passed, `${family} ${style} ${card.type}: ${JSON.stringify(result.layoutChecks)}`);
                    if (plan === plans[0] && card.type === "thumbnail") {
                        const pixels = await sharp(Buffer.from(result.imageDataUrl.split(",")[1], "base64")).removeAlpha().raw().toBuffer();
                        let artPixels = 0;
                        for (let i = 0; i < pixels.length; i += 3) if (pixels[i] === 0x38 && pixels[i + 1] === 0x6a && pixels[i + 2] === 0x64) artPixels++;
                        assert.ok(artPixels / (result.width * result.height) > 0.28, `${family}: artwork must not collapse into a tiny letterboxed plate`);
                    }
                    count++;
                }
            }
        }
    }
    const ri = process.argv.indexOf("--review");
    if (ri >= 0) {
        const dir = path.resolve(process.argv[ri + 1]);
        const snapshots = fs.readdirSync(dir).filter((f) => /^[a-f0-9]{64}\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
        const plan = snapshots.find((s) => s.cards), row = JSON.parse(fs.readFileSync(path.join(dir, "profile.json"), "utf8"));
        const [lawyerName, jobTitle] = row.lawyer_name.split("||");
        const profile = { id: row.id, lawyerName, jobTitle, career: [], officeName: row.office_name, phone: blogPhoneContact(row.phone)?.display || "", website: row.website,
            specialty: row.specialty, brandColor: row.brand_color, profileImages: row.profile_images, officeImages: row.office_images, logoImage: row.logo_image };
        const sheet = [];
        for (const card of plan.cards) {
            const checkpoint = snapshots.find((s) => s.card?.type === card.type);
            const art = checkpoint.artDataUrl ? Buffer.from(checkpoint.artDataUrl.split(",")[1], "base64") : undefined;
            printed.length = 0;
            const result = await renderBriefCard({ plan, card, profile, art, model: checkpoint.card.model });
            if (card.type === "thumbnail") for (const line of card.headlineLines) assert.ok(printed.includes(line), "Planned title line retained: " + line);
            if (card.type === "contact") assert.ok(printed.includes(profile.phone), "Registered main phone stays visible");
            const bytes = await save(result, dir, "after-" + card.type);
            sheet.push({ input: await sharp(bytes).resize({ width: 375 }).toBuffer(), left: (sheet.length % 2) * 399, top: Math.floor(sheet.length / 2) * 660 });
            console.log(`${card.type}: ${checkpoint.card.height} -> ${result.height}px, layout passed`);
        }
        await sharp({ create: { width: 774, height: 1320, channels: 3, background: "#E7EBED" } }).composite(sheet).png().toFile(path.join(dir, "after-mobile-sheet.png"));
    }
    proto.fillText = original;
    console.log(`PASS: ${count} family/style/card renderings; measured text bounds, Korean word wrapping and planned headline breaks.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
