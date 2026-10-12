// 블로그 원고 Message Batches 경로(2026-10-12): 맡기기 → 처리 중 → 끝난 결과 보존 → 재사용, 실패·만료·중복 방지.
// Supabase 저장소와 Anthropic API 는 메모리 가짜로 대신한다(실제 과금·운영 쓰기 없음).
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
process.env.ANTHROPIC_API_KEY = "fixture";

const files = new Map();
const storage = {
    upload: async (key, value, options) => { if (files.has(key) && !options?.upsert) return { error: { statusCode: "409" } }; files.set(key, String(value)); return { error: null }; },
    exists: async (key) => files.has(key) ? { data: true, error: null } : { data: false, error: { originalError: { status: 400 } } },
    download: async (key) => files.has(key) ? { data: new Blob([files.get(key)]), error: null } : { data: null, error: { originalError: { status: 400 } } },
};
const db = { storage: { from: () => storage, getBucket: async () => ({ data: { public: false }, error: null }) } };
const load = Module._load;
Module._load = function (name, ...args) { return name === "@/lib/supabase/server" ? { createServiceClient: () => db } : load.call(this, name, ...args); };

// 가짜 Anthropic Batches API
let created = 0, status = "in_progress", resultLine = null, createStatus = 200;
global.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith("/v1/messages/batches") && init.method === "POST") {
        created++;
        const body = JSON.parse(init.body);
        assert.equal(body.requests.length, 1);
        assert.match(body.requests[0].custom_id, /^[a-f0-9]{64}$/);
        assert.equal(body.requests[0].params.output_config.effort, "xhigh", "엑스트라하이 유지");
        if (createStatus !== 200) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad" } }), { status: createStatus });
        return new Response(JSON.stringify({ id: "msgbatch_fixture", processing_status: "in_progress" }), { status: 200 });
    }
    if (u.endsWith("/v1/messages/batches/msgbatch_fixture")) return new Response(JSON.stringify({ id: "msgbatch_fixture", processing_status: status, results_url: status === "ended" ? "https://api.anthropic.com/v1/messages/batches/msgbatch_fixture/results" : null }), { status: 200 });
    if (u.endsWith("/results")) return new Response(JSON.stringify(resultLine) + "\n", { status: 200 });
    throw new Error("예상하지 못한 fetch: " + u);
};

const { paidBatchRequest, batchLineToStored, BATCH_PENDING, PaidOperationError } = require("../lib/blog-images/paid-operation.ts");
const { usageFromProvider } = require("../lib/blog-usage.ts");
const params = { model: "claude-opus-5-5", max_tokens: 96000, thinking: { type: "adaptive" }, output_config: { effort: "xhigh" }, messages: [{ role: "user", content: "x" }] };
const id = "a".repeat(64), id2 = "b".repeat(64), id3 = "c".repeat(64);
const message = { id: "msg_1", type: "message", model: "claude-opus-5-5", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "원고" }], usage: { input_tokens: 1000, output_tokens: 20000 } };

(async () => {
    // 1) 복구만(recoverOnly)으로는 새로 맡기지 않는다.
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === "response_not_found");
    assert.equal(created, 0);

    // 2) 처음 요청: 맡기고 바로 '처리 중'(202).
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params), (e) => e instanceof PaidOperationError && e.code === BATCH_PENDING && e.status === 202);
    assert.equal(created, 1);
    assert.ok(files.has(`blog-paid-operations/${id}/batch.json`));

    // 3) 처리 중에는 다시 불러도(새 요청·복구 모두) 다시 맡기지 않는다.
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === BATCH_PENDING);
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === BATCH_PENDING);
    assert.equal(created, 1, "중복 과금 없음");

    // 4) 끝나면 결과를 보존하고 처음 한 번만 비용을 센다.
    status = "ended"; resultLine = { custom_id: id, result: { type: "succeeded", message } };
    const first = await paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true });
    assert.equal(first.reused, false);
    assert.equal(first.data.content[0].text, "원고");
    assert.ok(first.requestId.startsWith("batch:"));
    const again = await paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params);
    assert.equal(again.reused, true);
    assert.equal(created, 1);

    // 5) 비용 기록: Batch 는 반값.
    const full = usageFromProvider("manuscript", "블로그 원고", "claude-opus-5-5", message, { reused: false });
    const half = usageFromProvider("manuscript", "블로그 원고", "claude-opus-5-5", message, { reused: false, batch: true });
    assert.ok(full.estimatedUsd > 0);
    assert.equal(Math.round(half.estimatedUsd * 1e6), Math.round(full.estimatedUsd * 0.5 * 1e6));
    assert.match(half.note, /Batch/);

    // 6) 결과 줄 변환: 실패·만료는 오류 응답으로 보존(자동 재과금 없음).
    const err = batchLineToStored({ custom_id: id, result: { type: "errored", error: { type: "error", error: { type: "invalid_request_error", message: "bad" } } } }, "b1", new Date().toISOString());
    assert.equal(err.status, 400);
    const exp = batchLineToStored({ custom_id: id, result: { type: "expired" } }, "b1", new Date().toISOString());
    assert.equal(exp.status, 502);
    assert.match(JSON.parse(exp.text).error.message, /만료/);

    // 7) 맡겨 둔 작업이 만료로 끝나면 원인을 알려 준다.
    status = "in_progress"; created = 0;
    await assert.rejects(paidBatchRequest(id2, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === BATCH_PENDING);
    status = "ended"; resultLine = { custom_id: id2, result: { type: "expired" } };
    await assert.rejects(paidBatchRequest(id2, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === "provider_rejected");

    // 8) 맡기기 자체가 거절되면(과금 없음) 원인을 보존해 보여 준다.
    createStatus = 400;
    await assert.rejects(paidBatchRequest(id3, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === "provider_rejected");
    assert.ok(files.has(`blog-paid-operations/${id3}/response.json`));

    // 9) 화면·라우트 연결(정적 확인)
    const route = fs.readFileSync("app/api/admin/claude-blog-write/route.ts", "utf8");
    assert.match(route, /asyncRequest === true && engine === "api"/);
    assert.match(route, /paidBatchRequest\(operationId/);
    const page = fs.readFileSync("app/admin/blog-publish/page.tsx", "utf8");
    assert.match(page, /async: true, recoverOnly: first \? recover : true/);
    assert.match(page, /e\.code === "batch_pending"/);
    console.log("blog batch: ok");
})().catch((e) => { console.error(e); process.exit(1); });
