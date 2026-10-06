/* 스트리밍(SSE) 응답 → 최종 메시지 JSON 모으기(lib/ai/message-stream.ts)와 claudeDispatch 의 stream 옵션.
   네트워크는 전부 가짜이고 .env 도 읽지 않는다. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const originalLoad = Module._load;
Module._load = function (name, ...args) {
    if (name === '@/lib/supabase/server') return { createServiceClient: () => { throw new Error('No storage in this test'); } };
    return originalLoad.call(this, name, ...args);
};
const { collectMessageStream } = require('../lib/ai/message-stream.ts');
const { claudeDispatch } = require('../lib/ai/claude-engine.ts');

const sse = (events) => events.map(([type, data]) => `event: ${type}\r\ndata: ${JSON.stringify({ type, ...data })}\r\n\r\n`).join('');
const streamOf = (text, size) => new ReadableStream({ start(c) { const bytes = new TextEncoder().encode(text); for (let i = 0; i < bytes.length; i += size) c.enqueue(bytes.slice(i, i + size)); c.close(); } });
const sseResponse = (text, size = 7) => new Response(streamOf(text, size), { status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8', 'request-id': 'req_fixture' } });
const full = sse([
    ['message_start', { message: { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [], stop_reason: null, usage: { input_tokens: 100, output_tokens: 1 } } }],
    ['ping', {}],
    ['content_block_start', { index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } }],
    ['content_block_delta', { index: 0, delta: { type: 'thinking_delta', thinking: '' } }],
    ['content_block_delta', { index: 0, delta: { type: 'signature_delta', signature: 'A'.repeat(500) } }],
    ['content_block_stop', { index: 0 }],
    ['content_block_start', { index: 1, content_block: { type: 'text', text: '' } }],
    ['content_block_delta', { index: 1, delta: { type: 'text_delta', text: '===TITLE===\n제목' } }],
    ['content_block_delta', { index: 1, delta: { type: 'text_delta', text: '\n===BODY===\n본문 한글 ✓' } }],
    ['content_block_stop', { index: 1 }],
    ['message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 31000, output_tokens_details: { thinking_tokens: 24000 } } }],
    ['message_stop', {}],
]);

(async () => {
    // 1) 정상 스트림: 한글·이모지가 조각 경계에 걸려도 깨지지 않고, 사용량·종료 사유가 합쳐지고, 사고 서명은 저장하지 않는다
    for (const size of [1, 7, 64, 100000]) {
        const r = await collectMessageStream(sseResponse(full, size));
        assert.equal(r.status, 200); assert.equal(r.headers.get('request-id'), 'req_fixture');
        const m = JSON.parse(await r.text());
        assert.equal(m.model, 'claude-sonnet-5-5'); assert.equal(m.stop_reason, 'end_turn');
        assert.deepEqual(m.content, [{ type: 'thinking', thinking: '' }, { type: 'text', text: '===TITLE===\n제목\n===BODY===\n본문 한글 ✓' }]);
        assert.equal(m.usage.input_tokens, 100); assert.equal(m.usage.output_tokens, 31000); assert.equal(m.usage.output_tokens_details.thinking_tokens, 24000);
    }
    // 2) 스트림 중간의 오류 이벤트 → 오류 응답(보존·안내는 기존 유료 작업 코드가 한다)
    const broken = sse([['message_start', { message: { model: 'claude-sonnet-5-5', content: [], usage: { input_tokens: 5 } } }], ['error', { error: { type: 'overloaded_error', message: 'Overloaded' } }]]);
    let r = await collectMessageStream(sseResponse(broken));
    assert.equal(r.status, 529); assert.equal(JSON.parse(await r.text()).error.type, 'overloaded_error');
    // 3) 스트리밍이 아닌 응답(오류 JSON·시험용 가짜)은 그대로
    const plain = Response.json({ content: [{ type: 'text', text: 'x' }] });
    assert.equal(await collectMessageStream(plain), plain);
    const rejected = new Response('{"type":"error"}', { status: 400, headers: { 'content-type': 'text/event-stream' } });
    assert.equal(await collectMessageStream(rejected), rejected, '실패 상태는 손대지 않는다');
    // 4) 메시지 시작 없이 끝난 스트림 → 502, 중간에 끊긴 스트림 → 종료 사유 없는 메시지(원고 쪽이 미완성으로 처리)
    r = await collectMessageStream(sseResponse(sse([['ping', {}]])));
    assert.equal(r.status, 502);
    const cut = full.slice(0, full.indexOf('event: message_delta'));
    const partial = JSON.parse(await (await collectMessageStream(sseResponse(cut))).text());
    assert.equal(partial.stop_reason, null); assert.match(partial.content[1].text, /본문 한글/);

    // 5) claudeDispatch: stream 이면 요청에 stream:true 를 넣고 모은 결과를 돌려준다. 아니면 예전 그대로.
    process.env.ANTHROPIC_API_KEY = 'fixture-key';
    let sent;
    global.fetch = async (_url, init) => { sent = JSON.parse(init.body); assert.ok(init.signal instanceof AbortSignal); return sseResponse(full); };
    const body = { model: 'claude-sonnet-5-5', max_tokens: 64000, thinking: { type: 'adaptive' }, output_config: { effort: 'high' }, system: 'S', messages: [{ role: 'user', content: 'U' }] };
    const streamed = await claudeDispatch('api', body, { stage: '블로그 원고', timeoutMs: 760000, stream: true })();
    assert.equal(sent.stream, true); assert.equal(sent.max_tokens, 64000);
    assert.equal(JSON.parse(await streamed.text()).stop_reason, 'end_turn');
    global.fetch = async (_url, init) => { sent = JSON.parse(init.body); return Response.json({ ok: true }); };
    const direct = await claudeDispatch('api', body, { stage: '주제', timeoutMs: 1000 })();
    assert.equal(sent.stream, undefined, '스트리밍을 고르지 않으면 요청은 예전 그대로'); assert.deepEqual(await direct.json(), { ok: true });
    console.log('PASS: SSE → final message (chunk boundaries, Korean text, usage merge, stop reason, no thinking signature), stream error → 529, passthrough of non-stream/failed responses, truncated stream stays incomplete, claudeDispatch stream option');
})().catch((e) => { console.error(e); process.exit(1); });
