// 클로드 구독 실행 경로(2026-09-29): 대기열 → 작업기 → 결과, 원고·부분 수정·주제 추천 라우트의 engine=subscription 처리.
// 저장소와 작업기는 가짜다. 외부 요청(Anthropic·Supabase)은 하지 않는다.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const objects = new Map();
const storage = {
    from() { return this; }, getBucket: async () => ({ data: { public: false } }),
    exists: async (file) => ({ data: objects.has(file), error: objects.has(file) ? null : { statusCode: "404" } }),
    download: async (file) => ({ data: objects.has(file) ? new Blob([objects.get(file)]) : null, error: objects.has(file) ? null : { statusCode: "404" } }),
    upload: async (file, body, options = {}) => { if (objects.has(file) && !options.upsert) return { error: { statusCode: "409" } }; objects.set(file, String(body)); return { error: null }; },
    remove: async (files) => ({ data: files.filter((f) => objects.delete(f)).map((name) => ({ name })), error: null }),
};
const profile = { id: "fixture-profile", lawyer_name: "테스트||변호사", office_name: "테스트 사무소", phone: "02-1234-5678", specialty: ["가사"], fields: ["가사"], dna_salt: "test", brand_color: "#123456" };
const query = { select() { return this; }, eq() { return this; }, order() { return this; }, limit: async () => ({ data: [] }), single: async () => ({ data: profile, error: null }) };
const db = { storage, from: () => ({ ...query }) };
const load = Module._load;
Module._load = function (name, ...args) {
    if (name === "@/lib/admin-auth") return { verifyAdminToken: () => true };
    if (name === "@/lib/supabase/server") return { createAdminClient: async () => db, createServiceClient: () => db };
    if (name === "@/lib/blog-images/production-store") return { ...load.call(this, name, ...args), recentVisualHistory: async () => [] };
    return load.call(this, name, ...args);
};
process.env.ANTHROPIC_API_KEY = "fixture-not-a-real-key";
delete process.env.BLOG_COVER_SOURCE;
let anthropicCalls = 0;
global.fetch = async (url) => { anthropicCalls++; throw new Error(`Unexpected network request: ${url}`); };

const relay = require("../lib/ai/subscription-relay.ts");
const engine = require("../lib/ai/claude-engine.ts");
const { usageFromProvider, summarizeUsage } = require("../lib/blog-usage.ts");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const beat = (ageMs = 0) => objects.set("claude-subscription/worker.json", JSON.stringify({ lastSeen: new Date(Date.now() - ageMs).toISOString(), host: "fixture", running: 0 }));
const manuscript = "===TITLE===\n협의이혼 숙려기간은 언제부터 셀까요\n===BODY===\n도입 문단입니다.\n\n## 판단 기준\n\n조건을 확인합니다.\n===FACTS===\n- 숙려기간 1개월(자녀 있으면 3개월)\n===COVER===\nheading: 기획 중";
const message = (text, stop = "end_turn") => ({ id: "msg_subscription_x", type: "message", role: "assistant", model: "claude-sonnet-5", content: [{ type: "text", text }], stop_reason: stop, usage: { input_tokens: 9000, output_tokens: 7000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } });

/** 실제 작업기(scripts/claude-subscription-worker.mjs)가 하는 저장소 동작을 흉내 낸다. */
function fakeWorker(handler, { claim = true, finish = true } = {}) {
    const seen = [];
    let stopped = false;
    (async () => {
        while (!stopped) {
            for (const key of [...objects.keys()].filter((k) => k.startsWith("claude-subscription/jobs/")).sort()) {
                if (!claim) continue;
                const body = objects.get(key); objects.delete(key);
                const runKey = key.replace("/jobs/", "/running/"); objects.set(runKey, body);
                const job = JSON.parse(body); seen.push(job);
                if (!finish) continue;
                const { status, payload } = handler(job);
                const text = JSON.stringify(payload);
                objects.set(`claude-subscription/results/${job.id}.json`, JSON.stringify({ status, text, jobId: job.id, elapsedMs: 1 }));
                if (job.operationId && !objects.has(`blog-paid-operations/${job.operationId}/response.json`)) objects.set(`blog-paid-operations/${job.operationId}/response.json`, JSON.stringify({ status, text, requestId: `subscription:${job.id}`, elapsedMs: 1 }));
                objects.delete(runKey);
            }
            await sleep(50);
        }
    })();
    return { seen, stop: () => { stopped = true; } };
}
const post = async (route, payload) => {
    const res = await route.POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }));
    return { status: res.status, data: await res.json() };
};

(async () => {
    // 1. 요청 변환
    const base = { model: "claude-sonnet-5", max_tokens: 20000, system: "S", messages: [{ role: "user", content: "U" }] };
    assert.deepEqual(relay.toRelayRequest({ ...base, thinking: { type: "adaptive" }, output_config: { effort: "medium" } }), { model: "claude-sonnet-5", system: "S", user: "U", effort: "medium", maxTokens: 20000 });
    assert.equal(relay.toRelayRequest({ ...base, thinking: { type: "disabled" } }).effort, "low", "thinking off → lowest effort");
    assert.equal(relay.toRelayRequest({ ...base, model: "claude-sonnet-5-5", thinking: { type: "between_tools" } }).effort, "low", "Sonnet 5.5 의 최소 사고(between_tools)도 최저 노력");
    const schema = { type: "object", properties: {} };
    const structured = relay.toRelayRequest({ ...base, messages: [{ role: "user", content: [{ type: "text", text: "A" }, { type: "text", text: "B" }] }], output_config: { effort: "high", format: { type: "json_schema", schema } } });
    assert.equal(structured.user, "A\n\nB"); assert.equal(structured.effort, "high"); assert.deepEqual(structured.jsonSchema, schema);
    assert.throws(() => relay.toRelayRequest({ ...base, messages: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }] }));

    // 2. 작업 ID: API 는 그대로, 구독은 분리
    const id = "a".repeat(64);
    assert.equal(engine.engineOperationId(id, "api"), id);
    assert.match(engine.engineOperationId(id, "subscription"), /^[a-f0-9]{64}$/); assert.notEqual(engine.engineOperationId(id, "subscription"), id);
    assert.equal(engine.parseClaudeEngine("subscription"), "subscription"); assert.equal(engine.parseClaudeEngine("x"), "api"); assert.equal(engine.parseClaudeEngine(undefined), "api");

    // 3. 작업기 생존 확인
    await assert.rejects(relay.assertSubscriptionReady(), (e) => e instanceof relay.SubscriptionUnavailableError && e.status === 503);
    beat(60_000);
    await assert.rejects(relay.assertSubscriptionReady(), /마지막 신호 60초 전/);
    beat(); await relay.assertSubscriptionReady();
    assert.equal((await relay.workerStatus()).online, true);

    // 4. 대기열 왕복
    let worker = fakeWorker(() => ({ status: 200, payload: message("OK") }));
    let res = await relay.subscriptionDispatch({ ...base }, { stage: "fixture", timeoutMs: 10_000 })();
    assert.equal(res.status, 200); assert.match(res.headers.get("request-id"), /^subscription:/);
    assert.equal((await res.json()).content[0].text, "OK");
    assert.equal([...objects.keys()].filter((k) => k.startsWith("claude-subscription/results/")).length, 0, "result is consumed");
    worker.stop();

    // 5. 아무도 가져가지 않으면 작업을 회수하고 확정 실패(504)
    res = await relay.subscriptionDispatch({ ...base }, { stage: "fixture", timeoutMs: 1_600 })();
    assert.equal(res.status, 504); assert.equal((await res.json()).error.type, "subscription_not_started");
    assert.equal([...objects.keys()].filter((k) => k.startsWith("claude-subscription/jobs/")).length, 0, "unclaimed job removed");
    // 가져가기 한도(전체 대기의 절반)가 지나면 대기 중에도 회수한다.
    const realNow = Date.now; let offset = 0; Date.now = () => realNow() + offset;
    const early = relay.subscriptionDispatch({ ...base }, { stage: "fixture", timeoutMs: 60_000 })();
    await sleep(200); offset = 31_000;
    res = await early; Date.now = realNow;
    assert.equal(res.status, 504);

    // 6. 가져갔는데 끝나지 않으면 결과 미확정(예외) — 늦은 결과는 보존 응답으로 복구한다.
    worker = fakeWorker(() => null, { finish: false });
    await assert.rejects(relay.subscriptionDispatch({ ...base }, { stage: "fixture", timeoutMs: 1_600 })(), /subscription_timeout/);
    worker.stop();
    for (const k of [...objects.keys()].filter((k) => k.startsWith("claude-subscription/running/"))) objects.delete(k);

    // 7. 원고 라우트
    const write = require("../app/api/admin/claude-blog-write/route.ts");
    const input = { content: "협의이혼 숙려기간", field: "가사", profileId: profile.id, topic: "협의이혼 숙려기간", engine: "subscription" };
    objects.delete("claude-subscription/worker.json");
    let r = await post(write, input);
    assert.equal(r.status, 503); assert.equal(r.data.code, "subscription_offline");
    assert.equal([...objects.keys()].filter((k) => k.startsWith("blog-paid-operations/")).length, 0, "offline worker must not lock a paid operation");
    beat();
    worker = fakeWorker(() => ({ status: 200, payload: message(manuscript) }));
    r = await post(write, input);
    assert.equal(r.status, 200, JSON.stringify(r.data)); worker.stop();
    const job = worker.seen[0];
    assert.equal(job.stage, "블로그 원고"); assert.equal(job.request.model, "claude-sonnet-5-5"); assert.equal(job.request.effort, "high"); assert.equal(job.request.maxTokens, 20000);
    assert.match(job.request.system, /정확해야 합니다/); assert.match(job.request.user, /협의이혼 숙려기간/);
    assert.equal(job.operationId, r.data.operationId);
    assert.equal(r.data.usage.engine, "subscription"); assert.equal(r.data.usage.estimatedUsd, 0); assert.equal(r.data.usage.reused, false); assert.equal(r.data.usage.input, 9000);
    assert.match(r.data.body, /조건을 확인합니다/); assert.match(r.data.body, /tel:/); assert.deepEqual(r.data.factChecklist, ["숙려기간 1개월(자녀 있으면 3개월)"]);
    const apiInput = { ...input, engine: undefined };
    const crypto = require("node:crypto");
    const apiId = crypto.createHash("sha256").update(JSON.stringify({ stage: "blog-manuscript-v16", input: { content: input.content, source: "", field: input.field, profileId: input.profileId, topic: input.topic, attempt: "", cover: true } })).digest("hex");
    assert.equal(r.data.operationId, engine.engineOperationId(apiId, "subscription"), "subscription ID is derived from the unchanged API ID");
    // 복구는 작업기 없이 보존 응답만 읽는다.
    objects.delete("claude-subscription/worker.json");
    r = await post(write, { ...input, recoverOnly: true });
    assert.equal(r.status, 200); assert.equal(r.data.usage.reused, true);
    // 한도 초과는 원인을 보여 준다.
    beat();
    worker = fakeWorker(() => ({ status: 429, payload: { type: "error", error: { type: "subscription_limit", message: "구독 사용 한도에 걸렸습니다 — 9. 29. 오후 03:00에 초기화" } } }));
    r = await post(write, { ...input, content: "다른 주제" });
    worker.stop();
    assert.equal(r.status, 429); assert.match(r.data.error, /클로드 구독 사용 한도/); assert.match(r.data.error, /오후 03:00에 초기화/);
    assert.equal(anthropicCalls, 0, "subscription path never calls the Anthropic API");
    void apiInput;

    // 8. 부분 수정
    const edit = require("../app/api/admin/claude-blog-edit/route.ts");
    const editInput = { title: "제목", body: "도입 문단입니다.\n\n## 판단 기준\n\n조건을 확인합니다.", instruction: "짧게", scope: { kind: "title" }, profileId: profile.id, engine: "subscription" };
    objects.delete("claude-subscription/worker.json");
    assert.equal((await post(edit, editInput)).status, 503);
    beat();
    worker = fakeWorker(() => ({ status: 200, payload: message("===TEXT===\n새 제목\n===END===") }));
    r = await post(edit, editInput); worker.stop();
    assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.title, "새 제목"); assert.equal(r.data.usage.engine, "subscription");

    // 9. 주제 추천
    const topics = require("../app/api/admin/blog-posts/topics/route.ts");
    objects.delete("claude-subscription/worker.json");
    r = await post(topics, { profileId: profile.id, count: 3, engine: "subscription" });
    assert.equal(r.status, 503); assert.equal(r.data.code, "subscription_offline");
    beat();
    const topicJson = JSON.stringify({ topics: [1, 2, 3].map((n) => ({ topic: `협의이혼 중 상대가 연락을 끊은 경우 ${n}`, field: "가사", angle: "기간 계산의 기준", titleIdea: `제목 ${n}`, reason: "수요" })) });
    worker = fakeWorker((j) => { assert.equal(j.request.effort, "low"); return { status: 200, payload: message(topicJson) }; });
    r = await post(topics, { profileId: profile.id, count: 3, engine: "subscription" }); worker.stop();
    assert.equal(r.status, 200); assert.equal(r.data.topics.length, 3); assert.equal(r.data.notice, "");
    worker = fakeWorker(() => ({ status: 429, payload: { type: "error", error: { type: "subscription_limit", message: "구독 사용 한도에 걸렸습니다" } } }));
    r = await post(topics, { profileId: profile.id, count: 3, engine: "subscription" }); worker.stop();
    assert.equal(r.status, 200); assert.match(r.data.notice, /클로드 구독 추천을 받지 못해.*구독 사용 한도/);

    // 10. 비용 요약: 구독은 0원, 유료 횟수에 넣지 않는다.
    const sub = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5", message("x"), { reused: false, engine: "subscription" });
    const api = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5", message("x"), { reused: false });
    assert.equal(sub.estimatedUsd, 0); assert.ok(api.estimatedUsd > 0); assert.equal(api.engine, undefined);
    const sum = summarizeUsage([sub, api]);
    assert.equal(sum.paidCount, 1); assert.equal(sum.subscriptionCount, 1); assert.equal(sum.estimatedUsd, api.estimatedUsd);
    console.log("PASS: relay round trip, unclaimed 504 + removal, claimed timeout, offline 503 without lock, subscription IDs, recover without worker, limit message, edit, topics, usage 0원");
})().catch((e) => { console.error(e); process.exitCode = 1; });
