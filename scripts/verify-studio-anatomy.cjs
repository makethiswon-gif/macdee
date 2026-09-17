// Two owner-authorized paid acceptance shots only. Durable IDs prevent accidental replacements.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process"), ts = require("typescript"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { createStudioPose } = require("../lib/lawyer-studio/poses.ts");
const origin = new URL(process.argv[2]), command = process.argv[3] || "inspect";
assert.match(origin.hostname, /^macdee-[a-z0-9]+-incbccc-7155s-projects\.vercel\.app$/);
assert.equal(origin.protocol, "https:");
assert.ok(["inspect", "kim", "yu", "balance"].includes(command));
const owners = [
    { key: "kim", id: "mqaaoypk621p6", name: "김정웅", index: 1, scene: "desk", poseId: "desk-3", beforeId: "6822100baf3d2cb7f30b062f084e15d096631eaa154a2ab8cac04c7c93815fb7" },
    { key: "yu", id: "mmlk8qh6gqq9l", name: "유지은", index: 2, scene: "studio", poseId: "studio-1", beforeId: "7c9009c40fd3c4d3d58037bd9502afa51f8fafc1ea0fcf193841bad3f51932ad" },
];
const privateDir = path.resolve(".vercel/studio-anatomy-v3"), out = path.resolve("tmp/studio-proportions-audit");
fs.mkdirSync(privateDir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
const cookie = fs.readFileSync(".vercel/editorial-auth-response.headers", "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1]; assert.ok(cookie);
const cli = "C:/Users/incbc/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js";
let seq = 0;
function call(endpoint, body, output) {
    const stamp = `${command}-${Date.now()}-${seq++}`, target = output || path.join(privateDir, `${stamp}-response.json`);
    const args = [cli, "curl", endpoint, "--deployment", origin.href, "--scope", "incbccc-7155s-projects", "--", "--silent", "--show-error", "--max-time", "300", "--header", `Cookie: admin_token=${cookie}`, "--header", `Origin: ${origin.origin}`, "--output", target, "--write-out", "STUDIO_HTTP:%{http_code}"];
    if (body) { const input = path.join(privateDir, `${stamp}-request.json`); fs.writeFileSync(input, JSON.stringify(body)); args.push("--request", "POST", "--header", "Content-Type: application/json", "--data-binary", `@${input}`); }
    const result = spawnSync(process.execPath, args, { timeout: 330000, maxBuffer: 1024 * 1024, windowsHide: true, encoding: "utf8" });
    const status = Number(result.stdout?.match(/STUDIO_HTTP:(\d{3})/)?.[1]);
    if (result.status !== 0 || !status) throw new Error("Transport uncertain; preserve the SAME request/job and investigate before --recover. No replacement allowed.");
    const data = !output || status !== 200 ? JSON.parse(fs.readFileSync(target, "utf8")) : undefined;
    if (status !== 200) throw new Error(`HTTP ${status}: ${data?.error || "Inspect private response"}`);
    return data;
}
const endpoint = "/api/admin/lawyer-studio";
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
(async () => {
    assert.equal(call("/api/admin/auth").authenticated, true);
    for (const owner of owners.filter(o => ["inspect", "balance"].includes(command) || o.key === command)) {
        const current = call(`${endpoint}?profileId=${owner.id}`);
        assert.equal(current.configured, true);
        if (command === "balance") {
            assert.ok(process.argv.includes("--save-free-balance"));
            const file = path.join(privateDir, `${owner.key}.json`), state = JSON.parse(fs.readFileSync(file, "utf8"));
            assert.equal(state.state, "complete-draft"); assert.equal(state.profileId, owner.id);
            const originalAsset = current.library.assets.find(a => a.id === state.asset.id);
            assert.ok(originalAsset); assert.equal(originalAsset.status, "draft", "Never edit an owner-approved test result");
            const { proportions } = JSON.parse(fs.readFileSync(path.join(out, `${owner.key}-balance.json`), "utf8"));
            assert.equal(proportions.length, 1); assert.equal(proportions[0].kind, "head"); assert.equal(proportions[0].scaleX, 96); assert.equal(proportions[0].scaleY, 96);
            let library = current.library;
            if (JSON.stringify(originalAsset.proportions) !== JSON.stringify(proportions)) library = call(endpoint, { action: "save", profileId: owner.id, assetId: originalAsset.id, revision: current.library.revision, filters: originalAsset.filters, proportions }).library;
            const asset = library.assets.find(a => a.id === originalAsset.id);
            assert.equal(asset.status, "draft"); assert.equal(asset.originalPath, originalAsset.originalPath); assert.deepEqual(asset.proportions, proportions);
            for (const old of current.library.assets.filter(a => a.id !== originalAsset.id)) assert.deepEqual(library.assets.find(a => a.id === old.id), old);
            assert.equal(library.blogEnabled, current.library.blogEnabled); assert.equal(library.assets.length, current.library.assets.length);
            const target = path.join(out, `${owner.key}-balanced-server.jpg`);
            call(`${endpoint}/asset?profileId=${owner.id}&assetId=${asset.id}&version=${asset.version}`, undefined, target);
            const expected = await sharp(path.join(out, `${owner.key}-balanced.jpg`)).raw().toBuffer(), actual = await sharp(target).raw().toBuffer();
            assert.equal(actual.length, expected.length); let difference = 0; for (let i = 0; i < actual.length; i++) difference += Math.abs(actual[i] - expected[i]);
            assert.ok(difference / actual.length < 2, "Server uses the same free balancing pixels");
            state.balancedAsset = asset; state.balanceVerifiedAt = new Date().toISOString(); save(file, state);
            console.log(JSON.stringify({ name: owner.name, freeBalanceSaved: true, version: asset.version, status: asset.status, pixelMeanDifference: difference / actual.length, existingAssetsPreserved: true }));
            continue;
        }
        if (command === "inspect") {
            const preview = call(`${endpoint}/reference-preview`, { profileId: owner.id, profileImageIndices: [owner.index], referenceIds: [], subjectCount: 1, scene: owner.scene });
            assert.equal(preview.policy, "body-first-references-v3");
            assert.equal(preview.faces.length, 1); assert.equal(preview.bodies.length, 1); assert.equal(preview.styles.length, 2);
            call(preview.bodies[0], undefined, path.join(out, `${owner.key}-selected-source.png`));
            console.log(JSON.stringify({ name: owner.name, assets: current.library.assets.length, sourceIndex: owner.index, policy: preview.policy, poses: current.library.assets.filter(a => a.scene === owner.scene).slice(0, 3).map(a => a.pose?.poseId) }));
            continue;
        }
        assert.ok(process.argv.includes("--two-shots-authorized"), "Requires the existing explicit two-photo owner approval");
        const file = path.join(privateDir, `${owner.key}.json`);
        let state;
        if (fs.existsSync(file)) state = JSON.parse(fs.readFileSync(file, "utf8"));
        else {
            const options = { scene: owner.scene, wardrobe: "suit", mood: "documentary", quality: "xhigh", shootStyle: "gq", subjectCount: 1, notes: "" };
            const history = current.library.assets.flatMap(a => a.pose ? [a.pose] : []);
            let requestId, jobId, pose;
            for (let i = 0; i < 200; i++) {
                requestId = crypto.randomUUID(); jobId = crypto.createHash("sha256").update(JSON.stringify({ stage: "studio-job-v1", input: { profileId: owner.id, requestId } })).digest("hex");
                pose = createStudioPose(owner.id, jobId, options, history);
                if (pose.poseId === owner.poseId) break;
            }
            assert.equal(pose.poseId, owner.poseId, "Requested comparison posture must be available without changing history");
            state = { profileId: owner.id, requestId, expectedJobId: jobId, origin: origin.origin, options, profileImageIndices: [owner.index], beforeLibrary: current.library, state: "planned" }; save(file, state);
        }
        assert.equal(state.origin, origin.origin); assert.equal(state.profileId, owner.id);
        if (!state.job) {
            state.job = call(endpoint, { action: "prepare", profileId: owner.id, requestId: state.requestId, options: state.options, profileImageIndices: state.profileImageIndices, referenceIds: [], consent: true, paidConfirmed: true }).job;
            save(file, state);
        }
        assert.equal(state.job.id, state.expectedJobId); assert.equal(state.job.anatomyPolicy, "natural-scale-v3");
        assert.equal(state.job.referencePolicy, "body-first-references-v3"); assert.deepEqual(state.job.inputs.map(i => i.role), ["body", "identity", "style", "style"]);
        if (!state.asset) {
            if (state.state === "generating" && !process.argv.includes("--recover")) throw new Error("Same-job recovery requires explicit --recover after investigating uncertain transport.");
            console.log(`${owner.name}: ONE paid ${state.job.pose.label} / color / xhigh request starts.`);
            state.state = "generating"; save(file, state);
            const result = call(`${endpoint}/generate`, { profileId: owner.id, jobId: state.job.id });
            state.asset = result.asset; state.reused = result.reused; state.state = "saved"; save(file, state);
        }
        assert.equal(state.asset.status, "draft"); assert.equal(state.asset.anatomyPolicy, "natural-scale-v3"); assert.ok(state.asset.filters.saturation > 0);
        const after = call(`${endpoint}?profileId=${owner.id}`);
        for (const old of state.beforeLibrary.assets) assert.deepEqual(after.library.assets.find(a => a.id === old.id), old, "Existing photo/approval must remain unchanged");
        assert.equal(after.library.blogEnabled, state.beforeLibrary.blogEnabled);
        assert.equal(after.library.assets.filter(a => !state.beforeLibrary.assets.some(old => old.id === a.id)).length, 1);
        for (const [label, asset] of [["before", state.beforeLibrary.assets.find(a => a.id === owner.beforeId)], ["v3", state.asset]]) {
            assert.ok(asset);
            const url = `${endpoint}/asset?profileId=${owner.id}&assetId=${asset.id}&version=${asset.version}`;
            for (const original of [false, true]) {
                const target = path.join(out, `${owner.key}-${label}${original ? "-original.png" : ".jpg"}`);
                if (!fs.existsSync(target)) call(url + (original ? "&original=1" : ""), undefined, target);
                const meta = await sharp(target).metadata(); assert.ok(meta.width >= 1000 && meta.height >= 1000);
            }
        }
        state.state = "complete-draft"; state.verifiedAt = new Date().toISOString(); save(file, state);
        console.log(JSON.stringify({ name: owner.name, state: state.state, id: state.asset.id, framingReview: state.asset.framingReview, usage: state.asset.usage, renderedFile: path.join(out, `${owner.key}-v3.jpg`), existingAssetsPreserved: true }));
    }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
