/* 부비 칼럼 조회수 — 표시용 기준치(seed) + 시간 자연증가 + 실제 조회수(Firestore) 합산
   · 글 페이지: 세션당 1회 실제 +1, 상단 메타에 "12,431 view" 표시
   · 칼럼 허브(column.html): 모든 카드에 조회수 배지 + 🔥 지금 인기 글 상단 자동 노출
   표시 조회수 = seed(글별 고정 기준치) + 일자별 자연증가 + 실제 누적 조회수 */
(function(){
  var CFG={apiKey:"AIzaSyCmz6mI6a8zPWQrsv4AKSTCGpxtdrwZ2Ow",authDomain:"hwon-ai.firebaseapp.com",projectId:"hwon-ai",appId:"1:5783272455:web:d5c9215d615894ee7abea2"};
  function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  function ensureFS(){
    return new Promise(function(res,rej){
      if(window.firebase&&firebase.firestore){ if(!firebase.apps.length) firebase.initializeApp(CFG); res(); return; }
      var p=(window.firebase&&firebase.initializeApp)?Promise.resolve():load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      p.then(function(){return load('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js');})
       .then(function(){ if(!firebase.apps.length) firebase.initializeApp(CFG); res(); }).catch(rej);
    });
  }
  function slug(path){ var p=(path||location.pathname).replace(/^\//,'').replace(/\.html$/,''); return p||'index'; }
  function comma(n){ n=Math.round(n||0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }

  /* 결정론적 해시 → 글별 고정 기준치 */
  function hash(s){ var h=2166136261>>>0; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }

  /* 화제·핵심 글: 확실히 높게 노출 */
  var HOT={
    'jupjup-gangdong-prestigeone':1,'seller-financing':1,'seller-financing-guide':1,
    'seller-financing-calc':1,'family-corp-tax':1,'jangma-house-check':1,
    'policy-finder':1,'home-report':1,'jeonse-fraud':1,'acquisition-tax-guide':1,
    'gift-tax-guide':1,'cheongyak-guide':1
  };
  var DAY=86400000, LIVE_SINCE=20470; /* 일 인덱스(≈2026-01) 이후 자연증가 시작 */
  function seed(s){
    var h=hash(s);
    var base=6200 + (h % 9300);               /* 6,200 ~ 15,500 자연 편차 */
    if(HOT[s]) base += 12000 + (h>>7)%9000;   /* 화제 글 +12k~21k → 확실히 1만 이상 */
    var today=Math.floor(Date.now()/DAY);
    var perDay=14 + (h>>3)%42;                 /* 하루 14~55회씩 자연 증가 */
    base += Math.max(0, today-LIVE_SINCE)*perDay;
    return base;
  }
  function total(s, real){ return seed(s) + (real||0); }

  var isArticle = !!document.querySelector('meta[property="og:type"][content="article"]') || !!document.querySelector('article.post');
  var PIN='semiconductor-bonus-guide'; // 한동안 인기글 1위 고정 (해제: 이 줄과 PIN 사용부 2곳 제거)
  var isHub = /(^|\/)column\.html$/.test(location.pathname) || !!document.getElementById('popularCols');

  /* ---------- 글 페이지: 실제 조회 +1, 합산 표시 ---------- */
  function runArticle(){
    var s=slug(), key='cv_'+s, counted=false;
    try{ counted=sessionStorage.getItem(key)==='1'; }catch(e){}
    show(total(s,0)); /* 즉시 표시(네트워크 지연 무관) */
    ensureFS().then(function(){
      var db=firebase.firestore(), ref=db.collection('columnViews').doc(s);
      var title=(document.querySelector('h1')&&document.querySelector('h1').textContent.trim())||document.title;
      var done;
      if(!counted){
        done=ref.set({count:firebase.firestore.FieldValue.increment(1),title:title,path:location.pathname,updatedAt:Date.now()},{merge:true})
          .then(function(){ try{sessionStorage.setItem(key,'1');}catch(e){} return ref.get(); });
      }else{ done=ref.get(); }
      done.then(function(snap){ var real=(snap.exists&&snap.data().count)||0; show(total(s,real)); }).catch(function(){});
    }).catch(function(){});
  }
  function badgeHost(){
    return document.querySelector('article .meta')||document.querySelector('.meta')
      ||document.querySelector('article .sub')||document.querySelector('.post-meta');
  }
  function show(n){
    var host=badgeHost();
    if(!host){
      var h1=document.querySelector('article h1')||document.querySelector('h1');
      if(!h1) return;
      host=document.createElement('div'); host.className='meta cvAuto';
      host.style.cssText='font-size:.84rem;color:#7b918f;margin:6px 0 4px';
      h1.parentNode.insertBefore(host, h1.nextSibling);
    }
    var b=host.querySelector('.cvBadge');
    if(!b){ if(host.childNodes.length && !host.classList.contains('cvAuto')) host.appendChild(document.createTextNode(' · '));
      b=document.createElement('span'); b.className='cvBadge'; b.style.cssText='color:#20A6A2;font-weight:600'; host.appendChild(b); }
    b.textContent=comma(n)+' view';
  }

  /* ---------- 칼럼 허브: 전 카드 배지 + 인기 글 상단 노출 ---------- */
  function runHub(){
    render({}); /* seed만으로 즉시 렌더 */
    ensureFS().then(function(){
      firebase.firestore().collection('columnViews').get().then(function(qs){
        var map={}; qs.forEach(function(d){ map[d.id]=(d.data().count)||0; });
        render(map);
      }).catch(function(){});
    }).catch(function(){});
  }
  function cardSlug(a){ return slug(a.getAttribute('href')); }
  function render(map){
    var links=[].slice.call(document.querySelectorAll('a.card[href], a.feature[href], a.brow[href]'));
    var items=[];
    links.forEach(function(a){
      var href=a.getAttribute('href');
      if(!href||/^(http|#|mailto)/.test(href)) return;
      var s=cardSlug(a); if(!s) return;
      var n=total(s, map[s]);
      if(a.classList.contains('brow')){
        var bv=a.querySelector('.bv');
        if(bv) bv.textContent=comma(n);
      }else{
        var b=a.querySelector('.cvCard');
        if(!b){ b=document.createElement('div'); b.className='cvCard';
          b.style.cssText='margin-top:6px;font-size:.76rem;color:#7b918f;font-weight:600'; a.appendChild(b); }
        b.textContent=comma(n)+' view';
      }
      var title=(a.querySelector('.bt')||a.querySelector('h3')||a.querySelector('h2'));
      items.push({slug:s, n:n, path:href, title:title?title.textContent.trim():s});
    });
    renderPopular(items);
  }
  function renderPopular(items){
    var host=document.getElementById('popularCols');
    if(!host || !items.length) return;
    var seen={}, uniq=[];
    items.sort(function(a,b){return b.n-a.n;}).forEach(function(it){ if(seen[it.slug])return; seen[it.slug]=1; uniq.push(it); });
    uniq.sort(function(a,b){return (b.slug===PIN?1:0)-(a.slug===PIN?1:0);});
    var top=uniq.slice(0,5);
    var h='<h2 class="sec" style="display:flex;align-items:center;gap:6px">🔥 지금 인기 글</h2><ul class="blist">';
    top.forEach(function(it,i){
      var medal=['🥇','🥈','🥉','4위','5위'][i];
      h+='<li><a class="brow" href="'+it.path+'"><span class="bk">'+medal+'</span><span class="bt">'+esc(it.title)+'</span><span class="bv">'+comma(it.n)+'</span></a></li>';
    });
    h+='</ul>';
    host.innerHTML=h;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  /* ---------- 홈 랭킹 카드 (#bbRankList): column.html 목록 + 조회수 합산 상위 5 ---------- */
  function runHomeRank(){
    var host=document.getElementById('bbRankList'); if(!host) return;
    fetch('/column.html').then(function(r){return r.text();}).then(function(html){
      var doc=new DOMParser().parseFromString(html,'text/html');
      var metas={};
      [].slice.call(doc.querySelectorAll('a.brow[href], a.feature[href]')).forEach(function(a){
        var href=a.getAttribute('href'); if(!href||/^(http|#|mailto)/.test(href)) return;
        var sg=slug(href); if(!sg||metas[sg]) return;
        var t=a.querySelector('.bt')||a.querySelector('h2');
        metas[sg]={path:href,title:(t?t.textContent:sg).trim()};
      });
      function draw(map){
        var items=Object.keys(metas).map(function(sg){ return {s:sg,n:total(sg,map[sg]),m:metas[sg]}; });
        items.sort(function(a,b){return b.n-a.n;});
        items.sort(function(a,b){return (b.s===PIN?1:0)-(a.s===PIN?1:0);});
        host.innerHTML=items.slice(0,5).map(function(it,i){
          var md=['🥇','🥈','🥉','4','5'][i];
          return '<li><a href="'+it.m.path+'"><em>'+md+'</em><span>'+esc(it.m.title)+'</span><b>'+comma(it.n)+'</b></a></li>';
        }).join('');
      }
      draw({});
      ensureFS().then(function(){
        firebase.firestore().collection('columnViews').get().then(function(qs){
          var map={}; qs.forEach(function(d){ map[d.id]=(d.data().count)||0; }); draw(map);
        }).catch(function(){});
      }).catch(function(){});
    }).catch(function(){ host.innerHTML='<li class="ldg">집계 준비 중이에요</li>'; });
  }

  function boot(){ if(isArticle) runArticle(); if(isHub) runHub(); runHomeRank(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
