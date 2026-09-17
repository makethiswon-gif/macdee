// UI fixtures stay on localhost and never call production or a model provider.
const { chromium } = require("playwright-core"), sharp = require("sharp"), fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const base = process.env.STUDIO_TEST_URL || "http://127.0.0.1:3117";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const out = path.resolve("tmp/lawyer-studio-tests"); fs.mkdirSync(out, { recursive: true });
const filters = { exposure: -0.4, contrast: 1.2, saturation: 0, grain: 12, softness: 0.3, highlights: 0.2, vignette: 0.08, longEdge: 1600, jpegQuality: 88 };
const owner = "mqaaoypk621p6", model = "gpt-image-2.5-sunburst-2026-09-08";
(async () => {
    const fixture = path.resolve("tmp/profile-design/kim-editorial/review-v2/01-window.png");
    const photo = fs.existsSync(fixture) ? await sharp(fixture).resize(800).grayscale().jpeg().toBuffer() : await sharp({ create: { width: 800, height: 1000, channels: 3, background: "#929e96" } }).jpeg().toBuffer();
    const dataUrl = "data:image/jpeg;base64," + photo.toString("base64");
    const stylePhotos = ["b01a4f847fa6ce1731ae51527ff502ed.jpg", "e21c98ccd4649d340dbc813360122c7f.jpg"].map(file => fs.readFileSync(path.join("lib/lawyer-studio/style-references", file)));
    const faceFile = path.join(out, "isolated/mqaaoypk621p6-1-0.png");
    const face = fs.existsSync(faceFile) ? await sharp(faceFile).resize(250).jpeg().toBuffer() : photo;
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    try {
        for (const width of [1440, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 } });
            let library = { profileId: owner, revision: 1, updatedAt: "", blogEnabled: false, references: [], assets: [] }, jobs = [], prepares = 0, generates = 0, renders = 0, approvals = 0, analyses = 0, lastJob, lastProportions, lastOptions;
            let batches = [], batchPrepares = 0, batchGenerates = [], batchOptions;
            const createAsset = (id) => ({ id, version: 1, createdAt: "2026-09-11T10:00:00Z", model, quality: "xhigh", scene: "window", filters, originalPath: "private", renderedPath: "private", status: "draft", aiGenerated: true, width: 1536, height: 1920 });
            library.assets.push(createAsset("b".repeat(64)));
            await context.route("**/*", async (route) => {
                const req = route.request(), url = new URL(req.url());
                if (url.origin !== new URL(base).origin) return route.abort();
                if (!url.pathname.startsWith("/api/")) return route.continue();
                const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
                if (url.pathname === "/api/admin/auth") return reply({ authenticated: true });
                if (url.pathname === "/api/admin/blog-profiles") return reply({ profiles: [{ id: owner, lawyerName: "김정웅", officeName: "법무법인 양영&정훈", profileImages: [dataUrl] }] });
                if (url.pathname === "/api/admin/lawyer-studio/asset") return route.fulfill({ contentType: "image/jpeg", body: url.searchParams.has("style") ? stylePhotos[Number(url.searchParams.get("style"))] : url.searchParams.has("inputId") ? face : photo });
                const body = req.postData() ? JSON.parse(req.postData()) : {};
                if (url.pathname === "/api/admin/lawyer-studio/reference-preview") {
                    analyses++;
                    if (analyses === 1) return reply({ error: "얼굴 검출 실패 · 원본을 확인해주세요." }, 422);
                    return reply({ faces: Array.from({ length: body.subjectCount }, (_, i) => `/api/admin/lawyer-studio/asset?profileId=${owner}&inputId=${String(i).repeat(64)}`), bodies: [dataUrl], styles: [0, 1].map(i => `/api/admin/lawyer-studio/asset?style=${i}`), styleCount: 2, policy: "body-first-references-v3" });
                }
                if (url.pathname === "/api/admin/lawyer-studio/render") { renders++; lastProportions = body.proportions; return route.fulfill({ contentType: "image/jpeg", body: photo }); }
                if (url.pathname === "/api/admin/lawyer-studio/batch") {
                    if (req.method() === "GET") return reply({ batches });
                    batchPrepares++;
                    if (!batches.length) {
                        assert.equal(body.count, 5); assert.equal(body.paidConfirmed, true); batchOptions = body.options;
                        batches.push({ id: "f".repeat(64), profileId: owner, options: batchOptions, profileImageIndices: body.profileImageIndices, referenceIds: [],
                            shots: ["forbes", "studio", "window", "desk", "stairs"].map((scene, i) => ({ jobId: String(i + 3).repeat(64), scene, pose: { label: `다른 구도 ${i + 1}` } })) });
                    } else assert.equal(body.batchId, batches[0].id);
                    return reply({ batch: batches[0] });
                }
                if (url.pathname === "/api/admin/lawyer-studio/generate") {
                    const shotIndex = batches[0]?.shots.findIndex(s => s.jobId === body.jobId) ?? -1;
                    if (shotIndex >= 0) {
                        batchGenerates.push(body.jobId);
                        if (shotIndex === 3) await new Promise(resolve => setTimeout(resolve, 1200));
                        const asset = { ...createAsset(body.jobId), scene: batches[0].shots[shotIndex].scene };
                        if (!library.assets.some(a => a.id === asset.id)) { library.assets.unshift(asset); library.revision++; }
                        if (shotIndex === 2) return reply({ error: "사진 저장 후 응답 지연" }, 503);
                        return reply({ asset });
                    }
                    generates++; assert.equal(body.jobId, lastJob, "Recovery uses the original job ID");
                    if (generates === 1) return reply({ error: "생성 결과 저장이 지연됐습니다. 같은 작업을 복구해주세요." }, 503);
                    const asset = { ...createAsset(lastJob), scene: lastOptions.scene, anatomyPolicy: "natural-scale-v3", framingReview: { policy: "natural-scale-v3", state: "review", faceHeightRatios: [0.14], issues: ["얼굴이 촬영 비율 기준보다 크게 검출됐습니다. 머리·어깨·몸통 비율을 확인한 뒤 승인해주세요."] }, background: { version: "fresh-background-v1", scene: lastOptions.scene, settingId: "stone", label: "석재 로비 · 수직선", seed: "fixture", direction: "Fixture cover background" } }; library.assets.unshift(asset); library.revision++; return reply({ asset, reused: true });
                }
                if (url.pathname === "/api/admin/lawyer-studio") {
                    if (req.method() === "GET") return reply({ library, jobs, configured: true, model });
                    if (body.action === "prepare") { prepares++; lastOptions = body.options; assert.equal(lastOptions.scene, "forbes"); lastJob = "a".repeat(64); jobs = [{ id: lastJob, createdAt: "2026-09-11T10:00:00Z" }]; return reply({ job: { id: lastJob } }); }
                    assert.equal(body.revision, library.revision);
                    const asset = library.assets.find((a) => a.id === body.assetId);
                    if (body.action === "save") { asset.filters = body.filters; asset.proportions = body.proportions; asset.version++; asset.status = "draft"; }
                    if (body.action === "status") { assert.equal(body.approvalConfirmed, true); approvals++; asset.status = body.status; }
                    if (body.action === "blog") library.blogEnabled = body.enabled;
                    library.revision++; return reply({ library });
                }
                return reply({ error: "Unmocked API" }, 404);
            });
            const page = await context.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message));
            await page.goto(`${base}/admin/lawyer-studio`, { waitUntil: "networkidle" });
            await page.getByText("매 촬영 새롭게", { exact: true }).waitFor();
            assert.equal(await page.getByRole("combobox", { name: "무드", exact: true }).inputValue(), "documentary");
            await page.getByText("인물 약 20% · 배경 약 80%", { exact: true }).waitFor();
            const generateButton = page.getByRole("button", { name: "1장 생성", exact: true });
            assert.equal(await generateButton.isDisabled(), true);
            await page.getByText("얼굴 원본 사진을 1장 이상 선택해주세요.", { exact: true }).waitFor();
            assert.equal(prepares, 0); assert.equal(generates, 0);
            await page.screenshot({ path: path.join(out, `requirements-${width}.png`), fullPage: true });
            await page.getByRole("button", { name: "등록 얼굴 원본 1", exact: true }).click();
            await page.getByRole("alert").filter({ hasText: "얼굴 검출 실패" }).waitFor();
            assert.equal(await generateButton.isDisabled(), true); assert.equal(generates, 0); assert.equal(prepares, 0);
            await page.getByRole("button", { name: "얼굴 분리 다시 시도" }).click();
            await page.getByRole("img", { name: "분리된 얼굴 1", exact: true }).waitFor();
            await page.getByRole("img", { name: "체형 원본 1", exact: true }).waitFor();
            await page.getByRole("img", { name: "화보 레퍼런스 2", exact: true }).waitFor();
            assert.equal(await page.getByText("얼굴 원본 사진을 1장 이상 선택해주세요.", { exact: true }).count(), 0);
            await page.getByRole("combobox", { name: "장면", exact: true }).selectOption("studio");
            await page.getByText("인물 약 20% · 배경 약 80%", { exact: true }).waitFor();
            await page.getByRole("combobox", { name: "장면", exact: true }).selectOption({ label: "포브스 · 잡지 메인" });
            await page.getByText("인물 중심 · 표지 구도", { exact: true }).waitFor();
            assert.equal(await page.getByText("인물 약 20% · 배경 약 80%", { exact: true }).count(), 0);
            await page.getByRole("combobox", { name: "촬영 스타일", exact: true }).selectOption("gq");
            await page.getByRole("combobox", { name: "촬영 인원", exact: true }).selectOption("2");
            await page.getByRole("img", { name: "분리된 얼굴 2", exact: true }).waitFor();
            await page.getByRole("checkbox", { name: /AI 초상 제작 동의/ }).check();
            assert.equal(await generateButton.isDisabled(), true);
            await page.getByRole("checkbox", { name: /1장 유료 생성/ }).check();
            await page.getByText("생성 준비 완료", { exact: true }).waitFor(); assert.equal(await generateButton.isEnabled(), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(out, `shoot-${width}.png`), fullPage: true });
            await page.getByRole("button", { name: "1장 생성", exact: true }).click();
            await page.getByRole("alert").filter({ hasText: "저장이 지연" }).waitFor();
            await page.reload({ waitUntil: "networkidle" });
            await page.getByText("미완료 촬영 요청이 있습니다. 같은 작업을 계속하거나 요청을 해제해주세요.", { exact: true }).waitFor();
            await page.getByRole("button", { name: "같은 작업 계속", exact: true }).click();
            await page.getByRole("heading", { name: "사진 보정", exact: true }).waitFor();
            await page.getByText("촬영 배경 · 석재 로비 · 수직선", { exact: true }).waitFor();
            await page.getByText("촬영 기준 · 자연 비율 v3", { exact: true }).waitFor();
            await page.getByText("생성 원본 · 비율 검토", { exact: true }).waitFor();
            await page.getByRole("status").filter({ hasText: "머리·어깨·몸통 비율" }).waitFor();
            assert.equal(prepares, 1); assert.equal(generates, 2);
            const approveButton = page.getByRole("button", { name: "승인", exact: true });
            assert.equal(await approveButton.isEnabled(), true, "Saved photos can open approval directly");
            await page.getByText("저장된 보정본 · 승인 가능", { exact: true }).waitFor();
            page.once("dialog", async (dialog) => { assert.match(dialog.message(), /얼굴 일치·손·공간 표현과 게시 권한/); assert.match(dialog.message(), /저장된 보정본 v1/); await dialog.dismiss(); });
            await approveButton.click();
            assert.equal(approvals, 0, "Cancelling review does not approve a photo");
            const photoCanvas = page.getByRole("group", { name: "비율 보정 사진", exact: true });
            await page.getByRole("button", { name: "머리 영역", exact: true }).click();
            const photoBounds = await photoCanvas.boundingBox();
            await photoCanvas.click({ position: { x: photoBounds.width * 0.5, y: photoBounds.height * 0.25 } });
            const headSlider = page.getByRole("slider", { name: "머리 크기", exact: true }); await headSlider.focus(); await headSlider.press("Home");
            await page.getByText("보정 변경사항을 먼저 저장해주세요.", { exact: true }).waitFor();
            assert.equal(await approveButton.isDisabled(), true, "Unsaved geometry cannot approve older pixels");
            await page.getByRole("button", { name: "신체 영역", exact: true }).click();
            await photoCanvas.click({ position: { x: photoBounds.width * 0.5, y: photoBounds.height * 0.7 } });
            const bodySlider = page.getByRole("slider", { name: "신체 폭", exact: true }); await bodySlider.focus(); await bodySlider.press("Home");
            const heightSlider = page.getByRole("slider", { name: "신체 길이", exact: true }); await heightSlider.focus(); await heightSlider.press("End");
            await page.getByRole("button", { name: "저채도 필름", exact: true }).click();
            await page.waitForFunction(() => !!document.querySelector('img[src^="blob:"]'));
            assert.equal(lastProportions.length, 2); assert.equal(lastProportions[0].scaleX, 85); assert.equal(lastProportions[0].scaleY, 85); assert.equal(lastProportions[1].scaleX, 90); assert.equal(lastProportions[1].scaleY, 108);
            assert.equal(generates, 2);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(out, `proportions-${width}.png`), fullPage: true });
            const slider = page.getByRole("slider", { name: "필름 그레인", exact: true });
            await slider.focus(); await slider.press("ArrowRight");
            await page.getByRole("button", { name: "보정본 저장", exact: true }).waitFor();
            await page.waitForFunction(() => !!document.querySelector('img[src^="blob:"]'));
            assert.ok(renders > 0); assert.equal(generates, 2);
            await page.getByRole("button", { name: "보정본 저장", exact: true }).click();
            assert.equal(library.assets[0].proportions.length, 2);
            await page.getByText("저장된 보정본 · 승인 가능", { exact: true }).waitFor();
            assert.equal(await approveButton.isEnabled(), true);
            page.once("dialog", async (dialog) => { assert.match(dialog.message(), /저장된 보정본 v2/); await dialog.accept(); });
            await approveButton.click();
            await page.getByRole("button", { name: "승인됨", exact: true }).waitFor();
            assert.equal(approvals, 1); assert.equal(library.blogEnabled, false);
            await page.getByText("승인 사진 1장 · 블로그 연결 꺼짐", { exact: true }).waitFor();
            assert.equal(await page.getByRole("button", { name: "블로그 연결 설정", exact: true }).isEnabled(), true);
            await page.getByRole("button", { name: /사진함 2/ }).click();
            assert.equal(await page.getByRole("switch", { name: "블로그 발행에 승인 사진 사용" }).isEnabled(), true, "A single approved photo can be connected");
            await page.getByTitle("사진 보정 열기").nth(1).click();
            await page.getByRole("button", { name: "보정본", exact: true }).click();
            await page.getByRole("button", { name: "생성 원본", exact: true }).waitFor();
            await approveButton.click();
            await page.getByRole("button", { name: "보정본", exact: true }).waitFor();
            assert.equal(approvals, 1, "Original comparison must switch back to saved pixels before review");
            page.once("dialog", async (dialog) => { await dialog.accept(); });
            await approveButton.click();
            await page.getByRole("button", { name: "승인됨", exact: true }).waitFor();
            assert.equal(approvals, 2);
            await page.getByRole("button", { name: /사진함 2/ }).click();
            await page.getByRole("switch", { name: "블로그 발행에 승인 사진 사용" }).click();
            await page.waitForFunction(() => document.querySelector('input[role="switch"]')?.checked);
            assert.equal(library.blogEnabled, true); assert.equal(generates, 2);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            assert.equal(await page.locator("article img").evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 10)), true);
            await page.screenshot({ path: path.join(out, `library-${width}.png`), fullPage: true });
            await page.getByTitle("사진 보정 열기").first().click();
            await page.getByRole("button", { name: "보정본", exact: true }).click();
            await page.getByRole("button", { name: "생성 원본", exact: true }).waitFor();
            await page.screenshot({ path: path.join(out, `editor-${width}.png`), fullPage: true });
            const pixels = await sharp(path.join(out, `editor-${width}.png`)).stats(); assert.ok(pixels.channels[0].stdev > 20, "Editor screenshot is not blank");
            await page.getByRole("button", { name: "촬영", exact: true }).click();
            await page.getByRole("combobox", { name: "장면", exact: true }).selectOption("forbes");
            await page.getByRole("combobox", { name: "촬영 인원", exact: true }).selectOption("2");
            await page.getByRole("button", { name: "등록 얼굴 원본 1", exact: true }).click();
            await page.getByRole("img", { name: "분리된 얼굴 2", exact: true }).waitFor();
            await page.getByRole("checkbox", { name: /AI 초상 제작 동의/ }).check();
            await page.getByRole("checkbox", { name: /1장 유료 생성/ }).check();
            await page.getByRole("button", { name: "5장 세트", exact: true }).click();
            const batchButton = page.getByRole("button", { name: "5장 세트 생성", exact: true });
            assert.equal(await batchButton.isDisabled(), true, "One-shot consent does not authorize five photos");
            await page.getByRole("checkbox", { name: /5장 유료 생성/ }).check();
            await page.screenshot({ path: path.join(out, `five-shot-settings-${width}.png`), fullPage: true });
            await batchButton.click();
            await page.getByRole("alert").filter({ hasText: "3번째 촬영 단계" }).waitFor();
            assert.equal(batchGenerates.length, 3, "A failed response stops the remaining paid queue");
            await page.reload({ waitUntil: "networkidle" });
            await page.getByText("3 / 5 완료", { exact: true }).waitFor();
            assert.equal(await page.getByRole("combobox", { name: "장면", exact: true }).inputValue(), "forbes", "Frozen batch settings remain visible after reload");
            await page.screenshot({ path: path.join(out, `five-shot-recovery-${width}.png`), fullPage: true });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.getByRole("button", { name: "세트 이어서 생성", exact: true }).click();
            await page.getByRole("button", { name: "일시 정지", exact: true }).click();
            await page.getByText("세트 촬영을 일시 정지했습니다. 완료된 사진은 보존됩니다.", { exact: true }).waitFor();
            assert.equal(batchGenerates.length, 4, "Pause lets only the current photograph finish");
            await page.getByRole("button", { name: "세트 이어서 생성", exact: true }).click();
            await page.getByText("서로 다른 배경·구도의 사진 5장을 저장했습니다. 각 사진은 검토 대기 상태입니다.", { exact: true }).waitFor();
            assert.equal(batchPrepares, 3); assert.equal(batchGenerates.length, 5);
            assert.equal(new Set(batchGenerates).size, 5, "Reload/resume skips already saved photographs, including lost responses");
            assert.equal(library.assets.filter(a => a.status === "approved").length, 2, "Batch shots are never auto-approved");
            assert.equal(approvals, 2); assert.equal(generates, 2, "Single-image workflow is preserved");
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(out, `five-shot-complete-${width}.png`), fullPage: true });
            const beforeLink = JSON.stringify(library), callsBeforeLink = batchGenerates.length;
            await page.goto(`${base}/admin/lawyer-studio?profileId=${owner}&view=library`, { waitUntil: "networkidle" });
            assert.equal(await page.getByRole("combobox", { name: "변호사", exact: true }).inputValue(), owner);
            assert.equal(await page.getByRole("switch", { name: "블로그 발행에 승인 사진 사용" }).isChecked(), true);
            assert.equal(JSON.stringify(library), beforeLink, "Opening a profile-bound settings link changes no approval or blog setting");
            assert.equal(batchGenerates.length, callsBeforeLink);
            assert.deepEqual(errors, []);
            await context.close();
        }
        console.log("PASS studio UI at 1440/390/320px: five-shot consent, progress, lost-response recovery, pause/resume, draft-only results; single-image recovery, free retouching, approval and no overflow.");
    } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
