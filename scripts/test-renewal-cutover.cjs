// Read-only cutover checks. Never authenticate, submit forms, or run customer jobs.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const { load } = require('cheerio');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const origin = process.argv[2] || 'http://localhost:3101';
const out = process.argv[3] || 'C:/클로드/renewal-cutover-qa';
const baseline = '00f3662';
const git = args => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, ...args], { cwd: root, encoding: 'utf8' });
function moduleData(file, revision) {
    const source = revision ? git(['show', `${revision}:${file}`]) : fs.readFileSync(path.join(root, file), 'utf8');
    const sandbox = { exports: {}, require: name => moduleData(path.posix.join(path.posix.dirname(file), name + '.ts'), revision) };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
    return sandbox.exports;
}
const json = value => JSON.parse(JSON.stringify(value));
const report = { protected: [], redirects: [], status: [], articles: [], browser: [] };
let browser;
(async () => {
    fs.mkdirSync(out, { recursive: true });
    const protectedPaths = ['app/admin', 'app/api', 'app/(dashboard)', 'app/(auth)', 'app/diagnose', 'app/portal', 'app/blog', 'app/site', 'app/m', 'app/terms', 'app/refund', 'app/robots.txt', 'app/rss.xml', 'lib', 'middleware.ts', 'app/globals.css', 'package.json', 'package-lock.json', 'public'];
    assert.equal(git(['diff', baseline, '--', ...protectedPaths.filter(p=>p!=='public')]), '', 'Latest production product, admin, API and customer areas unchanged');
    assert.equal(git(['diff', baseline, '--name-only', '--diff-filter=MD', '--', 'public']), '', 'Existing public assets preserved; approved renewal assets may be added');
    report.protected.push(...protectedPaths);
    const approved = moduleData('data/renewal/site.ts', 'a29be9c'), current = moduleData('data/renewal/site.ts');
    for(const key of Object.keys(approved)) if(typeof approved[key] !== 'function' && key !== 'DEMO_BASE') assert.deepEqual(json(current[key]), json(approved[key]), 'Approved data: '+key);
    for(const file of ['data/renewal/upgrade.ts','data/renewal/services.ts','data/renewal/cases.ts']) assert.equal(git(['diff','a29be9c','--',file]), '', 'Approved '+file);
    for(const [input, expected] of [['/','/'],['/#plans','/#plans'],['/#system','/#system'],['/diagnose','/consult'],['/diagnose?plan=growth#form','/consult?plan=growth#form'],['/upgrade','/upgrade'],['/login','/login']]) assert.equal(current.path(input), expected);
    const oldRedirects = await moduleData('next.config.ts', baseline).default.redirects();
    const newRedirects = await moduleData('next.config.ts').default.redirects();
    for(const rule of oldRedirects) assert.ok(newRedirects.some(r=>JSON.stringify(r)===JSON.stringify(rule)), 'Legacy redirect retained '+rule.source);
    report.legacyRedirects = oldRedirects.length;
    const get = (route, options={}) => fetch(origin+route, { headers: {'User-Agent':'ChatGPT-User'}, signal:AbortSignal.timeout(60000), ...options });
    const files=fs.readdirSync(path.join(root,'public/renewal'),{recursive:true}).filter(file=>fs.statSync(path.join(root,'public/renewal',file)).isFile());
    for(const file of files) {const asset='/renewal/'+file.replaceAll('\\','/');const res=await get(asset,{redirect:'manual'});assert.equal(res.status,200,'Static asset '+asset);assert.ok(!res.headers.get('content-type').includes('text/html'));await res.arrayBuffer();}
    report.staticAssets=files.length;
    const og=await get('/og.png');assert.equal(og.status,200);assert.ok(og.headers.get('content-type').includes('image/png'));
    const home = await (await get('/')).text(), $ = load(home);
    assert.equal($('.mt-root').length,1); assert.equal($('h1').length,1);
    assert.ok(!$('.mt-root').text().includes('DEMO ·'));
    assert.ok(!home.includes('SoftwareApplication'));
    const oldLayout = git(['show',baseline+':app/layout.tsx']);
    for(const name of ['google-site-verification','naver-site-verification']) {
        const values=$(`meta[name="${name}"]`).toArray().map(e=>$(e).attr('content'));
        assert.equal(values.length,2); for(const value of values) assert.ok(oldLayout.includes(value));
    }
    report.verifications=4;
    for(const route of ['/','/upgrade','/consult','/about','/lawfirm-marketing','/contact','/work']) {
        const res=await get(route); assert.equal(res.status,200); const s=load(await res.text());
        assert.ok(s('h1').text()); assert.ok(!s('meta[name="robots"],meta[name="googlebot"],meta[name="Yeti"],meta[name="bingbot"]').toArray().some(e=>/noindex/.test(s(e).attr('content')||'')));
        assert.ok(!/noindex/.test(res.headers.get('x-robots-tag')||'')); report.status.push({route,status:res.status});
    }
    const magazine=load(await (await get('/magazine')).text());
    const articles=[...new Set(magazine('main a[href^="/magazine/"]').toArray().map(e=>magazine(e).attr('href')))].slice(0,3);
    assert.equal(articles.length,3);
    for(const route of articles) { const res=await get(route); assert.equal(res.status,200); const s=load(await res.text()); assert.ok(s('h1').text()); assert.equal(decodeURI(s('link[rel=canonical]').attr('href')),decodeURI('https://www.makethis1.com'+route));report.articles.push({route,status:res.status}); }
    for(const [from,to,status] of [['/renewal','/',301],['/renewal/upgrade','/upgrade',301],['/renewal/diagnose?plan=growth','/consult?plan=growth',301],['/renewal/about','/about',301],['/renewal/naver-ads','/naver-ads',301],['/renewal/og.png','/og.png',301],['/renewal/concepts/kinetic','/',301],['/makethisone','/',301],['/makethisone/index.html','/',301],['/insights','/magazine',301],['/services','/lawfirm-marketing',301],['/portfolio','/work',301],['/?mode=login','/login',308],['/member/login','/login',308],['/mypage','/dashboard',308]]) {
        const res=await get(from,{redirect:'manual'}); assert.equal(res.status,status,from);const location=new URL(res.headers.get('location'),origin);const expected=new URL(to,origin);assert.equal(location.pathname,expected.pathname,from);for(const [key,value] of expected.searchParams)assert.equal(location.searchParams.get(key),value);report.redirects.push({from,to:location.pathname+location.search,status});
    }
    const sitemap=await(await get('/sitemap.xml')).text();
    for(const route of ['/upgrade','/consult','/naver-ads','/lawfirm-seo','/geo','/lawfirm-blog','/lawfirm-website','/conversion','/work','/contact']) assert.ok(sitemap.includes('https://www.makethis1.com'+route+'</loc>'), 'sitemap '+route);
    assert.ok(!sitemap.includes('/renewal')&&!sitemap.includes('/makethisone'));
    const duplicate=load(await(await get('/magazine?page=2')).text());assert.ok(duplicate('meta[name=robots]').attr('content').includes('noindex'));assert.equal(duplicate('link[rel=canonical]').attr('href'),'https://www.makethis1.com/magazine');
    const llms=await(await get('/llms.txt')).text();assert.ok(llms.startsWith('# MAKETHIS1')&&llms.includes('월 250만원')&&llms.includes('월 500만원')&&!llms.includes('대표: 김정환'));
    for(const route of ['/admin','/admin/blog-images','/admin/blog-publish','/admin/blog-settings','/login','/diagnose','/portal','/makethisone/subscribe','/makethisone/purchase/success']) {
        const res=await get(route,{redirect:'manual'}); assert.equal(res.status,200,route); const s=load(await res.text());
        // Portal already has its own mt-root design wrapper on production.
        if(route==='/portal') { assert.ok(s('meta[name=robots]').attr('content').includes('noindex')); assert.equal(s('a[href="/upgrade"]').length,0); }
        else assert.equal(s('.mt-root').length,0,'Marketing layout leaked '+route);
        report.status.push({route,status:res.status});
    }
    const unauthorized=await get('/api/admin/auth');assert.equal(unauthorized.status,401);
    const dashboard=await get('/dashboard',{redirect:'manual'});assert.equal(dashboard.status,307);assert.equal(new URL(dashboard.headers.get('location'),origin).pathname,'/login');
    browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
    const c=await browser.newContext();const p=await c.newPage();
    // Prevent any accidental mutations if an existing client component ever changes behavior.
    await p.route('**/api/**', r=>r.request().method()==='GET'?r.continue():r.abort());
    await p.goto(origin+'/admin/blog-images',{waitUntil:'networkidle'});await p.waitForURL('**/admin');assert.equal(await p.locator('.mt-root').count(),0);assert.ok(await p.locator('input[type=password]').isVisible());
    await p.screenshot({path:path.join(out,'admin-login-preserved.png')});report.browser.push('Unauthenticated blog-images returns to existing admin login');
    await p.goto(origin+'/upgrade',{waitUntil:'networkidle'});await p.getByRole('link',{name:'고객 로그인',exact:true}).click();await p.waitForURL('**/login');assert.equal(await p.locator('.mt-root').count(),0);report.browser.push('Marketing → product login has no marketing layout');
    await p.goto(origin+'/portal',{waitUntil:'networkidle'});
    const portalStyle=()=>p.locator('.mt-root').evaluate(e=>({font:getComputedStyle(e).fontFamily,bg:getComputedStyle(e).getPropertyValue('--mt-bg'),accent:getComputedStyle(e).getPropertyValue('--mt-accent')}));
    const portalBefore=await portalStyle();
    await p.addStyleTag({content:fs.readFileSync(path.join(root,'app/renewal/kinetic.css'),'utf8')});
    assert.deepEqual(await portalStyle(),portalBefore,'Retained marketing stylesheet must not recolor portal');
    report.browser.push('Portal palette/font unchanged even when marketing stylesheet is retained');
    await browser.close();fs.writeFileSync(path.join(out,'cutover-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
