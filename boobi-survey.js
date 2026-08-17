/* ===== 부비 — 가입 기대 설문 모달 (전 페이지 공용) v1 =====
 * 로그인된 유저 중 아직 응답 안 한 사람에게 어느 페이지에서든 1회 모달 노출.
 * 저장: Firestore members/{uid}.expectations (account.html 인라인 설문과 동일 키·동일 localStorage 플래그)
 * account.html(자체 설문 보유)에서는 실행 안 함. hwon-auth.js가 자동 로드. */
(function(){
if(window.__boobiSurvey)return; window.__boobiSurvey=1;
if(document.getElementById('acSurvey'))return; // 계정 페이지는 자체 설문 사용

var OPTS=['🔔 청약·공고 알림','🏠 임대주택 공고 모아보기','🧮 대출·세금 계산기','🤖 AI 부동산 상담','🔍 전세사기·계약 안전 체크','📈 시세·실거래가 확인','🎯 내 조건에 맞는 집 찾기','📚 부동산 공부·칼럼'];
var sel={}, db=null, uid=null, shown=false;

function loadFS(){return new Promise(function(res,rej){ if(window.firebase&&firebase.firestore){res();return;}
 var s=document.createElement('script'); s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
 s.onload=res; s.onerror=rej; document.head.appendChild(s); });}

function css(){
 if(document.getElementById('bbSvStyle'))return;
 var st=document.createElement('style'); st.id='bbSvStyle';
 st.textContent='#bbSvOv{position:fixed;inset:0;z-index:9992;background:rgba(13,42,41,.45);display:flex;align-items:center;justify-content:center;padding:18px}'+
 '#bbSvBox{background:#fff;border-radius:20px;max-width:430px;width:100%;padding:26px 22px;box-shadow:0 24px 60px rgba(13,42,41,.25);font-family:inherit;max-height:88vh;overflow:auto}'+
 '#bbSvBox h3{font-size:1.08rem;font-weight:800;color:#0D2A29}'+
 '#bbSvBox .sub{font-size:.86rem;color:#547471;margin:5px 0 13px;line-height:1.55}'+
 '#bbSvChips2{display:flex;flex-wrap:wrap;gap:8px}'+
 '#bbSvChips2 .c{padding:9px 13px;border:1.5px solid #DCEEEC;border-radius:999px;background:#fff;font-size:.86rem;cursor:pointer;color:#547471;user-select:none;transition:.13s}'+
 '#bbSvChips2 .c.on{border-color:#2AC1BC;background:#E5F8F6;color:#127c78;font-weight:700}'+
 '#bbSvEtc2{width:100%;margin-top:12px;padding:11px 13px;border:1.5px solid #DCEEEC;border-radius:11px;font-size:.92rem;font-family:inherit;color:#12312f}'+
 '#bbSvGo{width:100%;margin-top:14px;padding:13px;border:none;border-radius:12px;background:linear-gradient(180deg,#33CCC7,#20A6A2);color:#fff;font-weight:800;font-size:.98rem;cursor:pointer;font-family:inherit}'+
 '#bbSvSkip2{width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:#F1F5F4;color:#547471;font-size:.88rem;cursor:pointer;font-family:inherit}';
 document.head.appendChild(st);
}
function done(){ if(uid) try{localStorage.setItem('bbSvDone_'+uid,'1');}catch(e){} }
function close(){ var o=document.getElementById('bbSvOv'); if(o)o.remove(); }

function show(){
 if(shown||document.getElementById('bbSvOv'))return; shown=true; css();
 var ov=document.createElement('div'); ov.id='bbSvOv';
 ov.innerHTML='<div id="bbSvBox">'+
  '<h3>🙌 가입해주셔서 반가워요!</h3>'+
  '<div class="sub">부비에서 어떤 걸 기대하세요? 모두 골라주시면 그 순서대로 발전할게요. (10초면 끝!)</div>'+
  '<div id="bbSvChips2"></div>'+
  '<input id="bbSvEtc2" type="text" maxlength="200" placeholder="기타 — 이런 게 있었으면 좋겠어요 (선택)">'+
  '<button id="bbSvGo">저장하기</button>'+
  '<button id="bbSvSkip2">다음에 할게요</button></div>';
 document.body.appendChild(ov);
 var box=document.getElementById('bbSvChips2');
 OPTS.forEach(function(t){
  var d=document.createElement('div'); d.className='c'; d.textContent=t;
  d.onclick=function(){ sel[t]=!sel[t]; d.classList.toggle('on',sel[t]); };
  box.appendChild(d);
 });
 document.getElementById('bbSvSkip2').onclick=function(){ done(); close(); };
 ov.addEventListener('click',function(e){ if(e.target===ov){ done(); close(); } });
 document.getElementById('bbSvGo').onclick=function(){
  var picked=Object.keys(sel).filter(function(k){return sel[k];}).map(function(k){return k.replace(/^[^ ]+ /,'');});
  var etc=(document.getElementById('bbSvEtc2').value||'').trim();
  if(!picked.length&&!etc){ alert('하나 이상 골라주시거나 기타 의견을 적어주세요!'); return; }
  var btn=this; btn.disabled=true;
  loadFS().then(function(){ db=db||firebase.firestore();
   return db.collection('members').doc(uid).set({
    expectations:picked, expectationsNote:etc||null,
    expectationsAt:new Date().toISOString(),
    email:(window.hwonUser&&window.hwonUser.email)||null
   },{merge:true});
  }).then(function(){
   done();
   if(window.gtag){try{gtag('event','signup_survey',{picks:picked.join(','),src:'modal'});}catch(e){}}
   btn.textContent='✅ 고마워요!'; setTimeout(close,900);
  }).catch(function(e){ btn.disabled=false; alert('저장 중 오류가 났어요. 잠시 후 다시 시도해주세요.'); });
 };
}

function maybeShow(u){
 if(!u||shown)return; uid=u.uid;
 try{ if(localStorage.getItem('bbSvDone_'+uid))return; }catch(e){}
 loadFS().then(function(){ db=firebase.firestore();
  return db.collection('members').doc(uid).get();
 }).then(function(snap){
  if(snap&&snap.exists&&snap.data().expectations){ done(); return; }
  setTimeout(show,1200); // 로그인 직후 살짝 여유
 }).catch(function(){ /* 조회 실패 시 강제 노출하지 않음 */ });
}

document.addEventListener('hwon-auth',function(e){ if(e.detail) maybeShow(e.detail); });
setTimeout(function(){ if(window.hwonUser) maybeShow(window.hwonUser); },1500);
})();
