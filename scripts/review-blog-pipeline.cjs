// Offline replay of explicitly downloaded production fixtures; no AI or network.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { renderBriefCard } = require("../lib/blog-images/brief-renderer.ts");
const { validateVisualPlan, sourceHash } = require("../lib/blog-images/visual-planner.ts");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
const { BLOG_CARD_TYPES } = require("../lib/blog-images/card-types.ts");
const directory = path.resolve(process.argv[2] || "tmp/pipeline-repair");
const output = path.join(directory, "review"); fs.mkdirSync(output, { recursive: true });
global.fetch = async () => { throw new Error("Network is forbidden in fixture replay"); };
(async () => {
    const posts = JSON.parse(fs.readFileSync(path.join(directory, "posts.json"))), profiles = JSON.parse(fs.readFileSync(path.join(directory, "profiles.json")));
    const snapshots = fs.readdirSync(directory).filter((f) => /^[a-f0-9]{64}\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(directory, f))));
    const report = [];
    for (const [i, post] of posts.entries()) {
        const hash = sourceHash(post.title, post.body), raw = snapshots.find((s) => s.cards && s.sourceHash === hash);
        if (!raw) continue;
        const plan = validateVisualPlan(raw, post.title, post.body), row = profiles.find((p) => p.id === post.profile_id);
        const [lawyerName, jobTitle] = row.lawyer_name.split("||");
        const profile = { id: row.id, lawyerName, jobTitle, officeName: row.office_name, phone: blogPhoneContact(row.phone)?.display || "", website: row.website || "",
            profileImages: row.profile_images, officeImages: row.office_images || [], logoImage: row.logo_image, brandColor: row.brand_color,
            designFamily: raw.strengthSelection?.designFamily, specialty: row.specialty, career: raw.strengthSelection?.claims?.map((c) => c.imageText) || [] };
        const tiles = [], cards = [];
        for (const type of BLOG_CARD_TYPES) {
            const saved = snapshots.find((s) => s.sourceHash === hash && s.card?.type === type && (!plan.cards.find((c) => c.type === type).art || s.artDataUrl));
            const card = await renderBriefCard({ plan, card: plan.cards.find((c) => c.type === type), profile,
                art: saved?.artDataUrl ? Buffer.from(saved.artDataUrl.split(",")[1], "base64") : undefined, model: saved?.card?.model });
            assert.ok(card.layoutChecks.passed, JSON.stringify(card.layoutChecks)); assert.equal(card.width, 1200);
            const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64");
            await sharp(bytes).toFile(path.join(output, `${i}-${type}.png`));
            const mobile = await sharp(bytes).resize({ width: 360 }).png().toBuffer();
            const { height } = await sharp(mobile).metadata();
            tiles.push({ input: mobile, left: tiles.length * 380, top: 0 });
            cards.push({ type, width: card.width, height: card.height, bytes: bytes.length, mobileHeight: height });
        }
        await sharp({ create: { width: 1520, height: Math.max(...cards.map((c) => c.mobileHeight)) + 24, channels: 3, background: "#e6e9eb" } }).composite(tiles).png().toFile(path.join(output, `${i}-sheet.png`));
        report.push({ postId: post.id, cards });
    }
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exitCode = 1; });
