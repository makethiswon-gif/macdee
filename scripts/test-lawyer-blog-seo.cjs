/* 변호사 공개 블로그(/blog, /blog/{변호사}, /blog/{변호사}/{글}) SEO 기반 회귀 시험(2026-10-08).
   - 데이터베이스를 읽지 못하면 404 가 아니라 예외(5xx, 캐시 안 됨). 정말 없는 글·변호사만 404.
   - ISR(1시간) + 바뀐 페이지만 태그로 바로 비우기, ?page=N 은 캐시되는 내부 경로로.
   - /blog 목록: 공개 slug + 공개 글 1편 이상인 변호사만, 지역·분야별. 사이트맵·푸터·/lawfirm-blog 링크.
   데이터베이스·네트워크는 전부 메모리 가짜이고, .env 도 읽지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ── 가짜 데이터베이스 ───────────────────────────────────────────
const L1 = { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: '김정웅', slug: 'ddrzzangna-xb35', region: '전남', specialty: ['민사', '형사', '기타'], bio: '광주·전남 민사 형사', profile_image_url: 'data:image/png;base64,AAAA', office_name: '법무법인 양영앤정훈', office_address: '광주', experience_years: 10, brand_color: '#123456', website_url: 'https://example.com', phone: '010-0000-0000', created_at: '2026-01-01T00:00:00Z' };
const L2 = { ...L1, id: 'aaaaaaaa-0000-4000-8000-000000000002', name: '내부', slug: 'b69960f8', region: '경기', created_at: '2026-01-02T00:00:00Z' }; // 내부 ID slug — 비공개
const L3 = { ...L1, id: 'aaaaaaaa-0000-4000-8000-000000000003', name: '빈블로그', slug: 'empty-firm', region: '서울', created_at: '2026-01-03T00:00:00Z' }; // 공개 글 없음
const L4 = { ...L1, id: 'aaaaaaaa-0000-4000-8000-000000000004', name: '이서울', slug: 'seoul-firm', region: '서울', specialty: ['형사', '이혼/가사'], office_name: null, created_at: '2026-01-04T00:00:00Z' };
const uuid = (n) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, '0')}`;
const day = (n) => new Date(Date.UTC(2026, 8, 1) + n * 86400000).toISOString();
const posts = [];
for (let n = 1; n <= 25; n++) posts.push({ id: uuid(n), upload_id: n === 25 ? 'up-25' : null, lawyer_id: L1.id, channel: n % 2 ? 'google' : 'macdee', title: `민사 칼럼 ${n} - google`, body: `## 본문 ${n}\n\n내용입니다.`, meta_description: n === 25 ? null : `요약 ${n}`, tags: ['민사'], schema_markup: null, status: 'published', slug: `민사-칼럼-${n}`, created_at: day(n), updated_at: day(n) });
posts.push({ ...posts[0], id: uuid(90), slug: '검토중-글', status: 'review', created_at: day(40) }); // 미발행
posts.push({ ...posts[0], id: uuid(91), slug: '인스타-글', channel: 'instagram', upload_id: 'up-25', body: JSON.stringify([{ slide: 1, text: '카드1' }]), card_news_data: { coverImageUrl: 'https://img.example/cover.png' }, created_at: day(41) });
for (let n = 1; n <= 3; n++) posts.push({ ...posts[0], id: uuid(100 + n), lawyer_id: L4.id, slug: `형사-칼럼-${n}`, title: `형사 칼럼 ${n}`, created_at: day(n) });
posts.push({ ...posts[0], id: uuid(110), lawyer_id: L4.id, channel: 'macdee', slug: '형사-칼럼-3-ai', title: '형사 칼럼 3', created_at: day(2.9) }); // 같은 원고의 다른 채널 판(같은 제목)
posts.push({ ...posts[0], id: uuid(200), lawyer_id: L2.id, slug: '내부-글' });
const tables = { lawyers: [L1, L2, L3, L4], contents: posts };
const db = { failures: { lawyers: 0, contents: 0 }, calls: { lawyers: 0, contents: 0 }, signals: 0, tags: new Set(), revalidated: [] };

function builder(table) {
    let rows = [...tables[table]];
    let from = 0, to = Infinity, wantCount = false;
    const b = {
        select(fields, options) { wantCount = options?.count === 'exact'; return b; },
        eq(key, value) { rows = rows.filter((r) => r[key] === value); return b; },
        in(key, values) { rows = rows.filter((r) => values.includes(r[key])); return b; },
        gte(key, value) { rows = rows.filter((r) => r[key] >= value); return b; },
        lte(key, value) { rows = rows.filter((r) => r[key] <= value); return b; },
        order(key, options = {}) { rows.sort((a, c) => String(a[key]).localeCompare(String(c[key])) * (options.ascending === false ? -1 : 1)); return b; },
        range(a, z) { from = a; to = z; return b; },
        limit(n) { to = from + n - 1; return b; },
        abortSignal(signal) { assert.ok(signal instanceof AbortSignal, '조회마다 제한 시간 신호를 건다'); db.signals++; return b; },
        result() {
            db.calls[table]++;
            if (db.failures[table] > 0) { db.failures[table]--; return { data: null, count: null, error: { message: 'upstream request timeout' } }; }
            const total = rows.length;
            if (wantCount && from > 0 && from >= total) return { data: null, count: null, error: { code: 'PGRST103', message: 'Requested range not satisfiable' } };
            return { data: rows.slice(from, to + 1), count: wantCount ? total : null, error: null };
        },
        maybeSingle() {
            const r = b.result();
            if (r.error) return Promise.resolve(r);
            if (r.data.length > 1) return Promise.resolve({ data: null, error: { message: 'multiple rows' } });
            return Promise.resolve({ data: r.data[0] ?? null, error: null });
        },
        then(resolve, reject) { return Promise.resolve(b.result()).then(resolve, reject); },
    };
    return b;
}

// ── 모듈 가짜 ───────────────────────────────────────────────────
class NotFound extends Error { constructor() { super('NEXT_NOT_FOUND'); this.digest = 'NEXT_HTTP_ERROR_FALLBACK;404'; } }
class Redirect extends Error { constructor(url) { super('NEXT_REDIRECT'); this.url = url; } }
const originalResolve = Module._resolveFilename;
const originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) {
    return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args);
};
Module._load = function (name, ...args) {
    if (name === 'next/navigation') return { notFound() { throw new NotFound(); }, permanentRedirect(url) { throw new Redirect(url); } };
    if (name === 'next/link') return { __esModule: true, default: function Link() {} };
    if (name === 'next/cache') return {
        unstable_cache: (fn, keys, options = {}) => { (options.tags || []).forEach((tag) => db.tags.add(tag)); return fn; },
        revalidateTag(tag, profile) { db.revalidated.push(['tag', tag, profile]); },
        revalidatePath(route) { db.revalidated.push(['path', route]); },
    };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from: builder }), createAdminClient: async () => ({ from: builder }) };
    if (name === '@/components/renewal/primitives') return new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? target[key] : function Fixture() {}) });
    if (/(Post|Blog)PageClient$/.test(name)) return { __esModule: true, default: function ClientFixture() {} };
    return originalLoad.call(this, name, ...args);
};
for (const extension of ['.ts', '.tsx']) {
    Module._extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
    }).outputText, file);
}
const originalError = console.error;
console.error = () => {};

const { resetReadPause, PublicReadError } = require('../lib/public-read.ts');
const isNotFound = (e) => e instanceof NotFound;
const unavailable = (e) => !isNotFound(e) && e instanceof PublicReadError;
const reset = () => { resetReadPause(); Object.assign(db, { failures: { lawyers: 0, contents: 0 }, calls: { lawyers: 0, contents: 0 }, signals: 0, tags: new Set(), revalidated: [] }); };
const find = (element, predicate) => {
    // 렌더 결과(React 요소 트리)에서 조건에 맞는 요소의 props 를 찾는다.
    const stack = [element];
    while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node)) { stack.push(...node); continue; }
        if (node.props && predicate(node)) return node.props;
        if (node.props && node.props.children) stack.push(node.props.children);
    }
    return null;
};
const clientProps = (element) => find(element, (node) => typeof node.type === 'function' && node.type.name === 'ClientFixture');

(async () => {
    // ── 1) 쪽 주소: ?page=N 은 캐시되는 내부 경로로, 내부 경로로 직접 오면 공개 주소로 ──────────
    const { lawyerBlogPaging } = require('../lib/lawyer-blog-paging.ts');
    assert.deepEqual(lawyerBlogPaging('/blog/seoul-firm', '3'), { rewrite: '/blog/seoul-firm/p/3' });
    assert.equal(lawyerBlogPaging('/blog/seoul-firm', null), null, '1쪽은 그대로');
    assert.equal(lawyerBlogPaging('/blog/seoul-firm', '1'), null);
    assert.equal(lawyerBlogPaging('/blog/seoul-firm', 'abc'), null, '숫자가 아니면 1쪽(예전과 같음)');
    assert.equal(lawyerBlogPaging('/blog/seoul-firm', '999999999'), null, '터무니없는 쪽 번호는 1쪽');
    assert.deepEqual(lawyerBlogPaging('/blog/%EC%A0%95-1', '2'), { rewrite: '/blog/%EC%A0%95-1/p/2' }, '인코딩된 변호사 주소는 그대로 옮긴다');
    assert.deepEqual(lawyerBlogPaging('/blog/seoul-firm/p/4', null), { redirect: '/blog/seoul-firm?page=4' }, '내부 경로 직접 접근은 공개 주소로');
    assert.deepEqual(lawyerBlogPaging('/blog/seoul-firm/p/1', null), { redirect: '/blog/seoul-firm' });
    assert.equal(lawyerBlogPaging('/blog/seoul-firm/%EB%AF%BC%EC%82%AC', '2'), null, '글 주소는 건드리지 않는다');
    assert.equal(lawyerBlogPaging('/blog', '2'), null, '/blog 목록은 건드리지 않는다');
    assert.equal(lawyerBlogPaging('/blog/seoul-firm/p', null), null, '"p" 라는 글 주소는 글 페이지');

    // ── 2) 글 페이지: 정상 / 정말 없음 / 읽지 못함 ─────────────────────
    const postPage = require('../app/blog/[slug]/[postSlug]/page.tsx');
    const postParams = (slug, postSlug) => ({ params: Promise.resolve({ slug, postSlug }) });
    const p25 = postParams('ddrzzangna-xb35', encodeURIComponent('민사-칼럼-25'));

    reset();
    const page = await postPage.default(p25);
    const props = clientProps(page);
    assert.ok(props, '정상이면 글이 그려진다');
    assert.equal(props.post.title, '민사 칼럼 25', '채널 꼬리표(- google)를 뗀 제목');
    assert.deepEqual(props.post.card_news_slides, [{ slide: 1, text: '카드1' }], '같은 원고의 카드뉴스');
    assert.equal(props.post.card_news_cover_image, 'https://img.example/cover.png');
    assert.equal(props.lawyer.website_url, null, '글 페이지 화면은 예전 그대로(홈페이지 버튼 없음)');
    assert.deepEqual(props.relatedPosts.map((p) => p.slug), ['민사-칼럼-24', '민사-칼럼-23', '민사-칼럼-22', '민사-칼럼-21'], '가장 새 글은 이전 글 4편');
    assert.ok(db.tags.has('lawyer-blog') && db.tags.has(`lawyer-blog:${L1.id}`) && db.tags.has(`lawyer-blog-post:${uuid(25)}`), '글 페이지에 비우기용 태그가 달린다');
    assert.ok(!db.tags.has(`lawyer-blog-list:${L1.id}`), '있는 글은 목록 태그로 비우지 않는다(새 글마다 모든 글을 다시 만들지 않게)');
    assert.ok(db.signals >= 4, '조회마다 제한 시간');
    const article = JSON.parse(find(page, (node) => node.props.type === 'application/ld+json' && /"Article"/.test(node.props.dangerouslySetInnerHTML.__html)).dangerouslySetInnerHTML.__html);
    assert.equal(article.image, undefined, '프로필 data: URL 은 구조화 데이터 image 로 쓰지 않는다(주소가 아니다)');
    assert.equal(article.headline, '민사 칼럼 25');

    reset();
    const middle = clientProps(await postPage.default(postParams('ddrzzangna-xb35', '민사-칼럼-10')));
    assert.deepEqual(middle.relatedPosts.map((p) => p.slug), ['민사-칼럼-12', '민사-칼럼-11', '민사-칼럼-9', '민사-칼럼-8'], '중간 글은 앞뒤 2편씩 — 오래된 글도 링크를 받는다');
    reset();
    const oldest = clientProps(await postPage.default(postParams('ddrzzangna-xb35', '민사-칼럼-1')));
    assert.deepEqual(oldest.relatedPosts.map((p) => p.slug), ['민사-칼럼-5', '민사-칼럼-4', '민사-칼럼-3', '민사-칼럼-2'], '가장 오래된 글은 다음 글 4편');

    const meta = await postPage.generateMetadata(p25);
    assert.equal(meta.title, '민사 칼럼 25 | 김정웅 변호사');
    assert.equal(meta.alternates.canonical, 'https://www.makethis1.com/blog/ddrzzangna-xb35/민사-칼럼-25');
    assert.deepEqual(meta.robots, { index: true, follow: true });
    assert.deepEqual(meta.openGraph.images, ['/og-image.png'], 'data: URL 프로필 사진은 공유 이미지로 쓰지 않는다');
    assert.match(meta.description, /^본문 25 내용입니다\.$/, '요약이 없으면 본문에서');

    // 정말 없는 글 → 404, 그 변호사 목록 태그(글이 발행되면 404 캐시도 함께 비운다)
    for (const missing of ['없는-글', '검토중-글', '인스타-글', '내부-글']) {
        reset();
        await assert.rejects(postPage.default(postParams('ddrzzangna-xb35', encodeURIComponent(missing))), isNotFound, `${missing}: 404`);
        assert.ok(db.tags.has(`lawyer-blog-list:${L1.id}`), `${missing}: 404 도 목록 태그로 비울 수 있다`);
        const missingMeta = await postPage.generateMetadata(postParams('ddrzzangna-xb35', encodeURIComponent(missing)));
        assert.equal(missingMeta.robots.index, false);
    }
    reset();
    await assert.rejects(postPage.default(postParams('no-such-lawyer', '글')), isNotFound, '없는 변호사 404');
    await assert.rejects(postPage.default(postParams('b69960f8', '내부-글')), isNotFound, '비공개 slug 404');
    reset();
    await assert.rejects(postPage.default(postParams('ddrzzangna-xb35', '%E0%A4%A')), isNotFound, '깨진 주소 404');
    assert.equal(db.calls.lawyers + db.calls.contents, 0, '깨진 주소는 데이터베이스를 읽지 않는다');

    // UUID 옛 주소 → slug 주소로 영구 이동
    reset();
    await assert.rejects(postPage.default(postParams('ddrzzangna-xb35', uuid(3))), (e) => e instanceof Redirect && e.url === `/blog/ddrzzangna-xb35/${encodeURIComponent('민사-칼럼-3')}`);

    // 핵심: 데이터베이스가 응답하지 않으면 404 가 아니라 오류 — ISR 이 404 를 굳히지 않고 검색 로봇은 나중에 다시 온다
    reset(); db.failures.lawyers = 99;
    await assert.rejects(postPage.default(p25), unavailable, '변호사 조회 실패는 404 가 아니다');
    assert.equal(db.calls.lawyers, 2, '한 번 더 시도');
    await assert.rejects(postPage.generateMetadata(p25), unavailable, '메타데이터도 "포스트를 찾을 수 없습니다"로 굳히지 않는다');
    assert.equal(db.calls.lawyers, 2, '연속 실패 뒤에는 잠시 데이터베이스를 누르지 않는다');
    reset(); db.failures.contents = 99;
    await assert.rejects(postPage.default(p25), unavailable, '글 조회 실패도 404 가 아니다');
    reset(); db.failures.lawyers = 1;
    assert.ok(clientProps(await postPage.default(p25)), '일시 장애는 다시 시도해 받는다');
    // 앞뒤 글·카드뉴스만 못 읽으면 본문은 낸다
    reset();
    const realContents = tables.contents;
    let contentReads = 0;
    tables.contents = new Proxy(realContents, { get(target, key) { if (key === Symbol.iterator) { contentReads++; if (contentReads > 1) db.failures.contents = 2; } return Reflect.get(target, key); } });
    const degraded = clientProps(await postPage.default(p25));
    tables.contents = realContents;
    assert.ok(degraded && degraded.post.title === '민사 칼럼 25', '부가 정보를 못 읽어도 본문은 나간다');

    // ── 3) 블로그 홈·?page=N ──────────────────────────────────────────
    const homePage = require('../app/blog/[slug]/page.tsx');
    const listPage = require('../app/blog/[slug]/p/[page]/page.tsx');
    reset();
    const home = clientProps(await homePage.default({ params: Promise.resolve({ slug: 'ddrzzangna-xb35' }) }));
    assert.equal(home.posts.length, 10); assert.equal(home.totalCount, 25); assert.equal(home.totalPages, 3);
    assert.equal(home.posts[0].slug, '민사-칼럼-25', '최신순');
    assert.equal(home.archivePosts.length, 15, '11번째부터 지난 글(최대 60편)');
    assert.ok(!home.posts.concat(home.archivePosts).some((p) => /검토중|인스타/.test(p.slug)), '미발행·비공개 채널 글은 목록에 없다');
    assert.ok(db.tags.has(`lawyer-blog-list:${L1.id}`) && db.tags.has(`lawyer-blog:${L1.id}`));
    const homeMeta = await homePage.generateMetadata({ params: Promise.resolve({ slug: 'ddrzzangna-xb35' }) });
    assert.equal(homeMeta.alternates.canonical, 'https://www.makethis1.com/blog/ddrzzangna-xb35');
    assert.deepEqual(homeMeta.robots, { index: true, follow: true });
    assert.deepEqual(homeMeta.openGraph.images, ['/og-image.png']);

    reset();
    const second = clientProps(await listPage.default({ params: Promise.resolve({ slug: 'ddrzzangna-xb35', page: '2' }) }));
    assert.equal(second.currentPage, 2); assert.equal(second.posts[0].slug, '민사-칼럼-15'); assert.deepEqual(second.archivePosts, [], '지난 글 목록은 1쪽만');
    const secondMeta = await listPage.generateMetadata({ params: Promise.resolve({ slug: 'ddrzzangna-xb35', page: '2' }) });
    assert.equal(secondMeta.alternates.canonical, 'https://www.makethis1.com/blog/ddrzzangna-xb35?page=2', '2쪽은 자기 주소가 canonical(1쪽으로 합치지 않는다)');
    assert.match(secondMeta.title, /2페이지/);
    assert.equal(secondMeta.robots.index, true);
    reset();
    await assert.rejects(listPage.default({ params: Promise.resolve({ slug: 'ddrzzangna-xb35', page: '9' }) }), isNotFound, '편수를 넘는 쪽은 404(PostgREST 416 은 장애가 아니다)');
    assert.ok(db.tags.has(`lawyer-blog-list:${L1.id}`), '넘친 쪽의 404 도 글이 늘면 비워진다');
    for (const bad of ['1', '0', 'abc', '02x']) {
        await assert.rejects(listPage.default({ params: Promise.resolve({ slug: 'ddrzzangna-xb35', page: bad }) }), isNotFound, `내부 경로 ${bad}: 404`);
    }
    reset();
    const empty = clientProps(await homePage.default({ params: Promise.resolve({ slug: 'empty-firm' }) }));
    assert.equal(empty.totalCount, 0);
    assert.equal((await homePage.generateMetadata({ params: Promise.resolve({ slug: 'empty-firm' }) })).robots.index, false, '글이 없는 블로그는 색인하지 않는다');
    reset(); db.failures.contents = 99;
    await assert.rejects(homePage.default({ params: Promise.resolve({ slug: 'ddrzzangna-xb35' }) }), unavailable, '목록 조회 실패는 404 가 아니다');
    reset(); db.failures.lawyers = 99;
    await assert.rejects(homePage.generateMetadata({ params: Promise.resolve({ slug: 'ddrzzangna-xb35' }) }), unavailable);
    reset();
    await assert.rejects(homePage.default({ params: Promise.resolve({ slug: 'test-firm' }) }), isNotFound, '시험용 slug 404');

    // ── 4) /blog 목록 ─────────────────────────────────────────────────
    const { getLawyerBlogDirectory, groupByRegion, groupBySpecialty } = require('../lib/lawyer-blog.ts');
    reset();
    const directory = await getLawyerBlogDirectory();
    assert.deepEqual(directory.map((e) => e.slug), ['ddrzzangna-xb35', 'seoul-firm'], '공개 slug + 공개 글 1편 이상만, 글이 많은 순');
    assert.equal(directory[0].postCount, 25, '미발행·인스타그램 글은 세지 않는다');
    assert.deepEqual(directory[0].recent.map((p) => p.slug), ['민사-칼럼-25', '민사-칼럼-24', '민사-칼럼-23']);
    assert.equal(directory[0].latestAt, day(25));
    assert.equal(directory[1].postCount, 4);
    assert.deepEqual(directory[1].recent.map((p) => p.title), ['형사 칼럼 3', '형사 칼럼 2', '형사 칼럼 1'], '같은 제목(채널만 다른 판)은 최근 글에 한 번만');
    assert.deepEqual(groupByRegion(directory).map((g) => g.region), ['서울', '전남'], '지역은 정한 순서');
    assert.deepEqual(groupBySpecialty(directory).map((g) => g.specialty), ['형사', '민사', '이혼/가사'], '분야는 변호사가 많은 순, "기타"는 뺀다');
    const hub = require('../app/(marketing)/blog/page.tsx');
    reset();
    const hubElement = await hub.default();
    // 카드 컴포넌트(LawyerBlogCard)는 펼쳐서 그 안의 링크까지 본다.
    const expand = (node) => {
        if (Array.isArray(node)) return node.map(expand);
        if (!node || typeof node !== 'object' || !node.props) return node;
        if (typeof node.type === 'function' && node.type.name === 'LawyerBlogCard') return expand(node.type(node.props));
        return { ...node, props: { ...node.props, children: expand(node.props.children) } };
    };
    const hubJson = JSON.stringify(expand(hubElement));
    assert.match(hubJson, /"href":"\/blog\/ddrzzangna-xb35"/, '각 블로그 홈 링크');
    assert.match(hubJson, /"href":"\/blog\/ddrzzangna-xb35\/민사-칼럼-25"/, '최근 글 링크');
    assert.doesNotMatch(hubJson, /b69960f8|empty-firm/, '비공개·빈 블로그는 없다');
    assert.ok(db.tags.has('lawyer-blog-hub'), '목록 페이지도 글이 바뀌면 비워진다');
    assert.equal(hub.revalidate, 3600);
    assert.equal(hub.metadata.alternates.canonical, 'https://www.makethis1.com/blog');
    reset(); db.failures.contents = 99;
    await assert.rejects(hub.default(), unavailable, '목록을 못 읽으면 빈 목록을 1시간 굳히지 않고 오류');

    // ── 5) 캐시 비우기 ─────────────────────────────────────────────────
    const { refreshLawyerBlog } = require('../lib/lawyer-blog-cache.ts');
    reset();
    refreshLawyerBlog({ lawyerId: L1.id, postIds: [uuid(1), uuid(1), null] });
    assert.deepEqual(db.revalidated, [
        ['tag', `lawyer-blog-list:${L1.id}`, { expire: 0 }],
        ['tag', `lawyer-blog-post:${uuid(1)}`, { expire: 0 }],
        ['tag', 'lawyer-blog-hub', { expire: 0 }],
        ['path', '/sitemap.xml'],
        ['path', '/rss.xml'],
    ], '글 하나: 그 글·그 변호사 목록·/blog·사이트맵·RSS 를 바로 만료');
    reset();
    refreshLawyerBlog({ lawyerId: L1.id, whole: true });
    assert.deepEqual(db.revalidated[0], ['tag', `lawyer-blog:${L1.id}`, { expire: 0 }], '변호사 정보·일괄 변경은 그 변호사 블로그 전체');

    // ── 6) 소스 규칙 ──────────────────────────────────────────────────
    const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
    for (const file of ['app/blog/[slug]/page.tsx', 'app/blog/[slug]/p/[page]/page.tsx', 'app/blog/[slug]/[postSlug]/page.tsx', 'app/(marketing)/blog/page.tsx']) {
        const source = read(file).replace(/^\s*\/\/.*$/gm, ''); // 주석은 빼고 본다
        assert.doesNotMatch(source, /force-dynamic/, `${file}: 캐시를 끄지 않는다`);
        assert.match(source, /export const revalidate = 3600;/, `${file}: 1시간 ISR`);
        assert.doesNotMatch(source, /searchParams/, `${file}: searchParams 를 읽으면 캐시되지 않는다`);
        if (file.includes('[')) assert.match(source, /export function generateStaticParams\(\)/, `${file}: 빈 generateStaticParams 가 있어야 방문한 주소를 캐시한다`);
    }
    for (const file of ['app/blog/[slug]/blog-home.tsx', 'app/blog/[slug]/[postSlug]/page.tsx', 'lib/lawyer-blog.ts']) {
        const source = read(file).replace(/^\s*\/\/.*$/gm, '');
        assert.doesNotMatch(source, /\.single\(\)/, `${file}: .single() 은 "없음"과 "실패"를 섞는다`);
        assert.doesNotMatch(source, /fetch\(/, `${file}: 자기 사이트 API 를 다시 부르지 않는다`);
    }
    const writers = {
        'app/api/publish/route.ts': /refreshLawyerBlog\(\{ lawyerId: content\.lawyer_id, postIds: \[content_id\] \}\)/,
        'app/api/contents/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, postIds: \[id\] \}\)[\s\S]*refreshLawyerBlog\(\{ lawyerId: lawyer\.id, postIds: \[id\] \}\)/,
        'app/api/admin/unpublish/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, whole: true \}\)/,
        'app/api/admin/seo-titles/apply/route.ts': /refreshLawyerBlog\(\{ lawyerId, postIds \}\)/,
        'app/api/admin/backfill-ai-search/route.ts': /refreshLawyerBlog\(\{ lawyerId, postIds \}\)/,
        'app/api/admin/blog-posts/sync-site/route.ts': /refreshLawyerBlog\(\{ lawyerId: profile\.lawyer_id, postIds: \[contentId\] \}\)/,
        'app/api/admin/lawyer-migrate/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, postIds: published \}\)/,
        'app/api/profile/route.ts': /refreshLawyerBlog\(\{ lawyerId: data\?\.id, whole: true \}\)/,
        'app/api/profile/image/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, whole: true \}\)/,
        'app/api/admin/lawyers/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, whole: true \}\)/,
        'app/api/blog/write/route.ts': /refreshLawyerBlog\(\{ lawyerId: lawyer\.id, postIds: \[data\.id\] \}\)/,
    };
    for (const [file, pattern] of Object.entries(writers)) {
        const source = read(file);
        assert.match(source, pattern, `${file}: 글·변호사 정보를 바꾸면 블로그 캐시를 비운다`);
        assert.match(source, /import \{ refreshLawyerBlog \} from "@\/lib\/lawyer-blog-cache";/, `${file}: import`);
    }
    const middleware = read('middleware.ts');
    assert.ok(middleware.indexOf('lawyerBlogPaging(') < middleware.indexOf('updateSession(request)'), '내부 경로 돌려보내기는 세션 처리 전에');
    assert.match(middleware, /NextResponse\.rewrite\(url\)/);
    assert.doesNotMatch(read('next.config.ts'), /source: "\/blog", destination: "\/magazine"/, '/blog 는 더 이상 매거진으로 보내지 않는다');
    assert.match(read('components/renewal/SiteFooter.tsx'), /\{ label: "변호사 블로그", href: "\/blog" \}/, '공통 푸터에서 /blog 로');
    assert.match(read('data/renewal/services.ts'), /showcase: \{ label: "운영 중인 변호사 블로그 보기", href: "\/blog" \}/, '/lawfirm-blog 에서 /blog 로');
    assert.match(read('components/renewal/ServicePage.tsx'), /service\.showcase &&/);
    assert.match(read('app/blog/[slug]/BlogPageClient.tsx'), /const pageHref = \(page: number\) => `\/blog\/\$\{lawyer\.slug\}\$\{page > 1 \? `\?page=\$\{page\}` : ""\}`;/, '쪽 링크는 블로그 주소 기준 절대 경로');
    assert.match(read('app/sitemap.xml/route.ts'), /add\(`\$\{SITE_BASE\}\/blog`/, '사이트맵에 /blog');

    console.error = originalError;
    console.log('PASS: lawyer blog 404 only when truly missing (DB failure throws, never cached as 404) with retry/pause/timeouts; ISR 1h with ID tags (post/list/lawyer/hub) and immediate refresh from every writer; ?page=N rewritten to a cached path with self canonical; neighbour links; /blog hub lists public lawyers with posts by region/field; sitemap/footer/lawfirm-blog links');
})().catch((error) => { console.error = originalError; console.error(error); process.exit(1); });
