/* 부비 칼럼 조회수 — Firestore columnViews/{slug}.count
   · 글 페이지: 세션당 1회 조회수 +1, 상단 메타에 "👁 N" 표시
   · 칼럼 허브(column.html): 카드에 조회수 배지 + 🔥 인기 글 TOP 섹션 */
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
  function fmt(n){ n=n||0; return n>=1000? (n/1000).toFixed(n>=10000?0:1).replace(/\.0$/,'')+'천' : String(n); }

  var isArticle = !!document.querySelector('meta[property="og:type"][content="article"]');
  var isHub = /(^|\/)column\.html$/.test(location.pathname) || document.getElementById('popularCols');

  /* ---------- 글 페이지: 조회수 카운트 + 표시 ---------- */
  function runArticle(){
    var s=slug(), key='cv_'+s, counted=false;
    try{ counted=sessionStorage.getItem(key)==='1'; }catch(e){}
    ensureFS().then(function(){
      var db=firebase.firestore(), ref=db.collection('columnViews').doc(s);
      var title=(document.querySelector('h1')&&document.querySelector('h1').textContent.trim())||document.title;
      var done;
      if(!counted){
        done=ref.set({count:firebase.firestore.FieldValue.increment(1),title:title,path:location.pathname,updatedAt:Date.now()},{merge:true})
          .then(function(){ try{sessionStorage.setItem(key,'1');}catch(e){} return ref.get(); });
      }else{
        done=ref.get();
      }
      done.then(function(snap){
        var n=(snap.exists&&snap.data().count)||0;
        show(n);
      }).catch(function(){});
    }).catch(function(){});
  }
  function show(n){
    var meta=document.querySelector('article .meta')||document.querySelector('.meta');
    if(!meta) return;
    if(meta.querySelector('.cvBadge')) { meta.querySelector('.cvBadge').textContent='👁 '+fmt(n); return; }
    var sep=document.createTextNode(' · ');
    var b=document.createElement('span'); b.className='cvBadge'; b.textContent='👁 '+fmt(n);
    b.style.cssText='color:#20A6A2;font-weight:600';
    meta.appendChild(sep); meta.appendChild(b);
  }

  /* ---------- 칼럼 허브: 카드 배지 + 인기 글 ---------- */
  function runHub(){
    ensureFS().then(function(){
      var db=firebase.firestore();
      db.collection('columnViews').get().then(function(qs){
        var map={}, items=[];
        qs.forEach(function(d){ var v=d.data(); var c=v.count||0; map[d.id]=c; items.push({slug:d.id,count:c,title:v.title||'',path:v.path||('/'+d.id+'.html')}); });
        decorateCards(map);
        renderPopular(items);
      }).catch(function(){});
    }).catch(function(){});
  }
  function decorateCards(map){
    var links=document.querySelectorAll('a.card[href], a.feature[href]');
    [].forEach.call(links,function(a){
      var s=slug(a.getAttribute('href'));
      var n=map[s]; if(n==null) return;
      if(a.querySelector('.cvCard')) return;
      var b=document.createElement('div'); b.className='cvCard'; b.textContent='👁 '+fmt(n)+' 조회';
      b.style.cssText='margin-top:6px;font-size:.76rem;color:#7b918f;font-weight:600';
      a.appendChild(b);
    });
  }
  function renderPopular(items){
    var host=document.getElementById('popularCols');
    if(!host || !items.length) return;
    items.sort(function(a,b){return b.count-a.count;});
    var top=items.slice(0,5).filter(function(x){return x.count>0;});
    if(!top.length){ host.style.display='none'; return; }
    var h='<h2 class="sec" style="display:flex;align-items:center;gap:6px">🔥 지금 인기 글</h2><div class="grid">';
    top.forEach(function(it,i){
      var medal=['🥇','🥈','🥉','4','5'][i];
      h+='<a class="card" href="'+it.path+'"><div class="k">'+medal+' · 👁 '+fmt(it.count)+'</div><h3>'+esc(it.title||it.slug)+'</h3><p>지금 많이 보는 글</p></a>';
    });
    h+='</div>';
    host.innerHTML=h;
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  function boot(){ if(isArticle) runArticle(); if(isHub) runHub(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
