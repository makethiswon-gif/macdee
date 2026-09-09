// Real planning validation, rendering, routes, storage checkpoints and release signatures.
// External models and Supabase are in-memory fixtures; no production writes or billing.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), crypto = require("node:crypto"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename }).outputText, filename);
process.env.ADMIN_ID = "quality-test"; process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
process.env.OPENAI_API_KEY = "fixture"; process.env.ANTHROPIC_API_KEY = "fixture";
const files = new Map(); let privateBucket = true;
const storage = {
    upload: async (key, value, options) => {
        if (files.has(key) && !options?.upsert) return { error: { statusCode: "409" } };
        files.set(key, typeof value === "string" ? value : value.toString()); return { error: null };
    },
    download: async (key) => files.has(key) ? { data: new Blob([files.get(key)]), error: null } : { data: null, error: { statusCode: "404" } },
    list: async (prefix, opts) => ({ data: [...files.keys()].filter((k) => k.startsWith(prefix + "/")).sort().reverse().slice(0, opts.limit).map((k) => ({ name: k.split("/").pop() })), error: null }),
};
const db = { storage: { from: () => storage, getBucket: async () => ({ data: { public: !privateBucket }, error: null }) } };
const load = Module._load;
Module._load = function (name, ...args) {
    if (name === "@/lib/supabase/server") return { createServiceClient: () => db };
    if (name === "@/lib/blog-images/strength-context") return { imageStrengthContext: async (p) => ({ profile: p, token: "fixture", selection: { profileId: p.id, claims: [] } }) };
    return load.call(this, name, ...args);
};
const { title, article, profile, rawPlan, variants } = require("./blog-images-v7-fixtures.cjs");
const { validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { getMagazineIdentity } = require("../lib/blog-images/magazine-identity.ts");
const { inspectAndRepair } = require("../lib/blog-images/quality-controller.ts");
const { imageReady } = require("../lib/blog-images/quality-policy.ts");
const { digest, verifyImageRelease, recentVisualHistory, recordVisualPlan, cachedVisualPlan, saveVisualPlan } = require("../lib/blog-images/production-store.ts");
const { POST } = require("../app/api/admin/blog-images/generate-design/route.ts");
const { POST: PLAN } = require("../app/api/admin/blog-images/plan/route.ts");
const { generateQualityCard } = require("../lib/blog-images/generate-client.ts");
const payload = "quality-test:local", cookie = Buffer.from(payload + ":" + crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")).toString("base64url");
const request = (body) => new Request("http://localhost/api/admin/blog-images/generate-design", { method: "POST", headers: { "Content-Type": "application/json", cookie: "admin_token=" + cookie }, body: JSON.stringify(body) });
const pass = { design: 5, readability: 5, fidelity: 5, critical: false, summary: "검수 통과", issues: [], repair: "none" };
let reviewResult = pass, imageCalls = 0, reviewCalls = 0, failImage = false, lastImage;
(async () => {
    const photo = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#386a64" } }).jpeg().toBuffer();
    global.fetch = async (url, options) => {
        if (String(url).startsWith("/api/")) return POST(request(JSON.parse(options.body)));
        if (String(url).includes("images/generations")) {
            imageCalls++; lastImage = JSON.parse(options.body); if (failImage) throw new Error("ambiguous response");
            return Response.json({ data: [{ b64_json: photo.toString("base64") }] });
        }
        if (String(url).includes("anthropic.com")) {
            reviewCalls++;
            const value = typeof reviewResult === "function" ? reviewResult() : reviewResult;
            return Response.json({ content: [{ type: "text", text: JSON.stringify(value) }] });
        }
        throw new Error("Unexpected network: " + url);
    };
    const raw = rawPlan(variants[0]);
    delete raw.cards[1].art; raw.cards[1].infographic = variants[2];
    const plan = validateVisualPlan(raw, title, article, false);
    assert.equal(plan.version, "visual-plan-v11"); assert.ok(plan.cards[1].infographic); assert.ok(!plan.cards[1].art);
    assert.throws(() => validateVisualPlan({ ...plan, cards: plan.cards.map((c) => c.type === "illustration" ? { ...c, art: rawPlan().cards[1].art } : c) }, title, article), /하나만/);
    const id1 = getMagazineIdentity({ ...profile, id: "a", specialty: ["의료", "기업"] });
    const id2 = getMagazineIdentity({ ...profile, id: "b", specialty: ["의료", "기업"] });
    assert.deepEqual(id1, id2, "ID no longer assigns arbitrary design"); assert.equal(id1.family, "ledger");
    assert.equal(getMagazineIdentity({ ...profile, specialty: ["의료"], designFamily: "journal" }).family, "journal");
    await recordVisualPlan("fixture-profile", plan); assert.equal((await recentVisualHistory("fixture-profile"))[0].sourceHash, plan.sourceHash);
    const planId = digest("fixture-plan"); assert.equal(await cachedVisualPlan(planId), null);
    await saveVisualPlan(planId, plan); const recovered = await cachedVisualPlan(planId);
    assert.deepEqual(recovered.paragraphs, []); assert.equal(validateVisualPlan(recovered, title, article).sourceHash, plan.sourceHash);
    reviewResult = { ...raw, direction: { concept: "원본과 정리본", rationale: "서로 다른 자료의 역할", alternatives: [{ concept: "대화 흐름", reasonNotChosen: "비교가 우선" }, { concept: "날짜별 기록", reasonNotChosen: "본문 도표로 설명" }], palette: "teal", typography: "sans", composition: "split", motif: "두 자료의 차이" } };
    const requestPlan = { profile, title, content: article };
    let plannedResponse = await PLAN(request(requestPlan)); assert.equal(plannedResponse.status, 200, JSON.stringify(await plannedResponse.clone().json()));
    const cachedCalls = reviewCalls, firstPlan = (await plannedResponse.json()).plan;
    plannedResponse = await PLAN(request(requestPlan)); assert.equal(plannedResponse.status, 200); assert.equal(reviewCalls, cachedCalls);
    assert.deepEqual((await plannedResponse.json()).plan.cards, firstPlan.cards, "Reopening uses the same plan for paid artifact recovery");
    plannedResponse = await PLAN(request({ ...requestPlan, forceReplan: true })); assert.equal(plannedResponse.status, 200); assert.equal(reviewCalls, cachedCalls + 1);
    reviewResult = pass;
    const base = { profile, title, content: article, plan };
    let response = await POST(request({ ...base, cardType: "thumbnail" }));
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
    const cover = (await response.json()).card;
    assert.ok(imageReady(cover), JSON.stringify(cover.designReview));
    assert.equal(lastImage.quality, "high"); assert.equal(cover.artDataUrl, undefined, "Original art stays private, not duplicated in response");
    assert.ok(Buffer.byteLength(JSON.stringify(cover)) < 4_000_000);
    const expected = { profileId: profile.id, sourceHash: plan.sourceHash, type: cover.type, pngHash: digest(Buffer.from(cover.imageDataUrl.split(",")[1], "base64")), setId: cover.setId };
    assert.ok(verifyImageRelease(cover.releaseToken, expected));
    for (const field of Object.keys(expected)) assert.ok(!verifyImageRelease(cover.releaseToken, { ...expected, [field]: "tampered" }));
    const before = [imageCalls, reviewCalls];
    response = await POST(request({ ...base, cardType: "thumbnail" })); assert.ok(imageReady((await response.json()).card)); assert.deepEqual([imageCalls, reviewCalls], before);
    response = await POST(request({ ...base, cardType: "thumbnail", renderOnly: true, reuseProductionId: cover.productionId, style: "contrast" }));
    assert.equal(response.status, 200, JSON.stringify(await response.clone().json())); assert.equal(imageCalls, before[0]); assert.ok(reviewCalls > before[1], "Edits are reviewed again");
    response = await POST(request({ ...base, cardType: "illustration" })); assert.equal(response.status, 200); assert.ok(imageReady((await response.json()).card)); assert.equal(imageCalls, before[0], "Diagram middle card does not call image generation");
    delete process.env.ANTHROPIC_API_KEY;
    response = await POST(request({ ...base, cardType: "info", attemptId: "no-review" }));
    const held = (await response.json()).card; assert.equal(held.designReview.status, "unavailable"); assert.ok(!imageReady(held)); assert.ok(!held.releaseToken);
    process.env.ANTHROPIC_API_KEY = "fixture";
    response = await POST(request({ ...base, cardType: "info", attemptId: "no-review" })); assert.ok(imageReady((await response.json()).card));
    let repaired = 0, inspected = 0, preserved = 0;
    const c = { ...cover, releaseToken: undefined };
    const reviewed = await inspectAndRepair(c, async () => (++inspected === 1 ? { status: "revise", repair: "layout", issues: ["밀집"], summary: "배치 수정", model: "fixture" } : { status: "pass", repair: "none", issues: [], summary: "통과", model: "fixture" }), async () => { repaired++; return { ...c }; }, async () => { preserved++; });
    assert.equal(repaired, 1); assert.equal(inspected, 2); assert.equal(preserved, 2); assert.equal(reviewed.designReview.attempts, 2);
    await inspectAndRepair({ ...cover }, async () => ({ status: "revise", repair: "content", issues: ["조건 누락"], summary: "수정", model: "fixture" }), async () => { throw new Error("Content must never be auto-rewritten as a layout repair"); }, async () => {});
    reviewResult = { ...pass, design: 2, repair: "art", issues: ["대상이 원고와 다름"] };
    const artBefore = imageCalls, retained = [];
    const final = await generateQualityCard({ ...base, cardType: "thumbnail", attemptId: "bounded-art" }, new AbortController().signal, (v) => retained.push(v));
    assert.equal(imageCalls - artBefore, 2); assert.equal(retained.length, 2); assert.ok(!imageReady(final), "Still bad after bounded repair remains held"); assert.ok(lastImage.prompt.includes("대상이 원고와 다름"));
    reviewResult = pass; failImage = true;
    const uncertain = { ...base, cardType: "thumbnail", attemptId: "uncertain" };
    assert.equal((await POST(request(uncertain))).status, 502); const paid = imageCalls;
    assert.equal((await POST(request(uncertain))).status, 409); assert.equal(imageCalls, paid, "Ambiguous generation must not run again automatically");
    failImage = false; privateBucket = false;
    assert.equal((await POST(request({ ...base, cardType: "thumbnail", attemptId: "public-bucket" }))).status, 503); assert.equal(imageCalls, paid);
    console.log("PASS: adaptive middle diagram, semantic identity, recent history, High default, actual PNG/layout checks, private checkpoint/cache/reuse, signed release/tampering, review hold/resume, one layout repair, one art correction, timeout deduplication, private bucket guard.");
})().catch((e) => { console.error(e); process.exitCode = 1; });
