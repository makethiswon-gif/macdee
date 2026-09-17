// Recompose approved rendered photos and a preserved original; never contacts an AI provider.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,...args);};
Module._extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},fileName:f}).outputText,f);
global.fetch=async()=>{throw new Error('Local preview: network disabled');};
const sharp=require('sharp');
const {renderEditorialThree}=require('../lib/blog-images/three-card-renderer.ts');
const {contactCopy}=require('../lib/blog-images/three-card-policy.ts');
const {profileEdition}=require('../lib/blog-images/profile-editions.ts');
const out=path.resolve('tmp/editorial-quality'),approved=JSON.parse(fs.readFileSync(path.join(out,'approved/manifest.json'),'utf8'));
const rows=JSON.parse(fs.readFileSync('tmp/profile-design/profiles.json','utf8'));
const saved=JSON.parse(fs.readFileSync('.vercel/thesis-recovery/6fed6e8a-07bd-476c-bc31-ff683b93caff-plan.json','utf8'));
const plan=saved.plan||saved;
const old=JSON.parse(fs.readFileSync('tmp/pipeline-repair/live/cover-original.json','utf8'));
const art=process.argv[2]?fs.readFileSync(path.resolve(process.argv[2])):Buffer.from(old.artDataUrl.split(',')[1],'base64');
(async()=>{
 const gallery=[],metrics=[];
 for(const id of ['mmlk8qh6gqq9l','mse8rx0bkl9f0','mmlg8fcm9bdgl']){
   const current=path.join(out,'approved',`${id}-profile.json`);
   const r=fs.existsSync(current)?JSON.parse(fs.readFileSync(current,'utf8')).profile:rows.find(p=>p.id===id);assert.ok(r,id);
   const p=r.lawyerName?{...r,lawyerName:r.lawyerName.split('||')[0].trim()}:{id,lawyerName:r.lawyer_name.split('||')[0].trim(),officeName:r.office_name,jobTitle:'변호사',phone:r.phone,brandColor:r.brand_color,website:r.website||'',profileImages:r.profile_images||[],officeImages:r.office_images||[],logoImage:r.logo_image||''};
   const a=approved.find(a=>a.profileId===id);assert.ok(a,'A currently approved photo is required');
   const editorialPhoto={bytes:fs.readFileSync(path.join(out,'approved',a.file)),kind:'studio',selections:[{assetId:a.assetId,version:a.version}]};
   const edition=profileEdition(p);
   const localPlan={...plan,layoutRecipe:edition?.cover||'photo-open',proofSelection:{...plan.proofSelection,profileId:id,claims:[],mode:'basic'}};
   // Only Yu uses the actual saved title. Other profiles are typographic test compositions, not published articles.
   const cards=plan.cards.map(c=>c.type==='contact'?{...c,...contactCopy('카톡 캡처 몇 장만 들고 상간자 소송을 걸어도 될까요')}:c);
   const tiles=[];
   for(const card of cards){
     const result=await renderEditorialThree({profile:p,plan:localPlan,card,art,...(card.type==='info'?{editorialPhoto}:{})});
     const bytes=Buffer.from(result.imageDataUrl.split(',')[1],'base64'),file=`${id}-${card.type}.png`;
     fs.writeFileSync(path.join(out,file),bytes);
     metrics.push({name:p.lawyerName,type:card.type,recipe:result.layoutRecipe,checks:result.layoutChecks,photo:result.photoChecks,warnings:result.warnings});
     tiles.push({input:await sharp(bytes).resize(500).png().toBuffer(),left:tiles.length*516,top:0});
     gallery.push({name:p.lawyerName,type:card.type,file});
   }
   await sharp({create:{width:1532,height:500,channels:3,background:'#d6d9d7'}}).composite(tiles).png().toFile(path.join(out,`${id}-sheet.png`));
 }
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>편집 시안 검토</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e7e9e8;font:15px Arial}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%;aspect-ratio:1;display:block}figcaption{padding:12px 0}@media(max-width:700px){body{padding:12px}main{grid-template-columns:1fr}}</style><h1>편집 시안 검토</h1><p>승인된 최종 보정 사진 사용. 타 변호사 행은 지면 테스트이며 게시물이 아닙니다.</p><main>'+gallery.map(g=>`<figure><img src="${esc(g.file)}" alt="${esc(g.name+' '+g.type)}"><figcaption>${esc(g.name)} / ${{thumbnail:'표지',info:'승인 사진',contact:'연락'}[g.type]}</figcaption></figure>`).join('')+'</main></html>');
 console.log(JSON.stringify(metrics,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
