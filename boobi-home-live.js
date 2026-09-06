/* ===== 홈 라이브 위젯 — 청약 브리핑 숫자 + 오늘의 기사 =====
 * 이 두 영역은 마크업과 CSS만 있고 채우는 코드가 없어서 계속 비어 있었다.
 *   · 오늘의 청약 브리핑 : #bfStart / #bfEnd / #bfOpen  ← cheongyak-data.json 으로 계산
 *   · 오늘의 기사        : #newsChips + #newsList        ← 뉴스 API 로 채움
 * 데이터가 없거나 실패해도 스켈레톤이 영원히 남지 않게, 반드시 어떤 상태든 결론을 그린다.
 *
 * 설치: index.html 의 <script src="/hwon-ui.js" defer></script> 아래에
 *       <script src="/boobi-home-live.js?v=1" defer></script>
 */
(function () {
if (window.__bbHomeLive) return; window.__bbHomeLive = 1;

var NEWS_API = 'https://hwon-rtms.vercel.app/api/news?q=';

/* 한국 시간 기준 오늘 (YYYY-MM-DD) — GitHub Pages는 UTC라 그냥 Date를 쓰면 하루 어긋난다 */
function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
function dnum(s) { return s ? +String(s).replace(/-/g, '') : 0; }
function daysBetween(a, b) {   /* b - a (일). 둘 다 YYYY-MM-DD */
  function t(s) { var p = String(s).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  return Math.round((t(b) - t(a)) / 86400000);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
function ga(n, p) { if (window.gtag) { try { gtag('event', n, p || {}); } catch (e) {} } }

/* ─────────── 1. 오늘의 청약 브리핑 ─────────── */
(function brief() {
  var elS = document.getElementById('bfStart'),
      elE = document.getElementById('bfEnd'),
      elO = document.getElementById('bfOpen');
  if (!elS && !elE && !elO) return;

  function put(el, n) { if (el) el.innerHTML = n + '<small>건</small>'; }

  Promise.all([
    fetch('/cheongyak-data.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; }),
    fetch('/cheongyak-featured.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; })
  ]).then(function (res) {
    var seen = {}, items = [];
    [].concat(res[0].items || [], res[1].items || []).forEach(function (it) {
      var k = it.id || (it.name || '') + '|' + (it.rcritStart || '');
      if (seen[k]) return; seen[k] = 1; items.push(it);
    });

    var today = todayKST(), tn = dnum(today);
    var nStart = 0, nEnd = 0, nOpen = 0;
    items.forEach(function (it) {
      var s = it.rcritStart || '', e = it.rcritEnd || it.rcritStart || '';
      if (!s) return;
      if (dnum(s) === tn) nStart++;
      if (dnum(s) <= tn && tn <= dnum(e)) {
        nOpen++;
        var left = daysBetween(today, e);          /* 마감까지 남은 날 */
        if (left >= 0 && left <= 2) nEnd++;        /* D-2 이내 */
      }
    });
    put(elS, nStart); put(elE, nEnd); put(elO, nOpen);

    /* 셋 다 0이면 카드가 고장난 것처럼 보인다 — 다음 접수 예정을 대신 알려준다 */
    if (!nStart && !nOpen) {
      var next = null;
      items.forEach(function (it) {
        var s = it.rcritStart || '';
        if (!s || dnum(s) <= tn) return;
        if (!next || dnum(s) < dnum(next.rcritStart)) next = it;
      });
      var host = elO && elO.parentNode && elO.parentNode.parentNode;
      if (host && !document.getElementById('bfNext')) {
        var d = document.createElement('div');
        d.id = 'bfNext';
        d.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:12px;font-size:.8rem;line-height:1.5;word-break:keep-all;'
          + 'background:linear-gradient(135deg,rgba(42,193,188,.10),rgba(61,139,253,.10));color:#2A7DE8;font-weight:600';
        if (next) {
          var p = next.rcritStart.split('-'), left = daysBetween(today, next.rcritStart);
          d.innerHTML = '오늘은 접수 중인 청약이 없어요.<br>다음 접수 <b>' + (+p[1]) + '/' + (+p[2]) + '</b>'
            + (left > 0 ? ' (' + left + '일 뒤)' : '') + ' · ' + esc(String(next.name || '').slice(0, 18));
        } else {
          d.textContent = '오늘은 접수 중인 청약이 없어요.';
        }
        host.insertBefore(d, elO.parentNode.nextSibling);
      }
    }
  }).catch(function () { put(elS, 0); put(elE, 0); put(elO, 0); });
})();

/* ─────────── 2. 브리핑이 참고한 오늘의 기사 ─────────── */
(function news() {
  var list = document.getElementById('newsList');
  var chips = document.getElementById('newsChips');
  if (!list) return;

  var SHOW = 6;              /* 처음 보여줄 개수 */
  var cache = {};            /* 주제별 캐시 — 칩을 다시 눌러도 재요청 안 함 */

  function clean(t) {
    return String(t || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .trim();
  }
  /* 언론사명은 API가 source 로 이미 준다. URL 추출은 그게 없을 때만 쓰는 최후수단 —
     기사 링크가 구글뉴스 RSS 라서 URL 에서 뽑으면 'news' 같은 쓰레기가 나온다. */
  function pressFromUrl(url) {
    try {
      var h = new URL(url).hostname.replace(/^(www|news|n|m|amp)\./, '');
      if (/(^|\.)google\./.test(h)) return '';
      return h.split('.')[0];
    } catch (e) { return ''; }
  }
  function press(it) {
    return clean(it.source || it.press || it.publisher || it.pressName || '') || pressFromUrl(it.link || it.originallink || it.url || '');
  }
  /* API 는 pub 을 epoch ms(숫자)로 준다. 문자열 날짜도 같이 받아준다. */
  function when(v) {
    if (v === 0 || v == null || v === '') return '';
    var d = (typeof v === 'number' || /^\d{10,}$/.test(String(v))) ? new Date(Number(v)) : new Date(v);
    if (isNaN(d.getTime())) return '';
    var diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 0) return '방금';
    if (diff < 1) return '방금';
    if (diff < 60) return diff + '분 전';
    if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
    var days = Math.floor(diff / 1440);
    if (days <= 7) return days + '일 전';
    /* 오래된 기사는 날짜로 (188일 전 같은 표기 방지). 해가 넘어갔으면 연도까지. */
    var k = new Date(d.getTime() + 9 * 3600 * 1000);
    var nowK = new Date(Date.now() + 9 * 3600 * 1000);
    if (k.getUTCFullYear() !== nowK.getUTCFullYear()) {
      return k.getUTCFullYear() + '. ' + (k.getUTCMonth() + 1) + '. ' + k.getUTCDate() + '.';
    }
    return (k.getUTCMonth() + 1) + '월 ' + k.getUTCDate() + '일';
  }
  function pubOf(it) { return it.pub || it.pubDate || it.date || it.publishedAt || it.isoDate || 0; }
  function skel() {
    list.innerHTML = '<div class="newsSkel"></div><div class="newsSkel"></div><div class="newsSkel"></div><div class="newsSkel"></div>';
  }
  function fail(msg) {
    list.innerHTML = '<div class="newsErr">' + esc(msg) +
      '<br><button type="button" class="newsMoreBtn" id="newsRetry" style="max-width:200px;margin:12px auto 0">다시 불러오기</button></div>';
    var r = document.getElementById('newsRetry');
    if (r) r.onclick = function () { load(curQ, true); };
  }

  function render(items) {
    if (!items.length) { fail('지금은 가져올 기사가 없어요.'); return; }
    items = items.slice().sort(function (a, b) {          /* '오늘의 기사'니까 최신순 */
      return (new Date(pubOf(b)).getTime() || 0) - (new Date(pubOf(a)).getTime() || 0);
    });
    var h = items.map(function (it, i) {
      var title = clean(it.title || it.headline || '');
      var url = it.link || it.originallink || it.url || '';
      var meta = [press(it), when(pubOf(it))].filter(Boolean).join(' · ');
      if (!title) return '';
      return '<a class="newsItem' + (i >= SHOW ? ' newsHidden' : '') + '"'
        + (url ? ' href="' + esc(url) + '" target="_blank" rel="noopener"' : '')
        + '><span class="newsRank">' + (i + 1) + '</span>'
        + '<span class="newsBody"><span class="newsTit">' + esc(title) + '</span>'
        + (meta ? '<span class="newsMeta">' + esc(meta) + '</span>' : '') + '</span></a>';
    }).join('');
    if (items.length > SHOW) {
      h += '<button type="button" class="newsMoreBtn" id="newsMore">기사 ' + (items.length - SHOW) + '건 더 보기</button>';
    }
    h += '<div class="newsFoot">부비 브리핑이 참고한 기사예요</div>';
    list.innerHTML = h;
    var more = document.getElementById('newsMore');
    if (more) more.onclick = function () {
      [].forEach.call(list.querySelectorAll('.newsItem.newsHidden'), function (e) { e.classList.remove('newsHidden'); });
      more.remove();
      ga('news_more', { q: curQ });
    };
  }

  var curQ = '부동산', reqId = 0;
  function load(q, force) {
    curQ = q;
    if (!force && cache[q]) { render(cache[q]); return; }
    var my = ++reqId;
    skel();
    var to = setTimeout(function () { if (my === reqId) fail('기사를 불러오지 못했어요.'); }, 12000);
    fetch(NEWS_API + encodeURIComponent(q) + '&cb=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (d) {
        if (my !== reqId) return;                 /* 칩을 빠르게 여러 번 눌렀을 때 옛 응답 무시 */
        clearTimeout(to);
        var items = (d && (d.items || d.articles || d.results)) || [];
        cache[q] = items;
        render(items);
      })
      .catch(function () {
        if (my !== reqId) return;
        clearTimeout(to);
        fail('기사를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      });
  }

  if (chips) {
    chips.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('.newsChip');
      if (!b) return;
      [].forEach.call(chips.querySelectorAll('.newsChip'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var q = b.getAttribute('data-q') || '부동산';
      ga('news_topic', { topic: (b.textContent || '').trim() });
      load(q);
    });
    var on = chips.querySelector('.newsChip.on');
    if (on) curQ = on.getAttribute('data-q') || curQ;
  }

  /* 화면에 들어올 때 로드 — 홈 최상단이 아니라 아래쪽이라 초기 로딩을 붙잡지 않는다 */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); load(curQ); } });
    }, { rootMargin: '300px' });
    io.observe(list);
  } else load(curQ);
})();
})();
