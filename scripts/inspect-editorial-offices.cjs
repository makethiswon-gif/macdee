const fs=require('node:fs'),sharp=require('sharp');
(async()=>{
 const profiles=JSON.parse(fs.readFileSync('tmp/profile-design/profiles.json'));
 for(const p of profiles.filter(p=>['mqaaoypk621p6','mrvn35u3cxprq','mmkfnvun052ja'].includes(p.id))){
  const tiles=[];
  const portraits=process.argv.includes('--portraits');
  for(const [i,s] of (portraits?p.profile_images:p.office_images).entries())tiles.push({input:await sharp(Buffer.from(s.split(',')[1],'base64')).rotate().resize(360,288,{fit:'contain',background:'#ddd'}).png().toBuffer(),left:i%4*376,top:Math.floor(i/4)*308});
  await sharp({create:{width:1504,height:Math.ceil(tiles.length/4)*308,channels:3,background:'#fff'}}).composite(tiles).png().toFile(`tmp/art-direction-production/${p.id}-${portraits?'portraits':'offices'}.png`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
