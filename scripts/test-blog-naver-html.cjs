// Local formatting and editor round-trip fixtures, not a Naver ranking or live-paste test.
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const ts = require("typescript"), { load } = require("cheerio"), { chromium } = require("playwright-core");
const { createCanvas } = require("@napi-rs/canvas");
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
}).outputText, filename);
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const out = path.resolve(process.env.BLOG_FORMAT_TEST_OUT || "C:/클로드/blog-format-review");
fs.mkdirSync(out, { recursive: true });
const title = "상담 전 자료 정리, 무엇부터 확인할까요?";
const intro = "문서가 여러 곳에 흩어져 있다면 먼저 원본을 모으고 날짜를 확인해 보세요. ==사실관계와 확인이 필요한 부분을 구분==하면 상담할 질문을 정리하기 수월합니다.";
const anchor = "파일명만 바꾸기보다 원본 폴더와 정리본 폴더를 나눠 보관합니다.\n기억에 의존한 메모에는 작성 시점과 확인이 필요한 부분을 함께 남깁니다.";
const body = `${intro}



## 원본과 정리본, 왜 나눠 두나요?

__원본은 그대로 보관__하고, 설명을 덧붙일 때는 복사본을 사용합니다. 여러 자료를 한 번에 편집하면 어느 내용이 원래 있었는지 구분하기 어려울 수 있습니다.

${anchor}

### 날짜가 불분명한 자료

날짜가 없는 자료를 추측으로 채우지 않습니다. **확인 필요**라고 표시하고, 어떤 자료와 관련되는지 짧게 적어 두면 됩니다.

## 흩어진 자료를 한눈에 정리하는 순서

자료를 찾는 데 시간을 쓰지 않도록 목록부터 만듭니다. 전체를 길게 설명하기보다 확인할 항목을 나눠 적습니다.

1. **원본 모으기**: 문서와 메시지, 메모를 각각 분류합니다.
2. **날짜 기록하기**: 자료에 표시된 날짜를 적습니다.
3. **질문 남기기**: 확인되지 않은 내용은 질문으로 남깁니다.

정리 목록은 자료를 대신하지 않습니다. ==요약과 원본을 함께 확인==할 수 있게 연결해 두세요.

## 상담할 때 무엇을 함께 준비하나요?

모든 자료를 설명하려고 하기보다, 가장 궁금한 질문을 먼저 적습니다. 확인된 내용과 기억에 의존한 내용은 구별합니다.

- 원본 파일 또는 원본을 확인할 수 있는 위치
- 주요 날짜와 관련 자료의 목록
- 아직 확인되지 않은 내용과 질문

기록에는 __출처와 작성 시점__을 함께 남깁니다. 다른 사람의 설명을 옮긴 경우에는 직접 확인한 사실처럼 적지 않습니다.

[전화 상담 · 대표번호 02-000-0000](tel:020000000)

---
**기준일**: 2026-09-09
**작성**: 서식 검수용 가상 원고 · 실제 법률 자문 아님`;
const types = ["thumbnail", "illustration", "info", "contact"];
const images = types.map((type) => ({ type, url: `https://format.test/${type}.png`, altText: `서식 검수용 ${type} 도판`,
    afterText: type === "illustration" ? anchor : "정리 목록은 자료를 대신하지 않습니다. ==요약과 원본을 함께 확인==할 수 있게 연결해 두세요." }));
const html = toNaverHtml(body, title, images), $ = load(html);
assert.equal($("h1").length, 1); assert.equal($("h2").length, 3); assert.equal($("h3").length, 1);
assert.equal($("h1").text(), title); assert.equal($("img").length, 4); assert.equal($("a").attr("href"), "tel:020000000");
assert.equal($("u").length, 2); assert.equal($("strong").length, 6);
assert.ok($("span").toArray().every((el) => $(el).attr("style").includes("#fff1b8")), "One coherent highlight color");
assert.equal(html, toNaverHtml(body.replace(/\n\n+/g, "\n\n"), title, images), "Blank runs collapse to the same layout");
assert.equal(html, toNaverHtml(body.replace(/\n/g, "\r\n"), title, images), "CRLF is identical");
assert.equal(html, toNaverHtml(body.replace(/\n/g, "\r"), title, images), "Legacy CR is identical");
assert.equal(toNaverHtml("\n\n"), "");
assert.equal(load(toNaverHtml("# " + title + "\n\nText", title))("h1,h2").length, 1, "An echoed opening title is not repeated");
assert.equal(load(toNaverHtml("## C#"))("h2").text(), "C#", "Literal trailing hash survives");
assert.equal(load(toNaverHtml("3. Third\n4. Fourth\n\n1. New list"))("ol").map((_, el) => $(el).attr("start")).get().join(","), "3,1");
assert.equal(load(toNaverHtml("* One\n* Two"))("li").length, 2);
assert.ok(html.indexOf("기억에 의존한 메모에는") < html.indexOf("illustration.png"));
assert.ok(html.indexOf("illustration.png") < html.indexOf("날짜가 불분명한 자료"), "Multiline paragraph anchor is preserved");
assert.ok(html.indexOf("contact.png") < html.indexOf('href="tel:'), "Contact card comes before the call link");
assert.ok(html.indexOf('href="tel:') < html.indexOf("<hr"), "Call link remains above metadata");
assert.ok(html.includes("보관합니다.<br>기억에"), "Explicit soft break is preserved");
const blocks = $("div[lang=ko]").children().toArray();
for (let i = 0; i < blocks.length; i++) {
    const block = $(blocks[i]);
    const spacer = block.is("p") && block.html() === "<br>";
    assert.equal(spacer, i % 2 === 1, "Exactly one spacer between content blocks, none at the edges");
    assert.ok(block.attr("style").includes("margin:0"), "No browser-default margins");
}
const malicious = load(toNaverHtml('<script>alert(1)</script>\n\n[**상담** <img src=x onerror=bad>](tel:02-000-0000)\n\n[bad](javascript:alert(1))', '"<img src=x onerror=bad>', [
    ...images, { type: "info", url: "javascript:alert(1)" }, { type: "info", url: "https://user:password@format.test/secret.png" },
    { type: "info", url: "https://format.test/quoted.png?a=1&b=2", altText: '\" onerror=bad <script>' },
]));
assert.equal(malicious("script,[onerror]").length, 0); assert.equal(malicious("img").length, 5); assert.equal(malicious("a").length, 1);
assert.equal(malicious("img").last().attr("src"), images[3].url);
assert.equal(load(toNaverHtml("", title, images))("img").length, 4);
assert.equal(load(toNaverHtml(body, title))("img").length, 0);

const bitmaps = {};
for (const [i, type] of types.entries()) {
    const canvas = createCanvas(1000, 540), ctx = canvas.getContext("2d");
    ctx.fillStyle = i === 3 ? "#1e4845" : "#edf3f1"; ctx.fillRect(0, 0, 1000, 540);
    ctx.fillStyle = i === 3 ? "#ffffff" : "#244d48";
    ctx.font = 'bold 46px "Malgun Gothic"';
    ctx.fillText(["자료 정리의 시작", "원본 / 정리본", "모으기 > 기록하기 > 질문하기", "상담할 질문을 정리해 보세요"][i], 60, 92);
    ctx.font = '24px "Malgun Gothic"'; ctx.fillText("서식 검수용 도판", 60, 480);
    for (let j = 0; j < 3; j++) {
        ctx.fillStyle = i === 3 ? "#426b65" : "#ffffff"; ctx.fillRect(60 + j * 302, 160, 276, 220);
        ctx.fillStyle = i === 3 ? "#ffffff" : "#244d48";
        ctx.font = 'bold 34px "Malgun Gothic"'; ctx.fillText(["원본", "날짜", "질문"][j], 88 + j * 302, 228);
        ctx.fillRect(88 + j * 302, 267, 200, 6); ctx.fillRect(88 + j * 302, 300, 152, 6);
    }
    bitmaps[type] = canvas.toBuffer("image/png"); fs.writeFileSync(path.join(out, type + ".png"), bitmaps[type]);
}
const documentHtml = (article) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>네이버 복사용 서식 검수</title><style>body{margin:0 auto;max-width:740px;padding:24px 16px;background:#fff}</style></head><body>${article}</body></html>`;
fs.writeFileSync(path.join(out, "article.html"), documentHtml(html.replaceAll("https://format.test/", "./")));

(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const report = [];
    try {
        const page = await browser.newPage();
        await page.route("**/*", async (route) => {
            const url = new URL(route.request().url()), type = path.basename(url.pathname, ".png");
            if (url.hostname === "format.test" && bitmaps[type]) return route.fulfill({ contentType: "image/png", body: bitmaps[type] });
            return route.abort();
        });
        for (const width of [1440, 768, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 }); await page.setContent(documentHtml(html));
            await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
            const layout = await page.evaluate(() => {
                const root = document.querySelector("div[lang=ko]"), children = [...root.children];
                return {
                    overflow: document.documentElement.scrollWidth > innerWidth,
                    clipped: children.some((el) => el.scrollWidth > el.clientWidth + 1),
                    overlap: children.some((el, i) => i && el.getBoundingClientRect().top < children[i - 1].getBoundingClientRect().bottom - 1),
                    bodySize: getComputedStyle(root).fontSize,
                    gaps: children.filter((el) => el.tagName === "P" && el.innerHTML === "<br>").map((el) => Math.round(el.getBoundingClientRect().height)),
                    headingSizes: [...root.querySelectorAll("h1,h2,h3")].map((el) => getComputedStyle(el).fontSize),
                    images: [...document.images].length,
                };
            });
            assert.equal(layout.overflow, false); assert.equal(layout.clipped, false); assert.equal(layout.overlap, false);
            assert.equal(layout.bodySize, "17px"); assert.ok(layout.gaps.every((n) => [12, 18, 24, 32].includes(n)));
            assert.deepEqual(layout.headingSizes, ["26px", "22px", "19px", "22px", "22px"]); assert.equal(layout.images, 4);
            await page.screenshot({ path: path.join(out, `article-${width}.png`), fullPage: true });
            await page.locator("h2").nth(1).scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(out, `detail-${width}.png`) });
            // Browser editing commands exercise a real contenteditable fragment; Naver may sanitize differently.
            const roundTrip = await page.evaluate((source) => {
                const editor = document.createElement("div"); editor.contentEditable = "true"; document.body.replaceChildren(editor); editor.focus();
                document.execCommand("insertHTML", false, source);
                const range = document.createRange(); range.selectNodeContents(editor);
                const holder = document.createElement("div"); holder.appendChild(range.cloneContents());
                return { text: holder.textContent, images: holder.querySelectorAll("img").length, phone: holder.querySelector("a")?.getAttribute("href"),
                    strong: holder.querySelectorAll("strong,b").length, highlight: holder.querySelectorAll('span[style*="background-color"]').length,
                    headings: holder.querySelectorAll("h1,h2,h3").length, underline: holder.querySelectorAll("u").length };
            }, html);
            assert.equal(roundTrip.images, 4); assert.equal(roundTrip.phone, "tel:020000000"); assert.ok(roundTrip.strong >= 6);
            assert.equal(roundTrip.highlight, 2); assert.equal(roundTrip.headings, 5); assert.equal(roundTrip.underline, 2);
            assert.ok(roundTrip.text.includes("출처와 작성 시점")); report.push({ width, layout, roundTrip });
        }
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
    console.log("PASS: spacing, hierarchy, soft breaks, lists, anchors, CTA/footer order, escaping, 4 viewport renders and contenteditable round trips. " + out);
})().catch((e) => { console.error(e); process.exitCode = 1; });
