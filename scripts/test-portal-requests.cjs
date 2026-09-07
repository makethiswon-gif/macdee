// Isolated contract and route security tests. No credentials, network, or customer data.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename }).outputText, filename);

const firmA = "00000000-0000-4000-8000-000000000001";
const firmB = "00000000-0000-4000-8000-000000000002";
const requestId = "10000000-0000-4000-8000-000000000001";
let session = null;
let databaseError = null;
let calls = [];
let rows = [];
function resetRows() {
    rows = [
        { id: requestId, firm_id: firmA, title: "가상 광고 요청", body: "광고 방향 검토", category: "광고", priority: "보통", status: "접수", due_date: null, admin_note: "PRIVATE OWNER NOTE", created_by: "firm", created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", portal_firms: { name: "가상 로펌 A" } },
        { id: "10000000-0000-4000-8000-000000000002", firm_id: firmB, title: "다른 로펌", body: "공유되면 안 됨", category: "SNS", priority: "긴급", status: "진행중", due_date: null, admin_note: "OTHER PRIVATE NOTE", created_by: "firm", created_at: "2026-09-02T00:00:00Z", updated_at: "2026-09-02T00:00:00Z", portal_firms: { name: "가상 로펌 B" } },
    ];
}
class Query {
    constructor() { this.filters = []; this.operation = "get"; calls.push(this); }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    or(value) { this.search = value; return this; }
    order() { return this; }
    range(from, to) { this.rangeArgs = [from, to]; return this; }
    insert(value) { this.operation = "insert"; this.payload = value; return this; }
    update(value) { this.operation = "update"; this.payload = value; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) {
        let selected = rows.filter((row) => this.filters.every(([key, value]) => row[key] === value));
        if (databaseError) return Promise.resolve({ error: databaseError, data: null, count: null }).then(resolve, reject);
        if (this.operation === "insert") {
            selected = [{ ...rows[0], ...this.payload, id: "10000000-0000-4000-8000-000000000009", status: "접수" }];
            rows.push(selected[0]);
        }
        if (this.operation === "update") selected.forEach((row) => Object.assign(row, this.payload));
        const count = selected.length;
        if (this.rangeArgs) selected = selected.slice(this.rangeArgs[0], this.rangeArgs[1] + 1);
        // Intentionally return extra internal columns: routes must still explicitly redact.
        return Promise.resolve({ error: null, data: this.one ? selected[0] || null : selected, count }).then(resolve, reject);
    }
}
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
    if (name === "@/lib/portal-auth") return { getPortalSession: () => session };
    if (name === "@/lib/supabase/server") return { createServiceClient: () => ({ from: (table) => { assert.equal(table, "portal_requests"); return new Query(); } }) };
    return originalLoad.call(this, name, parent, isMain);
};
global.fetch = async () => { throw new Error("Network is forbidden in this unit test"); };
const helpers = require("../lib/portal-requests.ts");
const { GET, POST } = require("../app/api/portal/requests/route.ts");
const { PATCH } = require("../app/api/portal/requests/[id]/route.ts");
const valid = { title: "  광고 방향  ", body: "  다음 달 주력 분야를 검토해 주세요.  ", category: "광고", priority: "보통", due_date: "2026-10-15" };
function req(method = "GET", payload, query = "", origin = "https://fixture.test") {
    return new Request(`https://fixture.test/api/portal/requests${query}`, { method, headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
}
const context = (id = requestId) => ({ params: Promise.resolve({ id }) });

async function main() {
    resetRows();
    assert.equal(helpers.validateNewRequest(valid).title, "광고 방향");
    for (const invalid of [null, [], { ...valid, title: " " }, { ...valid, title: "x".repeat(121) }, { ...valid, body: "x".repeat(10001) }, { ...valid, priority: "최고" }, { ...valid, category: "알 수 없음" }, { ...valid, due_date: "2026-02-30" }, { ...valid, due_date: "2026-13-01" }, { ...valid, status: "완료" }, { ...valid, admin_note: "숨김 메모" }]) assert.throws(() => helpers.validateNewRequest(invalid));
    assert.equal(helpers.validateNewRequest({ ...valid, due_date: "2028-02-29" }).due_date, "2028-02-29");
    assert.equal(helpers.validateNewRequest({ ...valid, due_date: "" }).due_date, null);
    for (const invalid of [{}, { status: "삭제" }, { firm_id: firmB }, { admin_note: "x".repeat(6001) }, { title: "수정" }]) assert.throws(() => helpers.validateRequestUpdate(invalid));
    assert.deepEqual(helpers.validateRequestUpdate({ admin_note: "  " }), { admin_note: "" });
    assert.equal(helpers.isRequestSameOrigin(req("POST", valid)), true);
    assert.equal(helpers.isRequestSameOrigin(req("POST", valid, "", "https://attacker.test")), false);
    assert.equal(helpers.isRequestSameOrigin(req("POST", valid, "", null)), false);
    assert.equal(helpers.requestSearchFilter('a,b)"%_'), 'title.ilike."%a,b)\\"\\%\\_%",body.ilike."%a,b)\\"\\%\\_%"');

    assert.equal((await GET(req())).status, 401);
    assert.equal((await POST(req("POST", valid))).status, 401);
    assert.equal((await PATCH(req("PATCH", { status: "완료" }), context())).status, 401);
    assert.equal(calls.length, 0);

    session = { role: "firm", firmId: firmA };
    const scoped = await GET(req("GET", undefined, `?firm=${firmB}`));
    assert.match(scoped.headers.get("cache-control"), /no-store/);
    const scopedBody = await scoped.json();
    assert.equal(scopedBody.requests.length, 1);
    assert.equal(scopedBody.requests[0].firm_id, firmA);
    assert.equal("admin_note" in scopedBody.requests[0], false);
    assert.equal("firm_name" in scopedBody.requests[0], false);
    assert.equal(JSON.stringify(scopedBody).includes("PRIVATE"), false);
    assert.deepEqual(scopedBody.counts, { 접수: 1, 진행중: 0, 완료: 0, 보류: 0 });
    assert.ok(calls.every((call) => call.filters.some(([key, value]) => key === "firm_id" && value === firmA)));
    assert.ok(calls.every((call) => !call.columns.includes("admin_note")));
    const beforeRejected = calls.length;
    assert.equal((await PATCH(req("PATCH", { status: "완료", admin_note: "attack" }), context())).status, 403);
    assert.equal((await POST(req("POST", valid, "", "https://attacker.test"))).status, 403);
    assert.equal((await POST(req("POST", { ...valid, status: "완료" }))).status, 400);
    assert.equal(calls.length, beforeRejected);
    const inserted = await POST(req("POST", { ...valid, firmId: firmB }));
    assert.equal(inserted.status, 201);
    const insertedBody = (await inserted.json()).request;
    assert.equal(insertedBody.firm_id, firmA);
    assert.equal(insertedBody.created_by, "firm");
    assert.equal("admin_note" in insertedBody, false);
    assert.equal(calls.at(-1).payload.firm_id, firmA);

    session = { role: "admin", firmId: null };
    resetRows(); calls = [];
    const adminList = await (await GET(req("GET", undefined, "?pageSize=1&status=접수"))).json();
    assert.equal(adminList.total, 1);
    assert.equal(adminList.requests[0].admin_note, "PRIVATE OWNER NOTE");
    assert.equal(adminList.requests[0].firm_name, "가상 로펌 A");
    assert.deepEqual(adminList.counts, { 접수: 1, 진행중: 1, 완료: 0, 보류: 0 });
    assert.deepEqual(calls[0].rangeArgs, [0, 0]);
    assert.equal((await POST(req("POST", valid))).status, 400);
    assert.equal((await POST(req("POST", { ...valid, firmId: firmB }))).status, 201);
    for (const query of ["?page=0", "?page=1.5", "?pageSize=1000", "?firm=garbage", "?status=삭제", `?q=${"x".repeat(101)}`]) assert.equal((await GET(req("GET", undefined, query))).status, 400);
    const patch = await PATCH(req("PATCH", { status: "진행중", admin_note: " 내부 검토 " }), context());
    assert.equal(patch.status, 200);
    const patched = (await patch.json()).request;
    assert.equal(patched.admin_note, "내부 검토");
    assert.equal(patched.status, "진행중");
    assert.equal((await PATCH(req("PATCH", { firm_id: firmB }), context())).status, 400);
    assert.equal((await PATCH(req("PATCH", { status: "완료" }), context("bad"))).status, 400);
    assert.equal((await PATCH(req("PATCH", { status: "완료" }), context("ffffffff-ffff-ffff-ffff-ffffffffffff"))).status, 404);
    databaseError = { code: "PGRST205", message: "internal database details" };
    const setup = await GET(req());
    assert.equal(setup.status, 503);
    const setupBody = await setup.json();
    assert.equal(setupBody.setupRequired, true);
    assert.match(setupBody.error, /016_portal_requests/);
    session = { role: "firm", firmId: firmA };
    const clientSetup = await (await GET(req())).json();
    assert.equal(clientSetup.error.includes("016_portal_requests"), false);
    assert.equal(clientSetup.error.includes("internal database details"), false);
    console.log("PASS portal requests: validation, isolation, redaction, CSRF, pagination, status counts, admin-only changes, setup errors (mock DB; no network)");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
