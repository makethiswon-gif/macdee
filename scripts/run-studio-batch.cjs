const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execute = promisify(execFile);

const cli = process.env.VERCEL_CLI_PATH;
if (!cli || !fs.existsSync(cli)) throw new Error("Set VERCEL_CLI_PATH.");
const folder = path.resolve("tmp/lawyer-studio-batch-20260911");
const manifestPath = path.join(folder, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const auth = JSON.parse(fs.readFileSync(".vercel/studio-preview-auth.json", "utf8"));
const host = new URL(auth.url).hostname;
if (!host.endsWith(".vercel.app")) throw new Error("Only a protected Vercel preview is allowed.");
const payload = `${auth.adminId}:${Date.now()}`;
const signature = crypto.createHmac("sha256", auth.secret).update(payload).digest("hex");
const cookie = Buffer.from(`${payload}:${signature}`).toString("base64url");
const cookiePath = path.resolve(".vercel/studio-preview-cookie.txt");
fs.writeFileSync(cookiePath, `# Netscape HTTP Cookie File\n${host}\tFALSE\t/\tTRUE\t0\tadmin_token\t${cookie}\n`, { mode: 0o600 });
fs.mkdirSync(path.join(folder, "requests"), { recursive: true });
fs.mkdirSync(path.join(folder, "photos"), { recursive: true });
const save = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
let sequence = 0;

async function request(endpoint, options = {}) {
    const id = `${Date.now()}-${sequence++}`;
    const output = options.output || path.join(folder, "requests", `${id}-response.json`);
    const args = [cli, "curl", endpoint, "--deployment", auth.url, "--", "--silent", "--show-error", "--max-time", "360", "--cookie", cookiePath, "--output", output, "--write-out", "STUDIO_HTTP:%{http_code}"];
    if (options.json) {
        const input = path.join(folder, "requests", `${id}-input.json`);
        fs.writeFileSync(input, JSON.stringify(options.json));
        args.push("--request", "POST", "--header", "Content-Type: application/json", "--data-binary", `@${input}`);
    }
    if (options.form) for (const field of options.form) args.push("--form", field);
    let result;
    try { result = { ...await execute(process.execPath, args, { encoding: "utf8", timeout: 390000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }), status: 0 }; }
    catch (error) { result = { stdout: error.stdout, stderr: error.stderr, status: error.code || 1 }; }
    const status = Number(result.stdout?.match(/STUDIO_HTTP:(\d{3})/)?.[1]);
    if (result.status !== 0 || !status) {
        fs.writeFileSync(path.join(folder, "requests", `${id}-transport.json`), JSON.stringify({ code: result.status, stdout: result.stdout, stderr: result.stderr }));
        throw new Error("Preview transport failed; no automatic paid retry. Inspect private request log.");
    }
    let data;
    if (!options.output || status >= 400) {
        try { data = JSON.parse(fs.readFileSync(output, "utf8")); } catch { throw new Error(`Preview returned non-JSON HTTP ${status}.`); }
    }
    if (status < 200 || status >= 300) throw new Error(`HTTP ${status}: ${data?.error || data?.message || "Request failed"}`);
    return data;
}

async function checkProfile(owner) {
    const result = await request(`/api/admin/lawyer-studio?profileId=${encodeURIComponent(owner.id)}`);
    if (!result.configured || result.model !== manifest.model) throw new Error("Preview image model is not configured as planned.");
    const assets = result.library.assets.filter((a) => manifest.jobs.some((j) => j.jobId === a.id));
    console.log(JSON.stringify({ name: owner.name, batchSaved: assets.length, draft: assets.filter((a) => a.status === "draft").length, blogEnabled: result.library.blogEnabled }));
    return result;
}

async function exportJob(job) {
    const asset = job.asset;
    if (!asset || asset.status !== "draft" || asset.model !== manifest.model || asset.quality !== manifest.quality) throw new Error("Unexpected image metadata; inspect before continuing.");
    const stem = `${job.profileId}-${job.key}`;
    const endpoint = `/api/admin/lawyer-studio/asset?profileId=${job.profileId}&assetId=${asset.id}&version=${asset.version}`;
    for (const original of [false, true]) {
        const output = path.join(folder, "photos", `${stem}${original ? "-original.png" : ".jpg"}`);
        if (!fs.existsSync(output)) await request(endpoint + (original ? "&original=1" : ""), { output });
        if (fs.statSync(output).size < 1000) throw new Error("Exported photo is unexpectedly small.");
        job[original ? "originalFile" : "renderedFile"] = output;
    }
    job.state = "complete";
    save();
}

async function runJob(job) {
    const owner = manifest.owners.find((o) => o.id === job.profileId);
    if (job.state === "complete") return;
    console.log(`Starting ${job.name}: ${job.label}`);
    if (!job.jobId) {
        if (job.useStyleReference && !owner.styleReferenceId) {
            const result = await request("/api/admin/lawyer-studio/references", { form: [`profileId=${owner.id}`, "role=style", `file=@${manifest.styleReference}`] });
            owner.styleReferenceId = result.referenceId;
            save();
        }
        job.referenceIds = job.useStyleReference ? [owner.styleReferenceId] : [];
        const result = await request("/api/admin/lawyer-studio", { json: { action: "prepare", profileId: job.profileId, requestId: job.requestId, profileImageIndices: job.profileImageIndices, referenceIds: job.referenceIds, options: job.options, consent: true, paidConfirmed: true } });
        job.jobId = result.job.id;
        job.frozenJob = result.job;
        job.state = "ready";
        save();
    }
    if (!job.asset) {
        if (["generating", "error"].includes(job.state) && !process.argv.includes("--recover")) throw new Error("Interrupted job requires explicit --recover of the SAME durable job; no new paid job is created.");
        job.state = "generating";
        job.startedAt = new Date().toISOString();
        save();
        const result = await request("/api/admin/lawyer-studio/generate", { json: { profileId: job.profileId, jobId: job.jobId } });
        job.asset = result.asset;
        job.reused = result.reused;
        job.state = "saved";
        job.completedAt = new Date().toISOString();
        save();
    }
    await exportJob(job);
    console.log(JSON.stringify({ name: job.name, shot: job.key, state: job.state, saved: manifest.jobs.filter((j) => j.state === "complete").length, total: manifest.count, file: job.renderedFile, usage: job.asset.usage }));
}

(async () => {
try {
    const command = process.argv[2] || "status";
    if (command === "status") {
        for (const owner of manifest.owners) await checkProfile(owner);
    } else if (["first", "remaining", "export"].includes(command)) {
        if (command === "remaining" && !process.argv.includes("--first-reviewed")) throw new Error("Inspect the first generated photograph before starting the remaining images.");
        manifest.state = "preview-approved";
        manifest.previewUrl = auth.url;
        save();
        await checkProfile(manifest.owners[0]);
        const groups = command === "remaining" ? manifest.owners.map((owner) => manifest.jobs.filter((j) => j.profileId === owner.id)) : [command === "first" ? manifest.jobs.slice(0, 1) : manifest.jobs];
        let next = 0, failure;
        const worker = async () => {
            while (!failure && next < groups.length) {
                const jobs = groups[next++];
                // One in-flight job per owner avoids competing library revisions.
                for (const job of jobs) {
                    if (failure) break;
                    try { if (command === "export") { if (job.asset) await exportJob(job); } else await runJob(job); }
                    catch (error) { job.lastError = error.message; job.state = job.asset ? "export-error" : "error"; save(); failure = error; break; }
                }
            }
        };
        await Promise.all(Array.from({ length: Math.min(3, groups.length) }, worker));
        if (failure) throw failure;
        if (manifest.jobs.every((j) => j.state === "complete")) manifest.state = "complete-draft";
        save();
    } else throw new Error("Unknown command.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
})();
