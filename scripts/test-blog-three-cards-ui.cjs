// Local fixture test. No model requests, credentials, or production writes.
const { chromium } = require("playwright-core"), fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const base = process.env.BLOG_PUBLISH_TEST_URL || "http://127.0.0.1:3117";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=";
const studioFour = process.env.BLOG_CARD_TEST_STUDIO === "1";
const types = studioFour ? ["thumbnail", "illustration", "info", "contact"] : ["thumbnail", "info", "contact"], format = studioFour ? "studio-four-v1" : "editorial-three-v1";
const profile = { id: "mqaaoypk621p6", lawyerName: "김정웅", officeName: "법무법인 양영&정훈", jobTitle: "변호사", specialty: ["회생", "파산"], fields: ["회생", "파산"], phone: "02-1234-5678", website: "https://example.com", brandColor: "#080808", profileImages: [png], officeImages: [], logoImage: "", dna: {} };
const body = "## 확인할 자료\n\n계약서와 거래 내역을 확인합니다.\n\n## 상담 준비\n\n사실관계에 따라 달라질 수 있습니다.\n\n[전화 상담](tel:0212345678)";
const plan = { version: "visual-plan-v11", setFormat: format, publicationEdition: "jeongung-202609-v1", sourceHash: "test", question: "어떤 자료가 필요한가요?", thesis: "자료를 정리합니다.", paragraphs: [{ id: "p1", text: "계약서와 거래 내역을 확인합니다." }], cards: types.map(type => ({ type, heading: "확인할 자료", purpose: "자료 안내", afterParagraphId: "p1", evidence: [] })) };
const out = path.resolve("tmp/profile-design/browser", format); fs.mkdirSync(out, { recursive: true });
const pngFor = type => {
    const redesigned = path.resolve(`tmp/three-card-redesign/${type}.png`);
    if (!studioFour && fs.existsSync(redesigned)) return "data:image/png;base64," + fs.readFileSync(redesigned).toString("base64");
    const photo = path.resolve(`tmp/blog-photo-recovery/${profile.id}-photo.png`);
    const file = type === "info" && fs.existsSync(photo) ? photo : path.resolve(`tmp/editorial-three-review/${profile.id}-${type}.png`);
    return !studioFour && fs.existsSync(file) ? "data:image/png;base64," + fs.readFileSync(file).toString("base64") : png;
};
if (!studioFour) {
    plan.proofSelection = { mode: "basic", claims: [], revision: 0, profileId: profile.id };
    plan.thesis = "계약 내용과 증거를 함께 확인해야 하며 사정에 따라 예외가 적용될 수 있습니다. ".repeat(16).trim();
}
(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        for (const width of [1440, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 } });
            const generated = [], generationRequests = [], uploaded = [], errors = [], planningRequests = []; let saved = [], written = 0, savedDrafts = 0, imageUnavailable = !studioFour && width !== 1440, planningFailure = !studioFour;
            await context.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async items => { window.__copied = await (await items[0].getType("text/html")).text(); } } }); });
            await context.route("**/*", async route => {
                const req = route.request(), url = new URL(req.url());
                if (url.origin !== new URL(base).origin) return route.abort();
                if (/^\/fixture-\w+\.png$/.test(url.pathname)) return route.fulfill({ contentType: "image/png", body: Buffer.from(pngFor(url.pathname.slice(9, -4)).split(",")[1], "base64") });
                if (!url.pathname.startsWith("/api/")) return route.continue();
                const b = req.postData() ? JSON.parse(req.postData()) : {};
                const reply = data => route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
                if (url.pathname === "/api/admin/auth") return reply({ authenticated: true });
                if (url.pathname.endsWith("/blog-settings")) return reply({ profiles: [profile] });
                if (url.pathname.endsWith("/blog-profiles")) return reply({ profiles: [profile], profile });
                if (url.pathname.endsWith("/blog-images/preflight")) return imageUnavailable
                    ? route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: width === 390 ? "두 번째 이미지에는 승인된 스튜디오 사진이 필요합니다. 스튜디오 사진 생성기에서 사진을 승인하고 블로그 연결을 켜주세요." : "승인된 사진은 6장 있습니다. 스튜디오 사진의 블로그 연결이 꺼져 있습니다. 사진함에서 블로그 발행에 승인 사진 사용을 켜주세요." }) }) : reply({ ok: true });
                if (url.pathname.endsWith("/blog-strengths/select")) return reply({ selection: { profileId: profile.id, claims: [], revision: 0, designFamily: "auto" }, eligible: [], token: "fixture", review: { issues: [], applied: [] } });
                if (url.pathname.endsWith("/claude-blog-write")) { written++; return reply({ title: "회생 절차의 자료 확인", body, strengthSelection: { profileId: profile.id, claims: [], revision: 0, designFamily: "auto" } }); }
                if (url.pathname.endsWith("/blog-posts")) { if (req.method() !== "GET") savedDrafts++; return reply(req.method() === "GET" ? { posts: [] } : { id: "test-post" }); }
                if (url.pathname.endsWith("/blog-images/plan")) {
                    assert.equal(b.basicProfile, true); planningRequests.push(b);
                    if (planningFailure) { planningFailure = false; return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: "원고의 핵심의 길이 또는 형식을 확인해 주세요. 문장을 잘라 저장하지 않았습니다." }) }); }
                    return reply({ plan });
                }
                if (url.pathname.endsWith("/blog-images/generate-design")) {
                    generated.push(b.cardType); generationRequests.push(b);
                    return reply({ card: { type: b.cardType, name: b.cardType, setFormat: format, publicationEdition: plan.publicationEdition, imageDataUrl: pngFor(b.cardType), width: studioFour ? 1200 : 2000, height: studioFour ? (b.cardType === "contact" ? 900 : 1500) : 2000, altText: "등록 자료", placement: "본문", warnings: [], designVersion: "editorial-v11", layoutChecks: { passed: true, issues: [], textBlocks: 4 }, sourceParagraphId: "p1", productionId: b.cardType, setId: "fixture-three", releaseToken: "fixture-only",
                        ...(b.cardType === "info" && !studioFour ? { studioPhotos: [{ assetId: "approved-fixture", version: 1 }], photoChecks: { source: "studio", width: 1280, height: 1600, areaRatio: 0.8, upscale: 1.25 } } : {}),
                        ...(b.cardType === "contact" ? { contactActions: [{ label: "상담", display: "02-1234-5678", href: "tel:0212345678" }] } : {}) } });
                }
                if (url.pathname.endsWith("/blog-posts/images")) { assert.equal(b.setFormat, format); assert.deepEqual(b.requiredTypes, types); assert.equal(b.total, types.length); uploaded.push(b.image.type); saved.push({ type: b.image.type, url: `${base}/fixture-${b.image.type}.png` }); return reply({ images: saved, done: saved.length === types.length }); }
                return route.fulfill({ status: 404, body: "unknown fixture API" });
            });
            const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
            await page.goto(base + "/admin/blog-publish", { waitUntil: "networkidle" });
            await page.locator("#publish-profile").selectOption(profile.id);
            assert.equal(await page.getByRole("checkbox", { name: "두 번째 이미지에 승인 경력 표시", exact: true }).isChecked(), false);
            await page.locator("#publish-topic").fill("회생 절차");
            await page.getByRole("button", { name: "바로 원고 생성", exact: true }).click();
            if (imageUnavailable) {
                await page.getByRole("alert").filter({ hasText: "원고는 저장했습니다. 이미지 생성만 보류했습니다:" }).waitFor();
                assert.equal(written, 1); assert.equal(savedDrafts, 1); assert.equal(generated.length, 0);
                assert.equal(planningRequests.length, 0, "Missing readiness cannot bill an image plan");
                if (width === 390 || width === 320) {
                    assert.equal(await page.getByRole("link", { name: width === 390 ? "스튜디오 사진 승인하기" : "블로그 연결 설정" }).getAttribute("href"), `/admin/lawyer-studio?profileId=${profile.id}&view=library`);
                    assert.equal(await page.getByRole("button", { name: "새 이미지 구성안 기획 (유료)", exact: true }).isDisabled(), true);
                }
                imageUnavailable = false;
                await page.getByRole("button", { name: `저장하고 카드 ${types.length}장 만들기`, exact: true }).click();
            }
            if (!studioFour) {
                await page.getByRole("alert").filter({ hasText: "원고의 핵심" }).waitFor();
                assert.equal(written, 1); assert.equal(savedDrafts, 1); assert.equal(generated.length, 0);
                await page.getByRole("button", { name: "저장된 구성안으로 이어 만들기", exact: true }).click();
            }
            await page.getByRole("button", { name: `카드 ${types.length}장 완료`, exact: true }).waitFor();
            if (!studioFour) {
                assert.equal(planningRequests.at(-1).recoverOnly, true);
                assert.equal(planningRequests.at(-1).forceReplan, false);
                assert.equal(planningRequests.at(-1).attemptId, undefined);
                assert.equal(savedDrafts, 1, "Planning recovery keeps the saved manuscript ID");
            }
            assert.equal(written, 1, "Photo recovery never rewrites or rebills the saved manuscript");
            assert.deepEqual([...generated].sort(), [...types].sort()); assert.deepEqual(uploaded, types);
            await page.getByRole("button", { name: "네이버용 복사", exact: true }).click();
            await page.waitForFunction(() => !!window.__copied);
            const copied = await page.evaluate(() => window.__copied);
            assert.equal((copied.match(/<img /g) || []).length, types.length); assert.ok(copied.includes('href="tel:0212345678"'));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.getByText(studioFour ? "스튜디오 사진 2" : "변호사·로펌 신뢰", { exact: true }).scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(out, `publish-${width}.png`) });
            await page.goto(base + "/admin/blog-images", { waitUntil: "networkidle" });
            planningFailure = !studioFour;
            await page.getByRole("combobox", { name: "변호사", exact: true }).selectOption(profile.id);
            assert.equal(await page.getByRole("checkbox", { name: "두 번째 이미지에 승인 경력 표시", exact: true }).isChecked(), false);
            await page.getByRole("textbox", { name: "본문", exact: true }).fill(body);
            await page.getByRole("button", { name: "기획하고 이미지 만들기", exact: true }).click();
            if (!studioFour) {
                await page.getByRole("alert").filter({ hasText: "원고의 핵심" }).waitFor();
                const beforeRecoveryImages = generated.length;
                await page.getByRole("button", { name: "저장된 구성안 복구", exact: true }).click();
                await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
                assert.equal(generated.length, beforeRecoveryImages, "Plan-only recovery never generates an image");
                assert.equal(planningRequests.at(-1).recoverOnly, true);
                assert.equal(planningRequests.at(-1).forceReplan, false);
                assert.equal(planningRequests.at(-1).attemptId, undefined);
                assert.equal(await page.getByText(plan.thesis, { exact: true }).textContent(), plan.thesis);
                await page.getByText(plan.thesis, { exact: true }).scrollIntoViewIfNeeded();
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
                await page.screenshot({ path: path.join(out, `recovered-plan-${width}.png`) });
                await page.getByRole("button", { name: "구성안 접기", exact: true }).click();
                await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).click();
            }
            await page.getByText(`${types.length}/${types.length}장 제작 완료`, { exact: true }).waitFor();
            if (!studioFour) {
                const before = generated.length, beforePlans = planningRequests.length;
                await page.getByRole("button", { name: "세 장 무료 재편집", exact: true }).click();
                await page.getByText(`${types.length}/${types.length}장 제작 완료`, { exact: true }).waitFor();
                assert.equal(generated.length, before + 3);
                assert.equal(planningRequests.length, beforePlans, "Free recomposition never replans");
                assert.ok(generationRequests.slice(-3).every(r => r.renderOnly === true && !r.attemptId), "All three requests are render-only, with no new paid attempt");
            }
            assert.equal(await page.getByText(studioFour ? "스튜디오 사진 2" : "변호사·로펌 신뢰", { exact: true }).count(), 1);
            assert.equal(await page.getByRole("button", { name: `${types.length}장 ZIP 저장`, exact: true }).isEnabled(), true);
            assert.deepEqual(errors, []);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(out, `studio-${width}.png`) });
            await page.getByRole("textbox", { name: "본문", exact: true }).fill(body + "\n\n수정한 원고입니다.");
            assert.equal(await page.getByRole("button", { name: `${types.length}장 ZIP 저장`, exact: true }).count(), 0, "Editing cannot export stale image bytes");
            await context.close();
        }
        console.log(`PASS: ${types.length}-card publish/upload/copy/tel/ZIP, photo-only default, photo/storage failures save manuscript, free image-only resume, stale export cleared at 1440/390/320px; no external model requests.`);
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
