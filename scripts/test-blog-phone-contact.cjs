// Real writer route and HTML conversion; AI, database and auth are local fixtures only.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const Module = require("node:module"), ts = require("typescript"), { load } = require("cheerio");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
    return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args);
};
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename,
}).outputText, filename);
let profile, databaseFails = false, polishInput, selected, aiCalls = 0, aiPrompt;
const fixtureBody = "## 준비할 자료\n\n자료를 확인합니다.\n\n---\n**기준일** 2026년 9월 9일 작성\n**작성** 검수 변호사";
const moduleLoad = Module._load;
Module._load = function (name, ...args) {
    if (name === "@/lib/admin-auth") return { verifyAdminToken: (request) => request.headers.get("x-fixture-auth") === "yes" };
    if (name === "@/lib/ai/blog-polish") return { polishBlogBody: async (body) => {
        polishInput = body;
        return { text: body.replace("자료를 확인합니다.", "관련 자료를 먼저 확인합니다."), polished: true, model: "fixture" };
    } };
    if (name === "@/lib/supabase/server") return { createAdminClient: async () => {
        if (databaseFails) throw new Error("Fixture database unavailable");
        return { from: (table) => {
            assert.equal(table, "blog_profiles");
            return { select: (columns) => {
                selected = columns;
                return { eq: (key, value) => {
                    assert.equal(key, "id");
                    if (profile) assert.equal(value, profile.id);
                    return { single: async () => ({ data: profile, error: null }) };
                } };
            } };
        } };
    } };
    return moduleLoad.call(this, name, ...args);
};
process.env.ANTHROPIC_API_KEY = "local-fixture-only";
global.fetch = async (url, options) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    aiCalls++;
    aiPrompt = JSON.parse(options.body).system;
    return Response.json({ content: [{ type: "text", text: `===TITLE===\n검수 원고\n===BODY===\n${fixtureBody}` }] });
};
const { blogPhoneContact, appendBlogPhoneContact } = require("../lib/blog-contact.ts");
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const { POST } = require("../app/api/admin/claude-blog-write/route.ts");
const request = (profileId, auth = true) => new Request("http://localhost/api/admin/claude-blog-write", {
    method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { "x-fixture-auth": "yes" } : {}) },
    body: JSON.stringify({ content: "검수 주제", profileId, topic: "검수" }),
});
const assertLink = (body, href, count = 1) => {
    const $ = load(toNaverHtml(body));
    assert.equal($("a").length, count);
    if (count) assert.equal($("a").attr("href"), href);
};

(async () => {
    for (const [phone, href] of [
        ["02-000-0000, 070-0000-0000", "tel:020000000"],
        ["031-000-0000", "tel:0310000000"], ["1588-0000", "tel:15880000"],
        ["010-0000-0000", "tel:01000000000"], ["+82 2 000 0000", "tel:+8220000000"],
        ["(02) 000-0000", "tel:020000000"],
    ]) assert.equal(blogPhoneContact(phone).href, href);
    for (const phone of [undefined, null, "", ", 02-000-0000", "bad, 02-000-0000", "02-000-0000 / 070-0000-0000",
        "02-000-0000;ext=123", "javascript:alert(1)", '020000000\" onclick=\"bad', "123", "1234567890123456"])
        assert.equal(blogPhoneContact(phone), null);

    const contact = blogPhoneContact("02-000-0000, 070-0000-0000");
    for (const original of [fixtureBody, fixtureBody.replace(/\n/g, "\r\n"), "Body without date footer"]) {
        const body = appendBlogPhoneContact(original, contact);
        assertLink(body, contact.href);
        assert.equal(appendBlogPhoneContact(body, contact), body);
        if (body.includes("**기준일**")) assert.ok(body.indexOf("](tel:") < body.indexOf("**기준일**"));
    }
    assert.equal(appendBlogPhoneContact("", contact), "");
    assert.equal(appendBlogPhoneContact(fixtureBody, null), fixtureBody);
    const html = toNaverHtml('[**전화 상담** <img src=x onerror=bad>](tel:+8220000000)\n\n[unsafe](javascript:alert(1))\n\n[bad](tel:1234;ext=1)', "Title",
        ["thumbnail", "illustration", "info", "contact"].map((type) => ({ type, url: `https://example.com/${type}.png` })));
    const $ = load(html);
    assert.equal($("a").length, 1); assert.equal($("a").attr("href"), "tel:+8220000000");
    assert.equal($("a strong").text(), "전화 상담"); assert.equal($("a img").length, 0);
    assert.equal($("img").length, 4); assert.equal($("[onerror]").length, 0);
    assertLink("[bad](tel:123) [전화](tel:031-000-0000)", "tel:0310000000");

    assert.equal((await POST(request("A", false))).status, 401); assert.equal(aiCalls, 0);
    for (const [id, phone, expected] of [["A", "02-000-0000, 070-0000-0000", "tel:020000000"], ["B", "031-000-0000", "tel:0310000000"]]) {
        profile = { id, lawyer_name: "검수 변호사", phone };
        const response = await POST(request(id)); assert.equal(response.status, 200);
        const data = await response.json();
        assertLink(data.body, expected); assertLink(data.draftBody, expected);
        assert.ok(data.body.includes("관련 자료를 먼저 확인합니다.")); assert.equal(polishInput, fixtureBody);
        assert.equal(data.contactWarning, null); assert.equal(data.charCount, data.body.replace(/\s/g, "").length);
        assert.ok(selected.split(", ").includes("phone")); assert.ok(aiPrompt.includes("전화 링크를 직접 만들거나"));
        assert.ok(!data.body.includes("070-0000-0000"));
    }
    for (const phone of [null, "", "invalid, 02-000-0000"]) {
        profile = { id: "A", phone };
        const data = await (await POST(request("A"))).json();
        assertLink(data.body, null, 0); assert.ok(data.contactWarning);
    }
    profile = null;
    let data = await (await POST(request("missing"))).json();
    assertLink(data.body, null, 0); assert.ok(data.contactWarning);
    databaseFails = true;
    data = await (await POST(request("unavailable"))).json();
    assertLink(data.body, null, 0); assert.ok(data.contactWarning);
    data = await (await POST(request(undefined))).json();
    assertLink(data.body, null, 0); assert.equal(data.contactWarning, null);
    console.log("PASS: main phone only, validation, footer placement, idempotence, HTML escaping/tel links, four images, actual writer route, post-polish/draft links, profile isolation, missing phone warning, standalone compatibility");
})().catch((error) => { console.error(error); process.exitCode = 1; });
