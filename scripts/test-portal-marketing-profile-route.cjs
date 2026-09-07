/* Isolated route boundary tests. No environment file, network, DB, or real credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: file }).outputText, file);

process.env.PORTAL_CREDENTIALS_KEY = 'route-fixture-key-at-least-32-characters';
let session = null;
let dbError = null;
const firmA = '00000000-0000-4000-8000-000000000001';
const firmB = '00000000-0000-4000-8000-000000000002';
let rows;
class Query {
    constructor() { this.filters = []; this.operation = 'select'; }
    select() { return this; }
    eq(key, value) { this.filters.push([key, value]); return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    upsert(value) { this.operation = 'upsert'; this.value = value; return this; }
    then(resolve, reject) {
        if (dbError) return Promise.resolve({ data: null, error: dbError }).then(resolve, reject);
        let selected;
        if (this.operation === 'upsert') {
            let row = rows.find((item) => item.firm_id === this.value.firm_id);
            if (row) Object.assign(row, this.value); else { row = { ...this.value }; rows.push(row); }
            selected = [row];
        } else selected = rows.filter((row) => this.filters.every(([key, value]) => row[key] === value));
        return Promise.resolve({ data: this.one ? selected[0] || null : selected, error: null }).then(resolve, reject);
    }
}
Module._load = function (name, parent, isMain) {
    if (name === 'server-only') return {};
    if (name === '@/lib/portal-auth') return { getPortalSession: () => session };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from(table) { assert.equal(table, 'portal_marketing_profiles'); return new Query(); } }) };
    return originalLoad.call(this, name, parent, isMain);
};
global.fetch = async () => { throw new Error('Unexpected network access'); };
const vault = require('../lib/portal-credentials.ts');
const profileRoute = require('../app/api/portal/marketing-profile/route.ts');
const revealRoute = require('../app/api/portal/marketing-profile/reveal/route.ts');
function reset() {
    rows = [
        { firm_id: firmA, profile: { website_url: 'https://a.example' }, credentials_encrypted: vault.encryptPortalCredentials(firmA, { ftp_password: 'A-private' }), updated_by: 'firm', updated_at: '2026-09-01T00:00:00Z' },
        { firm_id: firmB, profile: { website_url: 'https://b.example' }, credentials_encrypted: vault.encryptPortalCredentials(firmB, { ftp_password: 'B-private' }), updated_by: 'firm', updated_at: '2026-09-01T00:00:00Z' },
    ];
    dbError = null;
}
function req(method = 'GET', body, query = '', origin = 'https://fixture.test') {
    return new Request(`https://fixture.test/api/portal/marketing-profile${query}`, { method, headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function json(response) { return { status: response.status, body: await response.json() }; }

(async () => {
    reset();
    assert.equal((await profileRoute.GET(req())).status, 401);
    session = { role: 'firm', firmId: firmA };
    let result = await json(await profileRoute.GET(req('GET', undefined, `?firm=${firmB}`)));
    assert.equal(result.status, 200);
    assert.equal(result.body.profile.website_url, 'https://a.example');
    assert.equal(result.body.secretPresence.ftp_password, true);
    assert.ok(!JSON.stringify(result.body).includes('A-private'));
    assert.equal((await revealRoute.POST(req('POST', { firmId: firmA }))).status, 401);

    assert.equal((await profileRoute.PATCH(req('PATCH', { firmId: firmB, profile: { website_url: 'https://evil.example' }, secrets: { ftp_password: 'replacement' } }, '', 'https://evil.test'))).status, 403);
    result = await json(await profileRoute.PATCH(req('PATCH', { firmId: firmB, profile: { website_url: 'https://a-new.example' }, secrets: { ftp_password: 'A-replaced' } })));
    assert.equal(result.status, 200);
    assert.equal(rows[0].profile.website_url, 'https://a-new.example');
    assert.equal(rows[1].profile.website_url, 'https://b.example');
    assert.deepEqual(vault.decryptPortalCredentials(firmA, rows[0].credentials_encrypted), { ftp_password: 'A-replaced' });
    assert.ok(!JSON.stringify(result.body).includes('A-replaced'));
    assert.equal((await profileRoute.PATCH(req('PATCH', { profile: { website_url: 'javascript:bad' } }))).status, 400);

    session = { role: 'admin', firmId: null };
    result = await json(await revealRoute.POST(req('POST', { firmId: firmB, keys: ['ftp_password'] })));
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.credentials, { ftp_password: 'B-private' });
    result = await json(await profileRoute.PATCH(req('PATCH', { firmId: firmB, profile: {}, clearSecrets: ['ftp_password'] })));
    assert.equal(result.status, 200);
    assert.deepEqual(vault.decryptPortalCredentials(firmB, rows[1].credentials_encrypted), {});

    dbError = { code: 'PGRST205', message: 'portal_marketing_profiles missing from schema cache' };
    assert.equal((await profileRoute.GET(req('GET', undefined, `?firm=${firmA}`))).status, 503);
    console.log('PASS portal marketing profile routes: auth, same-origin, tenant isolation, masked reads, admin-only reveal, encrypted update/clear, setup errors (mock DB; no network).');
})().catch((error) => { console.error(error); process.exit(1); });
