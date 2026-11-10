/* 법률사무소 준일 — 하위 페이지 공용 동작 */
(()=>{
  const calm=K.calm;
  /* 하위 페이지 첫 화면 */
  const sub=document.querySelector('.hero.sub');
  if(sub&&!calm){
    gsap.fromTo('.hero.sub .bg',{scale:1.14},{scale:1,duration:3.2,ease:'power2.out'});
    gsap.from('.sh-in .crumb,.sh-in .eb,.sh-in p.s,.sh-meta',{opacity:0,y:22,filter:'blur(8px)',duration:1.1,stagger:.08,delay:.15,ease:'power3.out',clearProps:'filter'});
    gsap.to('.hero.sub .bg',{yPercent:10,ease:'none',scrollTrigger:{trigger:sub,start:'top top',end:'bottom top',scrub:true}});
    gsap.to('.sh-in',{yPercent:-14,opacity:.2,ease:'none',scrollTrigger:{trigger:sub,start:'35% top',end:'bottom top',scrub:true}});
  }
  /* 모바일 메뉴 */
  const mb=document.querySelector('.mbtn');
  if(mb){mb.onclick=()=>{document.body.classList.toggle('menu-on');if(K.lenis)document.body.classList.contains('menu-on')?K.lenis.stop():K.lenis.start()};document.querySelectorAll('.mnav a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('menu-on');if(K.lenis)K.lenis.start()}))}
  /* 사진 크게 보기 */
  const lb=document.createElement('div');lb.className='lbx';lb.innerHTML='<img alt="">';document.body.appendChild(lb);
  document.addEventListener('click',e=>{
    const f=e.target.closest('[data-zoom]');
    if(f){lb.firstChild.src=f.dataset.zoom;lb.classList.add('on');return}
    if(e.target.closest('.lbx'))lb.classList.remove('on');
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')lb.classList.remove('on')});

  /* 성공사례 목록: 분류·담당 변호사·검색·더 보기 */
  const grid=document.querySelector('[data-cases]');
  if(grid){
    const cards=[...grid.children],btns=[...document.querySelectorAll('.filters [data-f]')],q=document.querySelector('.filters input'),more=document.querySelector('.loadmore button'),tag=document.querySelector('[data-ltag]');
    const P=new URLSearchParams(location.search);
    let f=P.get('c')||'all',lw=P.get('l')||'',limit=12;
    function apply(anim){
      const s=(q&&q.value||'').trim().toLowerCase();
      const hit=cards.filter(c=>(f==='all'||c.dataset.c===f)&&(!lw||(' '+c.dataset.l+' ').includes(' '+lw+' '))&&(!s||c.dataset.q.includes(s)));
      cards.forEach(c=>c.classList.add('hide'));
      const show=hit.slice(0,limit);show.forEach(c=>c.classList.remove('hide'));
      if(more)more.parentElement.style.display=hit.length>limit?'':'none';
      btns.forEach(b=>b.classList.toggle('on',b.dataset.f===f));
      if(tag){tag.style.display=lw?'':'none';}
      if(anim&&!calm)gsap.fromTo(show.slice(anim==='more'?limit-12:0),{opacity:0,y:34},{opacity:1,y:0,duration:.7,stagger:.05,ease:'power3.out'});
      ScrollTrigger.refresh();
    }
    btns.forEach(b=>b.onclick=()=>{f=b.dataset.f;limit=12;apply(true)});
    if(q)q.addEventListener('input',()=>{limit=12;apply(false)});
    if(more)more.onclick=()=>{limit+=12;apply('more')};
    const clr=document.querySelector('[data-lclear]');if(clr)clr.onclick=e=>{e.preventDefault();lw='';history.replaceState(null,'',location.pathname);apply(true)};
    if(tag&&lw){const n=tag.querySelector('b');const nm=document.querySelector(`[data-lname="${lw}"]`);if(n&&nm)n.textContent=nm.dataset.name}
    apply(true);
  }
  /* 상담 신청서 (시안: 전송 안 함) */
  document.querySelectorAll('form.sheet').forEach(fm=>fm.addEventListener('submit',e=>{e.preventDefault();fm.querySelector('.msg').style.display='block'}));
})();
