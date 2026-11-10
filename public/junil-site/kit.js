/* 법률사무소 준일 시안 공용 모션 — GSAP + ScrollTrigger (+ Lenis) */
gsap.registerPlugin(ScrollTrigger);
const K={};
const mm=window.matchMedia('(min-width:901px)');
const calm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* 글꼴 후보 바꿔 끼우기: 주소 뒤에 ?f=p|n|m|s|h|i (로고 글자는 공식 로고대로 고운바탕 유지) */
K.fonts={
  g:{n:'고운바탕',body:'Pretendard,sans-serif',disp:'"Gowun Batang",serif',gw:700},
  p:{n:'프리텐다드',body:'Pretendard,sans-serif',disp:'Pretendard,sans-serif',gw:800},
  n:{n:'본명조',body:'Pretendard,sans-serif',disp:'"Noto Serif KR",serif',gw:700,css:'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&display=swap'},
  m:{n:'마루부리',body:'Pretendard,sans-serif',disp:'MaruBuri,serif',gw:700,css:'https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css'},
  s:{n:'SUIT',disp:'"SUIT Variable",sans-serif',body:'"SUIT Variable",sans-serif',gw:800,css:'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css'},
  h:{n:'함렛',body:'Pretendard,sans-serif',disp:'Hahmlet,serif',gw:700,css:'https://fonts.googleapis.com/css2?family=Hahmlet:wght@300;400;600;700;800&display=swap'},
  i:{n:'IBM 플렉스 산스',disp:'"IBM Plex Sans KR",sans-serif',body:'"IBM Plex Sans KR",sans-serif',gw:700,css:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap'}
};
(()=>{const k=new URLSearchParams(location.search).get('f'),f=K.fonts[k];if(!f)return;
  if(f.css){const l=document.createElement('link');l.rel='stylesheet';l.href=f.css;document.head.appendChild(l)}
  const r=document.documentElement.style;r.setProperty('--disp',f.disp);r.setProperty('--gw',f.gw);if(f.body)r.setProperty('--body',f.body);
  const tag=document.createElement('a');tag.href='fonts.html';tag.textContent='글꼴: '+f.n+' · 후보 다시 보기';
  tag.style.cssText='position:fixed;left:16px;top:96px;z-index:90;background:#255e70;color:#fff;font:600 12px Pretendard,sans-serif;padding:9px 14px;letter-spacing:.04em';document.body.appendChild(tag)})();

/* 공식 로고: 준일 공홈의 SVG(도형 좌표·고운바탕 글자)를 그대로 옮김. tone = 'w'(어두운 바탕) | 'k'(밝은 바탕) */
K.logo=(tone='w',symOnly=false)=>{
  const c=tone==='w'?'#fff':'#060303';
  const sym=`<polygon fill="#255e70" points="843.03 728.16 715.16 664.76 715.16 585.52 770.14 614.26 770.14 236.15 450.29 397.35 449.25 620.68 376.36 655.94 376.36 351.81 376.22 351.72 843.03 122.23 843.03 728.16"/><polygon fill="${c}" points="230.44 122.23 230.44 728.16 358.31 664.76 358.31 585.52 303.33 614.26 303.33 236.15 436.49 303.26 517.17 263.19 230.44 122.23"/><polygon fill="${c}" points="638.4 322.78 556.22 363.6 623.18 397.35 624.22 620.68 697.1 655.94 697.1 351.81 697.25 351.72 638.4 322.78"/>`;
  if(symOnly)return `<svg viewBox="225 117 623 616" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${sym}</svg>`;
  return `<svg viewBox="225 100 2230 650" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="법률사무소 준일"><g fill="${c}" font-family="'Gowun Batang',serif"><text font-size="300" transform="translate(1811.75 531.7)">준일</text><text font-size="170" transform="translate(981.16 428.41)">법률사무소</text><text font-size="90" transform="translate(1048.11 556.29)">JUN IL Law Firm</text></g>${sym}</svg>`;
};
document.querySelectorAll('[data-logo]').forEach(e=>{e.innerHTML=K.logo(e.dataset.logo||'w',e.hasAttribute('data-sym'))});

/* 부드러운 스크롤 */
if(window.Lenis&&!calm){const l=new Lenis({lerp:.11,wheelMultiplier:1});l.on('scroll',ScrollTrigger.update);gsap.ticker.add(t=>l.raf(t*1000));gsap.ticker.lagSmoothing(0);K.lenis=l;
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t&&a.getAttribute('href').length>1){e.preventDefault();l.scrollTo(t,{duration:1.4})}}))}

/* 머리 고정 · 진행 막대 */
const hd=document.querySelector('.hd');
const fixHd=()=>hd&&hd.classList.toggle('fix',(window.scrollY||document.documentElement.scrollTop)>20);
addEventListener('scroll',fixHd,{passive:true});if(K.lenis)K.lenis.on('scroll',fixHd);fixHd();
if(document.querySelector('.bar'))gsap.to('.bar',{scaleX:1,ease:'none',scrollTrigger:{start:0,end:'max',scrub:.3}});

/* 첫 화면 공통: 사진을 천천히 당기고 스크롤에 밀림. 연출 본체는 시안마다 따로 */
K.calm=calm;
K.heroBase=()=>{if(calm)return;
  if(document.querySelector('.hero .bg')){gsap.fromTo('.hero .bg',{scale:1.16},{scale:1,duration:5,ease:'power2.out'});
    gsap.to('.hero .bg',{yPercent:9,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}})}
  gsap.fromTo('.hd,.quick,.cue',{opacity:0},{opacity:1,duration:1.2,stagger:.1,delay:1.7});
};

/* 줄 단위로 밑에서 올라오는 제목 */
document.querySelectorAll('[data-split]').forEach(el=>{
  el.innerHTML=el.innerHTML.split(/<br\s*\/?>/i).map(s=>`<span class="ln"><span class="li">${s.trim()}</span></span>`).join('');
  if(calm)return;
  gsap.from(el.querySelectorAll('.li'),{yPercent:110,duration:1.25,ease:'power4.out',stagger:.12,scrollTrigger:{trigger:el,start:'top 86%'}});
});

/* 등장: up(기본) · blur · left · scale */
document.querySelectorAll('[data-rv]').forEach(el=>{
  if(calm){el.style.opacity=1;return}
  const t=el.dataset.rv,d=+el.dataset.d||0;
  const from={opacity:0,y:t==='blur'||t==='scale'||t==='left'?0:46,x:t==='left'?-50:0,scale:t==='scale'?1.08:1},to={opacity:1,y:0,x:0,scale:1,duration:t==='blur'?1.6:1.15,delay:d,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%'}};
  if(t==='blur'){from.filter='blur(18px)';to.filter='blur(0px)';to.clearProps='filter'}
  gsap.fromTo(el,from,to);
});

/* 스크롤에 맞춰 단어가 하나씩 밝아지는 문단 */
document.querySelectorAll('[data-words]').forEach(el=>{
  el.innerHTML=el.innerHTML.split(/(<br\s*\/?>|\s+)/).map(s=>/^<br/i.test(s)?s:/^\s*$/.test(s)?' ':`<span class="w">${s}</span>`).join('');
  if(calm){el.querySelectorAll('.w').forEach(w=>w.style.opacity=1);return}
  gsap.to(el.querySelectorAll('.w'),{opacity:1,stagger:.06,ease:'none',scrollTrigger:{trigger:el,start:'top 78%',end:'bottom 52%',scrub:.4}});
});

/* 시차 배경 */
document.querySelectorAll('[data-par]').forEach(el=>{if(calm)return;
  gsap.fromTo(el,{yPercent:-(+el.dataset.par)},{yPercent:+el.dataset.par,ease:'none',scrollTrigger:{trigger:el.parentElement,start:'top bottom',end:'bottom top',scrub:true}})});

/* 숫자 올리기 */
document.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count,dec=(el.dataset.count.split('.')[1]||'').length,o={v:+el.dataset.from||0};
  gsap.to(o,{v:to,duration:2,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%'},onUpdate:()=>el.textContent=o.v.toFixed(dec)})});

/* 선 그리기 */
document.querySelectorAll('[data-draw]').forEach(p=>{if(calm)return;const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;
  gsap.to(p,{strokeDashoffset:0,duration:2.2,ease:'power2.inOut',scrollTrigger:{trigger:p,start:'top 82%'}})});

/* 고정 가로 이동 구간 (레퍼런스 '프로세스' 방식: 고정 + 스크럽 + 칸마다 멈춤 + 뒤에서 흐르는 큰 외곽선 글자) */
ScrollTrigger.matchMedia({'(min-width:901px)':()=>{
  document.querySelectorAll('.hpin').forEach(sec=>{
    const track=sec.querySelector('.track'),n=track.children.length,dist=()=>track.scrollWidth-innerWidth;
    const tw=gsap.to(track,{x:()=>-dist(),ease:'none',scrollTrigger:{trigger:sec,pin:true,scrub:1,start:'top top',end:()=>'+='+dist()*1.05,snap:{snapTo:1/(n-1),duration:{min:.2,max:.7},ease:'power2.inOut'},invalidateOnRefresh:true,
      onUpdate:s=>{const b=sec.querySelector('.hprog i');if(b)b.style.transform=`scaleX(${s.progress})`;const c=sec.querySelector('[data-idx]');if(c)c.textContent=String(Math.round(s.progress*(n-1))+1).padStart(2,'0')}}});
    const gh=sec.querySelector('.ghost');if(gh)gsap.fromTo(gh,{x:0},{x:()=>-(gh.scrollWidth-innerWidth*.6),ease:'none',scrollTrigger:{trigger:sec,start:'top top',end:()=>'+='+dist()*1.05,scrub:1.4}});
    track.querySelectorAll('.pn').forEach((p,i)=>{
      const img=p.querySelector('.im img'),tx=p.querySelectorAll('.tx > *');
      if(img)gsap.fromTo(img,{xPercent:-6},{xPercent:6,ease:'none',scrollTrigger:{trigger:p,containerAnimation:tw,start:'left right',end:'right left',scrub:true}});
      if(i>0)gsap.from(tx,{opacity:0,y:36,stagger:.1,duration:.9,ease:'power3.out',scrollTrigger:{trigger:p,containerAnimation:tw,start:'left 62%'}});
    });
  });
}});

/* 마우스를 따라다니는 미리보기 사진 (업무분야 목록) */
document.querySelectorAll('[data-peek]').forEach(list=>{
  if(!mm.matches)return;
  const box=document.createElement('div');box.className='peek';box.innerHTML='<img alt="">';document.body.appendChild(box);
  const img=box.firstChild,qx=gsap.quickTo(box,'x',{duration:.5,ease:'power3'}),qy=gsap.quickTo(box,'y',{duration:.5,ease:'power3'});
  list.addEventListener('mousemove',e=>{qx(e.clientX+28);qy(e.clientY-110)});
  list.querySelectorAll('[data-img]').forEach(a=>{a.addEventListener('mouseenter',()=>{img.src=a.dataset.img;gsap.to(box,{opacity:1,scale:1,duration:.45,ease:'power3.out'})})});
  list.addEventListener('mouseleave',()=>gsap.to(box,{opacity:0,scale:.9,duration:.35}));
});

addEventListener('load',()=>ScrollTrigger.refresh());
window.K=K;
