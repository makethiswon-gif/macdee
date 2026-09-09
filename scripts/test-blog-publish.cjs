// Local-only browser regression tests. Every API response and clipboard write is synthetic.
const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const JSZip = require("jszip");
const base = process.env.BLOG_PUBLISH_TEST_URL || "http://127.0.0.1:3106";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Never run mutation fixtures against production");
const out = path.resolve(process.env.BLOG_PUBLISH_TEST_OUT || "tmp/blog-publish-tests");
fs.mkdirSync(out, { recursive: true });
const fallback = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=";
const png = "data:image/png;base64," + (process.env.BLOG_PUBLISH_TEST_IMAGE ? fs.readFileSync(process.env.BLOG_PUBLISH_TEST_IMAGE).toString("base64") : fallback);
const types = ["thumbnail", "illustration", "info", "contact"];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profiles = ["A", "B"].map((name) => ({ id: "qa-" + name, lawyerName: "검수 변호사 " + name, officeName: "테스트 법률사무소",
    specialty: ["민사"], fields: ["민사"], chromeProfile: "qa", monthlyQuota: 20, publishedThisMonth: 0,
    dna: { voice: "설명형", heading: "질문형", emphasis: "강조" }, phone: name === "A" ? "02-000-0000, 070-0000-0000" : "031-000-0000", website: "https://example.com",
    profileImages: [png], officeImages: [], logoImage: "", brandColor: "#123456" }));
const reports = [];

(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        async function session(options = {}) {
            const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 1100 }, acceptDownloads: true });
            await context.addInitScript(() => {
                window.__copiedHtml = ""; window.__modernCopy = true; window.__legacyCopy = true;
                Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async (items) => {
                    if (!window.__modernCopy) throw new Error("Synthetic clipboard denial");
                    window.__copiedHtml = await (await items[0].getType("text/html")).text();
                } } });
                document.execCommand = () => {
                    const range = getSelection()?.rangeCount ? getSelection().getRangeAt(0) : null;
                    const holder = document.createElement("div");
                    if (range) holder.appendChild(range.cloneContents());
                    window.__copiedHtml = holder.innerHTML;
                    return window.__legacyCopy;
                };
            });
            const state = { posts: [], writes: [], plans: [], images: [], uploads: [], patches: [], errors: [], blocked: [],
                failType: options.failType, networkFailure: options.networkFailure, uploadFailure: options.uploadFailure, planFailure: options.planFailure };
            const reply = (route, data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
            await context.route("**/*", async (route) => {
                const req = route.request(), url = new URL(req.url());
                if (url.origin !== new URL(base).origin) { state.blocked.push(url.href); return route.abort(); }
                if (!url.pathname.startsWith("/api/")) {
                    if (!["GET", "HEAD"].includes(req.method())) return route.abort();
                    return route.continue();
                }
                const data = req.postData() ? JSON.parse(req.postData()) : {};
                switch (url.pathname) {
                    case "/api/admin/auth": return reply(route, { authenticated: true });
                    case "/api/admin/blog-settings": return reply(route, { profiles });
                    case "/api/admin/blog-profiles": return reply(route, { profile: profiles.find((p) => p.id === url.searchParams.get("id")) });
                    case "/api/admin/claude-blog-write": {
                        state.writes.push(data); await sleep(options.writeDelay || 90);
                        const phone = profiles.find((p) => p.id === data.profileId).phone.split(",")[0];
                        const contact = options.missingPhone ? "" : `\n\n[전화 상담 · 대표번호 ${phone}](tel:${phone.replace(/-/g, "")})`;
                        return reply(route, { title: "검수 원고 " + data.topic, body: `## 확인할 내용\n\n${data.topic} 원고입니다. ${data.profileId}\n\n**강조** 및 ==핵심 내용==.\n\n## 상담 준비\n\n서류를 확인합니다.${contact}`, polished: true,
                            contactWarning: options.missingPhone ? "대표번호를 확인하지 못해 전화 링크를 넣지 않았습니다. 변호사 프로필의 대표 전화번호 1(메인)을 확인해주세요." : null });
                    }
                    case "/api/admin/blog-posts": {
                        if (req.method() === "PATCH") {
                            state.patches.push(data);
                            const post = state.posts.find((p) => p.id === data.id);
                            assert.ok(post); Object.assign(post, data); return reply(route, { ok: true });
                        }
                        const post = { id: "post-" + (state.posts.length + 1), ...data, card_images: [], status: "draft" };
                        state.posts.push(post); return reply(route, { id: post.id });
                    }
                    case "/api/admin/blog-posts/topics":
                        await sleep(options.topicDelay || 30);
                        return reply(route, { topics: [{ topic: "추천 주제", field: "민사", angle: "검수 관점", titleIdea: "검수", reason: "검수" }] });
                    case "/api/admin/blog-images/plan":
                        state.plans.push(data); await sleep(40);
                        if (state.planFailure) return route.fulfill({ status: 502, contentType: "text/html", body: "<h1>Bad Gateway</h1>" });
                        return reply(route, { plan: { sourceHash: "qa-only", paragraphs: [{ id: "p2", text: data.content.split("\n\n")[1] }], cards: types.map((type) => ({ type })) } });
                    case "/api/admin/blog-images/generate-design":
                        state.images.push(data); await sleep(40);
                        if (state.networkFailure === data.cardType) return route.abort("failed");
                        if (state.failType === data.cardType) return reply(route, { error: "검수용 생성 실패" }, 502);
                        return reply(route, { card: { type: data.cardType, name: data.cardType, imageDataUrl: png, width: 1024, height: 1145,
                            altText: "검수 이미지 " + data.title, placement: "관련 문단 다음", warnings: [], designVersion: "editorial-v10", sourceParagraphId: "p2" } });
                    case "/api/admin/blog-posts/images": {
                        state.uploads.push(data);
                        if (state.uploadFailure === data.image.type) return reply(route, { error: "검수용 업로드 실패" }, 500);
                        const post = state.posts.find((p) => p.id === data.postId); assert.ok(post);
                        post.card_images = [...post.card_images.filter((i) => i.type !== data.image.type), { type: data.image.type, url: `${base}/qa-images/${post.id}-${data.image.type}.png` }];
                        const done = types.every((type) => post.card_images.some((i) => i.type === type));
                        post.status = done ? "ready" : "draft";
                        return reply(route, { images: post.card_images, done });
                    }
                    default: state.blocked.push(url.pathname); return reply(route, { error: "Unrecognized local QA API" }, 403);
                }
            });
            const page = await context.newPage(); page.on("pageerror", (e) => state.errors.push(e.message));
            await page.goto(base + "/admin/blog-publish", { waitUntil: "networkidle", timeout: 60000 });
            await page.locator("#publish-profile").selectOption("qa-A");
            const start = async (topic) => { await page.locator("#publish-topic").fill(topic); await page.getByRole("button", { name: "바로 원고 생성", exact: true }).click(); };
            const idle = async () => { await page.waitForFunction(() => !document.querySelector("#publish-profile").disabled); };
            const done = async () => { await page.getByRole("button", { name: "카드 4장 완료", exact: true }).waitFor(); await idle(); };
            const close = async () => { assert.deepEqual(state.errors, []); await context.close(); };
            return { context, page, state, start, idle, done, close };
        }

        {
            const s = await session(); await s.start("첫 번째"); await s.done();
            assert.equal(s.state.posts.length, 1); assert.equal(s.state.posts[0].topic, "첫 번째"); assert.equal(s.state.uploads.length, 4);
            assert.ok(s.state.uploads.every((u) => u.total === 4 && u.requiredTypes.length === 4));
            await s.page.getByRole("button", { name: "네이버용 복사", exact: true }).click(); await s.idle();
            let html = await s.page.evaluate(() => window.__copiedHtml);
            assert.equal((html.match(/<img/g) || []).length, 4); assert.match(html, /<strong>/); assert.match(html, /thumbnail.png/);
            assert.match(html, /href="tel:020000000"/); assert.doesNotMatch(html, /070-0000-0000/);
            assert.match(s.state.posts[0].body, /\]\(tel:020000000\)/);
            assert.match(s.state.plans[0].content, /\]\(tel:020000000\)/);
            await s.page.getByLabel("메인 썸네일 미리보기", { exact: true }).click();
            await s.page.getByRole("dialog").waitFor(); await s.page.keyboard.press("Escape");
            assert.equal(await s.page.getByRole("dialog").count(), 0);
            const downloadEvent = s.page.waitForEvent("download");
            await s.page.getByRole("button", { name: "이미지 ZIP 다운로드" }).click();
            const download = await downloadEvent; const zip = await JSZip.loadAsync(fs.readFileSync(await download.path()));
            assert.equal(Object.keys(zip.files).filter((name) => name.endsWith(".png")).length, 4);
            assert.match(await zip.file("원고.txt").async("string"), /\]\(tel:020000000\)/);
            await s.idle();
            await s.page.getByLabel("원고 제목", { exact: true }).fill("수정된 제목");
            await s.page.getByLabel("원고 본문", { exact: true }).fill("수정된 본문");
            assert.equal(await s.page.locator("article img").count(), 0);
            await s.page.getByRole("button", { name: "수정 저장", exact: true }).click(); await s.idle();
            assert.equal(s.state.posts[0].title, "수정된 제목"); assert.equal(s.state.posts[0].body, "수정된 본문");
            assert.equal(s.state.posts[0].status, "draft"); assert.deepEqual(s.state.posts[0].card_images, []);
            await s.page.getByRole("button", { name: "저장하고 카드 4장 만들기", exact: true }).click(); await s.done();
            assert.equal(s.state.posts.length, 1); assert.equal(s.state.plans.at(-1).content, "수정된 본문");
            await s.start("두 번째"); await s.done();
            assert.equal(s.state.posts.length, 2); assert.equal(s.state.uploads.length, 12); assert.equal(s.state.posts[1].topic, "두 번째");
            assert.ok(s.state.uploads.slice(-4).every((u) => u.postId === s.state.posts[1].id));
            await s.page.evaluate(() => { window.__modernCopy = false; window.__legacyCopy = true; });
            await s.page.getByRole("button", { name: "네이버용 복사", exact: true }).click(); await s.idle();
            html = await s.page.evaluate(() => window.__copiedHtml); assert.equal((html.match(/<img/g) || []).length, 4);
            assert.match(html, /href="tel:020000000"/);
            await s.page.evaluate(() => { window.__legacyCopy = false; });
            await s.page.getByRole("button", { name: "복사됨", exact: true }).click(); await s.idle();
            assert.match(await s.page.getByRole("alert").filter({ hasText: "복사에 실패" }).innerText(), /복사에 실패/);
            assert.equal(await s.page.getByRole("button", { name: "복사됨", exact: true }).count(), 0);
            await s.page.screenshot({ path: path.join(out, "desktop.png"), fullPage: true });
            reports.push("create, edit/PATCH, regenerate, second draft, modern/fallback/failed copy, four HTML images, ZIP, preview");
            await s.close();
        }
        for (const kind of ["failType", "networkFailure", "uploadFailure"]) {
            const s = await session({ [kind]: "contact" }); await s.start(kind); await s.idle();
            assert.equal(s.state.posts[0].status, "draft"); assert.equal(s.state.posts[0].card_images.length, 3);
            assert.equal(await s.page.locator("article img").count(), kind === "uploadFailure" ? 4 : 3);
            s.state[kind] = null;
            await s.page.getByRole("button", { name: "변호사·상담 안내 재시도", exact: true }).click(); await s.done();
            assert.equal(s.state.plans.length, 1); assert.equal(s.state.images.length, kind === "uploadFailure" ? 4 : 5);
            assert.equal(s.state.posts.length, 1); assert.equal(s.state.posts[0].card_images.length, 4);
            reports.push(kind + ": successful cards retained, only failed generation/upload retried");
            await s.close();
        }
        {
            const s = await session({ writeDelay: 800 }); await s.start("전환 검수");
            assert.equal(await s.page.locator("#publish-profile").isDisabled(), true);
            await s.page.evaluate(() => {
                const select = document.querySelector("#publish-profile"); select.value = "qa-B"; select.dispatchEvent(new Event("change", { bubbles: true }));
            });
            await s.done();
            assert.equal(await s.page.locator("#publish-profile").inputValue(), "qa-A");
            assert.equal(s.state.posts[0].profileId, "qa-A");
            await s.page.locator("#publish-profile").selectOption("qa-B");
            assert.equal(await s.page.getByLabel("원고 본문", { exact: true }).count(), 0);
            await s.start("B 원고"); await s.done(); assert.equal(s.state.posts[1].profileId, "qa-B");
            assert.match(s.state.posts[1].body, /\]\(tel:0310000000\)/);
            await s.page.getByRole("button", { name: "네이버용 복사", exact: true }).click(); await s.idle();
            const html = await s.page.evaluate(() => window.__copiedHtml);
            assert.match(html, /href="tel:0310000000"/); assert.doesNotMatch(html, /tel:020000000/);
            await s.page.getByRole("button", { name: "주제 추천받기", exact: true }).click(); await s.idle();
            await s.page.getByRole("button", { name: /민사 추천 주제/ }).click();
            await s.page.getByRole("button", { name: "원고 생성", exact: true }).click(); await s.done();
            assert.equal(s.state.posts[2].topic, "추천 주제"); assert.equal(s.state.posts[2].field, "민사");
            reports.push("lawyer switching locked while running; reset and recommended-topic metadata isolated"); await s.close();
        }
        {
            const s = await session({ missingPhone: true }); await s.start("번호 미등록"); await s.done();
            assert.equal(await s.page.getByRole("status").filter({ hasText: "대표번호를 확인하지 못해" }).count(), 1);
            assert.doesNotMatch(s.state.posts[0].body, /tel:/);
            await s.page.locator("#publish-profile").selectOption("qa-B");
            assert.equal(await s.page.getByRole("status").filter({ hasText: "대표번호를 확인하지 못해" }).count(), 0);
            reports.push("phone CTA persists in draft, image plan, ZIP, rich/fallback copy; lawyer numbers isolated; missing phone warning resets"); await s.close();
        }
        {
            const s = await session({ planFailure: true }); await s.start("기획 실패"); await s.idle();
            assert.match(await s.page.getByRole("alert").filter({ hasText: "502" }).innerText(), /502/);
            s.state.planFailure = false;
            await s.page.getByRole("button", { name: "저장하고 카드 4장 만들기", exact: true }).click(); await s.done();
            assert.equal(s.state.posts.length, 1); reports.push("non-JSON planning error is recoverable without another draft"); await s.close();
        }
        {
            const s = await session({ writeDelay: 900 }); await s.start("페이지 이동");
            await s.page.goto(base + "/admin"); await sleep(1100);
            assert.equal(s.state.posts.length, 0); assert.equal(s.state.images.length, 0);
            reports.push("unmount aborts stale draft pipeline"); await s.close();
        }
        for (const width of [320, 390, 768]) {
            const s = await session({ viewport: { width, height: 900 } }); await s.start("반응형 검수"); await s.done();
            const layout = await s.page.evaluate(() => {
                const main = document.querySelector("main");
                return { page: document.documentElement.scrollWidth <= innerWidth, main: main.scrollWidth <= main.clientWidth + 1,
                    images: [...document.querySelectorAll("article img")].every((img) => img.complete && img.naturalWidth > 0) };
            });
            assert.deepEqual(layout, { page: true, main: true, images: true });
            await s.page.getByRole("button", { name: "네이버용 복사", exact: true }).click(); await s.idle();
            assert.match(await s.page.evaluate(() => window.__copiedHtml), /href="tel:020000000"/);
            await s.page.screenshot({ path: path.join(out, `mobile-${width}.png`), fullPage: true });
            reports.push(`responsive ${width}px: no horizontal overflow, all images loaded`); await s.close();
        }
    } finally {
        await browser.close(); fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(reports, null, 2));
        console.log(reports.join("\n"));
    }
})().catch((e) => { console.error(e); process.exitCode = 1; });
