const fs=require('node:fs'),sharp=require('sharp'),assert=require('node:assert/strict');
const out='tmp/art-direction-production/actual';
(async()=>{
 const rows=[];
 for(const [id,name] of [['mqaaoypk621p6','김정웅'],['mse8rx0bkl9f0','양영희']]){
  const images=[];
  for(const [type,label] of [['thumbnail','메인 표지'],['info','변호사 사진'],['contact','상담 연락']]){
   const m=await sharp(`${out}/${id}/${type}.png`).metadata();assert.equal(m.width,2000);assert.equal(m.height,2000);
   images.push(`<figure><img src="${id}/${type}.png" alt="${name} ${label}"><figcaption>${name} · ${label}</figcaption></figure>`);
  }
  rows.push(`<section><h2>${name}</h2><div class="images">${images.join('')}</div></section>`);
 }
 fs.writeFileSync(`${out}/review.html`,'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>실제 생성 결과</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#e8ebea;color:#182525;font:15px Arial}h1{font-size:24px}h2{font-size:18px;margin:30px 0 12px}.images{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure{margin:0;min-width:0}img{display:block;width:100%;aspect-ratio:1}figcaption{padding:12px 0}@media(max-width:700px){body{padding:12px}.images{grid-template-columns:1fr}}</style><h1>실제 생성 결과</h1><p>운영 생성 경로 검증 · 2000 × 2000 · 기존 원고는 변경하지 않았습니다.</p>'+rows.join('')+'</html>');
 console.log('Two real article sets are ready for visual acceptance.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
