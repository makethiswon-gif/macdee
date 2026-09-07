// Opt-in AI smoke test: synthetic evidence only, no database reads or writes.
// node --env-file=.env.local scripts/check-portal-strategy-ai.cjs --run
if (!process.argv.includes('--run')) { console.log('Pass --run to make one paid AI request using synthetic evidence only.'); process.exit(0); }
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
function loadTs(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module); mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
    const normalRequire = mod.require.bind(mod);
    mod.require = id => id.startsWith('@/') ? loadTs(path.join(root, id.slice(2)) + '.ts') : normalRequire(id);
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    return mod.exports;
}
(async () => {
    const { generateStrategyWithAI } = loadTs(path.join(root, 'lib/portal-strategy-service.ts'));
    const pack = {
        counts: { records: 2, requests: 1, worklogs: 1, messages: 0 },
        aggregates: { 'record.분야': { 상속: 2 }, 'request.상태': { 접수: 1 } }, coverageNotes: [],
        evidence: [
            { id: 'record:10000000-0000-4000-8000-000000000001', kind: 'record', date: '2026-08-15', text: '검증용 가상 자료: 상속 상담에서 재산 파악 절차, 상속포기·한정승인 차이, 상담 준비서류에 대한 질문이 있었다. 유입경로와 실제 수임 결과는 미상이다.' },
            { id: 'record:10000000-0000-4000-8000-000000000002', kind: 'record', date: '2026-08-21', text: '검증용 가상 자료: 상속재산 분할 절차와 공동상속인 협의가 어려울 때의 상담 준비 질문이 있었다. 실제 사건 결과, 광고비, 검색량 정보는 없다.' },
            { id: 'request:20000000-0000-4000-8000-000000000001', kind: 'request', date: '2026-08-25', text: '검증용 가상 요청: 상속 분야 콘텐츠를 보강하고 홈페이지에 상담 전 준비자료 안내를 추가해 달라. 상태 접수. 긴급하지 않다.' },
            { id: 'worklog:30000000-0000-4000-8000-000000000001', kind: 'worklog', date: '2026-08-28', text: '검증용 가상 업무: 블로그와 홈페이지의 상담 안내 문구를 점검했다. 성과 수치는 측정하지 않았다.' },
        ],
    };
    const started = Date.now();
    const result = await generateStrategyWithAI(pack, '2026-08', AbortSignal.timeout(75000));
    assert.ok(result.report.summary);
    assert.ok(result.report.topics.length > 0 && result.report.topics.length <= 20);
    assert.ok(result.report.requestSummary.some(r => r.requestId === '20000000-0000-4000-8000-000000000001'));
    const out = path.join(root, '.next', 'portal-strategy-qa'); fs.mkdirSync(out, { recursive: true });
    const stats = { synthetic: true, databaseAccess: false, elapsedMs: Date.now() - started, model: result.model, topics: result.report.topics.length, priorities: result.report.priorities.length, requestSummaries: result.report.requestSummary.length };
    fs.writeFileSync(path.join(out, 'ai-smoke.json'), JSON.stringify({ ...stats, report: result.report }, null, 2));
    console.log(JSON.stringify(stats));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
