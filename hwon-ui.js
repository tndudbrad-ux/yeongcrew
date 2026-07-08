/* 훤 UI 폴리시 — 금액 입력 한글 힌트 */
(function(){
function readMan(v){
  v=Math.round(v);
  if(!isFinite(v)||v<=0) return '';
  var jo=Math.floor(v/100000000), rest=v%100000000;
  var eok=Math.floor(rest/10000), man=rest%10000, parts=[];
  if(jo>0) parts.push(jo.toLocaleString('ko-KR')+'조');
  if(eok>0) parts.push(eok.toLocaleString('ko-KR')+'억');
  if(man>0){
    if(man%1000===0) parts.push((man/1000)+'천만원');
    else parts.push(man.toLocaleString('ko-KR')+'만원');
  } else if(parts.length) parts[parts.length-1]+='원';
  return parts.join(' ');
}
function labelText(inp){
  var el=inp.previousElementSibling;
  while(el){ if(el.tagName==='LABEL') return el.innerText; el=el.previousElementSibling; }
  var p=inp.parentElement;
  if(p){ var l=p.querySelector('label'); if(l) return l.innerText; }
  return '';
}
function attach(inp){
  var t=labelText(inp), ph=inp.placeholder||'';
  if(!/만원/.test(t) && !/억/.test(ph)) return;
  var hint=document.createElement('div');
  hint.className='hwHint';
  inp.insertAdjacentElement('afterend',hint);
  function upd(){
    var v=parseFloat(inp.value);
    var s=v>0?readMan(v):'';
    hint.textContent=s;
    hint.classList.toggle('on',!!s);
  }
  inp.addEventListener('input',upd);
  upd();
}
function init(){ document.querySelectorAll('input.f[type=number], input.f[type=text][inputmode=numeric]').forEach(attach); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
(function(){
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function initReveal(){
  if(reduce||!('IntersectionObserver' in window))return;
  var els=document.querySelectorAll('.card,.tool-box,.faq,.rel,article.post');
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('hwIn'); io.unobserve(e.target); } });
  },{threshold:0.08,rootMargin:'0px 0px -6% 0px'});
  els.forEach(function(el,i){
    var r=el.getBoundingClientRect();
    if(r.top<innerHeight*0.85){return;}
    el.classList.add('hwReveal');
    el.style.transitionDelay=Math.min((i%4)*60,180)+'ms';
    io.observe(el);
  });
}
function initCountUp(){
  if(reduce)return;
  document.querySelectorAll('.result').forEach(function(res){
    new MutationObserver(function(){
      if(!res.classList.contains('show'))return;
      var big=res.querySelector('.big');
      if(!big||big.dataset.hwc===big.textContent)return;
      var txt=big.textContent, m=txt.match(/^([0-9,]{4,})/);
      big.dataset.hwc=txt;
      if(!m)return;
      var target=parseInt(m[1].replace(/,/g,'')), rest=txt.slice(m[1].length), t0=null;
      function step(ts){
        if(!t0)t0=ts;
        var p=Math.min((ts-t0)/550,1), ease=1-Math.pow(1-p,3);
        big.textContent=Math.round(target*ease).toLocaleString('ko-KR')+rest;
        if(p<1)requestAnimationFrame(step); else big.dataset.hwc=big.textContent;
      }
      requestAnimationFrame(step);
    }).observe(res,{attributes:true,attributeFilter:['class']});
  });
  document.querySelectorAll('button.go').forEach(function(b){
    b.addEventListener('click',function(){ b.classList.remove('hwPress'); void b.offsetWidth; b.classList.add('hwPress'); });
  });
}
function initRates(){
  if(location.pathname.indexOf('mortgage-basics')<0)return;
  var h=[].slice.call(document.querySelectorAll('h2')).filter(function(x){return /고정금리/.test(x.innerText)})[0];
  if(!h)return;
  var anchor=h, cur=h.nextElementSibling;
  while(cur && cur.tagName!=='H2'){ anchor=cur; cur=cur.nextElementSibling; }
  fetch('/rates.json?nc='+Math.floor(Date.now()/3600000)).then(function(r){return r.json();}).then(function(d){
    var box=document.createElement('div');
    box.className='hwRates';
    var html='<h4>📊 지금 금리는? <span class="upd">'+d.updated+' 업데이트 · 매주 자동 갱신</span></h4><div class="hwRatesGrid">';
    d.items.forEach(function(it){
      var arrow=it.dir==='up'?'▲ ':(it.dir==='down'?'▼ ':'');
      html+='<div class="hwRateCard"><div class="nm">'+it.flag+' '+it.name+'</div><div class="rt">'+it.rate+'</div><div class="ch '+it.dir+'">'+arrow+it.change+'</div><div class="as">'+it.asof+'</div></div>';
    });
    html+='</div><div class="nt">💡 '+d.note+'</div>';
    box.innerHTML=html;
    anchor.insertAdjacentElement('afterend',box);
  }).catch(function(){});
}
function boot(){ initReveal(); initCountUp(); initRates(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
