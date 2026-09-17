// Re-compose existing local art and registered photos, without paid image generation.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
process.loadEnvFile(".vercel/.env.studio-batch.local");
const { loadStrengthLibrary } = require("../lib/blog-strengths-store.ts");
const { selectImageProof } = require("../lib/blog-images/proof-selection.ts");
const { asEditorialThree } = require("../lib/blog-images/three-card-plan.ts");
const { renderEditorialThree } = require("../lib/blog-images/three-card-renderer.ts");
const { editorialCoverLayout } = require("../lib/blog-images/three-card-policy.ts");
const { sourceHash, validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { title, article, rawPlan } = require("./blog-images-v7-fixtures.cjs");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
const sharp = require("sharp");
const out = path.resolve("tmp/editorial-three-review"); fs.mkdirSync(out, { recursive: true });
(async () => {
    const art = Buffer.from(JSON.parse(fs.readFileSync("tmp/pipeline-repair/live/cover-original.json", "utf8")).artDataUrl.split(",")[1], "base64");
    const rows = JSON.parse(fs.readFileSync("tmp/profile-design/profiles.json", "utf8")).filter(r => ["mqaaoypk621p6", "mse8rx0bkl9f0", "mmlg8fcm9bdgl"].includes(r.id));
    const manifest = [];
    for (const r of rows) {
        const p = { id: r.id, lawyerName: r.lawyer_name.split("||")[0], jobTitle: r.lawyer_name.split("||")[1] || "변호사", officeName: r.office_name, phone: blogPhoneContact(r.phone)?.display || "", website: r.website || "", brandColor: r.brand_color,
            profileImages: r.profile_images || [], officeImages: r.office_images || [], logoImage: r.logo_image || "", specialty: r.specialty || [] };
        const library = await loadStrengthLibrary(p.id);
        console.log(`${p.lawyerName}: library ${library.revision}, eligible ${require("../lib/blog-strengths.ts").eligibleStrengths(library).length}, total ${library.claims.length}`);
        let proof;
        try { proof = selectImageProof(library, title + article, sourceHash(title, article)); }
        catch { proof = selectImageProof(library, "", sourceHash(title, article), true); }
        const plan = asEditorialThree(validateVisualPlan(rawPlan(), title, article, false), p, proof, title, article);
        plan.layoutRecipe = editorialCoverLayout(p, []);
        const thumbs = [];
        for (const card of plan.cards) {
            const result = await renderEditorialThree({ profile: p, plan, card, art });
            assert.ok(result.layoutChecks.passed, `${p.lawyerName}/${card.type}: ${result.layoutChecks.issues}`);
            const file = `${p.id}-${card.type}.png`, bytes = Buffer.from(result.imageDataUrl.split(",")[1], "base64");
            fs.writeFileSync(path.join(out, file), bytes);
            thumbs.push({ input: await sharp(bytes).resize(360).png().toBuffer(), top: 0, left: (thumbs.length * 384) });
            manifest.push({ profile: p.lawyerName, type: card.type, file, mode: proof.mode, warnings: result.warnings });
        }
        await sharp({ create: { width: 1128, height: 450, channels: 3, background: "#dadde0" } }).composite(thumbs).png().toFile(path.join(out, `${p.id}-sheet.png`));
        console.log(`${p.lawyerName}: ${proof.mode}, ${proof.claims.length} approved claims, three layouts passed`);
    }
    fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
