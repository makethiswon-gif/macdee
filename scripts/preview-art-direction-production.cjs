// Real production renderer, local preserved plates and owned approved assets. No paid calls or publishing.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');process.chdir(root);
const resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,...args);};
Module._extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},fileName:f}).outputText,f);
global.fetch=async()=>{throw new Error('Local proof: network disabled');};
const {renderEditorialThree}=require('../lib/blog-images/three-card-renderer.ts');
const {editorialCoverLayout}=require('../lib/blog-images/three-card-policy.ts');
const {posterFamily}=require('../lib/blog-images/poster-layout.ts');
const {EDITORIAL_SET_FORMAT}=require('../lib/blog-images/card-types.ts');
const out='tmp/art-direction-production',assets='tmp/editorial-quality/approved';fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(`${assets}/manifest.json`));
const rows=JSON.parse(fs.readFileSync('tmp/profile-design/profiles.json'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const gallery=[],metrics=[];
 for(const id of ['mmlk8qh6gqq9l','mqaaoypk621p6','mse8rx0bkl9f0','mmlg8fcm9bdgl','mrvn35u3cxprq','mmkfnvun052ja']){
  const current=`${assets}/${id}-profile.json`,r=fs.existsSync(current)?JSON.parse(fs.readFileSync(current)).profile:rows.find(p=>p.id===id);assert.ok(r);
  const p=r.lawyerName?{...r,lawyerName:r.lawyerName.split('||')[0].trim()}:{id,lawyerName:r.lawyer_name.split('||')[0].trim(),officeName:r.office_name,jobTitle:r.lawyer_name.split('||')[1]||'변호사',phone:r.phone,brandColor:r.brand_color,website:r.website||'',profileImages:r.profile_images||[],officeImages:r.office_images||[],logoImage:r.logo_image||''};
  const edition=`${EDITORIAL_SET_FORMAT}:${id}`,recipe=editorialCoverLayout(p),campaign=posterFamily(recipe)==='campaign';
  const approved=manifest.filter(a=>a.profileId===id).sort((a,b)=>a.assetId.localeCompare(b.assetId));
  const start=approved.length?parseInt(crypto.createHash('sha256').update(edition).digest('hex').slice(0,8),16)%approved.length:0;
  const photo=role=>{if(!approved.length)return undefined;const a=approved[(start+(role==='contact'?1:0))%approved.length];return {bytes:fs.readFileSync(`${assets}/${a.file}`),kind:'studio',selections:[{assetId:a.assetId,version:a.version}]};};
  const cover={type:'thumbnail',heading:campaign?'증거의\n조건.':'카톡만으로\n증거가 될까?',kicker:campaign?'상간소송 · 카톡 캡처':'상간소송',emphasis:'증거',deck:'',purpose:'조판 검증',afterParagraphId:'',evidence:[]};
  const plan={version:'visual-plan-v11',setFormat:EDITORIAL_SET_FORMAT,publicationEdition:edition,layoutRecipe:recipe,sourceHash:'local-proof',question:'상간소송 카톡 증거',thesis:'',paragraphs:[],proofSelection:{profileId:id,claims:[],mode:'basic'},cards:[cover,{...cover,type:'info'},{...cover,type:'contact'}]};
  const tiles=[];
  for(const card of plan.cards){
   const result=await renderEditorialThree({profile:p,plan,card,...(card.type==='thumbnail'?{art:fs.readFileSync(`tmp/art-direction-v2/${campaign?'B':'A'}-original.jpg`)}:{editorialPhoto:photo(card.type)})});
   assert.ok(result.layoutChecks.passed,`${id}/${card.type}: ${result.layoutChecks.issues}`);
   const bytes=Buffer.from(result.imageDataUrl.split(',')[1],'base64'),file=`${id}-${card.type}.png`;
   fs.writeFileSync(`${out}/${file}`,bytes);
   metrics.push({profileId:id,name:p.lawyerName,type:card.type,recipe,checks:result.layoutChecks,photo:result.photoChecks,warnings:result.warnings,studioPhotos:result.studioPhotos});
   tiles.push({input:await sharp(bytes).resize(500).png().toBuffer(),left:tiles.length*516,top:0});
   gallery.push({name:p.lawyerName==='법무법인'?p.officeName:p.lawyerName,file,type:card.type,approved:approved.length});
  }
  await sharp({create:{width:1532,height:500,channels:3,background:'#e3e5e4'}}).composite(tiles).png().toFile(`${out}/${id}-sheet.png`);
  if(fs.existsSync(`${out}/actual/${id}/original.jpg`)){
   const actual=JSON.parse(fs.readFileSync(`.vercel/art-direction-production/${id}/plan-result.json`)).plan;
   const result=await renderEditorialThree({profile:p,plan:actual,card:actual.cards[0],art:fs.readFileSync(`${out}/actual/${id}/original.jpg`)});
   assert.ok(result.layoutChecks.passed,result.layoutChecks.issues.join());
   fs.writeFileSync(`${out}/actual/${id}/local-thumbnail.png`,Buffer.from(result.imageDataUrl.split(',')[1],'base64'));
  }
 }
 fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(metrics,null,2));
 fs.writeFileSync(`${out}/review.html`,'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>변호사별 제작 검증</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e7e9e8;font:15px Arial}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0;min-width:0}img{width:100%;aspect-ratio:1;display:block}figcaption{padding:12px 0;overflow-wrap:anywhere}@media(max-width:700px){body{padding:12px}main{grid-template-columns:1fr}}</style><h1>변호사별 제작 검증</h1><p>실제 운영 렌더러 · 2000 × 2000 · 표지 원화 2종으로 조판 비교. 게시된 원고가 아닙니다.</p><main>'+gallery.map(g=>`<figure><img src="${esc(g.file)}" alt="${esc(g.name+' '+g.type)}"><figcaption>${esc(g.name)} / ${{thumbnail:'표지',info:g.approved?'승인 스튜디오 사진':'등록 사진',contact:'상담 연락'}[g.type]}</figcaption></figure>`).join('')+'</main></html>');
 console.log('PASS: 18 real production renders, 6 profile owners, 2000px, zero paid calls. '+path.resolve(`${out}/review.html`));
})().catch(e=>{console.error(e);process.exitCode=1;});
