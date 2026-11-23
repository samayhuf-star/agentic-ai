window.startLanding = function (cfg) {
  if (window.__brStop) window.__brStop();
  var timers = [];
  var realSetInterval = window.setInterval.bind(window);
  var realSetTimeout = window.setTimeout.bind(window);
  var realClearInterval = window.clearInterval.bind(window);
  var realClearTimeout = window.clearTimeout.bind(window);
  function setInterval(fn, ms) { var id = realSetInterval(fn, ms); timers.push(['i', id]); return id; }
  function setTimeout(fn, ms) { var id = realSetTimeout(fn, ms); timers.push(['t', id]); return id; }
  var ac = new AbortController();
  var signal = ac.signal;
  var origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    var extra = { signal: signal };
    if (opts && typeof opts === 'object') { for (var k in opts) extra[k] = opts[k]; }
    else if (opts) extra.capture = true;
    return origAdd.call(this, type, fn, extra);
  };
  try {
    var root = document.querySelector('.landing-root') || document;
    root.querySelectorAll('.amt-x').forEach(function (el) {
      if (el.closest('.vc-bon, .pr-bon, .bn, #bonuses')) return;
      var inr = el.getAttribute('data-inr') || '';
      if (inr.indexOf('4,999') !== -1) {
        el.setAttribute('data-inr', cfg.compareInrLabel);
        el.setAttribute('data-usd', cfg.compareUsdLabel);
        el.textContent = cfg.compareInrLabel;
      } else {
        el.setAttribute('data-inr', cfg.priceInrLabel);
        el.setAttribute('data-usd', cfg.priceUsdLabel);
        el.textContent = cfg.priceInrLabel;
      }
    });
    root.querySelectorAll('.faq p, .geo-note').forEach(function (p) {
      p.innerHTML = p.innerHTML.split('₹1,999').join(cfg.priceInrLabel).split('₹4,999').join(cfg.compareInrLabel);
    });
    fetch('/api/auth/me').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.href) return;
      var link = root.querySelector('[data-signin]');
      if (!link) return;
      link.textContent = 'Your dashboard';
      link.removeAttribute('data-signin');
      link.setAttribute('href', d.href);
    }).catch(function () {});


(function(){
  // FAQ accordion (one open at a time)
  document.querySelectorAll('.qa .q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var item=btn.parentElement, open=!item.classList.contains('open');
      item.parentElement.querySelectorAll('.qa.open').forEach(function(o){o.classList.remove('open');o.querySelector('.q').setAttribute('aria-expanded','false');});
      if(open){item.classList.add('open');btn.setAttribute('aria-expanded','true');}
    });
  });
  // Modals
  var last=null;
  function openM(id){var m=document.getElementById(id);document.querySelectorAll('.mdl.open').forEach(function(x){x.classList.remove('open')});last=document.activeElement;m.classList.add('open');document.body.style.overflow='hidden';var f=m.querySelector('input');if(f)setTimeout(function(){f.focus()},50);}
  function closeM(){document.querySelectorAll('.mdl.open').forEach(function(x){x.classList.remove('open')});document.body.style.overflow='';if(last&&last.focus)last.focus();}
  document.addEventListener('click',function(e){
    var s=e.target.closest('[data-signin]'); if(s){e.preventDefault();openM('signin');return;}
    if(e.target.closest('[data-close]')||e.target.classList.contains('mdl')){closeM();}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeM();});
  var sf=document.getElementById('siForm'),step=0;
  sf.addEventListener('submit',function(e){e.preventDefault();
    var btn=document.getElementById('siGo'), msg=document.getElementById('siMsg');
    var email=document.getElementById('si-email').value.trim();
    function show(text,isErr){msg.textContent=text;msg.classList.add('show');msg.classList.toggle('err',!!isErr);}
    msg.classList.remove('show','err');
    if(step===0){
      btn.disabled=true;
      fetch('/api/auth/request-code',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email})})
        .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
        .then(function(res){btn.disabled=false; if(!res.ok){show(res.d.message||'Try again in a minute.',true);return;}
          step=1; document.getElementById('otp').classList.add('show'); btn.textContent='Sign in';
          sf.querySelector('.sub').textContent=res.d.devCode?'Email is in test mode. Your code is '+res.d.devCode+'.':'Code sent. Check your inbox and type it below.';
          if(res.d.devCode) show('Your code is '+res.d.devCode+'. This only appears in test mode.',false);
          sf.querySelector('.otp input').focus();
        }).catch(function(){btn.disabled=false; show('Could not send a code. Try again.',true);});
      return;
    }
    var code=[].map.call(sf.querySelectorAll('.otp input'),function(i){return i.value;}).join('');
    btn.disabled=true;
    fetch('/api/auth/verify-code',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:email,code:code})})
      .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
      .then(function(res){btn.disabled=false; if(!res.ok){show(res.d.message||'That code did not work.',true);return;} window.location.href=res.d.redirect||'/dashboard';})
      .catch(function(){btn.disabled=false; show('Could not sign you in. Try again.',true);});
  });
  document.querySelectorAll('.otp input').forEach(function(inp,i,all){inp.addEventListener('input',function(){if(inp.value&&all[i+1])all[i+1].focus();});});
  // Mobile menu
  var mb=document.querySelector('.menu-btn'),nav=document.querySelector('.nav');
  if(mb){mb.addEventListener('click',function(){var o=nav.classList.toggle('menu-open');mb.setAttribute('aria-expanded',o);});
    nav.querySelectorAll('.nav-links a').forEach(function(a){a.addEventListener('click',function(){nav.classList.remove('menu-open');mb.setAttribute('aria-expanded','false');});});}
  // Sticky bottom bar: show after the hero
  var bar=document.querySelector('.sbar'); if(bar) bar.classList.add('show'); // always on
  // Reveal on scroll
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:.15});
    document.querySelectorAll('.rv').forEach(function(el){io.observe(el);});}
  else document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in');});
})();

// ===== Buy flow & geo-aware pricing =====
var CASHFREE_CHECKOUT_URL = cfg.checkoutPath || '/api/checkout';
var VIDEOS_LIVE = true;
(function(){
  document.querySelectorAll('[data-buy]').forEach(function(a){a.href=CASHFREE_CHECKOUT_URL;a.rel='nofollow';a.addEventListener('click',function(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();var form=document.createElement('form');form.method='POST';form.action=CASHFREE_CHECKOUT_URL;document.body.appendChild(form);form.submit();});});
  function setUSD(){document.querySelectorAll('.amt-x').forEach(function(e){e.textContent=e.getAttribute('data-usd')||'$24';});
    document.querySelectorAll('.geo-note').forEach(function(n){n.hidden=false;});document.documentElement.setAttribute('data-currency','USD');}
  var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch(e){}
  var langs=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']);
  var india=/^Asia\/(Kolkata|Calcutta)$/.test(tz)||langs.some(function(l){return /^(en|hi)-IN$/i.test(l);});
  if(!india&&window.fetch){
    var ctl=window.AbortController?new AbortController():null; if(ctl)setTimeout(function(){ctl.abort();},2000);
    fetch('https://ipapi.co/json/',ctl?{signal:ctl.signal}:{}).then(function(r){return r.json();})
      .then(function(d){if(d&&d.country_code&&d.country_code!=='IN')setUSD();}).catch(function(){/* stay on INR */});
  }
  // Step videos: load only when VIDEOS_LIVE; show once playable; on error keep the animated mock
  if(VIDEOS_LIVE){document.querySelectorAll('video.stepvid[data-src]').forEach(function(v){
    v.addEventListener('loadeddata',function(){v.classList.add('ready');if(v.play)v.play().catch(function(){});});
    v.addEventListener('error',function(){v.remove();});
    var src=v.getAttribute('data-src')||''; if(src.charAt(0)!=='/') src='/'+src; v.preload='auto'; v.src=src;});}
})();

(function(){
  // ---- live dashboard demo (example data) ----
  var tasks=[
    [["Testing a new audience: home-decor lovers","Running",""],["Found 120 lookalike buyers","Done","g"],["Wants to try a festive welcome offer","Needs yes","y"]],
    [["Drafted 3 Diwali posts","Needs yes","y"],["Writing a festive WhatsApp offer","Running",""],["Product page rewritten","Done","g"]],
    [["Checking 14 ads for waste","Running",""],["Found 2 ads that stopped working","Needs yes","y"],["Refreshed photos on 2 ads","Done","g"]],
    [["Followed up 6 abandoned carts","Done","g"],["Qualifying 9 new leads","Running",""],["Quote ready for a bulk order","Needs yes","y"]],
    [["Weekly numbers summary ready","Done","g"],["Sorting this week's returns","Running",""],["GST reminder set for Friday","Done","g"]],
    [["Answered \u201cDo you ship to Pune?\u201d","Done","g"],["Replying to 3 new reviews","Running",""],["Resolved a late-delivery complaint","Done","g"]]];
  var cards=[].slice.call(document.querySelectorAll('.ag')),k=0,run=31,done=47,yes=2,pos=[0,0,0,0,0,0];
  function bump(id,v){var e=document.getElementById(id);e.textContent=v;e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump');}
  function step(){var i=k%cards.length,c=cards[i],t=tasks[i][pos[i]++%3];k++;
    c.querySelector('.ag-t').textContent=t[0];var ch=c.querySelector('.chip');ch.textContent=t[1];ch.className='chip '+t[2];
    c.classList.add('flash');setTimeout(function(){c.classList.remove('flash');},700);
    if(t[1]==='Done'){done++;bump('cDone',done);}else{run=29+Math.floor(Math.random()*6);bump('cRun',run);}}
  cards.forEach(function(){step();});setInterval(step,1800);
  var asks=[["Mira · Content","Post 3 Diwali Reels tomorrow at 7 pm?","Drafted in your brand voice. Your last two Reels got 2× more views than usual."],
    ["Kabir · Sales","Send a friendly festive reminder to 38 shoppers who left their cart?","Message is written and ready for you to check."],
    ["Rohan · Ads","Pause 2 ads that stopped working?","They've had no clicks for a week. You can switch them back on anytime."]],ai=0,ask=document.getElementById('ask');
  function setAsk(){var a=asks[ai%asks.length];document.getElementById('askWho').textContent=a[0];document.getElementById('askT').textContent=a[1];document.getElementById('askD').textContent=a[2];ask.classList.remove('done');}
  function answer(ok){if(ask.classList.contains('done'))return;document.getElementById('askOk').textContent=ok?'Approved. Live in 2 minutes. Undo anytime.':'Skipped. Nothing was spent.';ask.classList.add('done');
    yes=Math.max(0,yes-1);bump('cYes',yes);if(ok){done++;bump('cDone',done);}setTimeout(function(){ai++;yes++;bump('cYes',yes);setAsk();},3200);}
  document.getElementById('askYes').onclick=function(){answer(true);};document.getElementById('askNo').onclick=function(){answer(false);};
  // ---- auto-cycling walkthrough tabs ----
  var tabs=[].slice.call(document.querySelectorAll('.tab')),panels=[].slice.call(document.querySelectorAll('.panel')),cur=0,DUR=8000,left=DUR,t0=Date.now(),paused=false,tl=document.getElementById('tabs');
  function show(i){cur=i;tabs.forEach(function(t,j){t.classList.toggle('on',j===i);t.setAttribute('aria-selected',j===i);var pb=t.querySelector('.pb');pb.style.animation='none';void pb.offsetWidth;pb.style.animation='';});
    panels.forEach(function(p,j){p.classList.toggle('on',j===i);});left=DUR;t0=Date.now();}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){show(i);});});
  var box=document.getElementById('panels');
  box.addEventListener('mouseenter',function(){if(!paused){paused=true;left-=Date.now()-t0;tl.classList.add('paused');}});
  box.addEventListener('mouseleave',function(){if(paused){paused=false;t0=Date.now();tl.classList.remove('paused');}});
  setInterval(function(){if(!paused&&Date.now()-t0>=left)show((cur+1)%tabs.length);},200);
})();


// ===== Launch-offer countdown: tied to a real end date, never resets on reload; hidden after expiry =====
var LAUNCH_OFFER_ENDS = cfg.offerEnds || '2026-12-31T23:59:59+05:30';
(function(){
  var end=Date.parse(LAUNCH_OFFER_ENDS),els=[].slice.call(document.querySelectorAll('[data-countdown]'));
  if(!els.length||isNaN(end))return;
  function pad(n){return (n<10?'0':'')+n;}
  function tick(){
    var ms=end-Date.now();
    if(ms<=0){els.forEach(function(e){e.hidden=true;});document.querySelectorAll('[data-offer-only]').forEach(function(e){e.hidden=true;});clearInterval(t);return;}
    var s=Math.floor(ms/1000),v={d:Math.floor(s/86400),h:Math.floor(s%86400/3600),m:Math.floor(s%3600/60),s:s%60};
    els.forEach(function(e){e.hidden=false;e.querySelectorAll('[data-cd]').forEach(function(b){b.textContent=pad(v[b.getAttribute('data-cd')]);});});
  }
  var t=setInterval(tick,1000);tick();
})();

// ===== Launch date label (from LAUNCH_OFFER_ENDS) =====
(function(){
  var d=new Date(Date.parse(LAUNCH_OFFER_ENDS));if(isNaN(d))return;
  var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var ist=new Date(d.getTime()+(330+d.getTimezoneOffset())*60000);
  document.querySelectorAll('[data-offer-date]').forEach(function(x){x.textContent=ist.getDate()+' '+mo[ist.getMonth()];});
  if(d.getTime()<=Date.now())document.querySelectorAll('[data-offer-only]').forEach(function(x){x.hidden=true;});
})();

// ===== Bonus carousel: dots + arrows =====
(function(){
  var t=document.getElementById('bnTrack');if(!t)return;
  var cards=[].slice.call(t.querySelectorAll('.bn')),dots=[].slice.call(document.querySelectorAll('#bnDots i'));
  function idx(){var l=t.scrollLeft,best=0,bd=1e9;cards.forEach(function(c,i){var d=Math.abs(c.offsetLeft-t.offsetLeft-l-parseFloat(getComputedStyle(t).paddingLeft));if(d<bd){bd=d;best=i;}});return best;}
  function upd(){var i=idx();dots.forEach(function(d,j){d.classList.toggle('on',j===i);});}
  function go(dir){var i=Math.max(0,Math.min(cards.length-1,idx()+dir));t.scrollTo({left:cards[i].offsetLeft-cards[0].offsetLeft,behavior:'smooth'});}
  t.addEventListener('scroll',function(){clearTimeout(t._u);t._u=setTimeout(upd,60);},{passive:true});
  document.getElementById('bnPrev').onclick=function(){go(-1);};document.getElementById('bnNext').onclick=function(){go(1);};
  t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();go(1);}if(e.key==='ArrowLeft'){e.preventDefault();go(-1);}});
  upd();
})();

// ===== "See exactly what you're getting": tabs (instant swap) + dashboard montage + chat =====
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.itab')),pans=[document.getElementById('ip1'),document.getElementById('ip2')];
  function show(i){tabs.forEach(function(t,j){t.classList.toggle('on',j===i);t.setAttribute('aria-selected',j===i);pans[j].hidden=j!==i;});if(i===0)fit();if(i===1)chat();}
  tabs.forEach(function(t,i){t.addEventListener('click',function(){show(i);});
    t.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();var k=(i+1)%2;tabs[k].focus();show(k);}});});
  // montage: 7 screens, ~1.9s each, Ken Burns zoom + crossfade
  var stage=document.getElementById('dmStage'),dm=document.getElementById('dm'),scr=[].slice.call(dm.querySelectorAll('.ds')),cur=0,vis=true;
  function fit(){var w=stage.clientWidth;if(w)dm.style.setProperty('--s',w/880);}
  window.addEventListener('resize',fit);fit();
  scr[0].classList.add('on');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if('IntersectionObserver' in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting;}).observe(stage);
  setInterval(function(){if(!vis||pans[0].hidden||document.hidden)return;scr[cur].classList.remove('on');cur=(cur+1)%scr.length;scr[cur].classList.add('on');},reduce?3500:1900);
  // chat: messages appear one by one, loop while visible
  var body=document.getElementById('tkBody'),msgs=[].slice.call(body.children),ct=null;
  function chat(){clearTimeout(ct);msgs.forEach(function(m){m.classList.remove('show');});var k=0;
    (function next(){if(pans[1].hidden)return;if(k<msgs.length){msgs[k++].classList.add('show');ct=setTimeout(next,k===1?300:1100);}else ct=setTimeout(chat,4000);})();}
  if(reduce)msgs.forEach(function(m){m.classList.add('show');});
})();

// ===== Real assets: drop a file next to this page and map it here to replace the CSS mock (null = keep the mock) =====
var ASSETS = {
  'dept-marketing-01.gif':'/assets/dept-marketing-01.gif','dept-marketing-02.gif':'/assets/dept-marketing-02.gif','dept-marketing-03.gif':'/assets/dept-marketing-03.gif',
  'dept-support-01.gif':'/assets/dept-support-01.gif','dept-support-02.gif':'/assets/dept-support-02.gif','dept-support-03.gif':'/assets/dept-support-03.gif',
  'dept-accounts-01.gif':'/assets/dept-accounts-01.gif','dept-accounts-02.gif':'/assets/dept-accounts-02.gif','dept-accounts-03.gif':'/assets/dept-accounts-03.gif',
  'dept-ads-01.gif':'/assets/dept-ads-01.gif','dept-ads-02.gif':'/assets/dept-ads-02.gif','dept-ads-03.gif':'/assets/dept-ads-03.gif',
  'dept-seo-01.gif':'/assets/dept-seo-01.gif','dept-seo-02.gif':'/assets/dept-seo-02.gif','dept-seo-03.gif':'/assets/dept-seo-03.gif'
}; // e.g. ASSETS['dept-marketing-01.gif'] = 'assets/dept-marketing-01.gif';
(function(){
  document.querySelectorAll('[data-asset]').forEach(function(el){var src=ASSETS[el.getAttribute('data-asset')];if(!src)return;
    var img=new Image();img.className='asset';img.alt='';img.loading='lazy';img.onload=function(){el.appendChild(img);};img.src=src;});
})();

// ===== Shared auto-slider (department carousels) =====
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-slider]').forEach(function(sl){
    var fr=[].slice.call(sl.querySelectorAll('.sl-f')),dots=[].slice.call(sl.querySelectorAll('.sl-dots button')),n=sl.querySelector('.sl-n'),cur=0,vis=false,hover=false,t0=Date.now();
    function pad(x){return (x<10?'0':'')+x;}
    function go(i){fr[cur].classList.remove('on');cur=(i+fr.length)%fr.length;void fr[cur].offsetWidth;fr[cur].classList.add('on');
      dots.forEach(function(d,j){d.classList.toggle('on',j===cur);});if(n)n.textContent=pad(cur+1)+' / '+pad(fr.length);t0=Date.now();}
    dots.forEach(function(d,j){d.addEventListener('click',function(){go(j);});});
    var x0=null;sl.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
    sl.addEventListener('touchend',function(e){if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)go(cur+(dx<0?1:-1));x0=null;});
    sl.addEventListener('mouseenter',function(){hover=true;});sl.addEventListener('mouseleave',function(){hover=false;t0=Date.now();});
    if('IntersectionObserver' in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting;if(vis)t0=Date.now();},{threshold:.35}).observe(sl);else vis=true;
    if(!reduce)setInterval(function(){if(vis&&!hover&&!document.hidden&&Date.now()-t0>3600)go(cur+1);},300);
  });
})();

  } finally {
    EventTarget.prototype.addEventListener = origAdd;
  }
  window.__brStop = function () {
    ac.abort();
    timers.forEach(function (pair) { (pair[0] === 'i' ? realClearInterval : realClearTimeout)(pair[1]); });
    window.__brStop = null;
  };
  return window.__brStop;
};
