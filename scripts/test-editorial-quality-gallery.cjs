// Read-only browser review of real output files, without any provider or application requests.
const {chromium}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const gallery=path.resolve(root,process.argv[2]||'tmp/editorial-quality/review.html');
const expected=Number(process.argv[3]||6),out=path.join(path.dirname(gallery),'browser');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1});
   await page.route(/^https?:/,route=>route.abort());
   await page.goto(pathToFileURL(gallery).href);
   await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   const metrics=await page.locator('img').evaluateAll(imgs=>imgs.map(img=>({width:img.naturalWidth,height:img.naturalHeight,left:img.getBoundingClientRect().left,right:img.getBoundingClientRect().right,displayWidth:img.getBoundingClientRect().width,displayHeight:img.getBoundingClientRect().height})));
   assert.equal(metrics.length,expected);
   for(const m of metrics){assert.equal(m.width,2000);assert.equal(m.height,2000);assert.ok(m.left>=0&&m.right<=width);assert.ok(Math.abs(m.displayWidth-m.displayHeight)<1);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(out,`${width}.png`),fullPage:true});
   for(let i=0;i<expected;i++){
    const bytes=await page.locator('img').nth(i).screenshot();
    const {channels}=await sharp(bytes).stats();assert.ok(channels.some(c=>c.stdev>20),'Image must not be blank');
    if(width===320)fs.writeFileSync(path.join(out,`320-card-${i+1}.png`),bytes);
   }
   console.log(`PASS ${width}px: ${expected} real 2000px images, square proportions, no overflow, nonblank photograph pixels.`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
