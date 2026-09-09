const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename }).outputText, filename);
const objects = new Map(); let publicBucket = false;
const profiles = [{ id: "A", lawyer_id: "lawyer-a", lawyer_name: "검수 변호사||변호사||미확인 경력", office_name: "검수 로펌", phone: "대표 번호 053-754-9797, 변호사 직통 010-0000-0000", fields: ["상속"], specialty: ["상속"], brand_lines: ["미확인 특장점"], profile_images: [], office_images: [] }];
const db = { from(table) {
    const filters = {}; let single = false;
    const query = { select() { return query; }, eq(key, value) { filters[key] = value; return query; }, order() { return query; }, limit() { return query; },
        single() { single = true; return query; }, maybeSingle() { single = true; return query; }, then(resolve) {
            const rows = (table === "blog_profiles" ? profiles : table === "portal_firms" ? [{ id: "firm-a", name: "검수 로펌" }] : table === "blog_posts" ? [] : []).filter((row) => Object.entries(filters).every(([k, v]) => row[k] === v));
            return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve);
        } }; return query;
    }, storage: { getBucket: async () => ({ data: { public: publicBucket }, error: null }), from(bucket) {
        assert.equal(bucket, "owner-briefings"); return {
            list: async (prefix) => ({ data: [...objects.keys()].filter((k) => k.startsWith(prefix + "/")).sort().reverse().slice(0, 1).map((k) => ({ name: k.split("/").at(-1) })), error: null }),
            download: async (key) => ({ data: objects.has(key) ? new Blob([objects.get(key)]) : null, error: objects.has(key) ? null : { statusCode: "404" } }),
            upload: async (key, content, options) => { assert.equal(options.upsert, false); if (objects.has(key)) return { error: { statusCode: "409" } }; objects.set(key, content); return { error: null }; },
        };
    } } };
const originalLoad = Module._load;
Module._load = function (name, ...args) {
    if (name === "@/lib/supabase/server") return { createServiceClient: () => db, createAdminClient: async () => db };
    if (name === "@/lib/admin-auth") return { verifyAdminToken: (r) => r.headers.get("x-fixture") === "yes" };
    return originalLoad.call(this, name, ...args);
};
process.env.ADMIN_TOKEN_SECRET = "fixture-signing-secret"; process.env.ANTHROPIC_API_KEY = "fixture"; delete process.env.OPENAI_API_KEY;
const model = require("../lib/blog-strengths.ts"), store = require("../lib/blog-strengths-store.ts");
const { validate } = require("../lib/ai/blog-polish.ts");
const { imageStrengthContext } = require("../lib/blog-images/strength-context.ts");
const { POST: WRITE } = require("../app/api/admin/claude-blog-write/route.ts");
const { POST: SELECT } = require("../app/api/admin/blog-strengths/select/route.ts");
const { POST: SAVE } = require("../app/api/admin/blog-strengths/route.ts");
const { POST: TOPICS } = require("../app/api/admin/blog-posts/topics/route.ts");
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const { reviewBlogEditorial } = require("../lib/blog-editorial-review.ts");
const req = (body, auth = true, origin = "http://localhost") => new Request("http://localhost/api/admin/test", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...(auth ? { "x-fixture": "yes" } : {}) }, body: JSON.stringify(body) });
let aiPrompt = "", aiOutput = "";
global.fetch = async (url, options) => { assert.equal(url, "https://api.anthropic.com/v1/messages"); aiPrompt = JSON.parse(options.body).system; return Response.json({ content: [{ type: "text", text: aiOutput }] }); };

(async () => {
    const today = new Date().toISOString().slice(0, 10), later = new Date(Date.now() + 86400000 * 90).toISOString().slice(0, 10);
    const claim = { id: "claim-a", scope: "lawyer", status: "approved", fact: "상속 자료 검토", articleText: "상속재산 목록과 증빙을 함께 확인합니다.", imageText: "상속재산 목록·증빙 확인", fields: ["상속"], conditions: [], sourceUrl: "https://example.com/profile", sourceQuote: "원문 근거: 내부 검수만", sourceRef: "private/source", checkedAt: today, reviewAfter: later };
    const pending = { ...claim, id: "pending", status: "pending", fact: "CONFIDENTIAL INTERNAL WEAKNESS", articleText: "CONFIDENTIAL", imageText: "CONFIDENTIAL" };
    const blocked = { ...pending, id: "blocked", status: "blocked" };
    const initial = { ...store.emptyLibrary("A"), firmId: "firm-a", designFamily: "ledger", claims: [claim, pending, blocked] };
    assert.throws(() => model.parseStrength({ ...claim, sourceUrl: "javascript:alert(1)" }), /근거/);
    assert.throws(() => model.parseStrength({ ...claim, fact: "전직 위원", conditions: [] }), /보존 조건/);
    assert.throws(() => model.parseStrength({ ...claim, conditions: ["전직"] }), /조건 누락/);
    assert.throws(() => model.parseStrength({ ...claim, imageText: "재판부를 아는 로펌" }), /영향력/);
    assert.equal((await SAVE(req(initial, false))).status, 401);
    assert.equal((await SAVE(req(initial, true, "https://evil.example"))).status, 403);
    publicBucket = true; await assert.rejects(store.saveStrengthLibrary(initial), /비공개/); publicBucket = false;
    const saved = await store.saveStrengthLibrary(initial); assert.equal(saved.revision, 1);
    await assert.rejects(store.saveStrengthLibrary(initial), /다른 창/);
    const library = await store.loadStrengthLibrary("A"); assert.equal(library.claims.length, 3);
    assert.equal(model.eligibleStrengths(library).length, 1);
    assert.equal(model.eligibleStrengths(library, "2099-01-01").length, 0);
    const selection = model.selectStrengths(library, "상속"); assert.equal(selection.claims.length, 1);
    assert.equal(model.selectStrengths(library, "형사").claims.length, 0);
    assert.equal(model.selectStrengths(library, "상속", [], []).claims.length, 0);
    assert.throws(() => model.selectStrengths(library, "상속", [], ["pending"]));
    assert.doesNotMatch(model.strengthDirective(selection), /CONFIDENTIAL|private\/source|원문 근거: 내부 검수만/);
    const body = `## 상속 자료\n\n${claim.articleText}\n\n${"재산 목록의 누락 여부를 살펴봅니다. ".repeat(20)}`;
    assert.equal(model.reviewStrengths(body, selection).issues.length, 0);
    assert.equal(model.reviewStrengths(`${body}\n\n${claim.articleText}`, selection).issues.length, 1);
    assert.equal(model.reviewStrengths(`${claim.articleText} ${claim.articleText}`, selection).issues.length, 1);
    const repeated = "확인한 자료를 사안별로 정리하고 전체 문맥과 날짜를 보존합니다. ".repeat(4);
    assert.ok(reviewBlogEditorial("자료 검토", repeated, [repeated, repeated]).some((s) => s.includes("동일한 긴 문단")));
    assert.ok(reviewBlogEditorial("제목", "제가 맡았던 사건입니다.").some((s) => s.includes("실제 수임")));
    assert.deepEqual(reviewBlogEditorial("제목", "가상의 예시입니다."), []);
    assert.match(validate(body, body.replace(claim.articleText, "다른 문구"), [claim.articleText]), /승인/);
    const token = store.signStrengthSelection(selection, "상속", body);
    assert.deepEqual(await store.verifyStrengthSelection(token, "A", "상속", body), selection);
    await assert.rejects(store.verifyStrengthSelection(token, "B", "상속", body), /변호사/);
    await assert.rejects(store.verifyStrengthSelection(token, "A", "상속", body + "x"), /원고/);
    await assert.rejects(store.verifyStrengthSelection(token + "x", "A", "상속", body));
    const context = await imageStrengthContext({ id: "A", career: ["위조 경력"], lawyerName: "다른 사람", phone: "010-1111-1111" }, "상속", body, token);
    assert.deepEqual(context.profile.career, [claim.imageText]); assert.equal(context.profile.lawyerName, "검수 변호사"); assert.equal(context.profile.phone, "053-754-9797");
    await assert.rejects(imageStrengthContext({ id: "A" }, "상속", body + "\n[번호](tel:01011111111)"), /대표번호/);
    assert.deepEqual((await imageStrengthContext({ id: "A" }, "상속", "강점 없는 원고")).selection.claims, []);
    await store.recordStrengthUse("A", "post-a", selection); await store.recordStrengthUse("A", "post-a", selection);
    aiOutput = `===TITLE===\n상속 원고\n===BODY===\n${body}`;
    const written = await WRITE(req({ profileId: "A", topic: "상속", field: "상속", content: "상속 상담", strengthIds: [claim.id], strengthRevision: 1 }));
    assert.equal(written.status, 200); const article = await written.json();
    assert.match(article.body, /tel:0537549797/); assert.equal(article.strengthReview.issues.length, 0);
    assert.doesNotMatch(aiPrompt, /CONFIDENTIAL|미확인 경력|미확인 특장점|내부 검수만/);
    assert.match(aiPrompt, /가상의 예시/); assert.ok(aiPrompt.includes(claim.articleText));
    assert.doesNotMatch(toNaverHtml(article.body), /sourceQuote|sourceRef|private\/source|CONFIDENTIAL|claim-a/);
    assert.equal((await SELECT(req({ profileId: "A", topic: "상속", ids: [claim.id], title: "상속", body: "문구 삭제" }))).status, 422);
    aiOutput = JSON.stringify({ topics: [{ topic: "음주운전", field: "형사" }] });
    assert.equal((await TOPICS(req({ profileId: "A" }))).status, 422);
    aiOutput = JSON.stringify({ topics: [{ topic: "재산 목록 확인", field: "상속" }] });
    assert.equal((await TOPICS(req({ profileId: "A" }))).status, 200);
    await store.saveStrengthLibrary({ ...library, claims: [{ ...claim, status: "blocked" }] });
    await assert.rejects(store.verifyStrengthSelection(token, "A", "상속", body), /철회/);
    assert.ok(objects.has("blog-strengths/A/v00000001.json")); assert.ok(objects.has("blog-strengths/A/v00000002.json"));
    console.log("PASS: private immutable versions, conflicts, approval/expiry/source/condition gates, topic filtering, selection exclusion, HMAC/profile/body binding, revocation, registered identity/contact, writer+polish preservation, private-data exclusion, audit idempotence");
})().catch((e) => { console.error(e); process.exitCode = 1; });
