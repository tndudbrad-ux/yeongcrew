/* ===== 부비 — 공고별 청약일 알림받기 (카카오 알림톡) v1 =====
 * 사용법: 공고 카드에 아래 버튼만 넣으면 나머지는 이 스크립트가 처리
 *   <button class="nalert-btn" data-nid="공고ID" data-nname="공고명"
 *           data-nstart="YYYY-MM-DD" data-nend="YYYY-MM-DD" data-nurl="공고링크" data-nsrc="cheongyak|rental">
 * 저장: Firestore `noticeAlerts/{uid_공고ID}` → 발송: GitHub Actions send-notice-alerts.mjs (전날 18시·당일 8시 KST)
 * 필요: hwon-auth.js (구글 로그인) 선로딩 */
(function(){
if(window.__boobiNAlert)return; window.__boobiNAlert=1;

/* ---- 스타일 ---- */
var css=document.createElement('style');
css.textContent=
'.nalert-btn{display:inline-block;margin-top:11px;margin-left:8px;padding:7px 13px;border-radius:10px;background:#FFF4E5;color:#B4690E;border:1.5px solid #FFE1B8;font-weight:700;font-size:.83rem;cursor:pointer;font-family:inherit;line-height:inherit;transition:.13s}'+
'.nalert-btn:active{background:#FFE9CC}'+
'.nalert-btn.on{background:#E3F8EF;color:#12854f;border-color:#b9e6d1}'+
'#naOverlay{position:fixed;inset:0;background:rgba(13,42,41,.45);z-index:9998;display:flex;align-items:center;justify-content:center;padding:18px}'+
'#naBox{background:#fff;border-radius:20px;max-width:400px;width:100%;padding:24px 22px;box-shadow:0 24px 60px rgba(13,42,41,.25);font-family:inherit}'+
'#naBox h3{font-size:1.05rem;font-weight:800;color:#0D2A29;line-height:1.45}'+
'#naBox .nsub{font-size:.86rem;color:#547471;margin-top:6px;line-height:1.6}'+
'#naBox .nsub b{color:#B4690E}'+
'#naBox input.np{width:100%;margin-top:14px;padding:12px 14px;border:1.5px solid #DCEEEC;border-radius:12px;font-size:1rem;font-family:inherit;color:#12312f}'+
'#naBox input.np:focus{outline:none;border-color:#2AC1BC;box-shadow:0 0 0 3px rgba(42,193,188,.13)}'+
'#naBox label.nc{display:flex;gap:9px;align-items:flex-start;margin-top:12px;font-size:.83rem;color:#547471;line-height:1.55;cursor:pointer}'+
'#naBox label.nc input{margin-top:2px;width:17px;height:17px;accent-color:#20A6A2;flex:0 0 auto}'+
'#naBox .ngo{width:100%;margin-top:16px;padding:13px;border:none;border-radius:12px;background:linear-gradient(180deg,#33CCC7,#20A6A2);color:#fff;font-size:1rem;font-weight:800;cursor:pointer;font-family:inherit}'+
'#naBox .ngo[disabled]{opacity:.5}'+
'#naBox .nx{width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:#F1F5F4;color:#547471;font-size:.92rem;font-weight:700;cursor:pointer;font-family:inherit}'+
'#naBox .nerr{display:none;margin-top:10px;padding:10px 13px;border-radius:10px;background:#FDECEC;color:#c0392b;font-size:.85rem;line-height:1.5}';
document.head.appendChild(css);

/* ---- 상태 ---- */
var user=null, db=null, subs={}, phoneHint='';

function loadFirestore(){
  return new Promise(function(res,rej){
    if(window.firebase&&firebase.firestore){res();return;}
    var s=document.createElement('script');
    s.src='https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });
}
function docId(nid){ return (user.uid+'_'+String(nid)).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,120); }

function refresh(){
  if(!user){subs={};mark();return;}
  loadFirestore().then(function(){
    db=firebase.firestore();
    /* 내 구독 목록 */
    db.collection('noticeAlerts').where('uid','==',user.uid).get().then(function(q){
      subs={}; q.forEach(function(d){var v=d.data(); if(v.status==='active') subs[v.nid]=d.id; if(v.phone) phoneHint=v.phone;});
      mark();
    }).catch(function(e){console.warn('nalert',e);});
    /* 전화번호 힌트: 맞춤알림에 저장해둔 번호 재사용 */
    db.collection('housingAlerts').doc(user.uid).get().then(function(s){
      if(s&&s.exists&&s.data().phone&&!phoneHint) phoneHint=s.data().phone;
    }).catch(function(){});
  }).catch(function(e){console.warn('nalert fs',e);});
}
function mark(){
  [].forEach.call(document.querySelectorAll('.nalert-btn'),function(b){
    var on=!!subs[b.getAttribute('data-nid')];
    b.classList.toggle('on',on);
    b.textContent=on?'✅ 알림 신청됨':b.getAttribute('data-label')||(b.getAttribute('data-nsrc')==='rental'?'🔔 접수 시작일 알림받기':'🔔 청약일 알림받기');
  });
}
/* 동적 렌더 대응 */
new MutationObserver(function(){ clearTimeout(window.__naT); window.__naT=setTimeout(mark,150); })
  .observe(document.documentElement,{childList:true,subtree:true});

document.addEventListener('hwon-auth',function(e){ user=e.detail||null; refresh(); });
setTimeout(function(){ if(!user&&window.hwonUser){user=window.hwonUser;refresh();} },600);

/* ---- 모달 ---- */
function fmtD(s){ if(!s)return''; var p=String(s).split('-'); return p.length===3?(+p[1])+'월 '+(+p[2])+'일':s; }
function openModal(d){
  closeModal();
  var ov=document.createElement('div'); ov.id='naOverlay';
  ov.innerHTML='<div id="naBox">'+
    '<h3>🔔 청약일 카톡 알림</h3>'+
    '<div class="nsub"><b>'+escT(d.nname)+'</b><br>접수 시작 <b>'+escT(fmtD(d.nstart))+'</b>'+(d.nend?' · 마감 '+escT(fmtD(d.nend)):'')+'<br>시작 <b>전날 저녁</b>과 <b>당일 아침</b>, 카카오톡으로 알려드려요.</div>'+
    '<input class="np" id="naPhone" type="tel" inputmode="numeric" placeholder="010-0000-0000" value="'+escT(phoneHint||'')+'">'+
    '<label class="nc"><input type="checkbox" id="naConsent" checked><span>이 공고의 청약일 알림(카카오 알림톡/문자) 수신에 동의합니다. 번호는 알림 발송에만 쓰이고 언제든 해지할 수 있어요.</span></label>'+
    '<div class="nerr" id="naErr"></div>'+
    '<button class="ngo" id="naGo">알림 신청하기</button>'+
    '<button class="nx" id="naX">닫기</button></div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){ if(e.target===ov)closeModal(); });
  document.getElementById('naX').onclick=closeModal;
  document.getElementById('naGo').onclick=function(){ save(d); };
}
function closeModal(){ var o=document.getElementById('naOverlay'); if(o)o.remove(); }
function err(t){ var e=document.getElementById('naErr'); if(e){e.textContent=t;e.style.display='block';} }
function escT(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

function save(d){
  var phone=(document.getElementById('naPhone').value||'').replace(/[^0-9]/g,'');
  if(!/^01[016789][0-9]{7,8}$/.test(phone)){err('휴대폰 번호를 정확히 입력해주세요. (예: 01012345678)');return;}
  if(!document.getElementById('naConsent').checked){err('알림 수신 동의에 체크해주세요.');return;}
  var btn=document.getElementById('naGo'); btn.disabled=true;
  phoneHint=phone;
  db.collection('noticeAlerts').doc(docId(d.nid)).set({
    uid:user.uid, phone:phone,
    nid:String(d.nid), name:d.nname||'', url:d.nurl||'',
    rcritStart:d.nstart||'', rcritEnd:d.nend||'', src:d.nsrc||'',
    status:'active', sentD1:false, sentD0:false, consent:true,
    email:(user.email||null), createdAt:new Date().toISOString()
  }).then(function(){
    subs[d.nid]=docId(d.nid); mark(); closeModal();
  }).catch(function(e){ btn.disabled=false; err('저장 중 오류가 났어요. 잠시 후 다시 시도해주세요. ('+(e.code||e.message)+')'); });
}

/* ---- 클릭 처리 (이벤트 위임) ---- */
document.addEventListener('click',function(ev){
  var b=ev.target.closest?ev.target.closest('.nalert-btn'):null; if(!b)return;
  var d={nid:b.getAttribute('data-nid'),nname:b.getAttribute('data-nname'),nstart:b.getAttribute('data-nstart'),
         nend:b.getAttribute('data-nend'),nurl:b.getAttribute('data-nurl'),nsrc:b.getAttribute('data-nsrc')};
  if(!user){
    if(confirm('청약일 알림은 로그인 후 신청할 수 있어요.\n구글 계정으로 3초 만에 로그인할까요?')){
      if(window.hwonAuth&&hwonAuth.signInGoogle) hwonAuth.signInGoogle();
      else location.href='/account.html';
    }
    return;
  }
  if(subs[d.nid]){
    if(confirm('이 공고의 알림을 해지할까요?')){
      db.collection('noticeAlerts').doc(subs[d.nid]).delete().then(function(){ delete subs[d.nid]; mark(); }).catch(function(){});
    }
    return;
  }
  if(!db){ loadFirestore().then(function(){db=firebase.firestore();openModal(d);}); return; }
  openModal(d);
});
})();
