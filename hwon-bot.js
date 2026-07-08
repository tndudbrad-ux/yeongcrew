/* 부비 — 훤AI의 부동산 비서 */
(function(){
if(!document.querySelector('link[href="/hwon-ui.css"]')){
  var uiL=document.createElement('link');uiL.rel='stylesheet';uiL.href='/hwon-ui.css';document.head.appendChild(uiL);
}
if(!document.querySelector('script[src="/hwon-ui.js"]')){
  var uiS=document.createElement('script');uiS.src='/hwon-ui.js';uiS.defer=true;document.body.appendChild(uiS);
}
if(!document.querySelector('link[rel~="icon"]')){
  var fv=document.createElement('link');fv.rel='icon';fv.type='image/svg+xml';
  fv.href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%238FE9E4'/%3E%3Cstop offset='1' stop-color='%231B918D'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='32' cy='32' r='22' fill='none' stroke='url(%23g)' stroke-width='13'/%3E%3C/svg%3E";
  document.head.appendChild(fv);
}
var css=document.createElement('style');
css.textContent='#hwbBtn{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;z-index:9998;background:linear-gradient(180deg,#33CCC7,#1B918D);box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 30px rgba(42,193,188,.35);display:flex;align-items:center;justify-content:center}'
+'#hwbBtn .ring{width:26px;height:26px;border-radius:50%;border:6px solid #fff;box-sizing:border-box}'
+'#hwbPanel{position:fixed;right:16px;bottom:90px;width:min(360px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 120px));background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(13,42,41,.3);z-index:9999;display:none;flex-direction:column;overflow:hidden;font-family:inherit}'
+'#hwbPanel.open{display:flex}'
+'#hwbHead{background:linear-gradient(135deg,#0D2A29,#133A37);color:#EAF7F6;padding:14px 18px;display:flex;align-items:center;gap:10px}'
+'#hwbHead .r{width:18px;height:18px;border-radius:50%;border:4.5px solid #2AC1BC;box-sizing:border-box;box-shadow:0 0 10px rgba(42,193,188,.8)}'
+'#hwbHead b{font-weight:500;font-size:.98rem}'
+'#hwbHead small{color:#9FC4C1;font-weight:300;font-size:.72rem;display:block}'
+'#hwbBody{flex:1;overflow-y:auto;padding:14px;background:#F0FAF8}'
+'.hwbMsg{max-width:85%;padding:10px 13px;border-radius:14px;margin-bottom:9px;font-size:.87rem;line-height:1.55;white-space:pre-line}'
+'.hwbBot{background:#fff;border:1px solid #DCEEEC;border-bottom-left-radius:4px}'
+'.hwbUser{background:#2AC1BC;color:#fff;margin-left:auto;border-bottom-right-radius:4px}'
+'.hwbMsg a{color:#20A6A2;font-weight:600;text-decoration:none}'
+'.hwbChips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 10px}'
+'.hwbChips button{border:1.5px solid #BFE9E6;background:#fff;color:#20A6A2;border-radius:20px;padding:7px 12px;font-size:.8rem;cursor:pointer;font-family:inherit}'
+'.hwbChips button:hover{background:#E5F8F6}'
+'#hwbInputRow{display:flex;gap:8px;padding:10px;border-top:1px solid #DCEEEC;background:#fff}'
+'#hwbInput{flex:1;border:1.5px solid #DCEEEC;border-radius:12px;padding:10px 12px;font-size:.88rem;font-family:inherit}'
+'#hwbInput:focus{outline:none;border-color:#2AC1BC}'
+'#hwbSend{border:none;background:#2AC1BC;color:#fff;border-radius:12px;padding:0 16px;font-weight:600;cursor:pointer;font-family:inherit}'
+'#hwbClose{margin-left:auto;background:none;border:none;color:#9FC4C1;font-size:1.1rem;cursor:pointer}';
css.textContent+='@keyframes hwbPulse{0%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,.55)}70%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 16px rgba(42,193,188,0)}100%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,0)}}'
+'#hwbBtn.pulse{animation:hwbPulse 2.2s ease-out infinite}'
+'#hwbTeaser{position:fixed;right:88px;bottom:26px;z-index:9998;background:#0D2A29;color:#EAF7F6;padding:12px 40px 12px 16px;border-radius:16px;border-bottom-right-radius:4px;font-size:.86rem;line-height:1.5;box-shadow:0 10px 30px rgba(13,42,41,.35);cursor:pointer;max-width:240px;opacity:0;transform:translateY(8px);transition:.35s ease;font-family:inherit}'
+'#hwbTeaser.show{opacity:1;transform:translateY(0)}'
+'#hwbTeaser b{color:#7FE8E3;font-weight:600}'
+'#hwbTeaser .x{position:absolute;top:8px;right:10px;color:#6FB9B5;font-size:.85rem;padding:2px 4px}'
+'.hwbCtas{display:flex;flex-direction:column;gap:6px;margin:-3px 0 10px;max-width:85%}'
+'.hwbCtas a{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#2AC1BC;color:#fff;text-decoration:none;border-radius:12px;padding:10px 14px;font-size:.85rem;font-weight:600;box-shadow:0 3px 10px rgba(42,193,188,.35)}'
+'.hwbCtas a:hover{background:#20A6A2}'
+'.hwbCtas a .ar{font-weight:400}';
document.head.appendChild(css);

var MENUS=[
 ['💰 대출·DSR','loan'],['🧾 세금','tax'],['🛡️ 전세 안전','jeonse'],
 ['💍 혼인신고·명의','couple'],['🏡 청약·지원제도','support'],['🤝 전문가 연결','expert'],['📦 이사·잔금 로드맵','moving']
];
var ANSWERS={
 loan:'대출 관련이군요!\n\n• 월 상환액·총이자·DSR 확인 → <a href="/loan-calculator.html">대출·DSR 계산기</a>\n• LTV·DTI·DSR 개념부터 → <a href="/mortgage-basics.html">주담대 기초 가이드</a>\n\n은행권 DSR 한도는 40%예요. 계산기에 연소득을 넣으면 내 한도가 바로 나와요.',
 tax:'어떤 세금인가요?\n\n• 집 살 때 → <a href="/acquisition-tax.html">취득세 계산기</a>\n• 살 때·보유·팔 때 전체 구조 → <a href="/real-estate-tax.html">부동산 세금 한눈에</a>\n• 복비(중개보수) → <a href="/brokerage-calculator.html">중개보수 계산기</a>\n• 부부 명의에 따른 세금 → <a href="/myeongui-check.html">명의 자가진단</a>',
 jeonse:'보증금 지키는 게 최우선이죠.\n\n• 등기부등본 PDF 올려서 위험 확인 → <a href="/jeonse-safety-check.html">전세사기 체크</a>\n• 계약 전 확인 목록 → <a href="/jeonse-contract.html">전세 계약 체크리스트</a>\n• 사기 수법 미리 알기 → <a href="/jeonse-fraud.html">전세사기 유형 7가지</a>\n• 전세↔월세 뭐가 유리? → <a href="/jeonse-monthly.html">전월세 전환 계산기</a>',
 couple:'부부의 큰 결정 두 가지!\n\n• 혼인신고 지금 할까 미룰까 → <a href="/marriage-check.html">혼인신고 자가진단</a>\n• 집 명의 공동 vs 단독 → <a href="/myeongui-check.html">명의 자가진단</a>\n\n각각 12~13개 질문이면 우리 부부 답이 나와요.',
 support:'받을 수 있는 건 다 받아야죠.\n\n• 내게 맞는 지원제도 찾기 → <a href="/youth-housing.html">청년·신혼 주거지원 진단</a>\n• 청약 처음이라면 → <a href="/cheongyak-guide.html">청약 완벽 가이드</a>\n• 첫 집 로드맵 → <a href="/first-home.html">생애 첫 집 마련</a>',
 contract:'계약하고 나면 다 불안해요. 정상이에요!\n\n<a href="/contract-check.html">계약 셀프 검진</a>에서 월세 적정성·전세 안전장치·복비 초과 여부를 숫자로 확인해보세요. 이미 한 계약도 지금 할 일을 알려드려요.',
 moving:'큰 날일수록 순서가 생명이에요.\n\n• 매매 계약 전 → 잔금일 → 이사날, 단계별로 하나씩 체크 → <a href="/moving-guide.html">훤 로드맵</a>\n• 임대주택 입주라면 하자 점검부터 → <a href="/rental-care.html">하자 체크리스트</a>\n\n체크한 진행률은 저장되니까, 이사 준비하면서 하나씩 지워나가요!',
 expert:'혼자 결정하기 어려운 순간이네요.\n\n<a href="/experts.html">훤 매치 (전문가 찾기)</a>에서 중개사·세무사·법무사·변호사·대출상담사가 언제 필요한지, 고르는 법, 바로 연결 링크까지 정리해뒀어요.'
};
var KEYWORDS=[
 [/대출|dsr|한도|금리|이자|주담대|디딤돌|버팀목/i,'loan'],
 [/취득세|양도|보유세|종부세|재산세|세금|절세/i,'tax'],
 [/전세|보증금|등기부|깡통|사기|월세.*전환|전환.*월세|임차/i,'jeonse'],
 [/혼인|결혼|신고|명의|공동|단독|부부/i,'couple'],
 [/청약|특공|지원|월세지원|신혼부부|청년/i,'support'],
 [/전문가|세무사|중개사|변호사|법무사|상담|연결/i,'expert'],
 [/잘.*계약|계약.*맞|적정|바가지|비싸게|호구|검진/i,'contract'],
 [/이사|잔금|입주|이삿짐|전입|로드맵|절차|순서/i,'moving'],
 [/수익률|월세.*수익|상가|오피스텔.*투자/i,'tax'],
 [/복비|중개보수|수수료/i,'tax']
];
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
var btn=el('button','',null);btn.id='hwbBtn';btn.setAttribute('aria-label','부비 열기');btn.appendChild(el('span','ring',''));
var panel=el('div','',null);panel.id='hwbPanel';
panel.innerHTML='<div id="hwbHead"><span class="r"></span><div><b>부비</b><small>훤AI 부동산 비서 · 무엇이든 물어보세요</small></div><button id="hwbClose" aria-label="닫기">✕</button></div><div id="hwbBody"></div><div id="hwbInputRow"><input id="hwbInput" placeholder="예: 전세 계약 전에 뭘 확인해야 해?"><button id="hwbSend">전송</button></div>';
document.body.appendChild(btn);document.body.appendChild(panel);
btn.classList.add('pulse');
var teaser=null;
function hideTeaser(){ if(teaser){teaser.classList.remove('show');setTimeout(function(){teaser&&teaser.remove();teaser=null;},350);} }
try{
 if(!sessionStorage.getItem('hwbSeen')){
  teaser=el('div','',null);teaser.id='hwbTeaser';
  teaser.innerHTML='부동산, 깜깜한 게 있나요?<br>비서 <b>부비</b>에게 물어보세요 🔆<span class="x">✕</span>';
  document.body.appendChild(teaser);
  setTimeout(function(){teaser&&teaser.classList.add('show');},1400);
  setTimeout(hideTeaser,13000);
  teaser.querySelector('.x').addEventListener('click',function(e){e.stopPropagation();hideTeaser();sessionStorage.setItem('hwbSeen','1');});
  teaser.addEventListener('click',function(){btn.click();});
 }
}catch(e){}

var body=panel.querySelector('#hwbBody');
function scrollDown(){body.scrollTop=body.scrollHeight;}
function bot(html){body.appendChild(el('div','hwbMsg hwbBot',html));scrollDown();}
function user(t){body.appendChild(el('div','hwbMsg hwbUser',t.replace(/</g,'&lt;')));scrollDown();}
function chips(){
  var c=el('div','hwbChips',null);
  MENUS.forEach(function(m){
    var b=el('button','',m[0]);
    b.onclick=function(){user(m[0]);setTimeout(function(){bot(ANSWERS[m[1]]);offerChips();},250);};
    c.appendChild(b);
  });
  body.appendChild(c);scrollDown();
}
function offerChips(){
  var c=el('div','hwbChips',null);
  var b=el('button','','다른 질문 보기');
  b.onclick=function(){chips();};
  c.appendChild(b);body.appendChild(c);scrollDown();
}
var BOOBI_API='https://hwon-boobi.tndud-brad.workers.dev/chat';
var HIST=[];
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function mdLite(s){
 s=escapeHtml(s);
 s=s.replace(/\[([^\]]+)\]\((\/[^)\s]+|https?:[^)\s]+)\)/g,'<a href="$2">$1</a>');
 s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
 return s.replace(/\n/g,'<br>');
}
function botTyping(){
 var e=el('div','hwbMsg hwbBot','생각 중<span class="hwbDots">...</span>');
 e.id='hwbTyping'; body.appendChild(e); scrollDown(); return e;
}
var TOOLCTA=[
 ['/yield-calculator.html',/수익률|임대\s*수익/,'📈 임대수익 계산하러 가기'],
 ['/loan-calculator.html',/DSR|대출/i,'💰 대출·DSR 계산하러 가기'],
 ['/acquisition-tax.html',/취득세/,'🧾 취득세 계산하러 가기'],
 ['/brokerage-calculator.html',/중개보수|복비/,'🤝 중개보수 확인하러 가기'],
 ['/jeonse-monthly.html',/전월세\s*전환|전환율/,'🔁 전월세 전환 계산하러 가기'],
 ['/contract-check.html',/계약\s*(셀프)?\s*검진/,'🩺 계약 셀프 검진 하러 가기'],
 ['/jeonse-safety-check.html',/등기부/,'🛡️ 등기부 안전 체크하러 가기'],
 ['/myeongui-check.html',/명의/,'👥 명의 자가진단 하러 가기'],
 ['/marriage-check.html',/혼인신고/,'💍 혼인신고 자가진단 하러 가기'],
 ['/youth-housing.html',/주거지원|버팀목|디딤돌/,'🏡 주거지원 확인하러 가기'],
 ['/moving-guide.html',/잔금|이사/,'📦 이사·잔금 로드맵 보기'],
 ['/rental-board.html',/행복주택|임대주택\s*공고/,'🏢 임대주택 공고 보기'],
 ['/invest.html',/경매|소액\s*투자/,'📊 소액 투자 물건 보기'],
 ['/experts.html',/세무사|법무사|변호사|중개사|전문가/,'🧑‍💼 전문가 찾으러 가기']
];
function ctas(raw){
 var hits=[],i;
 for(i=0;i<TOOLCTA.length&&hits.length<2;i++){ if(raw.indexOf(TOOLCTA[i][0])>-1) hits.push(TOOLCTA[i]); }
 for(i=0;i<TOOLCTA.length&&hits.length<2;i++){ if(hits.indexOf(TOOLCTA[i])<0&&TOOLCTA[i][1].test(raw)) hits.push(TOOLCTA[i]); }
 if(!hits.length)return;
 var c=el('div','hwbCtas',null);
 hits.forEach(function(h){
   var a=document.createElement('a');a.href=h[0];
   a.innerHTML='<span>'+h[2]+'</span><span class="ar">→</span>';
   c.appendChild(a);
 });
 body.appendChild(c);scrollDown();
}
function llmAnswer(t){
 HIST.push({role:'user',content:t});
 if(HIST.length>12)HIST=HIST.slice(-12);
 var ty=botTyping();
 var ctrl=new AbortController();
 var to=setTimeout(function(){ctrl.abort();},15000);
 fetch(BOOBI_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:HIST}),signal:ctrl.signal})
 .then(function(r){clearTimeout(to);if(!r.ok)throw new Error('bad');return r.json();})
 .then(function(d){
   ty.remove();
   if(!d.reply)throw new Error('empty');
   HIST.push({role:'assistant',content:d.reply});
   bot(mdLite(d.reply));
   ctas(d.reply);
 })
 .catch(function(){
   ty.remove();
   ruleAnswer(t);
 });
}
var FLOW=null;
function fmt(n){return Math.round(n).toLocaleString('ko-KR');}
function parseMoney(t){
  t=t.replace(/,/g,'').replace(/원/g,'').trim();
  var eok=t.match(/([0-9.]+)\s*억/);
  var man=t.match(/([0-9.]+)\s*(천만|만)?/);
  var v=0;
  if(eok){ v+=parseFloat(eok[1])*10000; t=t.replace(eok[0],''); }
  var rest=t.match(/([0-9.]+)\s*(천만|천|만)?/);
  if(rest&&rest[1]){
    var n=parseFloat(rest[1]);
    if(rest[2]==='천만'||rest[2]==='천') v+=n*1000;
    else v+=n;
  }
  return v>0?Math.round(v):null;
}
function startWolseFlow(){
  FLOW={type:'wolse',step:0,data:{}};
  bot('오, 그 불안 제가 잘 알아요. 숫자로 확인해봐요!\n\n<b>보증금</b>이 얼마예요? (예: 1000, 5000)');
}
function startFeeFlow(){
  FLOW={type:'fee',step:0,data:{}};
  bot('복비 검증 들어갑니다.\n\n어떤 계약이었어요? <b>매매 / 전세 / 월세</b> 중 하나로 답해주세요.');
}
function flowStep(t){
  var f=FLOW, d=f.data;
  if(/그만|취소|아니야|됐어/.test(t)){ FLOW=null; bot('알겠어요, 언제든 다시 물어보세요!'); chips(); return; }
  if(f.type==='wolse'){
    if(f.step===0){
      var v=parseMoney(t);
      if(v===null){ bot('만원 단위 숫자로 알려주세요. 예: 1000 (천만원), 1억이면 10000'); return; }
      d.dep=v; f.step=1;
      bot('보증금 '+fmt(v*10000)+'원, 접수! <b>월세</b>는 얼마예요? (관리비 빼고)');
      return;
    }
    if(f.step===1){
      var v=parseMoney(t);
      if(v===null||v>1000){ bot('월세를 만원 단위로요. 예: 65'); return; }
      d.rent=v; f.step=2;
      bot('마지막! 같은 건물이나 동네의 <b>전세 시세</b>를 알면 알려주세요 (예: 1.8억, 18000).\n모르면 "몰라"라고 해도 돼요.');
      return;
    }
    if(f.step===2){
      var conv=d.dep+Math.round(d.rent*12/0.045);
      var msg='정리해볼게요 🔍\n\n보증금 '+fmt(d.dep*10000)+'원 + 월세 '+fmt(d.rent*10000)+'원\n= 전세로 환산하면 <b>'+fmt(conv*10000)+'원</b> (법정 전환율 4.5%)\n\n';
      if(/몰라|모름|모르/.test(t)){
        msg+='이 환산가를 네이버부동산의 같은 건물 전세 매물가와 비교해보세요. 환산가가 시세보다 <b>낮으면 잘한 계약</b>이에요.\n\n더 자세한 검진은 → <a href="/contract-check.html">계약 셀프 검진</a>';
      } else {
        var js_=parseMoney(t);
        if(js_===null){ bot('시세를 숫자로 알려주시거나 "몰라"라고 해주세요!'); return; }
        var ratio=conv/js_*100;
        var verdict = ratio<=95 ? '🟢 시세보다 유리해요. 잘 계약하셨어요, 걱정 놓으셔도 됩니다!' : ratio<=110 ? '🟡 시세 수준의 평범한 계약이에요. 바가지 아닙니다.' : '🟠 전세 시세 대비 '+(ratio-100).toFixed(0)+'% 비싼 편이에요. 갱신 때 이 숫자로 협상해보세요.';
        msg+='전세 시세 '+fmt(js_*10000)+'원 대비 <b>'+ratio.toFixed(0)+'%</b>\n\n'+verdict+'\n\n영수증 챙길 것: 전입신고+확정일자는 하셨죠? 안 했으면 오늘 정부24에서 5분!';
      }
      FLOW=null; bot(msg); offerChips(); return;
    }
  }
  if(f.type==='fee'){
    if(f.step===0){
      var m=t.match(/매매|전세|월세/);
      if(!m){ bot('매매 / 전세 / 월세 중 하나로 답해주세요!'); return; }
      d.t=m[0]; f.step=1;
      bot(d.t==='월세'?'보증금과 월세를 알려주세요. 예: "보증금 1000 월세 60"':'<b>거래금액</b>이 얼마였어요? (예: 3억, 30000)');
      return;
    }
    if(f.step===1){
      if(d.t==='월세'){
        var dep=t.match(/보증금\s*([0-9.억천만,]+)/); var mon=t.match(/월세\s*([0-9.,]+)/);
        var depV=dep?parseMoney(dep[1]):null; var monV=mon?parseMoney(mon[1]):null;
        if(depV===null||monV===null){ bot('"보증금 1000 월세 60" 형식으로 알려주세요!'); return; }
        d.man=depV+monV*100; if(d.man<5000)d.man=depV+monV*70;
      } else {
        var v=parseMoney(t);
        if(v===null){ bot('금액을 숫자로요. 예: 3억 또는 30000'); return; }
        d.man=v;
      }
      f.step=2;
      bot('실제로 <b>낸(요구받은) 복비</b>는 얼마예요? (만원 단위, 부가세 빼고)');
      return;
    }
    if(f.step===2){
      var paid=parseMoney(t);
      if(paid===null){ bot('낸 복비를 만원 단위 숫자로요. 예: 90'); return; }
      var SALE=[[5000,0.6,25],[20000,0.5,80],[90000,0.4,null],[120000,0.5,null],[150000,0.6,null],[Infinity,0.7,null]];
      var RENT=[[5000,0.5,20],[10000,0.4,30],[60000,0.3,null],[120000,0.4,null],[150000,0.5,null],[Infinity,0.6,null]];
      var tbl=d.t==='매매'?SALE:RENT;
      var row=tbl[tbl.length-1];
      for(var i=0;i<tbl.length;i++){ if(d.man<tbl[i][0]){row=tbl[i];break;} }
      var cap=d.man*row[1]/100; if(row[2]!==null&&cap>row[2])cap=row[2];
      var msg='법정 상한: <b>'+fmt(cap*10000)+'원</b> (요율 '+row[1]+'%)\n낸 금액: '+fmt(paid*10000)+'원\n\n';
      if(paid<=cap*1.001) msg+='🟢 상한 이내 — 정상적인 복비예요!';
      else if(paid<=cap*1.1+1.1) msg+='🟡 살짝 넘는데 부가세 10% 포함이면 정상일 수 있어요. 영수증에서 부가세 표기를 확인하세요.';
      else msg+='🔴 상한을 '+fmt((paid-cap)*10000)+'원 초과! 초과분은 반환 청구가 가능해요. 자세한 건 → <a href="/contract-check.html">계약 검진</a>';
      FLOW=null; bot(msg); offerChips(); return;
    }
  }
}
function ruleAnswer(t){
  for(var i=0;i<KEYWORDS.length;i++){ if(KEYWORDS[i][0].test(t)){ bot(ANSWERS[KEYWORDS[i][1]]); offerChips(); return; } }
  bot('제가 바로 답할 수 있게 배우는 중이에요! 이런 건 지금 당장 도와드릴 수 있어요:\n\n• "월세 적당한지 모르겠어" → 대화로 바로 검진\n• "복비 많이 낸 건가?" → 법정 상한 확인\n\n아니면 아래에서 골라주세요 👇');
  chips();
}
function answer(t){
  if(FLOW){ flowStep(t); return; }
  if(/월세/.test(t)&&/적당|적정|비싸|맞나|맞는|괜찮|잘.*계약|잘한/.test(t)){ startWolseFlow(); return; }
  if(/복비|중개보수|수수료/.test(t)&&/많|비싸|맞나|맞는|적정|요구|달라/.test(t)){ startFeeFlow(); return; }
  if(BOOBI_API.indexOf('http')===0){ llmAnswer(t); return; }
  ruleAnswer(t);
}
var opened=false;
btn.onclick=function(){
  hideTeaser();btn.classList.remove('pulse');try{sessionStorage.setItem('hwbSeen','1');}catch(e){}
  panel.classList.toggle('open');
  if(panel.classList.contains('open')&&!opened){
    opened=true;
    bot('안녕하세요, 부비예요! 🔆\n훤AI의 부동산 비서, 부동산 비서라서 부비 🙋\n깜깜한 곳을 훤히 밝혀드릴게요. 어떤 게 궁금하세요?');
    chips();
  }
};
panel.querySelector('#hwbClose').onclick=function(){panel.classList.remove('open');};
function send(){
  var inp=panel.querySelector('#hwbInput');
  var t=inp.value.trim(); if(!t)return;
  user(t); inp.value='';
  setTimeout(function(){answer(t);},300);
}
panel.querySelector('#hwbSend').onclick=send;
panel.querySelector('#hwbInput').addEventListener('keydown',function(e){if(e.key==='Enter')send();});
})();
/* v2.1 cta */
