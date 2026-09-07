// LOCAL QA ONLY. Synthetic data and in-memory writes; never deploy as an app route.
// Start Next separately with ADMIN_ID=qa-owner, ADMIN_TOKEN_SECRET=portal-local-qa-only.
// node scripts/portal-strategy-qa-server.cjs [upstreamPort=3104] [port=3105]
const http = require('node:http');
const crypto = require('node:crypto');
const upstreamPort = Number(process.argv[2] || 3104);
const port = Number(process.argv[3] || 3105);
if (port === upstreamPort || !Number.isInteger(port)) throw new Error('Invalid QA ports');
const now = new Date().toISOString();
const kst = new Date(Date.now() + 9 * 3600000);
const month = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
const firms = [
    { id: '10000000-0000-4000-8000-000000000001', name: '검증용 가상 로펌 A' },
    { id: '10000000-0000-4000-8000-000000000002', name: '검증용 가상 로펌 B' },
];
const requestId = '20000000-0000-4000-8000-000000000001';
const reportBody = {
    summary: 'QA 가상 자료입니다. 실제 고객·성과가 아닙니다. 반복되는 상속 절차 질문을 콘텐츠와 홈페이지 안내에 함께 반영하는 방향을 검토합니다.',
    signals: [{ title: '상담 전 준비자료 안내 필요', detail: '가상 상담 기록에서 절차와 준비서류에 관한 질문이 확인됩니다.', evidenceIds: ['record:qa-record-1'] }],
    priorities: [{ title: '상속 상담 안내 동선 점검', action: '블로그 설명과 홈페이지 상담 안내의 질문·답변 구성을 맞춥니다.', channel: '블로그·홈페이지', reason: '상담 전 필요한 정보를 먼저 제공해 문의 내용을 구체화합니다.', evidenceIds: ['record:qa-record-1', `request:${requestId}`] }],
    topics: Array.from({ length: 12 }, (_, i) => ({
        title: `상속 상담 전에 확인할 질문 ${i + 1} — QA 주제`, keyword: '상속 상담 준비',
        intent: '상담 전 필요한 정보 확인', angle: '가상 사례로 만든 검증용 방향입니다. 실제 게시 전 변호사의 사실·법률 검토가 필요합니다.',
        channel: i % 3 === 0 ? '블로그·인스타그램' : '블로그', priority: i < 3 ? '높음' : '보통', evidenceIds: ['record:qa-record-1'],
    })),
    requestSummary: [{ requestId, summary: '상속 분야 안내 콘텐츠 요청', suggestedAction: '요청 범위와 준비자료를 확인하고 주제 우선순위를 조정합니다.' }],
    gaps: ['실제 광고비·상담 전환율 데이터가 없는 검증용 보고서입니다.'],
    nextMonthFocus: '익명화된 상담 질문을 정리하고 콘텐츠와 상담 안내에 반영합니다.',
};
const reports = [{ id: '30000000-0000-4000-8000-000000000001', firm_id: firms[0].id, report_month: month + '-01', status: 'completed', report: reportBody, source_counts: { records: 8, requests: 2, worklogs: 4, messages: 3 }, model: 'qa-fixture-not-an-ai-call', error_message: null, created_at: now, updated_at: now, generated_at: now }];
const requests = Array.from({ length: 13 }, (_, i) => ({
    id: i === 0 ? requestId : `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    firm_id: firms[i % 2].id, firm_name: firms[i % 2].name,
    title: i === 0 ? '상속 분야 콘텐츠를 보강해 주세요 — QA' : `홈페이지 안내 수정 요청 ${i + 1} — QA`,
    body: '가상 요청입니다. 상담 전에 준비할 자료를 홈페이지에도 쉽게 안내하고 싶습니다. 실제 고객 자료는 포함하지 않았습니다.',
    category: i % 2 ? '홈페이지' : '블로그·콘텐츠', priority: i === 0 ? '긴급' : '보통',
    status: ['접수', '진행중', '완료', '보류'][i % 4], due_date: i === 0 ? '2026-08-20' : null,
    admin_note: '대표만 보이는 QA 내부 메모', created_by: 'firm', created_at: now, updated_at: now,
}));
const stats = { aiCalls: 0, requestCreates: 0, requestUpdates: 0 };
const payload = `qa-owner:${Date.now()}:qa-only`;
const token = Buffer.from(payload + ':' + crypto.createHmac('sha256', 'portal-local-qa-only').update(payload).digest('hex')).toString('base64url');
function json(res, body, status = 200, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(body));
}
async function body(req) {
    let value = ''; for await (const chunk of req) { value += chunk; if (value.length > 30000) throw new Error('QA body too large'); }
    return JSON.parse(value || '{}');
}
http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        const client = /qa_role=firm/.test(req.headers.cookie || '');
        if (url.pathname === '/__qa/stats') return json(res, stats);
        if (url.pathname === '/api/admin/auth') return json(res, { authenticated: true, username: 'qa-owner' });
        if (url.pathname === '/api/portal/auth') return json(res, { firm: firms[0] }, 200, { 'Set-Cookie': 'qa_role=firm; Path=/; SameSite=Lax' });
        if (url.pathname === '/api/portal/firms') return json(res, { firms });
        if (url.pathname === '/api/portal/records') return json(res, { records: [] });
        if (url.pathname === '/api/portal/advice') return json(res, { advice: [], today: now.slice(0, 10) });
        if (url.pathname === '/api/portal/worklog') return json(res, { worklogs: [] });
        if (url.pathname === '/api/portal/messages') return json(res, { messages: [] });
        if (url.pathname === '/api/admin/client-strategy') {
            if (req.method === 'POST') {
                const input = await body(req); stats.aiCalls++;
                let report = reports.find(r => r.firm_id === input.firmId && r.report_month.startsWith(input.month));
                if (!report) { report = { ...reports[0], id: crypto.randomUUID(), firm_id: input.firmId, report_month: input.month + '-01' }; reports.push(report); }
                return json(res, { report, reused: false });
            }
            const selectedMonth = url.searchParams.get('month') || month;
            return json(res, { month: selectedMonth, firms, reports: reports.filter(r => r.report_month.startsWith(selectedMonth) && (!url.searchParams.get('firm') || r.firm_id === url.searchParams.get('firm'))) });
        }
        if (url.pathname === '/api/portal/requests' && req.method === 'POST') {
            const input = await body(req);
            if (input.title.includes('오류 테스트')) return json(res, { error: 'QA 저장 실패: 입력 내용은 보존됩니다.' }, 503);
            const item = { ...requests[0], ...input, id: crypto.randomUUID(), firm_id: firms[0].id, firm_name: firms[0].name, status: '접수', admin_note: '', created_at: now };
            requests.unshift(item); stats.requestCreates++; return json(res, { request: item }, 201);
        }
        if (url.pathname.startsWith('/api/portal/requests/') && req.method === 'PATCH') {
            const input = await body(req); const item = requests.find(r => r.id === url.pathname.split('/').pop());
            if (!item) return json(res, { error: 'Not found' }, 404);
            Object.assign(item, input); stats.requestUpdates++; return json(res, { request: item });
        }
        if (url.pathname === '/api/portal/requests') {
            const firm = client ? firms[0].id : url.searchParams.get('firm');
            let rows = requests.filter(r => !firm || r.firm_id === firm);
            const counts = Object.fromEntries(['접수', '진행중', '완료', '보류'].map(s => [s, rows.filter(r => r.status === s).length]));
            const q = url.searchParams.get('q'); const status = url.searchParams.get('status');
            if (status) rows = rows.filter(r => r.status === status);
            if (q) rows = rows.filter(r => (r.title + r.body).includes(q));
            const page = Number(url.searchParams.get('page') || 1), pageSize = Number(url.searchParams.get('pageSize') || 20), total = rows.length;
            rows = rows.slice((page - 1) * pageSize, page * pageSize).map(r => { const copy = { ...r }; if (client) { delete copy.admin_note; delete copy.firm_name; } return copy; });
            return json(res, { requests: rows, total, page, pageSize, counts });
        }
        // All unrecognized API traffic is blocked, never forwarded to a live backend.
        if (url.pathname.startsWith('/api/')) return json(res, { error: 'Blocked by local QA gateway' }, 403);
        const headers = { ...req.headers, host: `127.0.0.1:${upstreamPort}` };
        headers.cookie = url.pathname.startsWith('/admin') ? `admin_token=${token}` : '';
        const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: 'GET', headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
        upstream.on('error', () => json(res, { error: 'Start local QA Next server first' }, 502)); upstream.end();
    } catch (error) { json(res, { error: error.message }, 500); }
}).listen(port, '127.0.0.1', () => console.log(`Synthetic QA only: http://127.0.0.1:${port}/admin/client-strategy and /portal (any test code). No live API writes.`));
