// Inspect actual font metrics, not just layout-declared rectangles. No network or model calls.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,...args);};
Module._extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},fileName:f}).outputText,f);
const {createCanvas}=require('@napi-rs/canvas');
const {magazineFonts}=require('../lib/blog-images/magazine-design.ts');
const {drawPhotoPoster}=require('../lib/blog-images/photo-poster.ts');
const {posterFrame,posterFamily}=require('../lib/blog-images/poster-layout.ts');
magazineFonts();let count=0;
for(const recipe of ['photo-open','headline','title-band','column-pair','caption-rail','split-footer']){
 assert.equal(posterFamily(recipe)==='story',posterFrame(recipe)==='poster-bottom');
 for(const heading of ['카톡만으로\n증거가 될까?','증거의\n조건.','회생과 파산,\n금액이 아니라 소득.','조건과 예외를 모두 확인하고 자료의 앞뒤 내용을 정확하게 정리해야 하는 이유']){
  const c=createCanvas(2000,2000).getContext('2d');c.scale(2000/1200,2000/1200);c.fillStyle='#b4cad5';c.fillRect(0,0,1200,1200);
  const printed=[],boxes=[],original=c.fillText.bind(c);
  c.fillText=(value,x,y,...rest)=>{
   const m=c.measureText(value),box={x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
   if(value.trim()){assert.ok(box.x>=40&&box.x+box.w<=1160&&box.y>=35&&box.y+box.h<=1190,JSON.stringify({recipe,heading,value,box}));boxes.push(box);printed.push(value);}
   return original(value,x,y,...rest);
  };
  const options={recipe,heading,kicker:'원고 핵심 쟁점',emphasis:'증거',brand:'법무법인 테스트'};
  let result=drawPhotoPoster(c,options);
  if(result.issues.length){printed.length=0;boxes.length=0;result=drawPhotoPoster(c,{...options,repair:true});}
  assert.equal(result.issues.length,0);
  if(heading.includes('\n'))assert.ok(boxes.filter(b=>b.h>70).length<=3,'An authored two-line headline must not expand into a three-line block');
  assert.ok(printed.join('').replace(/\s/g,'').includes(heading.replace(/\s/g,'')),'No meaningful heading text may disappear');
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];assert.ok(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2),'Real glyphs overlap');
  }
  count++;
 }
}
console.log(`PASS: ${count} actual-font compositions; intact copy, six fixed editions, bounded glyphs and no text collisions.`);
