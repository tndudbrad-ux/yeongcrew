/* ══════════════════════════════════════════════════════════════════
   apt-score.js — 아파트 찾기 실거주/투자 분기 추천 스코어링 엔진

   원칙(절대 완화 금지):
   - 국토부 실거래가 + 정비사업 통계처럼 **공개 자료로 확인되는 사실만** 점수화한다.
   - 가격 상승률·수익률·투자수익은 예측하지도 암시하지도 않는다.
   - 데이터가 없는 요소(역세권 거리·세대수·준공연도·학군)는 아예 만들지 않는다.
     추정치로 채우면 근거 문구가 거짓말이 되므로, 데이터가 붙기 전까지는 화면에서도 뺀다.

   웹(apt-finder.html)과 앱(AptFinder.jsx)이 같은 결과를 내야 하므로
   두 저장소의 이 파일은 항상 같은 로직을 유지할 것.
   ══════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var PY = 3.3058; /* 1평 = 3.3058㎡ */

  /* ── 브랜드: 단지명에 확정적으로 드러나는 것만. 추정하지 않는다 ── */
  var BRANDS = [
    '자이', '래미안', '힐스테이트', '푸르지오', 'e편한세상', '이편한세상', '아이파크',
    '더샵', '롯데캐슬', 'SK뷰', '에스케이뷰', '포레나', '디에이치', '아크로', '써밋',
    '센트레빌', '데시앙', '위브', '리슈빌', '베르디움', '우미린', 'S클래스', '더휴',
    '어울림', '디에트르', '스타힐스', '코아루', '유보라', '예가', '로얄듀크', '블루밍',
    '파밀리에', '비발디', '이안', '해링턴', '트리마제', '아펠바움', '루체하임', '엘크루',
    '한양수자인', '수자인', '두산위브', '금호어울림', '대우드림월드', '캐슬', '스위첸',
    '오브제', '벨라시티', '리버파크', '센트럴파크'
  ];

  function brandOf(name) {
    var n = String(name || '');
    for (var i = 0; i < BRANDS.length; i++) {
      if (n.indexOf(BRANDS[i]) >= 0) return BRANDS[i];
    }
    return null;
  }

  /* ── 정비사업 단계 순서 (앞설수록 사업이 많이 진행된 것) ── */
  var STAGE_ORDER = [
    ['착공', 7], ['이주', 6], ['철거', 6], ['관리처분', 5], ['사업시행', 4],
    ['조합설립', 3], ['추진위', 2], ['구역지정', 1], ['정비구역', 1]
  ];
  function stageRank(stage) {
    var s = String(stage || '');
    for (var i = 0; i < STAGE_ORDER.length; i++) {
      if (s.indexOf(STAGE_ORDER[i][0]) >= 0) return STAGE_ORDER[i][1];
    }
    return s ? 1 : 0;
  }
  /* 'YYMMDD' → '2022.04' (없으면 빈 문자열) */
  function ymd(v) {
    var s = String(v || '').replace(/\D/g, '');
    if (s.length < 4) return '';
    var y = +s.slice(0, 2);
    return (y > 60 ? 1900 + y : 2000 + y) + '.' + s.slice(2, 4);
  }
  /* 단계에 해당하는 인가일을 고른다 — 없는 날짜를 지어내지 않는다 */
  function stageDate(r) {
    var s = String(r.stage || '');
    if (s.indexOf('착공') >= 0) return ymd(r.conStart);
    if (s.indexOf('이주') >= 0 || s.indexOf('철거') >= 0) return ymd(r.migStart);
    if (s.indexOf('관리처분') >= 0) return ymd(r.mgmtLast || r.mgmtInit);
    if (s.indexOf('사업시행') >= 0) return ymd(r.impLast || r.impInit);
    if (s.indexOf('조합설립') >= 0) return ymd(r.assoc);
    if (s.indexOf('추진위') >= 0) return ymd(r.promo);
    return ymd(r.zoneLast || r.zoneInit);
  }

  /* ══ 조합원 지위 양도 제한 (도시 및 주거환경정비법 §39②) ══
     투기과열지구에서는 사업이 일정 단계를 넘으면 조합원 지위를 넘겨받을 수 없다.
       · 재건축 — 조합설립인가 이후
       · 재개발 — 관리처분계획인가 이후
     즉 "안전궤도에 오른 구역"일수록 애초에 살 수가 없다. 여기에 높은 점수를 주면
     못 사는 물건을 1순위로 추천하게 된다. 점수보다 판정이 먼저다.

     다만 시행령 §37에 지연 예외가 있고, 그건 우리가 가진 인가일로 판정된다.
       ② 재건축 — 조합설립인가 후 3년 넘게 사업시행계획인가 미신청
       ③ 사업시행계획인가 후 3년 넘게 미착공 (착공 전 양도)
       ④ 착공 후 3년 넘게 미준공
     세 예외 모두 "매도인이 그 물건을 3년 이상 계속 소유"를 함께 요구한다.
     그건 매물마다 다르니 우리가 단정할 수 없다 — 반드시 조건부로 표기한다.
     (1세대1주택 10년 보유·5년 거주 예외도 있으나 매도인 사정이라 판정 불가) */
  function ymdToDate(v) {
    var s = String(v || '').replace(/\D/g, '');
    if (s.length < 6) return null;
    var y = +s.slice(0, 2); y += (y > 60 ? 1900 : 2000);
    var t = new Date(y, (+s.slice(2, 4) || 1) - 1, +s.slice(4, 6) || 1);
    return isNaN(t.getTime()) ? null : t;
  }
  function yearsSince(d, now) { return d ? (now - d) / (365.25 * 24 * 3600 * 1000) : null; }

  /* 재건축 = 조합설립(3), 재개발 = 관리처분(5). STAGE_ORDER의 랭크와 같은 축이다. */
  function tradeStatus(r, regulated, now) {
    if (!r) return null;
    var rebuild = String(r.type || '').indexOf('재건축') >= 0;
    var limit = rebuild ? 3 : 5;
    var out = { rebuild: rebuild, stage: r.stage || '', date: stageDate(r), blocked: false, exception: null };
    if (!regulated || stageRank(r.stage) < limit) return out;
    out.blocked = true;
    now = now || new Date();
    var assoc = ymdToDate(r.assoc),
        imp = ymdToDate(r.impLast || r.impInit),
        con = ymdToDate(r.conStart);
    if (con && yearsSince(con, now) >= 3) out.exception = '착공 후 3년 넘게 준공되지 않음';
    else if (imp && !con && yearsSince(imp, now) >= 3) out.exception = '사업시행계획인가 후 3년 넘게 착공하지 않음';
    else if (rebuild && assoc && !imp && yearsSince(assoc, now) >= 3) out.exception = '조합설립인가 후 3년 넘게 사업시행계획인가를 신청하지 않음';
    return out;
  }

  /* 카드에 항상 띄우는 고지. 유저가 '정비사업'을 안 골라도 보여준다 —
     몇 년 뒤 이주해야 할 집인지는 오히려 실거주자에게 더 필요한 정보다.
     점수에 넣는 것과 화면에 보여주는 것은 별개다. */
  function redevNotice(d, C) {
    var m = C.redev && C.redev[d.id];
    if (!m || !m.exact) return null;
    var t = tradeStatus(m.exact, C.regulated, C.now);
    if (!t) return null;
    var head = m.exact.nm + ' ' + (t.stage || '정비사업') + (t.date ? '(' + t.date + ')' : '') + ' 구역에 포함돼요';
    if (!t.blocked) return { level: 'info', text: head };
    if (t.exception) {
      return { level: 'warn', text: head + ' · 투기과열지구라 조합원 지위 양도가 원칙적으로 제한되지만, '
        + t.exception + '이라 예외에 해당할 수 있어요(매도인이 3년 이상 계속 보유한 경우). 조합에 꼭 확인하세요.' };
    }
    return { level: 'block', text: head + ' · 투기과열지구에서는 '
      + (t.rebuild ? '조합설립인가' : '관리처분계획인가') + ' 이후 조합원 지위 양도가 제한돼 매수가 어려울 수 있어요. '
      + '예외 사유 해당 여부는 조합에 확인하세요.' };
  }

  /* ══ 시군구 전체 실거래에서 단지·동 단위 통계를 만든다 ══
     후보군만 보면 "거래가 활발한지"를 알 수 없어서, 파일 전체를 쓴다. */
  function buildStats(all) {
    var byName = {}, byDong = {}, maxYm = '';
    for (var i = 0; i < (all || []).length; i++) {
      var d = all[i];
      var key = d.name + '|' + d.dong;
      var s = byName[key] || (byName[key] = { n: 0, last: '' });
      s.n++;
      if (d.dealYm > s.last) s.last = d.dealYm;
      if (d.dealYm > maxYm) maxYm = d.dealYm;

      var g = byDong[d.dong] || (byDong[d.dong] = { sum: 0, n: 0 });
      if (d.area > 0) { g.sum += d.price / (d.area / PY); g.n++; }
    }
    var dongPy = {};
    for (var k in byDong) if (byDong[k].n) dongPy[k] = byDong[k].sum / byDong[k].n;
    return { byName: byName, dongPy: dongPy, maxYm: maxYm };
  }

  /* 개월 차이 (둘 다 'YYYY-MM') */
  function monthsBetween(a, b) {
    if (!a || !b) return 0;
    var x = a.split('-'), y = b.split('-');
    return (+y[0] - +x[0]) * 12 + (+y[1] - +x[1]);
  }

  /* 시군 비교. 서울·부산·인천은 자치구 단위('강남구')라 그대로 맞지만,
     경기는 시 단위('안양시')로 오는데 실거래 시군구는 '안양시 동안구'다.
     한쪽이 다른 쪽으로 시작하면 같은 시군으로 본다. */
  function sameSgg(a, b) {
    if (!a || !b) return true;
    a = String(a).replace(/\s/g, ''); b = String(b).replace(/\s/g, '');
    return a === b || b.indexOf(a) === 0 || a.indexOf(b) === 0;
  }

  /* ══ 정비사업 매칭 ══
     같은 법정동의 구역들을 찾고, 단지명이 구역명과 직접 맞으면 훨씬 강한 근거로 본다. */
  function redevMatch(d, redevRows) {
    if (!redevRows || !redevRows.length) return null;
    var dong = String(d.dong || ''); if (!dong) return null;
    var core = dong.replace(/\d+가$/, '');
    var hit = [];
    for (var i = 0; i < redevRows.length; i++) {
      var r = redevRows[i];
      if (!sameSgg(r.gu, d.sgg)) continue;
      var addr = String(r.addr || '');
      if (addr.indexOf(dong) >= 0 || (core.length > 2 && addr.indexOf(core) >= 0)) hit.push(r);
    }
    if (!hit.length) return null;

    var best = hit[0], bestRank = stageRank(hit[0].stage), exact = null;
    for (var j = 0; j < hit.length; j++) {
      var rk = stageRank(hit[j].stage);
      if (rk > bestRank) { bestRank = rk; best = hit[j]; }
      /* 단지명 ↔ 구역명 직접 매칭 (한쪽이 다른 쪽을 포함) */
      var nm = String(hit[j].nm || '').replace(/\s/g, '');
      var dn = String(d.name || '').replace(/\s/g, '');
      if (!exact && nm.length > 2 && dn.length > 2 && (nm.indexOf(dn) >= 0 || dn.indexOf(nm) >= 0)) exact = hit[j];
    }
    return { n: hit.length, best: best, rank: bestRank, exact: exact, date: stageDate(best) };
  }

  /* ══ 점수 요소 정의 ══
     key       : 내부 식별자
     label     : 사용자가 고른 그대로 화면에 다시 보여줄 말
     icon      : 이모지
     desc      : 선택 화면의 한 줄 설명
     raw(d,C)  : 원점수(클수록 좋음). C = 컨텍스트
     why(d,C)  : 근거 문구 (사실만). null이면 근거를 못 대는 것이므로 표시하지 않는다. */
  var FACTORS = [
    {
      key: 'wide', icon: '📐', label: '같은 값에 넓은 집',
      desc: '평당가가 낮아 같은 예산으로 면적을 더 가져가는 단지',
      raw: function (d) { return d.area > 0 ? -(d.price / (d.area / PY)) : -1e9; },
      why: function (d) {
        if (!(d.area > 0)) return null;
        return '평당 ' + Math.round(d.price / (d.area / PY)).toLocaleString('ko-KR') + '만원 · 전용 ' + d.area + '㎡';
      }
    },
    {
      key: 'brand', icon: '🏢', label: '브랜드 아파트',
      desc: '단지명에 시공 브랜드가 확인되는 곳',
      /* 단지명에 브랜드가 안 붙은 곳도 시공사가 1군이면 브랜드 단지다
         ('올림픽선수기자촌'처럼 이름만으로는 안 잡히는 경우). */
      raw: function (d) { return (brandOf(d.name) || (d.meta && d.meta.bd)) ? 1 : 0; },
      why: function (d) {
        var b = brandOf(d.name);
        if (b) return b + ' 브랜드 단지';
        return (d.meta && d.meta.bd) ? d.meta.bd + ' 시공' : null;
      }
    },
    {
      key: 'newer', icon: '🏗️', label: '지은 지 얼마 안 된 곳',
      desc: '실거래에 기록된 건축년도가 최근인 단지',
      raw: function (d) {
        /* 건축년도가 없는 건은 NaN을 돌려 정규화에서 중립(50)을 받게 한다.
           모른다는 이유로 꼴찌를 주면 데이터 공백이 곧 감점이 되어버린다. */
        return d.buildYear > 0 ? d.buildYear : NaN;
      },
      why: function (d, C) {
        if (!d.buildYear) return null;
        var now = +String(C.stats.maxYm).slice(0, 4) || d.buildYear;
        var age = now - d.buildYear;
        return d.buildYear + '년 준공' + (age <= 1 ? ' (신축)' : ' · ' + age + '년 차');
      }
    },
    {
      key: 'liquid', icon: '🔁', label: '거래가 잘 되는 단지',
      desc: '최근 1년 실거래가 많아 사고팔기 수월한 곳',
      raw: function (d, C) { var s = C.stats.byName[d.name + '|' + d.dong]; return s ? s.n : 0; },
      why: function (d, C) {
        var s = C.stats.byName[d.name + '|' + d.dong];
        return s && s.n > 1 ? '최근 1년 실거래 ' + s.n + '건' : null;
      }
    },
    {
      key: 'redev', icon: '🏗', label: '정비사업이 도는 곳',
      desc: '재개발·재건축 구역이 확인되는 동네 (진행 단계까지 확인)',
      raw: function (d, C) {
        var m = C.redev[d.id];
        if (!m) return 0;
        /* 살 수 없는 물건에 최고점을 주지 않는다 */
        if (m.exact) {
          var t = tradeStatus(m.exact, C.regulated, C.now);
          if (t && t.blocked && !t.exception) return 0;
        }
        return m.rank * 10 + Math.min(m.n, 8) + (m.exact ? 30 : 0);
      },
      why: function (d, C) {
        var m = C.redev[d.id]; if (!m) return null;
        if (m.exact) {
          var t = tradeStatus(m.exact, C.regulated, C.now);
          /* 매수가 막힌 구역은 추천 근거로 내세우지 않는다. 사실 고지는 redevNotice가 따로 한다. */
          if (t && t.blocked && !t.exception) return null;
          return m.exact.nm + ' ' + (m.exact.stage || '정비사업') + (stageDate(m.exact) ? '(' + stageDate(m.exact) + ')' : '')
            + ' — 이 단지가 구역에 포함돼요'
            + (t && t.exception ? ' · 양도 제한 예외에 해당할 수 있어요(' + t.exception + ')' : '');
        }
        return d.dong + ' 정비사업 ' + m.n + '곳 · 가장 앞선 단계 ' + (m.best.stage || '진행 중') + (m.date ? '(' + m.date + ')' : '');
      }
    },
    {
      key: 'prime', icon: '🏙', label: '동네 값이 단단한 곳',
      desc: '같은 구 안에서도 평당가가 높게 형성된 법정동',
      raw: function (d, C) { return C.stats.dongPy[d.dong] || 0; },
      why: function (d, C) {
        var v = C.stats.dongPy[d.dong]; if (!v) return null;
        return d.dong + ' 평균 평당 ' + Math.round(v).toLocaleString('ko-KR') + '만원';
      }
    },
    {
      key: 'cheap', icon: '💰', label: '예산보다 여유 있게',
      desc: '예산을 다 쓰지 않고 남기는 쪽',
      raw: function (d, C) { return C.budget - d.price; },
      why: function (d, C) {
        var gap = C.budget - d.price;
        return gap > 0 ? '내 예산보다 ' + Math.round(gap).toLocaleString('ko-KR') + '만원 아래' : null;
      }
    },
    {
      key: 'fresh', icon: '🆕', label: '최근에 거래된 집',
      desc: '거래가 최근이라 시세가 가장 최신인 곳',
      raw: function (d, C) { return -monthsBetween(d.dealYm, C.stats.maxYm); },
      why: function (d, C) {
        var g = monthsBetween(d.dealYm, C.stats.maxYm);
        return g <= 2 ? d.dealYm.replace('-', '.') + ' 거래 (가장 최근)' : null;
      }
    },

    /* ── 아래 넷은 K-apt 단지 메타(d.meta)와 좌표가 붙어야 값이 나온다.
       메타가 없는 건은 raw 가 NaN 을 돌려 정규화에서 중립(50)을 받는다 —
       모른다는 이유로 꼴찌를 주면 데이터 공백이 곧 감점이 되기 때문이다. ── */
    {
      key: 'scale', icon: '🏘', label: '대단지',
      desc: '세대수가 많아 거래가 붙고 관리비가 분산되는 단지',
      /* 세대수는 거래량과 겹쳐 보이지만 성격이 다르다. 거래량은 12개월 표본이라
         해마다 흔들리고, 세대수는 바뀌지 않는 구조값이다.
         전국 분포: 중앙값 431세대 · 1,000세대↑ 상위 12%. */
      raw: function (d) { return (d.meta && d.meta.hh) ? d.meta.hh : NaN; },
      why: function (d) {
        var h = d.meta && d.meta.hh; if (!h) return null;
        return num(h) + '세대' + (h >= 1000 ? ' 대단지' : '');
      }
    },
    {
      key: 'subway', icon: '🚇', label: '역세권',
      desc: 'K-apt 공시 기준 가장 가까운 지하철역 도보 시간',
      /* 분이 짧을수록 좋으니 부호를 뒤집는다 */
      raw: function (d) { return (d.meta && d.meta.sm != null) ? -d.meta.sm : NaN; },
      why: function (d) {
        var m = d.meta && d.meta.sm; if (m == null) return null;
        return (d.meta.st ? d.meta.st + ' ' : '') + '도보 ' + m + '분';
      }
    },
    {
      key: 'elem', icon: '🏫', label: '초품아',
      desc: '단지에서 가장 가까운 초등학교까지의 직선 거리',
      raw: function (d, C) {
        var n = nearest(d, C.elem); return n ? -n.d : NaN;
      },
      why: function (d, C) {
        var n = nearest(d, C.elem); if (!n) return null;
        return n.o.n + ' ' + Math.round(n.d) + 'm' + (n.d <= 500 ? ' (초품아)' : '');
      }
    },
    {
      key: 'park', icon: '🌳', label: '공원',
      desc: '걸어서 갈 수 있는 근린공원급(1만㎡ 이상) 거리',
      raw: function (d, C) {
        var n = nearest(d, C.parks); return n ? -n.d : NaN;
      },
      why: function (d, C) {
        var n = nearest(d, C.parks); if (!n) return null;
        return n.o.n + ' ' + Math.round(n.d) + 'm';
      }
    }
  ];

  var FMAP = {};
  for (var fi = 0; fi < FACTORS.length; fi++) FMAP[FACTORS[fi].key] = FACTORS[fi];

  /* 데이터가 아직 없어서 뺀 요소 — 화면에 솔직히 밝힌다.
     평지(경사도)는 쓸 만한 공개 데이터를 아직 못 찾았다. 추정으로 채우지 않는다. */
  var PENDING = ['평지·경사'];

  /* 투자 모드 고정 가중치.
     인수인계 원안(정비사업 2.5 · 역세권 2.0 · 연식 1.5 · 대단지 1.5 · 거래량 1.0)을 지키고,
     좌표·단지메타가 붙으면서 열린 역세권·대단지·초품아·공원을 채워 넣었다.
     값이 없는 단지는 정규화에서 중립(50)을 받으므로, 메타가 없다고 밀려나지 않는다. */
  var INVEST_W = {
    redev:  2.5,   /* 정비사업 — 가격을 가장 크게 움직인다 */
    subway: 2.0,   /* 역세권 */
    scale:  1.5,   /* 대단지 */
    newer:  1.5,   /* 신축 */
    brand:  1.2,   /* 브랜드 */
    liquid: 1.0,   /* 거래량 — 팔고 싶을 때 팔리나 */
    prime:  1.0,   /* 동네 시세 */
    elem:   1.0,   /* 초품아 */
    park:   0.8    /* 공원 */
  };

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  function haversine(la1, lo1, la2, lo2) {
    var R = 6371000, rad = Math.PI / 180;
    var dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
    var a = Math.sin(dLa / 2) * Math.sin(dLa / 2)
          + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));   /* m */
  }

  /* 목록마다 캐시 키를 하나 붙여 둔다. 'elem' 은 초등학교(k==='e')만 남긴다. */
  var TAGN = 0;
  function tagged(list, kind) {
    if (!list || !list.length) return null;
    var out = (kind === 'elem')
      ? list.filter(function (x) { return x.k === 'e' && x.lat != null; })
      : list.filter(function (x) { return x.lat != null; });
    if (!out.length) return null;
    out.__k = kind + (++TAGN);
    return out;
  }

  /* 단지에서 가장 가까운 지점. 단지 하나당 수천 곳을 훑으므로 결과를 캐시한다
     (같은 단지가 면적대마다 여러 행으로 들어온다). */
  var NEAR = {};
  function nearest(d, list) {
    if (!list || !list.length) return null;
    var m = d.meta; if (!m || m.lat == null) return null;
    var k = list.__k + '|' + m.lat + ',' + m.lng;
    if (k in NEAR) return NEAR[k];
    var best = null, bd = Infinity;
    for (var i = 0; i < list.length; i++) {
      var o = list[i], dist = haversine(m.lat, m.lng, o.lat, o.lng);
      if (dist < bd) { bd = dist; best = o; }
    }
    return (NEAR[k] = best ? { o: best, d: bd } : null);
  }

  function normalize(vals) {
    var min = Infinity, max = -Infinity, i;
    for (i = 0; i < vals.length; i++) {
      if (!isFinite(vals[i])) continue;
      if (vals[i] < min) min = vals[i];
      if (vals[i] > max) max = vals[i];
    }
    var out = [];
    for (i = 0; i < vals.length; i++) {
      if (!isFinite(vals[i]) || max === min) out.push(50);
      else out.push((vals[i] - min) / (max - min) * 100);
    }
    return out;
  }

  /**
   * 후보 단지를 점수순으로 재배열한다.
   * @param {Array}  cands   예산 필터를 이미 통과한 후보 (여기서 예산 규율을 완화하지 않는다)
   * @param {Object} opt
   *   - all       : 해당 시군구 실거래 전체 (통계용)
   *   - budget    : 현재 예산(만원)
   *   - purpose   : 'live' | 'invest'
   *   - prios     : 실거주 모드에서 유저가 고른 요소 key 배열 (순서 = 순위, 최대 3개)
   *   - redevRows : 정비사업 행 배열 (없으면 빈 배열)
   * @returns {Array} [{...단지, _score, _why:[{icon,label,rank,text}]}]
   */
  function rank(cands, opt) {
    opt = opt || {};
    var list = (cands || []).slice();
    if (!list.length) return list;

    var C = {
      stats: buildStats(opt.all && opt.all.length ? opt.all : list),
      budget: opt.budget || 0,
      regulated: !!opt.regulated,   /* 투기과열지구 여부 — 양도 제한 판정에 쓴다 */
      now: opt.now || new Date(),
      /* 초등학교·공원은 호출 쪽이 넘긴다(fetch 는 페이지 몫). 없으면 그 요소만 중립이 된다. */
      elem: tagged(opt.schools, 'elem'),
      parks: tagged(opt.parks, 'park'),
      redev: {}
    };
    var rr = opt.redevRows || [];
    for (var i = 0; i < list.length; i++) C.redev[list[i].id] = redevMatch(list[i], rr);

    /* 요소별 0~100 정규화 */
    var norm = {};
    for (var f = 0; f < FACTORS.length; f++) {
      var F = FACTORS[f], vals = [];
      for (var j = 0; j < list.length; j++) vals.push(F.raw(list[j], C));
      norm[F.key] = normalize(vals);
    }

    /* 가중치 */
    var invest = opt.purpose === 'invest';
    var prios = (opt.prios || []).slice(0, 3);
    var W = {};
    for (var g = 0; g < FACTORS.length; g++) W[FACTORS[g].key] = 0.5; /* 안 고른 요소도 0.5로 살려 왜곡 방지 */
    if (invest) {
      for (var k in INVEST_W) W[k] = INVEST_W[k];
    } else {
      var PW = [3.0, 2.0, 1.5];
      for (var p = 0; p < prios.length; p++) if (W[prios[p]] !== undefined) W[prios[p]] = PW[p];
    }

    /* 채점 */
    var scored = list.map(function (d, idx) {
      var sc = 0;
      for (var m = 0; m < FACTORS.length; m++) {
        var key = FACTORS[m].key;
        sc += W[key] * norm[key][idx];
      }
      /* 근거: 유저가 고른 순서대로. 투자 모드는 고정 가중치 순서대로. */
      var order = invest ? ['redev', 'subway', 'scale', 'newer', 'brand', 'liquid', 'prime', 'elem', 'park'] : prios;
      var why = [], bars = [];
      for (var w = 0; w < order.length; w++) {
        var Fx = FMAP[order[w]]; if (!Fx) continue;
        var txt = Fx.why(d, C);
        var rk = invest ? 0 : w + 1;
        if (txt) why.push({ icon: Fx.icon, label: Fx.label, rank: rk, text: txt });
        /* 막대는 근거 문장을 못 대는 요소도 보여준다 — 상대 위치 자체가 정보다 */
        bars.push({
          key: Fx.key, icon: Fx.icon, label: Fx.label, rank: rk,
          v: Math.round(norm[Fx.key][idx]), text: txt || null,
        });
      }
      return { d: d, sc: sc, why: why, bars: bars, i: idx };
    });

    scored.sort(function (a, b) { return (b.sc - a.sc) || (a.i - b.i); });

    /* 총점을 후보군 안에서 0~100으로 다시 편다.
       절대 점수가 아니라 "이 후보군 안에서의 상대 위치"라는 뜻이므로
       화면에서도 반드시 그렇게 표기할 것. */
    var raw = scored.map(function (s) { return s.sc; });
    var fit = normalize(raw);

    return scored.map(function (s, i) {
      var o = {};
      for (var kk in s.d) o[kk] = s.d[kk];
      o._score = Math.round(s.sc);
      o._fit = Math.round(fit[i]);
      o._why = s.why;
      o._bars = s.bars;
      o._notice = redevNotice(s.d, C);   /* 우선순위 선택과 무관하게 항상 붙는다 */
      return o;
    });
  }

  root.AptScore = {
    FACTORS: FACTORS, PENDING: PENDING, INVEST_W: INVEST_W,
    brandOf: brandOf, stageRank: stageRank, stageDate: stageDate,
    tradeStatus: tradeStatus, redevNotice: redevNotice, sameSgg: sameSgg,
    redevMatch: redevMatch, buildStats: buildStats, rank: rank, haversine: haversine
  };
})(typeof window !== 'undefined' ? window : this);
