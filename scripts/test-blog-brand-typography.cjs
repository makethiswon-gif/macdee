// Real raster tests, local logo/photograph fixtures only. No network or paid generation.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
let network = 0; global.fetch = async () => { network++; throw new Error('Network disabled'); };
const sharp = require('sharp'), { createCanvas } = require('@napi-rs/canvas');
const { extractLogoInk, resolveLogoTypography } = require('../lib/blog-images/logo-color.ts');
const { luminance, contrastRatio, textProtection, paintPhotoText } = require('../lib/blog-images/text-contrast.ts');
const { magazineFonts, setType } = require('../lib/blog-images/magazine-design.ts');
const { renderEditorialThree } = require('../lib/blog-images/three-card-renderer.ts');
const { drawPhotoPoster } = require('../lib/blog-images/photo-poster.ts');
const { EDITORIAL_LAYOUT_REVISION } = require('../lib/blog-images/card-types.ts');
const out = 'tmp/blog-brand-typography'; fs.mkdirSync(out, { recursive: true });
const url = bytes => 'data:image/png;base64,' + bytes.toString('base64');
function logo(color, matte = true) {
    const c = createCanvas(380, 150).getContext('2d');
    if (matte) { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, 380, 150); }
    c.fillStyle = color; c.fillRect(20, 40, 60, 70);
    c.fillStyle = color === '#FFFFFF' ? color : '#242424'; c.fillRect(110, 55, 240, 35);
    return c.canvas.toBuffer('image/png');
}
(async () => {
    magazineFonts();
    for (const color of ['#48B3C1', '#932F48', '#192F59', '#D9B765', '#BACADB']) {
        const bytes = logo(color), before = Buffer.from(bytes);
        assert.equal(await extractLogoInk(bytes), color);
        assert.deepEqual(bytes, before, 'Logo source is immutable');
        assert.deepEqual(await resolveLogoTypography({ logoImage: url(bytes), brandColor: '#080808' }), { primary: color, source: 'logo' });
    }
    assert.equal(await extractLogoInk(logo('#FFFFFF', false)), '#FFFFFF', 'White transparent logos retain their actual white ink');
    assert.equal(await extractLogoInk(logo('#242424')), '#242424', 'Monochrome ink is not replaced with a random colour');
    for (const source of ['', 'data:image/png;base64,broken', 'https://untrusted.invalid/logo.png']) {
        assert.deepEqual(await resolveLogoTypography({ logoImage: source, brandColor: '#123abc' }), { primary: '#123ABC', source: 'profile' });
    }
    assert.equal((await resolveLogoTypography({ logoImage: '', brandColor: 'invalid' })).source, 'fallback');
    assert.equal(network, 0, 'Unsafe URLs must be rejected before fetching');
    for (const color of ['#000000', '#FFFFFF', '#48B3C1', '#932F48', '#192F59', '#D9B765', '#777777']) {
        for (const size of [28, 114]) {
            const same = textProtection(color, [luminance(color)], size);
            assert.ok(same.needed || same.adjusted); assert.ok(same.edgeContrast >= 4.5);
            assert.ok(same.needed || same.direct >= same.threshold);
            const mixed = textProtection(color, [0, 1, luminance(color), luminance(color)], size);
            assert.ok(mixed.needed || mixed.adjusted);
        }
        const c = createCanvas(2000, 2000).getContext('2d'); c.scale(2000 / 1200, 2000 / 1200);
        c.fillStyle = color; c.fillRect(0, 0, 1200, 1200); setType(c, 114, 'sans');
        let strokes = 0; const stroke = c.strokeText.bind(c); c.strokeText = (...args) => { strokes++; return stroke(...args); };
        assert.equal(paintPhotoText(c, '보증금 반환', 72, 740, 114, color), true); assert.ok(strokes <= 1);
        const pixels = c.getImageData(130, 1250, 1500, 220).data;
        const base = color.slice(1).match(/../g).map(v => parseInt(v, 16));
        let contrastPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const pixel = '#' + Array.from(pixels.subarray(i, i + 3)).map(v => v.toString(16).padStart(2, '0')).join('');
            if (contrastRatio(luminance(pixel), luminance(color)) >= 2.5) contrastPixels++;
        }
        assert.ok(contrastPixels > 1000, `Actual ink or separating edge must contrast with the background: ${color}`);
        assert.deepEqual(Array.from(c.getImageData(1900, 1900, 1, 1).data).slice(0, 3), base, 'No full-image tint/filter');
    }
    assert.equal(textProtection('#192F59', [1], 114).needed, false, 'No outline on a naturally readable field');
    assert.equal(textProtection('#FFFFFF', [0], 28).needed, false);
    for (const recipe of ['photo-open', 'headline', 'title-band', 'column-pair', 'caption-rail', 'split-footer']) {
        const c = createCanvas(2000, 2000).getContext('2d'); c.scale(2000 / 1200, 2000 / 1200);
        c.fillStyle = '#48B3C1'; c.fillRect(0, 0, 1200, 1200);
        const r = drawPhotoPoster(c, { recipe, heading: '보증금\n반환 기준', kicker: '임대차', brand: '검증 법률사무소', brandColor: '#48B3C1' });
        assert.equal(r.issues.length, 0); assert.ok(r.protectedRuns > 0);
    }
    const withGallery = process.argv.includes('--gallery');
    const manifest = withGallery ? JSON.parse(fs.readFileSync('tmp/editorial-quality/approved/manifest.json')) : [];
    const gallery = [];
    for (const id of withGallery ? ['mmlk8qh6gqq9l', 'mse8rx0bkl9f0', 'mmlg8fcm9bdgl'] : []) {
        const profile = JSON.parse(fs.readFileSync(`tmp/editorial-quality/approved/${id}-profile.json`)).profile;
        profile.lawyerName = profile.lawyerName.trim();
        const selected = manifest.find(a => a.profileId === id); assert.ok(selected);
        const studio = { bytes: fs.readFileSync(`tmp/editorial-quality/approved/${selected.file}`), kind: 'studio', selections: [{ assetId: selected.assetId, version: selected.version }] };
        const cover = { type: 'thumbnail', heading: '상간소송\n증거의 기준', kicker: '카톡 캡처', emphasis: '증거', evidence: [], purpose: '', afterParagraphId: '' };
        const plan = { version: 'visual-plan-v11', setFormat: 'editorial-three-v1', sourceHash: 'local-brand-test', question: '상간소송 증거', thesis: '', paragraphs: [], layoutRecipe: 'photo-open', publicationEdition: `editorial-three-v1:${id}`, proofSelection: { profileId: id, sourceHash: 'local-brand-test', mode: 'basic', claims: [] }, cards: [cover, { ...cover, type: 'info' }, { ...cover, type: 'contact' }] };
        const brand = await resolveLogoTypography(profile); assert.equal(brand.source, 'logo');
        for (const type of ['thumbnail', 'contact']) {
            const r = await renderEditorialThree({ profile, plan, card: plan.cards.find(c => c.type === type), art: fs.readFileSync('tmp/art-direction-v2/A-original.jpg'), editorialPhoto: studio });
            assert.equal(r.layoutChecks.passed, true, r.layoutChecks.issues.join()); assert.equal(r.layoutRevision, EDITORIAL_LAYOUT_REVISION);
            assert.equal(r.brandTypography.primary, brand.primary); assert.equal(r.brandTypography.source, 'logo');
            const bytes = Buffer.from(r.imageDataUrl.split(',')[1], 'base64'), meta = await sharp(bytes).metadata();
            assert.equal(meta.width, 2000); assert.equal(meta.height, 2000);
            const file = `${id}-${type}.png`; fs.writeFileSync(`${out}/${file}`, bytes);
            gallery.push({ file, name: profile.lawyerName, type, ...r.brandTypography });
        }
        const photoOnly = await renderEditorialThree({ profile, plan, card: plan.cards[1], editorialPhoto: studio });
        assert.equal(photoOnly.layoutChecks.textBlocks, 0); assert.equal(photoOnly.brandTypography.protectedRuns, 0);
    }
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (withGallery) {
        fs.writeFileSync(`${out}/review.html`, '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>로고 색상 조판 검증</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e8eaeb;font:15px Arial}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}img{display:block;width:100%;aspect-ratio:1}figcaption{padding:12px 0;overflow-wrap:anywhere}@media(max-width:700px){body{padding:12px}main{grid-template-columns:1fr}}</style><h1>로고 색상 · 표지와 상담</h1><main>' + gallery.map(g => `<figure><img src="${esc(g.file)}" alt="${esc(g.name)}"><figcaption>${esc(g.name)} · ${g.type === 'thumbnail' ? '표지' : '상담'} · ${g.primary}</figcaption></figure>`).join('') + '</main></html>');
        fs.writeFileSync(`${out}/metrics.json`, JSON.stringify(gallery, null, 2));
    }
    assert.equal(network, 0);
    console.log('PASS: logo-first colours, safe fallbacks, monochrome/transparency, real contrast pixels and six layouts. No paid calls.');
    if (withGallery) console.log('PASS: three actual lawyer logos, six 2000px photographic posters and untouched photo-only plates. ' + JSON.stringify(gallery));
})().catch(e => { console.error(e); process.exitCode = 1; });
