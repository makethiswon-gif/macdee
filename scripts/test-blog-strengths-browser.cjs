// Local UI fixtures only. All API routes are intercepted; no real approval or publishing.
const { chromium } = require("playwright-core"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { pathToFileURL } = require("node:url");
const base = "http://127.0.0.1:3106", out = "C:/클로드/blog-strengths-review";
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=";
const profiles = ["A", "B", "C"].map((id) => ({ id, lawyerName: `검수 ${id}`, officeName: `가상 로펌 ${id}`, fields: ["상속"], specialty: ["상속"], dna: { voice: "설명형", heading: "질문형", emphasis: "보통" }, profileImages: [png], officeImages: [], phone: "02-0000-0000", website: "https://example.com", logoImage: "" }));
const empty = (id) => ({ profileId: id, firmId: "", lawyerId: "", revision: 0, updatedAt: "", designFamily: "auto", claims: [] });
const libraries = Object.fromEntries(profiles.map((p) => [p.id, empty(p.id)]));
const writes = [], posts = []; let conflict = false;
const types = ["thumbnail", "illustration", "info", "contact"];
(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
        await context.route("**/api/**", async (route) => {
            const req = route.request(), url = new URL(req.url()), data = req.postData() ? JSON.parse(req.postData()) : {};
            assert.equal(url.origin, base);
            const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
            if (url.pathname === "/api/admin/auth") return reply({ authenticated: true });
            if (url.pathname === "/api/admin/blog-settings") return reply({ profiles });
            if (url.pathname === "/api/admin/blog-profiles") return reply({ profile: profiles.find((p) => p.id === url.searchParams.get("id")) });
            if (url.pathname === "/api/admin/blog-strengths") {
                if (req.method() === "POST") {
                    if (conflict) return reply({ error: "다른 창에서 변경됐습니다. 새로고침 후 다시 저장해주세요." }, 409);
                    assert.ok(data.claims.every((c) => c.sourceUrl && c.sourceQuote));
                    libraries[data.profileId] = { ...data, revision: data.revision + 1 }; return reply({ library: libraries[data.profileId] });
                }
                return reply({ library: libraries[url.searchParams.get("profileId")], firms: [{ id: "firm-a", name: "가상 로펌 A" }], fields: ["상속"], legacy: [],
                    research: null, briefings: [{ name: "가상 로펌 A", candidates: [{ fact: "검수용 후보", sourceRef: "private/briefing" }] }] });
            }
            if (url.pathname === "/api/admin/blog-strengths/select") {
                const l = libraries[data.profileId], claims = l.claims.filter((c) => c.status === "approved" && (data.ids === undefined || data.ids.includes(c.id)));
                const selection = { profileId: data.profileId, firmId: l.firmId, revision: l.revision, designFamily: l.designFamily, claims, reason: "검수용 주제 일치" };
                return reply({ selection, eligible: l.claims, token: "local-fixture", review: { issues: [], applied: claims.map((c) => ({ id: c.id, text: c.articleText, paragraph: 2 })) } });
            }
            if (url.pathname === "/api/admin/claude-blog-write") {
                writes.push(data); const l = libraries[data.profileId];
                const claims = l.claims.filter((c) => data.strengthIds?.includes(c.id));
                return reply({ title: "상속 상담 준비", body: `## 준비\n\n확인한 자료를 정리합니다.\n\n${claims.map((c) => c.articleText).join("\n\n")}\n\n[대표번호](tel:0200000000)`,
                    strengthSelection: { profileId: data.profileId, firmId: l.firmId, revision: l.revision, designFamily: l.designFamily, claims }, strengthReview: { issues: [], applied: [] } });
            }
            if (url.pathname === "/api/admin/blog-posts") { const post = { ...data, id: "p" + posts.length, images: [] }; posts.push(post); return reply({ id: post.id }); }
            if (url.pathname === "/api/admin/blog-images/plan") return reply({ plan: { paragraphs: [], cards: types.map((type) => ({ type })) } });
            if (url.pathname === "/api/admin/blog-images/generate-design") return reply({ card: { type: data.cardType, name: data.cardType, imageDataUrl: png, width: 1024, height: 1200, warnings: [], altText: "검수", placement: "검수",
                designVersion: "editorial-v11", setId: "fixture-set", releaseToken: "fixture", layoutChecks: { passed: true, issues: [], textBlocks: 4 }, designReview: { status: "pass", model: "fixture", summary: "통과", issues: [] } } });
            if (url.pathname === "/api/admin/blog-posts/images") { const post = posts.find((p) => p.id === data.postId); post.images.push({ type: data.image.type, url: base + "/" + data.image.type + ".png" }); return reply({ images: post.images }); }
            throw new Error("Unexpected API " + url.pathname);
        });
        const page = await context.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message));
        page.on("dialog", async (dialog) => { console.log("Dialog:", dialog.message()); await dialog.accept(); });
        await page.goto(base + "/admin/blog-strengths", { waitUntil: "networkidle" });
        await page.getByLabel("변호사", { exact: true }).selectOption("A");
        await page.getByLabel("소속 로펌", { exact: true }).selectOption("firm-a");
        await page.getByLabel("이미지 지면", { exact: true }).selectOption("ledger");
        await page.getByRole("button", { name: "강점 추가", exact: true }).click();
        await page.getByLabel("사실 요약", { exact: true }).fill("상속 자료 검토");
        await page.getByLabel("원고 승인 문구", { exact: true }).fill("상속재산 목록과 증빙을 함께 확인합니다.");
        await page.getByLabel("이미지 승인 문구", { exact: true }).fill("상속재산 목록과 증빙 확인");
        await page.getByLabel("공개 근거 URL", { exact: true }).fill("https://example.com/verified");
        await page.getByLabel("근거 원문", { exact: true }).fill("PRIVATE-REVIEW-NOT-FOR-EXPORT");
        await page.getByLabel("상속", { exact: true }).check();
        await page.getByLabel("강점 1 상태", { exact: true }).selectOption("approved");
        await page.getByRole("button", { name: "변경 저장", exact: true }).click();
        await page.getByText("버전 1 저장 완료", { exact: true }).waitFor();
        assert.equal(libraries.A.designFamily, "ledger"); assert.equal(libraries.A.firmId, "firm-a");
        await page.getByLabel("변호사", { exact: true }).selectOption("B");
        await page.getByText("강점 0개 · 버전 0", { exact: true }).waitFor(); assert.equal(await page.getByLabel("사실 요약", { exact: true }).count(), 0);
        await page.getByLabel("변호사", { exact: true }).selectOption("A");
        await page.getByLabel("사실 요약", { exact: true }).waitFor({ timeout: 5000 }).catch(async (e) => { console.log(await page.locator("body").innerText()); throw e; });
        conflict = true; await page.getByLabel("이미지 승인 문구", { exact: true }).fill("변경 검수 문구"); await page.getByRole("button", { name: "변경 저장", exact: true }).click();
        await page.getByRole("alert").filter({ hasText: "다른 창" }).waitFor(); assert.equal(libraries.A.revision, 1); conflict = false;
        for (const width of [1440, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Manager overflow " + width);
            if (width < 600) assert.ok(await page.getByLabel("사실 요약", { exact: true }).evaluate((element) => element.getBoundingClientRect().width > 240), "Mobile editor must retain usable width");
            await page.screenshot({ path: path.join(out, `manager-${width}.png`), fullPage: true });
        }
        await page.goto(base + "/admin/blog-publish", { waitUntil: "networkidle" });
        await page.locator("#publish-profile").selectOption("A"); await page.locator("#publish-topic").fill("상속 자료");
        const checkbox = page.getByRole("checkbox"); await checkbox.waitFor(); await checkbox.uncheck();
        await page.getByRole("button", { name: "바로 원고 생성", exact: true }).click();
        await page.getByRole("button", { name: "카드 4장 완료", exact: true }).waitFor();
        assert.deepEqual(writes[0].strengthIds, []); assert.equal(writes[0].strengthRevision, 1);
        assert.doesNotMatch(posts[0].body, /PRIVATE-REVIEW|상속재산 목록과 증빙을 함께/);
        await page.screenshot({ path: path.join(out, "publish-excluded-mobile.png"), fullPage: true });
        assert.deepEqual(errors, []); await context.close();
        const gallery = await browser.newPage(); await gallery.goto(pathToFileURL(path.join(out, "index.html")).href);
        for (const width of [1600, 390]) {
            await gallery.setViewportSize({ width, height: 1000 });
            await gallery.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
            assert.ok(await gallery.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await gallery.screenshot({ path: path.join(out, `gallery-${width}.png`), fullPage: width > 500 });
        }
        console.log("PASS: explicit binding, approved save, profile isolation, layout selection, 409 preservation, 1440/390/320px, strength exclusion roundtrip, gallery desktop/mobile image loading");
    } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
