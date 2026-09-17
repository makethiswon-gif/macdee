// Read-only live acceptance: no prepared jobs, paid requests or approval mutations.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), { spawnSync } = require("node:child_process");
const { chromium } = require("playwright-core");
const origin = new URL(process.argv[2] || "https://www.makethis1.com");
assert.ok(origin.protocol === "https:" && (origin.hostname === "www.makethis1.com" || /^macdee-[a-z0-9]+-incbccc-7155s-projects\.vercel\.app$/.test(origin.hostname)));
const root = path.resolve(__dirname, ".."), owner = "mqaaoypk621p6", api = "/api/admin/lawyer-studio";
const cookie = fs.readFileSync(path.join(root, ".vercel/editorial-auth-response.headers"), "utf8").match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)?.[1];
assert.ok(cookie, "Existing admin session required");
async function call(route, body, authorized = true) {
    if (origin.hostname.endsWith(".vercel.app")) {
        const cli = "C:/Users/incbc/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js";
        const result = spawnSync(process.execPath, [cli, "curl", route, "--deployment", origin.href, "--scope", "incbccc-7155s-projects", "--", "--silent", "--max-time", "90", "--header", "Content-Type: application/json", "--write-out", "\n%{http_code}", ...(authorized ? ["--header", `Cookie: admin_token=${cookie}`] : []), ...(body ? ["--request", "POST", "--data-raw", JSON.stringify(body)] : [])], { timeout: 100000, maxBuffer: 12 * 1024 * 1024, windowsHide: true });
        assert.equal(result.status, 0, "Vercel request must succeed");
        const at = result.stdout.lastIndexOf(10);
        return { status: Number(result.stdout.subarray(at + 1).toString()), data: JSON.parse(result.stdout.subarray(0, at).toString()) };
    }
    const response = await fetch(new URL(route, origin), { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(authorized ? { cookie: `admin_token=${cookie}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
    return { status: response.status, data: await response.json() };
}
(async () => {
    const before = await call(`${api}?profileId=${owner}`); assert.equal(before.status, 200);
    const initial = await call(`${api}/batch?profileId=${owner}`); assert.equal(initial.status, 200); assert.ok(Array.isArray(initial.data.batches));
    assert.equal((await call(`${api}/batch?profileId=${owner}`, undefined, false)).status, 401);
    assert.equal((await call(`${api}/batch`, { profileId: owner, count: 1, consent: true, paidConfirmed: true })).status, 400, "One-photo consent cannot create a five-shot set");
    const after = await call(`${api}?profileId=${owner}`);
    assert.deepEqual(after.data.library, before.data.library); assert.deepEqual(after.data.jobs, before.data.jobs);
    assert.deepEqual((await call(`${api}/batch?profileId=${owner}`)).data, initial.data);
    if (origin.hostname === "www.makethis1.com") {
        const browser = await chromium.launch({ channel: "chrome", headless: true });
        try {
            for (const width of [1440, 390]) {
                const context = await browser.newContext({ viewport: { width, height: 1000 } });
                await context.addCookies([{ name: "admin_token", value: cookie, url: origin.origin, httpOnly: true, secure: true }]);
                await context.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.abort());
                const page = await context.newPage(), errors = []; page.on("pageerror", e => errors.push(e.message));
                await page.goto(`${origin.origin}/admin/lawyer-studio`, { waitUntil: "networkidle" });
                await page.getByRole("button", { name: "5장 세트", exact: true }).click();
                const checkbox = page.getByRole("checkbox", { name: /5장 유료 생성/ });
                assert.equal(await checkbox.isChecked(), false);
                assert.equal(await page.getByRole("button", { name: "5장 세트 생성", exact: true }).isDisabled(), true);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                const out = path.join(root, "tmp/lawyer-studio-tests/live-five"); fs.mkdirSync(out, { recursive: true });
                await page.screenshot({ path: path.join(out, `studio-five-${width}.png`), fullPage: true });
                assert.deepEqual(errors, []); await context.close();
            }
        } finally { await browser.close(); }
    }
    console.log(`PASS ${origin.origin}: five-shot route, owner access, consent guard and unchanged library/jobs. No paid generation or preparation.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
