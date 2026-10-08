/* 썸네일 A/B 조판(2026-10-08): 변호사별 고정 배정, 흰 제목 대비 4.5:1 보장, 영역 안 배치, 사무소 색 보정,
   글마다 다른 빛 연출, 사진 생성·원고 표지 지시가 조판에 맞는지. 저장소·네트워크·유료 호출 없음. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const originalResolve = Module._resolveFilename, originalLoad = Module._load;
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._load = function (name, ...args) {
    if (name === '@/lib/supabase/server') return { createServiceClient: () => { throw new Error('No storage in this test'); } };
    return originalLoad.call(this, name, ...args);
};
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const sharp = require('sharp');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const cover = require('../lib/blog-images/thumbnail-cover.ts');
const { magazineFonts } = require('../lib/blog-images/magazine-design.ts');
const { contrastRatio, luminance } = require('../lib/blog-images/text-contrast.ts');
const { editorialPhotoPrompt } = require('../lib/blog-images/photo-generator.ts');
const { coverBriefInstruction } = require('../lib/blog-cover-brief.ts');

(async () => {
    magazineFonts();
    // 1) 변호사별 고정 배정(PROFILE_EDITIONS) — 이름이 맞을 때만 적용, 없는 변호사는 ID로 늘 같은 쪽
    const who = (id, lawyerName, officeName = '') => ({ id, lawyerName, officeName });
    assert.equal(cover.thumbnailStyle(who('mmlhi2x25zu2h', '오승준')), 'fullbleed');
    assert.equal(cover.thumbnailStyle(who('mmlk8qh6gqq9l', '유지은')), 'band');
    assert.equal(cover.thumbnailStyle(who('mmkfnvun052ja', '이정도')), 'band');
    assert.equal(cover.thumbnailStyle(who('mqaaoypk621p6', '김정웅')), 'fullbleed');
    assert.equal(cover.thumbnailStyle(who('mrvn35u3cxprq', '법무법인', '법무법인 정음 천안사무소')), 'fullbleed');
    const unknown = cover.thumbnailStyle(who('new-lawyer-1', '홍길동'));
    assert.equal(cover.thumbnailStyle(who('new-lawyer-1', '홍길동')), unknown, '배정 없는 변호사도 늘 같은 조판');
    const pool = new Set(Array.from({ length: 40 }, (_, i) => cover.thumbnailStyle(who(`x-${i}`, '무명'))));
    assert.equal(pool.size, 2, '배정 없는 변호사들은 A·B 양쪽으로 나뉜다');

    // 2) 사무소 색: 짙은 색은 띠 위에서 보이게 같은 계열로 밝힌다(3:1), 원래 밝은 색은 그대로
    for (const c of ['#263F51', '#322C2A', '#182522', '#92283E', '#FFFFFF', undefined]) {
        const v = cover.visibleAccent(c);
        assert.ok(contrastRatio(luminance(v), luminance('#141414')) >= 3, `${c} → ${v}`);
    }
    assert.equal(cover.visibleAccent('#E8B86D'), '#E8B86D');
    // 3) 제목 정리: 마지막 마침표만 뗀다
    assert.equal(cover.coverHeading('절차의\n갈림길.'), '절차의\n갈림길');
    assert.equal(cover.coverHeading(' 측정 요구, \n적법했을까? '), '측정 요구,\n적법했을까?');

    // 4) 빛 연출: 같은 원고는 같은 연출, 여러 원고에 고르게, 해 질 녘은 일곱 가지 중 하나
    assert.equal(cover.photoLook('abc').id, cover.photoLook('abc').id);
    const counts = {};
    for (let i = 0; i < 1400; i++) { const id = cover.photoLook(`source-${i}`).id; counts[id] = (counts[id] || 0) + 1; }
    assert.equal(Object.keys(counts).length, cover.PHOTO_LOOKS.length);
    for (const [id, n] of Object.entries(counts)) assert.ok(n > 140 && n < 260, `${id} ${n}`);

    // 5) 실제 조판: 밝은 사진·복잡한 사진·어두운 사진 × A·B × 짧은/긴 제목 — 글자 대비·영역·경계
    const S = 2000, scale = S / 1200;
    const arts = {
        bright: await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#F4F1EA' } }).png().toBuffer(),
        busy: await sharp(Buffer.from(Array.from({ length: 256 * 256 * 3 }, (_, i) => ((i * 2654435761) >>> 0) % 256)), { raw: { width: 256, height: 256, channels: 3 } }).resize(1024, 1024, { kernel: 'nearest' }).png().toBuffer(),
        dark: await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#20262A' } }).png().toBuffer(),
    };
    const headings = ['측정 요구,\n적법했을까?', '상속받은 집도\n나눠야 할까?', '결혼 전에 모은 돈과 부모님께 상속받은 아파트까지 이혼할 때 모두 나눠야 하는지'];
    for (const style of ['band', 'fullbleed']) for (const [name, bytes] of Object.entries(arts)) for (const heading of headings) {
        const c = createCanvas(S, S).getContext('2d');
        c.scale(scale, scale);
        const img = await loadImage(await cover.gradeCoverArt(bytes));
        const h = style === 'band' ? cover.BAND_TOP : 1200, k = Math.max(1200 / img.width, h / img.height);
        c.save(); c.beginPath(); c.rect(0, 0, 1200, h); c.clip(); c.drawImage(img, (1200 - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k); c.restore();
        const out = cover.drawThumbnailCover(c, { style, heading, kicker: '이혼 · 재산분할', brand: '법무법인 양영&정훈', accent: '#263F51' });
        const label = `${style}/${name}/${heading.slice(0, 8)}`;
        assert.equal(out.boxes.length, 3, `${label}: 표제·제목·사무소 세 덩어리`);
        for (const b of out.boxes) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 1200 + 0.5 && b.y + b.h <= 1200 + 0.5, `${label}: 경계 안`);
        for (let i = 0; i < out.boxes.length; i++) for (let j = i + 1; j < out.boxes.length; j++) {
            const a = out.boxes[i], b = out.boxes[j];
            assert.ok(!(Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1), `${label}: 글자 덩어리가 겹치지 않는다`);
        }
        if (style === 'band') assert.ok(out.boxes.every(b => b.y >= cover.BAND_TOP), `${label}: A는 글자가 모두 띠 안`);
        else assert.ok(out.contrast >= 4.5, `${label}: B의 흰 제목 대비 ${out.contrast}`);
        if (heading.length < 20) assert.deepEqual(out.issues, [], `${label}: ${out.issues}`);
        else assert.ok(out.issues.length <= 1, `${label}: 긴 제목은 최소 크기로 들어가거나 줄이라고 알린다`);
    }

    // 6) 사진 생성 지시: A는 가로 3:2·글자 자리 불필요, B는 위쪽 42%를 비운다, 빛 연출이 브리프의 빛보다 우선
    const brief = { medium: 'photograph', subject: '현관 앞 열쇠', scene: '늦은 오후 햇살 아래 현관 계단', message: '집의 귀속', avoid: [] };
    const band = editorialPhotoPrompt(brief, 'cover-band', cover.photoLook('s1').text);
    const full = editorialPhotoPrompt(brief, 'cover-fullbleed', cover.photoLook('s1').text);
    assert.match(band, /landscape 3:2/); assert.match(band, /LIGHT AND LOOK \(overrides/);
    assert.match(full, /top 42%/); assert.doesNotMatch(band, /Keep the planned negative space/);
    const generator = fs.readFileSync(path.join(root, 'lib/blog-images/photo-generator.ts'), 'utf8');
    assert.match(generator, /frame === "cover-band" \? "1536x1024"/, 'A는 가로 사진으로 생성');
    const route = fs.readFileSync(path.join(root, 'app/api/admin/blog-images/generate-design/route.ts'), 'utf8');
    assert.match(route, /frame: coverFrame\(thumbnailStyle\(profile\)\), look: photoLook\(plan\.sourceHash\)\.text/);

    // 7) 원고 표지 지시: 조판을 알려 주고, 제목 규칙은 새 규칙, 예전 campaign 지시와 해 질 녘 기본값은 빠진다
    const instruction = coverBriefInstruction('title-band', [], 'band');
    assert.match(instruction, /A형/); assert.match(instruction, /각 행 공백 빼고 9자 이내/);
    assert.doesNotMatch(instruction, /campaign 계열/); assert.match(instruction, /해 질 녘 낮은 햇빛·긴 그림자를 쓰지 않습니다/);
    assert.match(coverBriefInstruction('title-band'), /campaign 계열/, '조판을 주지 않는 옛 호출은 그대로');
    const write = fs.readFileSync(path.join(root, 'app/api/admin/claude-blog-write/route.ts'), 'utf8');
    assert.match(write, /coverBriefInstruction\(coverLayout, recentSubjects, coverStyle\)/);
    console.log('PASS: thumbnail A/B covers — per-lawyer fixed style, white headline ≥4.5:1 on bright/busy/dark art, bounded non-overlapping text, accent lift, per-article light looks, prompt framing and brief rules');
})().catch((e) => { console.error(e); process.exit(1); });
