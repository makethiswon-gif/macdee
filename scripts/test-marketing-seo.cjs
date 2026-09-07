// HTTP-only SEO checks against server-rendered HTML. Never authenticates or submits data.
// Start local Next with RENEWAL_QA_READ_ONLY=1, then run with the same variable:
//   node scripts/test-marketing-seo.cjs http://localhost:3106
// Public audits never request article pages because the production renderer records views:
//   node scripts/test-marketing-seo.cjs https://www.makethis1.com --audit
const { load } = require('cheerio');

const origin = new URL(process.argv[2] || 'http://localhost:3106').origin;
const audit = process.argv.includes('--audit');
const canonicalOrigin = 'https://www.makethis1.com';
const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
const canCheckArticles = local && process.env.RENEWAL_QA_READ_ONLY === '1';
const routes = ['/', '/about', '/magazine', '/lawfirm-marketing', '/naver-ads', '/lawfirm-seo', '/geo', '/lawfirm-blog', '/lawfirm-website', '/conversion', '/work', '/contact', '/consult', '/upgrade'];
const report = { origin, mode: audit ? 'audit' : 'assert', pages: [], sitemap: {}, pagination: {}, articles: [], failures: [] };

function check(condition, description) {
    if (!condition) report.failures.push(description);
}

function normalizedUrl(value) {
    try {
        const url = new URL(value, canonicalOrigin);
        return decodeURI(url.href).replace(/\/$/, '');
    } catch {
        return value;
    }
}

async function get(route) {
    const response = await fetch(new URL(route, origin), {
        redirect: 'manual',
        headers: { 'User-Agent': 'Googlebot', 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(45000),
    });
    return { response, body: await response.text() };
}

function articleLinks($) {
    return [...new Set($('main a[href]').toArray().map(element => $(element).attr('href')).filter(href => {
        const url = new URL(href, origin);
        return url.origin === origin && /^\/magazine\/[^/]+$/.test(url.pathname);
    }).map(href => new URL(href, origin).pathname))];
}

function applicableRobotsRules(body, agent) {
    const groups = [];
    let group = { agents: [], rules: [] };
    for (const raw of body.split(/\r?\n/)) {
        const line = raw.replace(/#.*$/, '').trim();
        const match = line.match(/^user-agent:\s*(.+)$/i);
        if (match) {
            if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
            group.agents.push(match[1].toLowerCase());
        } else if (/^(allow|disallow):/i.test(line)) group.rules.push(line);
    }
    if (group.agents.length) groups.push(group);
    const specific = groups.filter(value => value.agents.includes(agent.toLowerCase()));
    return (specific.length ? specific : groups.filter(value => value.agents.includes('*'))).flatMap(value => value.rules);
}

function inspectHtml(route, result, expectedCanonical = canonicalOrigin + route) {
    const { response, body } = result;
    const $ = load(body);
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const directives = $('meta[name="robots"], meta[name="googlebot"]').toArray().map(element => $(element).attr('content') || '');
    const headerRobots = response.headers.get('x-robots-tag') || '';
    const h1 = $('h1').text().replace(/\s+/g, ' ').trim();
    const content = $('main').clone();
    content.find('script, style, noscript').remove();
    const textLength = content.text().replace(/\s+/g, ' ').trim().length;
    const jsonLdTypes = [];
    $('script[type="application/ld+json"]').each((index, element) => {
        try {
            const data = JSON.parse($(element).html() || '');
            const nodes = Array.isArray(data) ? data : [data, ...(data['@graph'] || [])];
            jsonLdTypes.push(...nodes.map(node => node['@type']).filter(Boolean).flat());
        } catch {
            check(false, `${route}: invalid JSON-LD block ${index + 1}`);
        }
    });
    check(response.status === 200, `${route}: expected HTTP 200, got ${response.status}`);
    check(title.length > 0, `${route}: title absent from original HTML`);
    check(description.length > 0, `${route}: description absent`);
    check($('link[rel="canonical"]').length === 1, `${route}: expected one canonical`);
    check(normalizedUrl(canonical) === normalizedUrl(expectedCanonical), `${route}: canonical is ${canonical}, expected ${expectedCanonical}`);
    check(![...directives, headerRobots].some(value => /\bnoindex\b|\bnone\b/i.test(value)), `${route}: blocked from Google indexing`);
    check($('h1').length === 1 && h1.length > 0, `${route}: expected one nonempty H1 in original HTML`);
    check(textLength > 100, `${route}: insufficient original HTML main content (${textLength} characters)`);
    const details = { route, status: response.status, title, description, canonical, robots: directives, headerRobots, h1, htmlTextLength: textLength, jsonLdTypes };
    report.pages.push(details);
    return $;
}

async function main() {
    const results = new Map();
    // Small batches avoid flooding the local dev compiler or the public origin.
    for (let offset = 0; offset < routes.length; offset += 3) {
        await Promise.all(routes.slice(offset, offset + 3).map(async route => {
            try { results.set(route, await get(route)); }
            catch (error) { check(false, `${route}: ${error.message}`); }
        }));
    }
    for (const route of routes) if (results.has(route)) inspectHtml(route, results.get(route));
    const home = results.has('/') ? load(results.get('/').body) : null;
    if (home) {
        check(home('title').text().includes('법무법인 마케팅'), 'Home title must target 법무법인 마케팅');
        check(home('main').text().includes('법무법인 마케팅'), 'Home original visible content must describe 법무법인 마케팅');
        report.verificationTags = {
            google: home('meta[name="google-site-verification"]').length,
            naver: home('meta[name="naver-site-verification"]').length,
        };
        check(report.verificationTags.google === 2 && report.verificationTags.naver === 2, 'Existing four search-engine verification tags must remain');
    }

    const robots = await get('/robots.txt');
    check(robots.response.status === 200, 'robots.txt must return 200');
    check(robots.body.includes(`${canonicalOrigin}/sitemap.xml`), 'robots.txt must advertise canonical sitemap');
    const googleRules = applicableRobotsRules(robots.body, 'Googlebot');
    check(!googleRules.some(rule => /^disallow:\s*\/\s*$/i.test(rule)), 'robots.txt must not disallow the whole public site');
    report.robots = { status: robots.response.status, googleRules };

    const sitemap = await get('/sitemap.xml');
    const xml = load(sitemap.body, { xmlMode: true });
    const urls = xml('url > loc').toArray().map(element => xml(element).text());
    const normalized = new Set(urls.map(normalizedUrl));
    check(sitemap.response.status === 200 && xml('urlset').length === 1, 'Sitemap must be a valid HTTP 200 urlset');
    check(normalized.size === urls.length, 'Sitemap must not contain duplicate URLs');
    for (const route of routes) check(normalized.has(normalizedUrl(canonicalOrigin + route)), `Sitemap missing ${route}`);
    const forbidden = urls.filter(value => /^\/(?:renewal|admin|portal|dashboard|api)(?:\/|$)/.test(new URL(value).pathname));
    check(forbidden.length === 0, 'Sitemap exposes demo/private routes');
    check(urls.every(value => new URL(value).origin === canonicalOrigin), 'Sitemap must only contain canonical production origin');
    const magazineUrls = urls.filter(value => new URL(value).pathname.startsWith('/magazine/'));
    check(magazineUrls.length > 0, 'Sitemap should include published magazine articles');
    report.sitemap = { status: sitemap.response.status, totalUrls: urls.length, magazineArticles: magazineUrls.length, forbidden };

    const page1 = results.has('/magazine') ? load(results.get('/magazine').body) : null;
    if (page1) {
        const firstLinks = articleLinks(page1);
        const firstPageUrls = new Set(firstLinks.map(href => normalizedUrl(canonicalOrigin + href)));
        const beyondFirstPage = magazineUrls.filter(value => !firstPageUrls.has(normalizedUrl(value)));
        report.sitemap.articlesBeyondFirstPage = beyondFirstPage.length;
        report.sitemap.olderArticleSample = beyondFirstPage.slice(-3);
        const page2Href = page1('a[href]').toArray().map(element => page1(element).attr('href')).find(href => {
            const url = new URL(href, origin);
            return url.origin === origin && url.pathname === '/magazine' && url.searchParams.get('page') === '2' && !url.searchParams.has('category');
        });
        check(firstLinks.length > 0, 'Magazine must expose article hrefs in original HTML');
        const hasMore = magazineUrls.length > firstLinks.length;
        if (hasMore) {
            check(Boolean(page2Href), 'Magazine page 1 must expose a crawlable page 2 link');
            const page2 = inspectHtml('/magazine?page=2', await get('/magazine?page=2'));
            const secondLinks = articleLinks(page2);
            const olderLinks = secondLinks.filter(href => !firstLinks.includes(href));
            check(olderLinks.length > 0, 'Magazine page 2 must expose older articles, not repeat page 1');
            check(page1('title').text() !== page2('title').text(), 'Paginated magazine title must identify page 2');
            for (const href of [...firstLinks, ...secondLinks]) check(normalized.has(normalizedUrl(canonicalOrigin + href)), `Magazine article missing from sitemap: ${href}`);
            report.pagination = { firstPageArticles: firstLinks.length, page2Href: page2Href || null, secondPageArticles: secondLinks.length, olderArticles: olderLinks.length };
            if (canCheckArticles) {
                for (const href of [firstLinks[0], olderLinks[0]].filter(Boolean)) {
                    const article = inspectHtml(href, await get(href));
                    check(article('.mt-article').text().trim().length > 100, `${href}: missing server-rendered article body`);
                    check(article('a[href="/lawfirm-marketing"]').length > 0, `${href}: missing service hub link`);
                    check(report.pages.at(-1).jsonLdTypes.includes('Article'), `${href}: missing Article structured data`);
                    report.articles.push(href);
                }
            }
        } else report.pagination = { firstPageArticles: firstLinks.length, allArticlesOnFirstPage: true };
    }
    if (!canCheckArticles) report.articleCheckSkipped = 'Article GET can record views. Run a local server and this command with RENEWAL_QA_READ_ONLY=1 to include article checks.';
    report.result = report.failures.length ? (audit ? 'BASELINE_FINDINGS' : 'FAIL') : 'PASS';
    console.log(JSON.stringify(report, null, 2));
    if (!audit && report.failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
