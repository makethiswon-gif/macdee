// Read-only checks for review navigation and inherited header theme.
const { chromium } = require('playwright-core');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = process.argv[2] || 'http://localhost:3101';
const out = path.resolve(process.argv[3] || '.next/renewal-study-navigation');
const failures=[]; const results=[];
const check=(ok,msg)=>{if(!ok)failures.push(msg);};
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  for(const width of [1440,375]) for(const slug of ['', 'kinetic','orbit','aperture']) {
    const p=await browser.newPage({viewport:{width,height:width===1440?1000:900}});
    await p.goto(origin+'/renewal/concepts'+(slug?'/'+slug:''),{waitUntil:'networkidle'});
    await p.evaluate(()=>document.fonts.ready);
    const route=slug||'gallery';
    const footer=await p.locator('footer').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el.querySelector('a')).color}));
    check(footer.color==='rgb(248, 247, 242)','Footer inherits dark text: '+route+'/'+width);
    await p.screenshot({path:path.join(out,route+'-'+width+'.png'),fullPage:!slug});
    if(width===1440) {
      await p.locator('header [aria-haspopup=true]').focus();
      await p.waitForTimeout(100);
      const palette=await p.locator('[id^=nav-drop] > div').evaluate(el=>({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el.querySelector('span')).color,description:getComputedStyle(el.querySelector('span + span')).color,links:el.querySelectorAll('a').length}));
      const contrast=({background,text})=>{
        const lum=s=>{const vals=s.match(/[\d.]+/g).slice(0,3).map(n=>Number(n)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return vals[0]*.2126+vals[1]*.7152+vals[2]*.0722;};
        const a=lum(background),b=lum(text);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      };
      const ratio=contrast(palette),descriptionRatio=contrast({background:palette.background,text:palette.description});
      check(ratio>=4.5&&descriptionRatio>=4.5&&palette.links===6,'Dropdown contrast/links: '+route);
      await p.screenshot({path:path.join(out,route+'-desktop-menu.png')});
      results.push({route,width,palette,contrast:ratio,descriptionContrast:descriptionRatio});
      await p.keyboard.press('Escape');
      check(await p.locator('[id^=nav-drop]').count()===0,'Dropdown Escape: '+route);
    } else {
      await p.getByRole('button',{name:'메뉴 열기',exact:true}).click();
      check(await p.locator('#mobile-nav').isVisible(),'Mobile menu did not open: '+route);
      await p.screenshot({path:path.join(out,route+'-mobile-menu.png')});
      await p.keyboard.press('Escape');
      check(await p.locator('#mobile-nav').count()===0,'Mobile menu Escape: '+route);
      results.push({route,width,mobileMenu:true});
    }
    if(slug) {
      const dock=p.getByRole('navigation',{name:'두 번째 디자인 시안 비교'});
      check(await dock.locator('a').count()===4,'Missing dock links: '+route+'/'+width);
      await dock.locator('a').first().click();
      await p.waitForURL('**/renewal/concepts');
      check((await p.locator('h1').textContent()).includes('판을 다시.'),'Dock navigation: '+route+'/'+width);
    }
    await p.close();
  }
  await browser.close();
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({results,failures},null,2));
  console.log(JSON.stringify({runs:results.length,failures},null,2));process.exitCode=failures.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
