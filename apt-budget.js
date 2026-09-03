/* ══════════════════════════════════════════════════════════════════════════
   부비 · 예산 계산 공용 모듈 (apt-budget.js)
   ────────────────────────────────────────────────────────────────────────
   apt-finder.html 의 인라인 함수를 그대로 추출한 것이다. 수치·로직을 바꾸지 않았다.
   불변 조건: 예산 110% 규율 등 안전 규칙 완화 금지. RULES 현행 수치 유지.
   apt-finder.html 은 아직 자체 인라인 복사본을 쓴다 — apt-match 로 교체될 때 함께 정리한다.
   의존: DATA.lta (토지거래허가구역, 페이지가 로드), esc() (페이지 제공)
   ══════════════════════════════════════════════════════════════════════════ */
var SHORT={'서울특별시':'서울','경기도':'경기','인천광역시':'인천','부산광역시':'부산','대구광역시':'대구',
 '대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','강원특별자치도':'강원',
 '충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전남광주통합특별시':'전남광주',
 '경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'};
var FULL={}; Object.keys(SHORT).forEach(function(k){FULL[SHORT[k]]=k;});
var RULES={
  asOf:'2026-08',
  dsrRatio:0.40,                 /* 은행권 DSR 40% */
  maturityCapital:30,            /* 수도권·규제지역 만기 30년 제한 */
  maturityLocal:40,
  stressCapital:3.0,             /* 수도권 전역 스트레스 금리(변동 기준) */
  stressLocal:0.75,              /* 비수도권 — 2026.12.31까지 유예 */
  coefCapital:{var:1.0,mix:0.8,cyc:0.4,fix:0},
  coefLocal:{var:1.0,mix:0.6,cyc:0.3,fix:0},
  absCaps:[[150000,60000],[250000,40000],[Infinity,20000]],  /* 수도권 주담대 절대한도 */
  ltv:{reg:{first:.70,none:.40,one:0}, non:{first:.70,none:.70,one:.60}},
  baseRate:4.25                  /* 코픽스(신규) 3.05% + 가산 1.2%p */
};
var CAPITAL=['서울특별시','경기도','인천광역시'];
var REG_GG=['과천시','광명시','의왕시','하남시','구리시','성남시 수정구','성남시 중원구','성남시 분당구',
  '수원시 장안구','수원시 팔달구','수원시 영통구','안양시 동안구','용인시 수지구','용인시 기흥구',
  '화성시 동탄구'];
function splitArea(txt){
  if(!txt) return {sido:null,sgg:null};
  var i=txt.indexOf(' ');
  if(i<0) return {sido:FULL[txt]||txt, sgg:null};
  return {sido:FULL[txt.slice(0,i)]||txt.slice(0,i), sgg:txt.slice(i+1)};
}
function isCapital(sido){ return CAPITAL.indexOf(sido)>=0; }
/* ── 토지거래허가구역 판정 ──────────────────────────────────────────────
   규제지역(LTV·DSR)과는 완전히 다른 제도다. 여기 걸리면 관할 시군구 허가를 받아야
   사고, 허가받은 목적대로 2년간 실거주해야 한다 — 전세 낀 매수가 원칙적으로 막힌다.
   대출 한도만 보고 "살 수 있다"고 안내하면 안 되는 이유다. */
function ltaZone(sido,sgg){
  var L=DATA.lta; if(!L||!L.zones) return null;
  var today=new Date().toISOString().slice(0,10);
  for(var i=0;i<L.zones.length;i++){
    var z=L.zones[i];
    if(z.sido!==sido) continue;
    if(z.sgg!=='*' && z.sgg!==sgg) continue;
    if(z.from && today<z.from) continue;
    if(z.to && today>z.to) continue;      /* 만료된 지정은 자동으로 빠진다 */
    return z;
  }
  return null;
}
function isRegulated(sido,sgg){
  return sido==='서울특별시' || (sido==='경기도' && REG_GG.indexOf(sgg)>=0);
}
function absCap(price,capital){
  if(!capital) return Infinity;
  for(var i=0;i<RULES.absCaps.length;i++) if(price<=RULES.absCaps[i][0]) return RULES.absCaps[i][1];
  return 20000;
}
function stressRate(capital,type){
  var base=capital?RULES.stressCapital:RULES.stressLocal;
  return base*((capital?RULES.coefCapital:RULES.coefLocal)[type||'mix']);
}
function dsrCap(income,monthlyDebt,rate,stress,years){
  var annual=income*RULES.dsrRatio - monthlyDebt*12;
  if(annual<=0) return 0;
  var i=(rate+stress)/100/12, N=years*12;
  return Math.floor(annual/12*((1-Math.pow(1+i,-N))/i));
}
function monthlyPay(loan,rate,years){
  var r=rate/100/12, n=(years||30)*12;
  return loan*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
}
function solveBudget(inp){
  var capital=isCapital(inp.sido), reg=isRegulated(inp.sido,inp.sgg);
  var stress=stressRate(capital,inp.rateType||'mix');
  var years=capital?RULES.maturityCapital:RULES.maturityLocal;
  var dsr=dsrCap(inp.income,inp.monthlyDebt,inp.rate,stress,years);
  var ltvR=(reg?RULES.ltv.reg:RULES.ltv.non)[inp.owner];
  var best=inp.cash, loan=0;
  for(var p=inp.cash;p<=3000000;p+=500){
    var l=Math.min(ltvR*p, dsr, absCap(p,capital));
    if(inp.cash+l>=p){ best=p; loan=Math.floor(Math.min(l,p-inp.cash)); } else break;
  }
  var caps={ltv:Math.floor(ltvR*best), dsr:dsr, abs:absCap(best,capital)};
  var bind = (caps.ltv<=caps.dsr && caps.ltv<=caps.abs) ? 'ltv' : (caps.dsr<=caps.abs?'dsr':'abs');
  return {price:best, loan:loan, caps:caps, bind:bind, stress:stress, years:years,
          ltvR:ltvR, regulated:reg, capital:capital, dsrRate:RULES.dsrRatio,
          pay:monthlyPay(loan,inp.rate,years), rate:inp.rate};
}
/* ── 부대비용 ──────────────────────────────────────────────────────────
   "예산 5억"이 곧 "5억짜리 집"은 아니다. 취득세·중개보수·등기·이사비가 현금에서
   먼저 빠지고, 남는 돈으로 살 수 있는 집이 진짜 예산이다.
   요율은 acquisition-tax.html / brokerage-calculator.html 과 같은 표를 쓴다.
   solveBudget(대출 규제)은 손대지 않고, 그 결과를 상한으로 두고 다시 푼다. */
var COSTS={
  asOf:'2026-08',
  brokerSale:[[5000,0.6,25],[20000,0.5,80],[90000,0.4,null],[120000,0.5,null],[150000,0.6,null],[Infinity,0.7,null]],
  brokerVat:0.10,                     /* 상한요율 + 부가세 10% — 보수적으로 상한으로 잡는다 */
  firstHome:{cap:200, maxPrice:120000}, /* 생애최초 취득세 감면: 12억 이하, 200만원 한도 (지방세특례제한법 §36의3, 일몰 확인) */
  stamp:[[10000,0],[100000,15],[Infinity,35]], /* 인지세: 주택 1억 이하 면제, ~10억 15만, 초과 35만 */
  legal:40,                           /* 법무사 보수·등기 실비 (대략) */
  bond:{base:0.70, low:0.026, high:0.031, cut:60000, discount:0.12}, /* 국민주택채권: 시가표준액≈매매가 70%, 매입률 2.6~3.1%, 즉시 매도 할인손 ~12% */
  moveDefault:150                     /* 포장이사 기본값 (3~4인, 수도권) */
};
function acqBaseRate(eok){ if(eok<=6) return 1; if(eok<=9) return eok*2/3-3; return 3; }
/* own: none(무주택→1주택 취득) | one(1주택→갈아타기: 일시적 2주택 가정, 1주택 세율) | multi(3주택 이상 취득 가정) */
function acqTax(price,o){
  var eok=price/10000, cnt=o.own==='multi'?3:1, rate, heavy=false;
  if(cnt===1) rate=acqBaseRate(eok);
  else { if(o.regulated){rate=12;heavy=true;} else {rate=8;heavy=true;} }
  var acq=price*rate/100, edu=heavy?price*0.004:acq*0.1;
  var farm=o.big?(heavy?(rate===8?price*0.006:price*0.010):price*0.002):0;
  var cut=0;
  if(o.first&&o.own==='none'&&price<=COSTS.firstHome.maxPrice) cut=Math.min(acq,COSTS.firstHome.cap);
  return {rate:rate, acq:acq, edu:edu, farm:farm, cut:cut, heavy:heavy, total:Math.max(0,acq+edu+farm-cut)};
}
function brokerFee(price){
  var t=COSTS.brokerSale, row=t[t.length-1];
  for(var i=0;i<t.length;i++) if(price<t[i][0]){ row=t[i]; break; }
  var fee=price*row[1]/100; if(row[2]!==null&&fee>row[2]) fee=row[2];
  return {rate:row[1], fee:fee, total:fee*(1+COSTS.brokerVat)};
}
function legalFee(price){
  var std=price*COSTS.bond.base, b=COSTS.bond;
  var bond=std*(std>=b.cut?b.high:b.low)*b.discount, stamp=0;
  for(var i=0;i<COSTS.stamp.length;i++) if(price<=COSTS.stamp[i][0]){ stamp=COSTS.stamp[i][1]; break; }
  return {bond:bond, stamp:stamp, legal:COSTS.legal, total:bond+stamp+COSTS.legal};
}
/* o: {own, first, regulated, big(85㎡ 초과), move(만원, null이면 기본값), interior(만원)} → 만원 단위 */
function sideCosts(price,o){
  var tax=acqTax(price,o), br=brokerFee(price), lg=legalFee(price);
  var move=(o.move==null||isNaN(o.move))?COSTS.moveDefault:o.move, interior=o.interior||0;
  return {tax:tax, broker:br, legal:lg, move:move, interior:interior, total:tax.total+br.total+lg.total+move+interior};
}
/* 매매가 P + 부대비용(P) ≤ 현금 + 대출(P) 를 만족하는 최대 P.
   대출(P)은 solveBudget과 같은 LTV·DSR·절대한도 식 — 규제 수치는 그대로다. */
function solveNetBudget(inp,o){
  var G=solveBudget(inp), dsr=G.caps.dsr, best=0, loan=0, costs=sideCosts(0,o);
  for(var p=0;p<=G.price;p+=500){
    var l=Math.min(G.ltvR*p, dsr, absCap(p,G.capital)), c=sideCosts(p,o);
    if(inp.cash+l>=p+c.total){ best=p; costs=c; loan=Math.floor(Math.max(0,Math.min(l,p+c.total-inp.cash))); }
    else if(p>0) break;
  }
  var R={}; for(var k in G) R[k]=G[k];
  R.gross=G.price; R.price=best; R.loan=loan; R.costs=costs; R.need=best+costs.total;
  R.caps={ltv:Math.floor(G.ltvR*best), dsr:dsr, abs:absCap(best,G.capital)};
  R.pay=monthlyPay(loan,inp.rate,G.years);
  return R;
}
function readMan(v){ v=Math.round(v); var eok=Math.floor(v/10000), man=v%10000, s=''; if(eok>0){s=eok.toLocaleString('ko-KR')+'억'; if(man>=1000)s+=' '+Math.round(man/1000)+'천';}else{s=man.toLocaleString('ko-KR')+'만원';} return s; }
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function ga(n,p){ if(window.gtag){ try{ gtag('event',n,p||{}); }catch(e){} } }
function escAttr(s){return esc(s).replace(/"/g,'&quot;');}
function aptActions(name, dong){
  // 국토부 공식 명칭과 네이버 표기명이 다른 단지가 있어(예: 하남힐즈파크푸르지오1단지 ↔ 미사힐즈파크푸르지오)
  // 정확 일치만 찾는 네이버부동산 검색 대신, 유사 명칭도 잡아주는 네이버 통합검색에 '동 + 단지명'으로 보낸다
  var q=(dong?dong+' ':'')+name.replace(/\s*제?\d+단지$/,'').trim();
  return '<div class="aptActs">'
   +'<a class="aA naver" target="_blank" rel="noopener" href="https://search.naver.com/search.naver?query='+encodeURIComponent(q+' 아파트')+'" data-apt="'+escAttr(name)+'">🏠 네이버에서 보기</a>'
   +'<button type="button" class="aA ask" data-apt="'+escAttr(name)+'">💬 부비에게 물어보기</button>'
   +'</div>';
}
function ltaBadgeHtml(sido,sgg){
  var z=ltaZone(sido,sgg); if(!z) return '';
  var R=(DATA.lta&&DATA.lta.rule)||{};
  var period=z.to?('~ '+z.to.replace(/-/g,'.')+'까지'):'해제 시까지';
  return '<div class="regbadge lta">📋 <b>토지거래허가구역</b> ('+period+')<br>'
    +'<span>매수하려면 관할 시군구 <b>허가</b>가 필요하고, 허가 뒤 '+(R.moveInMonths||4)+'개월 안에 입주해 '
    +'<b>'+(R.useYears||2)+'년간 실거주</b>해야 해요. <b>전세를 낀 매수는 원칙적으로 안 됩니다.</b><br>'
    +(z.target?('대상: '+esc(z.target)+' · '):'')
    +'기준면적과 허가 대상 여부는 관할 시군구 공고를 꼭 확인하세요.</span></div>';
}
