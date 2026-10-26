/* Independent Wikimedia Commons slideshow; does not touch route/map sources. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.JapanPhotoGallery=api;api.mount(root.document,root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function valid(p){
    return !!(p&&typeof p.id==='string'&&typeof p.destination_id==='string'&&
      Number.isInteger(p.day)&&p.day>=1&&p.day<=14&&
      ['title','region','caption','alt','author','license'].every(k=>typeof p[k]==='string'&&p[k].length>0)&&
      typeof p.src==='string'&&p.src.startsWith('https://thumb.wikimedia.org/wikipedia/commons/thumb/')&&
      typeof p.source==='string'&&p.source.startsWith('https://commons.wikimedia.org/wiki/File:')&&
      typeof p.license_url==='string'&&p.license_url.startsWith('https://creativecommons.org/'));
  }
  function selectValid(data){
    const seen=new Set();
    return (Array.isArray(data?.photos)?data.photos:[]).filter(p=>{
      if(!valid(p)||seen.has(p.id))return false;seen.add(p.id);return true;
    });
  }
  function mount(doc,host){
    const $=id=>doc.getElementById(id),panel=$('photo-gallery');
    if(!panel)return null;
    const stage=$('gallery-stage'),img=$('gallery-image'),dots=$('gallery-dots');
    const prev=$('gallery-prev'),next=$('gallery-next'),play=$('gallery-play');
    const status=$('gallery-status'),mapLink=$('gallery-map-link');
    let slides=[],at=0,loaded=false,timer=null,hover=false,focused=false,visible=typeof host.IntersectionObserver!=='function';
    const bad=new Set(),reduced=!!host.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let playing=!reduced;
    function stop(){if(timer!==null)host.clearInterval?.(timer);timer=null;}
    function refreshTimer(){
      stop();
      if(playing&&loaded&&visible&&!doc.hidden&&!hover&&!focused&&slides.length>1&&typeof host.setInterval==='function')
        timer=host.setInterval(()=>step(1),8500);
    }
    function updatePlay(){
      play.textContent=playing?'Pause slideshow':'Play slideshow';
      play.setAttribute('aria-pressed',String(playing));
      stage.setAttribute('aria-live',playing?'off':'polite');
    }
    function unavailable(message){
      stop();panel.classList.add('gallery-unavailable');
      img.removeAttribute('src');img.alt='';
      $('gallery-title').textContent='Japan in photographs';
      $('gallery-caption').textContent=message;
      status.textContent=message;prev.disabled=true;next.disabled=true;play.disabled=true;
    }
    function show(i){
      if(!slides[i]||bad.has(slides[i].id))return;
      at=i;loaded=false;stop();
      const p=slides[i];
      panel.classList.remove('gallery-unavailable');
      $('gallery-region').textContent='Day '+p.day+' · '+p.region;
      $('gallery-title').textContent=p.title;
      $('gallery-caption').textContent=p.caption;
      $('gallery-count').textContent=(i+1)+' / '+slides.length;
      $('gallery-photographer').textContent=p.author;
      $('gallery-photographer').href=p.source;
      $('gallery-license').textContent=p.license;
      $('gallery-license').href=p.license_url;
      $('gallery-source').href=p.source;
      mapLink.href='#day='+p.day;
      mapLink.textContent='Explore Day '+p.day+' on map';
      img.alt=p.alt;img.src=p.src;
      status.textContent=p.title;
      for(const dot of dots.children){
        const active=Number(dot.dataset.index)===i;
        dot.classList.toggle('active',active);
        dot.setAttribute('aria-current',active?'true':'false');
      }
      updatePlay();
    }
    function step(direction){
      if(!slides.length)return;
      for(let n=1;n<=slides.length;n++){
        const candidate=(at+direction*n+slides.length*n)%slides.length;
        if(!bad.has(slides[candidate].id)){show(candidate);return;}
      }
      unavailable('Photographs could not be loaded. The map and itinerary still work.');
    }
    function setPlaying(value){playing=!!value;updatePlay();refreshTimer();}
    img.addEventListener('load',()=>{
      loaded=true;refreshTimer();
      if(host.navigator?.connection?.saveData||typeof host.Image!=='function')return;
      const nextSlide=slides[(at+1)%slides.length];
      if(nextSlide&&!bad.has(nextSlide.id)){const preload=new host.Image();preload.src=nextSlide.src;}
    });
    img.addEventListener('error',()=>{
      if(!slides.length)return;
      bad.add(slides[at].id);
      if(bad.size===slides.length)unavailable('Photographs are temporarily unavailable.');
      else step(1);
    });
    prev.addEventListener('click',()=>step(-1));
    next.addEventListener('click',()=>step(1));
    play.addEventListener('click',()=>setPlaying(!playing));
    panel.addEventListener('mouseenter',()=>{hover=true;refreshTimer();});
    panel.addEventListener('mouseleave',()=>{hover=false;refreshTimer();});
    panel.addEventListener('focusin',()=>{focused=true;refreshTimer();});
    panel.addEventListener('focusout',event=>{
      if(!panel.contains(event.relatedTarget)){focused=false;refreshTimer();}
    });
    stage.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();step(event.key==='ArrowRight'?1:-1);
      }
    });
    let touchStart=null;
    stage.addEventListener('touchstart',event=>{touchStart=event.changedTouches?.[0]?.screenX??null;},{passive:true});
    stage.addEventListener('touchend',event=>{
      const end=event.changedTouches?.[0]?.screenX;
      if(touchStart===null||!Number.isFinite(end))return;
      const diff=end-touchStart;touchStart=null;
      if(Math.abs(diff)>55)step(diff<0?1:-1);
    },{passive:true});
    doc.addEventListener('visibilitychange',refreshTimer);
    mapLink.addEventListener('click',()=>{
      doc.getElementById('map')?.scrollIntoView?.({behavior:reduced?'auto':'smooth',block:'center'});
    });
    if(typeof host.IntersectionObserver==='function'){
      const observer=new host.IntersectionObserver(entries=>{
        visible=entries.some(e=>e.isIntersecting&&e.intersectionRatio>=0.15);
        refreshTimer();
      },{threshold:[0,0.15,0.4]});
      observer.observe(panel);
    }
    updatePlay();
    host.fetch('./data/photos.json',{cache:'default'})
      .then(r=>{if(!r.ok)throw Error('Photo manifest unavailable');return r.json();})
      .then(data=>{
        slides=selectValid(data);
        if(!slides.length){unavailable('No photographs are currently available.');return;}
        const controls=slides.map((p,i)=>{
          const b=doc.createElement('button');
          b.type='button';b.className='gallery-dot';b.dataset.index=String(i);
          b.setAttribute('aria-label','Show photo '+(i+1)+': '+p.title);
          b.addEventListener('click',()=>show(i));return b;
        });
        dots.replaceChildren(...controls);
        show(0);
      })
      .catch(e=>{console.warn('Slideshow unavailable:',e);unavailable('Photos are currently unavailable.');});
    return {get length(){return slides.length},get index(){return at},get playing(){return playing},step,setPlaying,stop};
  }
  return {valid,selectValid,mount};
});
