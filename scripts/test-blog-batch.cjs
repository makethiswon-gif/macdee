// 블로그 원고 Message Batches 경로(2026-10-12): 맡기기 → 처리 중 → 끝난 결과 보존 → 재사용, 실패·만료·중복 방지.
// 2026-10-19: 한도 끊김 → 낮은 노력으로 1회 자동 재시도, 45분 넘게 멈춘 배치 취소 → 새 배치, 예전 취소 결과 다시 맡기기, 동시 확인 중복 방지.
// Supabase 저장소와 Anthropic API 는 메모리 가짜로 대신한다(실제 과금·운영 쓰기 없음).
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
process.env.ANTHROPIC_API_KEY = "fixture";

const files = new Map();
const storage = {
    upload: async (key, value, options) => { await null; if (files.has(key) && !options?.upsert) return { error: { statusCode: "409" } }; files.set(key, String(value)); return { error: null }; },
    exists: async (key) => files.has(key) ? { data: true, error: null } : { data: false, error: { originalError: { status: 400 } } },
    download: async (key) => files.has(key) ? { data: new Blob([files.get(key)]), error: null } : { data: null, error: { originalError: { status: 400 } } },
};
const db = { storage: { from: () => storage, getBucket: async () => ({ data: { public: false }, error: null }) } };
const load = Module._load;
Module._load = function (name, ...args) { return name === "@/lib/supabase/server" ? { createServiceClient: () => db } : load.call(this, name, ...args); };

// 시계: 정체(45분) 판정을 시험하려고 Date.now 만 앞으로 돌린다(맡긴 시각 기록은 실제 시각).
const realNow = Date.now; let skew = 0; Date.now = () => realNow() + skew;

// 가짜 Anthropic Batches API — 배치 여러 개, 취소, 결과 줄.
const batches = new Map(); let createStatus = 200, cancels = 0;
const created = () => batches.size;
global.fetch = async (url, init = {}) => {
    const u = String(url);
    await new Promise((r) => setTimeout(r, 2)); // 실제 네트워크처럼 다른 요청이 끼어들 틈을 둔다
    if (u.endsWith("/v1/messages/batches") && init.method === "POST") {
        const body = JSON.parse(init.body);
        assert.equal(body.requests.length, 1);
        assert.match(body.requests[0].custom_id, /^[a-f0-9]{64}$/);
        assert.ok(["xhigh", "high"].includes(body.requests[0].params.output_config.effort), "엑스트라하이, 끊긴 뒤 재시도만 high");
        if (createStatus !== 200) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad" } }), { status: createStatus });
        const id = `msgbatch_${batches.size + 1}`;
        batches.set(id, { id, status: "in_progress", cancelAt: null, customId: body.requests[0].custom_id, params: body.requests[0].params, line: null });
        return new Response(JSON.stringify({ id, processing_status: "in_progress" }), { status: 200 });
    }
    const m = u.match(/\/v1\/messages\/batches\/(msgbatch_\d+)(\/cancel|\/results)?$/);
    if (!m) throw new Error("예상하지 못한 fetch: " + u);
    const b = batches.get(m[1]);
    if (m[2] === "/cancel") { assert.equal(init.method, "POST"); cancels++; if (b.status === "in_progress") { b.status = "canceling"; b.cancelAt = new Date().toISOString(); } return new Response(JSON.stringify({ id: b.id, processing_status: b.status }), { status: 200 }); }
    if (m[2] === "/results") return new Response(JSON.stringify(b.line) + "\n", { status: 200 });
    return new Response(JSON.stringify({ id: b.id, processing_status: b.status, cancel_initiated_at: b.cancelAt, results_url: b.status === "ended" ? `https://api.anthropic.com/v1/messages/batches/${b.id}/results` : null }), { status: 200 });
};
const lastBatch = () => [...batches.values()].at(-1);
const end = (b, result) => { b.status = "ended"; b.line = { custom_id: b.customId, result }; };

const { paidBatchRequest, batchLineToStored, batchRetryReason, BATCH_PENDING, BATCH_STALL_MS, PaidOperationError } = require("../lib/blog-images/paid-operation.ts");
const { usageFromProvider } = require("../lib/blog-usage.ts");
const { readManuscriptResponse } = require("../lib/blog-manuscript-response.ts");
const { lowerEffort, BLOG_EFFORT } = require("../lib/ai/models.ts");
const params = { model: "claude-opus-5-5", max_tokens: 128000, thinking: { type: "adaptive" }, output_config: { effort: "xhigh" }, messages: [{ role: "user", content: "x" }] };
const id = "a".repeat(64), id2 = "b".repeat(64), id3 = "c".repeat(64);
const message = { id: "msg_1", type: "message", model: "claude-opus-5-5", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "원고" }], usage: { input_tokens: 1000, output_tokens: 20000 } };
// 라우트와 같은 다시 쓰기 규칙(app/api/admin/claude-blog-write/route.ts)
const retry = { cutRetryEffort: lowerEffort(BLOG_EFFORT), isCut: (m) => { const p = readManuscriptResponse(m); return p.truncated && !p.complete && !p.refusal; } };
const cut = { id: "msg_cut", type: "message", model: "claude-opus-5-5", role: "assistant", stop_reason: "max_tokens", content: [{ type: "thinking", thinking: "" }], usage: { input_tokens: 10500, output_tokens: 128000 } };
const cutClosedBody = { ...cut, content: [{ type: "text", text: "===TITLE===\n제목\n===BODY===\n본문\n===FACTS===\n- 사실" }] };
const done = { id: "msg_ok", type: "message", model: "claude-opus-5-5", role: "assistant", stop_reason: "end_turn", content: [{ type: "text", text: "===TITLE===\n제목\n===BODY===\n본문\n===FACTS===\n- 사실" }], usage: { input_tokens: 10500, output_tokens: 45000 } };
const req = (opId, recoverOnly = true) => paidBatchRequest(opId, "블로그 원고", "claude-opus-5-5", params, { recoverOnly, retry });
const isPending = (e) => e instanceof PaidOperationError && e.code === BATCH_PENDING && e.status === 202;
const hex = (c) => c.repeat(64);

(async () => {
    // 1) 복구만(recoverOnly)으로는 새로 맡기지 않는다.
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === "response_not_found");
    assert.equal(created(), 0);

    // 2) 처음 요청: 맡기고 바로 '처리 중'(202).
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params), isPending);
    assert.equal(created(), 1);
    assert.ok(files.has(`blog-paid-operations/${id}/batch.json`));

    // 3) 처리 중에는 다시 불러도(새 요청·복구 모두) 다시 맡기지 않는다.
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === BATCH_PENDING);
    await assert.rejects(paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === BATCH_PENDING);
    assert.equal(created(), 1, "중복 과금 없음");

    // 4) 끝나면 결과를 보존하고 처음 한 번만 비용을 센다.
    end(lastBatch(), { type: "succeeded", message });
    const first = await paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true });
    assert.equal(first.reused, false);
    assert.equal(first.data.content[0].text, "원고");
    assert.ok(first.requestId.startsWith("batch:"));
    const again = await paidBatchRequest(id, "블로그 원고", "claude-opus-5-5", params);
    assert.equal(again.reused, true);
    assert.equal(created(), 1);

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
    // 다시 맡길 이유: 취소·만료(과금 없음)와 본문이 열린 채 끊긴 응답만. 오류·본문이 닫힌 끊김·정상은 아니다.
    assert.equal(batchRetryReason(exp), "expired");
    assert.equal(batchRetryReason(batchLineToStored({ result: { type: "canceled" } }, "b1", new Date().toISOString())), "canceled");
    assert.equal(batchRetryReason(err), null);
    assert.equal(batchRetryReason(batchLineToStored({ result: { type: "succeeded", message: cut } }, "b1", new Date().toISOString()), retry), "cut");
    assert.equal(batchRetryReason(batchLineToStored({ result: { type: "succeeded", message: cutClosedBody } }, "b1", new Date().toISOString()), retry), null, "본문이 닫혔으면 원고를 살린다");
    assert.equal(batchRetryReason(batchLineToStored({ result: { type: "succeeded", message: cut } }, "b1", new Date().toISOString())), null, "규칙이 없으면 다시 쓰지 않는다");
    assert.equal(batchRetryReason({ status: 200, text: JSON.stringify(cut), requestId: "req_stream", elapsedMs: 0 }, retry), null, "Batch 가 아닌 응답은 대상 아님");

    // 7) 다시 쓰기 규칙 없이 맡긴 예전 작업이 만료로 끝나면, 복구 확인은 새로 맡기지 않고 원인을 알려 준다.
    await assert.rejects(paidBatchRequest(id2, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === BATCH_PENDING);
    end(lastBatch(), { type: "expired" });
    const before7 = created();
    await assert.rejects(paidBatchRequest(id2, "블로그 원고", "claude-opus-5-5", params, { recoverOnly: true }), (e) => e.code === "provider_rejected");
    assert.equal(created(), before7);

    // 8) 맡기기 자체가 거절되면(과금 없음) 원인을 보존해 보여 준다.
    createStatus = 400;
    await assert.rejects(paidBatchRequest(id3, "블로그 원고", "claude-opus-5-5", params), (e) => e.code === "provider_rejected");
    assert.ok(files.has(`blog-paid-operations/${id3}/response.json`));
    createStatus = 200;

    // 9) 끊김 → 한 단계 낮은 노력(high)으로 한 번 자동 재시도 → 완성. 앞선 시도 비용은 완성 순간 한 번만 센다.
    assert.equal(lowerEffort("xhigh"), "high"); assert.equal(lowerEffort("low"), null); assert.equal(lowerEffort("max"), "xhigh");
    const A = hex("d");
    await assert.rejects(req(A, false), isPending);
    const a1 = lastBatch();
    assert.equal(a1.customId, A); assert.equal(a1.params.max_tokens, 128000); assert.equal(a1.params.output_config.effort, "xhigh");
    assert.equal(JSON.parse(files.get(`blog-paid-operations/${A}/batch.json`)).auto, true, "안내 뒤에 맡긴 작업 표시");
    end(a1, { type: "succeeded", message: cut });
    await assert.rejects(req(A), (e) => isPending(e) && /끊겨/.test(e.message) && /high/.test(e.message));
    const a2 = lastBatch();
    assert.notEqual(a2, a1, "새 배치로 다시 맡김");
    assert.notEqual(a2.customId, A, "다음 시도는 자기 작업 ID");
    assert.equal(a2.params.output_config.effort, "high");
    assert.equal(a2.params.max_tokens, 128000);
    const next = JSON.parse(files.get(`blog-paid-operations/${A}/next.json`));
    assert.deepEqual([next.id, next.attempt, next.reason, next.effort], [a2.customId, 2, "cut", "high"]);
    let count = created();
    await assert.rejects(req(A), isPending); await assert.rejects(req(A, false), isPending);
    assert.equal(created(), count, "재시도 중 확인·같은 주제 재요청은 다시 맡기지 않는다");
    end(a2, { type: "succeeded", message: done });
    const fin = await req(A);
    assert.equal(fin.reused, false); assert.equal(fin.attempt, 2); assert.equal(fin.operationId, A, "화면은 처음 작업 ID 하나만 안다");
    assert.equal(fin.data.id, "msg_ok");
    assert.equal(fin.superseded.length, 1); assert.equal(fin.superseded[0].data.usage.output_tokens, 128000); assert.equal(fin.superseded[0].attempt, 1);
    const cutCost = usageFromProvider("manuscript", "블로그 원고(한도에서 끊김)", "claude-opus-5-5", fin.superseded[0].data, { reused: false, batch: true });
    assert.ok(Math.abs(cutCost.estimatedUsd - (10500 * 4 + 128000 * 20) / 1e6 * 0.5) < 1e-6, "끊긴 시도 비용 = 입력 1.05만·출력 12.8만 토큰 Batch 반값 ≈ $1.30");
    const fin2 = await req(A, false);
    assert.equal(fin2.reused, true); assert.deepEqual(fin2.superseded, [], "비용은 두 번 세지 않는다");
    assert.equal(created(), count, "완성 뒤에는 새로 맡기지 않는다");

    // 10) 재시도도 끊기면 더 다시 쓰지 않는다(한 번만). 미완성 응답은 라우트가 '끊김'으로 알린다.
    const B = hex("e");
    await assert.rejects(req(B, false), isPending);
    end(lastBatch(), { type: "succeeded", message: cut });
    await assert.rejects(req(B), isPending);
    end(lastBatch(), { type: "succeeded", message: cut });
    count = created();
    const bFin = await req(B);
    assert.equal(bFin.data.stop_reason, "max_tokens"); assert.equal(bFin.attempt, 2); assert.equal(bFin.superseded.length, 1);
    assert.equal(retry.isCut(bFin.data), true);
    await req(B, false); await req(B);
    assert.equal(created(), count, "끊김 재시도는 1회뿐");

    // 11) 45분 넘게 in_progress 면 취소(무료) → 취소 확인 → 같은 노력으로 새 배치. 취소된 시도는 비용에 넣지 않는다.
    const C = hex("f");
    await assert.rejects(req(C, false), isPending);
    const c1 = lastBatch();
    skew = BATCH_STALL_MS - 60_000;
    await assert.rejects(req(C), isPending);
    assert.equal(cancels, 0, "45분 전에는 기다린다");
    skew = BATCH_STALL_MS + 60_000;
    await assert.rejects(req(C), (e) => isPending(e) && /멈춘 작업을 취소/.test(e.message));
    assert.equal(cancels, 1); assert.equal(c1.status, "canceling");
    assert.ok(files.has(`blog-paid-operations/${C}/stall-cancel.json`));
    await assert.rejects(req(C), (e) => isPending(e) && /취소를 확인/.test(e.message));
    assert.equal(cancels, 1, "취소는 한 번만"); assert.equal(created(), count + 1, "취소가 끝나기 전에는 새로 맡기지 않는다(중복 과금 방지)");
    end(c1, { type: "canceled" });
    await assert.rejects(req(C), (e) => isPending(e) && /2번째 시도/.test(e.message));
    const c2 = lastBatch();
    assert.equal(created(), count + 2); assert.equal(c2.params.output_config.effort, "xhigh", "멈춤은 노력을 낮추지 않는다");
    end(c2, { type: "succeeded", message: done });
    const cFin = await req(C);
    assert.equal(cFin.attempt, 2); assert.deepEqual(cFin.superseded, [], "취소된 시도는 과금되지 않았다");
    skew = 0;

    // 12) 취소를 걸었는데 그사이 끝났으면(succeeded) 그 결과를 쓰고 새로 맡기지 않는다.
    const D = hex("0");
    await assert.rejects(req(D, false), isPending);
    const d1 = lastBatch(); skew = BATCH_STALL_MS + 60_000;
    await assert.rejects(req(D), isPending);
    end(d1, { type: "succeeded", message: done });
    count = created();
    const dFin = await req(D);
    assert.equal(dFin.attempt, 1); assert.equal(dFin.data.id, "msg_ok"); assert.equal(created(), count);
    skew = 0;

    // 13) 두 탭이 동시에 확인해도 다시 맡기는 배치는 하나다(next.json 잠금 + 시도별 claim).
    const E = hex("1");
    await assert.rejects(req(E, false), isPending);
    end(lastBatch(), { type: "succeeded", message: cut });
    count = created();
    const results = await Promise.allSettled([req(E), req(E), req(E, false)]);
    assert.ok(results.every((r) => r.status === "rejected" && isPending(r.reason)), "모두 처리 중");
    assert.equal(created(), count + 1, "동시 확인 3번에도 새 배치 1개");

    // 14) 취소·만료(과금 없음)는 두 번까지만 새로 맡긴다. 그 뒤에는 원인을 알려 주고 멈춘다.
    const F = hex("2");
    await assert.rejects(req(F, false), isPending);
    end(lastBatch(), { type: "expired" });
    await assert.rejects(req(F), isPending);
    end(lastBatch(), { type: "canceled" });
    await assert.rejects(req(F), (e) => isPending(e) && /3번째 시도/.test(e.message));
    end(lastBatch(), { type: "canceled" });
    count = created();
    await assert.rejects(req(F), (e) => e.code === "provider_rejected" && /취소/.test(e.message));
    await assert.rejects(req(F, false), (e) => e.code === "provider_rejected");
    assert.equal(created(), count, "한도 뒤에는 새로 맡기지 않는다");

    // 15) 예전 작업(다시 쓰기 안내 전)의 취소 결과: 복구 버튼은 새로 맡기지 않고, 같은 주제를 다시 '생성'하면 새 배치로 맡긴다(재사용 안 함).
    const G = hex("3");
    files.set(`blog-paid-operations/${G}/claim.json`, JSON.stringify({ id: G, mode: "batch" }));
    files.set(`blog-paid-operations/${G}/batch.json`, JSON.stringify({ batchId: "msgbatch_legacy", createdAt: new Date(realNow() - 3 * 3_600_000).toISOString() }));
    files.set(`blog-paid-operations/${G}/response.json`, JSON.stringify(batchLineToStored({ custom_id: G, result: { type: "canceled" } }, "msgbatch_legacy", new Date().toISOString())));
    count = created();
    await assert.rejects(req(G), (e) => e.code === "provider_rejected");
    assert.equal(created(), count, "복구(무료)는 새로 맡기지 않는다");
    await assert.rejects(req(G, false), isPending);
    assert.equal(created(), count + 1, "같은 요청을 다시 생성하면 취소된 결과를 재사용하지 않고 새로 맡긴다");
    end(lastBatch(), { type: "succeeded", message: done });
    assert.equal((await req(G)).data.id, "msg_ok");

    // 16) 예전 작업의 끊김 결과도 복구 확인으로는 다시 쓰지 않는다(새 과금은 사용자가 다시 생성할 때만).
    const H = hex("4");
    files.set(`blog-paid-operations/${H}/batch.json`, JSON.stringify({ batchId: "msgbatch_legacy2", createdAt: new Date().toISOString() }));
    files.set(`blog-paid-operations/${H}/response.json`, JSON.stringify(batchLineToStored({ custom_id: H, result: { type: "succeeded", message: cut } }, "msgbatch_legacy2", new Date().toISOString())));
    count = created();
    const hRecover = await req(H);
    assert.equal(hRecover.data.stop_reason, "max_tokens"); assert.equal(hRecover.reused, true); assert.equal(created(), count);

    // 17) 끊김 뒤 재시도가 오류로 끝나면, 오류에 앞선(과금된) 시도를 붙여 비용을 보여 줄 수 있게 한다.
    const I = hex("5");
    await assert.rejects(req(I, false), isPending);
    end(lastBatch(), { type: "succeeded", message: cut });
    await assert.rejects(req(I), isPending);
    end(lastBatch(), { type: "errored", error: { type: "error", error: { type: "invalid_request_error", message: "bad" } } });
    await assert.rejects(req(I), (e) => e.code === "provider_rejected" && e.superseded?.length === 1 && e.superseded[0].data.usage.output_tokens === 128000);
    await assert.rejects(req(I), (e) => e.code === "provider_rejected" && !e.superseded, "두 번째 확인에서는 비용을 다시 붙이지 않는다");

    // 18) 화면·라우트 연결(정적 확인)
    const route = fs.readFileSync("app/api/admin/claude-blog-write/route.ts", "utf8");
    assert.match(route, /asyncRequest === true && engine === "api"/);
    assert.match(route, /paidBatchRequest\(operationId/);
    assert.match(route, /const BATCH_MANUSCRIPT_MAX_TOKENS = 128_000;/);
    assert.match(route, /max_tokens: batch \? BATCH_MANUSCRIPT_MAX_TOKENS : 96000/);
    assert.match(route, /cutRetryEffort: lowerEffort\(BLOG_EFFORT\)/);
    assert.match(route, /recoverOnly: recoverOnly === true, retry \}/);
    assert.match(route, /retryUsage/);
    const page = fs.readFileSync("app/admin/blog-publish/page.tsx", "utf8");
    assert.match(page, /async: true, recoverOnly: first \? recover : true/);
    assert.match(page, /e\.code === "batch_pending"/);
    assert.match(page, /data\.retryUsage/);
    assert.match(page, /45분 넘게 멈추면 자동으로 새로 맡기고/);
    console.log("blog batch: ok");
})().catch((e) => { console.error(e); process.exit(1); });
