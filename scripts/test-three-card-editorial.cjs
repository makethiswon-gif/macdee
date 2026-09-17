// Synthetic claims and local assets only. No model calls or production writes.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript"), assert = require("node:assert/strict"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
process.env.ADMIN_TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
global.fetch = async () => { throw new Error("No network allowed"); };
const { load } = require("cheerio"), sharp = require("sharp");
const { selectImageProof, signImageProof, verifyImageProof } = require("../lib/blog-images/proof-selection.ts");
const { sourceHash, validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { asEditorialThree } = require("../lib/blog-images/three-card-plan.ts");
const { renderEditorialThree, prepareEditorialThree } = require("../lib/blog-images/three-card-renderer.ts");
const { EDITORIAL_SET_FORMAT, EDITORIAL_LAYOUT_REVISION, cardTypesFor } = require("../lib/blog-images/card-types.ts");
const { editorialCoverLayout, contactCopy } = require("../lib/blog-images/three-card-policy.ts");
const { toNaverHtml } = require("../lib/blog-naver-html.ts");
const { title, article, profile, rawPlan } = require("./blog-images-v7-fixtures.cjs");
const hash = sourceHash(title, article);
const claim = (id, field, scope = "lawyer") => ({ id, scope, status: "approved", fact: `검증용 ${field} 경력`, articleText: `검증용 ${field} 경력`, imageText: `검증용 ${field} 경력`, fields: [field], conditions: [],
    sourceUrl: "https://example.com/fixture", sourceQuote: `검증용 ${field} 경력`, sourceRef: "fixture", checkedAt: "2020-01-01", reviewAfter: "2999-01-01" });
const library = { profileId: profile.id, firmId: "fixture-firm", lawyerId: profile.id, revision: 1, designFamily: "auto", updatedAt: "", claims: [claim("general", "공통"), claim("topic", "보증금", "firm"), claim("wrong-topic", "형사")] };
(async () => {
    const selected = selectImageProof(library, "보증금 반환", hash);
    assert.deepEqual(selected.claims.map(c => c.id), ["topic", "general"]);
    assert.equal(selected.claims[0].scope, "firm");
    assert.ok(!article.includes(selected.claims[0].text), "Image proof is independent of manuscript occurrence");
    const token = signImageProof(selected);
    verifyImageProof(token, selected, library, hash);
    assert.equal(signImageProof(selected), token, "Stable signing supports checkpoint recovery");
    for (const lib of [{ ...library, profileId: "another" }, { ...library, firmId: "another" }, { ...library, lawyerId: "another" }, { ...library, revision: 2 },
        { ...library, claims: library.claims.map(c => ({ ...c, status: "blocked" })) },
        { ...library, claims: library.claims.map(c => ({ ...c, reviewAfter: "2020-01-01" })) },
        { ...library, claims: library.claims.map(c => ({ ...c, imageText: c.imageText + " changed" })) }])
        assert.throws(() => verifyImageProof(token, selected, lib, hash));
    assert.throws(() => verifyImageProof(token + "tampered", selected, library, hash));
    assert.throws(() => verifyImageProof(token, selected, library, "other-article"));
    assert.throws(() => verifyImageProof(token, { ...selected, claims: [] }, library, hash));
    assert.equal(selectImageProof({ ...library, claims: [] }, "topic", hash).mode, "basic");
    assert.equal(selectImageProof({ ...library, claims: [claim("x", "형사")] }, "상속", hash).mode, "basic");
    const basic = selectImageProof({ ...library, claims: [] }, "topic", hash, true);
    assert.equal(basic.mode, "basic"); assert.deepEqual(basic.claims, []);
    const noFirm = selectImageProof({ ...library, firmId: "" }, "보증금", hash);
    assert.ok(noFirm.claims.every(c => c.scope === "lawyer"));
    const old = validateVisualPlan(rawPlan(), title, article, false), frozenOld = JSON.stringify(old);
    const plan = asEditorialThree(old, profile, selected, title, article);
    assert.equal(JSON.stringify(old), frozenOld, "Legacy four-card plan is never mutated");
    assert.deepEqual(cardTypesFor(plan), ["thumbnail", "info", "contact"]);
    assert.equal(plan.setFormat, EDITORIAL_SET_FORMAT); assert.equal(old.cards.length, 4);
    assert.deepEqual(plan.cards[0].art, old.cards[0].art, "Paid art's original brief is preserved");
    const hostile = validateVisualPlan({ ...plan, cards: plan.cards.map(c => c.type === "thumbnail" ? c : { ...c, heading: "무료 즉시 상담 승소 보장", deck: "경력 조작", points: ["조작"] }) }, title, article);
    assert.equal(hostile.cards[2].heading, plan.cards[2].heading); assert.equal(hostile.cards[1].heading, "변호사·로펌 소개");
    const art = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#518079" } }).png().toBuffer();
    const p = { ...profile, profileImages: [`data:image/png;base64,${art.toString("base64")}`] };
    const studio = { bytes: art, kind: "studio", selections: [{ assetId: "approved", version: 1 }] };
    await prepareEditorialThree(p, selected, title, studio);
    await assert.rejects(() => prepareEditorialThree({ ...p, phone: "" }, selected, title), /대표 전화번호/);
    for (const input of [p, profile, { ...p, profileImages: [], officeImages: [] }, { ...p, profileImages: [], officeImages: p.profileImages }])
        await assert.rejects(() => prepareEditorialThree(input, selected, title), /승인된 스튜디오 사진/);
    await prepareEditorialThree({ ...p, profileImages: [], officeImages: p.profileImages }, selected, title, studio);
    const basicPlan = asEditorialThree(old, p, basic, title, article);
    assert.match(contactCopy("카톡 캡처로 상간자 소송이 되나요").heading, /상간 소송/);
    const padded = await sharp({ create: { width: 400, height: 500, channels: 3, background: "white" } })
        .composite([{ input: await sharp({ create: { width: 363, height: 345, channels: 3, background: "#477584" } }).png().toBuffer(), top: 60, left: 18 }]).png().toBuffer();
    const lowRes = `data:image/png;base64,${padded.toString("base64")}`;
    for (const source of [
        { profileImages: [lowRes], officeImages: [] },
        { profileImages: ["data:image/png;base64,broken", lowRes], officeImages: [] },
        { profileImages: ["https://untrusted.invalid/photo.jpg"], officeImages: [lowRes] },
    ]) {
        await assert.rejects(() => renderEditorialThree({ profile: { ...p, ...source }, plan: basicPlan, card: basicPlan.cards[1] }), /승인된 스튜디오 사진/);
        const contact = await renderEditorialThree({ profile: { ...p, ...source }, plan: basicPlan, card: basicPlan.cards[2] });
        assert.equal(contact.layoutChecks.passed, true, "Contact retains readable registered-photo fallback");
        assert.equal(contact.photoChecks.source, source.officeImages.length ? "office" : "portrait");
    }
    const officePreferred = await renderEditorialThree({ profile: { ...p, profileImages: [lowRes], officeImages: p.profileImages }, plan: basicPlan, card: basicPlan.cards[2] });
    assert.equal(officePreferred.photoChecks.source, "office", "Contact keeps its reviewed office-first fallback");
    const softStudio = { bytes: padded, kind: "studio", selections: [{ assetId: "approved-soft", version: 2 }] };
    const approvedPlate = await renderEditorialThree({ profile: { ...p, profileImages: [], officeImages: [] }, plan: basicPlan, card: basicPlan.cards[1], editorialPhoto: softStudio });
    assert.equal(approvedPlate.photoChecks.source, "studio");
    assert.ok(approvedPlate.photoChecks.areaRatio >= 0.79, "Approved softness does not shrink the photo to a postage stamp");
    assert.equal(approvedPlate.warnings.length, 0);
    assert.equal(approvedPlate.layoutChecks.textBlocks, 0);
    await prepareEditorialThree({ ...p, profileImages: [], officeImages: [] }, basic, title, softStudio);
    const hashes = new Set();
    const contextPrototype = Object.getPrototypeOf(require('@napi-rs/canvas').createCanvas(1, 1).getContext('2d'));
    const originalFillText = contextPrototype.fillText;
    for (const recipe of ["photo-open", "split-footer", "headline", "title-band", "caption-rail", "column-pair"]) {
        const input = { profile: p, plan: { ...plan, layoutRecipe: recipe }, card: { ...plan.cards[0], heading: "자료를 확인하는 기준", headlineLines: undefined, deck: "원문과 맥락을 함께 확인합니다." }, art };
        const printed = [];
        contextPrototype.fillText = function(...args) {
            printed.push(String(args[0]));
            return originalFillText.apply(this, args);
        };
        let result;
        try { result = await renderEditorialThree(input); }
        finally { contextPrototype.fillText = originalFillText; }
        assert.ok(!printed.join('').includes('원문과') && !printed.join('').includes('맥락을'), 'Cover decks are not printed on photographic posters');
        assert.equal(result.layoutChecks.textBlocks, input.card.kicker ? 3 : 2, 'Only title, optional topic and firm name are printed');
        const paperResult = await renderEditorialThree({ ...input, style: "paper" });
        assert.equal(paperResult.layoutRecipe, recipe, "Paper only changes tone, never saved geometry");
        assert.equal(result.layoutRecipe, recipe, "Default paper style must not replace saved geometry");
        assert.ok(result.layoutChecks.passed, result.layoutChecks.issues.join());
        assert.equal(result.photoChecks.areaRatio, 1, "Poster artwork fills the entire square");
        hashes.add(crypto.createHash('sha256').update(result.imageDataUrl).digest('hex'));
    }
    assert.equal(hashes.size, 6, "All six saved recipes produce genuinely different default pixels");
    for (const family of ["ledger", "column", "journal", "poster", "dossier", "gallery"]) {
        const first = editorialCoverLayout({ ...p, designFamily: family }, []);
        assert.equal(editorialCoverLayout({ ...p, designFamily: family }, [{ layoutRecipe: first }]), first, 'Per-lawyer editions do not rotate per article');
        for (const type of cardTypesFor(plan)) {
            const card = await renderEditorialThree({ profile: { ...p, designFamily: family }, plan: { ...plan, layoutRecipe: first }, card: plan.cards.find(c => c.type === type), art, model: "fixture", editorialPhoto: type === "info" ? studio : undefined });
            assert.ok(card.layoutChecks.passed, `${family}/${type}: ${card.layoutChecks.issues}`);
            assert.equal(card.width, 2000); assert.equal(card.height, 2000); assert.equal(card.layoutRevision, EDITORIAL_LAYOUT_REVISION);
            const png = await sharp(Buffer.from(card.imageDataUrl.split(",")[1], "base64")).metadata();
            assert.equal(png.width, 2000); assert.equal(png.height, 2000);
            if (type === "info") { assert.ok(card.altText.includes("로펌:")); assert.ok(card.altText.includes("변호사:")); }
            if (type === "contact") {
                assert.equal(card.contactActions[0].href, "tel:0200000000");
                assert.equal(card.layoutChecks.textBlocks, 4, 'Contact contains topic, lawyer, actual phone and firm');
            }
        }
    }
    const phone = { label: "상담", display: "02-0000-0000", href: "tel:0200000000" };
    for (const recipe of ["photo-open", "split-footer", "headline", "title-band", "caption-rail", "column-pair"]) {
        const card = { ...plan.cards[0], heading: "조건과 예외를 모두 확인하고 자료의 앞뒤 내용을 정확하게 정리해야 하는 이유", headlineLines: undefined,
            deck: "자료를 확인할 때에는 일부 내용만 따로 판단하지 않고 전체 맥락과 조건을 함께 정리합니다. 필요한 절차와 판단은 구체적인 사실관계와 원문 내용에 따라 달라질 수 있습니다." };
        const opts = { profile: p, plan: { ...plan, layoutRecipe: recipe }, card, art };
        let result = await renderEditorialThree(opts);
        if (!result.layoutChecks.passed) result = await renderEditorialThree({ ...opts, repairLayout: true });
        assert.ok(result.layoutChecks.passed, `${recipe}/long copy: ${result.layoutChecks.issues}`);
    }
    const images = cardTypesFor(plan).map(type => ({ type, url: `https://example.com/${type}.png`, afterText: type === "info" ? plan.paragraphs[1].text : undefined, ...(type === "contact" ? { contactActions: [phone] } : {}) }));
    for (const manuscript of [article, article + "\n\n[전화 상담 · 대표번호 02-0000-0000](tel:0200000000)"]) {
        const $ = load(toNaverHtml(manuscript, title, images));
        assert.equal($("img").length, 3); assert.equal($('a[href="tel:0200000000"]').length, 1);
        const afterContact = $('img[src$="contact.png"]').parent().nextAll('p').filter((_, el) => $(el).find("a").length).first();
        assert.equal(afterContact.find("a").attr("href"), phone.href);
        assert.ok($.text().includes("구체적인 준비 자료와 판단은 사안에 따라 달라질 수 있습니다."));
    }
    assert.ok(!toNaverHtml(article, title, [{ ...images[2], contactActions: [{ ...phone, href: "javascript:alert(1)" }] }]).includes("javascript:"));
    console.log("PASS: studio-only info with/without careers, approved soft finishes, contact fallback, old four-card preservation, 18 real renders, fixed sizes and safe phone links.");
})().catch(e => { console.error(e); process.exitCode = 1; });
