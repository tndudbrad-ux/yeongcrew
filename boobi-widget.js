/* 부비 위젯 로더 — 다른 사이트에 부비링 하나로 부비AI를 얹는다.
 *
 *   <script src="https://boobi.ai.kr/boobi-widget.js" defer></script>
 *
 * 대화 화면 자체는 boobi.ai.kr 의 /chat-embed.html 을 iframe 으로 띄운다.
 * 일부러 이렇게 했다 —
 *   · 대화 API 호출이 boobi.ai.kr 안에서 일어나므로 CORS 허용 목록을 건드릴 일이 없다.
 *   · 붙인 사이트의 CSS 와 부비 CSS 가 서로를 망가뜨리지 않는다.
 *   · 부비 쪽을 고치면 붙인 사이트들이 다음 새로고침에 같이 최신이 된다.
 * 바깥에 남는 건 떠다니는 링 버튼 하나뿐이고, 그것도 shadow DOM 안에 가둬서
 * 호스트 사이트의 * { } 류 전역 스타일이 닿지 못하게 했다.
 *
 * 설치 옵션 (script 태그의 data- 속성):
 *   data-position="left"    버튼을 왼쪽 아래로 (기본 right)
 *   data-no-teaser          첫 방문 말풍선 끄기
 *   data-open               페이지 열자마자 대화창 펼치기
 *   data-origin="..."       부비 호스트 바꾸기 (기본 https://boobi.ai.kr)
 *
 * 바깥에서 부르는 API: BoobiWidget.open() / .close() / .toggle()
 */
(function(){
if(window.BoobiWidget) return;                 /* 두 번 붙여도 하나만 뜬다 */
try{ if(window.top!==window.self && /boobi\.ai\.kr$/.test(location.hostname)) return; }catch(e){}

var S   = document.currentScript || (function(){var a=document.getElementsByTagName('script');return a[a.length-1];})();
var ORG = (S && S.getAttribute('data-origin')) || 'https://boobi.ai.kr';
ORG = ORG.replace(/\/+$/,'');
var LEFT    = !!(S && S.getAttribute('data-position')==='left');
var TEASER  = !(S && S.hasAttribute('data-no-teaser'));
var AUTOOPEN= !!(S && S.hasAttribute('data-open'));
var SIDE    = LEFT ? 'left' : 'right';

var host = document.createElement('div');
host.id = 'boobi-widget';
host.style.cssText = 'all:initial;position:fixed;z-index:2147483000;'+SIDE+':0;bottom:0;width:0;height:0';
var root = host.attachShadow ? host.attachShadow({mode:'open'}) : host;

var css = document.createElement('style');
css.textContent =
 ':host{all:initial}'
+'*{box-sizing:border-box;font-family:"Wanted Sans","Pretendard",-apple-system,BlinkMacSystemFont,system-ui,sans-serif}'

/* 부비링 버튼 */
+'.btn{position:fixed;'+SIDE+':20px;bottom:20px;width:62px;height:62px;border-radius:50%;border:none;'
 +'cursor:pointer;background:#fff;padding:0;display:flex;align-items:center;justify-content:center;'
 +'box-shadow:0 6px 20px rgba(42,193,188,.42),0 0 30px rgba(42,193,188,.22);'
 +'transition:transform .18s cubic-bezier(.34,1.56,.64,1)}'
+'.btn:hover{transform:translateY(-3px) scale(1.05)}'
+'.btn .ring{width:46px;height:46px;background:url("'+ORG+'/boobi-ring-3d.png") center/contain no-repeat;'
 +'animation:flo 4.5s ease-in-out infinite}'
+'.btn.pulse{animation:pul 2.2s ease-out infinite}'
+'@keyframes flo{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}'
+'@keyframes pul{0%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,.55)}'
 +'70%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 16px rgba(42,193,188,0)}'
 +'100%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,0)}}'
+'@media(prefers-reduced-motion:reduce){.btn .ring,.btn.pulse{animation:none}}'

/* 대화창 */
+'.panel{position:fixed;'+SIDE+':16px;bottom:92px;width:min(380px,calc(100vw - 32px));'
 +'height:min(600px,calc(100vh - 128px));border-radius:20px;overflow:hidden;background:#fff;'
 +'box-shadow:0 20px 60px rgba(13,42,41,.3);display:none;'
 +'opacity:0;transform:translateY(10px) scale(.98);transition:opacity .2s,transform .2s}'
+'.panel.on{display:block}'
+'.panel.show{opacity:1;transform:none}'
+'.panel iframe{width:100%;height:100%;border:0;display:block;background:#fff}'
+'@media(max-width:480px){'
 +'.panel{left:0;right:0;bottom:0;width:100vw;height:100dvh;height:100vh;border-radius:0}'
 +'.panel.on ~ .btn{display:none}'
+'}'

/* 첫 방문 말풍선 */
+'.teaser{position:fixed;'+SIDE+':88px;bottom:26px;max-width:240px;cursor:pointer;'
 +'background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(255,255,255,.88));'
 +'border:1.5px solid rgba(255,255,255,.95);border-radius:16px;border-bottom-'+SIDE+'-radius:4px;'
 +'box-shadow:0 14px 40px rgba(13,42,41,.14);padding:12px 40px 12px 16px;'
 +'color:#0D2A29;font-size:.86rem;line-height:1.5;opacity:0;transform:translateY(8px);transition:.35s ease}'
+'.teaser.show{opacity:1;transform:none}'
+'.teaser b{background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 62%,#8B6CF6 100%);'
 +'-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800}'
+'.teaser .x{position:absolute;top:6px;'+(LEFT?'left':'right')+':10px;color:#8AA5A2;font-size:.85rem;padding:2px 5px}'
+'@media(max-width:480px){.teaser{display:none}}';
root.appendChild(css);

var panel = document.createElement('div');
panel.className = 'panel';
panel.setAttribute('role','dialog');
panel.setAttribute('aria-label','부비 — 부동산 비서');

var btn = document.createElement('button');
btn.className = 'btn pulse';
btn.type = 'button';
btn.setAttribute('aria-label','부비에게 물어보기');
btn.innerHTML = '<span class="ring"></span>';

root.appendChild(panel);
root.appendChild(btn);

var teaser=null;
function killTeaser(){
  if(!teaser) return;
  teaser.classList.remove('show');
  var t=teaser; teaser=null;
  setTimeout(function(){ t.remove(); },350);
}
function seen(){ try{ sessionStorage.setItem('boobiWidgetSeen','1'); }catch(e){} }

/* iframe 은 처음 열 때 만든다 — 안 여는 방문자에게 네트워크 비용을 물리지 않는다 */
var frame=null;
function mount(){
  if(frame) return;
  frame = document.createElement('iframe');
  frame.src = ORG+'/chat-embed.html?embed=1';
  frame.title = '부비 — 부동산 비서';
  frame.setAttribute('allow','clipboard-write');
  panel.appendChild(frame);
}

var open=false;
function show(){
  if(open) return;
  open=true; mount(); killTeaser(); seen();
  btn.classList.remove('pulse');
  panel.classList.add('on');
  requestAnimationFrame(function(){ panel.classList.add('show'); });
  try{ if(window.gtag) gtag('event','boobi_widget_open',{host:location.hostname}); }catch(e){}
}
function hide(){
  if(!open) return;
  open=false;
  panel.classList.remove('show');
  setTimeout(function(){ if(!open) panel.classList.remove('on'); },200);
}
btn.addEventListener('click',function(){ open?hide():show(); });

/* 프레임 안의 ✕ 는 자기 창을 닫을 수 없으니 바깥에 알려온다 */
window.addEventListener('message',function(e){
  if(e.origin!==ORG) return;
  var d=e.data;
  if(d && d.boobi==='close') hide();
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape') hide(); });

function start(){
  document.body.appendChild(host);
  if(TEASER){
    var skip=false; try{ skip=!!sessionStorage.getItem('boobiWidgetSeen'); }catch(e){}
    if(!skip){
      teaser=document.createElement('div');
      teaser.className='teaser';
      teaser.innerHTML='부동산, 깜깜한 게 있나요?<br>비서 <b>부비</b>에게 물어보세요 🔆<span class="x">✕</span>';
      root.appendChild(teaser);
      setTimeout(function(){ teaser && teaser.classList.add('show'); },1400);
      setTimeout(killTeaser,13000);
      teaser.querySelector('.x').addEventListener('click',function(ev){ ev.stopPropagation(); seen(); killTeaser(); });
      teaser.addEventListener('click',show);
    }
  }
  if(AUTOOPEN || /(^|[?&])boobi=open(&|$)/.test(location.search)) setTimeout(show,600);
}
if(document.body) start();
else document.addEventListener('DOMContentLoaded',start);

window.BoobiWidget={ open:show, close:hide, toggle:function(){ open?hide():show(); } };
})();
