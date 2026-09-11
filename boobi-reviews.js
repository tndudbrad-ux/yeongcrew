/* 부비 구매자 리뷰 — 지역 분석 리포트 등 유료 콘텐츠 공용
 * 사용법: <div id="bbReviews" data-product="region-report-dongdaemun" data-name="동대문구 지역 분석 리포트"></div>
 *         <script src="/boobi-reviews.js?v=1" defer></script>
 * 저장소: Firestore 컬렉션 regionReviews  { product, uid, name, stars, text, purchased, createdAt }
 * 구매자 여부: localStorage bb_unlock_<product> 또는 members/{uid}.purchases.<product>
 */
(function(){
var box=document.getElementById('bbReviews'); if(!box) return;
var PRODUCT=box.getAttribute('data-product')||'', NAME=box.getAttribute('data-name')||'이 리포트';
var css='#bbReviews{margin-top:56px}#bbReviews .rvHead{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px 18px;margin-bottom:14px}'
+'#bbReviews h2{font-size:1.25rem;font-weight:800;letter-spacing:-.01em;margin:0}'
+'#bbReviews .rvAvg{display:flex;align-items:center;gap:10px}#bbReviews .rvAvg b{font-size:1.9rem;font-weight:800;color:#3D8BFD;line-height:1}#bbReviews .rvAvg span{font-size:.82rem;color:#8AA5A2}'
+'#bbReviews .stars{color:#F5B301;letter-spacing:1px;font-size:.95rem}#bbReviews .stars.dim{color:#DCEEEC}'
+'#bbReviews .rvList{display:grid;gap:10px}'
+'#bbReviews .rv{padding:14px 16px;border-radius:14px;border:1px solid rgba(13,42,41,.10);background:rgba(255,255,255,.7)}'
+'#bbReviews .rv .top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:.82rem;color:#547471;margin-bottom:6px}'
+'#bbReviews .rv .who{font-weight:700;color:#0D2A29}#bbReviews .rv .badge{font-size:.7rem;font-weight:800;padding:2px 8px;border-radius:999px;background:#EAF3FE;color:#2A6FD8}'
+'#bbReviews .rv p{margin:0;font-size:.93rem;line-height:1.65;word-break:keep-all;white-space:pre-wrap}'
+'#bbReviews .rvEmpty{padding:24px;border-radius:14px;border:1.5px dashed rgba(61,139,253,.35);text-align:center;color:#547471;font-size:.9rem}'
+'#bbReviews .rvForm{margin-top:16px;padding:18px 18px 16px;border-radius:16px;background:radial-gradient(120% 170% at 92% -20%,rgba(61,139,253,.16),transparent 55%),radial-gradient(130% 170% at -8% 120%,rgba(42,193,188,.18),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.9),rgba(255,255,255,.6));border:1.5px solid rgba(255,255,255,.95);box-shadow:0 14px 40px rgba(13,42,41,.08),inset 0 1px 0 #fff}'
+'#bbReviews .rvForm h3{margin:0 0 8px;font-size:1rem;font-weight:800}'
+'#bbReviews .pick{display:flex;gap:4px;margin:6px 0 10px}#bbReviews .pick button{background:none;border:none;font-size:1.6rem;line-height:1;cursor:pointer;color:#DCEEEC;padding:0 2px}#bbReviews .pick button.on{color:#F5B301}'
+'#bbReviews textarea{width:100%;min-height:92px;padding:12px 14px;border:1.5px solid #DCEEEC;border-radius:12px;font:inherit;font-size:.95rem;color:#0D2A29;background:#fff;resize:vertical}'
+'#bbReviews textarea:focus{outline:none;border-color:#3D8BFD;box-shadow:0 0 0 3px rgba(61,139,253,.15)}'
+'#bbReviews .rvBtn{margin-top:10px;padding:11px 22px;border:none;border-radius:999px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);color:#fff;font-weight:800;font-size:.92rem;cursor:pointer;box-shadow:0 8px 20px rgba(61,139,253,.28);white-space:nowrap}'
+'#bbReviews .rvBtn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}'
+'#bbReviews .rvNote{font-size:.8rem;color:#8AA5A2;margin-top:8px;word-break:keep-all}'
+'#bbReviews .rvMsg{font-size:.85rem;margin-top:8px;color:#2A6FD8}#bbReviews .rvMsg.err{color:#E5484D}';
var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function starStr(n){var s='';for(var i=1;i<=5;i++)s+=(i<=n?'★':'☆');return s;}
function maskName(n,email){var b=(n||'').trim(); if(!b&&email) b=email.split('@')[0]; if(!b) return '구매자'; if(b.length<=1) return b+'*'; return b[0]+'*'.repeat(Math.min(b.length-1,3));}
function purchasedLocal(){ try{ return !!localStorage.getItem('bb_unlock_'+PRODUCT); }catch(e){ return false; } }
function loadFS(){return new Promise(function(res,rej){ if(window.firebase&&firebase.firestore){res();return;} var s=document.createElement('script'); s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s);});}
function waitAuth(){return new Promise(function(res){ if(window.firebase&&firebase.apps&&firebase.apps.length){res();return;} var n=0; var t=setInterval(function(){ if((window.firebase&&firebase.apps&&firebase.apps.length)||++n>40){clearInterval(t);res();} },250); });}

box.innerHTML='<div class="rvHead"><h2>구매자 리뷰</h2><div class="rvAvg" id="rvAvg"><b>—</b><span>아직 리뷰가 없습니다</span></div></div><div class="rvList" id="rvList"><div class="rvEmpty">리뷰를 불러오는 중…</div></div><div id="rvFormWrap"></div>';
var list=document.getElementById('rvList'), avg=document.getElementById('rvAvg'), formWrap=document.getElementById('rvFormWrap');
var user=null, db=null, myStars=0;

function render(rows){
  if(!rows.length){ list.innerHTML='<div class="rvEmpty">아직 등록된 리뷰가 없습니다. '+esc(NAME)+'를 읽으신 분의 첫 리뷰를 기다립니다.</div>'; return; }
  var sum=0; rows.forEach(function(r){sum+=Number(r.stars)||0;});
  avg.innerHTML='<b>'+(sum/rows.length).toFixed(1)+'</b><span class="stars">'+starStr(Math.round(sum/rows.length))+'</span><span>리뷰 '+rows.length+'개</span>';
  list.innerHTML=rows.map(function(r){
    var d=r.createdAt?String(r.createdAt).slice(0,10):'';
    return '<div class="rv"><div class="top"><span class="who">'+esc(r.name||'구매자')+'</span>'+(r.purchased?'<span class="badge">구매 확인</span>':'')+'<span class="stars">'+starStr(Number(r.stars)||0)+'</span><span>'+esc(d)+'</span></div><p>'+esc(r.text||'')+'</p></div>';
  }).join('');
}
function load(){
  return loadFS().then(function(){
    db=firebase.firestore();
    return db.collection('regionReviews').where('product','==',PRODUCT).limit(50).get();
  }).then(function(q){
    var rows=[]; q.forEach(function(d){rows.push(d.data());});
    rows.sort(function(a,b){return String(b.createdAt||'').localeCompare(String(a.createdAt||''));});
    render(rows);
  }).catch(function(e){ console.warn('reviews load fail',e); list.innerHTML='<div class="rvEmpty">아직 등록된 리뷰가 없습니다.</div>'; });
}
function renderForm(){
  if(!user){
    formWrap.innerHTML='<div class="rvForm"><h3>리뷰 남기기</h3><p class="rvNote" style="margin:0 0 10px">리뷰는 로그인 후 남길 수 있습니다. 결제하신 계정으로 로그인하면 "구매 확인" 표시가 붙습니다.</p><a class="rvBtn" style="display:inline-block;text-decoration:none" href="/account.html?from='+encodeURIComponent(location.pathname)+'">로그인하고 리뷰 쓰기</a></div>';
    return;
  }
  formWrap.innerHTML='<div class="rvForm"><h3>리뷰 남기기</h3><div class="pick" id="rvPick">'+[1,2,3,4,5].map(function(i){return '<button type="button" data-v="'+i+'" aria-label="'+i+'점">★</button>';}).join('')+'</div>'
    +'<textarea id="rvText" maxlength="600" placeholder="이 리포트가 어떤 결정에 도움이 됐는지, 아쉬웠던 점은 무엇인지 적어 주세요. (최대 600자)"></textarea>'
    +'<button class="rvBtn" id="rvSubmit" type="button" disabled>리뷰 등록</button><div class="rvMsg" id="rvMsg"></div>'
    +'<p class="rvNote">이름은 첫 글자만 표시됩니다. 광고·비방·개인정보가 담긴 리뷰는 예고 없이 삭제될 수 있습니다.</p></div>';
  var pick=document.getElementById('rvPick'), ta=document.getElementById('rvText'), sb=document.getElementById('rvSubmit'), msg=document.getElementById('rvMsg');
  function sync(){ sb.disabled=!(myStars>0 && ta.value.trim().length>=10); }
  pick.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; myStars=Number(b.getAttribute('data-v')); [].forEach.call(pick.children,function(c){c.classList.toggle('on',Number(c.getAttribute('data-v'))<=myStars);}); sync(); });
  ta.addEventListener('input',sync);
  sb.addEventListener('click',function(){
    sb.disabled=true; msg.className='rvMsg'; msg.textContent='등록 중…';
    var doc={product:PRODUCT,uid:user.uid,name:maskName(user.displayName,user.email),stars:myStars,text:ta.value.trim().slice(0,600),purchased:purchasedLocal(),createdAt:new Date().toISOString()};
    loadFS().then(function(){ db=db||firebase.firestore(); return db.collection('regionReviews').doc(PRODUCT+'_'+user.uid).set(doc); })
    .then(function(){ msg.textContent='리뷰가 등록됐습니다. 고맙습니다.'; ta.value=''; myStars=0; [].forEach.call(pick.children,function(c){c.classList.remove('on');}); if(window.gtag){try{gtag('event','review_submit',{item_id:PRODUCT,stars:doc.stars});}catch(x){}} load(); })
    .catch(function(e){ console.warn('review save fail',e); msg.className='rvMsg err'; msg.textContent='지금은 리뷰를 저장하지 못했습니다. 잠시 후 다시 시도하거나 tndud.brad@gmail.com으로 보내 주세요.'; sb.disabled=false; });
  });
}
document.addEventListener('hwon-auth',function(e){ user=e.detail||null; renderForm(); });
waitAuth().then(function(){ if(window.hwonUser){user=window.hwonUser;} renderForm(); return load(); });
})();
