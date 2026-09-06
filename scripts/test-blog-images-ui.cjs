// Headless application regression with synthetic API fixtures. No production writes or paid API calls.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), JSZip = require("jszip");
const { title, article, profile } = require("./blog-images-v7-fixtures.cjs");
const out = path.resolve(process.argv[2] || "C:/클로드/blog-images-v7-qa");
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(out, name + ".json"), "utf8")).card;
const plan = JSON.parse(fs.readFileSync(path.join(out, "plan.json"), "utf8"));
plan.direction = { concept: "실물과 여백의 비교", rationale: "원본 보관과 내용 정리의 관계를 보여주는 검수용 콘셉트", palette: "cobalt", typography: "serif", composition: "immersive", motif: "선명한 대비", alternatives: [{ concept: "대안 A", reasonNotChosen: "본문용 역할에 더 적합" }, { concept: "대안 B", reasonNotChosen: "원본 분리 관계가 약함" }] };
const responses = { thumbnail: { ...fixture(fs.existsSync(path.join(out, "documents-cover-live.json")) ? "documents-cover-live" : "cover-reused"), type: "thumbnail", name: "메인 썸네일" }, info: fixture("compare-contrast"), contact: fixture("contact-contrast") };
responses.info.designReview = { status: "revise", model: "gpt-6-astra", summary: "검수용 수정 권고: 본문 대비를 확인하세요.", issues: ["두 번째 행의 명암을 직접 확인해 주세요."] };

async function main() {
    const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
        await context.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text) => { window.__copiedContact = text; } } }); });
        const page = await context.newPage(), errors = [], requests = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let infoCalls = 0, planning = 0, refreshContact = false, detailReads = 0;
        await page.route("**/api/admin/**", async (route) => {
            const url = new URL(route.request().url());
            assert.equal(url.hostname, "127.0.0.1");
            const send = (json, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json) });
            if (url.pathname === "/api/admin/auth") return send({ authenticated: true });
            if (url.pathname === "/api/admin/blog-profiles") { if (url.searchParams.has("id")) detailReads++; return send(url.searchParams.has("id") ? { profile: refreshContact ? { ...profile, phone: "02-0000-1111" } : profile } : { profiles: [profile] }); }
            if (url.pathname.endsWith("/blog-images/posts")) return send({ posts: [] });
            if (url.pathname.endsWith("/blog-images/plan")) { planning++; return send({ plan }); }
            if (url.pathname.endsWith("/generate-design")) {
                const body = route.request().postDataJSON(); requests.push(body);
                assert.equal(body.profile.id, "fixture");
                assert.equal(body.plan.sourceHash, plan.sourceHash);
                if (body.cardType === "info" && infoCalls++ === 0) return send({ error: "검수용 일시 오류" }, 503);
                return send({ card: { ...responses[body.cardType], layout: body.style } });
            }
            throw new Error("Unexpected admin API request: " + url.pathname);
        });
        await page.goto("http://127.0.0.1:3100/admin/blog-images", { waitUntil: "networkidle" });
        await page.getByLabel("변호사", { exact: true }).selectOption("fixture");
        await page.getByLabel("제목", { exact: true }).fill(title);
        await page.getByLabel("본문", { exact: true }).fill(article);
        await page.getByRole("button", { name: "구성안 먼저 보기", exact: true }).click();
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        assert.equal(planning, 1);
        await page.getByRole("heading", { name: plan.direction.concept }).waitFor();
        await page.getByText(/^원문 근거 \d+곳$/).first().click();
        await page.getByText(plan.cards[0].evidence[0].quote, { exact: false }).first().waitFor();
        const scene = page.getByLabel("메인 썸네일 시각물 기획", { exact: true });
        await scene.fill("구체적인 두 문서 묶음을 대조하는 검수용 장면.");
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).click();
        await page.getByRole("button", { name: "2장 ZIP 저장", exact: true }).waitFor();
        assert.equal(requests.length, 3); assert.equal(planning, 1, "A set must share one plan");
        assert.match(requests[0].plan.cards[0].art.scene, /검수용 장면/);
        await page.getByRole("button", { name: "다시 시도", exact: true }).click();
        await page.getByRole("button", { name: "3장 ZIP 저장", exact: true }).waitFor();
        assert.equal(requests.length, 4); assert.equal(planning, 1);
        await page.getByRole("button", { name: "구성안 접기", exact: true }).click();
        await page.screenshot({ path: path.join(out, "admin-desktop.png"), fullPage: true });
        await page.getByRole("button", { name: "정보 정리 크게 보기", exact: true }).click();
        await page.getByRole("dialog").waitFor(); await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(), 0);
        const downloadEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "PNG 저장", exact: true }).first().click();
        assert.deepEqual(fs.readFileSync(await (await downloadEvent).path()), Buffer.from(responses.thumbnail.imageDataUrl.split(",")[1], "base64"));
        const zipEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "3장 ZIP 저장", exact: true }).click();
        const archive = await JSZip.loadAsync(fs.readFileSync(await (await zipEvent).path()));
        assert.equal(Object.keys(archive.files).length, 4);
        const guide = await archive.file("삽입안내.txt").async("string");
        assert.ok(guide.includes(responses.info.placement));
        assert.ok(guide.includes("tel:0200000000"), "ZIP includes actual phone URI separately from PNG");
        await page.getByRole("button", { name: "전화 상담 문의 링크 복사", exact: true }).click();
        assert.equal(await page.evaluate(() => window.__copiedContact), "tel:0200000000");

        const cover = page.getByRole("article", { name: "메인 썸네일 결과", exact: true });
        const closing = page.getByRole("article", { name: "변호사·상담 안내 결과", exact: true });
        await closing.getByText("레이아웃 편집", { exact: true }).click();
        assert.equal(await closing.getByRole("textbox").count(), 0, "Profile-only card has no article heading editor");
        assert.equal(await closing.getByRole("button", { name: "제목 적용", exact: true }).count(), 0);
        await cover.getByText("제목·레이아웃 편집", { exact: true }).click();
        await cover.getByLabel("메인 썸네일 제목 수정", { exact: true }).fill("수정한 이미지 제목");
        await cover.getByRole("button", { name: "제목 적용", exact: true }).click();
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        assert.equal(requests.length, 5);
        assert.equal(requests[4].renderOnly, true);
        assert.equal(requests[4].reuseArt.sourceHash, plan.sourceHash);
        assert.equal(requests[4].headingOverride, "수정한 이미지 제목");
        await cover.getByRole("button", { name: "다른 레이아웃", exact: true }).click();
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        assert.equal(requests[5].renderOnly, true); assert.equal(requests[5].style, "paper");

        await page.getByRole("button", { name: "본문에 넣어 보기", exact: true }).click();
        const bodyPreview = page.getByRole("article", { name: "본문 삽입 미리보기", exact: true });
        assert.equal(await bodyPreview.locator("figure").count(), 3);
        const anchored = bodyPreview.locator("div").filter({ has: page.getByText(plan.paragraphs[1].text, { exact: true }) }).first();
        assert.equal(await anchored.locator("figure").count(), 1, "Info follows the planned paragraph");
        await page.screenshot({ path: path.join(out, "admin-article.png"), fullPage: true });
        await page.getByLabel("본문", { exact: true }).fill(article + "\n\n새 원고 내용.");
        await page.getByText(/이전 원고·프로필·구성안으로 만든 이미지/).waitFor();
        assert.equal(await bodyPreview.locator("figure").count(), 3, "Editing source preserves previous results");
        await page.getByRole("button", { name: "이미지 보기", exact: true }).click();
        for (const width of [390, 360]) {
            await page.setViewportSize({ width, height: 844 });
            const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, main: document.querySelector("main").clientWidth, mainScroll: document.querySelector("main").scrollWidth }));
            console.log("Mobile dimensions", sizes);
            assert.ok(sizes.document <= sizes.viewport + 1 && sizes.mainScroll <= sizes.main + 1 && sizes.main >= width - 5);
            await page.screenshot({ path: path.join(out, "admin-mobile-" + width + ".png"), fullPage: true });
        }
        await page.getByRole("button", { name: "기획하고 이미지 만들기", exact: true }).click();
        // Previous images are intentionally preserved until profile loading finishes.
        // Wait for the batch's busy state to finish, not the pre-existing ZIP button.
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        await page.getByRole("button", { name: "3장 ZIP 저장", exact: true }).waitFor();
        assert.equal(planning, 2);
        assert.equal(requests.length, 9);
        for (const body of requests.slice(-3)) { assert.equal(body.headingOverride, undefined, "A new batch cannot inherit an old custom heading"); assert.equal(body.reuseArt, undefined); }
        refreshContact = true;
        const reads = detailReads;
        await page.getByRole("button", { name: "사진·연락처 새로 반영", exact: true }).click();
        await page.getByRole("button", { name: "이 구성으로 이미지 만들기", exact: true }).waitFor();
        assert.equal(requests.length, 10);
        assert.equal(requests[9].cardType, "contact"); assert.equal(requests[9].renderOnly, true);
        assert.equal(requests[9].profile.phone, "02-0000-1111", "Contact-only refresh fetches the newly saved profile");
        assert.equal(detailReads, reads + 1); assert.equal(planning, 2);
        assert.deepEqual(errors, []);
    console.log("PASS V9 UI: art direction / plan / evidence / edit → shared generation → single retry → exact PNG/ZIP → zero-art-cost edits → article anchors → stale preservation → fresh batch; 1440/390/360px.");
    } finally { await browser.close(); }
}
main().catch((e) => { console.error(e.stack); process.exitCode = 1; });
