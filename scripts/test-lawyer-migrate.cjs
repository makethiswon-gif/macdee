/* 관리자 "변호사 블로그 옮기기": 네이버 목록·본문 읽기, 살짝 다듬기·원문 모드, 저장·중복 건너뛰기·되돌리기, 관리자 경로.
   네이버·AI·DB 는 전부 가짜이고 .env 도 읽지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ── 가짜 DB ─────────────────────────────────────────────────────
const db = { uploads: [], contents: [], lawyers: [{ id: '11111111-2222-3333-4444-555555555555', name: '강윤석', slug: 'lawandlow-ab12', region: '충남', office_name: '법무법인 정음 천안사무소' }], failContentInsert: false, log: [] };
function from(table) {
    const q = { table, op: 'select', filters: [], payload: null, likes: [] };
    const run = () => {
        const rows = db[table] || [];
        const match = (r) => q.filters.every(([k, v]) => r[k] === v) && q.likes.every(([k, pat]) => new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(String(r[k])));
        if (q.op === 'insert') {
            if (table === 'contents' && db.failContentInsert) return { data: null, error: { message: 'fixture insert failure' } };
            const row = { id: q.payload.id || `up-${rows.length + 1}`, ...q.payload };
            rows.push(row); db.log.push([table, 'insert', row]);
            return { data: q.single ? { id: row.id } : [row], error: null };
        }
        if (q.op === 'delete') { const before = rows.length; db[table] = rows.filter((r) => !match(r)); db.log.push([table, 'delete', before - db[table].length]); return { data: null, error: null }; }
        const found = rows.filter(match);
        return { data: q.single || q.maybe ? (found[0] || null) : found.slice(0, q.limitN ?? found.length), error: null };
    };
    const b = {
        select() { if (q.op !== 'insert') q.op = q.op === 'delete' ? 'delete' : 'select'; return b; },
        insert(payload) { q.op = 'insert'; q.payload = payload; return b; },
        delete() { q.op = 'delete'; return b; },
        eq(k, v) { q.filters.push([k, v]); return b; }, like(k, v) { q.likes.push([k, v]); return b; },
        order() { return b; }, limit(n) { q.limitN = n; return b; },
        single() { q.single = true; return Promise.resolve(run()); }, maybeSingle() { q.maybe = true; return Promise.resolve(run()); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return b;
}
let adminOk = true, rewriterReply = '', rewriterCalls = [];
const originalResolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status || 200, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } }) } };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => ({ from }) };
    if (name === '@/lib/admin-auth') return { verifyAdminToken: () => adminOk };
    if (name === '@/lib/ai/providers') return { getMigrationRewriter: () => ({ async generate(messages, opts) { rewriterCalls.push({ messages, opts }); return { content: typeof rewriterReply === 'function' ? rewriterReply(messages) : rewriterReply, usage: { input_tokens: 100, output_tokens: 900 } }; } }) };
    return originalLoad.call(this, name, ...args);
};
for (const ext of ['.ts', '.tsx']) Module._extensions[ext] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file }).outputText, file);

const blog = require('../lib/naver-blog.ts');
const migrate = require('../lib/naver-migrate.ts');

// ── 가짜 네이버 ─────────────────────────────────────────────────
const POST_HTML = `<html><head><meta property="og:title" content="og 제목"></head><body>
<div class="se-main-container">
  <div class="se-component se-documentTitle"><span class="se-title-text">상속포기 기간 끝난 뒤 알게된 부모님 빚</span></div>
  <div class="se-component se-text"><p class="se-text-paragraph">상속포기 기한이 지난 뒤 독촉장이 왔다면</p><p class="se-text-paragraph">특별한정승인을 검토합니다.</p><p class="se-text-paragraph">\u200b</p><p class="se-text-paragraph">기한은 안 날부터 3개월입니다.</p></div>
  <div class="se-component se-image"><img src="x.jpg"><p class="se-text-paragraph">사진 설명</p></div>
  <div class="se-component se-sectionTitle"><p class="se-text-paragraph">특별한정승인 요건</p></div>
  <div class="se-component se-quotation"><div class="se-quote"><p class="se-text-paragraph">중대한 과실 없이 몰랐어야 합니다.</p></div></div>
  <div class="se-component se-table"><table><tr><td>구분</td><td>기한</td></tr><tr><td>한정승인</td><td>3개월</td></tr></table></div>
  <div class="se-component se-table"><table><tr><td>'3개월이 지났으니 끝난 줄 알았습니다'</td></tr></table></div>
  <div class="se-component se-horizontalLine"></div>
  <div class="se-component se-text"><ul><li><p class="se-text-paragraph">가족관계증명서</p></li><li><p class="se-text-paragraph">기본증명서</p></li></ul></div>
  <div class="se-component se-video"><p class="se-text-paragraph">영상 자막</p></div>
  <div class="se-component se-text"><p class="se-text-paragraph">대표전화 041-568-1114</p></div>
</div></body></html>`;
const listPage = (page) => JSON.stringify({ totalCount: '4', postList: page === 1
    ? [{ logNo: '224000000001', title: encodeURIComponent('상속포기 기간 끝난 뒤').replace(/%20/g, '+'), addDate: '1시간 전', categoryNo: '38' }, { logNo: '224000000002', title: encodeURIComponent("변호사's 소개"), addDate: '2024. 7. 22.', categoryNo: '6' }, { logNo: '224000000003', title: '%EC%9D%B4%ED%98%BC', addDate: '2020. 11. 10.', categoryNo: '12' }]
    : [{ logNo: '224000000004', title: '%ED%98%95%EC%82%AC', addDate: '2019. 1. 31.', categoryNo: '34' }] }).replace(/'/g, "\\'");
const fakeFetch = async (url) => {
    const u = String(url);
    if (u.includes('WidgetListAsync')) return new Response('<a href="?categoryNo=6">변호사 소개</a><a href="?categoryNo=38">민사</a><a href="?categoryNo=12">재판상 이혼</a><a href="?categoryNo=34">형사</a>');
    if (u.includes('PostTitleListAsync')) return new Response(listPage(Number(new URL(u).searchParams.get('currentPage'))));
    if (u.startsWith('https://m.blog.naver.com/lawandlow/')) return new Response(POST_HTML);
    throw new Error('unexpected fetch ' + u);
};
global.fetch = fakeFetch;

(async () => {
    // 1) 주소·날짜
    assert.equal(blog.parseBlogId('lawandlow'), 'lawandlow');
    assert.equal(blog.parseBlogId('https://blog.naver.com/lawandlow'), 'lawandlow');
    assert.equal(blog.parseBlogId('https://m.blog.naver.com/lawandlow/224000000001'), 'lawandlow');
    assert.equal(blog.parseBlogId('https://blog.naver.com/PostView.naver?blogId=lawandlow&logNo=1'), 'lawandlow');
    assert.equal(blog.parseBlogId('한글 아이디'), null);
    const now = new Date('2026-10-06T05:00:00Z');
    assert.equal(blog.parseNaverDate('2026. 10. 1.', now), '2026-10-01T00:00:00.000Z', '그날 09:00 KST');
    assert.equal(blog.parseNaverDate('1시간 전', now), now.toISOString());
    assert.equal(blog.parseNaverDate('어제', now), '2026-10-05T05:00:00.000Z');

    // 2) 본문: 텍스트만, 구조 보존, 끊긴 줄 잇기, 사진·영상 버리기
    const md = blog.naverHtmlToMarkdown(POST_HTML);
    assert.equal(md.title, '상속포기 기간 끝난 뒤 알게된 부모님 빚');
    assert.match(md.body, /독촉장이 왔다면 특별한정승인을 검토합니다\./, '문장 중간의 줄바꿈은 잇는다');
    assert.match(md.body, /\n\n기한은 안 날부터 3개월입니다\./, '빈 문단은 문단 경계');
    assert.match(md.body, /## 특별한정승인 요건/); assert.match(md.body, /> 중대한 과실 없이 몰랐어야 합니다\./);
    assert.match(md.body, /- 구분 — 기한\n- 한정승인 — 3개월/); assert.match(md.body, /- 가족관계증명서\n- 기본증명서/);
    assert.match(md.body, /\n\n'3개월이 지났으니 끝난 줄 알았습니다'\n\n/, '칸 하나짜리 표(강조 상자)는 목록이 아니라 문단');
    assert.match(md.body, /\n---\n/); assert.match(md.body, /대표전화 041-568-1114/);
    assert.doesNotMatch(md.body, /사진 설명|영상 자막|\u200b/, '사진·영상 설명은 옮기지 않는다');

    // 3) 전체 목록(쪽 넘김·인코딩·카테고리 이름)
    const list = await blog.listNaverPosts('lawandlow', { delayMs: 0, now });
    assert.equal(list.total, 4); assert.equal(list.posts.length, 4);
    assert.equal(list.posts[0].title, '상속포기 기간 끝난 뒤'); assert.equal(list.posts[1].title, "변호사's 소개");
    assert.equal(list.posts[1].categoryName, '변호사 소개'); assert.equal(list.posts[3].date, '2019-01-31T00:00:00.000Z');
    assert.ok(blog.NON_LEGAL_CATEGORY.test('변호사 소개') && !blog.NON_LEGAL_CATEGORY.test('재판상 이혼'));

    // 4) 응답 해석·제목 정리·분량 지키기
    assert.deepEqual(migrate.parseMigrationOutput('===TITLE===\n특별한정승인 기한\n===META===\n설명\n===BODY===\n본문'), { title: '특별한정승인 기한', meta: '설명', body: '본문' });
    assert.equal(migrate.cleanMigratedTitle('"상속포기 기한 지난 뒤 빚 | 네이버 블로그"', 'x'), '상속포기 기한 지난 뒤 빚');
    assert.equal(migrate.cleanMigratedTitle('', '원제목'), '원제목');
    assert.equal(migrate.polishKeepsLength('가'.repeat(100), '가'.repeat(80)), true);
    assert.equal(migrate.polishKeepsLength('가'.repeat(100), '가'.repeat(60)), false, '요약은 안 된다');
    assert.equal(migrate.polishKeepsLength('가'.repeat(100), '가'.repeat(150)), false, '덧붙이기도 안 된다');

    // 5) 살짝 다듬기로 옮기기 — 저장 형태
    const lawyer = db.lawyers[0];
    rewriterReply = (messages) => `===TITLE===\n상속포기 기한 지난 뒤 부모님 빚, 특별한정승인으로 해결\n===META===\n상속포기 기한이 지난 뒤 빚을 알게 됐다면 특별한정승인을 검토합니다.\n===BODY===\n${messages[1].content.split('[원문]\n')[1].replace('검토합니다', '검토해야 합니다')}`;
    let r = await migrate.migrateNaverPost({ db: { from }, lawyer, blogId: 'lawandlow', logNo: '224000000001', date: '2026-10-06T00:00:00.000Z', mode: 'polish', publish: true });
    assert.equal(r.ok, true); assert.equal(r.skipped, undefined); assert.equal(r.note, undefined);
    assert.equal(r.title, '상속포기 기한 지난 뒤 부모님 빚, 특별한정승인으로 해결'); assert.equal(r.originalTitle, '상속포기 기간 끝난 뒤 알게된 부모님 빚');
    assert.match(rewriterCalls[0].messages[0].content, /살짝만/); assert.equal(rewriterCalls[0].opts.maxTokens, 8000);
    const saved = db.contents[0];
    assert.equal(saved.channel, 'google'); assert.equal(saved.status, 'published'); assert.equal(saved.created_at, '2026-10-06T00:00:00.000Z');
    assert.equal(saved.lawyer_id, lawyer.id); assert.match(saved.body, /검토해야 합니다/); assert.match(saved.slug, /^상속포기-기한-지난-뒤-부모님-빚-특별한정승인으로-해결-[0-9a-f]{6}$/);
    assert.equal(db.uploads[0].file_url, 'https://blog.naver.com/lawandlow/224000000001'); assert.equal(db.uploads[0].type, 'url'); assert.equal(saved.upload_id, db.uploads[0].id);
    // 같은 글은 다시 옮기지 않는다(AI 호출도 없다)
    const callsBefore = rewriterCalls.length;
    r = await migrate.migrateNaverPost({ db: { from }, lawyer, blogId: 'lawandlow', logNo: '224000000001', mode: 'polish', publish: true });
    assert.equal(r.skipped, true); assert.equal(rewriterCalls.length, callsBefore); assert.equal(db.contents.length, 1);
    // 요약해 버린 윤문은 버리고 원문을 쓴다
    rewriterReply = '===TITLE===\n짧아진 글\n===META===\n설명\n===BODY===\n요약 한 줄';
    r = await migrate.migrateNaverPost({ db: { from }, lawyer, blogId: 'lawandlow', logNo: '224000000002', mode: 'polish', publish: false });
    assert.match(r.note, /원문을 그대로/); assert.equal(db.contents[1].body, md.body); assert.equal(db.contents[1].status, 'review');
    // 원문 그대로 모드: 본문은 원문, 제목·설명만 새로(본문 앞부분만 보냄)
    rewriterReply = '===TITLE===\n이혼 소송 준비\n===META===\n설명입니다';
    r = await migrate.migrateNaverPost({ db: { from }, lawyer, blogId: 'lawandlow', logNo: '224000000003', mode: 'raw', publish: true });
    assert.equal(db.contents[2].body, md.body); assert.equal(db.contents[2].title, '이혼 소송 준비'); assert.equal(rewriterCalls.at(-1).opts.maxTokens, 800);
    // 글 저장이 실패하면 원문 기록을 되돌려 다음에 다시 옮길 수 있다
    db.failContentInsert = true;
    await assert.rejects(migrate.migrateNaverPost({ db: { from }, lawyer, blogId: 'lawandlow', logNo: '224000000004', mode: 'raw', publish: true }), /저장하지 못했습니다/);
    assert.equal(db.uploads.filter((u) => u.file_url.endsWith('224000000004')).length, 0); db.failContentInsert = false;

    // 6) 관리자 경로
    const route = require('../app/api/admin/lawyer-migrate/route.ts');
    adminOk = false; assert.equal((await route.GET(new Request('http://x/api/admin/lawyer-migrate'))).status, 401); adminOk = true;
    let res = await route.GET(new Request('http://x/api/admin/lawyer-migrate'));
    assert.equal((await res.json()).lawyers[0].name, '강윤석');
    res = await route.GET(new Request(`http://x/api/admin/lawyer-migrate?blogId=${encodeURIComponent('https://blog.naver.com/lawandlow')}&lawyerId=${lawyer.id}`));
    let data = await res.json();
    assert.equal(data.blogId, 'lawandlow'); assert.equal(data.posts.length, 4); assert.deepEqual(data.migrated.sort(), ['224000000001', '224000000002', '224000000003']);
    const post = (payload) => route.POST(new Request('http://x', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }));
    assert.equal((await post({ lawyerId: lawyer.id, blogId: 'lawandlow', items: [] })).status, 400);
    assert.equal((await post({ lawyerId: lawyer.id, blogId: 'lawandlow', items: [1, 2, 3, 4].map((n) => ({ logNo: `22400000000${n}` })) })).status, 400, '한 번에 3편까지');
    assert.equal((await post({ lawyerId: '99999999-2222-3333-4444-555555555555', blogId: 'lawandlow', items: [{ logNo: '224000000004' }] })).status, 404);
    rewriterReply = '===TITLE===\n형사 고소 절차\n===META===\n설명';
    res = await post({ lawyerId: lawyer.id, blogId: 'lawandlow', mode: 'raw', items: [{ logNo: '224000000001' }, { logNo: '224000000004', date: '2019-01-31T00:00:00.000Z' }] });
    data = await res.json();
    assert.equal(data.results[0].skipped, true); assert.equal(data.results[1].ok, true); assert.equal(data.lawyerSlug, 'lawandlow-ab12');
    assert.equal(db.contents.at(-1).created_at, '2019-01-31T00:00:00.000Z');
    console.log('PASS: Naver list paging/decoding/categories, SE3 text-only markdown (headings, quotes, tables, lists, joined lines, media dropped), light polish keeps length else original, raw mode, dedupe without AI calls, rollback on save failure, admin GET/POST validation and results');
})().catch((e) => { console.error(e); process.exit(1); });
