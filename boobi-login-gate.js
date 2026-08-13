/* ===== 부비 — 회원 전용 로그인 게이트 v1 =====
 * 사용법: 회원 전용으로 만들 페이지 </body> 앞에 한 줄 추가:
 *   <script src="/boobi-login-gate.js?v=1" defer></script>
 * 동작: hwon-auth(파이어베이스) 로그인 상태 확인 → 비로그인 시 블러 오버레이 + 구글 로그인 버튼.
 *       로그인하면 오버레이가 사라지고 그 자리에서 바로 이용. 게이트 해제는 이 한 줄만 지우면 됨. */
(function(){
if(window.__boobiGate)return; window.__boobiGate=1;

/* hwon-auth.js 미포함 페이지 대비 자동 로드 (중복 로드 방지) */
if(![].some.call(document.scripts,function(s){return /hwon-auth\.js/.test(s.src||'');})){
  var a=document.createElement('script'); a.src='/hwon-auth.js'; a.defer=true; document.head.appendChild(a);
}

var css=document.createElement('style');
css.textContent=
'#bbGate{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(240,250,249,.55);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}'+
'#bbGate .gbox{background:#fff;border:1px solid #DCEEEC;border-radius:22px;max-width:380px;width:100%;padding:32px 26px;text-align:center;box-shadow:0 24px 70px rgba(13,42,41,.18)}'+
'#bbGate img.glogo{width:52px;height:52px;object-fit:contain;margin:0 auto 14px;display:block;filter:drop-shadow(0 4px 12px rgba(42,193,188,.35))}'+
'#bbGate h3{font-size:1.18rem;font-weight:800;color:#0D2A29;letter-spacing:-.02em}'+
'#bbGate p{font-size:.89rem;color:#547471;margin:8px 0 20px;line-height:1.6}'+
'#bbGate .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;border:1.5px solid #DCEEEC;border-radius:12px;background:#fff;font-size:.96rem;font-weight:700;cursor:pointer;font-family:inherit;color:#0D2A29;transition:.14s}'+
'#bbGate .gbtn:hover{border-color:#2AC1BC;box-shadow:0 4px 14px rgba(42,193,188,.18)}'+
'#bbGate .gfree{margin-top:14px;font-size:.78rem;color:#8aa5a2}'+
'body.bb-gated{overflow:hidden}';
document.head.appendChild(css);

var gate=null;
function show(){
  if(gate)return;
  gate=document.createElement('div'); gate.id='bbGate';
  gate.innerHTML='<div class="gbox">'+
    '<img class="glogo" src="/boobi-ring-3d.png" alt="부비">'+
    '<h3>회원 전용 기능이에요</h3>'+
    '<p>로그인하면 <b>진단 결과 저장</b>과 함께<br>부비의 모든 진단·툴을 무료로 쓸 수 있어요.</p>'+
    '<button class="gbtn" id="bbGateGo">'+
    '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>'+
    '구글로 3초 만에 시작하기</button>'+
    '<div class="gfree">가입·이용 모두 무료 · <a href="/privacy.html" style="color:#20A6A2">개인정보처리방침</a></div>'+
    '</div>';
  document.body.appendChild(gate);
  document.body.classList.add('bb-gated');
  document.getElementById('bbGateGo').onclick=function(){
    if(window.hwonAuth&&hwonAuth.signInGoogle){
      hwonAuth.signInGoogle().catch(function(e){
        if(e&&e.code==='auth/popup-closed-by-user')return;
        location.href='/account.html';
      });
    } else location.href='/account.html';
  };
}
function hide(){ if(gate){gate.remove();gate=null;} document.body.classList.remove('bb-gated'); }

document.addEventListener('hwon-auth',function(e){ e.detail?hide():show(); });
/* auth가 이미 확정된 뒤 이 스크립트가 로드된 경우 대비 */
setTimeout(function(){ if(window.hwonUser)hide(); else if(window.hwonUser===null)show(); },1200);
/* 5초 내 auth 판정이 안 오면(스크립트 차단 등) 게이트 표시 */
setTimeout(function(){ if(!window.hwonUser&&!gate)show(); },5000);
})();
