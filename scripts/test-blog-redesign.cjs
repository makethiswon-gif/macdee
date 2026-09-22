// 2026-09-22 발행 재설계의 순수 함수 검사: 표지 브리프 파서, 부분 수정 범위, 사용량 정리, 원고 상태 저장(메모리 저장소). 모델 호출·자격 정보·운영 쓰기 없음.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
// 메모리 저장소
const objects = new Map();
const storage = {
    from() { return this; },
    async exists(file) { return { data: objects.has(file), error: objects.has(file) ? null : { statusCode: "404" } }; },
    async download(file) { const v = objects.get(file); return v ? { data: { size: v.length, text: async () => v }, error: null } : { data: null, error: { message: "missing" } }; },
    async upload(file, body) { objects.set(file, String(body)); return { error: null }; },
};
const load = Module._load;
Module._load = function (name, ...args) { if (name === "@/lib/supabase/server") return { createServiceClient: () => ({ storage }) }; return load.call(this, name, ...args); };

(async () => {
    const { parseCoverBrief, coverBriefInstruction, coverBriefFromWire, coverStillMatches, ALWAYS_AVOID } = require("../lib/blog-cover-brief.ts");
    const instruction = coverBriefInstruction("photo-open", ["횡단보도의 우산"]);
    assert.match(instruction, /===COVER===/); assert.match(instruction, /횡단보도의 우산/); assert.match(instruction, /story 계열/);
    assert.match(coverBriefInstruction("title-band"), /campaign 계열/);
    const response = `===TITLE===\n전날 회식하고 아침 출근길에 걸렸는데 0.04%가 나왔습니다\n===BODY===\n본문입니다.\n===FACTS===\n- 도로교통법 제44조\n===COVER===\nheading: 아침 출근길, / 0.04%의 기준\nkicker: 음주운전 · 숙취\nemphasis: 0.04%\nsubject: 아침 골목의 시동 걸린 차 옆에 선 사람의 작은 전신\nscene: 이른 아침 주택가 골목, 중원거리에서 본 차와 사람. 낮은 햇빛이 오른쪽에서 들어와 젖은 아스팔트에 긴 그림자를 만든다. 아래쪽은 어두운 노면.\nmessage: 어젯밤의 술이 오늘 아침의 판단이 된다\navoid: 술병, 경찰차 근접\nalternate: 출근 시간 지하철역 계단을 내려가는 사람의 뒷모습\nquestion: 숙취 상태로 운전하다 걸리면 어떻게 되나\nthesis: 0.03% 이상이면 처벌 대상이며, 수치 구간과 사고 여부로 결과가 갈린다.`;
    const parsed = parseCoverBrief(response, "photo-open");
    assert.ok(parsed.brief, parsed.issues.join(","));
    assert.equal(parsed.brief.heading, "아침 출근길,\n0.04%의 기준"); assert.equal(parsed.brief.emphasis, "0.04%"); assert.equal(parsed.brief.kicker, "음주운전 · 숙취");
    assert.ok(ALWAYS_AVOID.every((a) => parsed.brief.avoid.includes(a))); assert.ok(parsed.brief.avoid.includes("술병"));
    assert.equal(parsed.brief.alternateScene.startsWith("출근 시간"), true); assert.equal(parsed.brief.family, "story");
    const broken = parseCoverBrief(response.replace(/scene: [^\n]+/, "scene: 짧음"), "photo-open");
    assert.equal(broken.brief, null); assert.ok(broken.issues.some((i) => i.includes("scene")));
    assert.equal(parseCoverBrief("===TITLE===\nx\n===BODY===\ny", "photo-open").brief, null);
    const wire = coverBriefFromWire({ ...parsed.brief, emphasis: "없는단어", avoid: ["a"], layoutRecipe: "photo-open" });
    assert.equal(wire.emphasis, ""); assert.ok(wire.avoid.includes("법봉"));
    assert.equal(coverBriefFromWire({ ...parsed.brief, layoutRecipe: "nope" }), null);
    assert.equal(coverStillMatches(parsed.brief, "출근길 음주 단속 기준을 설명합니다"), true);
    assert.equal(coverStillMatches({ heading: "전세보증금\n반환", kicker: "임대차" }, "이혼 재산분할 글"), false);

    // 원고 파서가 COVER 를 FACTS 에 섞지 않는지 — 라우트의 파서를 흉내낸 규칙으로 확인
    const { COVER_MARKER } = require("../lib/blog-cover-brief.ts");
    const facts = response.split(COVER_MARKER)[0].split("===FACTS===")[1].trim();
    assert.equal(facts, "- 도로교통법 제44조");

    const { editScopeOptions, resolveEditScope, applyEdit, splitFooter } = require("../lib/blog-edit-scope.ts");
    const body = "도입 문단입니다. 두 문장.\n\n## 첫 소제목\n\n첫 섹션 문단.\n\n둘째 문단.\n\n## 둘째 소제목\n\n마지막 문단입니다.\n\n---\n**기준일** 2026년 9월 22일 작성\n[전화 상담](tel:0212345678)";
    const options = editScopeOptions(body);
    assert.deepEqual(options.slice(0, 5).map((o) => o.kind), ["title", "intro", "section", "section", "closing"]);
    assert.equal(options.filter((o) => o.kind === "paragraph").length, 4);
    const intro = resolveEditScope(body, { kind: "intro" }); assert.equal(intro.target, "도입 문단입니다. 두 문장.");
    const sec = resolveEditScope(body, { kind: "section", index: 0 }); assert.equal(sec.target, "## 첫 소제목\n\n첫 섹션 문단.\n\n둘째 문단.");
    const closing = resolveEditScope(body, { kind: "closing" }); assert.equal(closing.target, "마지막 문단입니다.");
    assert.equal(resolveEditScope(body, { kind: "section", index: 5 }), null);
    const edited = applyEdit(body, closing, "새 마무리입니다.");
    assert.ok(edited.endsWith("[전화 상담](tel:0212345678)")); assert.ok(edited.includes("새 마무리입니다.\n\n---")); assert.ok(!edited.includes("마지막 문단입니다."));
    assert.equal(splitFooter("꼬리 없음").footer, "");

    const { usageFromProvider, summarizeUsage } = require("../lib/blog-usage.ts");
    const claude = usageFromProvider("manuscript", "블로그 원고", "claude-sonnet-5", { usage: { input_tokens: 9000, output_tokens: 11000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens_details: { thinking_tokens: 6000 } } }, { operationId: "op", reused: false, elapsedMs: 1200 });
    assert.equal(claude.estimatedUsd, 0.128); assert.equal(claude.thinking, 6000);
    const reused = usageFromProvider("cover-plan", "원고 기획", "claude-sonnet-5", { usage: { input_tokens: 9000, output_tokens: 3000 } }, { reused: true });
    assert.equal(reused.estimatedUsd, 0);
    const image = usageFromProvider("cover-art", "이미지 원본", "gpt-image-2.5", { usage: { input_tokens: 1400, output_tokens: 3100, output_tokens_details: { image_tokens: 3100 } } }, { reused: false });
    assert.equal(image.estimatedUsd, null); assert.equal(image.imageOutput, 3100);
    const sum = summarizeUsage([claude, reused, image]);
    assert.equal(sum.paidCount, 2); assert.equal(sum.reusedCount, 1); assert.equal(sum.estimatedUsd, 0.128); assert.equal(sum.unpricedCount, 1);

    const state = require("../lib/blog-post-state.ts");
    const id = "11111111-2222-4333-8444-555555555555";
    assert.equal((await state.loadPostState(id)).stage, "draft");
    await state.appendUsage(id, [claude]);
    await state.updatePostState(id, (s) => { s.stage = "review"; s.factChecks = [{ claim: "도로교통법 제44조", status: "unverified" }]; s.coverBrief = parsed.brief; });
    const loaded = await state.loadPostState(id);
    assert.equal(loaded.stage, "review"); assert.equal(loaded.aiUsage.length, 1); assert.equal(loaded.coverBrief.kicker, "음주운전 · 숙취");
    await state.appendUsage("bad id!", [claude]); // 잘못된 ID 는 조용히 무시
    assert.equal(objects.size, 1);
    for (let i = 0; i < 25; i++) await state.updatePostState(id, (s) => { s.bodyVersions.push({ at: "t", title: "t", body: "b" + i, reason: "r" }); });
    assert.equal((await state.loadPostState(id)).bodyVersions.length, 20);
    console.log("PASS: cover brief parse/validate/match, edit scopes + footer preservation, usage pricing/reuse/unpriced, post state storage + limits");
})().catch((e) => { console.error(e); process.exitCode = 1; });
