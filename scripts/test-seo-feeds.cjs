/* Discovery-feed regressions: no network, environment secrets, or customer-data writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { load } = require('cheerio');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.makethis1.com';
const published = '2026-08-01T00:00:00.000Z';
const tables = {
    lawyers: [{ id: 1, slug: 'real-firm', updated_at: published }, { id: 2, slug: 'qa-hidden', updated_at: published }],
    contents: Array.from({ length: 1205 }, (_, id) => ({
        id: String(id).padStart(5, '0'), slug: `post-${id}`, status: 'published', channel: 'macdee',
        title: '제목 & 비교 ]]> 끝', body: '<p>본문 ]]> & 확인</p>', lawyer_id: 1,
        lawyers: { slug: id === 0 ? 'qa-hidden' : 'real-firm' },
        created_at: published, updated_at: published,
    })),
    magazines: Array.from({ length: 96 }, (_, id) => ({
        id: String(id).padStart(4, '0'), slug: id === 0 ? '법무법인-마케팅&운영' : `guide-${id}`,
        status: 'published', title: '제목 & 비교 ]]> 끝', excerpt: '요약 ]]> & 확인',
        body: '## 본문\n\n내용 ]]> & 확인', author: '메이크디스원', cover_image_url: null,
        published_at: published, updated_at: '2026-09-07T12:00:00.000Z',
    })),
};
let failed = false;
const requestedRanges = [];
function query(table) {
    let rows = [...tables[table]], from = 0, to = 249, limit = 250;
    const builder = {
        select() { return this; },
        eq(key, value) { rows = rows.filter(row => row[key] === value); return this; },
        in(key, values) { rows = rows.filter(row => values.includes(row[key])); return this; },
        not(key, operator, value) { rows = rows.filter(row => row[key] !== value); return this; },
        order(key, options = {}) { rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (options.ascending === false ? -1 : 1)); return this; },
        range(a, b) { from = a; to = b; requestedRanges.push([table, a, b]); return this; },
        limit(value) { limit = value; to = value - 1; return this; },
        then(resolve, reject) { return Promise.resolve(failed ? { data: null, error: new Error('fixture outage') } : { data: rows.slice(from, Math.min(to + 1, from + Math.min(limit, 250))), error: null }).then(resolve, reject); },
    };
    return builder;
}
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function(name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function(name, parent, isMain) {
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from: query }) };
    if (name === '@/data/renewal/site') return { SITE_BASE: origin, DEMO_BASE: '', absUrl: route => origin + route };
    if (name === '@/lib/ai-content') return { cleanBody: value => value };
    if (name === 'next/server') return { NextResponse: Response };
    return originalLoad.call(this, name, parent, isMain);
};
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file }).outputText, file);

(async () => {
    const { validDate, latestDate, cdata, readAllFeedRows } = require('../lib/seo-feeds.ts');
    assert.equal(validDate('invalid'), undefined);
    assert.equal(validDate(null), undefined);
    assert.equal(latestDate(['invalid', published, '2025-01-01']), published);
    assert.equal(load(`<x>${cdata('A ]]> B & C')}</x>`, { xmlMode: true })('x').text(), 'A ]]> B & C');
    await assert.rejects(() => readAllFeedRows(async () => ({ data: null, error: new Error('outage') })));

    const sitemap = require('../app/sitemap.xml/route.ts');
    const response = await sitemap.GET();
    assert.equal(response.status, 200);
    const xml = await response.text();
    const $ = load(xml, { xmlMode: true });
    const entries = new Map($('url').toArray().map(node => [$(node).find('loc').text(), $(node).find('lastmod').text()]));
    assert.equal(entries.size, 14 + 1 + 1204 + 96);
    assert.ok(requestedRanges.some(([table, from]) => table === 'contents' && from >= 1000));
    assert.ok(entries.has(`${origin}/blog/real-firm/post-1204`));
    assert.ok(!xml.includes('qa-hidden') && !xml.includes('/renewal') && !xml.includes('/admin'));
    assert.equal(entries.get(origin), '');
    assert.equal(entries.get(`${origin}/about`), '');
    assert.equal(entries.get(`${origin}/lawfirm-marketing`), '');
    assert.equal(entries.get(`${origin}/magazine/guide-1`), published);
    assert.equal(entries.get(`${origin}/magazine`), published);
    assert.ok(entries.has(`${origin}/magazine/${encodeURIComponent('법무법인-마케팅&운영')}`));
    assert.equal(await (await sitemap.GET()).text(), xml, 'requests must not invent new modification dates');

    const rss = require('../app/rss.xml/route.ts');
    const feedResponse = await rss.GET();
    assert.equal(feedResponse.status, 200);
    const feed = load(await feedResponse.text(), { xmlMode: true });
    assert.equal(feed('item').length, 99);
    assert.equal(feed('item title').first().text(), '제목 & 비교 ]]> 끝');
    assert.ok(feed('item description').first().text().includes(']]>'));
    assert.equal(feed('channel > lastBuildDate').text(), new Date(published).toUTCString());
    assert.ok(feed('item link').toArray().every(node => feed(node).text().startsWith(origin)));

    failed = true;
    assert.equal((await sitemap.GET()).status, 503);
    assert.equal((await rss.GET()).status, 503);
    console.log('PASS SEO feeds: 1,315 URLs beyond DB row cap; canonical URLs; real dates; no private/test URLs; CDATA roundtrip; query failure 503 (no network/DB writes).');
})().catch(error => { console.error(error); process.exitCode = 1; });
