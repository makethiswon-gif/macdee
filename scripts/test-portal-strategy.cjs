/* Isolated backend contract tests: no environment loading, network, AI, or real DB writes. */
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), Module = require("node:module"), crypto = require("node:crypto");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);
process.env.ADMIN_ID = "strategy-fixture";
process.env.ADMIN_TOKEN_SECRET = "strategy-fixture-secret-never-production";
process.env.CRON_SECRET = "strategy-cron-fixture";
process.env.ANTHROPIC_API_KEY = "fixture-not-real";
let activeDb, serviceCalls = 0;
const serverPath = require.resolve("../lib/supabase/server.ts");
require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true, exports: { createServiceClient() { serviceCalls++; if (!activeDb) throw new Error("No test database"); return activeDb; } } };
global.fetch = async () => { throw new Error("Unexpected network access in isolated test"); };
const pure = require("../lib/portal-strategy.ts");
const service = require("../lib/portal-strategy-service.ts");
const admin = require("../app/api/admin/client-strategy/route.ts");
const cron = require("../app/api/cron/client-consulting/route.ts");
const FIRM = "11111111-1111-4111-8111-111111111111", OTHER = "22222222-2222-4222-8222-222222222222";
const id = () => crypto.randomUUID();
const at = "2026-08-10T02:00:00.000Z";
const base = (firm = FIRM) => ({ id: id(), firm_id: firm, created_at: at });
const structured = { 요약: "상속 상담 증가 가능성을 점검할 자료", 분야: "상속", 사건유형: "상속 분쟁", 유입경로: "블로그", 키워드: ["상속"], 마케팅_시사점: ["쟁점 설명을 강화"], 콘텐츠_소재: ["상속 준비 서류"] };
function goodReport(evidenceId) {
    return { summary: "등록 자료에서 상속 관련 관심을 확인했습니다.", signals: evidenceId ? [{ title: "상속 관련 질문", detail: "등록 자료를 근거로 질문을 정리합니다.", evidenceIds: [evidenceId] }] : [], priorities: [], topics: evidenceId ? [{ title: "상속 상담 전 준비할 자료", keyword: "상속 상담 준비", intent: "준비물 확인", angle: "반복된 질문을 정리한 체크리스트를 제안합니다.", channel: "블로그", priority: "높음", evidenceIds: [evidenceId] }] : [], requestSummary: [], gaps: [], nextMonthFocus: "실제 상담 질문을 바탕으로 콘텐츠를 검토합니다." };
}

class Query {
    constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.orders = []; this.columns = "*"; this.mode = "read"; this.start = 0; this.end = Infinity; }
    select(columns, options) { this.columns = columns; this.count = options?.count; return this; }
    eq(key, value) { this.filters.push(row => row[key] === value); return this; }
    gte(key, value) { this.filters.push(row => row[key] >= value); return this; }
    lt(key, value) { this.filters.push(row => row[key] < value); return this; }
    or(value) { this.db.ors.push(value); const start = value.slice("created_at.gte.".length).split(",status.neq.")[0]; this.filters.push(row => row.created_at >= start || row.status !== "완료"); return this; }
    order(key, options) { this.orders.push([key, options?.ascending !== false]); return this; }
    range(start, end) { this.start = start; this.end = end; return this; }
    abortSignal(signal) { this.signal = signal; return this; }
    maybeSingle() { this.singleRow = true; return this; }
    single() { this.singleRow = true; return this; }
    update(value) { this.mode = "update"; this.value = value; return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }
    run() {
        if (this.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        this.db.calls.push({ table: this.table, mode: this.mode, start: this.start, columns: this.columns });
        if (this.db.errors[this.table]) return { error: this.db.errors[this.table], data: null, count: null };
        let rows = this.db.tables[this.table].filter(row => this.filters.every(filter => filter(row)));
        const count = this.db.nullCount ? null : rows.length;
        if (this.mode === "update") {
            if (this.db.fenceLost) rows = [];
            for (const row of rows) Object.assign(row, this.value);
        }
        rows.sort((left, right) => { for (const [key, asc] of this.orders) { if (left[key] !== right[key]) return (left[key] > right[key] ? 1 : -1) * (asc ? 1 : -1); } return 0; });
        rows = rows.slice(this.start, this.end === Infinity ? Infinity : this.end + 1);
        const copy = rows.map(row => this.columns === "*" ? { ...row } : Object.fromEntries(this.columns.split(",").map(key => [key, row[key]])));
        return { data: this.singleRow ? copy[0] || null : copy, count, error: null };
    }
}
function database() {
    const db = {
        calls: [], ors: [], errors: {}, tables: { portal_firms: [{ id: FIRM, name: "검증 로펌" }, { id: OTHER, name: "다른 로펌" }], portal_records: [], portal_requests: [], portal_worklogs: [], portal_messages: [], portal_strategy_reports: [] },
        from(table) { return new Query(this, table); },
        rpc(name, args) {
            assert.equal(name, "claim_portal_strategy_report");
            let signal;
            return { abortSignal(value) { signal = value; return this; }, then(resolve, reject) { return Promise.resolve().then(() => {
                if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
                if (db.rpcError) return { data: null, error: db.rpcError };
                let row = db.tables.portal_strategy_reports.find(row => row.firm_id === args.p_firm_id && row.report_month === args.p_report_month);
                if (row && !(row.status === "failed" || row.status === "generating" && Date.parse(row.lease_expires_at) <= Date.now())) return { data: [{ report_id: row.id, acquired: false }], error: null };
                if (!row) { row = { id: id(), firm_id: args.p_firm_id, report_month: args.p_report_month, source_counts: { ...pure.EMPTY_SOURCE_COUNTS }, model: null, created_at: new Date().toISOString() }; db.tables.portal_strategy_reports.push(row); }
                Object.assign(row, { status: "generating", claim_token: args.p_claim_token, lease_expires_at: new Date(Date.now() + 180000).toISOString(), updated_at: new Date().toISOString(), report: null, error_message: null, generated_at: null });
                return { data: [{ report_id: row.id, acquired: true }], error: null };
            }).then(resolve, reject); } };
        },
    };
    return db;
}

let aiCalls = 0;
const generate = async pack => { aiCalls++; return { report: goodReport(pack.evidence[0]?.id), model: "fixture-model" }; };
const cookiePayload = `${process.env.ADMIN_ID}:fixture`;
const signature = crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(cookiePayload).digest("hex");
const cookie = `admin_token=${Buffer.from(`${cookiePayload}:${signature}`).toString("base64url")}`;
function request(method, body, { authenticated = true, origin = "https://www.makethis1.com", url = "https://www.makethis1.com/api/admin/client-strategy" } = {}) {
    return new Request(url, { method, headers: { ...(authenticated ? { cookie } : {}), ...(origin ? { origin } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

async function main() {
    assert.equal(pure.getPreviousKstMonth(new Date("2026-08-31T14:59:59Z")), "2026-07");
    assert.equal(pure.getPreviousKstMonth(new Date("2026-08-31T15:00:00Z")), "2026-08");
    assert.equal(pure.getPreviousKstMonth(new Date("2026-01-01T00:00:00Z")), "2025-12");
    assert.deepEqual(pure.getKstMonthRange("2024-02"), { reportMonth: "2024-02-01", startDate: "2024-02-01", endDate: "2024-03-01", startUtc: "2024-01-31T15:00:00.000Z", endUtc: "2024-02-29T15:00:00.000Z" });
    for (const bad of ["2026-13", "2026-00", "26-08", "2026-8", null, "2026-08-01"]) assert.equal(pure.isReportMonth(bad), false);
    assert.equal(pure.isCompleteStrategyMonth("2026-09", new Date("2026-09-07Z")), false);
    assert.equal(pure.isStrategySameOrigin(request("POST", {}, { origin: null })), false);
    assert.equal(pure.isStrategySameOrigin(request("POST", {}, { origin: "https://evil.example" })), false);
    assert.equal(pure.isStrategySameOrigin(request("POST", {})), true);
    const safe = pure.redactStrategyText("원고 홍길동, 010-1234-5678 mail@example.com 900101-1234567");
    for (const pii of ["홍길동", "010-1234-5678", "mail@example.com", "900101-1234567"]) assert.ok(!safe.includes(pii));
    const known = "record:" + id();
    assert.equal(pure.parseStrategyReport(JSON.stringify(goodReport(known)), new Set([known])).topics.length, 1);
    assert.throws(() => pure.parseStrategyReport(JSON.stringify(goodReport("record:made-up")), new Set([known])), /근거/);
    const invalid = goodReport(known); invalid.topics[0].priority = "최상";
    assert.throws(() => pure.parseStrategyReport(JSON.stringify(invalid), new Set([known])), /우선순위/);
    const tooMany = goodReport(known); tooMany.topics = Array(21).fill(tooMany.topics[0]);
    assert.throws(() => pure.parseStrategyReport(JSON.stringify(tooMany), new Set([known])), /목록/);

    // Full pagination, tenant boundaries, KST edges, current/older-open requests, all four sources.
    const db = database();
    for (let index = 0; index < 405; index++) db.tables.portal_records.push({ ...base(), type: "상담기록", title: "상속 질문", content: "원고 홍길동, 010-1234-5678", structured });
    db.tables.portal_records.push({ ...base(OTHER), type: "기타", title: "타 고객 비밀" }, { ...base(), created_at: "2026-07-31T14:59:59Z", title: "범위 이전" }, { ...base(), created_at: "2026-08-31T15:00:00Z", title: "다음 달" });
    db.tables.portal_requests.push(
        { ...base(), title: "이번 달 완료 요청", body: "인스타 운영", status: "완료", admin_note: "AI에 보내면 안 되는 비밀" },
        { ...base(), created_at: "2026-06-01T00:00:00Z", title: "이전 미완료", body: "브랜딩", status: "진행중" },
        { ...base(), created_at: "2026-06-01T00:00:00Z", title: "이전 완료", status: "완료" },
        { ...base(), created_at: "2026-09-01T00:00:00Z", title: "미래 요청", status: "접수" },
        { ...base(OTHER), title: "타 고객 요청", status: "접수" },
    );
    db.tables.portal_worklogs.push({ ...base(), log_date: "2026-08-31", items: [{ area: "블로그", title: "상속 콘텐츠 검토" }], published: false });
    db.tables.portal_messages.push({ ...base(), author: "firm", body: "상속 상담 비중을 확인해주세요" });
    const pack = await service.collectStrategyEvidence(db, FIRM, "2026-08", new AbortController().signal);
    assert.deepEqual(pack.counts, { records: 405, requests: 2, worklogs: 1, messages: 1 });
    assert.equal(pack.aggregates["record.유형"]["상담기록"], 405);
    assert.ok(db.calls.some(call => call.table === "portal_records" && call.start === 400));
    assert.ok(pack.coverageNotes.some(note => note.includes("집계")));
    const serialized = JSON.stringify(pack);
    for (const forbidden of ["타 고객", "범위 이전", "다음 달", "이전 완료", "미래 요청", "AI에 보내면 안 되는 비밀"]) assert.ok(!serialized.includes(forbidden), forbidden);
    for (const included of ["이번 달 완료", "이전 미완료", "마케팅_시사점", "콘텐츠_소재"]) assert.ok(serialized.includes(included));
    assert.ok(!db.calls.find(call => call.table === "portal_requests").columns.includes("admin_note"));

    // Completed replay, empty report, in-progress replay, failed/stale retry, and fenced writes.
    const first = await service.generateMonthlyStrategy(FIRM, "2026-08", { db, generate });
    assert.equal(first.report.status, "completed"); assert.equal(first.reused, false); assert.equal(aiCalls, 1);
    const replay = await service.generateMonthlyStrategy(FIRM, "2026-08", { db, generate });
    assert.equal(replay.reused, true); assert.equal(aiCalls, 1); assert.deepEqual(replay.report.source_counts, pack.counts);
    assert.ok(!("claim_token" in replay.report));
    const emptyDb = database();
    const empty = await service.generateMonthlyStrategy(FIRM, "2026-08", { db: emptyDb, generate });
    assert.equal(empty.report.status, "insufficient_data"); assert.equal(aiCalls, 1);
    assert.equal((await service.generateMonthlyStrategy(FIRM, "2026-08", { db: emptyDb, generate })).reused, true);
    const failedDb = database(); failedDb.tables.portal_records.push({ ...base(), title: "상속 상담", structured });
    await assert.rejects(() => service.generateMonthlyStrategy(FIRM, "2026-08", { db: failedDb, generate: async () => { throw new Error("SECRET PRIVATE INPUT"); } }), error => !error.message.includes("SECRET"));
    assert.equal(failedDb.tables.portal_strategy_reports[0].status, "failed");
    assert.deepEqual(failedDb.tables.portal_strategy_reports[0].source_counts, { records: 1, requests: 0, worklogs: 0, messages: 0 });
    const retried = await service.generateMonthlyStrategy(FIRM, "2026-08", { db: failedDb, generate });
    assert.equal(retried.report.status, "completed");
    const row = failedDb.tables.portal_strategy_reports[0];
    row.status = "generating"; row.lease_expires_at = new Date(Date.now() + 30000).toISOString();
    assert.equal((await service.generateMonthlyStrategy(FIRM, "2026-08", { db: failedDb, generate })).report.status, "generating");
    row.lease_expires_at = "2020-01-01T00:00:00Z";
    assert.equal((await service.generateMonthlyStrategy(FIRM, "2026-08", { db: failedDb, generate })).reused, false);
    const fenceDb = database(); fenceDb.fenceLost = true;
    await assert.rejects(() => service.generateMonthlyStrategy(FIRM, "2026-08", { db: fenceDb, generate }), /다른 작업/);
    assert.equal(fenceDb.tables.portal_strategy_reports[0].status, "generating");
    const countErrorDb = database(); countErrorDb.errors.portal_records = { code: "XX000", message: "private SQL body" };
    await assert.rejects(() => service.generateMonthlyStrategy(FIRM, "2026-08", { db: countErrorDb, generate }), /읽거나 저장/);
    assert.equal(countErrorDb.tables.portal_strategy_reports[0].status, "failed");
    const missingDb = database(); missingDb.rpcError = { code: "PGRST202" };
    await assert.rejects(() => service.generateMonthlyStrategy(FIRM, "2026-08", { db: missingDb, generate }), error => error.setupRequired && error.status === 503);
    const nullCountDb = database(); nullCountDb.nullCount = true;
    await assert.rejects(() => service.collectStrategyEvidence(nullCountDb, FIRM, "2026-08", new AbortController().signal), /건수/);

    // Concurrent mock requests exercise idempotency; the real PostgreSQL RPC is additionally inspected below.
    const parallelDb = database(); parallelDb.tables.portal_records.push({ ...base(), structured });
    let concurrentCalls = 0;
    const simultaneous = await Promise.all([1, 2].map(() => service.generateMonthlyStrategy(FIRM, "2026-08", { db: parallelDb, generate: async pack => { concurrentCalls++; await new Promise(resolve => setTimeout(resolve, 5)); return generate(pack); } })));
    assert.equal(concurrentCalls, 1); assert.equal(parallelDb.tables.portal_strategy_reports.length, 1); assert.ok(simultaneous.some(result => result.reused));
    const batchDb = database(); batchDb.tables.portal_firms = Array.from({ length: 8 }, () => ({ id: id(), name: "독립 로펌" }));
    for (const firm of batchDb.tables.portal_firms) batchDb.tables.portal_records.push({ ...base(firm.id), structured });
    let running = 0, peak = 0;
    const batch = await service.runMonthlyStrategies("2026-08", { db: batchDb, generate: async pack => { running++; peak = Math.max(peak, running); await new Promise(resolve => setTimeout(resolve, 2)); running--; return generate(pack); } });
    assert.equal(batch.results.length, 8); assert.equal(batch.complete, true); assert.ok(peak <= 3); assert.equal(running, 0);

    // Unauthorized and cross-origin requests must fail before any DB or model call.
    const callsBefore = serviceCalls;
    assert.equal((await admin.GET(request("GET", undefined, { authenticated: false }))).status, 401);
    assert.equal((await admin.POST(request("POST", {}, { authenticated: false }))).status, 401);
    assert.equal((await admin.POST(request("POST", {}, { origin: "https://evil.example" }))).status, 403);
    assert.equal((await admin.POST(request("POST", {}, { origin: null }))).status, 403);
    assert.equal((await admin.POST(request("POST", { month: "2026-99", firmId: FIRM }))).status, 400);
    assert.equal((await admin.POST(request("POST", { month: "2099-01", firmId: FIRM }))).status, 400);
    assert.equal((await admin.POST(request("POST", { month: "2026-08", firmId: "not-a-uuid" }))).status, 400);
    assert.equal((await cron.GET(request("GET"))).status, 401);
    assert.equal(serviceCalls, callsBefore);
    activeDb = db;
    const listing = await admin.GET(request("GET", undefined, { url: "https://www.makethis1.com/api/admin/client-strategy?month=2026-08&firm=" + FIRM }));
    assert.equal(listing.status, 200); assert.equal((await listing.json()).reports.length, 1); assert.ok(listing.headers.get("cache-control").includes("no-store"));
    activeDb = database(); activeDb.errors.portal_strategy_reports = { code: "PGRST205" };
    const setup = await admin.GET(request("GET", undefined, { url: "https://www.makethis1.com/api/admin/client-strategy?month=2026-08" }));
    assert.equal(setup.status, 503); assert.equal((await setup.json()).setupRequired, true);

    // Fetch receives the cancellation signal, timeout stays active through response body, unknown refs fail.
    const controller = new AbortController();
    let observedAbort = false;
    global.fetch = async (_url, options) => ({ ok: true, json: () => new Promise((resolve, reject) => { options.signal.addEventListener("abort", () => { observedAbort = true; reject(new DOMException("Aborted", "AbortError")); }, { once: true }); }) });
    const pending = service.generateStrategyWithAI(pack, "2026-08", controller.signal);
    setTimeout(() => controller.abort(), 5);
    await assert.rejects(() => pending, /Aborted/); assert.equal(observedAbort, true);
    let sentBody;
    global.fetch = async (_url, options) => { sentBody = JSON.parse(options.body); return { ok: true, json: async () => ({ model: "fixture", stop_reason: "end_turn", content: [{ type: "thinking", thinking: "not output" }, { type: "text", text: JSON.stringify(goodReport(pack.evidence[0].id)) }] }) }; };
    const aiResult = await service.generateStrategyWithAI(pack, "2026-08", new AbortController().signal);
    assert.ok(sentBody.system.includes("신뢰할 수 없는")); assert.ok(sentBody.system.includes("개인") || sentBody.system.includes("식별정보")); assert.equal(aiResult.report.requestSummary.length, 2); assert.ok(aiResult.report.gaps.length > 0);
    global.fetch = async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(goodReport("record:forged")) }] }) });
    await assert.rejects(() => service.generateStrategyWithAI(pack, "2026-08", new AbortController().signal), /형식이나 근거/);

    const migration = fs.readFileSync(path.join(root, "supabase/migrations/017_portal_strategy_reports.sql"), "utf8");
    for (const required of ["unique (firm_id, report_month)", "enable row level security", "claim_token", "interval '3 minutes'", "status = 'failed'", "lease_expires_at", "from public, anon, authenticated", "to service_role"]) assert.ok(migration.includes(required), required);
    const cronCode = fs.readFileSync(path.join(root, "app/api/cron/client-consulting/route.ts"), "utf8");
    assert.ok(!cronCode.includes("nodemailer")); assert.ok(!cronCode.includes("sendMail")); assert.ok(cronCode.includes("result.complete ? 200 : 503"));
    console.log("PASS portal-strategy: KST/months, redaction/schema, full source counts/pagination, tenant isolation, idempotency/leases, retry/fencing, concurrency3, private auth/CSRF, setup errors, abortable AI body, no emails/network/real writes.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
