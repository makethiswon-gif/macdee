/* Run against a local production build. No forms/API writes or paid generation. */
const assert = require('node:assert/strict');
const http = require('node:http');
const cheerio = require('cheerio');
const base = new URL(process.argv[2] || 'http://localhost:3114');
if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Local QA only');

async function main() {
    const response = await fetch(base, { headers: { 'User-Agent': 'ChatGPT-User' } });
    assert.equal(response.status, 200);
    const html = await response.text();
    const $ = cheerio.load(html);
    const hero = $('[data-assembly-hero]');
    assert.equal(hero.length, 1);
    assert.equal($('h1').length, 1);
    assert.equal(hero.find('h1').text().replace(/\s+/g, ''), '로펌마케팅에필요한모든것.메이크디스원하나로');
    assert.equal(hero.find('[data-assembly-plane]').length, 6);
    assert.equal(hero.find('[data-service] a').length, 6);
    assert.equal(hero.find('dl dd').length, 3);
    assert.equal($('link[rel=canonical]').attr('href'), 'https://www.makethis1.com');
    assert(!/noindex/i.test($('meta[name=robots]').attr('content') || ''));
    const bodyText = $('body').text().replace(/\s+/g, '');
    for (const text of ['우리가 맡는 일.', '검색부터 상담까지.', '250만원', '500만원', '1,300만원']) assert(bodyText.includes(text.replace(/\s+/g, '')), text);
    const links = [...new Set(hero.find('a[href]').map((_, a) => $(a).attr('href')).get())];
    assert(links.includes('/consult'));
    assert(links.includes('/#plans'));
    for (const href of links) {
        const result = await fetch(new URL(href, base));
        assert.equal(result.status, 200, href);
    }
    for (const route of ['/lawfirm-marketing', '/about', '/upgrade']) {
        const result = await fetch(new URL(route, base));
        assert.equal(result.status, 200, route);
        assert(!(await result.text()).includes('data-assembly-hero'), `${route} must not gain home art`);
    }
    console.log(`PASS: ChatGPT-User SSR, copy, six planes, six static service links, proof, canonical, ${links.length} hero links, 3 non-home routes`);

    if (!process.argv.includes('--no-js-preview')) return;
    const server = http.createServer(async (req, res) => {
        if (req.method !== 'GET' || !req.url?.startsWith('/') || req.url.startsWith('//') || req.url.startsWith('/api/')) { res.writeHead(405); res.end(); return; }
        if (req.url === '/__qa/no-js') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Home — JavaScript disabled sandbox</title><style>html,body{margin:0}iframe{width:100%;height:100vh;border:0;display:block}</style><iframe title="JavaScript disabled homepage" sandbox="allow-same-origin" src="/"></iframe>');
            return;
        }
        try {
            const upstream = await fetch(new URL(req.url, base), { redirect: 'manual' });
            const headers = Object.fromEntries(upstream.headers);
            for (const key of ['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie']) delete headers[key];
            res.writeHead(upstream.status, headers);
            res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch { res.writeHead(502); res.end('Local preview unavailable'); }
    });
    server.listen(3115, '127.0.0.1', () => console.log('No-JS sandbox: http://127.0.0.1:3115/__qa/no-js'));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
