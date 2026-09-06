const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://localhost:3101';
const dir = process.env.QA_DIR || 'C:/클로드/renewal-kinetic-qa';
const capture = process.argv.includes('--baseline');
const routes = ['/renewal','/renewal/naver-ads','/renewal/lawfirm-seo','/renewal/geo','/renewal/lawfirm-blog','/renewal/lawfirm-website','/renewal/conversion','/renewal/lawfirm-marketing','/renewal/about','/renewal/work','/renewal/contact','/renewal/diagnose','/renewal/magazine'];
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page = await context.newPage();
 const results=[];
 for(const route of routes){
  const response = await page.goto(base+route,{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{
   const main=document.querySelector('.mt-root > main');
   const norm=s=>s.replace(/\s+/g,'').trim();
   const copy=main.cloneNode(true);
   copy.querySelectorAll('script,style,[aria-hidden="true"],svg,canvas').forEach(e=>e.remove());
   return {text:norm(copy.textContent),blocks:[...copy.querySelectorAll('h1,h2,h3,p,li,dt,dd,summary,label,option')].map(e=>norm(e.textContent)).filter(Boolean),h1:main.querySelector('h1')?.textContent,links:[...document.querySelectorAll('.mt-root a[href]')].map(a=>a.getAttribute('href')),canonical:document.querySelector('link[rel="canonical"]')?.href,robots:[...document.querySelectorAll('meta[name$="bot"],meta[name="robots"],meta[name="Yeti"]')].map(e=>[e.name,e.content])};
  });
  results.push({route,status:response.status(),...result});
 }
 await browser.close();
 if(capture){fs.writeFileSync(path.join(dir,'baseline.json'),JSON.stringify(results,null,2)); console.log('Captured',results.length,'baseline routes');return;}
 const before=JSON.parse(fs.readFileSync(path.join(dir,'baseline.json'),'utf8'));
 const report=results.map(after=>{
  const old=before.find(r=>r.route===after.route);
  return {route:after.route,status:after.status,canonicalUnchanged:old.canonical===after.canonical,missing:old.blocks.filter(b=>!after.text.includes(b)),linksRemoved:[...new Set(old.links)].filter(h=>!after.links.includes(h))};
 });
 fs.writeFileSync(path.join(dir,'copy-report.json'),JSON.stringify(report,null,2));
 fs.writeFileSync(path.join(dir,'current.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
