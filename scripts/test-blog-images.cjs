/* Local, synthetic fixtures only. --live makes one paid photo + two text requests;
 * it never inserts posts, sends messages, uploads assets or publishes content. */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Module = require("node:module");
const ts = require("typescript");
const sharp = require("sharp");
const root = path.resolve(__dirname, "..");
process.chdir(root);
if (process.argv.includes("--live")) require("@next/env").loadEnvConfig(root, false, { info() {}, error() {} });
// Only the isolated test process uses these credentials, never the running app.
process.env.ADMIN_ID = "editorial-fixture";
process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
    return resolve.call(this, request.startsWith("@/") ? path.join(root, request.slice(2)) : request, ...args);
};
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
}).outputText, filename);

const { renderEditorialCard, readBrandAsset } = require("../lib/blog-images/editorial-renderer.ts");
const { generateEditorialPhoto, BLOG_PHOTO_MODEL } = require("../lib/blog-images/photo-generator.ts");
const { parseInfographicResult } = require("../lib/blog-images/infographic.ts");
const { cardRequestProfile } = require("../lib/blog-images/card-types.ts");
const { POST } = require("../app/api/admin/blog-images/generate-design/route.ts");
const outIndex = process.argv.indexOf("--out");
const out = outIndex >= 0 ? path.resolve(process.argv[outIndex + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), "blog-images-qa-"));
fs.mkdirSync(out, { recursive: true });
const profile = { id: "fixture", lawyerName: "검수용 변호사", officeName: "디자인 검수용 사무소", jobTitle: "변호사",
    phone: "연락처 미등록", website: "", brandColor: "#31594E", profileImages: [], officeImages: [], logoImage: "" };
const article = "전세보증금을 돌려받지 못했다면 먼저 계약서와 입금 내역을 정리합니다. "
    + "계약 종료와 관련해 주고받은 문자도 날짜순으로 보관합니다. "
    + "반환을 요청한 시점과 상대방 답변을 함께 정리합니다. "
    + "사건마다 계약 내용과 사실관계가 달라 구체적인 판단은 개별 검토가 필요합니다.";
const title = "전세보증금 반환을 준비하며 확인할 자료";
const fixtures = [
    { kind: "flow", heading: "자료 정리 순서", steps: [{ label: "계약서 확인", note: "계약 당사자와 종료 조건을 확인합니다." }, { label: "대화 기록 정리", note: "날짜순으로 정리합니다." }, { label: "입금 내역 확인", note: "원본을 함께 보관합니다." }] },
    { kind: "timeline", heading: "확인할 시점", events: [{ when: "계약 체결", label: "계약서 내용", note: "기재 내용을 확인합니다." }, { when: "반환 요청", label: "대화 기록", note: "날짜와 답변을 정리합니다." }] },
    { kind: "checklist", heading: "먼저 모아둘 자료", items: [{ label: "임대차 계약서", note: "보관한 계약서의 전체 내용을 확인합니다." }, { label: "입금 내역", note: "보증금 지급 기록을 정리합니다." }, { label: "문자와 대화 기록", note: "종료·반환에 관한 내용을 보관합니다." }] },
    { kind: "compare", heading: "원본과 정리본의 역할", leftLabel: "원본 자료", rightLabel: "검토용 정리본", rows: [{ aspect: "계약", a: "계약서 전체", b: "확인할 항목 표시" }, { aspect: "대화", a: "전체 대화 보관", b: "날짜순으로 정리" }, { aspect: "입금", a: "거래 기록", b: "관련 내역 분류" }] },
    { kind: "tiers", heading: "자료 묶음 나누기", tiers: [{ range: "계약 자료", label: "계약서와 관련 문서" }, { range: "진행 기록", label: "연락과 요청에 대한 기록" }] },
];
const payload = "editorial-fixture:test";
const cookie = Buffer.from(`${payload}:${crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")}`).toString("base64url");
function request(body, authorized = true) {
    return new Request("http://localhost/api/admin/blog-images/generate-design", { method: "POST",
        headers: { "Content-Type": "application/json", ...(authorized ? { cookie: `admin_token=${cookie}` } : {}) }, body: JSON.stringify(body) });
}

async function save(card, name) {
    const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64");
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, card.width); assert.equal(meta.height, card.height);
    assert.equal(meta.hasAlpha, false, "Every background must be opaque");
    assert.ok(bytes.length <= 2_500_000, "Single upload must fit response/body limits");
    assert.ok(card.height >= 790 && card.height <= 2300);
    fs.writeFileSync(path.join(out, `${name}.png`), bytes);
    // UI regression fixtures contain only the synthetic profile above.
    fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ card }));
    console.log(`${name}: ${meta.width}x${meta.height}, ${Math.round(bytes.length / 1024)} KB, opaque`);
}

async function main() {
    assert.equal((await POST(request({}, false))).status, 401);
    assert.equal((await POST(request({ profile, content: article, cardType: "bad" }))).status, 400);
    assert.equal((await POST(request({ profile, content: "x".repeat(40001), cardType: "info" }))).status, 400);
    assert.equal(parseInfographicResult('{"kind":"none"}').ok, false);
    assert.equal(parseInfographicResult("null").ok, false);
    assert.equal(parseInfographicResult('{"kind":"flow","heading":"x","steps":[]}').ok, false);
    assert.equal(cardRequestProfile({ ...profile, profileImages: ["a", "b"], officeImages: ["c"] }, "info").profileImages.length, 0);
    await assert.rejects(readBrandAsset("http://127.0.0.1/admin"));
    await assert.rejects(readBrandAsset("https://example.com/arbitrary.png"));
    await assert.rejects(readBrandAsset("data:image/svg+xml;base64,PHN2Zz4="));
    for (const fixture of fixtures) {
        const parsed = parseInfographicResult(JSON.stringify(fixture));
        assert.equal(parsed.ok, true, parsed.reason);
        await save(await renderEditorialCard({ type: "info", profile, copy: { heading: fixture.heading, points: [] }, infographic: parsed.data }), fixture.kind);
    }
    const longInfo = { kind: "compare", heading: "긴 문장과 여섯 항목을 모두 보존하는지 확인", leftLabel: "첫 번째 조건에 해당하는 경우", rightLabel: "두 번째 조건에 해당하는 경우", rows: Array.from({ length: 6 }, (_, i) => ({ aspect: `${i + 1}. 자료 확인`, a: "사실관계와 예외 조건을 함께 확인하여 판단합니다.", b: "원문에 포함된 조건과 예외를 생략하지 않습니다." })) };
    await save(await renderEditorialCard({ type: "info", profile, copy: { heading: longInfo.heading, points: [] }, infographic: longInfo }), "long-compare");
    await save(await renderEditorialCard({ type: "contact", profile, copy: { heading: "자료를 정리할 때 기억할 것", points: ["계약서와 입금 내역을 함께 정리합니다.", "반환 요청에 관한 문자와 답변을 날짜순으로 보관합니다.", "개별 계약과 사실관계에 따라 판단이 달라질 수 있습니다."] } }), "contact");

    const oldFetch = global.fetch;
    process.env.OPENAI_API_KEY ||= "fixture-key";
    process.env.ANTHROPIC_API_KEY ||= "fixture-key";
    let modelCalls = 0;
    try {
        global.fetch = async (_url, init) => {
            modelCalls++;
            const body = JSON.parse(init.body);
            assert.equal(body.model, BLOG_PHOTO_MODEL); assert.equal(body.background, "opaque");
            return new Response("{}", { status: 429 });
        };
        await assert.rejects(generateEditorialPhoto(article, title), /사용 한도/);
        assert.equal(modelCalls, 1, "No silent fallback or duplicate billing");
        global.fetch = async () => Response.json({ content: [{ type: "text", text: '{"kind":"none"}' }] });
        const skipped = await POST(request({ profile, title, content: article, cardType: "info" }));
        assert.equal(skipped.status, 422); assert.equal((await skipped.json()).skipped, true);
        global.fetch = async () => Response.json({ content: [{ type: "text", text: "bad json" }] });
        const invalid = await POST(request({ profile, title, content: article, cardType: "info" }));
        assert.equal(invalid.status, 502); assert.equal((await invalid.json()).skipped, false);
    } finally { global.fetch = oldFetch; }

    if (process.argv.includes("--live")) {
        if (process.env.OPENAI_API_KEY === "fixture-key" || process.env.ANTHROPIC_API_KEY === "fixture-key") throw new Error("Live keys are not configured");
        console.log(`LIVE: synthetic article only; ${process.argv.includes("--reuse-photo") ? "reusing saved model photo" : "one GPT Image 2 high-quality photo"}, two text extractions. No DB writes.`);
        global.fetch = async (url, init) => {
            if (process.argv.includes("--reuse-photo") && String(url).includes("api.openai.com/v1/images/generations")) {
                return Response.json({ data: [{ b64_json: fs.readFileSync(path.join(out, "live-photo-original.bin")).toString("base64") }] });
            }
            const response = await oldFetch(url, init);
            if (String(url).includes("api.openai.com/v1/images/generations") && response.ok) {
                const data = await response.clone().json();
                const bytes = Buffer.from(data.data?.[0]?.b64_json || "", "base64");
                fs.writeFileSync(path.join(out, "live-photo-original.bin"), bytes);
                console.log("Photo payload", bytes.length, "bytes; signature", bytes.subarray(0, 12).toString("hex"));
            }
            return response;
        };
        for (const type of ["thumbnail", "info", "contact"]) {
            const response = await POST(request({ profile, title, content: article, cardType: type, quality: "high" }));
            const data = await response.json();
            assert.equal(response.status, 200, data.error);
            await save(data.card, `live-${type}`);
        }
        global.fetch = oldFetch;
    }
    console.log(`PASS. Fixtures: ${out}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
