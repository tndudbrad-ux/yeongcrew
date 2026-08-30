/* ===== 공통 스크립트 자동 로딩 — 페이지마다 빠뜨려도 사이트 전체 일관 적용 ===== */
(function(){
function has(re){ return [].some.call(document.scripts, function(s){ return re.test(s.src||''); }); }
function add(src){ var s=document.createElement('script'); s.src=src; s.defer=true; document.head.appendChild(s); }
if(!has(/hwon-ui\.js/)) add('/hwon-ui.js');                 // 금액 힌트·애니메이션 등 UI 공통
if(!has(/boobi-survey\.js/)) add('/boobi-survey.js?v=1'); // 가입 기대 설문 모달 (미응답 유저 1회)
var art=document.querySelector('meta[property="og:type"][content="article"]')||document.querySelector('article.post');
var hub=/column\.html$/.test(location.pathname)||document.getElementById('popularCols')||document.getElementById('bbRankList');
if((art||hub) && !has(/column-views\.js/)) add('/column-views.js?v=5'); // 조회수 배지·인기글·홈 랭킹: 자동
if(art && !has(/boobi-article-share\.js/)) add('/boobi-article-share.js?v=2'); // 공유 바: 모든 칼럼/글에 자동 (클린 URL 공유)
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
/* ── 2단 헤더: 1줄 = 로고 + 로그인 버튼, 2줄 = 메뉴 탭 (아파티 스타일) ── */
nav.innerHTML=''; nav.style.display='none';
var hd=nav.closest('header')||document.querySelector('header');
var wr=nav.parentElement||hd;
var hcss=document.createElement('style');
hcss.textContent='.hwLoginBtn{margin-left:auto;flex:0 0 auto;padding:8px 19px;border-radius:999px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);color:#fff!important;font-weight:700;font-size:.84rem;text-decoration:none;box-shadow:0 4px 12px rgba(61,139,253,.22);white-space:nowrap;transition:.15s}'
 +'.hwLoginBtn:hover{transform:translateY(-1px)}'
 +'#hwNavRow{display:block;border-top:1px solid #EEF5F4;background:inherit}'
 +'#hwNavRowIn{display:flex!important;justify-content:flex-start!important;align-items:center;gap:26px;height:46px!important;overflow-x:auto;scrollbar-width:none}'
 +'#hwNavRowIn::-webkit-scrollbar{display:none}'
 +'#hwNavRowIn a{position:relative;display:flex;align-items:center;height:100%;font-size:.92rem;font-weight:600;color:#547471;white-space:nowrap;text-decoration:none;transition:color .13s}'
 +'#hwNavRowIn a:hover{color:#2A7DE8}'
 +'#hwNavRowIn a.on{color:#2A7DE8;font-weight:800}'
 +'#hwNavRowIn a.on::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2.5px;border-radius:2px 2px 0 0;background:linear-gradient(90deg,#26C6B9,#3D8BFD)}'
 +'@media(max-width:700px){#hwNavRow{display:none}}';
document.head.appendChild(hcss);
link=document.createElement('a'); link.href='/account.html'; link.id='hwAuthLink'; link.className='hwLoginBtn'; link.textContent='로그인';
wr.appendChild(link);
var bar=document.createElement('nav'); bar.id='hwNavRow';
var inner=document.createElement('div'); inner.className='wrap'; inner.id='hwNavRowIn';
items.forEach(function(it){
var a=document.createElement('a'); a.href=it[0]; a.textContent=it[1];
var slug=it[0].replace(/^\//,'').replace(/\.html$/,'');
if(here && (here===slug+'.html' || here.indexOf(slug)===0)) a.className='on';
/* 경매 등 투자 하위 페이지는 '투자' 탭 활성화 */
if(slug==='invest' && (here.indexOf('auction')===0)) a.className='on';
inner.appendChild(a);
});
bar.appendChild(inner);
if(hd) hd.appendChild(bar);

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
/* 카카오 로그인 — 인가코드 교환·커스텀 토큰 발급은 인증 워커가 처리한다.
 * (카카오 REST 키·시크릿은 워커에만 있고 프론트엔드엔 없음) */
signInKakao:function(){
var rt=location.pathname+location.search;
if(rt.indexOf('/kakao-callback')===0) rt='/account';
location.href=window.HW_AUTH_API+'/kakao/start?rt='+encodeURIComponent(rt);
return new Promise(function(){});   /* 페이지가 이동하므로 resolve하지 않음 */
},
signOut:function(){return ready.then(function(a){return a.signOut();});}
};
})();

/* 부비 인증 워커 (카카오 로그인) */
window.HW_AUTH_API='https://boobi-auth.tndud-brad.workers.dev';

/* 카카오 로그인 공통 버튼 — 카카오 브랜드 가이드(노란 #FEE500 + 말풍선) 준수 */
window.HW_KAKAO_SVG='<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191600" d="M12 3C6.99 3 3 6.2 3 10.13c0 2.5 1.66 4.7 4.16 5.96-.14.5-.9 3.1-.93 3.31 0 0-.02.16.08.22.1.06.23.01.23.01.29-.04 3.36-2.2 3.9-2.58.5.07 1.02.11 1.56.11 5.01 0 9-3.2 9-7.03C21 6.2 17.01 3 12 3z"/></svg>';

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
/* 커스텀 토큰(카카오) 계정은 providerData가 비어 있다 */
var prov=(u.providerData&&u.providerData.length)?'google':'kakao';
var d={uid:u.uid,email:u.email||'',name:u.displayName||'',provider:prov,
createdAt:new Date().toISOString(),firstPage:location.pathname};
return ref.set(d).then(function(){
if(window.gtag){try{gtag('event','sign_up',{method:prov});}catch(x){}}
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
'.boobiGateBtns{display:flex;flex-direction:column;gap:9px;max-width:300px;margin:0 auto}'+
'.boobiGateBtn{display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);color:#fff;font-weight:800;font-size:.97rem;padding:13px 22px;border:none;border-radius:999px;cursor:pointer;font-family:inherit;box-shadow:0 8px 22px rgba(61,139,253,.3);transition:transform .12s ease-out;white-space:nowrap}'+
'.boobiGateBtn:hover{transform:translateY(-1px)}'+
'.boobiGateKk{display:flex;align-items:center;justify-content:center;gap:8px;background:#FEE500;color:#191600;font-weight:800;font-size:.97rem;padding:13px 22px;border:none;border-radius:999px;cursor:pointer;font-family:inherit;box-shadow:0 6px 16px rgba(13,42,41,.10);transition:transform .12s ease-out;white-space:nowrap}'+
'.boobiGateKk:hover{transform:translateY(-1px)}'+
'.boobiGateNote{font-size:.8rem;color:#8aa5a2;margin-top:12px}'+
'body.boobi-unlocked .boobiGateRest{max-height:none;overflow:visible}'+
'body.boobi-unlocked .boobiGateRest::after{display:none}'+
'body.boobi-unlocked .boobiGateWall{display:none}';
document.head.appendChild(st);
}
function unlock(){
if(walled&&window.gtag){try{gtag('event','gate_unlocked',{page:location.pathname,type:'article'});}catch(x){}}
document.body.classList.add('boobi-unlocked'); }
function wall(){
if(walled) return;
var art=document.querySelector('article'); if(!art) return;
var kids=Array.prototype.slice.call(art.children);
var h2=0, cut=-1;
for(var i=0;i<kids.length;i++){ if(kids[i].tagName==='H2'){h2++; if(h2===2){cut=i;break;}} }
if(cut===-1) cut=Math.max(3, Math.floor(kids.length*0.4));
if(kids.length-cut < 2) return; // 너무 짧으면 게이트 안 함
walled=true; injectStyle();
if(window.gtag){try{gtag('event','gate_shown',{page:location.pathname,type:'article'});}catch(x){}}
var rest=document.createElement('div'); rest.className='boobiGateRest';
art.insertBefore(rest, kids[cut]);
for(var j=cut;j<kids.length;j++){ rest.appendChild(kids[j]); }
var wl=document.createElement('div'); wl.className='boobiGateWall';
wl.innerHTML='<div class="lk">🔒</div><h3>로그인하면 이어서 읽을 수 있어요</h3>'+
'<p>부비 회원이면 모든 칼럼을 무료로 끝까지 볼 수 있어요.<br>카카오·구글 계정으로 3초면 시작돼요.</p>'+
'<div class="boobiGateBtns">'+
'<button class="boobiGateKk" id="boobiGateKk">'+(window.HW_KAKAO_SVG||'')+'카카오로 계속 읽기</button>'+
'<button class="boobiGateBtn" id="boobiGateBtn">구글로 계속 읽기</button>'+
'</div>'+
'<div class="boobiGateNote">지금은 무료예요 · 로그인만 하면 전체 공개</div>';
rest.parentNode.insertBefore(wl, rest.nextSibling);
function gclick(m){ if(window.gtag){try{gtag('event','gate_login_click',{page:location.pathname,type:'article',method:m});}catch(x){}} }
document.getElementById('boobiGateKk').onclick=function(){
gclick('kakao'); if(window.hwonAuth) hwonAuth.signInKakao(); };
document.getElementById('boobiGateBtn').onclick=function(){
gclick('google'); if(window.hwonAuth) hwonAuth.signInGoogle(); };
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

/* ===== 부비 — 신뢰 푸터: 사업자 정보·정책 링크 전 페이지 공통 주입 =====
 * ⚠️ 카드사(PG) 심사는 이 푸터를 직접 확인합니다. 아래 6가지가 전부 있어야 합니다:
 *    상호 · 대표자명 · 사업자등록번호 · 사업장 주소 · 유선번호 · 통신판매업 신고번호
 *    (유선번호는 070·0505·전국대표번호·080·휴대폰 모두 인정됩니다)
 *    값을 바꿀 때는 아래 BIZ 객체 한 곳만 고치면 전 페이지에 반영됩니다.
 */
(function(){
if(window.__bbBizFoot)return; window.__bbBizFoot=1;

var BIZ = {
  name:  '원대시투',
  ceo:   '정수영',
  regNo: '102-32-62074',
  addr:  '서울특별시 동작구 만양로 75',
  tel:   '010-6751-4513',
  mailOrder: '', // ← ★ 통신판매업 신고번호를 여기에 넣으세요. 예: '제2026-서울동작-1234호'
  email: 'tndud.brad@gmail.com'
};
window.BOOBI_BIZ = BIZ;

function init(){
  /* 본문 안의 <span data-bb-tel> / <span data-bb-mail-order> 자리도 같이 채웁니다 */
  var t = BIZ.tel || '(준비 중)';
  var m = BIZ.mailOrder || '(신고 진행 중)';
  [].forEach.call(document.querySelectorAll('[data-bb-tel]'), function(el){ el.textContent = t; });
  [].forEach.call(document.querySelectorAll('[data-bb-mail-order]'), function(el){ el.textContent = m; });

  var f=document.querySelector('footer');
  if(!f || f.querySelector('.bbBiz')) return;
  if((f.textContent||'').indexOf('사업자등록번호')>-1) return; // 이미 있는 페이지는 건너뜀
  var st=document.createElement('style');
  st.textContent='.bbBiz{margin-top:16px;padding-top:14px;border-top:1px solid rgba(127,165,162,.28);font-size:.76rem;line-height:1.9;text-align:center;opacity:.92;font-weight:300}'+
  '.bbBiz a{margin:0 7px;text-decoration:none;color:inherit;opacity:.95}.bbBiz a:hover{text-decoration:underline}'+
  '.bbBiz .ln2{opacity:.8}';
  document.head.appendChild(st);
  var d=document.createElement('div'); d.className='bbBiz';
  var hasLinks=(f.textContent||'').indexOf('이용약관')>-1; // 정책 링크가 이미 있으면 사업자 정보만
  /* 정책 링크가 이미 있더라도 '취소·환불 정책'이 빠져 있으면 그 줄만 채워 넣습니다
     (카드사 심사에서 환불 규정 링크 누락은 반려 사유입니다) */
  var needRefund = hasLinks && (f.textContent||'').indexOf('환불')===-1;
  d.innerHTML=(hasLinks?(needRefund?'<div><a href="/refund.html">취소·환불 정책</a></div>':''):'<div><a href="/about.html">소개</a>·<a href="/contact.html">문의</a>·<a href="/terms.html">이용약관</a>·<a href="/refund.html">취소·환불 정책</a>·<a href="/privacy.html">개인정보처리방침</a></div>')+
  '<div class="ln2">부비 boobi.ai.kr · 상호 '+BIZ.name+' · 대표 '+BIZ.ceo+' · 사업자등록번호 '+BIZ.regNo+
  (BIZ.mailOrder ? ' · 통신판매업신고 '+BIZ.mailOrder : '')+
  '<br>'+BIZ.addr+
  (BIZ.tel ? ' · 전화 '+BIZ.tel : '')+
  ' · 문의 '+BIZ.email+' · © 2026 '+BIZ.name+'</div>';
  f.appendChild(d);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();

/* ===== 모션·재질 공통 — Apple Fluid Interfaces 원칙의 부비 적용 =====
 * ① 버튼 press-down 즉시 피드백 ② 글래스 헤더(콘텐츠가 유리 밑으로 스크롤)
 * ③ 모달 materialize 등장 ④ 접근성: reduced-motion/transparency 폴백 */
(function(){
if(window.__bbMotion)return; window.__bbMotion=1;
var st=document.createElement('style'); st.id='bbMotionStyle';
st.textContent=
/* ① 누르는 순간 반응 (pointer-down) */
'button:not(:disabled):active,.rmBtn:active,.bbMini:active,.hwLoginBtn:active,.bbShareBtn:active,.bbHeroBtns a:active,.boobiGateBtn:active,a.go:active,.bbTools a:active,.qt:active,.card:active{transform:scale(.97);transition:transform .1s ease-out}'+
/* ② 글래스 헤더 — 반투명 + 블러, 1px 보더 대신 부드러운 경계 */
'header.top,header.site-header{background:rgba(255,255,255,.62)!important;backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:none!important;box-shadow:0 1px 0 rgba(13,42,41,.05),0 10px 28px -18px rgba(13,42,41,.16)}'+
'#hwNavRow{border-top:1px solid rgba(13,42,41,.05);background:transparent}'+
/* ③ 모달·게이트 materialize (스케일+투명도 동시) */
'@keyframes bbMat{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:none}}'+
'.boobiGateWall,#bbSvBox{animation:bbMat .45s cubic-bezier(.16,1,.3,1)}'+
/* ④ 접근성 폴백 */
'@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}'+
'@media(prefers-reduced-transparency:reduce){header.top,header.site-header,.boobiGateWall,.bbCard,.maptip,#bbSvBox,.hero,.bres,.feature{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:#fff!important}}';
document.head.appendChild(st);
})();
