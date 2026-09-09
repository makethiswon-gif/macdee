// Local-only UI fixtures. Real rendered PNGs, mocked APIs, no production writes.
const { chromium } = require("playwright-core"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), JSZip = require("jszip");
const { title, article, profile } = require("./blog-images-v7-fixtures.cjs");
const out = path.resolve(process.argv[2] || "C:/클로드/blog-quality-review/regression");
const base = process.env.BLOG_IMAGES_TEST_URL || "http://127.0.0.1:3106";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(out, name + ".json"), "utf8")).card;
const plan = JSON.parse(fs.readFileSync(path.join(out, "plan.json"), "utf8"));
const names = { thumbnail: "메인 썸네일", illustration: "본문 시각물", info: "정보 정리", contact: "변호사·상담 안내" };
const responses = { thumbnail: fixture("cover-reused"), illustration: fixture("illustration-paper"), info: fixture("compare-paper"), contact: fixture("contact-paper") };
for (const [type, c] of Object.entries(responses)) Object.assign(c, { type, name: names[type], designVersion: "editorial-v11", setId: "fixture-set", productionId: (type === "thumbnail" ? "a" : "b").repeat(64),
    releaseToken: "fixture-release", layoutChecks: { passed: true, issues: [], textBlocks: 5 }, designReview: { status: "pass", model: "fixture", summary: "검수 통과", issues: [] },
    artSourceHash: plan.cards.find((c) => c.type === type)?.art ? plan.sourceHash : undefined });
(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
        const page = await context.newPage(), requests = [], errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        let planning = 0, failInfo = true, holdInfo = true;
        await context.route("**/api/**", async (route) => {
            const req = route.request(), url = new URL(req.url()), data = req.postDataJSON();
            assert.equal(url.origin, base);
            const send = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
            if (url.pathname.endsWith("/auth")) return send({ authenticated: true });
            if (url.pathname.endsWith("/blog-profiles")) return send(url.searchParams.has("id") ? { profile } : { profiles: [profile] });
            if (url.pathname === "/api/admin/blog-posts") {
                assert.equal(url.searchParams.get("profile_id"), profile.id);
                assert.equal(url.searchParams.get("full"), "1");
                return send({ posts: [{ id: "saved-draft", title, body: article }] });
            }
            if (url.pathname.endsWith("/plan")) { planning++; return send({ plan }); }
            if (url.pathname.endsWith("/generate-design")) {
                requests.push(data);
                if (data.cardType === "info" && failInfo) { failInfo = false; return send({ error: "검수용 장애" }, 503); }
                const card = { ...responses[data.cardType], layout: data.style || "paper" };
                if (data.cardType === "info" && holdInfo) { delete card.releaseToken; card.designReview = { status: "unavailable", model: "fixture", summary: "검수 대기", issues: [] }; }
                return send({ card });
            }
            throw new Error("Unexpected API: " + url.pathname);
        });
        await page.goto(base + "/admin/blog-images", { waitUntil: "networkidle" });
        await page.getByLabel("변호사", { exact: true }).selectOption("fixture");
        await page.getByLabel("기존 원고 불러오기").selectOption("saved-draft");
        assert.equal(await page.getByLabel("제목", { exact: true }).inputValue(), title);
        assert.equal(await page.getByLabel("본문", { exact: true }).inputValue(), article);
        assert.equal(await page.getByLabel("AI 이미지 품질", { exact: true }).inputValue(), "high");
        await page.getByRole("button", { name: "구성안 먼저 보기", exact: true }).click();
        const idle = () => page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        await idle(); await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).click(); await idle();
        assert.equal(requests.length, 4); assert.equal(planning, 1); assert.ok(requests.every((r) => r.quality === "high"));
        await page.getByRole("button", { name: "다시 시도", exact: true }).click(); await idle();
        const info = page.getByRole("article", { name: "정보 정리 결과", exact: true });
        assert.equal(await info.getByRole("button", { name: "PNG 저장", exact: true }).isDisabled(), true);
        await page.getByRole("button", { name: "4장 ZIP 저장", exact: true }).click();
        await page.getByRole("alert").filter({ hasText: "4장 모두 검수" }).waitFor();
        await info.getByRole("button", { name: "정보 정리 크게 보기", exact: true }).click();
        assert.equal(await page.getByRole("button", { name: "미리보기 이미지 저장", exact: true }).isDisabled(), true);
        await page.keyboard.press("Escape");
        holdInfo = false; await info.getByRole("button", { name: "재검수", exact: true }).click(); await idle();
        assert.equal(requests.length, 6); assert.equal(planning, 1);
        const zipEvent = page.waitForEvent("download"); await page.getByRole("button", { name: "4장 ZIP 저장", exact: true }).click();
        const zip = await JSZip.loadAsync(fs.readFileSync(await (await zipEvent).path()));
        assert.equal(Object.keys(zip.files).filter((p) => p.endsWith(".png")).length, 4);
        const cover = page.getByRole("article", { name: "메인 썸네일 결과", exact: true });
        await cover.getByText("제목·레이아웃 편집", { exact: true }).click();
        await cover.getByLabel("메인 썸네일 제목 수정", { exact: true }).fill("수정한 이미지 제목");
        await cover.getByRole("button", { name: "제목 적용", exact: true }).click(); await idle();
        assert.equal(requests.at(-1).renderOnly, true); assert.equal(requests.at(-1).reuseProductionId, responses.thumbnail.productionId);
        assert.equal(requests.at(-1).reuseArt, undefined);
        assert.equal(requests.at(-1).headingOverride, "수정한 이미지 제목");
        await page.getByRole("button", { name: "본문에 넣어 보기", exact: true }).click();
        assert.equal(await page.getByRole("article", { name: "본문 삽입 미리보기", exact: true }).locator("figure").count(), 4);
        await page.getByRole("button", { name: "이미지 보기", exact: true }).click();
        for (const width of [1440, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.waitForFunction(() => [...document.querySelectorAll("article img")].every((i) => i.complete && i.naturalWidth));
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await page.screenshot({ path: path.join(out, "studio-" + width + ".png"), fullPage: width === 1440 });
        }
        await page.getByLabel("본문", { exact: true }).fill(article + "\n추가 원고.");
        await page.getByText(/이전 원고·프로필·구성안으로 만든 이미지/).waitFor();
        for (const button of await page.getByRole("button", { name: "PNG 저장", exact: true }).all()) assert.ok(await button.isDisabled());
        assert.deepEqual(errors, []);
        console.log("PASS V11 studio: High default, four-card plan, partial failure, review hold/PNG/modal/ZIP gate, recheck, private art reuse, four anchors, stale export gate, responsive 1440/390/320px.");
    } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
