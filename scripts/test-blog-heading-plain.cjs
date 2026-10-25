// 2026-10-25 대표 지시: 원고 소제목에서 비유·수사("유족연금이라는 통로", "집 명의가 가르는 길")를 빼고 심플하게.
//   node scripts/test-blog-heading-plain.cjs
const fs = require("fs"), path = require("path"), Module = require("module"), ts = require("typescript"), assert = require("assert/strict");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (n, ...a) { return resolve.call(this, n.startsWith("@/") ? path.join(root, n.slice(2)) : n, ...a); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, f);
const { ornateHeading, politeEndingHeading, getWritingDNA, dnaDirective } = require("../lib/blog-writing-dna.ts");
const { reviewBlogEditorial } = require("../lib/blog-editorial-review.ts");

// 2026-10-24 발행 두 편(카라·김정웅)에 실제로 나온 꾸밈 소제목 + 예전 견본
const bad = ["상속에서 빠지는 자리", "사망으로 닫히는 재산분할", "집 명의가 가르는 길", "유족연금이라는 통로", "결론을 바꾸는 사정",
    "무혐의와 무고의 거리", "불송치 결정의 두 갈래", "허위와 과장의 경계", "손해배상의 낮은 문턱", "여기서 결론이 갈립니다"];
// 내용 그대로인 소제목 — 잡으면 안 된다(거리·경계가 내용인 경우 포함)
const good = ["전셋집 승계의 요건", "무고 고소의 시기와 시효", "고소인의 반격과 자백", "무고죄 성립 요건", "유족연금 청구 자격", "자녀가 함께 살았던 경우",
    "접근금지 100미터 거리", "특별연고자 분여", "사실혼 배우자는 상속인이 아닙니다", "합의하면 처벌을 피할 수 있을까", "경계선 침범과 점유취득시효"];
assert.deepEqual(bad.filter((h) => !ornateHeading(h)), [], "꾸밈 소제목을 놓침");
assert.deepEqual(good.filter((h) => ornateHeading(h)), [], "평범한 소제목을 잘못 잡음");

// 같은 날 두 번째 지시: "~합니다"로 끝나는 소제목은 어미를 빼야 자연스럽다.
const polite = ["남편은 보통 특유재산이라고 주장합니다", "이혼 후 2년 안에 청구해야 합니다", "시부모가 사 준 집은 남편 특유재산입니다", "유지에 협력했다면 분할 대상이 됩니다", "혼인 기간이 길수록 포함되기 쉽습니다"];
const plainEnd = ["남편은 보통 특유재산이라고 주장", "이혼 후 2년 안에 청구", "합의하면 처벌을 피할 수 있을까", "무고죄 성립 요건", "자녀가 함께 살았던 경우", "Q. 경찰이 연락하면 꼭 가야 하나요?"];
assert.deepEqual(polite.filter((h) => !politeEndingHeading(h)), [], "문장 어미 소제목을 놓침");
assert.deepEqual(plainEnd.filter((h) => politeEndingHeading(h)), [], "명사·질문 소제목을 잘못 잡음");
assert.equal(reviewBlogEditorial("제목", "도입 문단입니다.\n\n## 이혼 후 2년 안에 청구해야 합니다\n\n문단.").filter((w) => w.includes("문장 어미")).length, 1, "원고 경고에 문장 어미 소제목을 알린다");
const warnings = reviewBlogEditorial("제목", "도입 문단입니다.\n\n## 유족연금이라는 통로\n\n문단.\n\n## 전셋집 승계의 요건\n\n문단.");
assert.equal(warnings.filter((w) => w.includes("꾸밈말")).length, 1, "원고 경고에 꾸밈 소제목을 알린다");

for (const id of ["mqaaoypk621p6", "mmlk8qh6gqq9l", "mrvn35u3cxprq", "mmlg8fcm9bdgl", "mmlhi2x25zu2h", "mmkfnvun052ja", "mse8rx0bkl9f0"]) {
    const d = dnaDirective(getWritingDNA(id));
    assert.ok(d.includes("비유 명사") && d.includes("문장 어미로 끝내지 않습니다"), "모든 소제목 형식에 공통 규칙이 붙는다");
    assert.ok(!/상속인이 아닙니다|무고가 아닙니다/.test(d), "평서문 견본이 남아 있지 않다");
    assert.ok(!/공연성의 경계|측정 시점의 함정|결론이 갈립니다/.test(d), "예전 꾸밈 견본이 남아 있지 않다");
}
console.log("blog heading plain: ok");
