import fs from "node:fs";

const html = fs.readFileSync(new URL("../design/boardroom-v3-final.html", import.meta.url), "utf8");
let js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");

js = js.replace(
  "var CASHFREE_CHECKOUT_URL = 'https://payments.cashfree.com/forms/boardroom'; // REPLACE with real Cashfree payment link",
  "var CASHFREE_CHECKOUT_URL = cfg.checkoutPath || '/api/checkout';",
);
js = js.replace("var VIDEOS_LIVE = false; // set to true once videos/step-01.mp4 ... step-04.mp4 are uploaded", "var VIDEOS_LIVE = true;");
js = js.replace(
  "v.preload='auto';v.src=v.getAttribute('data-src');",
  "var src=v.getAttribute('data-src')||''; if(src.charAt(0)!=='/') src='/'+src; v.preload='auto'; v.src=src;",
);
js = js.replace(
  "var LAUNCH_OFFER_ENDS = '2026-12-31T23:59:59+05:30'; // REPLACE with the real date the launch price ends",
  "var LAUNCH_OFFER_ENDS = cfg.offerEnds || '2026-12-31T23:59:59+05:30';",
);
js = js.replace(
  `document.querySelectorAll('[data-buy]').forEach(function(a){a.href=CASHFREE_CHECKOUT_URL;a.rel='noopener';});`,
  `document.querySelectorAll('[data-buy]').forEach(function(a){a.href=CASHFREE_CHECKOUT_URL;a.rel='nofollow';a.addEventListener('click',function(e){if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;e.preventDefault();var form=document.createElement('form');form.method='POST';form.action=CASHFREE_CHECKOUT_URL;document.body.appendChild(form);form.submit();});});`,
);
js = js.replace(
  `var sf=document.getElementById('siForm'),step=0;
  sf.addEventListener('submit',function(e){e.preventDefault();
    if(step===0){step=1;document.getElementById('otp').classList.add('show');document.getElementById('siGo').textContent='Sign in';sf.querySelector('.sub').textContent='Code sent. Check your inbox and type it below.';sf.querySelector('.otp input').focus();}
  });`,
  `var sf=document.getElementById('siForm'),step=0;
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
  });`,
);

const assetBlock = `var ASSETS = {
  'dept-marketing-01.gif':'/assets/dept-marketing-01.gif','dept-marketing-02.gif':'/assets/dept-marketing-02.gif','dept-marketing-03.gif':'/assets/dept-marketing-03.gif',
  'dept-support-01.gif':'/assets/dept-support-01.gif','dept-support-02.gif':'/assets/dept-support-02.gif','dept-support-03.gif':'/assets/dept-support-03.gif',
  'dept-accounts-01.gif':'/assets/dept-accounts-01.gif','dept-accounts-02.gif':'/assets/dept-accounts-02.gif','dept-accounts-03.gif':'/assets/dept-accounts-03.gif',
  'dept-ads-01.gif':'/assets/dept-ads-01.gif','dept-ads-02.gif':'/assets/dept-ads-02.gif','dept-ads-03.gif':'/assets/dept-ads-03.gif',
  'dept-seo-01.gif':'/assets/dept-seo-01.gif','dept-seo-02.gif':'/assets/dept-seo-02.gif','dept-seo-03.gif':'/assets/dept-seo-03.gif'
};`;
if (!js.includes("var ASSETS = {")) throw new Error("ASSETS block missing");
js = js.replace(/var ASSETS = \{[\s\S]*?\};/, assetBlock);

const wrapped = `window.startLanding = function (cfg) {
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
      if (el.closest('.vc-bon, .pr-bon, .bn')) return;
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
${js}
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
`;

fs.writeFileSync(new URL("../public/landing-boot.js", import.meta.url), wrapped);
console.log("boot", wrapped.length);
