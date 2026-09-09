// Real DOM and shared copy helper; synthetic clipboard permissions. No dialling or publishing.
const assert = require("node:assert/strict"), fs = require("node:fs"), Module = require("node:module");
const ts = require("typescript"), { chromium } = require("playwright-core");
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: filename,
}).outputText, filename);
const { copyBlogHtml } = require("../lib/blog-publish-workflow.ts");
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const html = toNaverHtml("## 상담 준비\n\n**확인할 자료**와 __작성 날짜__를 정리합니다. ==검수용 문장==입니다.\n\n[전화 상담 · 대표번호 02-2038-9185](tel:0220389185)", "전화 링크 검수");
(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        for (const mode of ["modern", "denied-modern", "legacy", "denied-all"]) {
            const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
            await page.route("**/*", (route) => route.abort());
            await page.setContent('<p id="selection">기존 선택 영역</p><div id="editor" contenteditable="true"></div>');
            await page.addScriptTag({ content: `window.copyBlogHtml = ${copyBlogHtml.toString()};` });
            await page.evaluate((mode) => {
                window.captured = {}; window.nativeExec = document.execCommand.bind(document);
                window.ClipboardItem = class { constructor(items) { this.items = items; } };
                Object.defineProperty(navigator, "clipboard", { configurable: true, value: mode === "legacy" ? undefined : {
                    write: async ([item]) => {
                        if (mode !== "modern") throw new Error("Denied in fixture");
                        window.captured = { html: await item.items["text/html"].text(), plain: await item.items["text/plain"].text() };
                    },
                } });
                document.execCommand = (command) => {
                    if (command !== "copy") throw new Error("Unexpected command");
                    const selection = getSelection(), range = selection.getRangeAt(0), holder = document.createElement("div");
                    holder.appendChild(range.cloneContents());
                    window.captured = { html: holder.innerHTML, plain: selection.toString() };
                    return mode !== "denied-all";
                };
                const range = document.createRange(); range.selectNodeContents(document.querySelector("#selection"));
                getSelection().removeAllRanges(); getSelection().addRange(range);
            }, mode);
            const result = await page.evaluate(async (html) => {
                let error = "";
                try { await window.copyBlogHtml(html); } catch (e) { error = e.message; }
                return { ...window.captured, error, selection: getSelection().toString(), leftover: document.querySelectorAll('[aria-hidden="true"]').length };
            }, html);
            assert.equal(result.selection, "기존 선택 영역"); assert.equal(result.leftover, 0);
            if (mode === "denied-all") { assert.match(result.error, /클립보드 복사가 허용되지/); await page.close(); continue; }
            assert.equal(result.error, ""); assert.match(result.html, /href="tel:0220389185"/);
            assert.match(result.plain, /전화 상담 · 대표번호 02-2038-9185/);
            assert.doesNotMatch(result.plain, /\]\(tel:|\*\*|__|==|##|<a /);
            const pasted = await page.evaluate(({ html, plain }) => {
                const editor = document.querySelector("#editor"); editor.focus();
                window.nativeExec("insertHTML", false, html);
                const link = editor.querySelector("a"); let clicked = "";
                link.addEventListener("click", (event) => { event.preventDefault(); clicked = link.getAttribute("href"); });
                link.click();
                const label = link.textContent;
                editor.innerText = plain;
                return { clicked, label, plainText: editor.innerText };
            }, result);
            assert.equal(pasted.clicked, "tel:0220389185"); assert.equal(pasted.label, "전화 상담 · 대표번호 02-2038-9185");
            assert.doesNotMatch(pasted.plainText, /\]\(tel:/);
            await page.close();
        }
        console.log("PASS: screenshot phone number, rich-link click target, readable text/plain, modern/legacy/denied copy, selection restoration and cleanup; no actual phone call");
    } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
