/* ===== 부비 프리미엄 — 이용권 확인 + 페이월 공통 모듈 =====
 * 사용법: 아무 페이지에서나 <script src="/boobi-premium.js?v=1" defer></script>
 *
 *   bbPremium.check()            → Promise<boolean>  (members/{uid}.premium 확인, 캐시됨)
 *   bbPremium.is()               → boolean           (지금까지 확인된 값, 동기)
 *   bbPremium.wall(opt)          → 페이월 카드 HTML 문자열 (원하는 자리에 끼워 넣기)
 *   bbPremium.buy()              → 래피드 결제 페이지로 이동
 *   bbPremium.claim(payEmail)    → Promise<boolean>  "결제했는데 안 열려요" 확인
 *   document.addEventListener('bb-premium', e => e.detail === true/false)
 *
 * 결제 자체는 래피드(Latpeed) 상품 페이지에서 이뤄지고,
 * 결제 완료 웹훅을 받은 부비 인증 워커가 구매자 이메일로 이용권을 켠다.
 */
(function () {
if (window.bbPremium) return;

var CFG = window.BB_PREMIUM_CFG || {};
/* ⚠️ 래피드 상품 주소가 정해지면 이 한 줄만 바꾸면 사이트 전체에 반영됨.
   비어 있으면 결제 버튼이 "준비 중"으로 표시되고 링크는 걸리지 않는다. */
var BUY_URL = CFG.buyUrl || '';
var PRICE   = CFG.price  || 2900;    /* 실제 결제 금액(할인가) */
var LIST    = CFG.list   || 9900;    /* 정가 — 취소선으로 함께 노출. 0이면 숨김 */
var NAME    = CFG.name   || '부비 프리미엄';
var API     = window.HW_AUTH_API || 'https://boobi-auth.tndud-brad.workers.dev';

var state = null;          /* null=미확인, true/false=확인됨 */
var checking = null;

function ga(n, p) { if (window.gtag) { try { p = p || {}; p.page = location.pathname; gtag('event', n, p); } catch (e) {} } }
function emit() { document.dispatchEvent(new CustomEvent('bb-premium', { detail: state })); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
function won(n) { return (n || 0).toLocaleString('ko-KR') + '원'; }

function loadFS() {
  return new Promise(function (res, rej) {
    if (window.firebase && firebase.firestore) { res(); return; }
    var s = document.createElement('script');
    s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
}

/* ── 이용권 확인 ── */
function check() {
  if (state !== null) return Promise.resolve(state);
  if (checking) return checking;
  var u = window.hwonUser;
  if (!u) { state = false; emit(); return Promise.resolve(false); }
  checking = loadFS().then(function () {
    return firebase.firestore().collection('members').doc(u.uid).get();
  }).then(function (snap) {
    var d = (snap && snap.exists) ? (snap.data() || {}) : {};
    state = d.premium === true;
    emit();
    return state;
  }).catch(function (e) {
    console.warn('premium check fail', e);
    state = false; emit(); return false;
  }).then(function (v) { checking = null; return v; });
  return checking;
}

/* ── "결제했는데 안 열려요" — 워커에 물어본다 ── */
function claim(payEmail) {
  var u = window.hwonUser;
  if (!u) return Promise.resolve(false);
  return u.getIdToken().then(function (tok) {
    return fetch(API + '/claim', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: tok, payEmail: payEmail || '' })
    });
  }).then(function (r) { return r.json(); }).then(function (j) {
    if (j && j.premium) { state = true; emit(); ga('premium_unlocked', { via: 'claim' }); return true; }
    return false;
  }).catch(function () { return false; });
}

/* 페이월 버튼 → 부비 안내 페이지(/premium)로. 실제 결제창은 그 페이지에서 연다. */
function buy() {
  ga('select_promotion', { promotion_name: 'boobi-premium', from: location.pathname });
  try { sessionStorage.setItem('bbPayFrom', location.pathname + location.search); } catch (e) {}
  location.href = '/premium?from=' + encodeURIComponent(location.pathname + location.search);
  return true;
}
/* /premium 페이지에서 실제 결제(래피드)로 넘어갈 때 */
function checkout() {
  if (!BUY_URL) return false;
  ga('begin_checkout', { currency: 'KRW', value: PRICE, items: [{ item_id: 'boobi-premium', item_name: NAME, price: PRICE, quantity: 1 }] });
  location.href = BUY_URL;
  return true;
}
/* 결제 후 돌아올 곳 — 페이월을 눌렀던 화면 */
function backTo() {
  var q = (location.search.match(/[?&]from=([^&]+)/) || [])[1];
  var p = '';
  try { p = q ? decodeURIComponent(q) : (sessionStorage.getItem('bbPayFrom') || ''); } catch (e) {}
  if (!p || p.charAt(0) !== '/' || p.charAt(1) === '/') p = '/apt-finder?mode=buy';
  return p + (p.indexOf('?') >= 0 ? '&' : '?') + 'paid=1';
}

/* ── 페이월 카드 HTML ──
 * opt.count  : 잠긴 항목 수 (예: 나머지 단지 수)
 * opt.unit   : 단위 이름 (기본 '개')
 * opt.title  / opt.desc : 문구 덮어쓰기
 */
function wall(opt) {
  opt = opt || {};
  var n = opt.count || 0;
  var unit = opt.unit || '개';
  var title = opt.title || (n ? '나머지 ' + n + unit + '는 프리미엄에서 볼 수 있어요' : '전체 결과는 프리미엄에서 볼 수 있어요');
  var desc = opt.desc || '한 번 결제하면 아파트 찾기 전체 목록은 물론<br>부비의 모든 유료 기능이 계속 열려요.';
  var priceLine = PRICE ? '<div class="bbwPrice">'
    + (LIST > PRICE ? '<span class="was">' + won(LIST) + '</span>' : '')
    + '<span class="num">' + won(PRICE) + '</span><span class="vat">1회 결제 · 계속 이용</span></div>' : '';
  var btn = BUY_URL
    ? '<button class="bbwBuy" type="button" data-nogate="1" onclick="bbPremium.buy()">' + (PRICE ? won(PRICE) + '으로 전체 보기' : '전체 보기') + '</button>'
    : '<button class="bbwBuy" type="button" data-nogate="1" disabled style="opacity:.5;cursor:not-allowed">결제 기능 준비 중이에요</button>';
  return '<div class="bbWall" id="bbWall">' +
    '<div class="bbwLock">🔒</div>' +
    '<h3>' + esc(title).replace(/&lt;br&gt;/g, '<br>') + '</h3>' +
    '<p>' + desc + '</p>' + priceLine + btn +
    '<button class="bbwHave" type="button" data-nogate="1" onclick="bbPremium.askClaim()">이미 결제했어요</button>' +
    '<div class="bbwNote">디지털 콘텐츠 · <a href="/refund.html">환불 정책</a> · <a href="/terms.html">이용약관</a></div>' +
    '</div>';
}

/* "이미 결제했어요" → 계정 이메일로 먼저 찾아보고, 없으면 결제 이메일을 직접 묻는다 */
function askClaim() {
  var box = document.getElementById('bbWall');
  function say(t) { var e = box && box.querySelector('.bbwMsg'); if (!e && box) { e = document.createElement('div'); e.className = 'bbwMsg'; box.appendChild(e); } if (e) e.innerHTML = t; }
  if (!window.hwonUser) { say('먼저 로그인해주세요. 결제 내역은 계정에 붙습니다.'); return; }
  say('결제 내역을 확인하는 중…');
  claim('').then(function (ok) {
    if (ok) { say('✅ 확인됐어요! 전체 목록을 불러올게요.'); setTimeout(function () { location.reload(); }, 700); return; }
    var em = prompt('결제하실 때 입력한 이메일 주소를 알려주세요.\n(부비 로그인 이메일과 달라도 괜찮아요)');
    if (!em) { say('결제 내역을 찾지 못했어요. 결제 후 1~2분 뒤 다시 눌러주세요.'); return; }
    say('확인하는 중…');
    claim(em).then(function (ok2) {
      if (ok2) { say('✅ 확인됐어요! 전체 목록을 불러올게요.'); setTimeout(function () { location.reload(); }, 700); }
      else say('그 이메일로 된 결제 내역이 없어요.<br>결제 직후라면 1~2분 뒤 다시, 계속 안 되면 <a href="/contact.html">문의</a>로 알려주세요.');
    });
  });
}

/* ── 스타일 (부비 디자인 시스템: 흰 글래스 + 민트→블루 그라데이션) ── */
var css = document.createElement('style');
css.textContent =
'.bbWall{position:relative;overflow:hidden;isolation:isolate;clip-path:inset(0 round 20px);text-align:center;padding:30px 22px 26px;border-radius:20px;margin:14px 0 6px;' +
 'background:radial-gradient(120% 170% at 92% -20%,rgba(61,139,253,.16),transparent 55%),radial-gradient(130% 170% at -8% 120%,rgba(42,193,188,.18),transparent 55%),radial-gradient(90% 90% at 50% 120%,rgba(139,108,246,.10),transparent 60%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(255,255,255,.74));' +
 'border:1.5px solid rgba(255,255,255,.95);box-shadow:0 14px 40px rgba(13,42,41,.10),inset 0 1px 0 #fff;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#0D2A29}' +
'.bbWall .bbwLock{font-size:1.7rem;line-height:1}' +
'.bbWall h3{font-size:1.1rem;font-weight:800;letter-spacing:-.02em;margin:8px 0 6px;word-break:keep-all;color:#0D2A29}' +
'.bbWall p{font-size:.89rem;color:#547471;line-height:1.6;word-break:keep-all;margin-bottom:16px}' +
'.bbwPrice{display:flex;align-items:baseline;justify-content:center;gap:9px;margin-bottom:14px;flex-wrap:wrap}' +
'.bbwPrice .num{font-size:1.7rem;font-weight:800;letter-spacing:-.03em;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);-webkit-background-clip:text;background-clip:text;color:transparent}' +
'.bbwPrice .was{font-size:1rem;color:#8AA5A2;text-decoration:line-through;text-decoration-thickness:1.5px}' +
'.bbwPrice .num{text-decoration:none}' +
'.bbwPrice .vat{font-size:.8rem;color:#8AA5A2}' +
'.bbwBuy{display:block;width:100%;max-width:300px;margin:0 auto;padding:14px 22px;border:none;border-radius:999px;cursor:pointer;font-family:inherit;font-size:1rem;font-weight:800;color:#fff;white-space:nowrap;' +
 'background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);box-shadow:0 8px 22px rgba(61,139,253,.3);transition:transform .12s ease-out}' +
'.bbwBuy:not(:disabled):hover{transform:translateY(-1px)}.bbwBuy:not(:disabled):active{transform:scale(.97)}' +
'.bbwHave{display:block;margin:11px auto 0;background:none;border:none;font-size:.83rem;color:#2A7DE8;cursor:pointer;font-family:inherit;text-decoration:underline}' +
'.bbwNote{margin-top:12px;font-size:.76rem;color:#8AA5A2}.bbwNote a{color:#8AA5A2;text-decoration:underline}' +
'.bbwMsg{margin-top:12px;font-size:.84rem;color:#2A7DE8;line-height:1.55}.bbwMsg a{color:#2A7DE8;text-decoration:underline}' +
/* 페이월 뒤에 살짝 비치는 미리보기 줄 */
'.bbTease{position:relative;max-height:150px;overflow:hidden;-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.5),transparent);mask-image:linear-gradient(180deg,rgba(0,0,0,.5),transparent);filter:blur(3px);pointer-events:none;user-select:none}' +
'@media(prefers-reduced-motion:reduce){.bbwBuy{transition:none}}' +
'@media(prefers-reduced-transparency:reduce){.bbWall{background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none}.bbTease{filter:none}}';
document.head.appendChild(css);

window.bbPremium = { check: check, is: function () { return state === true; }, wall: wall,
  buy: buy, checkout: checkout, backTo: backTo, claim: claim, askClaim: askClaim,
  cfg: function () { return { buyUrl: BUY_URL, price: PRICE, list: LIST, name: NAME }; } };

/* 로그인 상태가 정해지면 자동으로 한 번 확인 */
document.addEventListener('hwon-auth', function (e) {
  state = null;
  if (!e.detail) { state = false; emit(); return; }
  check();
});
if (window.hwonUser) check();

/* 결제 페이지에서 돌아왔을 때(?paid=1) 자동으로 이용권을 붙여본다 */
(function () {
  if (!/[?&]paid=1/.test(location.search)) return;
  var tries = 0;
  (function poll() {
    if (!window.hwonUser) { if (tries++ < 40) return setTimeout(poll, 300); return; }
    claim('').then(function (ok) {
      if (ok) { try { history.replaceState(null, '', location.pathname); } catch (e) {} location.reload(); }
      else if (tries++ < 10) setTimeout(poll, 1500);   /* 웹훅이 조금 늦게 올 수 있다 */
    });
  })();
})();
})();
