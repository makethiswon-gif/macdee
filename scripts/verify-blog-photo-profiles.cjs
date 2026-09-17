// Read-only profile audit and local native rendering. Never writes to production or calls a model.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
process.loadEnvFile(".vercel/.env.studio-batch.local");
process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const cookie = fs.readFileSync(".vercel/editorial-auth-response.headers", "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1];
assert.ok(cookie, "Existing authorized admin session is required");
const { renderEditorialThree, prepareEditorialThree } = require("../lib/blog-images/three-card-renderer.ts");
const { EDITORIAL_SET_FORMAT } = require("../lib/blog-images/card-types.ts");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
const out = path.resolve("tmp/blog-photo-recovery"); fs.mkdirSync(out, { recursive: true });
const api = async pathname => {
    const r = await fetch(new URL(pathname, "https://www.makethis1.com"), { headers: { cookie: `admin_token=${cookie}` }, signal: AbortSignal.timeout(45000), redirect: "error" });
    assert.equal(r.status, 200, `Profile read HTTP ${r.status}`); return r.json();
};
(async () => {
    const { profiles } = await api("/api/admin/blog-profiles");
    const report = [];
    for (const summary of profiles) {
        if (!summary.profileImageCount && !summary.officeImageCount) { report.push({ id: summary.id, name: summary.lawyerName, status: "no-registered-photos" }); continue; }
        const { profile: p } = await api(`/api/admin/blog-profiles?id=${encodeURIComponent(summary.id)}`);
        p.phone = blogPhoneContact(p.phone)?.display || "";
        const proof = { profileId: p.id, lawyerId: p.id, firmId: "", revision: 0, sourceHash: "local-photo-check", mode: "basic", claims: [] };
        const plan = { version: "visual-plan-v11", sourceHash: proof.sourceHash, question: "", thesis: "", cards: [], paragraphs: [], setFormat: EDITORIAL_SET_FORMAT, proofSelection: proof };
        const result = await renderEditorialThree({ profile: p, plan, card: { type: "info", heading: "", evidence: [], afterParagraphId: "", purpose: "" } });
        assert.ok(result.layoutChecks.passed); assert.equal(result.layoutChecks.textBlocks, 0);
        assert.equal(result.width, 2000); assert.equal(result.height, 2000);
        if (p.phone) await prepareEditorialThree(p, proof, "상담 준비");
        if (["mmlk8qh6gqq9l", "mqaaoypk621p6"].includes(p.id)) fs.writeFileSync(path.join(out, `${p.id}-photo.png`), Buffer.from(result.imageDataUrl.split(",")[1], "base64"));
        const entry = { id: p.id, name: p.lawyerName.trim(), status: "passed", phone: !!p.phone, width: result.width, height: result.height, warnings: result.warnings };
        report.push(entry); console.log(JSON.stringify(entry));
    }
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    console.log(`PASS: ${report.filter(r => r.status === "passed").length} registered profiles rendered; ${report.filter(r => r.status !== "passed").length} entries have no registered photos. No paid calls or production writes.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
