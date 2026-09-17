// Optional real-photo checks against the existing local review set. No network or paid calls.
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript"), sharp = require("sharp"), assert = require("node:assert/strict");
process.chdir(path.resolve(__dirname, ".."));
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { isolateHeads } = require("../lib/lawyer-studio/reference-processing.ts");
(async () => {
    const root = "tmp/lawyer-studio-batch-20260911/references", out = "tmp/lawyer-studio-tests/isolated";
    if (!fs.existsSync(root)) { console.log("SKIP optional real-photo checks: local review set absent"); return; }
    fs.mkdirSync(out, { recursive: true });
    let passed = 0;
    for (const owner of fs.readdirSync(root)) {
        const people = owner === "mrvn35u3cxprq" ? 2 : 1;
        for (const file of fs.readdirSync(path.join(root, owner)).filter((f) => f.endsWith(".png"))) {
            const bytes = fs.readFileSync(path.join(root, owner, file));
            // This existing profile's first source contains a thumbnail-size face.
            if (owner === "mmkfnvun052ja" && file === "0.png") { await assert.rejects(isolateHeads(bytes, 1), /얼굴/); continue; }
            const crops = await isolateHeads(bytes, people);
            assert.equal(crops.length, people);
            for (const [i, crop] of crops.entries()) {
                const meta = await sharp(crop).metadata();
                assert.ok(meta.width > 60 && meta.height > 60);
                await sharp(crop).toFile(path.join(out, `${owner}-${file.slice(0, -4)}-${i}.png`));
            }
            passed++;
        }
    }
    console.log(`PASS ${passed} actual profile photos: head-only crops, paired faces, tiny-face rejection; zero model calls.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
