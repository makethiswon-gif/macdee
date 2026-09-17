// Isolated art-direction proofs. Generated plates and approved photographs remain unmodified.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');process.chdir(root);
const out='tmp/art-direction-v2';
for(const [file,family] of [['noto-sans-kr-korean-900-normal.woff2','Heavy'],['noto-sans-kr-korean-700-normal.woff2','Bold'],['noto-sans-kr-korean-400-normal.woff2','Regular']]){
 assert.ok(GlobalFonts.register(fs.readFileSync(`public/fonts/${file}`),family));
}
const approved=JSON.parse(fs.readFileSync('tmp/editorial-quality/approved/manifest.json'));
const profile=JSON.parse(fs.readFileSync('tmp/editorial-quality/approved/mmlk8qh6gqq9l-profile.json')).profile;
const name=profile.lawyerName.split('||')[0].trim(),firm=profile.officeName;
assert.equal(name,'유지은');assert.equal(profile.phone.split(/[,/]/)[0].trim(),'02-594-2353');
const W=1000,S=2,white='#FFFDF6',ink='#174559',coral='#CC483A',gold='#EFCC80';
const records=[];
function surface(){const c=createCanvas(2000,2000).getContext('2d');c.scale(S,S);return c;}
function photo(c,img,anchor=0.5){
 const scale=Math.max(W/img.width,W/img.height),sw=W/scale,sh=W/scale;
 c.drawImage(img,(img.width-sw)/2,(img.height-sh)*anchor,sw,sh,0,0,W,W);
}
function type(c,text,x,y,size,face='Bold',color=white,align='left'){
 c.font=`${size}px "${face}"`;c.textBaseline='top';c.fillStyle=color;
 const width=c.measureText(text).width,left=align==='right'?x-width:x;
 c.fillText(text,left,y);
 const box={text,x:left,y,w:width,h:size*1.16};
 assert.ok(left>=40&&left+width<=960&&y>=35&&y+box.h<=965,JSON.stringify(box));
 c.boxes.push(box);return width;
}
function fade(c,top,bottom,alpha){
 const g=c.createLinearGradient(0,top,0,bottom);g.addColorStop(0,'rgba(4,8,10,0)');g.addColorStop(1,`rgba(4,8,10,${alpha})`);c.fillStyle=g;c.fillRect(0,top,W,bottom-top);
}
async function save(c,id){
 for(let i=0;i<c.boxes.length;i++)for(let j=i+1;j<c.boxes.length;j++){
  const a=c.boxes[i],b=c.boxes[j];
  assert.ok(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1),`${id}: overlapping copy ${a.text}/${b.text}`);
 }
 const bytes=await sharp(c.canvas.toBuffer('image/png')).png().toBuffer();
 const m=await sharp(bytes).metadata();assert.equal(m.width,2000);assert.equal(m.height,2000);
 fs.writeFileSync(`${out}/${id}.png`,bytes);records.push({id,boxes:c.boxes,width:2000,height:2000});
}
async function approvedImage(id){
 const entry=approved.find(x=>x.profileId===profile.id&&x.assetId.startsWith(id));assert.ok(entry);
 return loadImage(fs.readFileSync(`tmp/editorial-quality/approved/${entry.file}`));
}
(async()=>{
 const [a,b,desk,studio]=await Promise.all([loadImage(`${out}/A-original.jpg`),loadImage(`${out}/B-original.jpg`),approvedImage('8147c349'),approvedImage('7c9009c4')]);
 {
  const c=surface();c.boxes=[];photo(c,a);
  type(c,firm,60,46,22,'Bold');
  type(c,'상간소송',62,611,27,'Bold',gold);
  type(c,'카톡만으로',56,665,95,'Bold');
  const w=type(c,'증거',56,780,109,'Heavy',gold);
  type(c,'가 될까?',56+w,780,109,'Heavy');
  await save(c,'A-cover');
 }
 {
  const c=surface();c.boxes=[];photo(c,desk);fade(c,555,1000,0.82);
  type(c,'상간소송 상담',62,636,27,'Bold',gold);
  type(c,`${name} 변호사`,59,688,53,'Bold');
  type(c,'02-594-2353',55,785,88,'Heavy');
  type(c,firm,62,927,23,'Regular');
  await save(c,'A-contact');
 }
 {
  const c=surface();c.boxes=[];photo(c,b);
  type(c,firm,62,48,23,'Bold',ink);
  type(c,'상간소송 · 카톡 캡처',65,178,28,'Bold',ink);
  type(c,'증거의',55,225,142,'Heavy',ink);
  const w=type(c,'조건',125,407,158,'Heavy',ink);
  type(c,'.',125+w+5,407,158,'Heavy',coral);
  await save(c,'B-cover');
 }
 {
  const c=surface();c.boxes=[];photo(c,studio,0.36);
  type(c,'상간소송',62,62,28,'Bold');
  const w=type(c,'상담',52,132,125,'Bold');
  type(c,'.',52+w,132,125,'Heavy',gold);
  type(c,firm,62,680,23,'Regular');
  type(c,`${name} 변호사`,62,725,33,'Bold');
  type(c,'02-594-2353',58,790,56,'Bold');
  await save(c,'B-contact');
 }
 for(const variant of ['A','B']){
  const tiles=[];for(const role of ['cover','contact'])tiles.push({input:await sharp(`${out}/${variant}-${role}.png`).resize(620).png().toBuffer(),left:tiles.length*638,top:0});
  await sharp({create:{width:1258,height:620,channels:3,background:'#E8EBE8'}}).composite(tiles).png().toFile(`${out}/${variant}-sheet.png`);
 }
 fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(records,null,2));
 console.log('PASS: four 2000px isolated proofs; complete copy, no text overlaps, approved portrait proportions preserved, no model or production calls.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
