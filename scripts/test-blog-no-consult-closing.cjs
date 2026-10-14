// 블로그 원고 '상담 권유 마무리' 금지(2026-10-14). 원고 생성은 유료라 지시문과 경고만 정적으로 확인한다.
// 2026-10-13~14 원고 10편 중 3편이 첫 통화·상담을 권하는 문장으로 끝나 매번 손으로 고쳤다.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."); process.chdir(root);
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);

const { getWritingDNA, dnaDirective } = require("../lib/blog-writing-dna.ts");
const { reviewBlogEditorial } = require("../lib/blog-editorial-review.ts");

// 1) 마무리 방식 5종 모두 상담을 그리지 않고, 공통 금지 줄이 붙는다. 개수는 5종 그대로(배정이 흔들리지 않게).
const closings = new Map();
for (let i = 0; i < 400; i++) {
    const dna = getWritingDNA(`profile-${i % 40}`, "", `topic-${i}`);
    closings.set(dna.closing.name, dna.closing.spec);
    const directive = dnaDirective(dna);
    assert.match(directive, /어떤 마무리 방식이든 상담·통화·연락을 권하거나/);
    assert.match(directive, /마지막에 무언가를 확인하는 사람은 독자 자신입니다/);
}
assert.equal(closings.size, 5, "마무리 방식은 5종: " + [...closings.keys()].join(", "));
assert.ok(!closings.has("첫 통화의 모습"));
for (const [name, spec] of closings) assert.doesNotMatch(spec, /상담|통화|연락|변호사가 묻/, name);

// 2) 원고·부분 수정 지시문: 규칙은 있고, 상담을 시키던 옛 문구와 따라 쓸 예문은 없다.
const write = fs.readFileSync("app/api/admin/claude-blog-write/route.ts", "utf8");
const edit = fs.readFileSync("app/api/admin/claude-blog-edit/route.ts", "utf8");
const prompt = write.slice(write.indexOf("const systemPrompt = `"), write.indexOf("const fieldLine"));
assert.match(prompt, /\[상담 권유 없음 — 마지막 문단과 본문 모두\]/);
assert.match(prompt, /독자가 스스로 확인할 일 하나로 닫습니다/);
assert.match(edit, /상담·통화·연락을 권하거나 첫 상담의 장면을 그리는 문장을 새로 넣지 않습니다/);
for (const src of [prompt, edit]) {
    for (const old of [/상담은 시작된다/, /자료 없이 시작/, /전화로 이어집니다/]) assert.doesNotMatch(src, old);
    // 예문 금지(2026-09-17 교훈): 원고에 새어 나온 문장 끝을 지시문에 적어 두지 않는다.
    assert.doesNotMatch(src, /여쭙니다|함께 정합니다|연락 주시면|확인할 수 있습니다\./);
}

// 3) 마지막 문단이 상담을 권하면 편집 경고가 뜨고, 독자 스스로 확인하는 마무리는 경고가 없다.
const filler = "본문 설명 문장입니다. ".repeat(20);
const body = (closing) => `${filler}\n\n## 마지막 소제목\n\n${filler}\n\n${closing}\n\n---\n**기준일** 2026년 10월 14일 작성\n**작성** 검수 변호사\n\n[전화 상담 · 대표번호 02-000-0000](tel:020000000)`;
const warned = (closing) => reviewBlogEditorial("제목", body(closing)).some((w) => /상담·연락을 권합니다/.test(w));
for (const leaked of [
    "처음에는 무엇이 있었는지만 떠올려 보시면 됩니다. 첫 통화에서는 언제 알게 되셨는지를 여쭙니다. 필요한 자료는 그 이야기를 들은 뒤에 함께 정합니다.",
    "통지서가 아직 없다면 그것부터 기다리셔도 됩니다. 서류가 없어도 상담에서 함께 확인할 수 있습니다.",
    "가족관계증명서가 당장 없어도 괜찮습니다. 없어도 상담과 신청은 시작됩니다.",
]) assert.ok(warned(leaked), leaked);
for (const clean of [
    "통지서 맨 위에 적힌 송달일을 한 번 확인해 보세요. 그날부터 14일이 이의신청 기한이고, 그 날짜가 지났는지에 따라 앞에서 본 두 갈래 가운데 어느 쪽인지가 정해집니다.",
    "계약서 특약란에 해지 조건이 적혀 있는지부터 보시면 됩니다. 적혀 있다면 세 번째 소제목의 설명이, 비어 있다면 민법의 일반 규정이 기준이 됩니다.",
]) assert.ok(!warned(clean), clean);

console.log("blog no-consult closing: ok");
