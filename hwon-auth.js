/* ===== 공통 스크립트 자동 로딩 — 페이지마다 빠뜨려도 사이트 전체 일관 적용 ===== */
(function(){
function has(re){ return [].some.call(document.scripts, function(s){ return re.test(s.src||''); }); }
function add(src){ var s=document.createElement('script'); s.src=src; s.defer=true; document.head.appendChild(s); }
if(!has(/hwon-ui\.js/)) add('/hwon-ui.js');                 // 금액 힌트·애니메이션 등 UI 공통
if(!has(/boobi-survey\.js/)) add('/boobi-survey.js?v=1'); // 가입 기대 설문 모달 (미응답 유저 1회)
var art=document.querySelector('meta[property="og:type"][content="article"]')||document.querySelector('article');
var hub=/column\.html$/.test(location.pathname)||document.getElementById('popularCols');
if((art||hub) && !has(/column-views\.js/)) add('/column-views.js?v=2'); // 조회수 배지·인기글: 모든 칼럼/글에 자동
if(art && !has(/boobi-article-share\.js/)) add('/boobi-article-share.js?v=1'); // 공유 바: 모든 칼럼/글에 자동 (클린 URL 공유)
})();

/* 부비 계정 v1 — Firebase Google 로그인 */
(function(){
var CFG={apiKey:"AIzaSyCmz6mI6a8zPWQrsv4AKSTCGpxtdrwZ2Ow",authDomain:"hwon-ai.firebaseapp.com",projectId:"hwon-ai",appId:"1:5783272455:web:d5c9215d615894ee7abea2"};
function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
var ready=load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
.then(function(){return load('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');})
.then(function(){ if(!firebase.apps.length) firebase.initializeApp(CFG); return firebase.auth(); });
/* 상단탭을 6개로 통일 + 로그인/마이 링크 삽입 */
var link=null;
(function(){
var nav=document.querySelector('header nav, nav.gnb');
if(!nav) return;
var items=[['/tools.html','AI진단'],['/calculator.html','계산기'],['/rental-board.html','청년·신혼부부'],['/senior.html','시니어'],['/invest.html','투자'],['/column.html','칼럼']];
var here=location.pathname.replace(/^\//,'').replace(/index\.html$/,'');
nav.innerHTML='';
items.forEach(function(it){
var a=document.createElement('a'); a.href=it[0]; a.textContent=it[1];
var slug=it[0].replace(/^\//,'').replace(/\.html$/,'');
if(here && (here===slug+'.html' || here.indexOf(slug)===0)) a.className='on';
/* 경매 등 투자 하위 페이지는 '투자' 탭 활성화 */
if(slug==='invest' && (here.indexOf('auction')===0)) a.className='on';
nav.appendChild(a);
});
link=document.createElement('a'); link.href='/account.html'; link.id='hwAuthLink'; link.textContent='로그인';
nav.appendChild(link);

/* ===== 모바일 햄버거 메뉴 =====
 * 좁은 화면에선 페이지 CSS가 nav를 숨겨 진입로가 없었음 → 햄버거 버튼 + 드롭다운으로 전 페이지 일괄 해결 */
var header=nav.closest('header')||document.querySelector('header');
if(header){
  var mcss=document.createElement('style');
  mcss.textContent='#hwMenuBtn{display:none;width:42px;height:42px;border:none;background:none;cursor:pointer;padding:7px;margin-left:auto;flex:0 0 auto}'
   +'#hwMenuBtn span{display:block;width:22px;height:2.5px;background:#20A6A2;border-radius:2px;margin:4.5px auto;transition:.22s}'
   +'#hwMenuBtn.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}'
   +'#hwMenuBtn.open span:nth-child(2){opacity:0}'
   +'#hwMenuBtn.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}'
   +'@media(max-width:700px){#hwMenuBtn{display:block}header nav,nav.gnb{display:none!important}}'
   +'#hwMobileMenu{display:none;position:fixed;left:0;right:0;background:#fff;border-bottom:1px solid #DCEEEC;box-shadow:0 16px 32px rgba(13,42,41,.14);z-index:97;max-height:calc(100vh - 70px);overflow:auto}'
   +'#hwMobileMenu.open{display:block}'
   +'#hwMobileMenu a{display:block;padding:14px 24px;border-top:1px solid #F0F7F6;font-size:.97rem;color:#0D2A29;font-weight:500;text-decoration:none}'
   +'#hwMobileMenu a:active{background:#F3FBFA}'
   +'#hwMobileMenu a.on{color:#20A6A2;font-weight:700}';
  document.head.appendChild(mcss);
  var mbtn=document.createElement('button'); mbtn.id='hwMenuBtn'; mbtn.type='button'; mbtn.setAttribute('aria-label','메뉴 열기');
  mbtn.innerHTML='<span></span><span></span><span></span>';
  (nav.parentElement||header).appendChild(mbtn);
  var menu=document.createElement('div'); menu.id='hwMobileMenu';
  items.concat([['/account.html','👤 로그인 · 마이페이지']]).forEach(function(it){
    var a=document.createElement('a'); a.href=it[0]; a.textContent=it[1];
    var slug=it[0].replace(/^\//,'').replace(/\.html$/,'');
    if(here && here.indexOf(slug)===0) a.className='on';
    menu.appendChild(a);
  });
  document.body.appendChild(menu);
  mbtn.addEventListener('click',function(e){
    e.stopPropagation();
    menu.style.top=header.getBoundingClientRect().bottom+'px';
    menu.classList.toggle('open');
    mbtn.classList.toggle('open',menu.classList.contains('open'));
  });
  document.addEventListener('click',function(e){
    if(menu.classList.contains('open')&&!menu.contains(e.target)&&!mbtn.contains(e.target)){
      menu.classList.remove('open'); mbtn.classList.remove('open');
    }
  });
}
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
var W3F_KEY='68b3267b-477a-4017-960f-d80077190c01'; // web3forms 공개 액세스 키(클라이언트 임베드용)
function loadFS(){
return new Promise(function(res,rej){
if(window.firebase&&firebase.firestore){res();return;}
var s=document.createElement('script');
s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
s.onload=res;s.onerror=rej;document.head.appendChild(s);
});
}
function notify(d){
if(!W3F_KEY||W3F_KEY.indexOf('WEB3FORMS')===0) return; // 키 미설정이면 조용히 스킵
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
if(snap.exists) return; // 기존 회원이면 아무것도 안 함
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
if(!(m && m.content==='article')) return; // 칼럼(article)만 대상
var decided=false, walled=false;
function injectStyle(){
if(document.getElementById('boobiGateStyle'))return;
var st=document.createElement('style'); st.id='boobiGateStyle';
st.textContent=
'.boobiGateRest{position:relative;max-height:360px;overflow:hidden}'+
'.boobiGateWall{margin:-230px 0 22px;position:relative;z-index:2;padding:34px 24px;border:1.5px solid rgba(255,255,255,.8);border-radius:22px;text-align:center;background:linear-gradient(135deg,rgba(255,255,255,.55),rgba(255,255,255,.3));backdrop-filter:blur(7px) saturate(1.15);-webkit-backdrop-filter:blur(7px) saturate(1.15);box-shadow:0 18px 50px rgba(13,42,41,.14),inset 0 1px 0 rgba(255,255,255,.9)}'+
'.boobiGateWall .lk{font-size:1.7rem}'+
'.boobiGateWall h3{font-size:1.12rem;font-weight:800;margin:6px 0 4px;color:#0D2A29}'+
'.boobiGateWall p{font-size:.92rem;color:#547471;margin-bottom:16px;line-height:1.6}'+
'.boobiGateBtn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);color:#fff;font-weight:800;font-size:1rem;padding:13px 26px;border:none;border-radius:999px;cursor:pointer;font-family:inherit;box-shadow:0 8px 22px rgba(61,139,253,.3);transition:.15s}'+
'.boobiGateBtn:hover{transform:translateY(-1px)}'+
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
if(kids.length-cut < 2) return; // 너무 짧으면 게이트 안 함
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
