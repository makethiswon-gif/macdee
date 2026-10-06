// 2026-09-29 Sonnet 5.5 전환의 안전장치 — 모델 ID 중앙화, 사고 끄기 값의 모델별 짝, 단가표, 샘플링 파라미터, 사용량 기록의 실제 모델명.
// 외부 호출 없음. (실제 API 규칙은 같은 날 count_tokens 로 확인: Sonnet 5.5 에서 thinking disabled 는 400, Sonnet 5 에서 between_tools 는 400.)
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const { SONNET_MODEL, BLOG_WRITING_MODEL, WRITING_EFFORT, minimalThinking } = require("../lib/ai/models.ts");
const { TOKEN_PRICES, estimateUsd } = require("../lib/ai/pricing.ts");
const { supportsSamplingParams } = require("../lib/ai/claude-text.ts");
const { usageFromProvider } = require("../lib/blog-usage.ts");

// 1) 모델 ID 와 짝을 이루는 사고 끄기 값
assert.equal(SONNET_MODEL, "claude-sonnet-5-5"); assert.equal(BLOG_WRITING_MODEL, SONNET_MODEL);
assert.deepEqual(minimalThinking("claude-sonnet-5-5"), { type: "between_tools" });
assert.deepEqual(minimalThinking("claude-sonnet-5"), { type: "disabled" }, "되돌리면 예전 값으로 자동 복귀");
assert.deepEqual(minimalThinking("claude-opus-5"), { type: "disabled" });
assert.deepEqual(minimalThinking("claude-haiku-4-5-20251001"), { type: "disabled" });

// 2) 단가표: 공식 가격(2026-09-29 확인) — Sonnet 5.5 는 Sonnet 5 와 같다
assert.deepEqual(TOKEN_PRICES["claude-sonnet-5-5"], { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 });
assert.deepEqual(TOKEN_PRICES["claude-sonnet-5-5"], TOKEN_PRICES["claude-sonnet-5"]);
assert.equal(estimateUsd("claude-sonnet-5-5", { input: 10000, cacheRead: 0, cacheWrite: 0, output: 6000 }), 0.08);
assert.equal(estimateUsd("claude-sonnet-5-5", { input: 0, cacheRead: 1_000_000, cacheWrite: 0, output: 0 }), 0.2);
assert.equal(estimateUsd("gpt-image-2.5", { input: 1, cacheRead: 0, cacheWrite: 0, output: 1 }), null, "단가 모르는 모델은 금액 없음");

// 3) Claude 5 세대는 temperature/top_p/top_k 를 보내면 400 — 5.5 도 걸러진다(정규식이 -5-5 를 놓치지 않는지)
for (const model of ["claude-sonnet-5-5", "claude-sonnet-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]) assert.equal(supportsSamplingParams(model), false, model);
assert.equal(supportsSamplingParams("claude-haiku-4-5-20251001"), true); assert.equal(supportsSamplingParams("claude-sonnet-4-6"), true);

// 4) 사용량 기록: 응답이 알려 주는 실제 모델을 쓴다(전환 뒤 저장된 옛 응답을 재사용해도 모델명이 맞다)
const old = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5-5", { model: "claude-sonnet-5", usage: { input_tokens: 9000, output_tokens: 11000 } }, { reused: true });
assert.equal(old.model, "claude-sonnet-5"); assert.equal(old.estimatedUsd, 0);
const now = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5-5", { model: "claude-sonnet-5-5", usage: { input_tokens: 10000, output_tokens: 6000 } }, { reused: false });
assert.equal(now.model, "claude-sonnet-5-5"); assert.equal(now.estimatedUsd, 0.08);
const image = usageFromProvider("cover-art", "이미지 원본", "gpt-image-2.5", { usage: { input_tokens: 1400, output_tokens: 3100, output_tokens_details: { image_tokens: 3100 } } }, { reused: false });
assert.equal(image.model, "gpt-image-2.5"); assert.equal(image.estimatedUsd, null);
const noModel = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5-5", { usage: { input_tokens: 10000, output_tokens: 6000 } }, { reused: false });
assert.equal(noModel.model, "claude-sonnet-5-5", "응답에 model 이 없으면 요청한 모델");

// 5) 정적 검사: 모델 ID 는 lib/ai/models.ts 한 곳에서 — 앱 코드에 옛 리터럴이 다시 생기지 않게
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["node_modules", ".next", "deepmakai"].includes(e.name) ? [] : walk(path.join(dir, e.name))) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []);
const files = ["app", "lib"].flatMap((d) => walk(path.join(root, d)));
const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const literalAllowed = new Set(["lib/ai/models.ts", "lib/ai/pricing.ts", "lib/blog-images/visual-planner.ts"]); // 주석·단가표·저장된 구성안의 허용 목록
const badLiteral = [], badDisabled = [];
for (const f of files) {
    const src = fs.readFileSync(f, "utf8"), name = rel(f);
    if (!literalAllowed.has(name) && /["'`]claude-sonnet-5["'`]/.test(src)) badLiteral.push(name);
    // 사고를 끄는 값은 minimalThinking 으로만 — Sonnet 5.5 에서 { type: "disabled" } 는 400
    if (name !== "lib/ai/models.ts" && /thinking\s*:\s*\{\s*type\s*:\s*["']disabled["']/.test(src)) badDisabled.push(name);
}
assert.deepEqual(badLiteral, [], "claude-sonnet-5 리터럴은 lib/ai/models.ts 상수로: " + badLiteral.join(", "));
assert.deepEqual(badDisabled, [], "thinking disabled 직접 지정 금지(minimalThinking 사용): " + badDisabled.join(", "));
// 사고 최소 설정이 필요한 두 주제 추천 라우트가 실제로 짝 함수를 쓴다
for (const f of ["app/api/admin/blog-posts/topics/route.ts", "app/api/admin/claude-blog-write/topics/route.ts"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    assert.match(src, /thinking\s*:\s*minimalThinking\(BLOG_WRITING_MODEL\)/, f); assert.match(src, /model\s*:\s*BLOG_WRITING_MODEL/, f);
}
// 저장된 이미지 구성안에 찍힌 기획 모델 허용 목록에 5.5 가 있다
assert.match(fs.readFileSync(path.join(root, "lib/blog-images/visual-planner.ts"), "utf8"), /"claude-sonnet-5-5"\]\.includes\(raw\.planningModel\)/);
// 강제 도구 호출(tool_choice any/tool)은 Sonnet 5.5 에서 400 — 앱 코드에 없어야 한다
const forced = files.filter((f) => /tool_choice\s*:\s*\{\s*type\s*:\s*["'](any|tool)["']/.test(fs.readFileSync(f, "utf8"))).map(rel);
assert.deepEqual(forced, [], "강제 도구 호출 사용: " + forced.join(", "));

// 6) 2026-09-29 대표 지시: Opus·Haiku 는 모두 Sonnet 5.5 로. 앱 코드에 Opus/Haiku 모델 ID 리터럴이 다시 생기지 않게 —
//    단가표(옛 응답의 비용 계산)와 저장된 구성안이 기록한 기획 모델 허용 목록만 예외.
const oldFamilyAllowed = new Set(["lib/ai/pricing.ts", "lib/blog-images/visual-planner.ts"]);
const oldFamily = files.filter((f) => !oldFamilyAllowed.has(rel(f)) && /["'`]claude-(opus|haiku)[a-z0-9.-]*["'`]/.test(fs.readFileSync(f, "utf8"))).map(rel);
assert.deepEqual(oldFamily, [], "Opus/Haiku 모델 ID 는 Sonnet 5.5(lib/ai/models.ts)로: " + oldFamily.join(", "));
assert.equal(require("../lib/firm-research.ts").FIRM_RESEARCH_MODEL, SONNET_MODEL);

// 7) 글쓰기 계열의 노력 단계: 원고·부분 수정·로펌 리서치는 WRITING_EFFORT(high) — medium 으로 조용히 되돌아가지 않게.
//    끊김 위험(Sonnet 5 high 는 14건 중 3건이 20,000 토큰에서 끊김) 때문에 원고 max_tokens/시간 제한은 짝으로 고정한다.
assert.equal(WRITING_EFFORT, "high");
const src = (f) => fs.readFileSync(path.join(root, f), "utf8");
for (const f of ["app/api/admin/claude-blog-write/route.ts", "app/api/admin/claude-blog-edit/route.ts", "lib/firm-research.ts"]) {
    assert.match(src(f), /output_config\s*:\s*\{\s*effort\s*:\s*WRITING_EFFORT\s*\}/, f + " 은 WRITING_EFFORT 를 쓴다");
    assert.doesNotMatch(src(f), /effort\s*:\s*["']medium["']/, f + " 에 medium 리터럴 금지");
}
// 제한 시간은 직접 fetch 의 AbortSignal.timeout(...) 이거나, 실행 방식 선택(claudeDispatch) 뒤로는 timeoutMs: ... 로 넘긴다
const durations = (f) => ({ max: Number(/maxDuration\s*=\s*(\d+)/.exec(src(f))[1]), timeout: Number(/(?:AbortSignal\.timeout\(|timeoutMs\s*:\s*)([\d_]+)/.exec(src(f))[1].replaceAll("_", "")) });
const write = durations("app/api/admin/claude-blog-write/route.ts"), edit = durations("app/api/admin/claude-blog-edit/route.ts");
// 2026-10-06: 5.5 의 high 가 사고만 2만 토큰을 넘게 써 원고가 본문 0자로 끊김 → 대표 "품질 우선, 토큰 늘려도 된다".
// 한도·시간을 올리고 스트리밍으로 받는다. 64,000 토큰을 초당 약 124토큰으로 다 써도 약 520초라 760초 대기 안이다.
assert.equal(write.max, 800, "Vercel Pro 최대"); assert.equal(write.timeout, 760000); assert.match(src("app/api/admin/claude-blog-write/route.ts"), /max_tokens:\s*64000/);
assert.equal(edit.max, 600); assert.equal(edit.timeout, 570000); assert.match(src("app/api/admin/claude-blog-edit/route.ts"), /max_tokens:\s*32000/);
for (const f of ["app/api/admin/claude-blog-write/route.ts", "app/api/admin/claude-blog-edit/route.ts"]) assert.match(src(f), /timeoutMs:\s*[\d_]+,\s*operationId,\s*stream:\s*true/, f + " 는 스트리밍으로 받는다");
assert.match(src("app/api/admin/claude-blog-write/route.ts"), /paidId\("blog-manuscript-v17"/, "설정을 바꾸면 끊긴 옛 응답을 다시 쓰지 않도록 유료 응답 ID 를 올린다");
assert.ok(write.timeout < write.max * 1000 && edit.timeout < edit.max * 1000, "AI 호출 제한 시간은 함수 제한보다 짧아야 응답이 유실되지 않는다");
// 이미지 구성안 기획은 올리지 않았다(스키마에 묶인 JSON·거의 안 쓰는 대체 경로) — high 유지, 한도 1만.
assert.match(src("lib/blog-images/visual-planner.ts"), /effort\s*:\s*"high"\s*,\s*format/);

// 8) 예전 Haiku 자리: 짧은 정형 출력은 사고 최소(사고가 max_tokens 를 먹지 않게), 5 세대에 없는 temperature 는 없고, text 블록만 읽는다.
const haikuSeats = { "app/api/admin/blog-summary/route.ts": 1, "app/api/admin/seo-titles/analyze/route.ts": 1, "app/api/consulting/route.ts": 1, "lib/threads/caption.ts": 1, "lib/ai/image-generate.ts": 2 };
for (const [f, n] of Object.entries(haikuSeats)) {
    const text = src(f);
    assert.equal((text.match(/thinking\s*:\s*minimalThinking\(SONNET_MODEL\)/g) || []).length, n, f);
    assert.equal((text.match(/model\s*:\s*SONNET_MODEL/g) || []).length, n, f);
    assert.doesNotMatch(text, /temperature\s*:/, f + ": Sonnet 5.5 는 temperature 를 받지 않는다(400)");
    assert.doesNotMatch(text, /content\?*\.\[0\]\?*\.text/, f + ": 첫 블록이 thinking 일 수 있어 extractClaudeText 로 읽는다");
}
// 공용 프로바이더: 전처리·AI 검색은 사고 최소, 콘텐츠 생성은 기본(적응형) 사고 — 실제로 보내는 요청 본문으로 확인
(async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const { getPreprocessor, getAISearchGenerator, getContentGenerator, ClaudeProvider } = require("../lib/ai/providers.ts");
    let sent = null;
    const realFetch = global.fetch;
    global.fetch = async (_url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ content: [{ type: "thinking", thinking: "" }, { type: "text", text: "ok" }], model: "claude-sonnet-5-5", usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }); };
    try {
        const messages = [{ role: "system", content: "s" }, { role: "user", content: "u" }];
        for (const [name, make] of [["getPreprocessor", getPreprocessor], ["getAISearchGenerator", getAISearchGenerator]]) {
            const answer = await make().generate(messages, { temperature: 0.1, maxTokens: 300 });
            assert.equal(sent.model, "claude-sonnet-5-5", name); assert.deepEqual(sent.thinking, { type: "between_tools" }, name);
            assert.ok(!("temperature" in sent), name + ": temperature 는 걸러진다"); assert.equal(sent.max_tokens, 300); assert.equal(answer.content, "ok", name + ": thinking 블록 뒤의 text 를 읽는다");
        }
        await getContentGenerator().generate(messages, { temperature: 0.7 });
        assert.equal(sent.model, "claude-sonnet-5-5"); assert.ok(!("thinking" in sent), "콘텐츠 생성은 기본(적응형) 사고"); assert.ok(!("temperature" in sent));
        await new ClaudeProvider().generate(messages);
        assert.ok(!("thinking" in sent));
    } finally { global.fetch = realFetch; }
    console.log(`PASS: Sonnet 5.5 model/thinking pairing, pricing (2/10/0.2/2.5), sampling-param guard, actual-model usage records, no stale model literals or thinking-disabled or forced tool_choice in ${files.length} app/lib files; no Opus/Haiku ids left, writing effort=${WRITING_EFFORT} (manuscript/edit/firm research), Haiku seats use minimal thinking without temperature`);
})().catch((e) => { console.error(e); process.exit(1); });
