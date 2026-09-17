const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename, load = Module._load;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
const library = { profileId: "profile-1", firmId: "firm-1", revision: 1, claims: [{ id: "approved-1", status: "approved" }] };
let authenticated = true, libraryError = false, firmsError = false, researchError = null, researchData = null, signal;
const db = {
    from(table) {
        const query = {
            select() { return query; }, eq() { return query; },
            abortSignal(value) { signal = value; return query; },
            async single() { return { data: { id: library.profileId, specialty: ["field"] } }; },
            async order() { return { data: [{ id: "firm-1", name: "Firm" }], error: firmsError }; },
            async maybeSingle() {
                assert.equal(table, "portal_firm_research");
                if (researchError instanceof Error) throw researchError;
                return { data: researchData, error: researchError };
            },
        };
        return query;
    },
};
Module._load = function (name, ...args) {
    if (name === "@/lib/admin-auth") return { verifyAdminToken: () => authenticated };
    if (name === "@/lib/portal-strategy") return { isStrategySameOrigin: () => true };
    if (name === "@/lib/supabase/server") return { createServiceClient: () => db };
    return load.call(this, name, ...args);
};
const store = require("../lib/blog-strengths-store.ts");
store.loadStrengthLibrary = async () => { if (libraryError) throw new store.StrengthStoreError("Library unavailable"); return library; };
store.briefingCandidates = async () => [];
const { GET } = require("../app/api/admin/blog-strengths/route.ts");
async function get(query = "") {
    const r = await GET(new Request(`https://example.test/api/admin/blog-strengths?profileId=profile-1${query}`));
    assert.match(r.headers.get("Cache-Control"), /private, no-store/);
    return { status: r.status, body: await r.json() };
}
(async () => {
    for (const error of [{ code: "42P01" }, { code: "PGRST205" }, { code: "42501" }, new Error("timeout")]) {
        researchError = error;
        const r = await get();
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.library, library);
        assert.equal(r.body.research, null);
        assert.equal(r.body.warnings.length, 1);
        assert.ok(signal instanceof AbortSignal);
    }
    researchError = null;
    let r = await get();
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.research.candidates, []);
    assert.deepEqual(r.body.warnings, []);
    researchData = { report: { strengths: ["Fact"], sources: ["https://example.test/source"] }, generated_at: "2026-09-13" };
    r = await get();
    assert.equal(r.body.research.candidates[0].fact, "Fact");
    assert.equal(r.body.warnings.length, 0);
    r = await get("&firmId=");
    assert.equal(r.body.research, null);
    assert.deepEqual(r.body.warnings, []);
    assert.equal((await get("&firmId=unknown")).status, 400);
    libraryError = true;
    r = await get();
    assert.equal(r.status, 503);
    assert.equal(r.body.library, undefined);
    libraryError = false; firmsError = true;
    assert.equal((await get()).status, 503);
    firmsError = false; authenticated = false;
    assert.equal((await get()).status, 401);
    console.log("PASS: optional research errors preserve approved claims; primary storage, ownership and auth remain strict.");
})().catch((e) => { console.error(e); process.exitCode = 1; });
