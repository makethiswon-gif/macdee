// Real manuscript route + paid-operation cache; no credentials or external requests.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict"), crypto = require("node:crypto"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const objects = new Map();
let allowAdmin = true, calls = 0, lastRequest;
const profile = { id: "fixture-profile", lawyer_name: "테스트||변호사", office_name: "테스트 사무소", phone: "02-1234-5678", specialty: [], dna_salt: "test", brand_color: "#123456" };
const storage = {
    from() { return this; }, getBucket: async () => ({ data: { public: false } }),
    exists: async (file) => ({ data: objects.has(file), error: objects.has(file) ? null : { statusCode: "404" } }),
    download: async (file) => ({ data: objects.has(file) ? new Blob([objects.get(file)]) : null, error: null }),
    upload: async (file, body) => { if (objects.has(file)) return { error: { statusCode: "409" } }; objects.set(file, String(body)); return { error: null }; },
};
const db = { storage, from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; }, limit: async () => ({ data: [] }), single: async () => ({ data: profile }) }) };
const load = Module._load;
Module._load = function (name, ...args) {
    if (name === "@/lib/admin-auth") return { verifyAdminToken: () => allowAdmin };
    if (name === "@/lib/supabase/server") return { createAdminClient: async () => db, createServiceClient: () => db };
    if (name === "@/lib/blog-images/production-store") return { ...load.call(this, name, ...args), recentVisualHistory: async () => [] };
    return load.call(this, name, ...args);
};
process.env.ANTHROPIC_API_KEY = "fixture-not-a-real-key";
delete process.env.BLOG_COVER_SOURCE;
const { readManuscriptResponse } = require("../lib/blog-manuscript-response.ts");
const text = "===TITLE===\n검토할 질문\n===BODY===\n도입 문단입니다.\n\n## 판단 기준\n\n조건을 확인합니다.\n===FACTS===\n- 검수할 사실 하나\n===COVER===\nheading: 기획 중";
const message = (raw = text, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "thinking", thinking: "not public" }, { type: "text", text: raw }], usage: { input_tokens: 10025, output_tokens: 20000, output_tokens_details: { thinking_tokens: 16067 } } });
let provider = message(text, "max_tokens");
global.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.anthropic.com/v1/messages", "Unexpected network request");
    calls++; lastRequest = JSON.parse(options.body);
    return Response.json(provider, { headers: { "request-id": "fixture-request" } });
};
const { POST } = require("../app/api/admin/claude-blog-write/route.ts");
const request = (payload) => new Request("http://localhost/api/admin/claude-blog-write", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
const input = { content: "Fixture topic", field: "가사", profileId: profile.id, topic: "Fixture topic" };
async function call(payload) { const res = await POST(request(payload)); return { status: res.status, data: await res.json() }; }

(async () => {
    let result = readManuscriptResponse(message());
    assert.equal(result.complete, true); assert.deepEqual(result.facts, ["검수할 사실 하나"]); assert.ok(!result.body.includes("COVER"));
    const split = message(); split.content = [{ type: "text", text: text.slice(0, 23) }, { type: "thinking" }, { type: "text", text: text.slice(23) }];
    assert.deepEqual(readManuscriptResponse(split), result, "All text blocks must be retained");
    result = readManuscriptResponse(message(text, "max_tokens"));
    assert.equal(result.complete, true); assert.match(result.warning, /표지 기획/); assert.deepEqual(result.facts, ["검수할 사실 하나"]);
    const bodyCut = text.split("===FACTS===")[0];
    assert.equal(readManuscriptResponse(message(bodyCut, "max_tokens")).complete, false);
    const factsCut = text.split("===COVER===")[0] + "- 잘린 사실";
    result = readManuscriptResponse(message(factsCut, "max_tokens"));
    assert.equal(result.complete, true); assert.deepEqual(result.facts, []); assert.match(result.warning, /직접 검수/);
    assert.equal(readManuscriptResponse(message(text.replaceAll("\n", "\r\n"), "max_tokens")).complete, true);
    for (const stop of ["refusal", "pause_turn", "tool_use", undefined]) assert.equal(readManuscriptResponse({ ...message(), stop_reason: stop }).complete, false);
    for (const raw of ["", "제목만", "===TITLE===\n제목\n===BODY===\n===FACTS===", "===BODY===\n본문\n===TITLE===\n제목\n===FACTS===", bodyCut + "인용한 ===FACTS=== 문자열"]) {
        assert.equal(readManuscriptResponse(message(raw, "max_tokens")).complete, false);
    }
    assert.equal(readManuscriptResponse(message("제목만")).complete, false);

    allowAdmin = false; assert.equal((await call(input)).status, 401); assert.equal(calls, 0); allowAdmin = true;
    assert.equal((await call({ ...input, recoverOnly: "yes" })).status, 400);
    result = await call({ ...input, recoverOnly: true });
    assert.equal(result.status, 409); assert.equal(result.data.code, "response_not_found"); assert.equal(calls, 0); assert.equal(objects.size, 0);

    result = await call(input);
    assert.equal(result.status, 200); assert.equal(calls, 1);
    assert.equal(lastRequest.output_config.effort, "medium"); assert.equal(lastRequest.max_tokens, 20000);
    assert.match(lastRequest.system, /정확해야 합니다/); assert.match(lastRequest.system, /===COVER===/);
    assert.equal(result.data.coverBrief, null); assert.ok(result.data.editorialWarnings.some(w => /원고는 복구/.test(w)));
    assert.match(result.data.body, /조건을 확인합니다/); assert.ok(!result.data.body.includes("기획 중"));
    assert.match(result.data.body, /tel:/); assert.equal(result.data.usage.reused, false);
    const id = result.data.operationId;
    assert.equal(id, crypto.createHash("sha256").update(JSON.stringify({ stage: "blog-manuscript-v16", input: { content: input.content, source: "", field: input.field, profileId: input.profileId, topic: input.topic, attempt: "", cover: true } })).digest("hex"), "Existing cache IDs must not change");
    result = await call({ ...input, recoverOnly: true });
    assert.equal(result.status, 200); assert.equal(result.data.usage.reused, true); assert.equal(calls, 1);

    const second = { ...input, content: "Different body fixture" }; provider = message(bodyCut, "max_tokens");
    result = await call(second);
    assert.equal(result.status, 422); assert.equal(result.data.code, "incomplete_response"); assert.equal(result.data.body, undefined);
    assert.equal(result.data.usage.output, 20000); assert.equal(calls, 2);
    assert.equal((await call({ ...second, recoverOnly: true })).status, 422); assert.equal(calls, 2, "Recover must never dispatch again");
    assert.equal((await call({ ...second, attemptId: "new-attempt" })).status, 400); assert.equal(calls, 2);
    provider = message();
    assert.equal((await call({ ...second, attemptId: "new-attempt", confirmPaid: true })).status, 200); assert.equal(calls, 3);

    const { publishJson, PublishRequestError } = require("../lib/blog-publish-workflow.ts");
    const failure = { error: "Incomplete", code: "incomplete_response", operationId: id, usage: result.data.usage };
    global.fetch = async () => Response.json(failure, { status: 422 });
    await assert.rejects(publishJson("fixture", new AbortController().signal, {}), e => e instanceof PublishRequestError && e.code === failure.code && e.operationId === id && e.usage.output === 20000);
    console.log("PASS: closed-body recovery, open-body rejection, refusal, split blocks, free cache-only retry, explicit paid retry, error usage, medium budget, original paid IDs");
})().catch(e => { console.error(e); process.exitCode = 1; });
