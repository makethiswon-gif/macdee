// Local-only browser and full-archive checks; do not send forms or modify customer data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('cheerio');
const { chromium } = require('playwright-core');
const origin = new URL(process.argv[2] || 'http://localhost:3106').origin;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
assert.equal(process.env.RENEWAL_QA_READ_ONLY, '1', 'Start local Next with RENEWAL_QA_READ_ONLY=1 too');
const output = path.join(process.cwd(), '.next', 'seo-qa');
fs.mkdirSync(output, { recursive: true });

(async () => {
    const archive = load(await (await fetch(origin + '/magazine')).text());
    const archivePages = new Set(['/magazine', ...archive('nav[aria-label="매거진 페이지"] a').toArray().map(a => archive(a).attr('href'))]);
    const articles = new Set();
    for (const route of archivePages) {
        const response = await fetch(origin + route);
        assert.equal(response.status, 200);
        const $ = load(await response.text());
        $('main a[href]').each((_, el) => { const href = $(el).attr('href'); if (/^\/magazine\/[^/?]+$/.test(href)) articles.add(decodeURI(href)); });
    }
    const sitemap = load(await (await fetch(origin + '/sitemap.xml')).text(), { xmlMode: true });
    const expected = sitemap('url loc').toArray().map(el => new URL(sitemap(el).text()).pathname).filter(url => url.startsWith('/magazine/')).map(decodeURI);
    assert.deepEqual([...articles].sort(), [...expected].sort(), 'Every published article must be reachable through archive links');
    const serviceHtml = load(await (await fetch(origin + '/lawfirm-seo')).text());
    const related = serviceHtml('[data-related-insights] a').toArray().map(el => serviceHtml(el).attr('href'));
    assert.ok(related.length > 0, 'Service page must link to relevant published articles');
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const report = { archivePages: archivePages.size, discoverableArticles: articles.size, relatedArticles: related, views: [] };
    try {
        for (const mode of ['normal', 'no-js', 'reduced']) {
            for (const width of [375, 1440]) {
                const context = await browser.newContext({ viewport: { width, height: 1000 }, javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
                await context.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : route.abort());
                const page = await context.newPage();
                const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                for (const route of ['/', '/magazine?page=6', '/lawfirm-seo', related[0]]) {
                    await page.goto(origin + route, { waitUntil: 'networkidle' });
                    await page.evaluate(() => document.fonts.ready);
                    assert.equal(await page.locator('h1').count(), 1);
                    assert.equal(await page.locator('h1').isVisible(), true);
                    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode}/${width}/${route} horizontal overflow`);
                    const target = route === '/' ? page.locator('#plans') : route === '/lawfirm-seo' ? page.locator('[data-related-insights]') : route.startsWith('/magazine?') ? page.getByRole('navigation', { name: '매거진 페이지', exact: true }) : page.locator('.mt-article');
                    await target.scrollIntoViewIfNeeded();
                    if (mode === 'normal') await page.waitForTimeout(700);
                    assert.equal(await target.isVisible(), true);
                    if (mode !== 'normal') {
                        const hidden = await target.evaluate(el => [el, ...el.querySelectorAll('h2,h3,p,a,li')].some(node => getComputedStyle(node).opacity === '0' || getComputedStyle(node).visibility === 'hidden'));
                        assert.equal(hidden, false, `${mode} hidden content ${route}`);
                    }
                    if (mode === 'normal') await page.screenshot({ path: path.join(output, `${route.replace(/[^a-z0-9]/gi, '_') || 'home'}-${width}.png`) });
                    report.views.push({ route, width, mode, overflow: false });
                }
                assert.deepEqual(errors, [], 'No browser runtime errors');
                await context.close();
            }
        }
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ result: 'PASS', ...report }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
