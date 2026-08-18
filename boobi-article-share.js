/* ===== 부비 — 칼럼·글 공유 v1 =====
 * <article>이 있는 페이지에 자동으로 공유 바를 붙인다 (hwon-auth.js가 자동 로드).
 * 모바일: OS 공유창(카톡·인스타DM·문자 등) / PC: 클립보드 복사 + 토스트.
 * 공유 주소는 항상 .html을 뗀 클린 URL. */
(function(){
if(window.__boobiArtShare)return; window.__boobiArtShare=1;

function cleanUrl(){
  var u = (document.querySelector('link[rel="canonical"]')||{}).href || location.href;
  u = u.split('#')[0].split('?')[0];
  u = u.replace(/index\.html$/,'').replace(/\.html$/,'');
  return u;
}

function init(){
  var art=document.querySelector('article'); if(!art)return;
  var h1=art.querySelector('h1')||document.querySelector('h1'); if(!h1)return;
  var title=(h1.textContent||document.title).trim();

  var css=document.createElement('style');
  css.textContent=
  '.bbShareRow{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 6px}'+
  '.bbShareRow.bottom{margin:28px 0 6px;padding-top:18px;border-top:1px solid #E4F1EF}'+
  '.bbShareBtn{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;font-size:.86rem;font-weight:700;cursor:pointer;font-family:inherit;border:none;transition:.15s;text-decoration:none}'+
  '.bbShareBtn.main{color:#fff;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);background-size:170% 170%;background-position:0% 50%;box-shadow:0 4px 12px rgba(61,139,253,.24)}'+
  '.bbShareBtn.main:hover{background-position:95% 50%;transform:translateY(-1px)}'+
  '.bbShareBtn.copy{background:#EAF6F5;color:#178783;border:1.5px solid #CBEBE8}'+
  '.bbShareBtn.copy:hover{background:#DDF2F0}'+
  '#bbShareToast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%) translateY(8px);background:#0D2A29;color:#fff;font-size:.88rem;padding:11px 18px;border-radius:999px;box-shadow:0 10px 28px rgba(13,42,41,.3);z-index:9993;opacity:0;transition:.25s;pointer-events:none}'+
  '#bbShareToast.on{opacity:1;transform:translateX(-50%) translateY(0)}';
  document.head.appendChild(css);

  function toast(msg){
    var t=document.getElementById('bbShareToast');
    if(!t){t=document.createElement('div');t.id='bbShareToast';document.body.appendChild(t);}
    t.textContent=msg; requestAnimationFrame(function(){t.classList.add('on');});
    clearTimeout(t.__tm); t.__tm=setTimeout(function(){t.classList.remove('on');},2200);
  }
  function copy(url){
    (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){
      toast('✅ 링크가 복사됐어요 — 카톡·DM에 붙여넣기만 하면 끝!');
    }).catch(function(){
      var ta=document.createElement('textarea'); ta.value=url; document.body.appendChild(ta);
      ta.select(); try{document.execCommand('copy');toast('✅ 링크가 복사됐어요');}catch(e){prompt('링크를 복사하세요',url);} ta.remove();
    });
  }
  function ga(n){ if(window.gtag){try{gtag('event',n,{page:location.pathname});}catch(e){}} }

  function row(pos){
    var url=cleanUrl();
    var d=document.createElement('div'); d.className='bbShareRow '+pos;
    var main=document.createElement('button'); main.type='button'; main.className='bbShareBtn main';
    main.innerHTML='📤 이 글 공유하기';
    main.onclick=function(){
      ga('share_article');
      if(navigator.share){
        navigator.share({title:title+' | 부비',text:title,url:url}).catch(function(){});
      } else copy(url);
    };
    var cp=document.createElement('button'); cp.type='button'; cp.className='bbShareBtn copy';
    cp.innerHTML='🔗 링크 복사';
    cp.onclick=function(){ ga('copy_article_link'); copy(url); };
    d.appendChild(main); d.appendChild(cp);
    return d;
  }

  /* 제목(메타 줄 있으면 그 뒤) 아래 + 글 끝, 두 군데 */
  var meta=art.querySelector('.meta');
  (meta||h1).insertAdjacentElement('afterend',row('top'));
  art.appendChild(row('bottom'));
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
