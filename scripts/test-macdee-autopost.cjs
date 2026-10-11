/* 맥디 블로그 자동 발행(lib/macdee-autopost): 칸 시각·쓰기·검수·발행·보류·재시도·멈춘 단계·수동 실행.
   DB·Claude·이미지·저장소는 전부 가짜이고 .env 도 읽지 않는다. 실행: node scripts/test-macdee-autopost.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// ── 가짜 DB ─────────────────────────────────────────────────────
let db;
let seq = 0;
function resetDb(lawyers) {
    db = { uploads: [], contents: [], lawyers };
}
function from(table) {
    const q = { op: 'select', filters: [], ins: [], likes: [], payload: null, wantRows: false };
    const match = (r) => q.filters.every(([k, v]) => r[k] === v)
        && q.ins.every(([k, vs]) => vs.includes(r[k]))
        && q.likes.every(([k, pat]) => new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(String(r[k])));
    const run = () => {
        const rows = db[table] || (db[table] = []);
        if (q.op === 'insert') {
            seq++;
            const row = { id: q.payload.id || `${table}-${seq}`, created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(), ...JSON.parse(JSON.stringify(q.payload)) };
            rows.push(row);
            return { data: q.single ? row : [row], error: null };
        }
        if (q.op === 'update') {
            const hit = rows.filter(match);
            for (const r of hit) Object.assign(r, JSON.parse(JSON.stringify(q.payload)));
            return { data: q.wantRows ? hit.map((r) => ({ id: r.id })) : null, error: null };
        }
        if (q.op === 'delete') { db[table] = rows.filter((r) => !match(r)); return { data: null, error: null }; }
        let found = rows.filter(match);
        if (q.orderKey) found = [...found].sort((a, b) => (a[q.orderKey] < b[q.orderKey] ? -1 : 1) * (q.asc ? 1 : -1));
        if (q.limitN != null) found = found.slice(0, q.limitN);
        const copy = JSON.parse(JSON.stringify(found));
        return { data: q.single || q.maybe ? (copy[0] || null) : copy, error: null };
    };
    const b = {
        select() { if (q.op === 'update' || q.op === 'insert') q.wantRows = true; return b; },
        insert(payload) { q.op = 'insert'; q.payload = payload; return b; },
        update(payload) { q.op = 'update'; q.payload = payload; return b; },
        delete() { q.op = 'delete'; return b; },
        eq(k, v) { q.filters.push([k, v]); return b; },
        in(k, vs) { q.ins.push([k, vs]); return b; },
        like(k, v) { q.likes.push([k, v]); return b; },
        order(k, o) { q.orderKey = k; q.asc = o?.ascending !== false; return b; },
        limit(n) { q.limitN = n; return b; },
        single() { q.single = true; return Promise.resolve(run()); },
        maybeSingle() { q.maybe = true; return Promise.resolve(run()); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return b;
}
const fakeDb = { from };

const originalResolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
    if (name === 'sharp') return () => { throw new Error('sharp 은 시험에서 쓰지 않는다'); };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => fakeDb };
    if (name === '@/lib/ai/claude-engine') return { claudeDispatch: () => () => { throw new Error('실제 Claude 호출 금지'); } };
    if (name === '@/lib/lawyer-blog-cache') return { refreshLawyerBlog() {} };
    return originalLoad.call(this, name, ...args);
};
for (const ext of ['.ts', '.tsx']) Module._extensions[ext] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: file }).outputText, file);

const run = require('../lib/macdee-autopost/run.ts');
const roster = require('../lib/macdee-autopost/roster.ts');

// ── 가짜 Claude·이미지 ──────────────────────────────────────────
const longParagraph = '협의이혼 숙려기간은 미성년 자녀가 있으면 3개월, 없으면 1개월입니다. 이 기간에는 양육비와 재산을 정리할 시간을 법이 보장합니다. '.repeat(8);
function article(overrides = {}) {
    return {
        title: '협의이혼 숙려기간 중 상대가 재산을 옮기면 어떻게 하나요',
        meta_description: '협의이혼 숙려기간에 배우자가 재산을 빼돌릴 때 쓸 수 있는 보전 절차와 판단 기준을 정리했습니다.',
        primary_keyword: '협의이혼 숙려기간 재산',
        keywords: ['협의이혼 숙려기간', '재산분할 가압류', '서울 이혼변호사'],
        answer_summary: '숙려기간에도 재산분할 청구권을 지키기 위한 가압류·처분금지가처분을 신청할 수 있습니다. 다만 이혼소송이나 재산분할심판을 함께 준비해야 합니다.',
        body: ['## 숙려기간에도 재산을 묶어 둘 수 있나요', longParagraph, '## 법원은 무엇을 보고 보전을 허락하나요', longParagraph, '## 어떤 재산부터 확인해야 하나요', longParagraph, '==핵심== 은 __근거__ 입니다.', '---', '## 변호사와 상의할 시점', longParagraph].join('\n\n'),
        faq: [{ q: '숙려기간에 가압류가 되나요?', a: '됩니다. 재산분할청구권을 피보전권리로 합니다.' }, { q: '상대가 이미 팔았다면?', a: '사해행위취소를 검토합니다.' }],
        image_scene: 'A kitchen table with two sets of house keys and a folded document.',
        image_alt: '식탁 위 열쇠 두 꾸러미와 접힌 서류',
        ...overrides,
    };
}
const claudeLog = [];
let writerReply = () => article();
let reviewerReply = () => ({ verdict: 'publish', problems: [], fixes: [] });
let reviewerStatus = 200;
function message(obj, status = 200) {
    return new Response(JSON.stringify(status === 200
        ? { content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(obj) }], stop_reason: 'end_turn', usage: { input_tokens: 1200, output_tokens: 6000 } }
        : { type: 'error', error: { type: 'overloaded_error', message: '잠시 과부하' } }), { status, headers: { 'Content-Type': 'application/json' } });
}
let clock = new Date('2026-10-12T00:05:00Z'); // 09:05 KST
const pings = [], refreshed = [];
let imageFails = false;
const deps = () => ({
    db: fakeDb,
    claude: async (stage, body) => {
        claudeLog.push({ stage, body });
        if (stage === '자동 발행 원고') return message(writerReply(body));
        return message(reviewerReply(body), reviewerStatus);
    },
    image: async () => { if (imageFails) throw new Error('이미지 모델 오류'); return Buffer.from('webp'); },
    upload: async (_db, lawyerId, contentId) => `https://cdn.example/autopost/${lawyerId}/${contentId}.webp`,
    refresh: (lawyerId, postId) => refreshed.push([lawyerId, postId]),
    ping: async (urls) => { pings.push(...urls); },
    now: () => clock,
    baseUrl: 'https://www.makethis1.com',
});
const at = (iso) => { clock = new Date(iso); };
const LAWYERS = roster.AUTOPOST_LAWYERS.filter((l) => l.key !== 'ohseungjun').map((l, i) => ({ id: `lawyer-${i}`, name: l.label.split(' ')[0], slug: l.slug, region: '서울', office_name: l.label.split('· ')[1] || null }));

(async () => {
    // 1) 시간표·의도
    assert.equal(roster.slotOpensAt(0, 0), 9 * 60);
    assert.equal(roster.slotOpensAt(5, 1), 15 * 60 + 200);
    for (let day = 0; day < 30; day++) for (let i = 0; i < 6; i++) assert.notEqual(roster.intentFor(day, i, 0), roster.intentFor(day, i, 1), '같은 날 두 편은 의도가 달라야 한다');
    assert.notEqual(roster.focusFor(roster.AUTOPOST_LAWYERS[1], 10, 0).field, roster.focusFor(roster.AUTOPOST_LAWYERS[1], 10, 1).field, '분야가 여럿이면 두 편이 다른 분야');

    // 2) 상태 보기 — 데이터베이스에 없는 변호사는 found=false
    resetDb(LAWYERS);
    let r = await run.runAutopost(deps(), { dryRun: true });
    assert.equal(r.did, 'dry-run');
    assert.equal(r.lawyers.length, 6);
    assert.equal(r.lawyers.find((l) => l.key === 'ohseungjun').found, false);
    assert.equal(r.lawyers[0].slots[0].opensAt, '09:00');
    assert.equal(db.uploads.length, 0);

    // 3) 조용한 시간에는 아무것도 하지 않는다
    at('2026-10-11T14:00:00Z'); // 23:00 KST
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'quiet-hours');

    // 4) 09:05 — 첫 변호사 오전 칸 쓰기 → 비공개 원고
    at('2026-10-12T00:05:00Z');
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'write', JSON.stringify(r));
    assert.equal(db.uploads.length, 1);
    const up = db.uploads[0];
    assert.equal(up.file_url, 'autopost:kara-yujieun:2026-10-12:0:1');
    assert.equal(up.status, 'ready', JSON.stringify(up.structured_data));
    assert.equal(up.structured_data.autopost.stage, 'written');
    assert.equal(db.contents.length, 1);
    const draft = db.contents[0];
    assert.equal(draft.status, 'draft');
    assert.equal(draft.channel, 'google');
    assert.ok(draft.body.startsWith('숙려기간에도'), '본문은 요약으로 시작');
    assert.ok(draft.body.includes('## 자주 묻는 질문') && draft.body.includes('### 숙려기간에 가압류가 되나요?'));
    assert.ok(draft.body.includes('**핵심**') && !draft.body.includes('==') && !draft.body.includes('__') && !/^---$/m.test(draft.body));
    assert.ok(draft.body.trimEnd().endsWith('달라질 수 있습니다.*'));
    assert.deepEqual(draft.schema_markup.map((f) => f.q), ['숙려기간에 가압류가 되나요?', '상대가 이미 팔았다면?']);
    assert.ok(draft.tags.includes('서울 이혼변호사'));
    const writerCall = claudeLog.at(-1);
    assert.equal(writerCall.body.output_config.effort, 'high');
    assert.equal(writerCall.body.output_config.format.type, 'json_schema');
    assert.match(writerCall.body.messages[0].content, /이혼\/가사/);

    // 5) 09:15 — 검수·발행: 고침 적용, 표지, 캐시·IndexNow
    reviewerReply = () => ({ verdict: 'publish', problems: ['재산분할 표현 보완'], fixes: [{ before: '사해행위취소를 검토합니다.', after: '처분된 재산은 사해행위취소 소송을 검토합니다.' }] });
    at('2026-10-12T00:15:00Z');
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'review-publish', JSON.stringify(r));
    const pub = db.contents[0];
    assert.equal(pub.status, 'published');
    assert.equal(pub.card_news_data.coverImageUrl, `https://cdn.example/autopost/lawyer-0/${pub.id}.webp`);
    assert.equal(pub.card_news_data.coverAlt, '식탁 위 열쇠 두 꾸러미와 접힌 서류');
    assert.ok(pub.body.includes('처분된 재산은 사해행위취소 소송을 검토합니다.'));
    assert.equal(pub.schema_markup[1].a, '처분된 재산은 사해행위취소 소송을 검토합니다.');
    assert.equal(pub.created_at, '2026-10-12T00:15:00.000Z');
    assert.equal(db.uploads[0].structured_data.autopost.stage, 'published');
    assert.equal(db.uploads[0].structured_data.autopost.fixesApplied, 1);
    assert.equal(pings.length, 1);
    assert.match(pings[0], /^https:\/\/www\.makethis1\.com\/blog\/86jinsong-pq4c\/%ED%98%91/);
    assert.deepEqual(refreshed[0], ['lawyer-0', pub.id]);
    assert.equal(claudeLog.at(-1).body.output_config.effort, 'medium');

    // 6) 같은 시각 다시 — 다음 변호사는 09:40 부터라 할 일 없음
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'nothing-due');
    assert.equal(r.lawyers[0].slots[0].state, 'published');
    assert.equal(r.lawyers[0].slots[0].url, pings[0]);

    // 7) 보류 → 같은 칸 두 번째 시도(다른 의도) → 또 보류 → 포기
    reviewerReply = () => ({ verdict: 'hold', problems: ['핵심 기한이 틀림'], fixes: [] });
    writerReply = () => article({ title: '정음 첫 원고 제목입니다 충분히 길게' });
    at('2026-10-12T00:45:00Z'); // 09:45 — 정음(2번째 변호사) 오전 칸 열림
    r = await run.runAutopost(deps());
    assert.equal(r.detail.key, 'jeongeum');
    const firstIntent = db.uploads.at(-1).structured_data.autopost.intent;
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'review-publish');
    assert.ok(r.detail.held.includes('핵심 기한이 틀림'));
    assert.equal(db.contents.at(-1).status, 'failed', '보류 원고는 공개하지 않는다');
    writerReply = () => article({ title: '정음 두 번째 원고 제목도 충분히 길게' });
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'write');
    assert.equal(db.uploads.at(-1).file_url, 'autopost:jeongeum:2026-10-12:0:2');
    assert.notEqual(db.uploads.at(-1).structured_data.autopost.intent, firstIntent, '두 번째 시도는 다른 의도');
    r = await run.runAutopost(deps());
    assert.ok(r.detail.held);
    r = await run.runAutopost(deps({}));
    const jeongeum = r.lawyers.find((l) => l.key === 'jeongeum');
    assert.equal(jeongeum.slots[0].state, 'gave-up');
    assert.equal(jeongeum.slots[0].attempts, 2);

    // 8) 검수자 뒤에도 광고 위험 표현이 남으면 보류
    reviewerReply = () => ({ verdict: 'publish', problems: [], fixes: [] });
    writerReply = () => article({ title: '양영 원고 제목 충분히 길게 씁니다', answer_summary: '저희는 이혼 전문 변호사로서 무조건 승소를 돕습니다. 숙려기간 설명입니다.' });
    at('2026-10-12T01:25:00Z'); // 10:25 — 양영(3번째) 칸 열림
    r = await run.runAutopost(deps());
    assert.equal(r.detail.key, 'yangyoung-jeonghun');
    r = await run.runAutopost(deps());
    assert.match(r.detail.held, /광고 규정 위험 표현.*'전문' 표기.*결과 보장/);

    // 9) 원고 형식 문제(짧은 본문) → 그 시도 실패, 원고 저장 없음
    writerReply = () => article({ title: '이정도 짧은 원고', body: '## 하나\n짧다' });
    at('2026-10-12T02:05:00Z'); // 11:05 — 이정도(4번째) 칸 열림, 양영 2차 시도가 먼저(10:20)
    const contentsBefore = db.contents.length;
    r = await run.runAutopost(deps());
    assert.equal(r.detail.key, 'yangyoung-jeonghun', '먼저 열린 칸(재시도)부터');
    assert.match(r.detail.error, /본문이 너무 짧습니다/);
    assert.equal(db.contents.length, contentsBefore);
    assert.equal(db.uploads.at(-1).status, 'failed');

    // 10) 검수 호출 일시 오류 → 같은 원고로 다시 검수(새로 쓰지 않음), 세 번째에 실패
    writerReply = () => article({ title: '이정도 음주운전 재범 실형 기준 원고' });
    r = await run.runAutopost(deps());
    assert.equal(r.detail.key, 'il-leejeongdo');
    reviewerStatus = 529;
    const writes = claudeLog.filter((c) => c.stage === '자동 발행 원고').length;
    r = await run.runAutopost(deps());
    assert.ok(r.detail.retryReview, JSON.stringify(r.detail));
    r = await run.runAutopost(deps());
    assert.ok(r.detail.retryReview);
    r = await run.runAutopost(deps());
    assert.ok(r.detail.failed, '세 번째 검수 오류는 실패');
    assert.equal(claudeLog.filter((c) => c.stage === '자동 발행 원고').length, writes, '검수 재시도는 원고를 새로 쓰지 않는다');
    reviewerStatus = 200;

    // 11) 멈춘 쓰기(15분 넘게 processing) → 실패로 정리하고 다음 시도
    resetDb(LAWYERS);
    db.uploads.push({ id: 'stuck', lawyer_id: 'lawyer-0', file_url: 'autopost:kara-yujieun:2026-10-12:0:1', status: 'processing', created_at: '2026-10-12T00:00:00Z',
        structured_data: { autopost: { stage: 'writing', stageAt: '2026-10-12T00:01:00Z', key: 'kara-yujieun', slot: 0, attempt: 1, field: '이혼/가사', intent: 'x' } } });
    at('2026-10-12T00:10:00Z'); // 9분 — 아직 진행 중
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'nothing-due');
    assert.equal(r.lawyers[0].slots[0].state, 'writing');
    at('2026-10-12T00:20:00Z'); // 19분 — 멈춘 것으로 본다
    writerReply = () => article({ title: '유지은 재시도 원고 제목 충분히 길게' });
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'write');
    assert.equal(db.uploads.find((u) => u.id === 'stuck').status, 'failed');
    assert.equal(db.uploads.at(-1).file_url, 'autopost:kara-yujieun:2026-10-12:0:2');

    // 12) 이미지 실패해도 사진 없이 발행
    imageFails = true;
    r = await run.runAutopost(deps());
    assert.equal(r.did, 'review-publish');
    assert.ok(r.detail.published && r.detail.imageError);
    assert.equal(db.contents.at(-1).status, 'published');
    assert.equal(db.contents.at(-1).card_news_data.coverImageUrl, undefined);
    imageFails = false;

    // 13) 수동 실행(?lawyer=) — 조용한 시간·칸 시각과 상관없이, 하루 2편 제한은 그대로
    resetDb(LAWYERS);
    at('2026-10-12T18:00:00Z'); // 03:00 KST(10/13)
    writerReply = () => article({ title: `수동 실행 원고 ${Math.random()} 충분히 길게` });
    r = await run.runAutopost(deps(), { onlyKey: 'geunal-leejieun' });
    assert.equal(r.did, 'write');
    assert.equal(db.uploads[0].file_url, 'autopost:geunal-leejieun:2026-10-13:0:1');
    r = await run.runAutopost(deps(), { onlyKey: 'geunal-leejieun' });
    assert.equal(r.did, 'review-publish');
    r = await run.runAutopost(deps(), { onlyKey: 'geunal-leejieun' });
    assert.equal(db.uploads.at(-1).file_url, 'autopost:geunal-leejieun:2026-10-13:1:1', '두 번째 칸');
    r = await run.runAutopost(deps(), { onlyKey: 'geunal-leejieun' });
    r = await run.runAutopost(deps(), { onlyKey: 'geunal-leejieun' });
    assert.equal(r.did, 'nothing-due', '하루 2편을 넘지 않는다');
    r = await run.runAutopost(deps(), { onlyKey: 'ohseungjun' });
    assert.equal(r.did, 'unknown-or-unavailable-lawyer');

    // 14) 끄기
    process.env.MACDEE_AUTOPOST_DISABLED = 'true';
    r = await run.runAutopost(deps(), { onlyKey: 'kara-yujieun' });
    assert.equal(r.did, 'disabled');
    delete process.env.MACDEE_AUTOPOST_DISABLED;

    // 15) 광고 위험 판별 — 의료 감정의 '전문가'는 걸지 않는다
    assert.deepEqual(run.adRisks('법원은 전문가 감정 결과를 봅니다.'), []);
    assert.deepEqual(run.adRisks('의료 전문 변호사'), ["'전문' 표기"]);
    assert.deepEqual(run.adRisks('과실 100%로 본 판단'), []);

    console.log('test-macdee-autopost: 모두 통과');
})().catch((e) => { console.error(e); process.exit(1); });
