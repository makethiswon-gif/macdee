// Local QA only. The inquiry endpoint is intercepted; no customer request is sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { load } = require('cheerio');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const origin = process.argv[2] || 'http://localhost:3101';
const out = process.argv[3] || 'C:/클로드/renewal-upgrade-qa';
const baseline = '1ad63b0';
fs.mkdirSync(out, { recursive: true });
const git = args => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], { cwd: root, encoding: 'utf8' });
function data(file, old = false) {
    const source = old ? git(['show', `${baseline}:${file}`]) : fs.readFileSync(path.join(root, file), 'utf8');
    const sandbox = { exports: {}, require: name => data(path.posix.join(path.posix.dirname(file), name + '.ts'), old) };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
    return JSON.parse(JSON.stringify(sandbox.exports));
}
const report = { facts: [], page: {}, forms: [] };
let browser;
(async () => {
    const old = data('data/renewal/site.ts', true), now = data('data/renewal/site.ts');
    const { STANDARD_OFFER, UPGRADE_SERVICES, UPGRADE_FAQ } = data('data/renewal/upgrade.ts');
    for (const key of ['TEAM', 'FOUNDER', 'COMPANY', 'LAW_FIRM_PARTNERS', 'CORPORATE_CLIENTS', 'PROOF_STATS', 'CHANNEL_LEDGER', 'LEDGER_FOOTNOTE']) {
        assert.deepEqual(now[key], old[key], key); report.facts.push(key + ' unchanged');
    }
    assert.deepEqual(now.PLANS.slice(1), old.PLANS.slice(1), 'Higher tiers entirely unchanged');
    assert.equal(now.PLANS[0].price, '월 250만원');
    assert.equal(STANDARD_OFFER.blogPosts, 20);
    assert.deepEqual(now.PLANS[0].includes, STANDARD_OFFER.includes);
    assert.equal(now.PLANS[0].includes[0], '블로그 월 20회 포스팅');
    assert.equal(now.PLANS[0].priceNote, '광고 매체비 별도');
    assert.equal(now.PLANS[1].includesLabel, 'STANDARD 전체 +');
    report.facts.push('STANDARD 250만원 / 20 posts / shared scope / ad spend separate / higher-tier inheritance');
    const protectedPaths = ['app/layout.tsx', 'app/renewal/flags.ts', 'data/renewal/cases.ts', 'app/api', 'app/admin', 'app/page.tsx', 'app/renewal/magazine', 'package.json', 'package-lock.json'];
    assert.equal(git(['diff', baseline, '--', ...protectedPaths]), '', 'Protected site/API/customer areas unchanged');
    const raw = execFileSync('curl.exe', ['-sS', '--max-time', '60', '-A', 'ChatGPT-User', origin + '/renewal/upgrade'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const $ = load(raw);
    report.page.canonical = $('link[rel=canonical]').attr('href');
    assert.equal(report.page.canonical, 'https://www.makethis1.com/renewal/upgrade');
    assert.equal($('h1').text(), '블로그는 이어가고.마케팅은 넓히고.');
    const faq = $('script[type="application/ld+json"]').toArray().map(e => JSON.parse($(e).text())).flatMap(s => s['@graph'] || [s]).find(s => s['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity.map(f => ({ q: f.name, a: f.acceptedAnswer.text })), UPGRADE_FAQ);
    $('script,style').remove();
    for (const item of UPGRADE_SERVICES) assert.ok($('main').text().includes(item.text), 'SSR ' + item.title);
    report.page.ssrAndFaq = true;
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    for (const width of [1440, 375]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
        const p = await context.newPage(); let requests = 0, payload;
        await p.route('**/api/renewal/diagnose', async r => { requests++; payload = r.request().postDataJSON(); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); });
        await p.goto(origin + '/renewal', { waitUntil: 'networkidle' });
        const card = p.locator('.mt-plan').first();
        assert.ok((await card.textContent()).includes('월 250만원'));
        assert.ok((await card.textContent()).includes('블로그 월 20회 포스팅'));
        await card.scrollIntoViewIfNeeded();
        await p.screenshot({ path: path.join(out, `home-plan-${width}.png`) });
        await p.locator('.mt-upgrade-link').click();
        await p.waitForURL('**/renewal/upgrade');
        assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto', 'Reduced motion disables document smooth scrolling');
        await p.getByRole('link', { name: '포함 업무 보기' }).click();
        await p.waitForURL('**/renewal/upgrade#included');
        assert.ok(await p.locator('#included').evaluate(e => Math.abs(e.getBoundingClientRect().top) < 200), 'Reduced anchor arrives without animation');
        await p.getByRole('link', { name: '전환 상담하기' }).first().focus();
        // A preceding mouse click suppresses :focus-visible by design. Test
        // actual keyboard modality rather than programmatic focus alone.
        await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');
        const focus = await p.getByRole('link', { name: '전환 상담하기' }).first().evaluate(e => e === document.activeElement && getComputedStyle(e).outlineStyle !== 'none');
        assert.ok(focus, 'Visible keyboard focus');
        await p.keyboard.press('Enter');
        await p.waitForURL('**/diagnose?plan=standard#form');
        await p.waitForFunction(() => document.querySelector('#plan')?.value === 'standard');
        assert.ok((await p.locator('#plan option:checked').textContent()).includes('월 250만원'));
        await p.locator('#firmName').fill('QA 모의 로펌'); await p.locator('#contactName').fill('QA'); await p.locator('#phone').fill('000-0000-0000');
        await p.locator('.mt-k-form summary').click();
        await p.locator('#note').fill('기존 운영도 함께 확인해 주세요.');
        await p.getByRole('button', { name: '상담 요청 보내기' }).click();
        await p.getByRole('status').waitFor();
        assert.equal(requests, 1); assert.equal(payload.plan, 'standard');
        assert.ok(payload.note.includes('[선택 상품] STANDARD · 통합 운영 · 월 250만원'));
        assert.ok(payload.note.includes('기존 운영도 함께 확인해 주세요.'));
        report.forms.push({ width, homeToUpgradeToStandard: true, keyboardFocus: focus, selectedPlanAndUserNotePreserved: true, mockedRequests: requests });
        await context.close();
    }
    await browser.close();
    fs.writeFileSync(path.join(out, 'offer-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
