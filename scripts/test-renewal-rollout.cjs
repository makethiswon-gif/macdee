/* Read-only full rollout QA. Form API is intercepted; no inquiry is transmitted. */
const { chromium } = require('playwright-core');
const { load } = require('cheerio');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.argv[2] || 'http://localhost:3101';
const out = process.argv[3] || 'C:/클로드/renewal-kinetic-qa/production';
const base = JSON.parse(fs.readFileSync('C:/클로드/renewal-kinetic-qa/baseline.json','utf8'));
const routes = base.map(r=>r.route);
const article = base.find(r=>r.route.endsWith('/magazine')).links.find(h=>h.startsWith('/renewal/magazine/'));
if(article) routes.push(article);
fs.mkdirSync(out,{recursive:true});
const report=process.env.QA_FORMS ? JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8')) : {origin,runs:[],raw:[],links:[],form:[],failures:[]};
if(process.env.QA_FORMS) report.form=[];
const check=(ok,msg)=>{if(!ok){report.failures.push(msg);console.log('FAIL',msg);}};
const curl=(url,args=[])=>execFileSync('curl.exe',['-sS','--max-time','60',...args,url],{encoding:'utf8',maxBuffer:30*1024*1024});
(async()=>{
 const links=new Set();
 for(const route of (process.env.QA_FORMS?[]:routes)){
  const html=curl(origin+route,['-A','ChatGPT-User']);const $=load(html);
  const h1=$('h1').text(),canonical=$('link[rel=canonical]').attr('href');
  const previous=base.find(r=>r.route===route);
  const raw={route,h1,canonical,named:['googlebot','Yeti','bingbot'].every(n=>$(`meta[name="${n}"]`).attr('content')==='noindex, nofollow'),generalNoindex:/noindex/.test($('meta[name=robots]').attr('content')||'')};
  check(!!h1&&raw.named&&!raw.generalNoindex&&(!previous||previous.canonical===canonical),'raw HTML/meta '+route);
  if(route==='/renewal')check(h1==='로펌 마케팅에 필요한\u00a0모든\u00a0것.메이크디스원 하나로'&&html.includes('메이크디스원의 통합 솔루션으로.'),'locked hero SSR');
  $('.mt-root a[href]').each((_,a)=>{const h=$(a).attr('href');if(h.startsWith('/')||h.startsWith('#'))links.add(new URL(h,origin+route).href)});
  report.raw.push(raw);fs.writeFileSync(path.join(out,route.replaceAll('/','_')+'-raw.html'),html);
 }
 for(const href of links){const u=new URL(href);const hash=u.hash;u.hash='';const status=curl(u.href,['-o','NUL','-w','%{http_code}']).trim();const anchor=!hash||load(curl(u.href))(`[id="${decodeURIComponent(hash.slice(1))}"]`).length>0;report.links.push({href,status,anchor});check(status==='200'&&anchor,'link '+href+' '+status);}
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const jobs=[];
 if(!process.env.QA_FORMS)for(const width of [1440,375])for(const mode of ['normal','no-js','reduced'])for(const route of routes)jobs.push({width,mode,route});
 if(process.env.QA_ROUTE){for(let i=jobs.length-1;i>=0;i--)if(!jobs[i].route.endsWith(process.env.QA_ROUTE))jobs.splice(i,1);}
 async function worker(){while(jobs.length){const {width,mode,route}=jobs.shift();const name=route.replaceAll('/','_')+'-'+width+'-'+mode;
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:900},javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode!=='no-js')await context.addInitScript(()=>{
   window.qaCLS=0;window.qaShifts=[];window.qaLCP=null;
   new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.qaCLS+=e.value;window.qaShifts.push({value:e.value,nodes:e.sources.map(s=>({html:s.node?.outerHTML?.slice(0,200),from:s.previousRect,to:s.currentRect}))});}}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(l=>{for(const e of l.getEntries())window.qaLCP={ms:e.startTime,tag:e.element?.tagName,animated:!!e.element?.closest('[data-motion-part]')};}).observe({type:'largest-contentful-paint',buffered:true});
  });
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const res=await p.goto(origin+route,{waitUntil:'networkidle'});
  // Page-side promises can remain pending with script execution disabled.
  if(mode!=='no-js')await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(1300);
  const initial=await p.evaluate(()=>({cls:window.qaCLS??null,lcp:window.qaLCP??null,shifts:window.qaShifts??[]}));
  if(mode==='normal')await p.screenshot({path:path.join(out,name+'-hero.png')});
  for(const details of await p.locator('main details').all()){if(await details.isVisible()&&!(await details.getAttribute('open'))){await details.locator('summary').click();}}
  // Page timers do not execute with javaScriptEnabled:false. Drive scrolling
  // from the test runner, using the same browser input path in every mode.
  const height=await p.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<height;y+=800){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(20);}
  await p.waitForTimeout(300);
  const geometry=await p.evaluate(()=>{
   // Scroll hints intentionally disappear once their gesture is completed and
   // are absent in reduced/no-JS mode; they are not section information.
   const norm=s=>s.replace(/\s+/g,'');const els=[...document.querySelectorAll('.mt-root > main h1,.mt-root > main h2,.mt-root > main h3,.mt-root > main p,.mt-root > main li,.mt-root > main label')].filter(e=>!e.closest('[aria-hidden="true"],svg,[hidden],.mt-shint'));
   const visible=e=>{for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false;}return !!e.getClientRects().length;};
   const shown=els.filter(visible).map(e=>norm(e.textContent));
   return {overflow:document.documentElement.scrollWidth>innerWidth,hidden:els.filter(e=>!visible(e)&&norm(e.textContent)&&!shown.some(t=>t.includes(norm(e.textContent)))).map(e=>({tag:e.tagName,text:e.textContent.slice(0,150),class:e.className})),headings:[...document.querySelectorAll('h1')].length,cls:window.qaCLS??null,shifts:window.qaShifts??[],animations:matchMedia('(prefers-reduced-motion:reduce)').matches?document.querySelector('.mt-root').getAnimations({subtree:true}).filter(a=>a.playState==='running').length:null};
  });
  await p.evaluate(()=>scrollTo(0,0));if(mode==='normal')await p.screenshot({path:path.join(out,name+'-full.png'),fullPage:true});
  const result={route,width,mode,status:res.status(),initial,...geometry,errors};report.runs.push(result);
  check(res.status()===200&&!geometry.overflow&&geometry.hidden.length===0&&errors.length===0,'layout '+name+' '+JSON.stringify(geometry.hidden));
  check(initial.cls===null||initial.cls===0,'initial CLS '+name+' '+initial.cls);
  check(geometry.cls===null||geometry.cls===0,'post-scroll CLS '+name+' '+geometry.cls);
  check(!initial.lcp?.animated,'animated LCP '+name);
  check(geometry.animations===null||geometry.animations===0,'reduced animations '+name);
  await context.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('Checked',name);
 }}
 await Promise.all([worker(),worker(),worker()]);
 // Mock the form transport locally: payload retention, success focus, failure state.
 for(const width of [1440,375]){
  const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage();let payload,requests=0;
  await p.route('**/api/renewal/diagnose',async r=>{requests++;payload=r.request().postDataJSON();await r.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});});
  await p.goto(origin+'/renewal/diagnose?plan=growth#form',{waitUntil:'networkidle'});
  const plan=await p.locator('#plan').inputValue();await p.locator('#firmName').fill('QA 로컬 모의 입력');await p.locator('#contactName').fill('QA');await p.locator('#phone').fill('000-0000-0000');
  await p.locator('.mt-k-form summary').click();await p.locator('#practiceAreas').fill('검증용');await p.getByRole('button',{name:'네이버 블로그',exact:true}).click();await p.locator('.mt-k-form summary').click();await p.getByRole('button',{name:'진단 요청 보내기'}).click();await p.getByRole('status').waitFor();
  const focused=await p.getByRole('status').evaluate(e=>e===document.activeElement);const ok=requests===1&&plan==='growth'&&payload.plan==='growth'&&payload.practiceAreas==='검증용'&&payload.channels.includes('네이버 블로그')&&focused;
  check(ok,'mock form success '+width);report.form.push({width,scenario:'mock-success',ok});await c.close();
 }
 const nc=await browser.newContext({javaScriptEnabled:false}),np=await nc.newPage();await np.goto(origin+'/renewal/diagnose',{waitUntil:'networkidle'});await np.locator('.mt-k-form summary').click();const safe=await np.locator('button[type=submit]').isDisabled();check(safe&&await np.locator('#practiceAreas').isVisible(),'no-js form safety/disclosure');report.form.push({scenario:'no-js',ok:safe});await nc.close();
 const ec=await browser.newContext(),ep=await ec.newPage();let errorRequests=0;
 await ep.route('**/api/renewal/diagnose',async r=>{errorRequests++;await r.fulfill({status:500,contentType:'application/json',body:'{"error":"로컬 모의 오류"}'});});
 await ep.goto(origin+'/renewal/diagnose',{waitUntil:'networkidle'});await ep.getByRole('button',{name:'진단 요청 보내기'}).click();check(errorRequests===0,'native required validation');
 await ep.locator('#firmName').fill('QA');await ep.locator('#contactName').fill('QA');await ep.locator('#phone').fill('000-0000-0000');await ep.getByRole('button',{name:'진단 요청 보내기'}).click();await ep.locator('.mt-k-form [role="alert"]').waitFor();
 check(errorRequests===1&&await ep.getByRole('button',{name:'진단 요청 보내기'}).isEnabled(),'mock error permits retry');report.form.push({scenario:'mock-error-and-validation',ok:errorRequests===1});await ec.close();
 // 1440 physical pixels at 200% zoom reflows into 720 CSS pixels.
 const zc=await browser.newContext({viewport:{width:720,height:500},deviceScaleFactor:2,reducedMotion:'reduce'});
 for(const route of ['/renewal','/renewal/lawfirm-marketing','/renewal/diagnose','/renewal/contact']){const zp=await zc.newPage();await zp.goto(origin+route,{waitUntil:'networkidle'});const overflow=await zp.evaluate(()=>document.documentElement.scrollWidth>innerWidth);check(!overflow,'200%-equivalent reflow '+route);await zp.screenshot({path:path.join(out,route.replaceAll('/','_')+'-zoom-200-equivalent.png')});await zp.close();}await zc.close();
 await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({runs:report.runs.length,links:report.links.length,failures:report.failures},null,2));if(report.failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));process.exitCode=1;});
