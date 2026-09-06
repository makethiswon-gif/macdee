/* Read-only round-two QA: production HTML, geometry, actual animation, keyboard.
   No form submissions, customer writes, or external credentials.
   node scripts/test-renewal-motion-studies.cjs [origin] [output-directory] */
const { chromium } = require('playwright-core');
const { load } = require('cheerio');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const exec = promisify(execFile);
const origin = process.argv[2] || 'http://localhost:3101';
const out = path.resolve(process.argv[3] || '.next/renewal-motion-qa');
const slugs = ['kinetic', 'orbit', 'aperture'];
const title = '로펌 마케팅에 필요한\u00a0모든\u00a0것.메이크디스원 하나로';
const body = '검색광고, 블로그, SEO, AI 검색, 홈페이지, 상담 분석까지. 메이크디스원의 통합 솔루션으로.';
const failures = [];
const report = { origin, started: new Date().toISOString(), rawHTML: [], links: [], runs: [], failures };
const check = (ok, message) => { if (!ok) { failures.push(message); console.log('FAIL ' + message); } };
const curl = async (url, extra = []) => (await exec('curl.exe', ['--silent', '--show-error', '--max-time', '60', ...extra, url], { maxBuffer: 20 * 1024 * 1024 })).stdout;
const snapshot = page => page.evaluate(() => [...document.querySelectorAll('[data-motion-part]')].map(el => {
  const s = getComputedStyle(el);
  return { id: el.dataset.motionPart, transform: s.transform, opacity: s.opacity, dash: s.strokeDashoffset, childrenDash: el.querySelector('ellipse:last-child') ? getComputedStyle(el.querySelector('ellipse:last-child')).strokeDashoffset : null, play: s.animationPlayState };
}));
const changed = (a,b) => a.some((x,i) => JSON.stringify(x) !== JSON.stringify(b[i]));
const rects = page => page.evaluate(() => [...document.querySelectorAll('[data-locked-title],[data-locked-body],[data-locked-actions]')].map(el => {
  const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
}));
const state = page => page.locator('[data-bold-hero]').getAttribute('data-motion-state');
async function pixelChange(a,b) {
  const x = await sharp(a).ensureAlpha().raw().toBuffer();
  const y = await sharp(b).ensureAlpha().raw().toBuffer();
  let count = 0;
  for (let i=0;i<x.length;i+=4) if (Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]) > 20) count++;
  return count;
}
(async () => {
  await fs.mkdir(out, { recursive: true });
  const urls = new Set();
  for (const slug of slugs) {
    const route = '/renewal/concepts/' + slug;
    const html = await curl(origin + route, ['-A','ChatGPT-User']);
    const $ = load(html);
    const result = { route, title: $('h1').text() === title, body: $('[data-locked-body]').text() === body, canonical: $('link[rel=canonical]').attr('href'), generalNoindex: /noindex/.test($('meta[name=robots]').attr('content') || ''), namedBotPolicy: ['googlebot','Yeti','bingbot'].every(name => $(`meta[name="${name}"]`).attr('content') === 'noindex, nofollow') };
    check(result.title && result.body && result.canonical === 'https://www.makethis1.com' + route && !result.generalNoindex && result.namedBotPolicy, 'SSR/canonical/index policy: ' + slug);
    $('a[href]').each((_,el) => { const href=$(el).attr('href'); if (href.startsWith('/')) urls.add(href.split('#')[0]); });
    report.rawHTML.push(result);
    await fs.writeFile(path.join(out, slug+'-raw.html'), html);
  }
  for (const url of urls) {
    const status = (await curl(origin+url, ['--output','NUL','--write-out','%{http_code}'])).trim();
    report.links.push({ url, status }); check(status === '200','HTTP '+status+': '+url);
  }
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  for (const width of (process.env.STUDY_WIDTH?[Number(process.env.STUDY_WIDTH)]:[1440,375])) for (const mode of (process.env.STUDY_MODE?[process.env.STUDY_MODE]:['normal','no-js','reduced'])) for (const slug of (process.env.STUDY_SLUG?[process.env.STUDY_SLUG]:slugs)) {
    const context = await browser.newContext({ viewport: { width, height: width===1440?1000:900 }, deviceScaleFactor: 1, javaScriptEnabled: mode!=='no-js', reducedMotion: mode==='reduced'?'reduce':'no-preference' });
    if (mode!=='no-js') await context.addInitScript(() => {
      window.__cls=0; window.__lcp=[]; window.__shifts=[];
      new PerformanceObserver(list=>{ for(const e of list.getEntries()) if(!e.hadRecentInput) {window.__cls+=e.value;window.__shifts.push({value:e.value,sources:e.sources.map(s=>({text:s.node?.textContent?.slice(0,100),html:s.node?.outerHTML?.slice(0,200),from:s.previousRect,to:s.currentRect}))});} }).observe({ type:'layout-shift',buffered:true });
      new PerformanceObserver(list=>{ for(const e of list.getEntries()) window.__lcp.push({time:e.startTime,tag:e.element?.tagName,className:e.element?.className,animated:!!e.element?.closest('[data-motion-part]')}); }).observe({type:'largest-contentful-paint',buffered:true});
    });
    const page = await context.newPage();
    const errors=[]; page.on('pageerror',err=>errors.push(err.message));
    const response=await page.goto(origin+'/renewal/concepts/'+slug,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(mode==='normal'?8000:300);
    const label=slug+'/'+width+'/'+mode;
    const info=await page.evaluate(()=>{
      const h=document.querySelector('[data-bold-hero]');
      const visible=el=>{for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)return false;}const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
      return { title:document.querySelector('h1').textContent,body:document.querySelector('[data-locked-body]').textContent,cls:window.__cls??null,lcp:window.__lcp?.at(-1)??null,overflow:document.documentElement.scrollWidth>innerWidth,hidden:[...h.querySelectorAll('h1,h2,p,a,dt,dd')].filter(el=>!visible(el)).map(el=>el.textContent),links:[...h.querySelectorAll('[data-service] a')].map(el=>({text:el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),state:h.dataset.motionState,animations:h.getAnimations({subtree:true}).map(a=>a.playState),button:document.querySelector('[data-motion-control] button').textContent };
    });
    check(response.status()===200 && info.title===title && info.body===body && info.links.length===6,'Response/copy: '+label);
    check(!info.overflow && info.hidden.length===0 && errors.length===0,'Layout/visibility/runtime: '+label+' '+JSON.stringify(info.hidden));
    check(info.links.every(l=>l.height>=44),'Service touch targets: '+label);
    if(mode!=='no-js') check(info.cls===0,'CLS '+info.cls+': '+label);
    if(mode==='normal') check(info.lcp && !info.lcp.animated,'Missing/static LCP failure: '+label);
    if(mode!=='normal') check(!info.animations.includes('running'),'Animation in static mode: '+label);
    const shot=path.join(out,`${slug}-${width}-${mode}.png`);
    await page.screenshot({path:shot});
    if(mode==='normal') await page.screenshot({path:path.join(out,`${slug}-${width}-full.png`),fullPage:true});
    let motion=null;
    if(mode==='normal') {
      const originalRects=await rects(page);
      const first=await snapshot(page); await page.waitForTimeout(450); const second=await snapshot(page);
      check(changed(first,second),'No actual animation: '+label);
      const runningShot=await page.screenshot(); await page.waitForTimeout(500); const nextShot=await page.screenshot();
      const changedPixels=await pixelChange(runningShot,nextShot);
      check(changedPixels>100,'No visible motion pixels: '+label);
      const button=page.locator('[data-motion-control] button');
      await button.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
      const paused1=await snapshot(page); await page.waitForTimeout(450); const paused2=await snapshot(page);
      check(await state(page)==='paused'&&!changed(paused1,paused2),'Pause not persistent after blur: '+label);
      // Keep pointer outside service labels: their intentional focus emphasis
      // changes opacity, but must not change the paused motion transforms.
      await page.mouse.move(5,450); await page.evaluate(()=>scrollTo(0,180)); await page.waitForTimeout(150);
      check(!changed(paused2,await snapshot(page)),'Pointer/scroll moved paused art: '+label);
      await page.evaluate(()=>scrollTo(0,0)); await button.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
      const resume1=await snapshot(page); await page.waitForTimeout(450); const resume2=await snapshot(page);
      check(await state(page)==='running'&&changed(resume1,resume2),'Resume: '+label);
      await page.evaluate(()=>scrollTo(0,260)); await page.mouse.move(width*.8,450); await page.waitForTimeout(150);
      const progress=await page.locator('[data-bold-hero]').evaluate(el=>el.style.getPropertyValue('--progress'));
      check(Number(progress)>0,'No scroll response: '+label);
      check(JSON.stringify(originalRects)===JSON.stringify(await rects(page)),'Information geometry moves: '+label);
      await page.evaluate(()=>scrollTo(0,document.querySelector('[data-motion-viewport]').getBoundingClientRect().bottom+scrollY+20)); await page.waitForTimeout(150);
      const suspended=await state(page); const off1=await snapshot(page); await page.waitForTimeout(250); const off2=await snapshot(page);
      check(suspended==='suspended'&&!changed(off1,off2),'Offscreen pause: '+label);
      await page.evaluate(()=>scrollTo(0,0)); await page.waitForTimeout(150);
      check(await state(page)==='running','Offscreen resume: '+label);
      // Simulates visibilitychange handler; not claimed as a native OS tab test.
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      check(await state(page)==='suspended','Visibility handler pause: '+label);
      await page.waitForTimeout(100); // allow the CSS pause to reach the compositor
      const hidden1=await snapshot(page); await page.waitForTimeout(250); const hidden2=await snapshot(page);
      check(!changed(hidden1,hidden2),'Hidden handler failed to freeze frames: '+label);
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(100);
      const directReduce1=await snapshot(page); await page.waitForTimeout(300); const directReduce2=await snapshot(page);
      check(await state(page)==='reduced'&&!changed(directReduce1,directReduce2),'Running to reduced motion: '+label);
      await page.emulateMedia({reducedMotion:'no-preference'}); await page.waitForTimeout(100);
      check(await state(page)==='running','Reduced motion to running: '+label);
      await button.focus(); await page.keyboard.press('Enter');
      await page.emulateMedia({reducedMotion:'reduce'}); await page.waitForTimeout(100);
      const reduce1=await snapshot(page); await page.waitForTimeout(300); const reduce2=await snapshot(page);
      check(await state(page)==='reduced'&&!changed(reduce1,reduce2),'Live reduced motion: '+label);
      await page.emulateMedia({reducedMotion:'no-preference'}); await page.waitForTimeout(100);
      check(await state(page)==='paused','Reduced motion lost manual pause: '+label);
      await page.locator('[data-locked-actions] a').first().focus(); await page.keyboard.press('Tab');
      const keyboard=await page.evaluate(()=>({outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));
      check(keyboard.outline!=='none'&&keyboard.width!=='0px','Keyboard focus: '+label);
      const clsEnd=await page.evaluate(()=>window.__cls);
      check(clsEnd===0,'Interactive CLS '+clsEnd+': '+label);
      if(clsEnd!==0) console.log(JSON.stringify(await page.evaluate(()=>window.__shifts)));
      motion={actualAnimation:true,changedPixels,pause:!changed(paused1,paused2),progress,suspended,liveReduced:!changed(reduce1,reduce2),keyboard,clsEnd,visibilityTest:'simulated document.hidden + visibilitychange'};
      if(slug==='orbit') {
        await page.locator('[data-service="03"] a').focus();
        const wires=await page.locator('[data-wire]').evaluateAll(els=>els.map(el=>({wire:el.dataset.wire,opacity:getComputedStyle(el).opacity})));
        check(wires.every(w=>w.opacity===(w.wire==='03'?'1':'0.12')),'Keyboard ring focus: '+label);
        motion.wires=wires;
      }
    }
    report.runs.push({slug,width,mode,status:response.status(),...info,errors,motion});
    console.log('Checked '+label);
    await context.close();
  }
  await browser.close(); report.finished=new Date().toISOString();
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({runs:report.runs.length,links:report.links.length,failures,report:path.join(out,'report.json')},null,2));
  process.exitCode=failures.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
