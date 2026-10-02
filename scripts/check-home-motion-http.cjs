/* Local-only read checks. Never submit a form, mutate data or call generation. */
const assert = require('node:assert/strict');
const cheerio = require('cheerio');
const base = new URL(process.argv[2] || 'http://127.0.0.1:3114');
assert(['127.0.0.1','localhost'].includes(base.hostname));
async function main() {
    const response = await fetch(base, {headers:{'User-Agent':'ChatGPT-User'}});
    assert.equal(response.status,200);
    const $ = cheerio.load(await response.text());
    const motion = type => $(`[data-home-motion="${type}"]`);
    assert.equal($('[data-home-motion-root]').length,1);
    for (const type of ['services','journey','plans','closing-assembly','closing-rule']) assert.equal(motion(type).length,1,type);
    for (const type of ['service-story','journey-story','operations-story','case-growth-story','channels-story','team-story']) {
        assert.equal(motion(type).length,1,type);
        assert.equal(motion(type).attr('data-motion-range'),'story',type);
    }
    for (const type of ['plan-sheet','case-document']) assert.equal(motion(type).length,3,type);
    // Magazine is intentionally omitted if the existing database read fails.
    assert.equal(motion('magazine-cover').length,$('[data-clause="INSIGHTS"] a[href^="/magazine/"]').length);
    assert.equal(motion('plan-sheet').find('details[open]').length,3,'All scopes in no-JS HTML');
    assert.equal($('h1').length,1);
    assert.equal($('link[rel=canonical]').attr('href'),'https://www.makethis1.com');
    assert(!/noindex/i.test($('meta[name=robots]').attr('content') || ''));
    const text = $('main').text().replace(/\s+/g,'');
    for(const part of ['우리가 맡는 일.','검색부터 상담까지.','이렇게 운영했습니다.','월 250만원','월 500만원','월 1,300만원부터','사건에 집중하세요.','마케팅은 맡기세요.']) assert(text.includes(part.replace(/\s+/g,'')),part);
    const internal = [...new Set($('a[href]').map((_,el)=>$(el).attr('href')).get().filter(href=>href.startsWith('/')&&!href.startsWith('//')))];
    const targets = [...new Set(internal.map(href=>{const u=new URL(href,base);u.hash='';return u.href;}))];
    const queue = [...targets];
    await Promise.all(Array.from({length:4},async()=>{while(queue.length){const url=queue.pop();const r=await fetch(url);assert.equal(r.status,200,new URL(url).pathname);}}));
    for(const route of ['/work','about','/upgrade','/lawfirm-marketing','/admin']) {
        const r = await fetch(new URL(route,base));
        assert.equal(r.status,200,route);
        const other = await r.text();
        assert(!other.includes('data-home-motion-root'),`${route}: home controller leaked`);
        assert(!other.includes('data-home-motion="case-document"'),`${route}: home case motion leaked`);
    }
    console.log(`PASS: six graphic stories plus prior effects, SSR copy/prices/expanded scopes, canonical, ${targets.length} internal destinations HTTP 200, 5 non-home routes isolated`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
