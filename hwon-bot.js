/* 부비 — 부동산 비서 */
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
if(!document.querySelector('link[rel="manifest"]')){
  var mf=document.createElement('link');mf.rel='manifest';mf.href='/manifest.json';document.head.appendChild(mf);
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').catch(function(){});
}
var hwbDeferredPrompt=null;
window.addEventListener('beforeinstallprompt',function(ev){
  ev.preventDefault();
  hwbDeferredPrompt=ev;
  if(document.getElementById('hwbInstall'))return;
  try{ if(localStorage.getItem('hwbInstallDismiss'))return; }catch(e){}
  var ib=document.createElement('button');
  ib.id='hwbInstall';
  ib.innerHTML='📱 부비 앱으로 설치 <span style="opacity:.6;margin-left:6px">✕</span>';
  ib.style.cssText='position:fixed;left:16px;bottom:20px;z-index:9997;border:none;border-radius:24px;padding:11px 16px;background:#0D2A29;color:#EAF7F6;font-size:.85rem;font-weight:600;box-shadow:0 8px 24px rgba(13,42,41,.35);cursor:pointer;font-family:inherit';
  ib.addEventListener('click',function(e){
    var r=ib.getBoundingClientRect();
    if(e.clientX>r.right-34){ ib.remove(); try{localStorage.setItem('hwbInstallDismiss','1');}catch(x){} return; }
    if(hwbDeferredPrompt){ hwbDeferredPrompt.prompt(); hwbDeferredPrompt=null; }
    ib.remove();
  });
  document.body.appendChild(ib);
});
window.addEventListener('appinstalled',function(){
  var ib=document.getElementById('hwbInstall'); if(ib)ib.remove();
});
var css=document.createElement('style');
css.textContent='#hwbBtn{position:fixed;right:20px;bottom:20px;width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;z-index:9998;background:#fff;box-shadow:0 6px 20px rgba(42,193,188,.42),0 0 30px rgba(42,193,188,.22);display:flex;align-items:center;justify-content:center;padding:0;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}'
+'#hwbBtn:hover{transform:translateY(-3px) scale(1.05)}'
+'#hwbBtn .ring{width:46px;height:46px;border:none;border-radius:0;background:url("/boobi-ring-3d.png") center/contain no-repeat;animation:hwbFloat 4.5s ease-in-out infinite}'
+'@keyframes hwbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}'
+'@media(prefers-reduced-motion:reduce){#hwbBtn .ring{animation:none}}'
+'#hwbPanel{position:fixed;right:16px;bottom:90px;width:min(360px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 120px));background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(13,42,41,.3);z-index:9999;display:none;flex-direction:column;overflow:hidden;font-family:inherit}'
+'#hwbPanel.open{display:flex}'
+'#hwbHead{background:linear-gradient(135deg,#0D2A29,#133A37);color:#EAF7F6;padding:14px 18px;display:flex;align-items:center;gap:10px}'
+'#hwbHead .r{width:26px;height:26px;flex:0 0 auto;background:url("/boobi-ring-3d.png") center/contain no-repeat;filter:drop-shadow(0 0 6px rgba(42,193,188,.55))}'
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
+'#hwbSend{border:none;background:#2AC1BC;color:#fff;border-radius:12px;padding:0;min-width:46px;width:46px;flex:0 0 46px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;transition:background .15s,transform .12s}'
+'#hwbSend:hover{background:#20A6A2}'
+'#hwbSend:active{transform:scale(.94)}'
+'#hwbSend svg{display:block}'
+'#hwbClose{margin-left:auto;background:none;border:none;color:#9FC4C1;font-size:1.1rem;cursor:pointer}';
css.textContent+='@keyframes hwbPulse{0%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,.55)}70%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 16px rgba(42,193,188,0)}100%{box-shadow:0 6px 20px rgba(42,193,188,.5),0 0 0 0 rgba(42,193,188,0)}}'
+'#hwbBtn.pulse{animation:hwbPulse 2.2s ease-out infinite}'
+'#hwbTeaser{position:fixed;right:88px;bottom:26px;z-index:9998;background:#0D2A29;color:#EAF7F6;padding:12px 40px 12px 16px;border-radius:16px;border-bottom-right-radius:4px;font-size:.86rem;line-height:1.5;box-shadow:0 10px 30px rgba(13,42,41,.35);cursor:pointer;max-width:240px;opacity:0;transform:translateY(8px);transition:.35s ease;font-family:inherit}'
+'#hwbTeaser.show{opacity:1;transform:translateY(0)}'
+'#hwbTeaser b{color:#7FE8E3;font-weight:600}'
+'#hwbTeaser .x{position:absolute;top:8px;right:10px;color:#6FB9B5;font-size:.85rem;padding:2px 4px}'
+'#hwbTyping{display:flex;align-items:center;gap:10px}'
+'.hwbSpin{width:20px;height:20px;border-radius:50%;border:3.5px solid #DCEEEC;border-top-color:#2AC1BC;border-right-color:#7FE8E3;animation:hwbSpinner .75s linear infinite;box-shadow:0 0 10px rgba(42,193,188,.3);flex:0 0 auto;box-sizing:border-box}'
+'@keyframes hwbSpinner{to{transform:rotate(360deg)}}'
+'.hwbTyTxt{font-size:.85rem;color:#547471;transition:opacity .3s}'
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
 moving:'큰 날일수록 순서가 생명이에요.\n\n• 매매 계약 전 → 잔금일 → 이사날, 단계별로 하나씩 체크 → <a href="/moving-guide.html">부비 로드맵</a>\n• 임대주택 입주라면 하자 점검부터 → <a href="/rental-care.html">하자 체크리스트</a>\n\n체크한 진행률은 저장되니까, 이사 준비하면서 하나씩 지워나가요!',
 expert:'혼자 결정하기 어려운 순간이네요.\n\n<a href="/experts.html">부비 매치 (전문가 찾기)</a>에서 중개사·세무사·법무사·변호사·대출상담사가 언제 필요한지, 고르는 법, 바로 연결 링크까지 정리해뒀어요.'
,
 marriage_docs:'혼인신고 서류, 생각보다 간단해요!\n\n• <b>혼인신고서</b> 1부 — 구청·주민센터에 비치돼 있어요 (정부24에서 양식 미리 받기도 가능)\n• <b>두 사람 신분증</b> — 한 명만 방문하면 안 온 사람의 신분증(또는 사본)과 도장 필요\n• <b>증인 2명의 서명</b> — 신고서 뒤쪽 증인란, 방문 전에 미리 받아두면 편해요\n• 가족관계증명서는 대부분 공무원 전산조회로 대체\n\n접수는 전국 아무 시청·구청·읍면사무소에서나 가능해요.\n\n그런데 혼인신고 <b>타이밍</b>이 청약·대출에 영향이 커요 → <a href="/marriage-check.html">혼인신고 자가진단</a>'
};
var KEYWORDS=[
 [/혼인.*서류|서류.*혼인|혼인신고.*(준비|필요|어떻게|방법)/,'marriage_docs'],
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
panel.innerHTML='<div id="hwbHead"><span class="r"></span><div><b>부비</b><small>부동산 비서 · 무엇이든 물어보세요</small></div><button id="hwbClose" aria-label="닫기">✕</button></div><div id="hwbBody"></div><div id="hwbInputRow"><input id="hwbInput" placeholder="예: 전세 계약 전에 뭘 확인해야 해?"><button id="hwbSend" aria-label="전송"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.4 20.4L20.85 12.92C21.66 12.57 21.66 11.43 20.85 11.08L3.4 3.6C2.74 3.31 2.01 3.8 2.01 4.51L2 9.12C2 9.62 2.37 10.05 2.87 10.11L17 12L2.87 13.88C2.37 13.95 2 14.38 2 14.88L2.01 19.49C2.01 20.2 2.74 20.69 3.4 20.4Z" fill="#fff"/></svg></button></div>';
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
 if(window.bbHumanize) s=bbHumanize(s);   /* 개발용 필드명이 화면에 나오지 않게 */
 s=escapeHtml(s);
 s=s.replace(/\[([^\]]+)\]\((\/[^)\s]+|https?:[^)\s]+)\)/g,'<a href="$2">$1</a>');
 s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
 return s.replace(/\n/g,'<br>');
}
function botTyping(){
 var e=el('div','hwbMsg hwbBot','');
 e.id='hwbTyping';
 e.innerHTML='<span class="hwbSpin"></span><span class="hwbTyTxt">부비가 최적의 답변을 생성 중이에요</span>';
 body.appendChild(e); scrollDown();
 var msgs=['부비가 최적의 답변을 생성 중이에요','자료를 꼼꼼히 뒤져보는 중이에요','숫자를 한 번 더 검산하는 중이에요','거의 다 됐어요!'];
 var i=0;
 var t=setInterval(function(){
   if(!document.body.contains(e)){clearInterval(t);return;}
   if(e.dataset.hold==='1')return; /* 재시도 안내 중엔 문구 로테이션 정지 */
   i=Math.min(i+1,msgs.length-1);
   var tx=e.querySelector('.hwbTyTxt');
   if(tx){ tx.style.opacity=0; setTimeout(function(){ tx.textContent=msgs[i]; tx.style.opacity=1; },250); }
 },3500);
 return e;
}
/* ── 부비 웹 기능 카탈로그 ──────────────────────────────────────────
   워커 SYS 프롬프트의 [부비 웹 기능 전체 목록]과 1:1로 맞춰서 관리할 것.
   형식: [경로, 매칭 정규식, 버튼 라벨]
   순서 = 우선순위. 구체적인 항목을 위에, 포괄적인 항목을 아래에 둔다. */
var TOOLCTA=[
 /* 체크리스트·현장 */
 ['/auction-survey.html',/현장조사서|임장\s*(보고서|양식|폼|기록)|경매.*임장|임장.*경매/,'📝 임장 현장조사서 열기'],
 ['/imjang-checklist.html',/임장|집\s*보러|매물\s*보러|현장\s*답사|보러\s*가|집\s*구경|단지\s*비교/,'📋 임장 체크리스트 열기'],
 ['/repair-booking.html',/(하자|사전)\s*점검\s*(예약|대행|신청)|점검\s*업체/,'📅 하자점검 방문 예약하기'],
 ['/rental-care.html',/사전\s*점검|입주\s*점검|하자\s*(점검|체크|보수)|담보기간/,'🔍 입주 사전점검 체크리스트'],
 ['/repair-check.html',/수리\s*(책임|비용|의무)|누가\s*(고치|고쳐|부담|내|물어)|집주인.*(고쳐|고치)|하자\s*책임|고장.*(났|나서|누가)/,'🛠️ 수리 책임 진단하기'],
 ['/interior-checklist.html',/인테리어|리모델링|견적서|공사\s*견적/,'🧾 인테리어 견적 체크리스트'],
 ['/jangma-house-check.html',/장마|누수|곰팡이|침수|결로/,'🌧️ 장마철 집 점검 7가지'],
 ['/jeonse-contract.html',/전세\s*계약\s*(전|시|할|체크|확인)|전세.*체크리스트/,'🛡️ 전세 계약 체크리스트'],
 ['/auction-bid-checklist.html',/입찰\s*(준비|체크|당일|서류)|경매\s*입찰/,'⚖️ 경매 입찰 체크리스트'],
 ['/auction-contract-check.html',/계약\s*체크리스트|계약서.*(확인|검토)|특약/,'📄 계약 체크리스트 열기'],
 ['/model-house.html',/모델하우스|견본주택|분양\s*상담사|유닛\s*관람/,'🏢 모델하우스 호갱 방지 가이드'],
 ['/moving-guide.html',/이사|잔금|입주\s*준비|전입신고|이삿짐|로드맵/,'📦 이사·잔금 로드맵 열기'],
 /* AI 진단·자가진단 */
 ['/apt-finder.html',/내\s*아파트\s*찾기|아파트\s*(추천|골라)|어디\s*(살|사야)|집\s*추천|예산.*(아파트|단지)/,'🏠 내 아파트 찾기 시작'],
 ['/home-report.html',/종합\s*리포트|집\s*리포트|이\s*집\s*(사도|살까|어때)|주소.*리포트/,'🏠 집 종합 리포트 받기'],
 ['/jeonse-safety-check.html',/등기부|전세\s*사기|전세사기|깡통|근저당|보증금.*(위험|안전|떼)/,'🛡️ 전세사기 정밀진단 하기'],
 ['/contract-check.html',/계약\s*(셀프\s*)?검진|잘\s*계약|계약.*맞나|바가지|호구|월세.*(적당|적정|비싼|맞)|(적당|적정).*월세/,'🩺 계약 셀프 검진 하기'],
 ['/marriage-check.html',/혼인신고|결혼.*(청약|대출).*유리/,'💍 혼인신고 자가진단 하기'],
 ['/myeongui-check.html',/공동\s*명의|단독\s*명의|명의.*(누구|어떻게|유리)|명의/,'👥 명의 자가진단 하기'],
 ['/policy-finder.html',/정책\s*대출|디딤돌|버팀목|신생아\s*(대출|특공)|특별\s*공급|특공/,'🎯 내게 맞는 정책대출 찾기'],
 ['/rental-match.html',/(임대주택|공공임대|행복주택).*(자격|되나|가능)|자격\s*판정/,'✅ 임대주택 자격 판정받기'],
 ['/youth-housing.html',/주거\s*지원|청년.*지원|신혼.*지원|월세\s*지원|지원\s*제도/,'🏡 주거지원 자격 진단하기'],
 ['/wealth-check.html',/자산\s*진단|또래|부자\s*(비교|기준)|내\s*위치/,'📊 내 자산 진단하기'],
 ['/senior-residence-finder.html',/실버타운|시니어\s*레지던스|요양원|요양병원|부모님.*모시/,'🧓 시니어 주거 자가진단'],
 /* 계산기 */
 ['/auction-yield.html',/경매.*수익률|낙찰가.*(수익|계산)|명도비/,'📊 경매 수익률 계산하기'],
 ['/yield-calculator.html',/수익률|임대\s*수익|월세\s*수익/,'📈 임대수익 계산하러 가기'],
 ['/loan-calculator.html',/DSR|주담대|대출|한도|상환액|원리금|금리|이자/i,'💰 대출·DSR 계산하러 가기'],
 ['/acquisition-tax.html',/취득세/,'🧾 취득세 계산하러 가기'],
 ['/capital-gains-tax.html',/양도\s*소득세|양도세/,'💸 양도세 계산하러 가기'],
 ['/jongbuse-calculator.html',/종부세|종합\s*부동산세/,'🏛️ 종부세 계산하러 가기'],
 ['/property-tax.html',/재산세|보유세/,'🏠 재산세 계산하러 가기'],
 ['/gift-tax.html',/증여세|증여/,'🎁 증여세 계산하러 가기'],
 ['/inheritance-tax.html',/상속세|상속|유류분/,'📜 상속세 계산하러 가기'],
 ['/jonghap-income-tax.html',/종합\s*소득세|종소세|임대\s*소득/,'🧾 종합소득세 계산하러 가기'],
 ['/brokerage-calculator.html',/중개\s*보수|복비|중개\s*수수료/,'🤝 중개보수 확인하러 가기'],
 ['/jeonse-monthly.html',/전월세\s*전환|전환율|전세.*월세.*(바꾸|돌리|전환)/,'🔁 전월세 전환 계산하러 가기'],
 ['/housing-pension.html',/주택\s*연금|역모기지/,'👵 주택연금 계산하러 가기'],
 ['/downsizing-tax.html',/다운사이징|집.*줄이|큰\s*집.*팔/,'📉 다운사이징 세금 시뮬'],
 ['/seller-financing-calc.html',/셀러\s*파이낸싱|매도인\s*금융|차용증|금전소비대차/,'🧮 셀러 파이낸싱 계산기'],
 /* 공고·시세·지도 */
 ['/cheongyak-board.html',/청약\s*(공고|일정|경쟁률|넣|물량)|분양\s*공고|줍줍|무순위|입주자\s*모집/,'📢 실시간 청약·분양 공고 보기'],
 ['/rental-board.html',/행복주택|매입\s*임대|공공\s*임대|임대주택\s*공고|국민임대/,'🏢 임대주택 공고 보기'],
 ['/housing-alert.html',/알림\s*(신청|받|설정)|맞춤\s*알림|놓치지/,'🔔 청약·임대 알림 신청하기'],
 ['/calendar.html',/캘린더|일정표|금리\s*발표|이달의\s*일정/,'📅 부동산 캘린더 보기'],
 ['/redev-price.html',/재건축.*(시세|실거래)|정비구역.*시세|세대수\s*변화/,'🏗️ 재건축 단지 시세 보기'],
 ['/redevelopment-map.html',/재개발\s*지도|정비\s*사업\s*(현황|지도)|추진\s*현황/,'🗺️ 전국 재개발 지도 보기'],
 ['/auction-tools.html',/경매|낙찰|명도|권리\s*분석/,'⚖️ 경매 실무 툴 보기'],
 ['/invest.html',/소액\s*투자|투자\s*방법|재테크/,'📊 부동산 투자 방법 보기'],
 /* 상담·연결 */
 ['/tax-consult.html',/세무\s*상담|절세\s*상담|가족\s*법인/,'🧾 세무사 상담 연결하기'],
 ['/legal-consult.html',/법률\s*상담|지역주택조합|지주택|허위\s*분양|분양\s*피해/,'⚖️ 법률 상담 연결하기'],
 ['/experts.html',/전문가|세무사|법무사|변호사|중개사|상담\s*(받|연결)/,'🧑‍💼 전문가 찾으러 가기'],
 /* 허브 (가장 포괄적 — 항상 마지막) */
 ['/tools.html',/무슨\s*기능|어떤\s*(기능|서비스|거\s*할)|뭐\s*(할\s*수|있어)|기능\s*(목록|전체|알려)|부비.*할\s*수/,'🧰 부비 기능 전체 보기',1],
 ['/tax-calculator.html',/세금.*계산|세금\s*계산기/,'🧮 세금 계산기 모음 열기',1],
 ['/calculator.html',/계산기/,'🧮 계산기 모음 열기',1]
];
/* 답변 아래에 기능 바로가기 버튼(최대 2개)을 붙인다.
   raw = 부비의 답변, q = 사용자가 방금 물어본 말.
   LLM이 링크를 빠뜨려도 q 매칭으로 버튼은 반드시 뜨게 하는 게 핵심. */
function ctas(raw,q){
 var hits=[],seen={},i;
 function add(h){ if(seen[h[0]]||hits.length>=2)return; if(h[3]&&hits.length)return; /* 허브 페이지는 구체적인 버튼이 없을 때만 */ seen[h[0]]=1; hits.push(h); }
 /* 1순위: 답변 본문에 이미 걸린 경로 */
 for(i=0;i<TOOLCTA.length;i++){ if(raw.indexOf(TOOLCTA[i][0])>-1) add(TOOLCTA[i]); }
 /* 2순위: 사용자가 물어본 것 (의도가 가장 확실한 신호) */
 if(q) for(i=0;i<TOOLCTA.length;i++){ if(TOOLCTA[i][1].test(q)) add(TOOLCTA[i]); }
 /* 3순위: 답변 본문 키워드 */
 for(i=0;i<TOOLCTA.length;i++){ if(TOOLCTA[i][1].test(raw)) add(TOOLCTA[i]); }
 if(!hits.length)return;
 var c=el('div','hwbCtas',null);
 hits.forEach(function(h){
   var a=document.createElement('a');a.href=h[0];
   a.innerHTML='<span>'+h[2]+'</span><span class="ar">→</span>';
   a.addEventListener('click',function(){ try{ if(window.gtag)gtag('event','chat_cta_click',{link_url:h[0]}); }catch(e){} });
   c.appendChild(a);
 });
 body.appendChild(c);scrollDown();
}
/* 사용자가 부비의 기능을 이름으로 콕 집어 찾는 경우(체크리스트/계산기/진단/공고/리포트 …)
   → LLM을 거치지 않고 즉시 해당 페이지로 연결한다. 글로 대신 써주는 사고를 원천 차단. */
var TOOLNOUN=/체크\s*리스트|체크리스트|현장조사서|자가\s*진단|진단|계산기|계산\s*해|리포트|공고|알림|지도|캘린더|양식|서식|폼|기능|페이지|링크|어디\s*(서|에|있|가)/;
function directLink(t){
 if(t.length>60) return false;           /* 긴 상담성 질문은 LLM에게 */
 if(!TOOLNOUN.test(t)) return false;
 var hits=[],seen={},i;
 for(i=0;i<TOOLCTA.length && hits.length<2;i++){
   var h=TOOLCTA[i]; if(seen[h[0]]||!h[1].test(t))continue; if(h[3]&&hits.length)continue; seen[h[0]]=1; hits.push(h);
 }
 if(!hits.length) return false;
 var LINES=['그거 부비 안에 있어요! 👇 바로 열어드릴게요.','네, 부비에서 바로 하실 수 있어요 👇','찾으시는 거 여기 있어요 👇 눌러서 바로 시작하세요.'];
 var msg=LINES[Math.floor(Math.random()*LINES.length)];
 if(hits.length>1) msg='관련된 기능 두 개를 찾았어요 👇';
 bot(msg);
 var c=el('div','hwbCtas',null);
 hits.forEach(function(h){
   var a=document.createElement('a');a.href=h[0];
   a.innerHTML='<span>'+h[2]+'</span><span class="ar">→</span>';
   a.addEventListener('click',function(){ try{ if(window.gtag)gtag('event','chat_cta_click',{link_url:h[0],from:'direct'}); }catch(e){} });
   c.appendChild(a);
 });
 body.appendChild(c);
 var ch=el('div','hwbChips',null);
 var b=el('button','','부비가 설명도 해줘');
 b.onclick=function(){ ch.remove(); llmAnswer(t); };
 ch.appendChild(b); body.appendChild(ch); scrollDown();
 try{ if(window.gtag)gtag('event','chat_direct_link',{q:t.slice(0,60)}); }catch(e){}
 return true;
}
/* 스트리밍 우선: 첫 문장이 1~2초 안에 나타나기 시작. 실패 시 기존(비스트리밍) 경로로 자동 폴백 */
function llmAnswer(t){
 HIST.push({role:'user',content:t});
 if(HIST.length>12)HIST=HIST.slice(-12);
 var ty=botTyping();
 llmStream(t, ty);
}
function llmStream(t, ty){
 var acc='', bubble=null;
 var ctrl=new AbortController();
 var to=setTimeout(function(){ctrl.abort();},90000);
 function render(){
   if(!bubble){ ty.remove(); bubble=el('div','hwbMsg hwbBot',''); body.appendChild(bubble); }
   bubble.innerHTML=mdLite(acc); scrollDown();
 }
 fetch(BOOBI_API.replace('/chat','/chat-stream'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:HIST}),signal:ctrl.signal})
 .then(function(r){
   if(!r.ok||!r.body) throw new Error('bad');
   var reader=r.body.getReader(), dec=new TextDecoder(), buf='', failed=null;
   function handleLine(ln){
     if(!ln)return;
     var o; try{o=JSON.parse(ln);}catch(e){return;}
     if(o.t!==undefined){ acc+=o.t; render(); }
     else if(o.s && !bubble){ var tx=ty.querySelector('.hwbTyTxt'); if(tx){ ty.dataset.hold='1'; tx.textContent=o.s; } }
     else if(o.error){ failed=o.error; }
   }
   function pump(){
     return reader.read().then(function(x){
       if(x.done){
         if(buf)handleLine(buf.trim());
         clearTimeout(to);
         if(!acc) throw new Error(failed||'empty');
         HIST.push({role:'assistant',content:acc});
         ctas(acc,t);
         return;
       }
       buf+=dec.decode(x.value,{stream:true});
       var ls=buf.split('\n'); buf=ls.pop();
       for(var i=0;i<ls.length;i++) handleLine(ls[i]);
       return pump();
     });
   }
   return pump();
 })
 .catch(function(){
   clearTimeout(to);
   if(bubble) bubble.remove();
   if(!document.body.contains(ty)) ty=botTyping();
   delete ty.dataset.hold;
   llmAnswerHTTP(t, 2, ty); // 기존 경로로 폴백 (HIST엔 이미 user가 있으므로 attempt=2)
 });
}
function llmAnswerHTTP(t, attempt, ty){
 attempt=attempt||1;
 if(attempt===1){
   HIST.push({role:'user',content:t});
   if(HIST.length>12)HIST=HIST.slice(-12);
 }
 ty=ty||botTyping();
 var ctrl=new AbortController();
 // 검색·실거래 도구 호출이 겹치면 45초를 넘기도 해서 70초로 여유. 실패해도 유저에게 미루지 않고 1회 자동 재시도.
 var to=setTimeout(function(){ctrl.abort();},70000);
 fetch(BOOBI_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:HIST}),signal:ctrl.signal})
 .then(function(r){clearTimeout(to);if(!r.ok)throw new Error('bad');return r.json();})
 .then(function(d){
   if(!d.reply)throw new Error('empty');
   ty.remove();
   HIST.push({role:'assistant',content:d.reply});
   bot(mdLite(d.reply));
   ctas(d.reply,t);
 })
 .catch(function(){
   clearTimeout(to);
   if(attempt<2 && document.body.contains(ty)){
     // 1회 자동 재시도 — 스피너 유지한 채 안내만 바꿈
     ty.dataset.hold='1';
     var tx=ty.querySelector('.hwbTyTxt');
     if(tx){ tx.textContent='응답이 늦어지네요 — 자동으로 다시 시도 중이에요 🔁'; }
     setTimeout(function(){ delete ty.dataset.hold; llmAnswerHTTP(t, attempt+1, ty); },1500);
     return;
   }
   ty.remove();
   HIST.pop(); // 실패한 질문은 히스토리에서 제거해 재질문이 깨끗하게 되도록
   bot('앗, AI 답변 서버 연결이 잠시 원활하지 않네요 🙏\n기다리시게 하지 않을게요 — 부비가 바로 아는 내용부터 안내해드릴게요!');
   ruleAnswer(t);
   var c=el('div','hwbChips',null);
   var b=el('button','','<img src="/boobi-ring-3d.png" alt="" style="width:1.05em;height:1.05em;object-fit:contain;vertical-align:-.18em;margin-right:.35em;filter:drop-shadow(0 2px 5px rgba(42,193,188,.45))">AI 상세 답변 다시 받기 — "'+escapeHtml(t.length>14?t.slice(0,14)+'…':t)+'"');
   b.onclick=function(){ c.remove(); llmAnswer(t); };
   c.appendChild(b); body.appendChild(c); scrollDown();
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
  for(var i=0;i<KEYWORDS.length;i++){ if(KEYWORDS[i][0].test(t)){ bot(ANSWERS[KEYWORDS[i][1]]); ctas(ANSWERS[KEYWORDS[i][1]],t); offerChips(); return; } }
  bot('제가 바로 답할 수 있게 배우는 중이에요! 이런 건 지금 당장 도와드릴 수 있어요:\n\n• "월세 적당한지 모르겠어" → 대화로 바로 검진\n• "복비 많이 낸 건가?" → 법정 상한 확인\n\n아니면 아래에서 골라주세요 👇');
  ctas('',t);   /* 규칙 답변으로 못 잡아도 관련 기능 버튼은 붙여준다 */
  chips();
}
function answer(t){
  try{ if(window.gtag)gtag('event','chat_ask',{q:String(t).slice(0,80)}); }catch(e){}
  if(FLOW){ flowStep(t); return; }
  if(/월세/.test(t)&&/적당|적정|비싸|맞나|맞는|괜찮|잘.*계약|잘한/.test(t)){ startWolseFlow(); return; }
  if(/복비|중개보수|수수료/.test(t)&&/많|비싸|맞나|맞는|적정|요구|달라/.test(t)){ startFeeFlow(); return; }
  if(directLink(t)){ return; }   /* 부비에 있는 기능을 이름으로 찾으면 바로 그 페이지로 */
  if(BOOBI_API.indexOf('http')===0){ llmAnswer(t); return; }
  ruleAnswer(t);
}
var opened=false;
function openPanel(silent){
  hideTeaser();btn.classList.remove('pulse');try{sessionStorage.setItem('hwbSeen','1');}catch(e){}
  panel.classList.add('open');
  try{ if(window.gtag)gtag('event','chat_open'); }catch(e){}
  if(!opened){
    opened=true;
    if(!silent){
      bot('안녕하세요, 부비예요! 🔆\n부동산 비서라서 부비 🙋\n깜깜한 곳을 훤히 밝혀드릴게요. 어떤 게 궁금하세요?');
      chips();
    }
  }
}
btn.onclick=function(){
  if(panel.classList.contains('open')){panel.classList.remove('open');return;}
  openPanel();
};
/* 외부 페이지(내 아파트 찾기 등)에서 부비를 여닫고 맥락을 넘기는 공개 API */
window.BOOBI={
  open:function(){openPanel();},
  /* 다른 도구의 대화 결과를 히스토리에 시드해서, 위젯에서 이어 묻는 후속 질문에 맥락이 유지되게 함 */
  seed:function(u,a){
    try{
      if(u)HIST.push({role:'user',content:String(u).slice(0,2000)});
      if(a)HIST.push({role:'assistant',content:String(a).slice(0,2000)});
      if(HIST.length>12)HIST=HIST.slice(-12);
    }catch(e){}
  },
  /* 패널을 열고 질문을 바로 전송 */
  ask:function(t){
    t=String(t||'').trim(); if(!t)return;
    openPanel(true); opened=true;
    user(t);
    setTimeout(function(){answer(t);},300);
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
if(location.search.indexOf('boobi=open')>-1){ setTimeout(function(){btn.click();},600); }
})();
/* v2.1 cta */
