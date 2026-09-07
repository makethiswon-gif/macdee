// Read-only branding regression checks. No login, form submission, or customer jobs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('cheerio');
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const origin = process.argv[2] || 'http://localhost:3103';
const out = process.argv[3] || path.join(process.cwd(), '.next', 'logo-qa');
const asset = '/brand/makethis1-white-v1.png';
// Vercel appends its deployment ID (?dpl=...) to public image URLs.
const logoSelector = `img[src^="${asset}"]`;
const report = { pages: [], viewports: [], accessibility: [], protected: [] };
let browser;

(async () => {
    fs.mkdirSync(out, { recursive: true });
    const get = route => fetch(origin + route, {
        headers: { 'User-Agent': 'ChatGPT-User' }, signal: AbortSignal.timeout(60000),
    });
    const imageResponse = await get(asset);
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get('content-type'), /image\/png/);
    const image = Buffer.from(await imageResponse.arrayBuffer());
    assert.deepEqual(image, fs.readFileSync(path.join(process.cwd(), 'public', asset)));
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width, 768);
    assert.equal(metadata.height, 396);
    assert.equal(metadata.hasAlpha, true);
    report.asset = { bytes: image.length, width: metadata.width, height: metadata.height, transparent: true };

    for (const route of ['/', '/upgrade', '/about', '/work', '/contact', '/consult', '/lawfirm-marketing', '/naver-ads', '/lawfirm-seo', '/geo', '/lawfirm-blog', '/lawfirm-website', '/conversion', '/magazine']) {
        const res = await get(route);
        assert.equal(res.status, 200, route);
        const $ = load(await res.text());
        for (const location of ['header', 'footer']) {
            const logo = $(`[data-marketing] > ${location} ${logoSelector}`);
            assert.equal(logo.length, 1, `${route} ${location}`);
            assert.equal(new URL(logo.attr('src'), origin).pathname, asset);
            assert.equal(logo.attr('width'), '768');
            assert.equal(logo.attr('height'), '396');
            assert.equal(logo.attr('alt'), '메이크디스원 MAKETHIS1');
            assert.equal(logo.closest('a').attr('href'), '/');
        }
        assert.ok($('h1').text(), `SSR heading ${route}`);
        report.pages.push(route);
    }
    const og = await get('/og.png');
    assert.equal(og.status, 200);
    const ogBytes = Buffer.from(await og.arrayBuffer());
    const ogMetadata = await sharp(ogBytes).metadata();
    assert.equal(ogMetadata.width, 1200);
    assert.equal(ogMetadata.height, 630);
    fs.writeFileSync(path.join(out, 'share-preview.png'), ogBytes);
    report.og = { width: ogMetadata.width, height: ogMetadata.height };

    browser = await chromium.launch({
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    });
    const context = await browser.newContext();
    await context.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [375, 640, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(origin, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const logo = page.locator('header ' + logoSelector);
        await logo.evaluate(img => img.decode());
        const bounds = await logo.boundingBox();
        const header = await page.locator('[data-marketing] > header').boundingBox();
        assert.ok(bounds.height > 40 && bounds.height < header.height - 8);
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
        assert.ok(Math.abs(bounds.width / bounds.height - 768 / 396) < 0.01);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (width >= 1024) {
            const nav = await page.locator('header nav').boundingBox();
            assert.ok(bounds.x + bounds.width < nav.x, 'Logo must not overlap desktop navigation');
        } else {
            await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
            assert.ok(await page.locator('#mobile-nav').isVisible());
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#mobile-nav').count(), 0);
            assert.ok(await page.getByRole('button', { name: '메뉴 열기', exact: true }).evaluate(el => el === document.activeElement));
        }
        if (width === 375 || width === 1440) {
            await page.screenshot({ path: path.join(out, `home-${width}.png`) });
            await page.locator('[data-marketing] > footer').scrollIntoViewIfNeeded();
            await page.locator('footer ' + logoSelector).evaluate(img => img.decode());
            await page.evaluate(() => {
                const footer = document.querySelector('[data-marketing] > footer');
                const header = document.querySelector('[data-marketing] > header');
                scrollTo({ top: footer.getBoundingClientRect().top + scrollY - header.getBoundingClientRect().height, behavior: 'instant' });
            });
            await page.screenshot({ path: path.join(out, `footer-${width}.png`) });
        }
        report.viewports.push({ width, logoWidth: bounds.width, logoHeight: bounds.height, horizontalOverflow: false });
    }
    await page.goto(origin + '/upgrade', { waitUntil: 'networkidle' });
    await page.locator('header').getByRole('link', { name: 'MAKETHIS1 홈', exact: true }).click();
    await page.waitForURL(origin + '/');
    report.accessibility.push('Logo home link, mobile menu, Escape and restored keyboard focus');

    for (const options of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
        const c = await browser.newContext({ viewport: { width: 375, height: 900 }, ...options });
        await c.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : route.abort());
        const p = await c.newPage();
        await p.goto(origin, { waitUntil: 'networkidle' });
        assert.ok(await p.locator('h1').isVisible());
        assert.ok(await p.locator('header ' + logoSelector).isVisible());
        await p.locator('footer').scrollIntoViewIfNeeded();
        assert.ok(await p.locator('footer ' + logoSelector).isVisible());
        report.accessibility.push(options.javaScriptEnabled === false ? 'No-JS logos and heading visible' : 'Reduced-motion logos and heading visible');
        await c.close();
    }
    for (const route of ['/admin', '/login', '/portal']) {
        const res = await get(route);
        assert.equal(res.status, 200);
        assert.equal(load(await res.text())(logoSelector).length, 0, 'No marketing logo in ' + route);
        report.protected.push(route);
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    await browser.close();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
