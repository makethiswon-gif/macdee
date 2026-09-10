// Explicit deployment acceptance check. No manuscript creation or automatic retries.
// Credentials are environment-only; private artifacts stay under ignored tmp/.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto"), sharp = require("sharp");
const { execFileSync } = require("node:child_process");
const base = process.env.BLOG_VERIFY_URL;
const mode = process.argv[2] || "preflight";
const dir = path.resolve("tmp/pipeline-repair"), out = path.join(dir, "live");
if (!base || !/^https:\/\/(?:www\.makethis1\.com|macdee-[a-z0-9-]+\.vercel\.app)$/.test(base)) throw new Error("Explicit project deployment URL required");
if (!["preflight", "plan", "cards", "recover", "attach", "layout"].includes(mode)) throw new Error("Unknown verification mode");
fs.mkdirSync(out, { recursive: true });
(async () => {
    const post = JSON.parse(fs.readFileSync(path.join(dir, "posts.json"))).find((p) => p.id === "e623a30c-265d-41b8-892b-18780894908a");
    assert.ok(post);
    const protectedRequest = async (route, body, cookie = "") => {
        const args = [path.join(path.dirname(process.execPath), "node_modules/npm/bin/npx-cli.js"), "--yes", "vercel", "curl", route, "--deployment", base, "--", "--silent", "--show-error", "--request", "POST",
            "--header", "Content-Type: application/json", ...(cookie ? ["--header", "Cookie: " + cookie] : []), "--data-binary", "@-", "--include", "--max-time", "295"];
        let raw;
        try { raw = execFileSync(process.execPath, args, { input: JSON.stringify(body), encoding: "utf8", maxBuffer: 4_000_000, timeout: 310000, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }); }
        catch (e) { throw new Error(`Protected request did not complete (exit ${e.status}). No automatic retry.`); }
        const split = raw.indexOf("\r\n\r\n"), header = raw.slice(0, split), text = raw.slice(split + 4);
        const status = Number(header.match(/^HTTP\/\S+ (\d+)/)?.[1]);
        return { status, json: async () => JSON.parse(text), cookie: header.split("\r\n").filter((s) => /^set-cookie:/i.test(s)).map((s) => s.slice(s.indexOf(":") + 1).trim().split(";")[0]).join("; ") };
    };
    const login = await protectedRequest("/api/admin/auth", { username: process.env.BLOG_VERIFY_USER, password: process.env.BLOG_VERIFY_PASSWORD });
    assert.equal(login.status, 200, "Admin authentication must succeed before any generation");
    const cookie = login.cookie;
    assert.ok(cookie.startsWith("admin_token="));
    const call = async (route, body) => {
        const start = Date.now();
        const r = await protectedRequest(route, body, cookie);
        const data = await r.json();
        console.log(JSON.stringify({ route, status: r.status, elapsedMs: Date.now() - start, ...(data.error ? { error: data.error, operationId: data.operationId } : {}) }));
        assert.equal(r.status, 200, data.error); return data;
    };
    const preflight = await call("/api/admin/blog-images/preflight", { profileId: post.profile_id, checkModel: true });
    console.log("Model access:", preflight.model);
    if (mode === "preflight") return;
    const input = { title: post.title, content: post.body, profile: { id: post.profile_id } };
    if (mode === "attach") {
        const { parseEnv } = require("node:util"), { createClient } = require("@supabase/supabase-js");
        const env = parseEnv(fs.readFileSync("tmp/.env.image-repair", "utf8"));
        const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        const tag = "pipeline-acceptance-" + crypto.randomUUID();
        try {
            const created = await call("/api/admin/blog-posts", { profileId: post.profile_id, title: post.title, body: post.body, topic: tag });
            const card = JSON.parse(fs.readFileSync(path.join(out, "thumbnail.json")));
            const body = { postId: created.id, image: { type: card.type, productionId: card.productionId, setId: card.setId, releaseToken: card.releaseToken }, index: 0,
                requiredTypes: ["thumbnail", "illustration", "info", "contact"], total: 4 };
            const first = await call("/api/admin/blog-posts/images", body);
            const second = await call("/api/admin/blog-posts/images", body);
            assert.equal(first.done, false); assert.equal(second.done, false); assert.equal(second.images.length, 1);
            const saved = await db.from("blog_posts").select("status").eq("id", created.id).single();
            assert.equal(saved.data?.status, "draft", "Acceptance test must never enter the publication queue");
            console.log("ID-only upload and retry verified; test stayed in draft status.");
        } finally {
            const found = await db.from("blog_posts").select("id").eq("topic", tag).eq("profile_id", post.profile_id).eq("status", "draft");
            assert.ok(!found.error);
            for (const row of found.data || []) {
                assert.match(row.id, /^[a-f0-9-]{36}$/);
                const folder = await db.storage.from("blog-cards").list(row.id); assert.ok(!folder.error);
                const paths = (folder.data || []).map((f) => row.id + "/" + f.name);
                if (paths.length) assert.ok(!(await db.storage.from("blog-cards").remove(paths)).error);
                assert.ok(!(await db.from("blog_posts").delete().eq("id", row.id).eq("topic", tag)).error);
            }
            console.log("Temporary acceptance draft and its copied files removed.");
        }
        return;
    }
    if (mode === "plan") {
        const data = await call("/api/admin/blog-images/plan", { ...input, forceReplan: true, attemptId: "pipeline-v12-acceptance-20260910", confirmPaid: true });
        fs.writeFileSync(path.join(out, "plan.json"), JSON.stringify(data.plan, null, 2));
        console.log("Plan:", data.plan.operationId, data.plan.cards.map((c) => ({ type: c.type, treatment: c.treatment, art: !!c.art, diagram: c.infographic?.kind })));
        return;
    }
    const plan = JSON.parse(fs.readFileSync(path.join(out, "plan.json")));
    if (mode === "recover") {
        const recovered = await call("/api/admin/blog-images/plan", input);
        assert.equal(recovered.plan.sourceHash, plan.sourceHash); assert.deepEqual(recovered.plan.cards, plan.cards);
        console.log("Default plan recovery returns the selected saved plan.");
    }
    // Slim request includes a name for validation; server reloads the registered profile.
    const row = JSON.parse(fs.readFileSync(path.join(dir, "profiles.json"))).find((p) => p.id === post.profile_id);
    input.profile.lawyerName = row.lawyer_name.split("||")[0];
    if (mode === "layout") {
        const original = JSON.parse(fs.readFileSync(path.join(out, "thumbnail.json")));
        const directory = path.join(dir, "layout-live"); fs.mkdirSync(directory, { recursive: true });
        for (const layoutRecipe of ["headline", "photo-open", "column-pair", "caption-rail", "title-band", "split-footer"]) {
            const request = { ...input, plan: { ...plan, layoutRecipe }, cardType: "thumbnail", quality: "high", transport: "asset", renderOnly: true, reuseProductionId: original.productionId };
            const { card } = await call("/api/admin/blog-images/generate-design", request);
            assert.equal(card.layoutRecipe, layoutRecipe, "No silent fallback to the old template");
            assert.ok(card.layoutChecks.passed && card.releaseToken && card.imageUrl);
            const response = await fetch(card.imageUrl); assert.equal(response.status, 200);
            const bytes = Buffer.from(await response.arrayBuffer());
            assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), card.imageHash);
            assert.equal((await sharp(bytes).metadata()).width, 1200);
            fs.writeFileSync(path.join(directory, layoutRecipe + ".png"), bytes);
            const second = await call("/api/admin/blog-images/generate-design", request);
            assert.equal(second.card.productionId, card.productionId); assert.equal(second.card.imageHash, card.imageHash);
        }
        console.log("Six live layouts and exact cached recovery verified. renderOnly required saved art; no model generation or publication.");
        return;
    }
    const cards = [];
    for (const planned of plan.cards) {
        if (planned.skipReason || (planned.art && planned.type !== "thumbnail")) { console.log("Skipped additional paid art:", planned.type); continue; }
        const request = { ...input, plan, cardType: planned.type, quality: "high", transport: "asset" };
        const { card } = await call("/api/admin/blog-images/generate-design", request);
        assert.equal(card.imageDataUrl, ""); assert.ok(card.imageUrl && card.productionId && card.releaseToken && card.layoutChecks.passed);
        const response = await fetch(card.imageUrl); assert.equal(response.status, 200);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), card.imageHash);
        const meta = await sharp(bytes).metadata(); assert.equal(meta.width, 1200);
        const filename = path.join(out, planned.type + ".json");
        if (mode === "recover") {
            const before = JSON.parse(fs.readFileSync(filename));
            assert.equal(card.productionId, before.productionId); assert.equal(card.imageHash, before.imageHash);
        }
        fs.writeFileSync(filename, JSON.stringify(card, null, 2));
        fs.writeFileSync(path.join(out, planned.type + ".png"), bytes);
        cards.push({ type: card.type, width: meta.width, height: meta.height, bytes: bytes.length, model: card.model, productionId: card.productionId });
    }
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify({ base, mode, cards }, null, 2));
    console.log(JSON.stringify(cards, null, 2));
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
