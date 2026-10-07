/* 2·3번(신뢰·상담) 카드 사진 돌려 쓰기(2026-10-07): 글마다 다른 승인 사진, 한 글 안에서 두 카드는 서로 다른 사진,
   같은 원고는 늘 같은 사진, 모든 호출부가 원고 열쇠를 넘긴다. 저장소·네트워크 없음. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
    if (name === '@/lib/supabase/server') return { createServiceClient: () => { throw new Error('No storage in this test'); } };
    if (name === '@napi-rs/canvas') return { createCanvas: () => { throw new Error('unused'); }, loadImage: async () => ({}) , GlobalFonts: { registerFromPath() {} } };
    return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { pickEditorialStudioIndex } = require('../lib/lawyer-studio/blog.ts');

const edition = 'editorial-three-v1:mmlhi2x25zu2h';
// 1) 사진이 1장이면 둘 다 그 사진
assert.equal(pickEditorialStudioIndex(1, edition, 'info', 'a'), 0); assert.equal(pickEditorialStudioIndex(1, edition, 'contact', 'a'), 0);
// 2) 2장 이상이면 한 글 안에서 신뢰·상담은 늘 다른 사진, 같은 원고는 늘 같은 선택
for (const count of [2, 3, 4, 5, 9]) {
    const seen = new Map();
    for (let i = 0; i < 2000; i++) {
        const key = `source-${i}`;
        const info = pickEditorialStudioIndex(count, edition, 'info', key), contact = pickEditorialStudioIndex(count, edition, 'contact', key);
        assert.ok(info >= 0 && info < count && contact >= 0 && contact < count);
        assert.notEqual(info, contact, `${count}장: 한 글 안에서 같은 사진이면 안 된다`);
        assert.equal(pickEditorialStudioIndex(count, edition, 'info', key), info, '같은 원고는 같은 사진');
        seen.set(info, (seen.get(info) || 0) + 1);
    }
    // 3) 글마다 고르게 돈다(각 사진이 기대치의 70~130%)
    assert.equal(seen.size, count, `${count}장 모두 쓰인다`);
    for (const [, n] of seen) assert.ok(n > (2000 / count) * 0.7 && n < (2000 / count) * 1.3, `${count}장 분포 ${[...seen.values()]}`);
}
// 4) 원고 열쇠가 없으면(예비 점검) 예전처럼 변호사마다 고정
assert.equal(pickEditorialStudioIndex(6, edition, 'info'), pickEditorialStudioIndex(6, edition, 'info'));
// 5) 실제 효과: 오승준(승인 9장 가정) 연속 20편에서 2번 사진이 몇 종류 나오나
const kinds = new Set(Array.from({ length: 20 }, (_, i) => pickEditorialStudioIndex(9, edition, 'info', `post-${i}`)));
assert.ok(kinds.size >= 6, `20편에 사진 ${kinds.size}종`);

// 6) 호출부: 제작·재사용 지문·시험 렌더가 모두 원고 열쇠(sourceHash)를 넘긴다 — 하나라도 빠지면 기획과 제작의 사진이 어긋난다
const gd = fs.readFileSync(path.join(root, 'app/api/admin/blog-images/generate-design/route.ts'), 'utf8');
const calls = [...gd.matchAll(/editorialStudio(?:Selection|Photo)\(([^)]*)\)/g)].map((m) => m[1]);
assert.ok(calls.length >= 5, '제작 경로의 호출 수');
for (const args of calls) assert.match(args, /plan\.sourceHash/, `원고 열쇠 누락: ${args}`);
const planRoute = fs.readFileSync(path.join(root, 'app/api/admin/blog-images/plan/route.ts'), 'utf8');
for (const args of [...planRoute.matchAll(/editorialStudioPhoto\(([^)]*)\)/g)].map((m) => m[1])) assert.match(args, /planIdentity\.source/, `기획 경로 원고 열쇠 누락: ${args}`);
console.log('PASS: studio photo rotation — per-article selection evenly spread, info and contact never the same photo, stable per manuscript, every call site passes the article key');
