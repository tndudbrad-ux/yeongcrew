/* ===== 부비 지역 분석 리포트 — 페이지 안에서 바로 결제 + 구매 확인 =====
 *
 *   region-report-*.html 에 <script src="/boobi-region-pay.js?v=1" defer></script> 한 줄만 넣으면 된다.
 *   상품 아이디는 파일명에서 뽑는다 (/region-report-dongdaemun.html → region-report-dongdaemun).
 *
 *   잠금이 풀리는 경로
 *     ① 이 기기에서 결제한 기록 (localStorage) — 페이지 자체 스크립트가 처리
 *     ② 로그인 계정의 결제 완료 주문 (orders) — 여기서 처리. 기기를 바꿔도 열린다.
 *
 *   ⚠️ 여기에는 클라이언트 키만 들어간다. 시크릿 키는 워커 Secret 에만 둔다.
 */
(function () {
if (window.bbRegionPay) return;

var CLIENT_KEY = 'live_gck_4yKeq5bgrp5qjKNNRYGB8GX0lzW6';
var PAY_API    = 'https://boobi-pay.tndud-brad.workers.dev';
var AUTH_API   = 'https://boobi-auth.tndud-brad.workers.dev';
var AMOUNT     = 19900;              /* 표시 금액. 실제 승인 금액은 워커 가격표가 정한다 */

var m = location.pathname.match(/region-report-([a-z]+)\.html/);
if (!m) return;
var KEY     = m[1];
var PRODUCT = 'region-report-' + KEY;
var NAMES   = { dongdaemun:'동대문구', seongdong:'성동구', gimpo:'김포시', anyang:'안양시', gwacheon:'과천시' };
var NAME    = (NAMES[KEY] || '') + ' 지역 분석 리포트';

var gate = document.getElementById('rrGate');
if (!gate) return;
var box = gate.querySelector('.lockBox');
if (!box) return;

var widgets = null, agreed = true, ready = false, booting = false, done = false;

function won(n) { return n.toLocaleString('ko-KR') + '원'; }
function ga(n, p) { if (window.gtag) { try { gtag('event', n, p || {}); } catch (e) {} } }
function unlock(via) {
  if (done) return;
  done = true;
  try { localStorage.setItem('bb_unlock_' + PRODUCT, '1'); } catch (e) {}
  if (typeof window.__rrUnlock === 'function') window.__rrUnlock();
  ga('unlock_content', { item_id: PRODUCT, via: via || '' });
}

/* ---------- 스타일 ---------- */
var css = document.createElement('style');
css.textContent =
'.bbPay{margin:16px auto 0;max-width:460px;text-align:left;background:#fff;border:1px solid rgba(13,42,41,.10);border-radius:18px;padding:18px 16px 16px;box-shadow:0 10px 28px rgba(13,42,41,.08)}' +
'.bbPay .bbH{font-size:.95rem;font-weight:800;color:#0D2A29;margin:0 0 12px;word-break:keep-all}' +
'.bbPay label{display:block;font-size:.84rem;font-weight:700;color:#547471;margin:0 0 6px}' +
'.bbPay input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #D7E6E4;border-radius:11px;font-size:.95rem;color:#0D2A29;background:#fff}' +
'.bbPay input:focus{outline:none;border-color:#3D8BFD;box-shadow:0 0 0 3px rgba(61,139,253,.14)}' +
'.bbPay .bbNote{margin:7px 0 0;font-size:.82rem;color:#8AA5A2}' +
'.bbPay .bbSlot{margin-top:12px}' +
'.bbPay .bbTot{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 10px;padding-top:12px;border-top:1px solid rgba(13,42,41,.08);font-size:.92rem;color:#547471}' +
'.bbPay .bbTot b{font-size:1.2rem;font-weight:800;color:#0D2A29}' +
'.bbGo{display:block;width:100%;padding:14px 18px;border:none;border-radius:999px;background:linear-gradient(115deg,#26C6B9 0%,#3D8BFD 60%,#8B6CF6 100%);color:#fff;font-weight:800;font-size:1.02rem;cursor:pointer;box-shadow:0 8px 20px rgba(61,139,253,.28);white-space:nowrap}' +
'.bbGo[disabled]{opacity:.5;cursor:default;box-shadow:none}' +
'.bbPay .bbErr{display:none;margin:10px 0 0;font-size:.86rem;color:#E5484D}' +
'.bbPay .bbErr.on{display:block}' +
'.bbPay .bbTerms{margin:10px 0 0;font-size:.76rem;line-height:1.6;color:#8AA5A2}' +
'.bbPay .bbTerms a{color:#3D8BFD}' +
'.bbOpen{border:none;cursor:pointer;font-family:inherit}';
document.head.appendChild(css);

/* ---------- 결제 패널 ---------- */
var old = box.querySelector('a.buy');
var open = document.createElement('button');
open.type = 'button';
open.className = 'buy bbOpen';
open.textContent = won(AMOUNT) + ' 결제하고 이어 읽기';
if (old) old.parentNode.replaceChild(open, old); else box.appendChild(open);

var pay = document.createElement('div');
pay.className = 'bbPay';
pay.hidden = true;
pay.innerHTML =
  '<p class="bbH">결제하기 — ' + NAME + '</p>' +
  '<label for="bbMail">열람 링크 받을 이메일</label>' +
  '<input id="bbMail" type="email" inputmode="email" autocomplete="email" placeholder="example@email.com">' +
  '<p class="bbNote">이 주소로 열람 링크가 발송됩니다. <b>로그인하고 결제하시면 다른 기기에서도 자동으로 열립니다.</b></p>' +
  '<div class="bbSlot" id="bbPM"></div>' +
  '<div class="bbSlot" id="bbAG"></div>' +
  '<div class="bbTot"><span>총 결제 금액</span><b>' + won(AMOUNT) + '</b></div>' +
  '<button class="bbGo" id="bbGo" type="button" disabled>결제 수단을 불러오는 중…</button>' +
  '<p class="bbErr" id="bbErr"></p>' +
  '<p class="bbTerms">결제를 진행하면 <a href="/terms.html">이용약관</a> 및 <a href="/refund.html">취소·환불 정책</a>에 동의하고, 디지털 콘텐츠 제공 개시 후 청약철회가 제한된다는 점을 확인한 것으로 봅니다.</p>';
open.parentNode.insertBefore(pay, open.nextSibling);

var mail = pay.querySelector('#bbMail');
var go   = pay.querySelector('#bbGo');
var err  = pay.querySelector('#bbErr');

function showErr(t) { err.textContent = t; err.classList.add('on'); }
function clearErr() { err.classList.remove('on'); }
function sync() {
  if (!ready) { go.disabled = true; return; }
  go.disabled = !agreed;
  go.textContent = agreed ? (won(AMOUNT) + ' 결제하기') : '약관에 동의해 주세요';
}

function sdk() {
  return new Promise(function (res, rej) {
    if (window.TossPayments) { res(); return; }
    var s = document.createElement('script');
    s.src = 'https://js.tosspayments.com/v2/standard';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function boot() {
  if (booting) return;
  booting = true;
  sdk().then(function () {
    var toss = TossPayments(CLIENT_KEY);
    /* 단건 결제라 고객 식별이 필요 없다 (빌링키로 갈 때만 실제 customerKey) */
    widgets = toss.widgets({ customerKey: TossPayments.ANONYMOUS });
    return widgets.setAmount({ currency: 'KRW', value: AMOUNT }).then(function () {
      return Promise.all([
        widgets.renderPaymentMethods({ selector: '#bbPM' }),
        widgets.renderAgreement({ selector: '#bbAG' }).then(function (aw) {
          /* 토스 약관 위젯은 현재 상태를 읽는 API가 없고 바뀔 때만 알려준다.
             그래서 동의한 것으로 보고 시작하고, 체크를 풀면 그때 잠근다.
             동의 없이 결제를 누르면 토스가 거절하는데, 그건 아래에서 안내로 받는다. */
          aw.on('agreementStatusChange', function (st) { agreed = !!(st && st.agreedRequiredTerms); sync(); });
        })
      ]);
    });
  }).then(function () {
    ready = true; sync();
  }).catch(function (e) {
    console.error('widget init fail', e);
    go.textContent = '결제 모듈을 불러오지 못했습니다';
    showErr('결제창을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
  });
}

open.addEventListener('click', function () {
  pay.hidden = false;
  open.style.display = 'none';   /* .buy 가 display:inline-block 이라 hidden 속성만으론 안 숨는다 */
  if (window.hwonUser && window.hwonUser.email && !mail.value) mail.value = window.hwonUser.email;
  ga('view_item', { items: [{ item_id: PRODUCT, item_name: NAME, price: AMOUNT }] });
  boot();
  pay.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

go.addEventListener('click', function () {
  clearErr();
  var email = (mail.value || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    showErr('열람 링크를 받으실 이메일을 정확히 입력해 주세요.');
    mail.focus();
    return;
  }
  go.disabled = true;
  go.textContent = '주문을 만드는 중…';

  var payload = { productId: PRODUCT, email: email };
  var pre = (window.hwonUser && window.hwonUser.getIdToken)
    ? window.hwonUser.getIdToken().then(function (t) { payload.idToken = t; }).catch(function () {})
    : Promise.resolve();

  pre.then(function () {
    /* 1) 주문을 서버에서 먼저 만든다 — 금액은 서버 가격표가 정한다 */
    return fetch(PAY_API + '/order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
  }).then(function (r) {
    return r.json().then(function (j) { return { ok: r.ok, j: j }; });
  }).then(function (o) {
    if (!o.ok || !o.j.orderId) throw new Error(o.j.error || '주문 생성에 실패했습니다');
    if (Number(o.j.amount) !== AMOUNT) throw new Error('상품 금액이 변경되었습니다. 새로고침 후 다시 시도해 주세요');
    ga('begin_checkout', { currency: 'KRW', value: AMOUNT, items: [{ item_id: PRODUCT, item_name: o.j.orderName, price: AMOUNT, quantity: 1 }] });
    /* 2) 결제창 */
    return widgets.requestPayment({
      orderId: o.j.orderId,
      orderName: o.j.orderName,
      successUrl: location.origin + '/pay-success.html?product=' + encodeURIComponent(PRODUCT) + '&next=' + encodeURIComponent(location.pathname),
      failUrl: location.origin + '/pay-fail.html',
      customerEmail: email
    });
  }).catch(function (e) {
    console.error('requestPayment fail', e);
    var code = (e && e.code) ? String(e.code) : '';
    if (code === 'USER_CANCEL') { clearErr(); }
    else if (/AGREEMENT/i.test(code)) { showErr('아래 필수 약관에 동의해 주세요.'); }
    else { showErr((e && e.message) ? e.message : '결제를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    ready = true; sync();
  });
});

/* ---------- 로그인 계정의 결제 기록으로 잠금 해제 ---------- */
function loadFS() {
  return new Promise(function (res, rej) {
    if (window.firebase && firebase.firestore) { res(); return; }
    var s = document.createElement('script');
    s.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

/* 비회원(이메일만 입력)으로 결제한 건을 계정에 붙인다. 실패해도 그냥 넘어간다. */
function claim(u) {
  if (!u || !u.getIdToken) return Promise.resolve();
  return new Promise(function (res) {
    var t = setTimeout(res, 6000);
    u.getIdToken().then(function (tok) {
      return fetch(AUTH_API + '/claim', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: tok })
      });
    }).then(function () { clearTimeout(t); res(); })
      .catch(function () { clearTimeout(t); res(); });
  });
}

function checkOrders(u) {
  if (!u || done) return;
  claim(u).then(loadFS).then(function () {
    return firebase.firestore().collection('orders').where('uid', '==', u.uid).limit(100).get();
  }).then(function (snap) {
    var hit = false;
    snap.forEach(function (d) {
      var o = d.data() || {};
      if (o.status === 'PAID' && o.productId === PRODUCT) hit = true;
    });
    if (hit) unlock('orders');
  }).catch(function (e) { console.warn('order check fail', e); });
}

document.addEventListener('hwon-auth', function (e) { checkOrders(e.detail); });
if (window.hwonUser) checkOrders(window.hwonUser);

window.bbRegionPay = { product: PRODUCT, unlock: unlock };
})();
