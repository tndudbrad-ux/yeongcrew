/* 부비 계정 v1 — Firebase Google 로그인 */
(function(){
var CFG={apiKey:"AIzaSyCmz6mI6a8zPWQrsv4AKSTCGpxtdrwZ2Ow",authDomain:"hwon-ai.firebaseapp.com",projectId:"hwon-ai",appId:"1:5783272455:web:d5c9215d615894ee7abea2"};
function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
var ready=load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
 .then(function(){return load('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');})
 .then(function(){ if(!firebase.apps.length) firebase.initializeApp(CFG); return firebase.auth(); });
/* 네비에 로그인/마이 링크 삽입 */
var link=null;
(function(){
 var nav=document.querySelector('header nav, nav.gnb');
 if(!nav) return;
 link=document.createElement('a'); link.href='/account.html'; link.id='hwAuthLink'; link.textContent='로그인';
 nav.appendChild(link);
})();
ready.then(function(auth){
 auth.onAuthStateChanged(function(u){
  window.hwonUser=u||null;
  if(link) link.textContent = u ? '마이' : '로그인';
  document.dispatchEvent(new CustomEvent('hwon-auth',{detail:u||null}));
 });
}).catch(function(e){ console.warn('hwon-auth init fail', e); });
window.hwonAuth={
 ready:function(){return ready;},
 signInGoogle:function(){
  return ready.then(function(auth){
   var p=new firebase.auth.GoogleAuthProvider();
   return auth.signInWithPopup(p).catch(function(e){
    if(e&&(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment'||e.code==='auth/popup-closed-by-user'===false)){
     return auth.signInWithRedirect(p);
    }
    throw e;
   });
  });
 },
 signOut:function(){return ready.then(function(a){return a.signOut();});}
};
})();

/* ===== 새 회원가입 알림 — 첫 로그인 시 members 기록 + 운영자 메일 ===== */
(function(){
  var W3F_KEY='WEB3FORMS_ACCESS_KEY';   // ← web3forms.com에서 발급받은 키로 교체하면 메일 발송 시작
  function loadFS(){
    return new Promise(function(res,rej){
      if(window.firebase&&firebase.firestore){res();return;}
      var s=document.createElement('script');
      s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
      s.onload=res;s.onerror=rej;document.head.appendChild(s);
    });
  }
  function notify(d){
    if(!W3F_KEY||W3F_KEY.indexOf('WEB3FORMS')===0) return;   // 키 미설정이면 조용히 스킵
    fetch('https://api.web3forms.com/submit',{
      method:'POST',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({
        access_key:W3F_KEY,
        from_name:'부비 가입알림',
        subject:'[부비] 새 회원가입 🎉 '+(d.name||d.email||''),
        message:'새 회원이 가입했어요!\n\n이름: '+(d.name||'-')+'\n이메일: '+(d.email||'-')+'\n가입시각: '+d.createdAt+'\n첫 진입 페이지: '+d.firstPage
      })
    }).catch(function(){});
  }
  document.addEventListener('hwon-auth',function(e){
    var u=e.detail; if(!u) return;
    if(window.__memberChecked) return; window.__memberChecked=1;
    loadFS().then(function(){
      var ref=firebase.firestore().collection('members').doc(u.uid);
      return ref.get().then(function(snap){
        if(snap.exists) return;                                // 기존 회원이면 아무것도 안 함
        var d={uid:u.uid,email:u.email||'',name:u.displayName||'',
               createdAt:new Date().toISOString(),firstPage:location.pathname};
        return ref.set(d).then(function(){
          if(window.gtag){try{gtag('event','sign_up',{method:'google'});}catch(x){}}
          notify(d);
        });
      });
    }).catch(function(err){ console.warn('member record fail',err); });
  });
})();

/* ===== 부비 칼럼 로그인 게이트 — 회원 전용 이어읽기 (과금 아님) ===== */
(function(){
  var m=document.querySelector('meta[property="og:type"]');
  if(!(m && m.content==='article')) return;           // 칼럼(article)만 대상
  var decided=false, walled=false;
  function injectStyle(){
    if(document.getElementById('boobiGateStyle'))return;
    var st=document.createElement('style'); st.id='boobiGateStyle';
    st.textContent=
     '.boobiGateRest{position:relative;max-height:150px;overflow:hidden}'+
     '.boobiGateRest::after{content:"";position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(180deg,rgba(240,250,248,0),var(--cream,#F0FAF8) 94%);pointer-events:none}'+
     '.boobiGateWall{margin:8px 0 22px;padding:26px 22px;border:1px solid #B5E4E1;border-radius:18px;background:linear-gradient(120deg,#EAFAF8,#F4FBFA);text-align:center}'+
     '.boobiGateWall .lk{font-size:1.7rem}'+
     '.boobiGateWall h3{font-size:1.12rem;font-weight:800;margin:6px 0 4px;color:#0D2A29}'+
     '.boobiGateWall p{font-size:.92rem;color:#547471;margin-bottom:16px;line-height:1.6}'+
     '.boobiGateBtn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#33CCC7,#20A6A2);color:#fff;font-weight:800;font-size:1rem;padding:13px 26px;border:none;border-radius:12px;cursor:pointer;font-family:inherit;box-shadow:0 6px 18px rgba(42,193,188,.32)}'+
     '.boobiGateNote{font-size:.8rem;color:#8aa5a2;margin-top:12px}'+
     'body.boobi-unlocked .boobiGateRest{max-height:none;overflow:visible}'+
     'body.boobi-unlocked .boobiGateRest::after{display:none}'+
     'body.boobi-unlocked .boobiGateWall{display:none}';
    document.head.appendChild(st);
  }
  function unlock(){ document.body.classList.add('boobi-unlocked'); }
  function wall(){
    if(walled) return;
    var art=document.querySelector('article'); if(!art) return;
    var kids=Array.prototype.slice.call(art.children);
    var h2=0, cut=-1;
    for(var i=0;i<kids.length;i++){ if(kids[i].tagName==='H2'){h2++; if(h2===2){cut=i;break;}} }
    if(cut===-1) cut=Math.max(3, Math.floor(kids.length*0.4));
    if(kids.length-cut < 2) return;                     // 너무 짧으면 게이트 안 함
    walled=true; injectStyle();
    var rest=document.createElement('div'); rest.className='boobiGateRest';
    art.insertBefore(rest, kids[cut]);
    for(var j=cut;j<kids.length;j++){ rest.appendChild(kids[j]); }
    var wl=document.createElement('div'); wl.className='boobiGateWall';
    wl.innerHTML='<div class="lk">🔒</div><h3>로그인하면 이어서 읽을 수 있어요</h3>'+
      '<p>부비 회원이면 모든 칼럼을 무료로 끝까지 볼 수 있어요.<br>구글 계정으로 3초면 시작돼요.</p>'+
      '<button class="boobiGateBtn" id="boobiGateBtn">🅶 구글로 로그인하고 계속 읽기</button>'+
      '<div class="boobiGateNote">지금은 무료예요 · 로그인만 하면 전체 공개</div>';
    rest.parentNode.insertBefore(wl, rest.nextSibling);
    document.getElementById('boobiGateBtn').onclick=function(){ if(window.hwonAuth) hwonAuth.signInGoogle(); };
  }
  document.addEventListener('hwon-auth',function(e){ decided=true; if(e.detail) unlock(); else wall(); });
  function boot(){ if(window.hwonUser){decided=true;unlock();} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  setTimeout(function(){ if(!decided){ if(window.hwonUser) unlock(); else wall(); } }, 1600);
})();

/* ===== Google Analytics 4 — 부비 방문·유입 측정 (측정 ID G-2KYCGVDL67) ===== */
(function(){
  if(window.__gaInit)return; window.__gaInit=1;
  var s=document.createElement('script'); s.async=true;
  s.src='https://www.googletagmanager.com/gtag/js?id=G-2KYCGVDL67';
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('js', new Date());
  gtag('config', 'G-2KYCGVDL67');
})();
