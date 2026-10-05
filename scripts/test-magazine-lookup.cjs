/* 매거진 글 상세: 데이터베이스가 응답하지 않을 때 실제로 있는 글이 404 로 굳지 않는지(2026-10-05 장애의 회귀 시험).
   데이터베이스·네트워크는 전부 메모리 가짜이고, .env 도 읽지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
process.env.RENEWAL_QA_READ_ONLY = '1'; // 조회수 쓰기 없음

// ── 가짜 데이터베이스 ───────────────────────────────────────────
const SLUG = '챗gpt가-변호사-광고를-받기-시작했다-한국-변호사만-빼고-muujrxii';
const ARTICLE = { id: 'a1', title: '챗GPT가 변호사 광고를 받기 시작했다', slug: SLUG, body: '## 소제목\n\n본문입니다.', excerpt: '요약', category: '시장', tags: ['ai'], cover_image_url: null,
    meta_title: '', meta_description: '', view_count: 3, published_at: '2026-10-02T01:00:00Z', updated_at: null, author: 'MAKETHIS1 편집팀' };
const OTHERS = [1, 2, 3, 4].map((n) => ({ id: `o${n}`, title: `다른 글 ${n}`, slug: `other-${n}`, excerpt: null, category: n % 2 ? '시장' : '법률', cover_image_url: null, published_at: `2026-09-2${n}T01:00:00Z`, author: null, tags: null }));
const db = { article: ARTICLE, articleFailures: 0, listFails: false, articleCalls: 0, listCalls: 0, signals: 0 };

function builder() {
    const b = {
        select() { return b; }, eq() { return b; }, neq() { return b; }, order() { return b; }, range() { return b; }, limit() { return b; },
        update() { return b; },
        abortSignal(signal) { assert.ok(signal instanceof AbortSignal, '조회마다 제한 시간 신호를 건다'); db.signals++; return b; },
        maybeSingle() {
            db.articleCalls++;
            if (db.articleFailures > 0) { db.articleFailures--; return Promise.resolve({ data: null, error: { message: 'upstream request timeout' } }); }
            return Promise.resolve({ data: db.article, error: null });
        },
        then(resolve, reject) {
            db.listCalls++;
            const result = db.listFails ? { data: null, error: { message: 'fixture catalogue failure' } } : { data: [{ ...ARTICLE }, ...OTHERS], error: null };
            return Promise.resolve(result).then(resolve, reject);
        },
    };
    return b;
}

const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) {
    return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
Module._load = function (name, ...args) {
    if (name === 'next/navigation') return { notFound() { const e = new Error('NEXT_NOT_FOUND'); e.digest = 'NEXT_HTTP_ERROR_FALLBACK;404'; throw e; } };
    if (name === 'next/link') return { __esModule: true, default: function Link() {} };
    if (name === 'next/cache') return { unstable_cache: (fn) => fn, revalidateTag() {}, revalidatePath() {} };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from: builder }), createAdminClient: async () => ({ from: builder }) };
    if (name === '@/components/renewal/primitives') return new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? target[key] : function Fixture() {}) });
    return originalLoad.call(this, name, ...args);
};
for (const extension of ['.ts', '.tsx']) {
    Module._extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
    }).outputText, file);
}
const originalError = console.error;
console.error = () => {};

const { readPublished, resetReadPause, MagazineUnavailableError, READ_PAUSE_MS, queryDeadline } = require('../lib/renewal/magazine-read.ts');
const isNotFound = (e) => e instanceof Error && e.message === 'NEXT_NOT_FOUND';

(async () => {
    // ── 1) 조회 규칙 자체: 있음 / 정말 없음 / 읽지 못함 ──────────────
    const clock = { t: 1_000_000, sleeps: [], now() { return this.t; }, async sleep(ms) { this.sleeps.push(ms); this.t += ms; } };
    const scripted = (...outcomes) => { const calls = { n: 0 }; return { calls, lookup: () => { const next = outcomes[Math.min(calls.n++, outcomes.length - 1)]; if (next instanceof Error) return Promise.reject(next); return Promise.resolve(next); } }; };
    const ok = { data: { id: 1 }, error: null }, missing = { data: null, error: null }, broken = { data: null, error: { message: 'upstream request timeout' } };

    resetReadPause();
    let s = scripted(ok);
    assert.deepEqual(await readPublished('글', s.lookup, { clock }), { id: 1 }); assert.equal(s.calls.n, 1);
    s = scripted(missing);
    assert.equal(await readPublished('글', s.lookup, { clock }), null, '정말 없는 글은 null(404 가 맞다)'); assert.equal(s.calls.n, 1, '없음은 다시 묻지 않는다');
    s = scripted(broken, ok);
    assert.deepEqual(await readPublished('글', s.lookup, { clock }), { id: 1 }, '일시 장애는 한 번 더 시도해 받는다'); assert.equal(s.calls.n, 2); assert.deepEqual(clock.sleeps, [300]);
    s = scripted(new Error('fetch failed'), ok);
    assert.deepEqual(await readPublished('글', s.lookup, { clock }), { id: 1 }, '네트워크 예외도 같은 장애로 본다');
    s = scripted(broken);
    await assert.rejects(readPublished('글', s.lookup, { clock }), (e) => e instanceof MagazineUnavailableError && /upstream request timeout/.test(e.message) && e.detail === broken.error, '읽지 못함은 null 이 아니라 예외');
    assert.equal(s.calls.n, 2);

    // 연속 실패 뒤에는 쉰다 — 장애 중인 데이터베이스를 요청마다 누르지 않는다. 종류가 다르면 막지 않는다.
    s = scripted(ok);
    await assert.rejects(readPublished('글', s.lookup, { clock }), MagazineUnavailableError, '쉬는 중에는 조회 없이 바로 예외'); assert.equal(s.calls.n, 0);
    assert.deepEqual(await readPublished('목록', s.lookup, { clock }), { id: 1 }, '다른 종류의 조회는 막지 않는다');
    clock.t += READ_PAUSE_MS + 1;
    s = scripted(ok);
    assert.deepEqual(await readPublished('글', s.lookup, { clock }), { id: 1 }, '쉬는 시간이 지나면 다시 조회'); assert.equal(s.calls.n, 1);
    assert.equal(queryDeadline().aborted, false);

    // ── 2) 글 상세 페이지: 2026-10-05 장애의 재현 ──────────────────
    const page = require('../app/renewal/magazine/[slug]/page.tsx');
    const params = { params: Promise.resolve({ slug: encodeURIComponent(SLUG) }) };
    const reset = () => { resetReadPause(); Object.assign(db, { article: ARTICLE, articleFailures: 0, listFails: false, articleCalls: 0, listCalls: 0, signals: 0 }); };

    reset();
    const element = await page.default(params);
    assert.ok(element && element.props, '정상이면 글이 그려진다');
    assert.equal(db.articleCalls, 1); assert.equal(db.listCalls, 1, '관련 글은 목록 캐시 한 번으로 고른다(글마다 쿼리 2개를 더 읽지 않는다)');
    assert.ok(db.signals >= 2, '글 조회와 목록 조회 모두 제한 시간 신호가 걸린다');
    const rendered = JSON.stringify(element);
    const relatedSlugs = [...rendered.matchAll(/"href":"\/magazine\/([^"]+)"/g)].map((m) => m[1]);
    assert.ok(!relatedSlugs.includes(SLUG), '자기 자신은 관련 글에 없다');
    assert.deepEqual(relatedSlugs.filter((x) => x.startsWith('other-')), ['other-1', 'other-3', 'other-2'], '같은 카테고리 먼저, 부족하면 최신순으로 3편');

    reset(); db.article = null;
    await assert.rejects(page.default(params), isNotFound, '정말 없는 글은 404');
    assert.equal(db.articleCalls, 1);

    // 핵심: 데이터베이스가 응답하지 않으면 404 가 아니라 오류 — 그래야 ISR 이 404 를 굳히지 않는다
    reset(); db.articleFailures = 99;
    await assert.rejects(page.default(params), (e) => !isNotFound(e) && e instanceof MagazineUnavailableError, '조회 실패는 404 가 아니다');
    assert.equal(db.articleCalls, 2, '한 번 더 시도');
    await assert.rejects(page.generateMetadata(params), (e) => !isNotFound(e) && e instanceof MagazineUnavailableError, '메타데이터도 "기사를 찾을 수 없습니다"로 굳히지 않는다');
    assert.equal(db.articleCalls, 2, '쉬는 중에는 데이터베이스를 다시 누르지 않는다');

    // 일시 장애는 다시 시도해 받는다
    reset(); db.articleFailures = 1;
    assert.ok((await page.default(params)).props); assert.equal(db.articleCalls, 2);

    // 목록(관련 글)만 못 읽어도 본문은 나간다
    reset(); db.listFails = true;
    const withoutRelated = await page.default(params);
    assert.ok(withoutRelated.props); assert.doesNotMatch(JSON.stringify(withoutRelated), /다른 글/);

    // 깨진 주소(잘못된 퍼센트 인코딩)는 정말 없는 글
    reset();
    await assert.rejects(page.default({ params: Promise.resolve({ slug: '%E0%A4%A' }) }), isNotFound);
    assert.equal(db.articleCalls, 0);

    // ── 3) 소스 규칙: 조회 실패를 없는 글로 되돌리는 코드가 다시 생기지 않게 ───────
    const pageSource = fs.readFileSync(path.join(root, 'app/renewal/magazine/[slug]/page.tsx'), 'utf8');
    const getMagazine = pageSource.slice(pageSource.indexOf('const getMagazine = cache('), pageSource.indexOf('const formatDate'));
    assert.match(getMagazine, /readPublished</); assert.match(getMagazine, /\.maybeSingle\(\)/);
    assert.doesNotMatch(getMagazine, /\.single\(\)/); assert.doesNotMatch(getMagazine, /error\s*\|\|\s*!data/);
    assert.equal((pageSource.match(/from\("magazines"\)/g) || []).length, 2, '글 조회 1 + 조회수 갱신 1 — 관련 글은 목록 캐시');
    const catalogueSource = fs.readFileSync(path.join(root, 'lib/renewal/magazine.ts'), 'utf8');
    assert.match(catalogueSource, /readPublished</); assert.match(catalogueSource, /abortSignal\(queryDeadline\(\)\)/);
    console.error = originalError;
    console.log('PASS: article 404 only when truly missing; lookup failure throws (never cached as 404) with retry, per-kind pause, timeouts; related articles come from the catalogue cache; metadata does not fake "not found"');
})().catch((error) => { console.error = originalError; console.error(error); process.exit(1); });
