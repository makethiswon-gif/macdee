// Authenticated preparation only. Never creates a paid job, photograph, approval or blog binding.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), { spawnSync } = require("node:child_process"), sharp = require("sharp"), crypto = require("node:crypto"), ts = require("typescript");
const root = path.resolve(__dirname, ".."); process.chdir(root);
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { selectEditorialReferences } = require("../lib/lawyer-studio/style-pack.ts");
const origin = new URL(process.argv[2] || "https://www.makethis1.com");
assert.ok(origin.protocol === "https:" && (origin.hostname === "www.makethis1.com" || /^macdee-[a-z0-9]+-incbccc-7155s-projects\.vercel\.app$/.test(origin.hostname)));
const cookie = fs.readFileSync(".vercel/editorial-auth-response.headers", "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1];
assert.ok(cookie, "Previously authorized admin session required");
const call = async (url, body) => {
    let bytes, status;
    if (origin.hostname.endsWith(".vercel.app")) {
        const cli = "C:/Users/incbc/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js";
        const result = spawnSync(process.execPath, [cli, "curl", url, "--deployment", origin.href, "--scope", "incbccc-7155s-projects", "--", "--silent", "--max-time", "90", "--header", `Cookie: admin_token=${cookie}`, "--header", "Content-Type: application/json", "--write-out", "\n%{http_code}", ...(body ? ["--request", "POST", "--data-raw", JSON.stringify(body)] : [])], { timeout: 100000, maxBuffer: 24 * 1024 * 1024, windowsHide: true });
        assert.equal(result.status, 0, "Authorized Vercel request must succeed");
        const split = result.stdout.lastIndexOf(10);
        status = Number(result.stdout.subarray(split + 1).toString()); bytes = result.stdout.subarray(0, split);
    } else {
        const result = await fetch(new URL(url, origin), { method: body ? "POST" : "GET", headers: { cookie: `admin_token=${cookie}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000), redirect: "error" });
        status = result.status; bytes = Buffer.from(await result.arrayBuffer());
    }
    assert.equal(status, 200, `Expected HTTP 200 from ${url.split("?")[0]}, got ${status}`);
    return bytes;
};
const json = async (url, body) => JSON.parse((await call(url, body)).toString());
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
(async () => {
    assert.equal((await json("/api/admin/auth")).authenticated, true);
    const profileId = "mqaaoypk621p6", endpoint = "/api/admin/lawyer-studio";
    const before = await json(`${endpoint}?profileId=${profileId}`);
    const out = path.join(root, "tmp/lawyer-studio-tests/live-natural"); fs.mkdirSync(out, { recursive: true });
    for (const scene of process.argv.includes("--quick") ? ["window"] : ["window", "stairs"]) {
        const preview = await json(`${endpoint}/reference-preview`, { profileId, profileImageIndices: [1], referenceIds: [], subjectCount: 1, scene });
        assert.equal(preview.policy, "body-first-references-v3");
        assert.equal(preview.faces.length, 1); assert.equal(preview.bodies.length, 1); assert.equal(preview.styles.length, 2);
        for (const role of ["faces", "bodies", "styles"]) for (const [i, url] of preview[role].entries()) {
            assert.ok(url.startsWith(`${endpoint}/asset?profileId=${profileId}&inputId=`));
            const bytes = await call(url), meta = await sharp(bytes).metadata();
            assert.ok(meta.width > 60 && meta.height > 60);
            if (role === "styles") {
                const ref = selectEditorialReferences(profileId, scene)[i];
                const expected = await sharp(fs.readFileSync(path.join("lib/lawyer-studio/style-references", ref.file))).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer();
                // PNG encoding can vary by native library build. Compare decoded pixels instead.
                assert.equal(hash(await sharp(bytes).raw().toBuffer()), hash(await sharp(expected).raw().toBuffer()));
            }
            fs.writeFileSync(path.join(out, `${scene}-${role}-${i}.png`), bytes);
        }
        console.log(`${scene}: 1 identity, 1 build, 2 actual reference images loaded; private reference pixels match.`);
    }
    const after = await json(`${endpoint}?profileId=${profileId}`);
    assert.deepEqual(after.library, before.library); assert.deepEqual(after.jobs, before.jobs);
    assert.ok((await call("/admin/lawyer-studio")).toString().includes("<script"));
    if (origin.hostname === "www.makethis1.com") {
        const unauth = await fetch(new URL(`${endpoint}/reference-preview`, origin), { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
        assert.equal(unauth.status, 401);
    }
    console.log(`PASS ${origin.origin}: no paid job, generation, library mutation or approval; actual server reference preparation verified.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
