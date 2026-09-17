const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), ts = require("typescript");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
const { createCanvas } = require("@napi-rs/canvas");
const { profileEdition, withFixedCredentials, PROFILE_EDITIONS } = require("../lib/blog-images/profile-editions.ts");
const { renderProfileCard, fixedProfileCardKey } = require("../lib/blog-images/profile-card-renderer.ts");
const { PROFILE_SET_FORMAT, PROFILE_CARD_TYPES, cardTypesFor } = require("../lib/blog-images/card-types.ts");
const { sourceHash, validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { imageSetReady } = require("../lib/blog-images/quality-policy.ts");
const { signImageRelease, verifyImageRelease, digest } = require("../lib/blog-images/production-store.ts");
const { blogPhoneContact } = require("../lib/blog-contact.ts");
const ids = ["mmlhi2x25zu2h", "mmswe2dmpr95z", "mmlk8qh6gqq9l", "mmkfnvun052ja", "mmkc1ylfhv1t6", "mmlg8fcm9bdgl", "mqaaoypk621p6", "mse8rx0bkl9f0", "mpatjgph1tnl5", "mrvn35u3cxprq"];
const photo = createCanvas(500, 700); photo.getContext("2d").fillRect(80, 80, 340, 600);
const dataUrl = photo.toDataURL("image/png");
const fakeProfiles = PROFILE_EDITIONS.map((e, i) => ({ id: ids[i], lawyerName: e.owner.startsWith("법무법인") ? "법무법인" : e.owner,
    officeName: e.owner.startsWith("법무법인") ? e.owner : "법률사무소", jobTitle: "변호사", phone: "02-1234-5678", website: "https://example.com", brandColor: "#080808", profileImages: [dataUrl], officeImages: [], logoImage: "" }));
const source = "상담 전에 계약서와 거래 내역을 정리해야 합니다.";
const planFor = (p) => ({ version: "visual-plan-v11", sourceHash: sourceHash("자료 확인", source), question: "어떤 자료가 필요한가요?", thesis: "계약서와 거래 내역을 정리합니다.",
    setFormat: PROFILE_SET_FORMAT, publicationEdition: profileEdition(p).id, layoutRecipe: profileEdition(p).cover,
    cards: [{ type: "thumbnail", heading: "계약서를 먼저 확인하세요", deck: "", purpose: "원고의 핵심", afterParagraphId: "p1", evidence: [{ paragraphId: "p1", quote: source }],
        art: { medium: "photograph", subject: "계약 확인", scene: "익명 인물이 테이블에서 서류를 살피는 장면", message: "자료 정리", avoid: [] } }, { type: "info" }, { type: "contact" }] });
(async () => {
    assert.equal(PROFILE_EDITIONS.length, 10);
    const owner = fakeProfiles[0];
    const library = { profileId: owner.id, firmId: "fixture", lawyerId: owner.id, revision: 1, updatedAt: "", designFamily: "auto", claims: [] };
    assert.ok(withFixedCredentials(owner).credentialProof.facts.length > 0);
    assert.equal(withFixedCredentials(owner, library).credentialProof.facts.length, 0);
    const approved = { id: "approved", scope: "lawyer", status: "approved", fact: "Verified credential", articleText: "Verified credential", imageText: "Verified credential",
        fields: ["fixture"], conditions: [], sourceUrl: "https://example.com/credentials", sourceQuote: "Verified credential", sourceRef: "fixture", checkedAt: "2020-01-01", reviewAfter: "2999-01-01" };
    assert.deepEqual(withFixedCredentials(owner, { ...library, claims: [approved] }).credentialProof.facts.map((f) => f.text), ["Verified credential"]);
    for (const claim of [{ ...approved, status: "blocked" }, { ...approved, status: "pending" }, { ...approved, reviewAfter: "2020-01-02" }]) {
        assert.equal(withFixedCredentials(owner, { ...library, claims: [claim] }).credentialProof.facts.length, 0, "Revoked or expired facts must not fall back to research seeds");
    }
    const out = path.join(root, "tmp/profile-design/previews"); fs.mkdirSync(out, { recursive: true });
    const real = process.env.PROFILE_DESIGN_FIXTURES ? JSON.parse(fs.readFileSync(process.env.PROFILE_DESIGN_FIXTURES, "utf8")) : null;
    const profiles = real ? real.filter((r) => r.office_name && r.id !== "macdee-magazine").map((r) => ({ id: r.id, lawyerName: r.lawyer_name.split("||")[0], jobTitle: r.lawyer_name.split("||")[1] || "변호사", officeName: r.office_name,
        phone: blogPhoneContact(r.phone)?.display || "", website: r.website || "", brandColor: r.brand_color || "#080808", profileImages: r.profile_images || [], officeImages: [], logoImage: r.logo_image || "" })) : fakeProfiles;
    let count = 0; const gallery = [];
    for (const raw of profiles) {
        const profile = withFixedCredentials(raw), edition = profileEdition(profile);
        assert.ok(edition, `No explicit edition for ${profile.id} ${profile.lawyerName}`);
        assert.equal(profileEdition({ ...profile, lawyerName: "다른 사람", officeName: "다른 사무소" }), undefined);
        const plan = validateVisualPlan(planFor(profile), "자료 확인", source);
        assert.deepEqual(cardTypesFor(plan), PROFILE_CARD_TYPES);
        assert.equal(plan.layoutRecipe, edition.cover);
        assert.equal(plan.cards[1].heading, "주요 경력");
        assert.equal(plan.cards[1].art, undefined);
        for (const type of ["info", "contact"]) {
            const opts = { profile, plan, card: plan.cards.find((c) => c.type === type) };
            const key = fixedProfileCardKey(opts);
            assert.equal(key, fixedProfileCardKey({ ...opts, plan: { ...plan, sourceHash: "another-article" }, profile: { ...profile, career: ["주제별로 다른 원고 강점"] } }));
            if (type === "info") assert.equal(key, fixedProfileCardKey({ ...opts, profile: { ...profile, phone: "02-8888-9999" } }));
            else assert.notEqual(key, fixedProfileCardKey({ ...opts, profile: { ...profile, phone: "02-8888-9999" } }));
            const card = await renderProfileCard(opts);
            assert.ok(card.layoutChecks.passed, `${profile.lawyerName}/${type}: ${card.layoutChecks.issues.join(",")}`);
            assert.equal(card.width, 1200); assert.equal(card.height, type === "info" ? 1500 : 900);
            if (type === "info") {
                const second = await renderProfileCard({ ...opts, plan: { ...plan, sourceHash: "second" } });
                assert.equal(digest(card.imageDataUrl), digest(second.imageDataUrl));
            }
            if (real) { const filename = `${profile.id}-${type}.png`; fs.writeFileSync(path.join(out, filename), Buffer.from(card.imageDataUrl.split(",")[1], "base64")); gallery.push({ name: edition.owner, label: edition.label, type, filename }); }
            count++;
        }
    }
    const cards = PROFILE_CARD_TYPES.map((type) => ({ type, setFormat: PROFILE_SET_FORMAT, designVersion: "editorial-v11", layoutChecks: { passed: true }, releaseToken: "test", setId: "same" }));
    assert.equal(imageSetReady(cards), true); assert.equal(imageSetReady(cards.slice(0, 2)), false);
    assert.equal(imageSetReady(cards.map((c) => ({ ...c, setFormat: undefined }))), false);
    process.env.ADMIN_TOKEN_SECRET = "test-only-secret";
    const card = { ...cards[0], imageDataUrl: dataUrl }, token = signImageRelease(card, "owner", "article");
    const expected = { profileId: "owner", sourceHash: "article", type: "thumbnail", pngHash: digest(Buffer.from(dataUrl.split(",")[1], "base64")), setId: "same", setFormat: PROFILE_SET_FORMAT };
    assert.equal(verifyImageRelease(token, expected), true);
    assert.equal(verifyImageRelease(token, { ...expected, profileId: "other" }), false);
    assert.equal(verifyImageRelease(signImageRelease({ ...card, setFormat: undefined }, "owner", "article"), expected), false);
    if (real) fs.writeFileSync(path.join(out, "gallery.json"), JSON.stringify(gallery, null, 2));
    console.log(`PASS ${count} fixed profile/contact layouts; stable asset identity, owner isolation, 3/4-card compatibility and signed format.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
