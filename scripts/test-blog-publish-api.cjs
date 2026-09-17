// Real route handlers, in-memory storage/database, no network or production credentials.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), crypto = require("node:crypto"), ts = require("typescript"), { load } = require("cheerio");
const root = path.resolve(__dirname, "..");
process.env.ADMIN_ID = "publish-fixture";
process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
let row = { card_images: [], status: "draft", profile_id: "fixture-profile", title: "Title", body: "Body", updated_at: "2026-09-10T00:00:00Z" }, uploads = [], conflict = false;
const checkpoints = new Map();
const client = {
    from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: row, error: row ? null : { message: "not found" } }) }) }),
        update: (patch) => {
            const query = { eq: () => query, select: async () => {
                if (conflict) return { data: [], error: null };
                Object.assign(row, patch); return { data: [{ id: "fixture-post" }], error: null };
            } }; return query;
        },
    }),
    storage: { from: () => ({
        list: async (folder) => ({ data: [...checkpoints.keys()].filter(k=>k.startsWith(folder+'/')).map(k=>({name:k.slice(folder.length+1)})).sort((a,b)=>b.name.localeCompare(a.name)).slice(0,1), error:null }),
        download: async (filename) => ({ data: checkpoints.has(filename) ? new Blob([JSON.stringify(checkpoints.get(filename))]) : null, error: null }),
        upload: async (filename, bytes) => { uploads.push({ filename, bytes }); return { error: null }; },
        getPublicUrl: (filename) => ({ data: { publicUrl: "https://storage.example/" + filename } }),
    }) },
};
const moduleLoad = Module._load;
const proofLibrary = { profileId: "fixture-profile", firmId: "firm", lawyerId: "fixture-profile", revision: 1, claims: [] };
Module._load = function (name, ...args) {
    if (name === "@/lib/supabase/server") return { createAdminClient: async () => client, createServiceClient: () => client };
    if (name === "@/lib/blog-strengths-store") return { ...moduleLoad.call(this, name, ...args), loadStrengthLibrary: async () => proofLibrary };
    return moduleLoad.call(this, name, ...args);
};
global.fetch = async () => { throw new Error("Network forbidden in local API fixtures"); };
const { POST } = require("../app/api/admin/blog-posts/images/route.ts");
const { BLOG_CARD_TYPES: types } = require("../lib/blog-images/card-types.ts");
const { sameDraft, hasCompleteCardSet } = require("../lib/blog-publish-workflow.ts");
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const { signImageRelease } = require("../lib/blog-images/production-store.ts");
const { sourceHash } = require("../lib/blog-images/visual-planner.ts");
const payload = "publish-fixture:local-test";
const cookie = Buffer.from(payload + ":" + crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")).toString("base64url");
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=";
const req = (body, auth = true) => new Request("http://localhost/api/admin/blog-posts/images", { method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { cookie: "admin_token=" + cookie } : {}) }, body: JSON.stringify(body) });
const approvedImage = (type, dataUrl = png, setId = "fixture-set") => ({ type, dataUrl, setId, releaseToken: signImageRelease({ type, setId, imageDataUrl: dataUrl, layoutChecks: { passed: true } }, "fixture-profile", sourceHash("Title", "Body")) });
const image = (type, extra = {}) => ({ postId: "fixture-post", image: approvedImage(type), index: types.indexOf(type), total: 3, requiredTypes: types, ...extra });

(async () => {
    assert.throws(() => signImageRelease({ type: "info", setId: "fixture-set", imageDataUrl: png, layoutChecks: { passed: false } }, "fixture-profile", sourceHash("Title", "Body")), /레이아웃/);
    assert.equal((await POST(req(image("thumbnail"), false))).status, 401);
    assert.equal((await POST(req(image("thumbnail", { requiredTypes: ["thumbnail"] })))).status, 400);
    assert.equal((await POST(req(image("thumbnail", { image: { type: "../bad", dataUrl: png } })))).status, 400);
    for (const type of types.slice(0, 3)) {
        const response = await POST(req(image(type))); assert.equal(response.status, 200);
        assert.equal((await response.json()).done, false); assert.equal(row.status, "draft");
    }
    assert.equal(row.card_images.length, 3);
    const last = await POST(req(image("contact"))); assert.equal((await last.json()).done, true);
    assert.equal(row.status, "ready"); assert.equal(row.card_images.length, 4);
    const productionId = "a".repeat(64), approved = approvedImage("thumbnail");
    checkpoints.set(`blog-image-production/${productionId}.json`, { id: productionId, profileId: "fixture-profile", sourceHash: sourceHash("Title", "Body"),
        card: { ...approved, imageDataUrl: png } });
    const byId = { ...approved, productionId }; delete byId.dataUrl;
    assert.equal((await POST(req(image("thumbnail", { image: byId })))).status, 200, "Server-owned PNG is attached by ID without base64 request");
    assert.equal((await POST(req(image("thumbnail", { image: { ...byId, releaseToken: "wrong" } })))).status, 422);
    conflict = true;
    const beforeConflict = JSON.stringify(row);
    assert.equal((await POST(req(image("thumbnail", { image: byId })))).status, 409);
    assert.equal(JSON.stringify(row), beforeConflict, "A newer draft/card set cannot be overwritten");
    conflict = false;
    assert.equal((await POST(req(image("thumbnail", { image: byId })))).status, 200, "Upload retry reuses saved PNG without generation");
    const before = row.card_images.find((i) => i.type === "contact").url;
    assert.equal((await POST(req(image("contact", { image: { type: "contact", dataUrl: png, releaseToken: "tampered" } })))).status, 422);
    assert.equal(row.card_images.length, 4);
    // Distinct bytes get distinct URLs; retries of identical bytes remain idempotent.
    const different = "data:image/png;base64," + Buffer.from("different fixture pixels").toString("base64");
    await POST(req(image("contact", { image: approvedImage("contact", different) })));
    assert.notEqual(row.card_images.find((i) => i.type === "contact").url, before);
    const changedSet = await POST(req(image("contact", { image: approvedImage("contact", png, "new-set") })));
    assert.equal((await changedSet.json()).done, false, "Different design sets cannot complete each other"); assert.equal(row.status, "draft");
    row.body = "Body changed";
    assert.equal((await POST(req(image("thumbnail")))).status, 422, "Changed manuscript invalidates old release");
    const count = uploads.length; row = null;
    assert.equal((await POST(req(image("thumbnail")))).status, 404); assert.equal(uploads.length, count);
    row = { card_images: [], status: "draft" };
    const legacy = await POST(req({ postId: "fixture-post", image: { type: "thumbnail", dataUrl: png }, index: 0, total: 1 }));
    assert.equal((await legacy.json()).done, true);
    assert.equal(hasCompleteCardSet(types.map((type) => ({ type }))), true);
    assert.equal(hasCompleteCardSet(Array.from({ length: 4 }, () => ({ type: "thumbnail" }))), false);

    const draft = { profileId: "A", title: "Title", body: "Body", field: null, topic: "Topic" };
    assert.equal(sameDraft({ ...draft }, draft), true);
    for (const key of Object.keys(draft)) assert.equal(sameDraft({ ...draft, [key]: "changed" }, draft), false);
    assert.equal(sameDraft(null, draft), false);
    const body = "## Intro\n\nFirst paragraph.\n\n**Important** and ==highlight==.\n\n## Next\n\nFinal paragraph.";
    const images = types.map((type) => ({ type, url: `https://storage.example/${type}.png?a=1&b=2`,
        altText: 'quoted " alt <text>', afterText: type === "illustration" ? "First paragraph." : "Final paragraph." }));
    const html = toNaverHtml(body, "Title", images), $ = load(html);
    assert.equal($("img").length, 4); assert.equal($("img").first().attr("src"), images[0].url);
    assert.equal($("img").first().attr("alt"), images[0].altText);
    assert.equal($("img").last().attr("src"), images[3].url);
    assert.ok(html.indexOf("First paragraph.") < html.indexOf("illustration.png"));
    assert.ok(html.indexOf("illustration.png") < html.indexOf("Important"));
    assert.equal($("strong").text(), "Important");
    assert.equal(load(toNaverHtml(body, "Title"))("img").length, 0);
    assert.equal(load(toNaverHtml(body, "Title", [{ type: "thumbnail", url: "javascript:alert(1)" }]))("img").length, 0);
    assert.equal(load(toNaverHtml("", "Title", images))("img").length, 4);
    const { PROFILE_CARD_TYPES, PROFILE_SET_FORMAT } = require("../lib/blog-images/card-types.ts");
    row = { card_images: [{ type: "illustration", url: "old", setId: "legacy" }], status: "draft", profile_id: "fixture-profile", title: "Title", body: "Body" };
    assert.equal((await POST(req(image("thumbnail", { requiredTypes: PROFILE_CARD_TYPES })))).status, 422, "Cannot truncate an old four-card signed set");
    for (let i = 0; i < PROFILE_CARD_TYPES.length; i++) {
        const type = PROFILE_CARD_TYPES[i], setId = "three-set";
        const releaseToken = signImageRelease({ type, setId, setFormat: PROFILE_SET_FORMAT, imageDataUrl: png, layoutChecks: { passed: true } }, "fixture-profile", sourceHash("Title", "Body"));
        const response = await POST(req({ postId: "fixture-post", image: { type, setId, dataUrl: png, releaseToken }, index: i, total: 3, requiredTypes: PROFILE_CARD_TYPES }));
        assert.equal(response.status, 200); assert.equal((await response.json()).done, i === 2);
    }
    assert.equal(row.card_images.length, 3); assert.equal(row.status, "ready");
    const threeHtml = load(toNaverHtml(body, "Title", images.filter((i) => PROFILE_CARD_TYPES.includes(i.type))));
    assert.equal(threeHtml("img").length, 3);
    const { EDITORIAL_SET_FORMAT } = require("../lib/blog-images/card-types.ts");
    const { selectImageProof, signImageProof } = require("../lib/blog-images/proof-selection.ts");
    const proof = selectImageProof(proofLibrary, "", sourceHash("Title", "Body"), true);
    const studioId = "c".repeat(64), libraryFile = 'lawyer-studio/fixture-profile/library/v00000001.json';
    const studioLibrary = {profileId:'fixture-profile',revision:1,references:[],blogEnabled:true,assets:[{id:studioId,version:2,status:'approved',renderedPath:`lawyer-studio/fixture-profile/renders/${studioId}.jpg`}]};
    checkpoints.set(libraryFile, studioLibrary);
    row.card_images = []; let lastEditorial, studioPayload;
    for (const [i, type] of PROFILE_CARD_TYPES.entries()) {
        const productionId = crypto.createHash("sha256").update(`editorial-${type}`).digest("hex");
        const card = { type, setId: "editorial-set", setFormat: EDITORIAL_SET_FORMAT, imageDataUrl: png, layoutChecks: { passed: true }, proofSelection: proof, proofToken: signImageProof(proof) };
        if(type==='info') { card.studioPhotos=[{assetId:studioId,version:2}]; card.photoChecks={source:'studio'}; }
        card.releaseToken = signImageRelease(card, proof.profileId, proof.sourceHash);
        checkpoints.set(`blog-image-production/${productionId}.json`, { id: productionId, profileId: proof.profileId, sourceHash: proof.sourceHash, card });
        const payload = { postId: "fixture-post", setFormat: EDITORIAL_SET_FORMAT, requiredTypes: PROFILE_CARD_TYPES, index: i, total: 3,
            image: { type, productionId, setId: card.setId, releaseToken: card.releaseToken } };
        assert.equal((await POST(req({ ...payload, setFormat: undefined }))).status, 422);
        const result = await POST(req(payload)); assert.equal(result.status, 200, JSON.stringify(await result.clone().json()));
        assert.equal((await result.json()).done, i === 2); lastEditorial = payload;
        if(type==='info')studioPayload=payload;
    }
    const beforeStudioRevocation=uploads.length;
    studioLibrary.assets[0].status='draft';
    assert.equal((await POST(req(studioPayload))).status,409,'Single-photo upload rechecks current approval');
    assert.equal(uploads.length,beforeStudioRevocation);
    assert.equal((await POST(req(lastEditorial))).status,409,'Contact upload cannot complete a set using a previously uploaded revoked portrait');
    assert.equal(uploads.length,beforeStudioRevocation,'Retained info approval is checked before any new PNG upload');
    studioLibrary.assets[0].status='approved';studioLibrary.assets[0].version=3;
    assert.equal((await POST(req(studioPayload))).status,409,'Single-photo upload rechecks finishing version');
    studioLibrary.assets[0].version=2;studioLibrary.blogEnabled=false;
    assert.equal((await POST(req(studioPayload))).status,409,'Disconnected library blocks cached studio uploads');
    studioLibrary.blogEnabled=true;
    const studioCheckpoint = checkpoints.get(`blog-image-production/${studioPayload.image.productionId}.json`);
    const studioCard = structuredClone(studioCheckpoint.card);
    delete studioCheckpoint.card.studioPhotos; studioCheckpoint.card.photoChecks = { source: 'portrait' };
    const beforeRegistered = uploads.length, previousRow = JSON.stringify(row);
    const registeredInfo = await POST(req(studioPayload));
    assert.equal(registeredInfo.status,422,'Even a previously signed registered info image must not upload');
    assert.match((await registeredInfo.json()).error,/승인된 스튜디오 사진/);
    assert.equal(uploads.length,beforeRegistered); assert.equal(JSON.stringify(row),previousRow);
    studioCheckpoint.card = studioCard;
    delete row.card_images.find(i=>i.type==='info').productionId;
    const oldMerge = await POST(req(lastEditorial));
    assert.equal(oldMerge.status,200); assert.equal((await oldMerge.json()).done,false,'Old provenance-free second image cannot complete a new set');
    assert.equal(row.card_images.some(i=>i.type==='info'),false);
    assert.equal((await POST(req(studioPayload))).status,200); assert.equal(row.status,'ready');
    const uploadsBefore = uploads.length; proofLibrary.revision++;
    assert.equal((await POST(req(lastEditorial))).status, 409, "Cached PNG cannot bypass revoked proof revision");
    assert.equal(uploads.length, uploadsBefore, "Revocation must be checked before storage upload");
    console.log("PASS: authenticated upload, signed three/four-card manifests, partial status, source/version isolation, legacy compatibility and Naver HTML placement");
})().catch((e) => { console.error(e); process.exitCode = 1; });
