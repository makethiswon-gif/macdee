// 2026-09-22 재설계 흐름의 픽스처 테스트(모델 호출·자격 정보·운영 쓰기 없음):
//  이어하기(?post=)와 저장 이미지 무료 복구, 재창작 모드 요청 형태, 부분 수정 비교·적용·되돌리기, 본문 수정 뒤 내보내기 잠금,
//  사실 확인 상태 저장, 확정 버튼 중복 클릭 시 유료 기획 1회, 비용 패널 표시.
const { chromium } = require("playwright-core"), fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const base = process.env.BLOG_PUBLISH_TEST_URL || "http://127.0.0.1:3117";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=";
const types = ["thumbnail", "info", "contact"], format = "editorial-three-v1";
const profile = { id: "mqaaoypk621p6", lawyerName: "김정웅", officeName: "법무법인 양영&정훈", jobTitle: "변호사", specialty: ["회생", "파산"], fields: ["회생", "파산"], phone: "02-1234-5678", website: "https://example.com", brandColor: "#080808", profileImages: [png], officeImages: [], logoImage: "", dna: { voice: "설명형", heading: "질문형", emphasis: "보통" }, chromeProfile: "", monthlyQuota: 0, publishedThisMonth: 0 };
const body = "도입 문단입니다. 개인회생은 소득이 있는 채무자가 신청합니다.\n\n## 확인할 자료\n\n계약서와 거래 내역을 확인합니다.\n\n## 상담 준비\n\n사실관계에 따라 달라질 수 있습니다.\n\n---\n**기준일** 2026년 9월 22일 작성\n[전화 상담](tel:0212345678)";
const brief = { heading: "회생의\n갈림길", kicker: "개인회생", emphasis: "갈림길", subject: "가계부를 펼친 식탁", scene: "아침 식탁 위 가계부와 커피잔, 창가의 부드러운 빛이 왼쪽에서 들어오고 아래쪽은 어두운 나무 바닥으로 남긴다. 중원거리.", message: "숫자보다 소득이 결정한다", avoid: ["법봉"], alternateScene: "", question: "개인회생은 누가 신청할 수 있나", thesis: "소득이 있으면 회생, 없으면 파산으로 갈린다.", layoutRecipe: "title-band", family: "campaign" };
const plan = { version: "visual-plan-v11", setFormat: format, publicationEdition: "jeongung-202609-v1", sourceHash: "test", question: brief.question, thesis: brief.thesis, paragraphs: [{ id: "p1", text: "도입 문단입니다." }],
    proofSelection: { mode: "basic", claims: [], revision: 0, profileId: profile.id }, proofToken: "t",
    cards: types.map((type) => ({ type, heading: type, deck: "", purpose: "", afterParagraphId: "p1", evidence: [], ...(type === "thumbnail" ? { art: { medium: "photograph", subject: "s", scene: "s", message: "m", avoid: [] } } : {}) })) };
const usage = (kind, model, reused = false) => ({ at: new Date().toISOString(), kind, stage: kind, model, reused, input: 9000, cacheRead: 0, cacheWrite: 0, output: 11000, thinking: 6000, imageOutput: 0, elapsedMs: 1000, estimatedUsd: reused ? 0 : model.startsWith("gpt") ? null : 0.128 });
const out = path.resolve("tmp/profile-design/browser/redesign"); fs.mkdirSync(out, { recursive: true });
let lastPage = null, counters = () => "";
(async () => {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        for (const width of [1440, 390]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 } });
            const state = { postId: "saved-post", stage: "done", aiUsage: [usage("manuscript", "claude-sonnet-5"), usage("cover-art", "gpt-image-2.5")], factChecks: [{ claim: "채무자회생법 제579조", status: "verified", checkedAt: "t", bodyHashAtCheck: "x" }], bodyVersions: [], coverBrief: brief, question: brief.question, thesis: brief.thesis };
            const writes = [], plans = [], generated = [], statePatches = [], edits = [], errors = []; let posts = 0, patches = 0;
            const savedPost = { id: "saved-post", profile_id: profile.id, title: "회생 절차의 자료 확인", body, field: "회생", topic: "회생 절차", card_images: types.map((t) => ({ type: t, url: `${base}/fixture-${t}.png` })) };
            await context.addInitScript(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async (items) => { window.__copied = await (await items[0].getType("text/html")).text(); } } }); });
            await context.route("**/*", async (route) => {
                const req = route.request(), url = new URL(req.url());
                if (url.origin !== new URL(base).origin) return route.abort();
                if (/^\/fixture-\w+\.png$/.test(url.pathname)) return route.fulfill({ contentType: "image/png", body: Buffer.from(png.split(",")[1], "base64") });
                if (!url.pathname.startsWith("/api/")) return route.continue();
                const b = req.postData() ? JSON.parse(req.postData()) : {};
                const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
                if (url.pathname === "/api/admin/auth") return reply({ authenticated: true });
                if (url.pathname.endsWith("/blog-settings")) return reply({ profiles: [profile] });
                if (url.pathname.endsWith("/blog-profiles")) return reply({ profiles: [profile], profile });
                if (url.pathname.endsWith("/blog-images/preflight")) return reply({ ok: true });
                if (url.pathname.endsWith("/blog-posts/state")) {
                    if (req.method() === "PATCH") { patches++; statePatches.push(b); if (b.stage) state.stage = b.stage; if (b.factChecks) state.factChecks = b.factChecks; if (b.pushBodyVersion) state.bodyVersions.push({ at: "t", ...b.pushBodyVersion }); if (b.popBodyVersion) state.bodyVersions.pop(); if (b.appendUsage) state.aiUsage.push(...b.appendUsage); if ("coverBrief" in b) state.coverBrief = b.coverBrief; }
                    return reply({ state });
                }
                if (url.pathname.endsWith("/blog-posts")) {
                    if (req.method() === "GET") return reply({ posts: url.searchParams.get("id") === "saved-post" || url.searchParams.get("profile_id") ? [savedPost] : [] });
                    if (req.method() === "POST") posts++; else patches++; return reply({ id: "new-post" });
                }
                if (url.pathname.endsWith("/claude-blog-write")) { writes.push(b); return reply({ title: "회생 신청, 소득이 없으면 못 하나요", body, usage: usage("manuscript", "claude-sonnet-5"), coverBrief: brief, question: brief.question, thesis: brief.thesis, factChecklist: ["채무자회생법 제579조", "변제기간 3년"], editorialWarnings: [], mode: b.source ? "rewrite" : "topic", bodyHash: "h" }); }
                if (url.pathname.endsWith("/claude-blog-edit")) { edits.push(b); return reply({ replacement: "새 도입 문단입니다. 소득이 있어야 개인회생을 신청할 수 있습니다.", label: "도입부", target: "도입 문단입니다. 개인회생은 소득이 있는 채무자가 신청합니다.", title: b.title, body: b.body.replace(/^[^\n]+/, "새 도입 문단입니다. 소득이 있어야 개인회생을 신청할 수 있습니다."), warnings: [], usage: usage("edit", "claude-sonnet-5") }); }
                if (url.pathname.endsWith("/blog-images/plan")) { plans.push(b); await new Promise((r) => setTimeout(r, 150)); return reply({ plan, usage: b.coverBrief ? [] : [usage("cover-plan", "claude-sonnet-5")] }); }
                if (url.pathname.endsWith("/blog-images/generate-design")) {
                    generated.push(b);
                    return reply({ card: { type: b.cardType, name: b.cardType, setFormat: format, publicationEdition: plan.publicationEdition, imageDataUrl: png, width: 2000, height: 2000, altText: "등록 자료", placement: "본문", warnings: [], designVersion: "editorial-v11", layoutChecks: { passed: true, issues: [], textBlocks: 1 }, releaseToken: "r", productionId: "prod-" + b.cardType, setId: "set-1", artSourceHash: b.cardType === "thumbnail" ? "test" : undefined,
                        ...(b.cardType === "info" ? { studioPhotos: [{ assetId: "approved-fixture", version: 1 }], photoChecks: { source: "studio", width: 1280, height: 1600, areaRatio: 0.8, upscale: 1.25 } } : {}),
                        ...(b.cardType === "contact" ? { contactActions: [{ label: "상담", display: "02-1234-5678", href: "tel:0212345678" }] } : {}) }, usage: [] });
                }
                if (url.pathname.endsWith("/blog-posts/images")) return reply({ images: types.map((t) => ({ type: t, url: `${base}/fixture-${t}.png` })) });
                if (url.pathname.endsWith("/blog-posts/topics")) return reply({ topics: [] });
                return route.fulfill({ status: 404, body: "unknown fixture API" });
            });
            const page = await context.newPage(); page.on("pageerror", (e) => errors.push(e.message));
            lastPage = page; counters = () => JSON.stringify({ writes: writes.length, plans: plans.length, generated: generated.length, posts, patches, statePatches: statePatches.length, errors });

            // ── 이어하기: ?post= 로 열면 원고·상태·저장 이미지가 복원되고, 유료 호출 없이 이미지 상세를 되살린다 ──
            await page.goto(base + "/admin/blog-publish?post=saved-post", { waitUntil: "networkidle" });
            await page.getByText("3 · 이미지 3/3장 저장 · 발행 대기", { exact: false }).waitFor();
            assert.equal(await page.getByRole("textbox", { name: "원고 제목" }).inputValue(), "회생 절차의 자료 확인");
            assert.equal(await page.getByText("개인회생은 누가 신청할 수 있나", { exact: true }).count(), 1, "question/thesis restored from state");
            assert.match(await page.locator("summary").first().textContent(), /AI 비용\(추정\) \$0\.13 \+ 이미지 모델 1회\(단가 미확인\) · 유료 2회/);
            assert.equal(await page.getByRole("combobox", { name: "사실 1 상태" }).inputValue(), "verified");
            await page.getByRole("button", { name: "이미지 상세 불러오기 (무료)", exact: true }).click();
            await page.getByRole("button", { name: "이미지 상세 불러오기 (무료)", exact: true }).waitFor({ state: "hidden" });
            await page.waitForFunction(() => !document.querySelector(".animate-spin"));
            await page.getByRole("button", { name: "카드 3장 완료", exact: true }).waitFor();
            assert.equal(plans.length, 1); assert.deepEqual(plans[0].coverBrief.kicker, "개인회생"); assert.equal(plans[0].postId, "saved-post");
            assert.equal(generated.length, 3); assert.ok(generated.every((g) => g.renderOnly === true && !g.attemptId), "Resume is render-only: no paid generation");
            assert.equal(posts, 0, "Resume never creates a new post");
            // 복사: 저장 이미지 3장 + 전화 링크
            await page.getByRole("button", { name: "네이버용 복사", exact: true }).click();
            await page.waitForFunction(() => !!window.__copied);
            const copied = await page.evaluate(() => window.__copied);
            assert.equal((copied.match(/<img /g) || []).length, 3); assert.ok(copied.includes('href="tel:0212345678"'));

            // ── 본문 수정 → 확정 해제, 확인한 사실은 재확인 필요, 내보내기 잠금 ──
            await page.getByRole("textbox", { name: "원고 본문" }).fill(body.replace("도입 문단입니다.", "도입 문단을 고쳤습니다."));
            await page.getByText("원고가 바뀌어 이미지가 현재 글과 맞지 않습니다", { exact: false }).first().waitFor();
            assert.equal(await page.getByRole("combobox", { name: "사실 1 상태" }).inputValue(), "stale");
            await page.evaluate(() => { window.__copied = ""; });
            await page.getByRole("button", { name: "네이버용 복사", exact: true }).click();
            await page.getByRole("alert").filter({ hasText: "원고가 바뀌어 이미지가 현재 글과 맞지 않습니다" }).waitFor();
            assert.equal(await page.evaluate(() => window.__copied), "", "Stale images are never exported");
            // 자동 저장(2.5초) 뒤 '자동 저장됨'
            await page.getByText("자동 저장됨", { exact: true }).waitFor({ timeout: 8000 });
            // 확정 → 갱신: 브리프로 무료 구성안, 표지는 렌더 전용 재사용 요청이 아니어도 유료 attempt 가 없다
            const before = generated.length;
            const refresh = page.getByRole("button", { name: "원고 확정 → 이미지 갱신", exact: true });
            await refresh.click(); await refresh.click({ force: true, timeout: 2000 }).catch(() => {}); // 중복 클릭(비활성 상태 강제 클릭)
            await page.getByRole("button", { name: "카드 3장 완료", exact: true }).waitFor();
            assert.equal(plans.length, 2, "Double click starts one planning request");
            assert.ok(plans[1].coverBrief && !plans[1].attemptId, "Refresh uses the free cover brief, not a paid attempt");
            assert.equal(generated.length, before + 3); assert.ok(generated.slice(-3).every((g) => !g.attemptId));

            // ── 부분 수정: 범위 지정 → 비교 → 적용 → 되돌리기 ──
            await page.getByRole("combobox", { name: "수정 범위" }).selectOption("intro:");
            await page.getByRole("textbox", { name: "수정 지시" }).fill("첫 문장을 독자의 상황으로 시작");
            await page.getByRole("button", { name: "수정안 받기 (유료 소액)", exact: true }).click();
            await page.getByText("도입부 — 수정 전 / 수정 후", { exact: true }).waitFor();
            assert.equal(edits.length, 1); assert.equal(edits[0].scope.kind, "intro"); assert.equal(edits[0].postId, "saved-post");
            await page.getByRole("button", { name: "적용", exact: true }).click();
            assert.match(await page.getByRole("textbox", { name: "원고 본문" }).inputValue(), /^새 도입 문단입니다/);
            await page.getByRole("button", { name: "되돌리기 (1)", exact: true }).waitFor();
            assert.ok(statePatches.some((p) => p.pushBodyVersion), "Edit history is stored");
            await page.getByRole("button", { name: "되돌리기 (1)", exact: true }).click();
            assert.match(await page.getByRole("textbox", { name: "원고 본문" }).inputValue(), /^도입 문단을 고쳤습니다/);
            assert.equal(await page.getByRole("button", { name: /되돌리기/ }).count(), 0);
            // 사실 확인 상태 변경이 저장된다
            await page.getByRole("combobox", { name: "사실 1 상태" }).selectOption("verified");
            await page.waitForTimeout(600);
            assert.ok(statePatches.some((p) => p.factChecks?.[0]?.status === "verified"));
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal overflow at " + width);
            await page.screenshot({ path: path.join(out, `resume-${width}.png`), fullPage: width === 390 });

            // ── 재창작 모드: 200자 이상 붙여넣기 → source 로 전송, 원고 뒤 이미지 자동 시작 없음 ──
            await page.getByRole("button", { name: "다른 주제로 새 원고", exact: true }).click();
            const long = "개인회생 제도는 채무자가 일정한 소득이 있을 때 이용할 수 있는 절차입니다. ".repeat(6);
            await page.locator("#publish-topic").fill(long);
            await page.getByText(/재창작 모드 · /).waitFor();
            page.once("dialog", (d) => d.accept());
            await page.getByRole("button", { name: "이 글로 원고 재창작", exact: true }).click();
            await page.getByRole("button", { name: "원고 확정 → 이미지 3장 만들기 (유료)", exact: true }).waitFor();
            const last = writes[writes.length - 1];
            assert.equal(last.source, long.trim()); assert.equal(last.topic, long.trim().split("\n")[0].slice(0, 80)); assert.equal(last.content, "");
            assert.equal(posts, 1, "New manuscript is saved once"); assert.equal(plans.length, 2, "No image planning until the manuscript is confirmed");
            assert.ok(page.url().includes("post=new-post"), "URL carries the new post id");
            assert.deepEqual(errors, []);
            await context.close();
        }
        console.log("PASS: resume via ?post= (state, cost, saved images, render-only recovery), stale lock + autosave, double-click safe refresh with free brief, partial edit apply/undo, fact status persistence, rewrite mode payload at 1440/390px; no external model requests.");
    } finally { await browser.close(); }
})().catch(async (e) => {
    console.error(e);
    try { if (lastPage) { console.error("COUNTERS", counters()); console.error("PAGE TEXT >>>\n" + (await lastPage.locator("body").innerText()).slice(0, 3000)); await lastPage.screenshot({ path: path.join(out, "failure.png"), fullPage: true }); } } catch { /* debug only */ }
    process.exitCode = 1;
});
