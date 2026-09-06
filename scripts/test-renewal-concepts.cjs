/* Read-only browser/HTTP QA. Never submits forms or touches customer data.
   Usage: node scripts/test-renewal-concepts.cjs [origin] [artifact-directory] */
const { chromium } = require('playwright-core');
const { load } = require('cheerio');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const exec = promisify(execFile);
const origin = process.argv[2] || 'http://localhost:3101';
const out = path.resolve(process.argv[3] || '.next/renewal-concept-qa');
const routes = ['/renewal', '/renewal/concepts', ...['editorial', 'cinema', 'blueprint'].map(x => `/renewal/concepts/${x}`)];
const failures = [];
const report = { origin, started: new Date().toISOString(), rawHTML: [], links: [], browsers: [], failures };
const check = (condition, message) => { if (!condition) failures.push(message); };
const curl = async (url, extra = []) => (await exec(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--silent', '--show-error', '--location', '--max-time', '60', ...extra, url], { maxBuffer: 20 * 1024 * 1024 })).stdout;
const bodyCopy = '검색광고, 블로그, SEO, AI 검색, 홈페이지, 상담 분석까지. 메이크디스원의 통합 솔루션으로.';
const heroTitle = '로펌 마케팅에 필요한\u00a0모든\u00a0것.메이크디스원 하나로';
const labels = ['광고 운영', '네이버·Google 검색', 'AI 검색', '법률 콘텐츠', '홈페이지', '상담·수임 분석'];

(async () => {
  await fs.mkdir(out, { recursive: true });
  const targets = new Map();
  for (const route of routes) {
    const html = await curl(origin + route, ['-A', 'ChatGPT-User']);
    const $ = load(html);
    $('script,style').remove();
    const text = $('main').text();
    const canonical = $('link[rel="canonical"]').attr('href');
    const titlePresent = route.endsWith('concepts') || $('h1').text() === heroTitle;
    const bodyPresent = route.endsWith('concepts') || text.includes(bodyCopy);
    const generalNoindex = /noindex/i.test($('meta[name="robots"]').attr('content') || '');
    const result = { route, titlePresent, bodyPresent, canonical, generalNoindex, namedBotPolicy: ['googlebot','Yeti','bingbot'].every(name => $(`meta[name="${name}"]`).attr('content') === 'noindex, nofollow') };
    report.rawHTML.push(result);
    check(titlePresent && bodyPresent, `Raw HTML copy missing: ${route}`);
    check(canonical === `https://www.makethis1.com${route}`, `Canonical mismatch: ${route}`);
    check(!generalNoindex && result.namedBotPolicy, `Indexing policy mismatch: ${route}`);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || /^(mailto:|tel:|javascript:)/.test(href)) return;
      const url = new URL(href, origin + route);
      if (![new URL(origin).origin, 'https://www.makethis1.com'].includes(url.origin)) return;
      url.protocol = new URL(origin).protocol;
      url.host = new URL(origin).host;
      const sources = targets.get(url.href) || [];
      if (!sources.includes(route)) sources.push(route);
      targets.set(url.href, sources);
    });
    await fs.writeFile(path.join(out, `${route.replaceAll('/', '_')}-raw.html`), html);
  }
  for (const [href, sources] of targets) {
    const url = new URL(href);
    const hash = url.hash;
    url.hash = '';
    const status = (await curl(url.href, ['--output', process.platform === 'win32' ? 'NUL' : '/dev/null', '--write-out', '%{http_code}'])).trim();
    let anchorPresent = true;
    if (hash) {
      const $ = load(await curl(url.href));
      anchorPresent = $(`[id="${decodeURIComponent(hash.slice(1))}"]`).length > 0;
    }
    report.links.push({ href, sources, status: Number(status), anchorPresent });
    check(status === '200' && anchorPresent, `Link/anchor failure: ${href}: ${status}, anchor=${anchorPresent}`);
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  for (const width of [1440, 375]) {
    for (const mode of ['normal', 'no-js', 'reduced']) {
      const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 900 }, deviceScaleFactor: 1, javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      if (mode !== 'no-js') await context.addInitScript(() => {
        sessionStorage.setItem('renewalIntroSeen', '1');
        window.__qaCLS = 0;
        window.__qaLCP = [];
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__qaCLS += entry.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__qaLCP.push({ time: entry.startTime, tag: entry.element?.tagName }); }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        // The approved home has native mobile details and viewport reveals.
        // Exercise the ordinary reader's path; do not misreport the hidden
        // desktop duplicate as missing mobile copy, or a scroll hint as content.
        let nativeDetailsOpened = 0;
        if (route === '/renewal' && mode !== 'normal') {
          for (const detail of await page.locator('main details').all()) {
            if (await detail.isVisible() && !(await detail.getAttribute('open'))) {
              await detail.locator('summary').click();
              nativeDetailsOpened++;
            }
          }
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < height; y += 650) {
            await page.evaluate(pos => window.scrollTo(0, pos), y);
            await page.waitForTimeout(80);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(300);
        }
        const before = await page.evaluate(() => {
          const hero = document.querySelector('[data-concept-hero]');
          const main = document.querySelector('main');
          const root = hero || main;
          const visible = el => {
            for (let p = el; p; p = p.parentElement) {
              const style = getComputedStyle(p);
              if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || p.getAttribute('aria-hidden') === 'true') return false;
            }
            return el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
          };
          const textNodes = [...main.querySelectorAll('h1,h2,h3,h4,p,dt,dd,li')];
          const normalize = value => value.replace(/\s+/g, '').replace(/^[·↓]+/, '');
          const visibleText = new Set(textNodes.filter(visible).map(el => normalize(el.textContent)));
          return {
            title: document.querySelector('h1')?.textContent,
            text: root.textContent,
            overflow: document.documentElement.scrollWidth > innerWidth,
            cls: window.__qaCLS ?? null,
            lcp: window.__qaLCP?.at(-1) ?? null,
            sectionHeadings: [...main.querySelectorAll('section h2')].map(el => ({ text: el.textContent, visible: visible(el) })),
            hiddenBodyText: textNodes.filter(el =>
              el.textContent.trim() && !el.closest('[aria-hidden="true"], .mt-shint') && !el.closest('details:not([open])') && !visible(el) && !visibleText.has(normalize(el.textContent))
            ).map(el => el.textContent.trim().slice(0, 160)),
            hiddenHeroContent: hero ? [...hero.querySelectorAll('h1,h2,p,a,dt,dd')].filter(el => !visible(el)).map(el => el.textContent) : [],
          };
        });
        if (mode === 'normal') {
          await page.screenshot({ path: path.join(out, `${route.split('/').filter(Boolean).join('-')}-${width}.png`) });
          await page.screenshot({ path: path.join(out, `${route.split('/').filter(Boolean).join('-')}-${width}-full.png`), fullPage: true });
        }
        const prototype = route.includes('/concepts/');
        if (prototype) {
          check(before.title === heroTitle && before.text.includes(bodyCopy) && labels.every(label => before.text.includes(label)), `Copy mismatch: ${route}/${width}/${mode}`);
          check(before.hiddenHeroContent.length === 0, `Hidden hero content: ${route}/${width}/${mode}`);
          if (mode !== 'no-js') check(before.cls === 0, `Prototype CLS ${before.cls}: ${route}/${width}/${mode}`);
        }
        if (mode !== 'normal') {
          check(before.sectionHeadings.every(h => h.visible), `Hidden section heading: ${route}/${width}/${mode}`);
          check(before.hiddenBodyText.length === 0, `Hidden body text: ${route}/${width}/${mode}: ${before.hiddenBodyText.join(' | ')}`);
        }
        check(!before.overflow && errors.length === 0, `Overflow/runtime errors: ${route}/${width}/${mode}`);
        let keyboard = null;
        let motion = null;
        if (prototype && mode === 'normal') {
          const first = page.locator('[data-concept-hero] a').first();
          await first.focus();
          await page.keyboard.press('Tab');
          keyboard = await page.evaluate(() => ({ href: document.activeElement.getAttribute('href'), outline: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth }));
          check(keyboard.outline !== 'none' && keyboard.outlineWidth !== '0px', `No keyboard focus: ${route}/${width}`);
          await page.evaluate(() => window.scrollTo(0, 280));
          await page.waitForTimeout(100);
          const progressed = await page.locator('[data-concept-hero]').evaluate(el => el.style.getPropertyValue('--travel'));
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForTimeout(100);
          motion = await page.locator('[data-concept-hero]').evaluate(el => ({ inline: el.style.getPropertyValue('--travel'), computed: getComputedStyle(el).getPropertyValue('--travel'), text: el.textContent }));
          check(Number(progressed) > 0 && motion.inline === '' && Number(motion.computed) === 0 && motion.text === before.text, `Live reduced-motion failure: ${route}/${width}`);
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        report.browsers.push({ route, width, mode, status: response.status(), ...before, text: undefined, nativeDetailsOpened, errors, keyboard, motion: motion ? { inline: motion.inline, computed: motion.computed } : null });
        await page.close();
      }
      await context.close();
    }
  }
  await browser.close();
  report.finished = new Date().toISOString();
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ links: report.links.length, homeLinks: report.links.filter(x => x.sources.includes('/renewal')).length, htmlPages: report.rawHTML.length, browserRuns: report.browsers.length, failures, report: path.join(out, 'report.json') }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
})().catch(err => { console.error(err); process.exitCode = 1; });
