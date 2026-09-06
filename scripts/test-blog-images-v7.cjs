const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict"), crypto = require("node:crypto"), Module = require("node:module");
const ts = require("typescript"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const live = process.argv.includes("--live"), liveArt = process.argv.includes("--live-art"), recompose = process.argv.includes("--recompose");
const liveRest = process.argv.includes("--live-rest");
const refreshFinal = process.argv.includes("--refresh-final");
const profileIdx = process.argv.indexOf("--profile-id"), registeredId = profileIdx >= 0 ? process.argv[profileIdx + 1] : "";
if (live || liveArt || liveRest || refreshFinal || registeredId) require("@next/env").loadEnvConfig(root, false, { info() {}, error() {} });
process.env.ADMIN_ID = "v7-fixture"; process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { title, article, profile, art, variants, rawPlan, liveArticles } = require("./blog-images-v7-fixtures.cjs");
const { validateVisualPlan, sourceHash, planArticle } = require("../lib/blog-images/visual-planner.ts");
const { articleParagraphs } = require("../lib/blog-images/visual-plan-types.ts");
const { contactActions } = require("../lib/blog-images/contact-details.ts");
const { renderBriefCard, balanceHeadline } = require("../lib/blog-images/brief-renderer.ts");
const { editorialPhotoPrompt, generateEditorialPhoto, normalizeEditorialArt } = require("../lib/blog-images/photo-generator.ts");
const { reviewMagazineCard, DESIGN_REVIEW_MODEL } = require("../lib/blog-images/design-review.ts");
const { DEFAULT_DIRECTION, MAGAZINE_PALETTES } = require("../lib/blog-images/magazine-design.ts");
const { POST } = require("../app/api/admin/blog-images/generate-design/route.ts");
const { POST: PLAN } = require("../app/api/admin/blog-images/plan/route.ts");
const idx = process.argv.indexOf("--out"), out = idx >= 0 ? path.resolve(process.argv[idx + 1]) : path.join(root, "tmp", "blog-images-v7");
fs.mkdirSync(out, { recursive: true });
const payload = "v7-fixture:local-test", cookie = Buffer.from(payload + ":" + crypto.createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(payload).digest("hex")).toString("base64url");
function req(body, auth = true) { return new Request("http://localhost/api/admin/blog-images/generate-design", { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { cookie: "admin_token=" + cookie } : {}) }, body: JSON.stringify(body) }); }
async function save(card, name) {
    const bytes = Buffer.from(card.imageDataUrl.split(",")[1], "base64"), meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1024); assert.equal(meta.height, card.height); assert.equal(meta.hasAlpha, false); assert.ok(bytes.length <= 2_000_000);
    assert.ok(Buffer.byteLength(JSON.stringify({ card })) < 4_400_000, "Complete response fits Vercel payload limit");
    fs.writeFileSync(path.join(out, name + ".png"), bytes); fs.writeFileSync(path.join(out, name + ".json"), JSON.stringify({ card }));
    console.log(name + ": " + meta.width + "x" + meta.height + ", " + Math.round(bytes.length / 1024) + " KB");
}
async function main() {
    let liveProfile = profile;
    const plan = validateVisualPlan(rawPlan(), title, article, false);
    fs.writeFileSync(path.join(out, "plan.json"), JSON.stringify(plan, null, 2));
    assert.equal(plan.cards[3].deck, ""); assert.deepEqual(plan.cards[3].points, []);
    assert.equal(plan.cards[3].heading, "상담 안내"); assert.deepEqual(plan.cards[3].evidence, []);
    const profileOnly = rawPlan(); profileOnly.cards[3].points = []; profileOnly.cards[3].evidence = [];
    assert.equal(validateVisualPlan(profileOnly, title, article, false).cards[3].heading, "상담 안내");
    assert.equal(articleParagraphs("<p>첫 문단</p><p>둘째 <strong>문단</strong></p>").length, 2);
    assert.equal(articleParagraphs("<임대인>과 <임차인>의 자료")[0].text, "<임대인>과 <임차인>의 자료");
    assert.throws(() => validateVisualPlan(plan, title, article + " 원고 변경"), /원고가 바뀌었습니다/);
    const bad = rawPlan(); bad.cards[0].evidence = [{ paragraphId: "p1", quote: "원문에 없는 내용을 임의로 작성했습니다." }];
    assert.throws(() => validateVisualPlan(bad, title, article, false), /원문과 일치/);
    const duplicate = rawPlan(); duplicate.cards[3].type = "thumbnail";
    assert.throws(() => validateVisualPlan(duplicate, title, article, false));
    assert.notEqual(editorialPhotoPrompt(art), editorialPhotoPrompt({ ...art, subject: "진료 기록과 보험사 안내문", message: "두 문서가 담고 있는 정보의 차이" }));
    assert.ok(editorialPhotoPrompt(art).includes(art.scene));
    assert.equal((await POST(req({}, false))).status, 401); assert.equal((await PLAN(req({}, false))).status, 401);
    assert.equal((await POST(req({ profile, content: article, cardType: "bad" }))).status, 400);
    assert.equal((await PLAN(req({ content: "x".repeat(40001) }))).status, 400);
    assert.equal((await POST(req({ profile, title, content: article + "x", cardType: "info", plan }))).status, 400);
    assert.equal((await POST(req({ profile: { ...profile, profileImages: [] }, title, content: article, cardType: "contact", plan }))).status, 400);
    assert.equal((await POST(req({ profile: { ...profile, phone: "", website: "javascript:alert(1)" }, title, content: article, cardType: "contact", plan }))).status, 400);
    assert.equal(contactActions({ phone: "02-1234-5678", website: "https://example.com/contact" })[0].href, "tel:0212345678");
    assert.equal(contactActions({ phone: "bad", website: "https://trusted.example@evil.example" }).length, 0);
    // Measure every drawn text line, not only PNG dimensions.
    const { createCanvas } = require("@napi-rs/canvas");
    const drawingPrototype = Object.getPrototypeOf(createCanvas(1, 1).getContext("2d"));
    const fillText = drawingPrototype.fillText;
    const boxes = [];
    drawingPrototype.fillText = function (text, x, y, ...args) {
        const width = this.measureText(text).width, fontSize = parseFloat(this.font);
        assert.ok(x >= -1 && y >= -1 && x + width <= this.canvas.width + 2 && y + fontSize <= this.canvas.height + 2, "Text inside canvas: " + text);
        boxes.push({ context: this, text, x, y, width, height: fontSize });
        return fillText.call(this, text, x, y, ...args);
    };
    for (const variant of variants) for (const style of ["paper", "contrast"]) {
        const p = validateVisualPlan(rawPlan(variant), title, article, false);
        await save(await renderBriefCard({ plan: p, card: p.cards[2], profile, style }), variant.kind + "-" + style);
    }
    // Mechanical fixture only. Real semantic image evaluation uses --live-art below.
    const photo = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#cdd7ce" } }).png().toBuffer();
    const normalArt = await normalizeEditorialArt(photo);
    for (const palette of Object.keys(MAGAZINE_PALETTES)) for (const typography of ["serif", "sans"]) {
        const directed = { ...rawPlan(), direction: { ...DEFAULT_DIRECTION, palette, typography, composition: palette === "vermilion" ? "split" : "immersive", alternatives: [
            { concept: "원본의 층위를 보여주는 빛", reasonNotChosen: "정리본과의 분리 관계를 직접 보여주는 선택안이 이 원고에 더 명료하다." },
            { concept: "전체 문맥의 연속성", reasonNotChosen: "대화 기록에 초점을 맞춘 보조 장면에 더 적합하다." }] } };
        const p = validateVisualPlan(directed, title, article, false);
        assert.equal(p.cards[1].art.direction.composition, "split", "Body artwork is landscape, not cropped portrait cover art");
        assert.throws(() => validateVisualPlan({ ...directed, direction: { ...directed.direction, palette: "made-up" } }, title, article, false), /아트디렉션/);
        const badLines = JSON.parse(JSON.stringify(directed)); badLines.cards[0].headlineLines = ["원문과 다른 카피"];
        assert.throws(() => validateVisualPlan(badLines, title, article, false), /행갈이 제목/);
        await save(await renderBriefCard({ plan: p, card: p.cards[0], profile, style: "contrast", art: normalArt }), "direction-" + palette + "-" + typography);
    }
    for (const style of ["paper", "contrast"]) {
        await save(await renderBriefCard({ plan, card: plan.cards[0], profile, style, art: normalArt }), "cover-" + style);
        await save(await renderBriefCard({ plan, card: plan.cards[1], profile, style, art: normalArt }), "illustration-" + style);
        await save(await renderBriefCard({ plan, card: plan.cards[3], profile, style }), "contact-" + style);
    }
    const longPlan = JSON.parse(JSON.stringify(plan));
    longPlan.cards[0].heading = "상담 전에 전체 자료와 확인할 내용을 나누어 정리할 때 놓치지 않아야 하는 부분";
    longPlan.cards[0].deck = "원본의 전체 내용과 날짜를 함께 보관합니다. 구체적인 준비 자료와 판단은 개별 사안과 확인된 사실관계에 따라 달라질 수 있습니다.";
    await save(await renderBriefCard({ plan: longPlan, card: longPlan.cards[0], profile, art: normalArt, style: "contrast" }), "cover-long");
    const logoCanvas = createCanvas(320, 90), lc = logoCanvas.getContext("2d");
    lc.fillStyle = "#FFFFFF"; lc.fillRect(0, 0, 320, 90); lc.fillStyle = "#146C64"; lc.fillRect(12, 14, 48, 48);
    const { prepareMagazineLogo } = require("../lib/blog-images/logo-compositor.ts");
    // White matte surrounds a black mark with an enclosed white letterform.
    const mark = createCanvas(100, 70), mc = mark.getContext("2d");
    mc.fillStyle = "#FFFFFF"; mc.fillRect(0, 0, 100, 70);
    mc.fillStyle = "#000000"; mc.fillRect(20, 15, 60, 40);
    mc.fillStyle = "#FFFFFF"; mc.fillRect(40, 25, 20, 20);
    const cleaned = await prepareMagazineLogo(mark.toBuffer("image/png"));
    const cleanedPixels = await sharp(cleaned.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(cleanedPixels.info.width, 60); assert.equal(cleanedPixels.info.height, 40);
    const centre = (20 * 60 + 30) * 4;
    assert.equal(cleanedPixels.data[centre], 255); assert.equal(cleanedPixels.data[centre + 3], 255, "Internal white logo shape preserved");
    assert.equal(cleaned.lightInk, false);
    const reversed = createCanvas(100, 70), rc = reversed.getContext("2d");
    rc.fillStyle = "#FFFFFF"; rc.fillRect(20, 15, 60, 40);
    const reverseLogo = await prepareMagazineLogo(reversed.toBuffer("image/png"));
    assert.equal(reverseLogo.lightInk, true, "Existing reverse-white logo uses dark brand rail");
    const coloured = await prepareMagazineLogo(logoCanvas.toBuffer("image/png"));
    const colourPixel = await sharp(coloured.bytes).raw().toBuffer();
    assert.equal(colourPixel[0], 0x14); assert.equal(colourPixel[1], 0x6c); assert.equal(colourPixel[2], 0x64, "Brand colour unchanged");
    const onlyProfile = await renderBriefCard({ plan, card: plan.cards[3], profile, style: "contrast" });
    const changedCopy = await renderBriefCard({ plan, card: { ...plan.cards[3], heading: "원고와 관련된 질문", headlineLines: ["다른 질문"], kicker: "요약", deck: "이 문장은 절대로 인쇄하지 않습니다.", points: ["요약 확인 항목"] }, headingOverride: "별도 상담 질문", profile, style: "contrast" });
    assert.equal(onlyProfile.imageDataUrl, changedCopy.imageDataUrl, "Article copy and overrides cannot alter closing card pixels");
    assert.doesNotMatch(changedCopy.altText, /원고와 관련|절대로|요약/);
    const brandProfile = { ...profile, lawyerName: "프로필 검수", officeName: "긴 사무소명과 연락처가 있는 편집 검수용 프로필", jobTitle: "", website: "https://example.com/long-profile-path", logoImage: logoCanvas.toDataURL("image/png"), profileImages: ["data:image/png;base64," + photo.toString("base64")] };
    await save(await renderBriefCard({ plan, card: plan.cards[3], profile: brandProfile, style: "contrast" }), "contact-brand");
    if (registeredId) {
        // Explicit read-only opt-in: one registered marketing profile; never customer case records.
        const { createClient } = require("@supabase/supabase-js");
        const { data: row, error } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY).from("blog_profiles")
            .select("id,lawyer_name,office_name,phone,website,brand_color,profile_images,logo_image").eq("id", registeredId).single();
        if (error || !row) throw new Error("Registered profile lookup failed");
        const names = row.lawyer_name.split("||");
        const registered = { id: row.id, lawyerName: names[0].trim(), jobTitle: names[1] || "", officeName: row.office_name || "", phone: row.phone || "", website: row.website || "", brandColor: row.brand_color || "", profileImages: row.profile_images || [], officeImages: [], logoImage: row.logo_image || "" };
        liveProfile = registered;
        const draft = { ...plan.cards[3], heading: "어떤 자료부터\n준비하면 될까요?", deck: "원본과 정리본을 어떻게 나눌지, 상담에서 확인해 보세요.", points: ["원본의 전체 내용이 남아 있나요?", "확인할 내용과 날짜를 정리했나요?"] };
        for (const style of ["contrast", "paper"]) await save(await renderBriefCard({ plan, card: draft, profile: registered, style }), "contact-registered-" + style);
        await save(await renderBriefCard({ plan, card: plan.cards[2], profile: registered, style: "paper" }), "info-registered-logo");
        await save(await renderBriefCard({ plan, card: plan.cards[0], profile: registered, style: "contrast", art: normalArt }), "cover-registered-logo");
        console.log("Registered portrait and contact: read-only draft rendered; no AI identity generation or publishing.");
    }
    const bc = createCanvas(1024, 1).getContext("2d");
    const headline = "유출 문자, 지금 뭘 남겨둬야 할까";
    const balanced = balanceHeadline(bc, headline, 896, 76);
    assert.equal(balanced.replace(/\s/g, ""), headline.replace(/\s/g, ""));
    assert.ok(balanced.split("\n").every((s) => s.trim().length > 3), "No one-word orphan in the test headline");
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]; if (a.context !== b.context) continue;
        const overlapW = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapH = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapW <= 1 || overlapH <= 1, "Text overlap: " + a.text + " / " + b.text);
    }
    assert.ok(boxes.every((b) => !/AI 설명용 시각물|실제 사건 자료 아님|등록된 사무실 사진/.test(b.text)), "Production captions are never printed into exported pixels");
    drawingPrototype.fillText = fillText;
    const oldFetch = global.fetch;
    let calls = 0;
    process.env.OPENAI_API_KEY ||= "fixture-key"; process.env.ANTHROPIC_API_KEY ||= "fixture-key";
    try {
        global.fetch = async () => { calls++; throw new Error("Render-only must not call an AI"); };
        let r = await POST(req({ profile, title, content: article, cardType: "info", plan, renderOnly: true, style: "contrast" }));
        assert.equal(r.status, 200, JSON.stringify(await r.clone().json())); assert.equal(calls, 0);
        r = await POST(req({ profile, title, content: article, cardType: "thumbnail", plan, renderOnly: true, reuseArt: { sourceHash: plan.sourceHash, dataUrl: "data:image/jpeg;base64," + normalArt.toString("base64") }, headingOverride: "제목만 바꿉니다" }));
        assert.equal(r.status, 200, JSON.stringify(await r.clone().json())); assert.equal(calls, 0);
        await save((await r.json()).card, "cover-reused");
        const skip = JSON.parse(JSON.stringify(plan)); skip.cards[2].skipReason = "도표로 정리할 근거가 없습니다."; delete skip.cards[2].infographic;
        r = await POST(req({ profile, title, content: article, cardType: "info", plan: skip })); assert.equal(r.status, 422);
        global.fetch = async () => { calls++; return new Response("{}", { status: 429 }); };
        await assert.rejects(generateEditorialPhoto(art, "medium"), /사용 한도/); assert.equal(calls, 1, "No hidden retries");
        const articleLong = "문서 정리 설명. ".repeat(450) + "\n\n마지막 문단의 중요한 예외까지 포함합니다.";
        global.fetch = async (_url, init) => {
            const body = JSON.parse(init.body);
            assert.equal(body.model, "claude-opus-5");
            assert.equal(body.output_config.effort, "low");
            assert.equal(body.max_tokens, 10000);
            const sent = body.messages[0].content[0].text;
            assert.ok(sent.includes("마지막 문단의 중요한 예외까지 포함합니다."), "Planner sees the complete article");
            return Response.json({ content: [{ type: "text", text: JSON.stringify(rawPlan()) }] });
        };
        await assert.rejects(planArticle(title, articleLong), /원문과 일치|아트디렉션이 누락/);
        let images = 0, reviews = 0;
        global.fetch = async (url) => {
            if (String(url).includes("openai.com")) { images++; return Response.json({ data: [{ b64_json: photo.toString("base64") }] }); }
            reviews++; return Response.json({ content: [{ type: "text", text: JSON.stringify({ design: 3, readability: 4, fidelity: 1, critical: true, summary: "원고는 의료 기록인데 자동차가 중심입니다.", issues: ["주제 불일치"] }) }] });
        };
        r = await POST(req({ profile, title, content: article, cardType: "thumbnail", plan }));
        assert.equal(r.status, 200);
        const held = (await r.json()).card;
        assert.equal(held.designReview.status, "revise"); assert.match(held.warnings.join(" "), /검수에서 수정 권고/);
        assert.ok(held.artDataUrl, "Held paid artwork remains available for manual inspection without regeneration");
        assert.equal(images, 1); assert.equal(reviews, 1);
        let finalReviews = 0;
        const testCard = await renderBriefCard({ plan, card: plan.cards[2], profile, style: "contrast" });
        const criticResult = { design: 4, readability: 4, fidelity: 5, critical: false, summary: "픽셀·원고 검수 완료", issues: [] };
        global.fetch = async (url, init) => {
            finalReviews++;
            assert.match(String(url), /anthropic.com\/v1\/messages$/);
            const body = JSON.parse(init.body);
            assert.equal(body.model, DESIGN_REVIEW_MODEL); assert.equal(body.thinking.type, "disabled");
            assert.equal(body.max_tokens, 1800);
            assert.equal(body.messages[0].content[1].source.media_type, "image/jpeg");
            assert.ok(body.messages[0].content[1].source.data.length > 0);
            return Response.json({ content: [{ type: "text", text: JSON.stringify(criticResult) }] });
        };
        assert.equal((await reviewMagazineCard(testCard, plan.cards[2], plan)).status, "pass");
        criticResult.critical = true;
        assert.equal((await reviewMagazineCard(testCard, plan.cards[2], plan)).status, "revise");
        global.fetch = async () => { finalReviews++; return new Response("{}", { status: 429 }); };
        assert.equal((await reviewMagazineCard(testCard, plan.cards[2], plan)).status, "unavailable");
        assert.equal(finalReviews, 3, "Final critic does not silently retry or regenerate paid artwork");
        let timeouts = 0;
        global.fetch = async () => { timeouts++; throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); };
        r = await PLAN(req({ title, content: article }));
        assert.equal(r.status, 502);
        const failure = await r.json();
        assert.match(failure.error, /원고 기획 응답 시간이 초과/);
        assert.doesNotMatch(failure.error, /operation was aborted/);
        assert.equal(timeouts, 1, "Planning timeout is not retried");
        assert.equal((await POST(req({ profile, title, content: article, cardType: "thumbnail" }))).status, 400);
        assert.equal(timeouts, 1, "Missing shared plan never silently adds another planning request");
        let generated = 0, timedReviews = 0;
        global.fetch = async (url, init) => {
            if (String(url).includes("openai.com")) {
                generated++;
                const input = JSON.parse(init.body);
                assert.equal(input.quality, "medium");
                assert.equal(input.output_format, "jpeg");
                return Response.json({ data: [{ b64_json: photo.toString("base64") }] });
            }
            timedReviews++;
            throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        };
        r = await POST(req({ profile, title, content: article, cardType: "thumbnail", plan }));
        assert.equal(r.status, 200);
        const preserved = (await r.json()).card;
        assert.equal(preserved.designReview.status, "unavailable");
        assert.ok(preserved.artDataUrl && preserved.imageDataUrl);
        assert.match(preserved.warnings.join(" "), /보존/);
        assert.equal(generated, 1); assert.equal(timedReviews, 1);
        await save(preserved, "cover-review-timeout");
        // A timeout while consuming the HTTP body is handled too, not only before response headers.
        global.fetch = async () => ({ ok: true, json: async () => { throw new DOMException("timeout", "TimeoutError"); } });
        assert.equal((await reviewMagazineCard(testCard, plan.cards[2], plan)).status, "unavailable");
    } finally { global.fetch = oldFetch; }
    if (live || liveArt || liveRest || refreshFinal || recompose) {
        const sampleIdx = process.argv.indexOf("--sample");
        for (const sample of liveArticles.filter((s) => sampleIdx < 0 || s.key === process.argv[sampleIdx + 1])) {
            const planPath = path.join(out, sample.key + "-plan.json");
            if (recompose && !fs.existsSync(planPath)) throw new Error("A saved live plan is required for zero-AI recomposition");
            const planStarted = Date.now();
            const p = (liveArt || liveRest || refreshFinal || recompose) && fs.existsSync(planPath) ? JSON.parse(fs.readFileSync(planPath, "utf8")) : await planArticle(sample.title, sample.content);
            fs.writeFileSync(planPath, JSON.stringify(p, null, 2));
            console.log("PLANNED " + sample.key + " in " + (Date.now() - planStarted) + "ms: " + p.cards[0].art.subject);
            if (refreshFinal) {
                // Explicit opt-in: recompose saved artwork and review, NO image-generation or planning calls.
                for (const pc of p.cards.filter((c) => !c.skipReason)) {
                    const name = sample.key + "-" + (pc.type === "thumbnail" ? "cover" : pc.type) + "-live";
                    const saved = JSON.parse(fs.readFileSync(path.join(out, name + ".json"), "utf8")).card;
                    const result = await renderBriefCard({ plan: p, card: pc, profile: liveProfile, style: "contrast", model: saved.model, art: saved.artDataUrl ? Buffer.from(saved.artDataUrl.split(",")[1], "base64") : undefined });
                    Object.assign(result, { artDataUrl: saved.artDataUrl, artSourceHash: saved.artSourceHash, artReview: saved.artReview });
                    result.designReview = await reviewMagazineCard(result, pc, p);
                    if (result.designReview.status !== "pass") result.warnings.push("완성본 검수에서 직접 확인이 필요합니다.");
                    await save(result, name);
                }
                continue;
            }
            if (liveArt) {
                const started = Date.now();
                const r = await POST(req({ profile: liveProfile, title: sample.title, content: sample.content, cardType: "thumbnail", plan: p, quality: "medium", style: "contrast" }));
                const result = await r.json(); assert.equal(r.status, 200, result.error); await save(result.card, sample.key + "-cover-live");
                console.log("LIVE COVER " + (Date.now() - started) + "ms, review=" + result.card.designReview?.status);
            }
            if (recompose) {
                const oldCard = JSON.parse(fs.readFileSync(path.join(out, sample.key + "-cover-live.json"), "utf8")).card;
                const bytes = Buffer.from(oldCard.artDataUrl.split(",")[1], "base64");
                const card = await renderBriefCard({ plan: p, card: p.cards[0], profile: liveProfile, art: bytes, style: "contrast", model: oldCard.model });
                await save({ ...card, artDataUrl: oldCard.artDataUrl, artSourceHash: oldCard.artSourceHash, artReview: oldCard.artReview }, sample.key + "-cover-live");
            }
            if (liveRest) for (const card of p.cards.filter((c) => c.type !== "thumbnail" && !c.skipReason)) {
                const r = await POST(req({ profile: liveProfile, title: sample.title, content: sample.content, cardType: card.type, plan: p, quality: "high", style: "contrast" }));
                const result = await r.json(); assert.equal(r.status, 200, result.error);
                await save(result.card, sample.key + "-" + card.type + "-live");
            }
            else for (const card of p.cards.filter((c) => ["info", "contact"].includes(c.type) && !c.skipReason)) await save(await renderBriefCard({ plan: p, card, profile: liveProfile, style: "contrast" }), sample.key + "-" + card.type + "-live");
        }
    }
    console.log("PASS V9: evidence, full article, source mismatch, 5 palettes / 2 typefaces, text bounds/overlaps, payload, zero-AI re-render, art relevance rejection, independent finished-pixel critic.");
}
main().catch((e) => { console.error(e.stack); process.exitCode = 1; });
