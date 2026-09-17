// One free production render from a preserved plan. Never plans, generates portraits or writes posts.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict'), crypto = require('node:crypto'), sharp = require('sharp');
process.chdir(path.resolve(__dirname, '..'));
const origin = new URL(process.argv[2]), id = 'mse8rx0bkl9f0';
assert.ok(origin.protocol === 'https:' && (/^macdee-[a-z0-9]+-incbccc-7155s-projects\.vercel\.app$/.test(origin.hostname) || origin.hostname === 'www.makethis1.com'));
const live = origin.hostname === 'www.makethis1.com', label = live ? 'live' : 'candidate';
const out = 'tmp/studio-only-second'; fs.mkdirSync(out, { recursive: true });
const cookie = fs.readFileSync('.vercel/editorial-auth-response.headers', 'utf8').match(/set-cookie:\s*admin_token=([^;\r\n]+)/i)[1];
const cli = 'C:/Users/incbc/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js';
async function call(endpoint, body) {
    if (live) {
        const r = await fetch(new URL(endpoint, origin), { method: body ? 'POST' : 'GET', headers: { Cookie: `admin_token=${cookie}`, Origin: origin.origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90000) });
        return { status: r.status, data: await r.json() };
    }
    const r = cp.spawnSync(process.execPath, [cli, 'curl', endpoint, '--deployment', origin.href, '--scope', 'incbccc-7155s-projects', '--', '--silent', '--max-time', '90', '--header', `Cookie: admin_token=${cookie}`, '--header', `Origin: ${origin.origin}`, '--header', 'Content-Type: application/json', '--write-out', '\n%{http_code}', ...(body ? ['--request', 'POST', '--data-raw', JSON.stringify(body)] : [])], { encoding: 'utf8', timeout: 100000, maxBuffer: 10 * 1024 * 1024, windowsHide: true });
    assert.equal(r.status, 0, 'Protected request must complete');
    const raw = r.stdout.trimEnd(), end = raw.lastIndexOf('\n');
    return { status: Number(raw.slice(end + 1)), data: JSON.parse(raw.slice(0, end)) };
}
(async () => {
    const sample = JSON.parse(fs.readFileSync(`.vercel/art-direction-production/${id}/sample.json`));
    const plan = JSON.parse(fs.readFileSync(`.vercel/art-direction-production/${id}/plan-result.json`)).plan;
    const before = await call(`/api/admin/blog-posts?profile_id=${id}&full=1`); assert.equal(before.status, 200);
    const libraryResponse = await call(`/api/admin/lawyer-studio?profileId=${id}`); assert.equal(libraryResponse.status, 200);
    const library = libraryResponse.data.library;
    const response = await call('/api/admin/blog-images/generate-design', { ...sample, plan, cardType: 'info', renderOnly: true, transport: 'asset' });
    assert.equal(response.status, 200, response.data.error);
    const card = response.data.card;
    assert.equal(card.layoutRevision, 23); assert.equal(card.width, 2000); assert.equal(card.height, 2000);
    assert.equal(card.photoChecks.source, 'studio'); assert.equal(card.studioPhotos.length, 1);
    assert.ok(card.layoutChecks.passed && card.releaseToken && card.aiGenerated && library.blogEnabled);
    const chosen = card.studioPhotos[0];
    assert.ok(library.assets.some(a => a.id === chosen.assetId && a.version === chosen.version && a.status === 'approved' && a.renderedPath.startsWith(`lawyer-studio/${id}/renders/`)));
    const pixels = await fetch(card.imageUrl, { signal: AbortSignal.timeout(30000) }); assert.equal(pixels.status, 200);
    const bytes = Buffer.from(await pixels.arrayBuffer()), meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 2000); assert.equal(meta.height, 2000);
    fs.writeFileSync(`${out}/${label}.png`, bytes);
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    if (live) assert.equal(hash, crypto.createHash('sha256').update(fs.readFileSync(`${out}/candidate.png`)).digest('hex'), 'Live pixels equal the verified candidate');
    const after = await call(`/api/admin/blog-posts?profile_id=${id}&full=1`); assert.equal(after.status, 200);
    assert.deepEqual(after.data, before.data, 'No manuscript or post changes');
    fs.writeFileSync(`${out}/${label}.json`, JSON.stringify({ profileId: id, productionId: card.productionId, studioPhotos: card.studioPhotos, layoutRevision: card.layoutRevision, photoChecks: card.photoChecks, hash }, null, 2));
    console.log(`PASS ${label}: approved owned studio finish, revision 23, 2000x2000, no model calls or post writes.`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
