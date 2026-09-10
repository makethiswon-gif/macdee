// Offline visual contact sheet. Inputs are local approved profiles, plan and original art.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), sharp = require("sharp");
const resolve = Module._resolveFilename, root = path.resolve(__dirname, ".."); process.chdir(root);
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { renderBriefCard } = require("../lib/blog-images/brief-renderer.ts");
const { LAYOUT_RECIPES } = require("../lib/blog-images/layout-recipes.ts");
const { createCanvas } = require("@napi-rs/canvas");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
(async () => {
    assert.ok(process.argv[2], "Provide a private fixture directory; no model calls or network access");
    const dir = path.resolve(process.argv[2]), out = path.join(dir, "layout-variety"); fs.mkdirSync(out, { recursive: true });
    const plan = JSON.parse(fs.readFileSync(path.join(dir, "live/plan.json")));
    const checkpoint = JSON.parse(fs.readFileSync(path.join(dir, "live/cover-original.json")));
    assert.equal(checkpoint.sourceHash, plan.sourceHash, "The photo must belong to this manuscript");
    const row = JSON.parse(fs.readFileSync(path.join(dir, "profiles.json"))).find((p) => p.id === checkpoint.profileId);
    assert.ok(row);
    const [lawyerName, jobTitle] = row.lawyer_name.split("||");
    const profile = { id: row.id, lawyerName, jobTitle, career: [], officeName: row.office_name, phone: blogPhoneContact(row.phone)?.display || "", website: row.website,
        specialty: row.specialty, brandColor: row.brand_color, profileImages: row.profile_images, officeImages: row.office_images, logoImage: row.logo_image };
    const art = Buffer.from(checkpoint.artDataUrl.split(",")[1], "base64"), covers = [], all = [];
    let maxCover = 0, maxCard = 0;
    for (const layoutRecipe of LAYOUT_RECIPES) {
        const sheetPlan = { ...plan, layoutRecipe };
        for (const card of sheetPlan.cards) {
            const rendered = await renderBriefCard({ plan: sheetPlan, card, profile, art, style: "paper" });
            assert.ok(rendered.layoutChecks.passed, JSON.stringify(rendered.layoutChecks));
            const png = Buffer.from(rendered.imageDataUrl.split(",")[1], "base64");
            fs.writeFileSync(path.join(out, `${layoutRecipe}-${card.type}.png`), png);
            const mobile = await sharp(png).resize({ width: 360 }).png().toBuffer();
            fs.writeFileSync(path.join(out, `${layoutRecipe}-${card.type}-mobile.png`), mobile);
            const meta = await sharp(mobile).metadata();
            if (card.type === "thumbnail") { covers.push({ input: mobile, recipe: layoutRecipe }); maxCover = Math.max(maxCover, meta.height); }
            all.push({ input: mobile, recipe: layoutRecipe, type: card.type }); maxCard = Math.max(maxCard, meta.height);
        }
    }
    const label = (value) => {
        const canvas = createCanvas(360, 36), ctx = canvas.getContext("2d");
        ctx.fillStyle = "#E6EAED"; ctx.fillRect(0, 0, 360, 36); ctx.fillStyle = "#172026"; ctx.font = '18px "MagazineSans"'; ctx.fillText(value, 8, 24);
        return canvas.toBuffer("image/png");
    };
    const sheet = (items, cols, height, file) => sharp({ create: { width: cols * 384, height: Math.ceil(items.length / cols) * (height + 64), channels: 3, background: "#E6EAED" } })
        .composite(items.flatMap((item, i) => { const left = (i % cols) * 384 + 12, top = Math.floor(i / cols) * (height + 64); return [{ input: label(item.recipe + (item.type ? " / " + item.type : "")), left, top }, { input: item.input, left, top: top + 40 }]; })).png().toFile(path.join(out, file));
    await sheet(covers, 3, maxCover, "covers.png");
    for (const recipe of ["headline", "photo-open", "caption-rail"]) await sheet(all.filter((c) => c.recipe === recipe), 4, maxCard, `${recipe}-set.png`);
    console.log("Offline same-photo/same-brand review:", out);
})().catch((e) => { console.error(e); process.exitCode = 1; });
