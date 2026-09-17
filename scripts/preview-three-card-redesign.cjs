// Local registered assets and an already-generated original. No network, model calls or DB writes.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'); process.chdir(root);
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: f }).outputText, f);
global.fetch = async () => { throw new Error('Local assets only'); };
const sharp = require('sharp');
const { renderEditorialThree } = require('../lib/blog-images/three-card-renderer.ts');
const { contactCopy } = require('../lib/blog-images/three-card-policy.ts');
const out = path.resolve('tmp/three-card-redesign');
(async () => {
    const r = JSON.parse(fs.readFileSync('tmp/profile-design/profiles.json', 'utf8')).find(p => p.id === 'mmlk8qh6gqq9l');
    const profile = { id: r.id, lawyerName: r.lawyer_name.split('||')[0], officeName: r.office_name, jobTitle: '변호사', phone: r.phone, brandColor: r.brand_color, website: r.website || '',
        profileImages: r.profile_images || [], officeImages: r.office_images || [], logoImage: r.logo_image || '' };
    const planFile = '.vercel/thesis-recovery/6fed6e8a-07bd-476c-bc31-ff683b93caff-plan.json';
    const saved = JSON.parse(fs.readFileSync(planFile, 'utf8')), plan = saved.plan || saved;
    const original = JSON.parse(fs.readFileSync('tmp/pipeline-repair/live/cover-original.json', 'utf8'));
    const art = Buffer.from(original.artDataUrl.split(',')[1], 'base64');
    fs.mkdirSync(out, { recursive: true });
    const sheet = [], results = [];
    for (const card of plan.cards) {
        const edited = card.type === 'contact' ? { ...card, ...contactCopy('카톡 캡처 몇 장만 들고 상간자 소송을 걸어도 될까요') } : card;
        const result = await renderEditorialThree({ profile, plan, card: edited, art });
        assert.ok(result.layoutChecks.passed, `${card.type}: ${result.layoutChecks.issues}`);
        const bytes = Buffer.from(result.imageDataUrl.split(',')[1], 'base64');
        fs.writeFileSync(path.join(out, `${card.type}.png`), bytes);
        sheet.push({ input: await sharp(bytes).resize(500).png().toBuffer(), left: sheet.length * 516, top: 0 });
        results.push({ type: card.type, layout: result.layoutRecipe, ...result.photoChecks, warnings: result.warnings });
    }
    await sharp({ create: { width: 1532, height: 500, channels: 3, background: '#dedede' } }).composite(sheet).png().toFile(path.join(out, 'sheet.png'));
    fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>카라 이미지 시안</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;font:16px Arial}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}img{width:100%;display:block;aspect-ratio:1}figure{margin:0}figcaption{padding:12px 0}@media(max-width:700px){body{padding:12px}main{grid-template-columns:1fr}}</style><main>' + ['thumbnail','info','contact'].map((type,i)=>`<figure><img src="${type}.png" alt="${['메인 표지','등록 사진','상담 연락'][i]}"><figcaption>${['메인 표지','등록 사진','상담 연락'][i]}</figcaption></figure>`).join('') + '</main></html>');
    console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
