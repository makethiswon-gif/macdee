// One-time, explicit preservation of existing paid assets; no AI calls or overwrites.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), { parseEnv } = require("node:util"), assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const dir = path.resolve(process.argv[2] || "tmp/pipeline-repair"), apply = process.argv.includes("--apply");
const hash = (v) => crypto.createHash("sha256").update(v).digest("hex");
(async () => {
    const env = parseEnv(fs.readFileSync("tmp/.env.image-repair", "utf8"));
    const storage = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY).storage.from("owner-briefings");
    const snapshots = fs.readdirSync(dir).filter((f) => /^[a-f0-9]{64}\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f))));
    for (const checkpoint of snapshots.filter((s) => s.artDataUrl && s.card?.type && s.profileId)) {
        const candidates = snapshots.filter((s) => s.cards && s.sourceHash === checkpoint.sourceHash && s.strengthSelection?.profileId === checkpoint.profileId);
        if (candidates.length !== 1) { console.log("Ambiguous plan; skipped", checkpoint.id); continue; }
        const art = candidates[0].cards.find((c) => c.type === checkpoint.card.type)?.art;
        if (!art) continue;
        const { direction, ...scene } = art;
        const file = `blog-art-index/${hash(JSON.stringify({ profileId: checkpoint.profileId, sourceHash: checkpoint.sourceHash, type: checkpoint.card.type, scene }))}.json`;
        const remote = await storage.download(`blog-image-production/${checkpoint.id}.json`);
        assert.ok(remote.data && !remote.error);
        const current = JSON.parse(await remote.data.text());
        assert.equal(current.profileId, checkpoint.profileId); assert.equal(current.sourceHash, checkpoint.sourceHash);
        assert.equal(current.card?.type, checkpoint.card.type); assert.equal(hash(current.artDataUrl), hash(checkpoint.artDataUrl));
        if (apply) {
            const { error } = await storage.upload(file, JSON.stringify({ productionId: checkpoint.id }), { contentType: "application/json", upsert: false });
            assert.ok(!error || String(error.statusCode) === "409" || error.message === "The resource already exists", error?.message);
        }
        console.log(apply ? "Preserved index" : "Verified candidate", checkpoint.profileId, checkpoint.card.type, checkpoint.id);
    }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
