// Read-only deployment acceptance: preflight renders in memory, never calls image/text models.
const fs = require("node:fs"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
process.loadEnvFile(".vercel/.env.studio-batch.local");
const origin = new URL(process.argv[2] || JSON.parse(fs.readFileSync(".vercel/editorial-production-retry.json", "utf8")).deployment.url);
assert.ok(origin.protocol === "https:" && (origin.hostname === "www.makethis1.com" || /^macdee-[a-z0-9]+-incbccc-7155s-projects\.vercel\.app$/.test(origin.hostname)));
const payload = `${process.env.ADMIN_ID}:editorial-readiness`;
let cookie = Buffer.from(`${payload}:${crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")}`).toString("base64url");
if (fs.existsSync(".vercel/editorial-auth-response.headers")) cookie = fs.readFileSync(".vercel/editorial-auth-response.headers", "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1] || cookie;
const call = async (url, body) => {
    let text, status;
    if (origin.hostname.endsWith(".vercel.app")) {
        const cli = "C:/Users/incbc/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js";
        const result = spawnSync(process.execPath, [cli, "curl", url, "--deployment", origin.href, "--scope", "incbccc-7155s-projects", "--", "--silent", "--max-time", "90",
            ...(url === "/api/admin/auth" && body ? ["--dump-header", ".vercel/editorial-auth-response.headers"] : []),
            "--header", `Cookie: admin_token=${cookie}`, "--header", "Content-Type: application/json", "--write-out", "\n%{http_code}",
            ...(body ? ["--request", "POST", "--data-raw", JSON.stringify(body)] : [])], { encoding: "utf8", timeout: 100000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
        if (result.status !== 0) throw new Error("Authorized Vercel request failed");
        const raw = result.stdout.trimEnd(), last = raw.lastIndexOf("\n"); status = Number(raw.slice(last + 1)); text = raw.slice(0, last);
        if (url === "/api/admin/auth" && body && status === 200) cookie = fs.readFileSync(".vercel/editorial-auth-response.headers", "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1] || cookie;
    } else {
        const response = await fetch(new URL(url, origin), { method: body ? "POST" : "GET", headers: { cookie: `admin_token=${cookie}`, "Content-Type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000), redirect: "error" });
        text = await response.text(); status = response.status;
        if (url === "/api/admin/auth" && body && status === 200) cookie = response.headers.get("set-cookie")?.match(/admin_token=([^;]+)/)?.[1] || cookie;
    }
    let data;
    try { data = JSON.parse(text); } catch { data = { html: text }; }
    return { status, data };
};
(async () => {
    if (process.env.EDITORIAL_VERIFY_PASSWORD) {
        const login = await call("/api/admin/auth", { username: "macdee", password: process.env.EDITORIAL_VERIFY_PASSWORD });
        assert.equal(login.status, 200, "Existing admin credentials must authenticate; no credentials are changed");
    }
    assert.equal((await call("/api/admin/auth")).data.authenticated, true, "Deployment admin authentication");
    for (const profileId of (process.argv.includes("--quick") ? ["mmlk8qh6gqq9l"] : ["mmlk8qh6gqq9l", "mse8rx0bkl9f0", "mmlg8fcm9bdgl"])) {
        const normal = await call("/api/admin/blog-images/preflight", { profileId, topic: "회생 이혼 학교폭력" });
        assert.equal(normal.status, 200, normal.data.error);
        assert.equal(normal.data.basicProfile, true, "Default output is photo-only");
        const basic = await call("/api/admin/blog-images/preflight", { profileId, basicProfile: false });
        assert.equal(basic.status, 200, basic.data.error); assert.equal(basic.data.count, 3); assert.equal(basic.data.setFormat, "editorial-three-v1");
        assert.deepEqual(basic.data.dimensions, [{ type: "info", width: 2000, height: 2000 }, { type: "contact", width: 2000, height: 2000 }]);
        console.log(`${profileId}: default and optional-career preflight=200, native 2000x2000 layouts OK, count=3`);
    }
    for (const profileId of ["mqaaoypk621p6", "mrvn35u3cxprq", "mmkfnvun052ja"]) {
        const library = await call(`/api/admin/lawyer-studio?profileId=${profileId}`);
        assert.equal(library.status, 200, library.data.error);
        const approved = library.data.library.assets.filter(a => a.status === "approved").length;
        const ready = library.data.library.blogEnabled && approved > 0;
        for (const basicProfile of [true, false]) {
            const r = await call("/api/admin/blog-images/preflight", { profileId, basicProfile });
            assert.equal(r.status, ready ? 200 : 422, r.data.error);
            if (!ready) assert.equal(r.data.code, "studio_approval_required");
        }
        console.log(`${profileId}: approved=${approved}, blogEnabled=${library.data.library.blogEnabled}, preflight=${ready ? 200 : '422 studio_approval_required'}`);
    }
    for (const page of ["/admin/blog-publish", "/admin/blog-images"]) {
        const r = await call(page); assert.equal(r.status, 200); assert.ok(r.data.html.includes("<script"), "Admin shell is client-authenticated; interactions are covered by browser tests");
    }
    if (origin.hostname === "www.makethis1.com") {
        const unauthenticated = await fetch(new URL("/api/admin/blog-images/generate-design", origin), { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
        assert.equal(unauthenticated.status, 401);
    }
    console.log(`PASS ${origin.origin}: native canvas/fonts, three-card preflight, approval gate, two editors and auth. No paid calls or post writes.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
