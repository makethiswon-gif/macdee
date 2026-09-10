// Offline only: identical copy, art, fonts and brand colours across layout recipes.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict"), ts = require("typescript"), sharp = require("sharp");
const root = path.resolve(__dirname, ".."); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return resolve.call(this, name.startsWith("@/") ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions[".ts"] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename }).outputText, filename);
const { createCanvas } = require("@napi-rs/canvas");
const { renderBriefCard } = require("../lib/blog-images/brief-renderer.ts");
const { validateVisualPlan } = require("../lib/blog-images/visual-planner.ts");
const { LAYOUT_RECIPES, chooseLayoutRecipe } = require("../lib/blog-images/layout-recipes.ts");
const fixture = require("./blog-images-v7-fixtures.cjs");
const compact = (value) => value.replace(/\s/g, "");
(async () => {
    const base = validateVisualPlan(fixture.rawPlan(), fixture.title, fixture.article, false);
    assert.equal(base.layoutRecipe, undefined, "Old plans are not silently redesigned");
    assert.throws(() => validateVisualPlan({ ...base, layoutRecipe: "unknown" }, fixture.title, fixture.article), /layout|레이아웃|지면|구성/i);
    const selected = [], history = [];
    for (let i = 0; i < 30; i++) {
        const plan = { ...base, sourceHash: "source-" + i };
        const recipe = chooseLayoutRecipe(plan, history);
        assert.ok(!selected.slice(-2).includes(recipe), "Avoid the last two articles");
        selected.push(recipe); history.unshift({ sourceHash: plan.sourceHash, layoutRecipe: recipe });
        assert.equal(chooseLayoutRecipe(plan, history), recipe, "Recovered source retains its design");
        assert.equal(validateVisualPlan({ ...base, layoutRecipe: recipe }, fixture.title, fixture.article).layoutRecipe, recipe);
        history.splice(12);
    }
    assert.equal(new Set(selected.slice(0, 6)).size, 6, "Use all six structures before repeating");
    assert.equal(chooseLayoutRecipe(base, [null, {}, { layoutRecipe: "bad" }]), chooseLayoutRecipe(base, []));
    const photo = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#38A764" } }).png().toBuffer();
    const profile = { ...fixture.profile, designFamily: "journal" };
    const proto = Object.getPrototypeOf(createCanvas(1, 1).getContext("2d")), original = proto.fillText;
    let printed = [];
    proto.fillText = function (value, x, y, ...args) {
        const width = this.measureText(value).width, tr = this.getTransform();
        const left = (this.textAlign === "center" ? x - width / 2 : x) * tr.a + tr.e;
        assert.ok(left >= -1 && left + width * tr.a <= this.canvas.width + 1, "Glyph width: " + value);
        assert.ok(y * tr.d + tr.f >= -1 && (y + parseFloat(this.font)) * tr.d + tr.f <= this.canvas.height + 1, "Glyph height: " + value);
        printed.push([String(value), Math.round(x), Math.round(y), this.font]);
        return original.call(this, value, x, y, ...args);
    };
    const geometry = new Set(), portraits = new Set(); let count = 0;
    try {
        for (const layoutRecipe of LAYOUT_RECIPES) for (const style of ["paper", "contrast"]) for (const info of fixture.variants) {
            const plan = { ...validateVisualPlan(fixture.rawPlan(info), fixture.title, fixture.article, false), layoutRecipe };
            // Exercise every infographic placement as well as the photographic cover.
            plan.cards[1] = { ...plan.cards[1], art: undefined, infographic: info };
            for (const card of plan.cards) {
                printed = [];
                const result = await renderBriefCard({ plan, card, profile, art: photo, style });
                assert.equal(result.width, 1200); assert.ok(result.height < 3300, `${layoutRecipe}: excessive height`);
                assert.equal(result.layoutRecipe, layoutRecipe); assert.ok(result.layoutChecks.passed, JSON.stringify(result.layoutChecks));
                const words = compact(printed.map((v) => v[0]).join(""));
                if (card.type !== "contact") assert.ok(words.includes(compact(card.heading)), "Keep the complete title");
                if (card.infographic) {
                    const strings = (v) => typeof v === "string" ? [v] : Object.entries(v).flatMap(([k, x]) => k === "kind" || k === "heading" ? [] : typeof x === "object" ? strings(x) : [x]);
                    for (const value of strings(info)) assert.ok(words.includes(compact(value)), "Preserve infographic facts: " + value);
                }
                if (style === "paper" && info === fixture.variants[0]) {
                    if (card.type === "thumbnail") {
                        geometry.add(JSON.stringify(printed.map((v) => v.slice(0, 3))));
                        const pixels = await sharp(Buffer.from(result.imageDataUrl.split(",")[1], "base64")).removeAlpha().raw().toBuffer();
                        let visible = 0;
                        for (let i = 0; i < pixels.length; i += 3) if (pixels[i] === 0x38 && pixels[i + 1] === 0xA7 && pixels[i + 2] === 0x64) visible++;
                        assert.ok(visible / (result.width * result.height) > 0.17, `${layoutRecipe}: artwork must remain prominent`);
                    }
                    if (card.type === "contact") portraits.add(JSON.stringify(printed.map((v) => v.slice(0, 3))));
                }
                count++;
            }
        }
        assert.equal(geometry.size, 6, "All six covers must differ geometrically, not merely by colour");
        assert.equal(portraits.size, 4, "Four portrait arrangements with unchanged brand details");
        for (const layoutRecipe of LAYOUT_RECIPES) {
            const plan = { ...base, layoutRecipe };
            const card = { ...plan.cards[0], heading: "상담에 앞서 계약 자료의 원본과 정리본을 함께 확인해야 하는 이유와 준비할 사항", deck: "상담 자료의 원본은 전체 내용을 보존합니다. 확인할 항목을 표시한 정리본은 별도로 보관하고 날짜와 대화의 앞뒤 내용을 함께 확인합니다. 구체적인 준비 자료는 사안에 따라 달라질 수 있습니다." };
            const result = await renderBriefCard({ plan, card, profile, art: photo });
            assert.ok(result.layoutChecks.passed, layoutRecipe + ": long-copy layout"); count++;
        }
        for (const length of [5, 6]) for (const layoutRecipe of LAYOUT_RECIPES) {
            const plan = { ...base, layoutRecipe };
            const infographic = { ...fixture.variants[2], items: Array.from({ length }, (_, i) => ({ label: `${i + 1}번째 확인할 준비 자료`, note: "날짜와 대화의 앞뒤 내용을 함께 확인합니다. 원본의 전체 내용을 따로 보관합니다." })) };
            const result = await renderBriefCard({ plan, card: { ...base.cards[2], infographic }, profile, style: "paper" });
            assert.ok(result.layoutChecks.passed, `${layoutRecipe}: ${length}-item checklist`); count++;
        }
    } finally { proto.fillText = original; }
    console.log(`PASS: ${count} renders, six distinct cover geometries, four portrait arrangements, exact infographic facts, 30-article rotation and stable recovery. Zero model calls.`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
