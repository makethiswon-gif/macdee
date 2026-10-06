/* Magazine publication regressions. All DB, model, mail, and social calls are
   in-memory fixtures; this script never loads .env or calls a real endpoint. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const changes = [], logs = [], calls = [];
let adminAllowed = true, dbFailure = false, modelFailure = false, cacheFailure = false;
let prior = { status: 'draft', slug: 'fixture-article', title: '기존 제목', body: '기존 본문', excerpt: '기존 요약' };
let catalogue = Array.from({ length: 5 }, (_, i) => ({ id: `new-${i}`, slug: `new-${i}`, title: `최신 기사 ${i}`, published_at: `2026-10-0${5 - i}T01:00:00Z` }));
let catalogueFailure = false;
const components = new Map();
function component(name) {
    if (!components.has(name)) components.set(name, function fixtureComponent() {});
    return components.get(name);
}

// Set harmless fixtures explicitly, never allowing inherited credentials to be used.
for (const key of ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ADMIN_TOKEN_SECRET']) process.env[key] = 'fixture-only';
process.env.ADMIN_ID = 'fixture-admin';
process.env.NEXT_PUBLIC_APP_URL = 'http://fixture.invalid';
process.env.DAILY_THREADS_ENABLED = 'false';
for (const key of ['OPENAI_API_KEY', 'EMAIL_USER', 'EMAIL_PASS']) delete process.env[key];

function query(table) {
    assert.equal(table, 'magazines', 'Only the fixture magazine table may be queried');
    let action = 'select', payload;
    const result = single => {
        if (dbFailure) return { data: null, error: { message: 'fixture database failure' } };
        if (action === 'insert') return { data: { id: 'fixture-id', slug: payload.slug }, error: null };
        if (action === 'select') return { data: single ? prior : [{ title: '기존 기사' }], error: null };
        return { data: null, error: null };
    };
    return {
        select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
        insert(value) { action = 'insert'; payload = value; calls.push(['insert', value.status]); return this; },
        update(value) { action = 'update'; payload = value; calls.push(['update', value.status]); return this; },
        delete() { action = 'delete'; calls.push(['delete']); return this; },
        single() { return Promise.resolve(result(true)); },
        then(resolve, reject) { return Promise.resolve(result(false)).then(resolve, reject); },
    };
}

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) {
    return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
Module._load = function (name, ...args) {
    if (name === 'next/server') return { NextResponse: Response };
    if (name === 'next/cache') return {
        revalidateTag(tag, options) { changes.push(['tag', tag, options]); if (cacheFailure) throw new Error('fixture cache failure'); },
        revalidatePath(route) { changes.push(['path', route]); if (cacheFailure) throw new Error('fixture cache failure'); },
    };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from: query }), createAdminClient: async () => ({ from: query }) };
    if (name === '@/lib/admin-auth') return { verifyAdminToken: () => adminAllowed };
    if (name === '@/lib/supabase/storage') return { uploadMagazineCover: async () => { throw new Error('Unexpected image upload'); } };
    if (name === '@/lib/threads/post') return { postToThreads: async () => { calls.push(['social']); return { success: true }; } };
    if (name === '@/lib/threads/caption') return { generateThreadsCaption: async () => 'fixture caption' };
    if (name === 'nodemailer') return { createTransport: () => { throw new Error('Unexpected email operation'); } };
    if (name === '@/lib/renewal/magazine') return {
        getInsightCatalogue: async () => { if (catalogueFailure) throw new Error('fixture catalogue failure'); return catalogue; },
        getRelatedInsights: async () => { throw new Error('Home must not use relevance-ranked/starter articles'); },
    };
    if (name === '@/data/renewal/cases') return { CASES: [] };
    if (name === '@/data/renewal/site') return {
        COMPANY: { brand: 'Fixture', legalName: 'Fixture', site: 'http://fixture.invalid' },
        FOUNDER: { name: 'Fixture', role: 'Fixture' }, absUrl: value => `http://fixture.invalid${value}`, ogImage: () => 'fixture.png',
    };
    if (name.startsWith('@/components/')) {
        if (name.endsWith('.css')) return { __esModule: true, default: {} };
        return new Proxy({ __esModule: true, default: component(name) }, { get(target, key) { return key in target ? target[key] : component(String(key)); } });
    }
    return originalLoad.call(this, name, ...args);
};
for (const extension of ['.ts', '.tsx']) {
    Module._extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
    }).outputText, file);
}
global.fetch = async (url) => {
    const target = String(url);
    calls.push(['fetch', target]);
    if (target === 'https://api.anthropic.com/v1/messages') {
        if (modelFailure) return new Response('fixture generation error', { status: 503 });
        return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: '===TITLE===\n주간 마케팅 기사\n===META_TITLE===\n주간 제목\n===META_DESCRIPTION===\n요약\n===EXCERPT===\n발행 요약\n===TAGS===\n마케팅\n===CATEGORY===\n법률 마케팅\n===BODY===\n## 실제 검수\n테스트 본문입니다.\n===THREADS===\n테스트 캡션' }] });
    }
    assert.equal(target, 'http://fixture.invalid/api/admin/magazines/to-naver', 'Unexpected network target (all requests are stubbed)');
    return Response.json({ postId: 'fixture-draft', title: 'fixture draft' });
};
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args) => logs.push(args);
console.warn = (...args) => logs.push(args);
const request = (method, payload) => new Request('http://fixture.invalid/api/admin/magazines?id=fixture-id', {
    method, ...(payload ? { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } } : {}),
});
const reset = () => { changes.length = 0; calls.length = 0; dbFailure = false; cacheFailure = false; modelFailure = false; adminAllowed = true; };
function assertInvalidated(label) {
    assert.deepEqual(changes.filter(entry => entry[0] === 'tag'), [['tag', 'magazines', { expire: 0 }]], label);
    assert.deepEqual(changes.filter(entry => entry[0] === 'path').map(entry => entry[1]).sort(), ['/', '/magazine', '/renewal', '/renewal/magazine'].sort(), label);
}
function findComponent(element, name) {
    if (!element || typeof element !== 'object') return undefined;
    if (element.type === components.get(name)) return element;
    return [element.props?.children].flat(Infinity).map(child => findComponent(child, name)).find(Boolean);
}

(async () => {
    const crons = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).crons;
    assert.equal(crons.length, 3, 'Existing cron set is preserved');
    assert.equal(crons.find(job => job.path === '/api/cron/daily-magazine').schedule, '0 1 * * 1', 'Magazine publishes Mondays 10:00 KST');
    assert.equal(crons.find(job => job.path === '/api/cron/recurring-billing').schedule, '0 0 * * *', 'Billing cadence unchanged');
    assert.equal(crons.find(job => job.path === '/api/cron/client-consulting').schedule, '0 0 1 * *', 'Consulting cadence unchanged');

    const { invalidateMagazineCache } = require('../lib/renewal/magazine-cache.ts');
    invalidateMagazineCache(); assertInvalidated('Immediate tag and homepage/archive invalidation');
    reset(); cacheFailure = true;
    assert.doesNotThrow(() => invalidateMagazineCache(), 'Cache failure must not make a committed publication look failed');
    assert.ok(logs.length > 0, 'Cache failure is observable');

    const Home = require('../app/renewal/page.tsx').default;
    let insight = findComponent(await Home(), 'InsightEdition');
    assert.deepEqual(insight.props.items, catalogue.slice(0, 3), 'Home uses the latest three catalogue rows, in order');
    assert.equal(insight.props.total, 5);
    catalogue = catalogue.slice(0, 1);
    insight = findComponent(await Home(), 'InsightEdition'); assert.equal(insight.props.items.length, 1, 'Fewer than three real articles are safe');
    catalogueFailure = true;
    insight = findComponent(await Home(), 'InsightEdition'); assert.deepEqual(insight.props.items, [], 'DB outage must not crash the homepage');
    catalogueFailure = false;

    const admin = require('../app/api/admin/magazines/route.ts');
    const article = { title: '수동 발행 제목', body: '수동 발행 본문', status: 'published' };
    reset(); adminAllowed = false;
    for (const method of ['POST', 'PATCH', 'DELETE']) assert.equal((await admin[method](request(method, method === 'DELETE' ? null : { ...article, id: 'fixture-id' }))).status, 401);
    assert.equal(calls.length, 0); assert.equal(changes.length, 0);
    reset(); assert.equal((await admin.POST(request('POST', { ...article, status: 'draft' }))).status, 201);
    assert.equal(changes.length, 0, 'Unpublished drafts must not invalidate public pages');
    reset(); assert.equal((await admin.POST(request('POST', article))).status, 201); assertInvalidated('Manual publication');
    assert.equal(calls.filter(entry => entry[0] === 'social').length, 1, 'Existing manual social behavior is preserved');
    reset(); dbFailure = true; assert.equal((await admin.POST(request('POST', article))).status, 500); assert.equal(changes.length, 0);
    reset(); cacheFailure = true; assert.equal((await admin.POST(request('POST', article))).status, 201, 'Cache outage cannot mask a successful insert');
    reset(); prior.status = 'draft';
    assert.equal((await admin.PATCH(request('PATCH', { id: 'fixture-id', title: '초안 수정' }))).status, 200); assert.equal(changes.length, 0);
    reset(); assert.equal((await admin.PATCH(request('PATCH', { id: 'fixture-id', status: 'published' }))).status, 200); assertInvalidated('Draft to published');
    reset(); prior.status = 'published';
    assert.equal((await admin.PATCH(request('PATCH', { id: 'fixture-id', title: '발행글 수정' }))).status, 200); assertInvalidated('Edit existing publication');
    assert.equal(calls.filter(entry => entry[0] === 'social').length, 0, 'Editing published text must not duplicate social publication');
    reset(); assert.equal((await admin.PATCH(request('PATCH', { id: 'fixture-id', status: 'draft' }))).status, 200); assertInvalidated('Unpublish removes stale public content');
    reset(); dbFailure = true; assert.equal((await admin.PATCH(request('PATCH', { id: 'fixture-id', status: 'published' }))).status, 500); assert.equal(changes.length, 0);
    reset(); assert.equal((await admin.DELETE(request('DELETE'))).status, 200); assertInvalidated('Delete');
    reset(); dbFailure = true; assert.equal((await admin.DELETE(request('DELETE'))).status, 500); assert.equal(changes.length, 0, 'Failed deletion does not report success or invalidate');

    const cron = require('../app/api/cron/daily-magazine/route.ts');
    const cronRequest = token => new Request('http://fixture.invalid/api/cron/daily-magazine', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    reset(); assert.equal((await cron.GET(cronRequest())).status, 401); assert.equal(calls.length, 0); assert.equal(changes.length, 0);
    reset(); assert.equal((await cron.GET(cronRequest('fixture-only'))).status, 200); assertInvalidated('Automatic publication');
    assert.equal(calls.filter(entry => entry[0] === 'insert').length, 1, 'One article per cron invocation');
    assert.equal(calls.filter(entry => entry[0] === 'social').length, 0, 'Automatic Threads remains disabled');
    assert.equal(calls.filter(entry => entry[0] === 'fetch' && entry[1].endsWith('/to-naver')).length, 1, 'Existing Naver draft follow-up preserved');
    reset(); modelFailure = true; assert.equal((await cron.GET(cronRequest('fixture-only'))).status, 500); assert.equal(changes.length, 0); assert.equal(calls.filter(entry => entry[0] === 'insert').length, 0);
    reset(); dbFailure = true; assert.equal((await cron.GET(cronRequest('fixture-only'))).status, 500); assert.equal(changes.length, 0);
    reset(); cacheFailure = true; assert.equal((await cron.GET(cronRequest('fixture-only'))).status, 200, 'Cache outage does not turn successful automated publication into retryable failure');
    console.log('PASS magazine publishing: Monday 10:00 KST, other crons unchanged, latest three homepage items, safe empty/outage fallback, immediate cache expiry, manual/automatic publication and edit/unpublish/delete regressions, auth/error gates, preserved follow-ups. All DB/model/social/mail operations mocked; no real network or credentials.');
})().catch(error => { originalError(error); process.exitCode = 1; }).finally(() => { console.error = originalError; console.warn = originalWarn; });
