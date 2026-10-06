/* 관리자 "변호사 직접 등록": 입력 검사, 계정→프로필 순서, 실패 시 계정 되돌리기, 중복 이메일, 관리자 인증, 비밀번호 비기록.
   Supabase 는 전부 가짜이고 .env 도 읽지 않는다(실제 계정을 만들지 않는다). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

const state = { users: [], lawyers: [], deleted: [], failLawyerInsert: false, logs: [] };
const fakeDb = {
    auth: { admin: {
        async createUser({ email, password, email_confirm, user_metadata }) {
            if (state.users.some((u) => u.email === email)) return { data: { user: null }, error: { message: 'A user with this email address has already been registered' } };
            if (password.length < 8) return { data: { user: null }, error: { message: 'Password should be at least 8 characters' } };
            const user = { id: `user-${state.users.length + 1}`, email, email_confirm, user_metadata };
            state.users.push(user);
            return { data: { user }, error: null };
        },
        async deleteUser(id) { state.deleted.push(id); state.users = state.users.filter((u) => u.id !== id); return { error: null }; },
    } },
    from(table) {
        assert.equal(table, 'lawyers');
        let payload;
        const b = {
            insert(p) { payload = p; return b; },
            select() { return b; },
            async single() {
                if (state.failLawyerInsert) return { data: null, error: { message: 'fixture insert failure' } };
                const row = { id: `lawyer-${state.lawyers.length + 1}`, ...payload };
                state.lawyers.push(row);
                return { data: { id: row.id, name: row.name, slug: row.slug, email: row.email }, error: null };
            },
        };
        return b;
    },
};
let adminOk = true;
const originalResolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
    if (name === 'next/server') return { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status || 200, headers: { 'Content-Type': 'application/json' } }) } };
    if (name === '@/lib/supabase/server') return { createServiceClient: () => fakeDb, createAdminClient: async () => fakeDb };
    if (name === '@/lib/admin-auth') return { verifyAdminToken: () => adminOk };
    return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const originalError = console.error;
console.error = (...args) => state.logs.push(args.map(String).join(' '));

const lib = require('../lib/admin-lawyer-create.ts');
const route = require('../app/api/admin/lawyers/route.ts');
const post = (body) => route.POST(new Request('http://x/api/admin/lawyers', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }));
const valid = { name: '강윤석', email: 'Lawandlow@Naver.com', password: 'fixture-pass-1', specialty: ['형사', '이혼/가사', '민사', '없는분야'], region: '충남', phone: '041-568-1114',
    officeName: '법무법인 정음 천안사무소', officeAddress: '천안시 동남구 청수14로 68 센타타워 307호', website: 'https://www.example.com', bio: '형사·이혼·민사 사건을 맡고 있습니다.' };

(async () => {
    // 1) 입력 검사
    assert.throws(() => lib.validateNewLawyer({ ...valid, name: ' ' }), /이름/);
    assert.throws(() => lib.validateNewLawyer({ ...valid, email: 'not-an-email' }), /이메일/);
    assert.throws(() => lib.validateNewLawyer({ ...valid, password: 'short' }), /8~72자/);
    assert.throws(() => lib.validateNewLawyer({ ...valid, specialty: ['없는분야'] }), /분야/);
    assert.throws(() => lib.validateNewLawyer({ ...valid, region: '화성' }), /지역/);
    assert.throws(() => lib.validateNewLawyer({ ...valid, website: 'www.example.com' }), /http/);
    const clean = lib.validateNewLawyer(valid);
    assert.equal(clean.email, 'lawandlow@naver.com', '이메일은 소문자로'); assert.deepEqual(clean.specialty, ['형사', '이혼/가사', '민사'], '없는 분야는 버린다');
    assert.equal(lib.makeLawyerSlug('Law.And_Low@naver.com', () => 'ab12'), 'lawandlow-ab12', '가입과 같은 주소 규칙');

    // 2) 관리자 인증
    adminOk = false; assert.equal((await post(valid)).status, 401); adminOk = true;
    assert.equal(state.users.length, 0);

    // 3) 정상 등록: 계정(이메일 인증 완료) → 프로필
    let res = await post(valid), data = await res.json();
    assert.equal(res.status, 201); assert.equal(data.lawyer.name, '강윤석'); assert.match(data.lawyer.slug, /^lawandlow-[a-z0-9]{1,4}$/);
    assert.equal(state.users[0].email_confirm, true); assert.equal(state.users[0].user_metadata.created_by, 'admin');
    const row = state.lawyers[0];
    assert.equal(row.user_id, state.users[0].id); assert.equal(row.office_name, '법무법인 정음 천안사무소'); assert.equal(row.region, '충남');
    assert.deepEqual(row.specialty, ['형사', '이혼/가사', '민사']); assert.equal(row.website_url, 'https://www.example.com');
    assert.ok(!JSON.stringify(state.lawyers).includes('fixture-pass-1'), '비밀번호는 프로필에 저장하지 않는다');

    // 4) 같은 이메일은 409, 계정이 늘지 않는다
    res = await post(valid);
    assert.equal(res.status, 409); assert.match((await res.json()).error, /이미 등록된 이메일/); assert.equal(state.users.length, 1);

    // 5) 프로필 저장 실패 → 방금 만든 계정을 지워 반쪽 계정을 남기지 않는다
    state.failLawyerInsert = true;
    res = await post({ ...valid, email: 'second@example.com' });
    assert.equal(res.status, 500); assert.match((await res.json()).error, /되돌렸습니다/);
    assert.equal(state.deleted.length, 1); assert.equal(state.users.some((u) => u.email === 'second@example.com'), false);
    state.failLawyerInsert = false;

    // 6) 잘못된 요청 본문, 비밀번호가 로그에 남지 않음
    res = await route.POST(new Request('http://x', { method: 'POST', body: 'not json' }));
    assert.equal(res.status, 400);
    assert.ok(!state.logs.join('\n').includes('fixture-pass-1'), '비밀번호는 로그에 남기지 않는다');
    console.error = originalError;
    console.log('PASS: admin lawyer registration validates input, creates confirmed login then profile (same slug rule as signup), 409 on duplicate email, rolls back the login when the profile fails, admin-only, never stores or logs the password');
})().catch((e) => { console.error = originalError; console.error(e); process.exit(1); });
