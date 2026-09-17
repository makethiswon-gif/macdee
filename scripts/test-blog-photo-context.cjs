// Verify server-owned photo fallbacks without a database, credentials or network.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
const row = { id: "fixture", lawyer_name: "Fixture||Lawyer", phone: "02-1234-5678", profile_images: [null, "", "broken", "registered-two", "registered-two", "registered-three"], office_images: ["office-one", "office-two"] };
const selection = { profileId: row.id, claims: [], revision: 0 };
const library = { ...selection, lawyerId: row.id, firmId: "firm", designFamily: "auto" };
const db = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }) }) };
const load = Module._load;
Module._load = function(name, ...args) {
    if (name === "@/lib/supabase/server") return { createServiceClient: () => db };
    if (name.endsWith("/blog-strengths-store")) return { loadStrengthLibrary: async () => library, verifyStrengthSelection: async () => selection, signStrengthSelection: () => "fixture", StrengthStoreError: class extends Error {} };
    return load.call(this, name, ...args);
};
global.fetch = async () => { throw new Error("Network forbidden"); };
(async () => {
    const { imageStrengthContext } = require("../lib/blog-images/strength-context.ts");
    const legacy = await imageStrengthContext({ id: row.id }, "", "");
    assert.deepEqual(legacy.profile.profileImages, ["broken"], "Legacy identity/cache shape remains unchanged");
    const current = await imageStrengthContext({ id: row.id }, "", "", undefined, true);
    assert.deepEqual(current.profile.profileImages, ["broken", "registered-two", "registered-three"]);
    assert.deepEqual(current.profile.officeImages, ["office-one", "office-two"]);
    const chosen = await imageStrengthContext({ id: row.id, profileImages: ["registered-three"] }, "", "", undefined, true);
    assert.deepEqual(chosen.profile.profileImages, ["registered-three", "broken", "registered-two"]);
    const injected = await imageStrengthContext({ id: row.id, profileImages: ["https://untrusted.invalid/"], officeImages: ["unregistered"] }, "", "", undefined, true);
    assert.deepEqual(injected.profile.profileImages, current.profile.profileImages);
    assert.deepEqual(injected.profile.officeImages, current.profile.officeImages);
    console.log("PASS: all registered fallbacks, deduplication, explicit registered preference, no client asset injection, legacy selection preserved.");
})().catch(e => { console.error(e); process.exitCode = 1; });
