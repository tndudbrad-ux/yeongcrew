/* ===== 부비 — 회원 전용 로그인 게이트 v2 (결과 직전 게이트) =====
 * 사용법: 회원 전용 결과를 가진 페이지 </body> 앞에:
 *   <script src="/boobi-login-gate.js?v=2" defer></script>
 * v2 동작: 페이지는 자유롭게 보고 입력까지 가능. 비로그인 상태에서
 *   "결과 보기/진단하기" 류(button.go)를 누르는 순간에만 로그인 게이트 표시.
 *   (v1의 진입 즉시 전면 블러는 애드센스 심사·이탈 문제로 폐기)
 * 제외: .wnext/.wprev/.wskip(위저드 이동), [data-nogate], 로그인 유도 버튼 자체.
 * GA: gate_shown → gate_login_click → gate_unlocked 퍼널 계측. */
(function(){
if(window.__boobiGate)return; window.__boobiGate=1;

/* hwon-auth.js 미포함 페이지 대비 자동 로드 (중복 로드 방지) */
if(![].some.call(document.scripts,function(s){return /hwon-auth\.js/.test(s.src||'');})){
  var a=document.createElement('script'); a.src='/hwon-auth.js'; a.defer=true; document.head.appendChild(a);
}

function ga(n,p){ if(window.gtag){ try{ p=p||{}; p.page=location.pathname; gtag('event',n,p); }catch(e){} } }

var css=document.createElement('style');
css.textContent=
'#bbGate{position:fixed;inset:0;z-index:9990;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(240,250,249,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}'+
'#bbGate .gbox{background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(255,255,255,.82));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1.5px solid rgba(255,255,255,.95);border-radius:22px;max-width:380px;width:100%;padding:32px 26px;text-align:center;box-shadow:0 24px 70px rgba(13,42,41,.18)}'+
'#bbGate img.glogo{width:52px;height:52px;object-fit:contain;margin:0 auto 14px;display:block;filter:drop-shadow(0 4px 12px rgba(42,193,188,.35))}'+
'#bbGate h3{font-size:1.18rem;font-weight:800;color:#0D2A29;letter-spacing:-.02em}'+
'#bbGate p{font-size:.89rem;color:#547471;margin:8px 0 20px;line-height:1.6}'+
'#bbGate .gbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px;border:none;border-radius:999px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);font-size:.96rem;font-weight:700;cursor:pointer;font-family:inherit;color:#fff;box-shadow:0 8px 20px rgba(61,139,253,.28);transition:.14s}'+
'#bbGate .gbtn:hover{transform:translateY(-1px)}'+
'#bbGate .gkk{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:13px;margin-bottom:9px;border:none;border-radius:999px;background:#FEE500;color:#191600;font-size:.96rem;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 6px 16px rgba(13,42,41,.10);transition:transform .12s ease-out}'+
'#bbGate .gkk:hover{transform:translateY(-1px)}'+
'#bbGate .gkk:active,#bbGate .gbtn:active{transform:scale(.97)}'+
'#bbGate .gclose{margin-top:12px;background:none;border:none;font-size:.82rem;color:#8aa5a2;cursor:pointer;font-family:inherit}'+
'#bbGate .gfree{margin-top:10px;font-size:.78rem;color:#8aa5a2}';
document.head.appendChild(css);

var gate=null, shownOnce=false;
function show(){
  if(gate)return;
  gate=document.createElement('div'); gate.id='bbGate';
  gate.innerHTML='<div class="gbox">'+
    '<img class="glogo" src="/boobi-ring-3d.png" alt="부비">'+
    '<h3>결과는 로그인하면 바로 나와요</h3>'+
    '<p>입력하신 내용은 그대로 있어요.<br>로그인하면 <b>결과 확인·저장</b>과 모든 진단·툴이 무료예요.</p>'+
    '<button class="gkk" id="bbGateKk">'+(window.HW_KAKAO_SVG||'')+'카카오로 3초 만에 계속하기</button>'+
    '<button class="gbtn" id="bbGateGo">구글로 계속하기</button>'+
    '<button class="gclose" id="bbGateClose">나중에 할게요</button>'+
    '<div class="gfree">가입·이용 모두 무료 · <a href="/privacy.html" style="color:#2A7DE8">개인정보처리방침</a></div>'+
    '</div>';
  document.body.appendChild(gate);
  if(!shownOnce){ shownOnce=true; ga('gate_shown'); }
  document.getElementById('bbGateKk').onclick=function(){
    ga('gate_login_click',{method:'kakao'});
    if(window.hwonAuth&&hwonAuth.signInKakao) hwonAuth.signInKakao();
    else location.href='/account.html';
  };
  document.getElementById('bbGateGo').onclick=function(){
    ga('gate_login_click',{method:'google'});
    if(window.hwonAuth&&hwonAuth.signInGoogle){
      hwonAuth.signInGoogle().catch(function(e){
        if(e&&e.code==='auth/popup-closed-by-user')return;
        location.href='/account.html';
      });
    } else location.href='/account.html';
  };
  document.getElementById('bbGateClose').onclick=hide;
  gate.addEventListener('click',function(e){ if(e.target===gate)hide(); });
}
function hide(){ if(gate){gate.remove();gate=null;} }

/* 결과 버튼 가로채기 — 로그인 전이면 게이트 */
document.addEventListener('click',function(e){
  if(window.hwonUser) return;                       /* 로그인됨 → 통과 */
  var b=e.target.closest&&e.target.closest('button.go');
  if(!b) return;
  if(b.matches('.wnext,.wprev,.wskip,[data-nogate]')) return;      /* 위저드 이동 등 제외 */
  if(/로그인/.test(b.textContent||'')) return;                      /* 로그인 버튼 자체 제외 */
  e.preventDefault(); e.stopImmediatePropagation();
  show();
},true);

document.addEventListener('hwon-auth',function(e){
  if(e.detail){ if(gate){ ga('gate_unlocked'); } hide(); }
});
})();
