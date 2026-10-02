// 2·3번 카드(신뢰·상담) 재사용 검사 — 실제 라우트(generate-design, blog-posts/images), 메모리 저장소, 렌더 횟수 계수.
// 모델 호출·네트워크·운영 자격 정보 없음. 표지 원본 생성과 카드 렌더는 결정적 가짜로 바꾼다.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto"), Module = require("node:module");
const ts = require("typescript"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
process.env.ADMIN_ID = "shared-fixture"; process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: f }).outputText, f);

// ── 메모리 저장소(버킷별) + blog_posts 테이블 ──────────────────────────────────
const buckets = new Map(), bucket = (name) => { if (!buckets.has(name)) buckets.set(name, new Map()); return buckets.get(name); };
const uploads = [];
const storageFor = (name) => ({
    exists: async (key) => ({ data: bucket(name).has(key), error: bucket(name).has(key) ? null : { statusCode: "404" } }),
    download: async (key) => bucket(name).has(key) ? { data: new Blob([bucket(name).get(key)]), error: null } : { data: null, error: { message: "not found" } },
    upload: async (key, data, options) => {
        if (bucket(name).has(key) && !options?.upsert) return { error: { statusCode: "409", message: "The resource already exists" } };
        uploads.push({ bucket: name, key, size: typeof data === "string" ? data.length : data.length }); bucket(name).set(key, data); return { error: null };
    },
    getPublicUrl: (key) => ({ data: { publicUrl: `https://storage.example/${name}/${key}` } }),
    createSignedUrl: async (key) => ({ data: { signedUrl: `https://storage.example/signed/${name}/${key}` }, error: null }),
    list: async () => ({ data: [], error: null }),
    remove: async (keys) => { for (const k of keys) bucket(name).delete(k); return { data: [], error: null }; },
});
const rows = new Map();
const table = () => ({
    select: () => { const q = { eq: (_k, id) => ({ single: async () => rows.has(id) ? { data: rows.get(id), error: null } : { data: null, error: { message: "not found" } } }) }; return q; },
    update: (patch) => { let id; const q = { eq: (k, v) => { if (k === "id") id = v; return q; }, select: async () => { Object.assign(rows.get(id), patch); return { data: [{ id }], error: null }; } }; return q; },
});
const client = { from: table, storage: { from: storageFor, getBucket: async (name) => ({ data: { public: name === "blog-cards" }, error: null }) } };

// ── 가짜 외부 경계: 변호사 정보, 스튜디오 사진, 표지 원본, 카드 렌더 ─────────────
const PROFILE_ID = "fixture-profile";
const fullProfile = { id: PROFILE_ID, lawyerName: "김검수", officeName: "가상 법률사무소", jobTitle: "변호사", phone: "02-1234-5678", website: "https://example.com", brandColor: "#123456",
    dnaSalt: "", profileImages: ["https://example.com/p.png"], officeImages: [], logoImage: "", career: [], specialty: ["이혼", "형사"] };
const library = { profileId: PROFILE_ID, firmId: "", lawyerId: PROFILE_ID, revision: 0, updatedAt: "", designFamily: "auto", claims: [] };
let profileOverride = {}, approved = new Set(["a1", "a2"]), infoChoice = "a1";
const counts = { render: {}, prepare: 0, art: 0 };
let StudioError, StudioPhotoRequiredError, realRenderer = null, rendererMock = null;
const studio = {
    editorialStudioSelection: async (_id, _edition, role = "info") => {
        const assetId = role === "info" ? infoChoice : "a2";
        if (!approved.has(assetId)) { if (role === "info") throw new StudioPhotoRequiredError(0); return undefined; }
        return { asset: { renderedPath: `lawyer-studio/${PROFILE_ID}/renders/${assetId}.png` }, selections: [{ assetId, version: 1 }] };
    },
    editorialStudioPhoto: async (id, edition, role = "info") => { const s = await studio.editorialStudioSelection(id, edition, role); return s && { bytes: Buffer.from("studio"), kind: "studio", selections: s.selections }; },
    resolveEditorialStudioPhoto: async (_id, selections) => { if (!selections?.length || !approved.has(selections[0].assetId)) throw new StudioError("승인이 바뀌었습니다.", 409); return {}; },
    resolveStudioPhotos: async () => [], renderStudioBlogCard: async () => { throw new Error("unused"); }, checkStudioBlogReady: async () => {}, selectStudioPhotos: () => [],
};
const pngFor = async (seed) => { const n = parseInt(crypto.createHash("sha256").update(seed).digest("hex").slice(0, 6), 16);
    return sharp({ create: { width: 8, height: 8, channels: 3, background: { r: n & 255, g: (n >> 8) & 255, b: (n >> 16) & 255 } } }).png().toBuffer(); };
const fakeRender = async (opts) => {
    const type = opts.card.type; counts.render[type] = (counts.render[type] || 0) + 1;
    const copy = type === "contact" ? realRenderer.editorialContactCopy(opts.plan, opts.card) : null;
    const seed = JSON.stringify({ type, copy, photo: opts.editorialPhoto?.selections, phone: opts.profile.phone, art: type === "thumbnail" ? crypto.createHash("sha256").update(opts.art || "").digest("hex") : "" });
    const bytes = await pngFor(seed);
    return { type, name: type, imageDataUrl: `data:image/png;base64,${bytes.toString("base64")}`, width: 2000, height: 2000, altText: `${type} alt`, placement: "본문", warnings: [],
        designVersion: "editorial-v11", layoutRevision: 24, setFormat: "editorial-three-v1", publicationEdition: opts.plan.publicationEdition, layoutRecipe: opts.plan.layoutRecipe,
        proofSelection: opts.plan.proofSelection, proofToken: opts.plan.proofToken, purpose: opts.card.purpose, sourceParagraphId: opts.card.afterParagraphId,
        layoutChecks: { passed: true, issues: [], textBlocks: 1 },
        ...(opts.editorialPhoto ? { studioPhotos: opts.editorialPhoto.selections, aiGenerated: true, photoChecks: { source: "studio", width: 1280, height: 1600, areaRatio: 0.8, upscale: 1.25 } } : {}),
        ...(type === "contact" ? { contactActions: [{ label: "전화 상담 문의", display: opts.profile.phone, href: "tel:0212345678" }] } : {}) };
};
const photoGen = { BLOG_PHOTO_MODEL: "fixture-image-model", verifyPhotoModel: async () => {}, editorialPhotoPrompt: () => "",
    generateEditorialPhoto: async (brief) => { counts.art++; return Buffer.from("art:" + brief.subject); }, normalizeEditorialArt: async (b) => b };
const originalLoad = Module._load;
Module._load = function (name, parent, ...rest) {
    let file = ""; try { file = Module._resolveFilename(name, parent).split(path.sep).join("/"); } catch { /* 외부 패키지 */ }
    if (file.endsWith("lib/supabase/server.ts")) return { createServiceClient: () => client, createAdminClient: async () => client, createClient: async () => client };
    if (file.endsWith("lib/blog-images/strength-context.ts")) return { imageStrengthContext: async () => ({ profile: { ...fullProfile, ...profileOverride }, selection: { profileId: PROFILE_ID, firmId: "", revision: 0, designFamily: "auto", claims: [], reason: "" }, library, token: "fixture" }) };
    if (file.endsWith("lib/blog-strengths-store.ts")) return { ...originalLoad.call(this, name, parent, ...rest), loadStrengthLibrary: async () => library };
    if (file.endsWith("lib/lawyer-studio/blog.ts")) return studio;
    if (file.endsWith("lib/blog-images/photo-generator.ts")) return photoGen;
    if (file.endsWith("lib/blog-images/three-card-renderer.ts")) {
        if (!rendererMock) { realRenderer = originalLoad.call(this, name, parent, ...rest);
            rendererMock = { ...realRenderer, prepareEditorialThree: async () => { counts.prepare++; return []; }, renderEditorialThree: fakeRender }; }
        return rendererMock;
    }
    return originalLoad.call(this, name, parent, ...rest);
};
({ StudioError, StudioPhotoRequiredError } = require("../lib/lawyer-studio/types.ts"));
global.fetch = async () => { throw new Error("Network forbidden in shared-card fixtures"); };

const { POST: GENERATE } = require("../app/api/admin/blog-images/generate-design/route.ts");
const { POST: UPLOAD } = require("../app/api/admin/blog-posts/images/route.ts");
const { planEditorialThreeFromBrief } = require("../lib/blog-images/three-card-plan.ts");
const { selectImageProof } = require("../lib/blog-images/proof-selection.ts");
const { sourceHash } = require("../lib/blog-images/visual-planner.ts");
const { verifyImageRelease, readImageRelease } = require("../lib/blog-images/production-store.ts");
const { sharedCardFingerprint, sharedPublicPath, findSharedCard } = require("../lib/blog-images/shared-cards.ts");
const { imageReady, imageSetReady } = require("../lib/blog-images/quality-policy.ts");
const { cardRequestProfile } = require("../lib/blog-images/card-types.ts");
const payload = "shared-fixture:local-test", cookie = Buffer.from(payload + ":" + crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")).toString("base64url");
const call = async (handler, body) => { const r = await handler(new Request("http://localhost/api/admin/x", { method: "POST", headers: { "Content-Type": "application/json", cookie: "admin_token=" + cookie }, body: JSON.stringify(body) }));
    return { status: r.status, data: await r.json() }; };
const TYPES = ["thumbnail", "info", "contact"];

function makePost(id, title, keyword) {
    const content = `${keyword} 사건에서 가장 먼저 확인할 것은 기한입니다. 사실관계에 따라 결론이 달라질 수 있습니다.\n\n## 판단 기준\n\n법원은 사정을 종합해 판단합니다.\n\n---\n**기준일** 2026년 9월 28일 작성\n[전화 상담](tel:0212345678)`;
    const brief = { heading: `${keyword}의\n갈림길`, kicker: keyword, emphasis: "", subject: `${keyword} 서류가 놓인 식탁`, scene: "아침 식탁 위 서류와 커피잔, 왼쪽 창에서 들어오는 부드러운 빛, 아래쪽은 어두운 나무 바닥으로 남겨 제목 자리를 만든다. 중원거리.",
        message: "조건이 결론을 가른다", avoid: ["법봉"], alternateScene: "", question: `${keyword}에서 무엇이 결론을 가르나`, thesis: "기한과 사정에 따라 달라진다.", layoutRecipe: "photo-open", family: "story" };
    const hash = sourceHash(title, content);
    const plan = planEditorialThreeFromBrief(title, content, fullProfile, selectImageProof(library, `${title} ${content}`, hash, true), brief, []);
    rows.set(id, { card_images: [], status: "draft", profile_id: PROFILE_ID, title, body: content, updated_at: "2026-09-28T00:00:00Z" });
    return { id, title, content, plan, hash };
}
const generate = (post, type, extra = {}) => call(GENERATE, { profile: cardRequestProfile({ ...fullProfile, ...profileOverride }, type), title: post.title, content: post.content, cardType: type, plan: post.plan,
    quality: "high", postId: post.id, transport: "asset", ...extra });
const upload = (post, card, extra = {}) => call(UPLOAD, { postId: post.id, image: { type: card.type, productionId: card.productionId, releaseToken: card.releaseToken, setId: card.setId },
    index: TYPES.indexOf(card.type), total: 3, requiredTypes: TYPES, setFormat: "editorial-three-v1", ...extra });

(async () => {
    // ── 지문: 원고가 달라도 같은 카드는 같은 지문, 그리는 입력이 바뀌면 다른 지문 ──
    const A = makePost("11111111-aaaa-4aaa-8aaa-111111111111", "이혼 소송, 무엇이 결론을 가르나", "이혼");
    const B = makePost("22222222-bbbb-4bbb-8bbb-222222222222", "협의이혼 숙려기간은 줄일 수 있나", "이혼");
    const C = makePost("33333333-cccc-4ccc-8ccc-333333333333", "형사 합의금은 어떻게 정하나", "형사");
    const fp = (post, type, extra = {}) => sharedCardFingerprint({ type, profile: { ...fullProfile, ...extra.profile }, plan: post.plan, card: post.plan.cards.find((c) => c.type === type),
        style: extra.style, selection: [{ assetId: type === "info" ? "a1" : "a2", version: 1 }] });
    assert.notEqual(A.hash, B.hash);
    assert.equal(fp(A, "info"), fp(B, "info"), "info: different manuscripts, same card");
    assert.equal(fp(A, "info"), fp(C, "info"));
    assert.equal(fp(A, "contact"), fp(B, "contact"), "contact: same keyword → same card");
    assert.notEqual(fp(A, "contact"), fp(C, "contact"), "contact: new keyword → new card");
    // 상담 카드 제목 단어는 원고 제목·질문의 첫 핵심어다: '재산분할'이 들어가면 '이혼'보다 앞서 잡힌다(운영에서 변호사당 2~5종이 나온 이유)
    const E = makePost("55555555-eeee-4eee-8eee-555555555555", "이혼 재산분할, 무엇이 기준인가", "이혼");
    assert.notEqual(fp(E, "contact"), fp(A, "contact"));
    assert.equal(require("../lib/blog-images/three-card-renderer.ts").editorialContactCopy(E.plan, E.plan.cards.find((c) => c.type === "contact")).heading, "재산분할\n상담문의");
    assert.notEqual(fp(A, "contact"), fp(A, "contact", { profile: { phone: "02-9999-0000" } }), "phone change → new card");
    assert.notEqual(fp(A, "info"), fp(A, "info", { style: "contrast" }), "style → new card");
    assert.equal(fp(A, "info"), fp(A, "info", { profile: { career: ["경력"] } }), "career is not drawn on the 3-card set");

    // ── 글 A: 2·3번을 처음 만들고 재사용 기록을 남긴다 ──
    let r = await generate(A, "info");
    assert.equal(r.status, 200, JSON.stringify(r.data)); const aInfo = r.data.card;
    assert.equal(counts.render.info, 1); assert.deepEqual(aInfo.sharedAsset, { fingerprint: fp(A, "info"), reused: false });
    assert.ok(aInfo.imageUrl.startsWith("https://storage.example/blog-cards/shared/fixture-profile/info-"), aInfo.imageUrl);
    assert.equal(aInfo.imageDataUrl, ""); assert.ok(imageReady({ ...aInfo, imageDataUrl: "x" }));
    r = await generate(A, "contact"); assert.equal(r.status, 200); const aContact = r.data.card;
    assert.equal(counts.render.contact, 1); assert.equal(aContact.sharedAsset.reused, false);
    assert.equal(aContact.contactActions[0].href, "tel:0212345678");
    // 두 카드가 기록에 있으니 표지 전 시험 렌더를 건너뛴다
    r = await generate(A, "thumbnail"); assert.equal(r.status, 200, JSON.stringify(r.data)); const aThumb = r.data.card;
    assert.equal(counts.prepare, 0, "trust/contact dry-run skipped when both shared cards exist"); assert.equal(counts.art, 1);
    assert.equal(aThumb.sharedAsset, undefined, "the cover is never shared");
    assert.ok(imageSetReady([aThumb, aInfo, aContact].map((c) => ({ ...c, imageDataUrl: "x" }))), "one set: same setId across fresh and shared cards");
    const beforeUploads = uploads.filter((u) => u.bucket === "blog-cards").length;
    for (const card of [aThumb, aInfo, aContact]) { r = await upload(A, card); assert.equal(r.status, 200, JSON.stringify(r.data)); }
    assert.equal(r.data.done, true); assert.equal(rows.get(A.id).status, "ready");
    const postUploads = uploads.filter((u) => u.bucket === "blog-cards").slice(beforeUploads);
    assert.deepEqual(postUploads.map((u) => u.key.split("/")[1].replace(/-[0-9a-f]+\.png$/, "")), ["01-thumbnail"], "only the cover is copied into the post folder");
    const aImages = rows.get(A.id).card_images;
    assert.equal(aImages.find((i) => i.type === "info").url, aInfo.imageUrl); assert.equal(aImages.find((i) => i.type === "info").shared, true);

    // ── 글 B(같은 단어 '이혼'): 2·3번은 다시 그리지 않는다 ──
    const rendersBefore = { ...counts.render };
    r = await generate(B, "info"); assert.equal(r.status, 200); const bInfo = r.data.card;
    r = await generate(B, "contact"); assert.equal(r.status, 200); const bContact = r.data.card;
    assert.deepEqual(counts.render, rendersBefore, "no re-render for the second article");
    assert.equal(bInfo.sharedAsset.reused, true); assert.equal(bContact.sharedAsset.reused, true);
    assert.equal(bInfo.imageUrl, aInfo.imageUrl); assert.equal(bContact.imageUrl, aContact.imageUrl);
    assert.notEqual(bInfo.releaseToken, aInfo.releaseToken, "a fresh signature for this article");
    const release = readImageRelease(bInfo.releaseToken);
    assert.equal(release.sourceHash, B.hash); assert.equal(release.setId, bInfo.setId);
    assert.ok(!verifyImageRelease(bInfo.releaseToken, { profileId: PROFILE_ID, sourceHash: A.hash, type: "info", pngHash: release.pngHash, setId: aInfo.setId, setFormat: "editorial-three-v1" }));
    // B 의 서명을 A 원고에 넣으면 거절
    r = await upload(A, bInfo); assert.equal(r.status, 422);
    r = await generate(B, "thumbnail"); assert.equal(r.status, 200); const bThumb = r.data.card; assert.equal(counts.prepare, 0);
    for (const card of [bThumb, bInfo, bContact]) { r = await upload(B, card); assert.equal(r.status, 200, JSON.stringify(r.data)); }
    assert.equal(r.data.done, true);
    const bImages = rows.get(B.id).card_images;
    assert.equal(bImages.find((i) => i.type === "contact").url, aImages.find((i) => i.type === "contact").url, "both articles point at the same PNG");
    // 비자산 전송: 저장된 바이트를 해시 검증 후 돌려준다
    r = await generate(B, "info", { transport: undefined }); assert.equal(r.status, 200);
    assert.ok(r.data.card.imageDataUrl.startsWith("data:image/png;base64,")); assert.equal(r.data.card.imageUrl, undefined);

    // ── 글 C(새 단어 '형사'): 상담 카드만 한 번 새로 그린다 ──
    r = await generate(C, "info"); assert.equal(r.data.card.sharedAsset.reused, true);
    r = await generate(C, "thumbnail"); assert.equal(r.status, 200); assert.equal(counts.prepare, 1, "new contact keyword → dry-run before the paid cover");
    r = await generate(C, "contact"); assert.equal(r.data.card.sharedAsset.reused, false); assert.equal(counts.render.contact, 2);
    assert.notEqual(r.data.card.imageUrl, aContact.imageUrl);

    // ── '새 작업'(사용자가 다시 그리기 선택)은 재사용하지 않는다 ──
    const infoRenders = counts.render.info;
    r = await generate(B, "info", { attemptId: "user-retry-1", confirmPaid: true }); assert.equal(r.status, 200);
    assert.equal(counts.render.info, infoRenders + 1);

    // ── 공개 파일이 지워졌으면 다시 그린다 ──
    bucket("blog-cards").delete(sharedPublicPath(PROFILE_ID, "info", readImageRelease(aInfo.releaseToken).pngHash));
    assert.equal(await findSharedCard(PROFILE_ID, fp(A, "info"), "info"), null);
    r = await generate(B, "info"); assert.equal(r.data.card.sharedAsset.reused, false); assert.equal(counts.render.info, infoRenders + 2);

    // ── 승인 사진이 바뀌면(새 사진 선택) 새 카드, 승인이 철회되면 저장 거절 ──
    approved.add("a3"); infoChoice = "a3";
    r = await generate(B, "info"); assert.equal(r.data.card.sharedAsset.reused, false); assert.notEqual(r.data.card.imageUrl, bInfo.imageUrl);
    infoChoice = "a1"; approved.delete("a1");
    const D = makePost("44444444-dddd-4ddd-8ddd-444444444444", "이혼 소송 기간은 얼마나 걸리나", "이혼");
    r = await upload(D, { ...bInfo }); assert.notEqual(r.status, 200, "revoked studio photo cannot be saved into a new article");
    approved.add("a1");

    // ── 전화번호가 바뀌면 상담 카드만 새로 ──
    profileOverride = { phone: "02-9999-0000" };
    const contactRenders = counts.render.contact;
    r = await generate(B, "contact"); assert.equal(r.data.card.sharedAsset.reused, false); assert.equal(counts.render.contact, contactRenders + 1);
    r = await generate(B, "info"); assert.equal(r.data.card.sharedAsset.reused, false, "registered profile changes re-render once (conservative fingerprint)");
    profileOverride = {};
    console.log("PASS: shared trust/contact cards — fingerprint stability & sensitivity, first render + reuse across articles, per-article signatures, no copy into post folders, cover dry-run skip, new keyword/phone/photo re-render, user retry bypass, deleted file recovery, revoked photo rejection, non-asset transport");
})().catch((e) => { console.error(e); process.exitCode = 1; });
