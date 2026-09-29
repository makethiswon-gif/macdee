// 2026-09-29 Sonnet 5.5 전환의 안전장치 — 모델 ID 중앙화, 사고 끄기 값의 모델별 짝, 단가표, 샘플링 파라미터, 사용량 기록의 실제 모델명.
// 외부 호출 없음. (실제 API 규칙은 같은 날 count_tokens 로 확인: Sonnet 5.5 에서 thinking disabled 는 400, Sonnet 5 에서 between_tools 는 400.)
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), assert = require("node:assert/strict"), ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const { SONNET_MODEL, BLOG_WRITING_MODEL, minimalThinking } = require("../lib/ai/models.ts");
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
console.log(`PASS: Sonnet 5.5 model/thinking pairing, pricing (2/10/0.2/2.5), sampling-param guard, actual-model usage records, no stale model literals or thinking-disabled or forced tool_choice in ${files.length} app/lib files`);
