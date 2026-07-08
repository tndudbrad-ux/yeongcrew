/* 훤 UI 폴리시 — 금액 입력 한글 힌트 */
(function(){
function readMan(v){
  v=Math.round(v);
  if(!isFinite(v)||v<=0) return '';
  var jo=Math.floor(v/100000000), rest=v%100000000;
  var eok=Math.floor(rest/10000), man=rest%10000, parts=[];
  if(jo>0) parts.push(jo.toLocaleString('ko-KR')+'조');
  if(eok>0) parts.push(eok.toLocaleString('ko-KR')+'억');
  if(man>0){
    if(man%1000===0) parts.push((man/1000)+'천만원');
    else parts.push(man.toLocaleString('ko-KR')+'만원');
  } else if(parts.length) parts[parts.length-1]+='원';
  return parts.join(' ');
}
function labelText(inp){
  var el=inp.previousElementSibling;
  while(el){ if(el.tagName==='LABEL') return el.innerText; el=el.previousElementSibling; }
  var p=inp.parentElement;
  if(p){ var l=p.querySelector('label'); if(l) return l.innerText; }
  return '';
}
function attach(inp){
  var t=labelText(inp), ph=inp.placeholder||'';
  if(!/만원/.test(t) && !/억/.test(ph)) return;
  var hint=document.createElement('div');
  hint.className='hwHint';
  inp.insertAdjacentElement('afterend',hint);
  function upd(){
    var v=parseFloat(inp.value);
    var s=v>0?readMan(v):'';
    hint.textContent=s;
    hint.classList.toggle('on',!!s);
  }
  inp.addEventListener('input',upd);
  upd();
}
function init(){ document.querySelectorAll('input.f[type=number], input.f[type=text][inputmode=numeric]').forEach(attach); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
