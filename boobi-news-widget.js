/* 부비 뉴스 위젯 로더 — 다른 사이트의 원하는 자리에 부비 뉴스 큐레이션 +
 * AI 브리핑을 카드로 심는다.
 *
 *   <div data-boobi-news></div>
 *   <script src="https://boobi.ai.kr/boobi-news-widget.js" defer></script>
 *
 * 자리를 잡아둔 <div> 안에 boobi.ai.kr/news-embed.html 을 iframe 으로 넣는다.
 * 기사 API 호출과 브리핑 읽기가 전부 부비 안에서 일어나므로 CORS 를 열 일이
 * 없고, 붙인 사이트의 CSS 와도 서로 닿지 않는다.
 *
 * iframe 은 제 내용의 키를 모른다. 그래서 안쪽 화면이 높이가 바뀔 때마다
 * postMessage 로 알려주고, 여기서 받아 프레임을 늘린다. 스크롤바 없이
 * 페이지에 박힌 카드처럼 보이는 건 그 덕이다.
 *
 * 자리 잡는 <div> 의 data- 속성:
 *   data-boobi-news                  (필수) 이 자리에 심는다
 *   data-topics="종합,숙박,세금"      주제 탭. 쓸 수 있는 이름은 아래 TOPICS 참고
 *   data-limit="8"                   한 탭에 보여줄 기사 수 (2~30)
 *   data-brief="0"                   AI 브리핑 빼기
 *   data-height="520"                첫 높이(px). 내용이 오면 알아서 맞춰진다
 *
 * 쓸 수 있는 주제: 종합 · 분양 · 숙박 · 세금 · 재개발 · 금리 · 전월세 · 정책 · 경매 · 수익형
 */
(function(){
if(window.BoobiNews) return;

var S   = document.currentScript || (function(){var a=document.getElementsByTagName('script');return a[a.length-1];})();
var ORG = ((S && S.getAttribute('data-origin')) || 'https://boobi.ai.kr').replace(/\/+$/,'');

function mount(box){
  if(box.getAttribute('data-boobi-mounted')) return;
  box.setAttribute('data-boobi-mounted','1');

  var p=[];
  var topics=box.getAttribute('data-topics');
  var limit =box.getAttribute('data-limit');
  if(topics) p.push('topics='+encodeURIComponent(topics));
  if(limit)  p.push('limit='+encodeURIComponent(limit));
  if(box.getAttribute('data-brief')==='0') p.push('brief=0');

  var h0=parseInt(box.getAttribute('data-height'),10)||520;

  var f=document.createElement('iframe');
  f.src=ORG+'/news-embed.html'+(p.length?'?'+p.join('&'):'');
  f.title='부비 뉴스 — 오늘의 부동산 기사와 AI 브리핑';
  f.loading='lazy';
  f.setAttribute('scrolling','no');
  f.style.cssText='display:block;width:100%;border:0;height:'+h0+'px;'
    +'transition:height .18s ease;background:transparent;color-scheme:light';
  box.appendChild(f);

  /* 안쪽에서 올라오는 키 보고를 받아 프레임을 늘린다.
     보낸 게 이 프레임이 맞는지 contentWindow 로 확인한다 — 한 페이지에
     여러 개를 심어도 서로의 높이를 가로채지 않게. */
  window.addEventListener('message',function(e){
    if(e.origin!==ORG) return;
    if(e.source!==f.contentWindow) return;
    var d=e.data;
    if(!d || d.boobi!=='news-height') return;
    var h=parseInt(d.h,10);
    if(h>80 && h<6000) f.style.height=h+'px';
  });
}

function start(){
  var boxes=document.querySelectorAll('[data-boobi-news],#boobi-news');
  [].forEach.call(boxes,mount);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
else start();

window.BoobiNews={ mount:mount, refresh:start };
})();
