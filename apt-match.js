/* ══════════════════════════════════════════════════════════════════════════
   부비 · 내 집 찾기 — 조건 매칭 엔진
   ────────────────────────────────────────────────────────────────────────
   "적합도 87점"이 아니라 "조건에 다 맞는 곳 4곳"을 낸다.

   · 칩 = 조건. 각 조건은 임계값 사다리를 갖고, 후보마다 pass / fail / unknown 셋 중
     하나를 낸다. 데이터가 없는 걸 fail로 치면 소규모 단지가 통째로 사라지고,
     pass로 치면 "100%"가 거짓이 된다. 그래서 셋째 값이 있다.
   · 섹션: 전부 충족 / 하나 풀면(+N) / 미확인 / 제외
   · 완화: 조건 k의 사다리 다음 칸으로 내렸을 때 새로 들어오는 수를 미리 계산
   · 예측 없음. 근거는 사실 + 출처만.

   외부 의존 없음. window.BoobiMatch 로 노출.
   apt-meta / schools / redev 는 호출 쪽이 ctx 로 넘긴다 (fetch는 페이지 몫).
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── 단지명 정규화 — 실거래(국토부)와 K-apt 단지명은 표기가 달라서 정규화 후 동|이름으로 붙인다 ── */
  var ROMAN = { 'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5', 'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10' };
  var ALIAS = [['skview', 'sk뷰'], ['e편한세상', '이편한세상'], ['e-편한세상', '이편한세상'], ['g밸리', '지밸리']];
  var NORM_MEMO = {};
  function norm(s0) {
    var s = String(s0 || ''); var hit = NORM_MEMO[s]; if (hit !== undefined) return hit;
    var raw = s;
    s = s.replace(/맨숀/g, '맨션');
    for (var k in ROMAN) s = s.split(k).join(ROMAN[k]);
    s = s.replace(/[()\[\]{}]/g, '').replace(/[\s\-·.,'"~_]/g, '').toLowerCase();
    for (var i = 0; i < ALIAS.length; i++) s = s.split(ALIAS[i][0]).join(ALIAS[i][1]);
    return (NORM_MEMO[raw] = s.replace(/(아파트|apt)$/, '').replace(/(단지|차)$/, ''));
  }
  function dongKey(d) { return norm(d).replace(/(동|가|리)$/, ''); }
  function metaKey(dong, name) { return dongKey(dong) + '|' + norm(name); }

  /* ── 실거래 ↔ K-apt 매칭 ──────────────────────────────────────────────
     data/apt-meta/{code}.json (tools/apt_meta.py 산출) 은 K-apt 단지 배열이고
     실거래는 국토부 표기라 이름이 다르다 ('상계주공1(고층)' ↔ '상계주공1단지').
     동으로 후보를 좁힌 뒤 ① 정규화 일치 ② 포함 ③ 2-gram 유사도 순으로 붙인다.
     숫자열이 다르면 다른 단지다 — '타워팰리스3'이 '타워팰리스1차'에 붙으면
     세대수·준공년을 남의 것으로 보여주게 되므로 ②③에는 숫자 가드를 건다.
     원본 필드: {c,n,d,hh,y,st,sm,bm,pk(총 주차대수),dc,bd,cor,fac[],heat,ev,top,pku,lat,lng} */
  var WALK = { '5분이내': 5, '5~10분이내': 10, '10~15분이내': 15, '15~20분이내': 20, '20분초과': 25 };
  function numseq(s) { return String(norm(s).match(/\d+/g) || []); }
  function variants(name, dong) {
    var n = norm(name), v = {}; v[n] = 1;
    var pres = [norm(dong), dongKey(dong)];
    for (var i = 0; i < pres.length; i++) { var pre = pres[i]; if (!pre) continue;
      if (n.indexOf(pre) === 0 && n.length > pre.length + 1) v[n.slice(pre.length)] = 1;
      v[pre + n] = 1; }
    return v;
  }
  function grams(s) { var o = {}, n = 0; for (var i = 0; i < s.length - 1; i++) { var k = s.slice(i, i + 2); if (!o[k]) { o[k] = 1; n++; } } return { o: o, n: n }; }
  function ratioG(A, B) {   /* 2-gram 유사도 — 양쪽 다 미리 만든 gram 집합 */
    if (!A.n || !B.n) return 0;
    var hit = 0; for (var k in A.o) if (B.o[k]) hit++;
    return 2 * hit / (A.n + B.n);
  }
  function toMeta(r) {
    return { c: r.c, hh: r.hh || null, yr: r.y || null, bd: r.bd || null, cor: r.cor || null, fac: r.fac || null,
             heat: r.heat || null, ev: r.ev || null, top: r.top || null, pku: r.pku != null ? r.pku : null,
             st: r.st || null, sm: r.sm ? WALK[r.sm] || null : null, bm: r.bm ? WALK[r.bm] || null : null,
             lat: r.lat != null ? r.lat : null, lng: r.lng != null ? r.lng : null,
             pk: (r.pk && r.hh) ? Math.round(r.pk / r.hh * 100) / 100 : null, kn: r.n };
  }
  /* arr: K-apt 단지 배열, rows: 그 시군구 실거래 행 → { metaKey(실거래 동,이름) → meta }
     서울 25개 구 5,700단지에 2.6초가 걸리던 것을, 단지별 정규화·변형·2-gram 을 한 번만 만들고
     ① 정확 일치는 해시로 바로 찾도록 바꿔 수십 ms 로 줄였다. */
  function indexMeta(arr, rows) {
    var out = {};
    if (!Array.isArray(arr) || !arr.length) return out;
    var idx = {}, exact = {};                       /* dongKey → [rec],  dongKey|variant → rec */
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i]; if (!r || !r.n) continue;
      var dk = dongKey(r.d), nn = norm(r.n);
      var rec = { r: r, nn: nn, ns: numseq(r.n), g: null };
      (idx[dk] = idx[dk] || []).push(rec);
      var vs = variants(r.n, r.d);
      for (var x in vs) { var ek = dk + '|' + x; if (!exact[ek] || (r.hh || 0) > (exact[ek].r.hh || 0)) exact[ek] = rec; }
    }
    var seen = {};
    for (var j = 0; j < (rows || []).length; j++) {
      var d = rows[j]; if (d.type && d.type !== 'apt') continue;
      var key = metaKey(d.dong, d.name); if (seen[key]) continue; seen[key] = 1;
      var parts = String(d.dong || '').trim().split(/\s+/);
      var tries = [dongKey(d.dong), dongKey(parts[parts.length - 1]), dongKey(parts[0])];
      var V = variants(d.name, d.dong), m = null;
      /* ① 정규화 일치 (동 접두 흡수 변형 포함) */
      for (var t = 0; t < tries.length && !m; t++) for (var x in V) { var hit = exact[tries[t] + '|' + x]; if (hit) { m = hit; break; } }
      if (!m) {
        /* ② 포함 / ③ 2-gram — 숫자열이 같은 후보에만 */
        var N = numseq(d.name), dn = norm(d.name), safe = [], dd = {};
        for (var t2 = 0; t2 < tries.length; t2++) { var L = idx[tries[t2]] || []; for (var q = 0; q < L.length; q++) { var c = L[q]; var id = c.r.c || c.nn; if (!dd[id] && c.ns === N) { dd[id] = 1; safe.push(c); } } }
        if (safe.length) {
          var subs = [];
          for (var a = 0; a < safe.length; a++) { var kn = safe[a].nn; for (var x2 in V) if (x2.length >= 3 && (kn.indexOf(x2) >= 0 || x2.indexOf(kn) >= 0)) { subs.push(safe[a]); break; } }
          if (subs.length === 1) m = subs[0];
          else { var G = grams(dn), best = null, bs = 0; for (var b = 0; b < safe.length; b++) { if (!safe[b].g) safe[b].g = grams(safe[b].nn); var rr = ratioG(G, safe[b].g); if (rr > bs) { bs = rr; best = safe[b]; } } if (bs >= 0.78) m = best; }
        }
      }
      if (m) out[key] = toMeta(m.r);
    }
    return out;
  }

  function haversine(la1, lo1, la2, lo2) {
    var R = 6371000, rad = Math.PI / 180;
    var dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
    var a = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));   /* m */
  }
  function walkMin(m) { return Math.round(m * 1.3 / 67); }

  /* 학급당 학생수(학교알리미 공시). 이건 조건이 아니라 근거다 —
     "학급 과밀 24명 이하인 집을 찾아줘"라고 말하는 사람은 없고,
     학군을 본 김에 그 학교가 몇 명짜리 교실인지 궁금할 뿐이다. */
  function crowdOf(s) { return (s && s.cp != null) ? ' · 학급당 ' + s.cp.toFixed(1) + '명' : ''; }

  var TIER1 = ['삼성물산', '현대건설', '현대산업개발', 'hdc현대산업개발', 'gs건설', '대우건설', '대림산업', 'dl이앤씨',
               '포스코이앤씨', '포스코건설', '롯데건설', 'sk에코플랜트', '에스케이에코플랜트', '한화건설', '호반건설'];
  var TIER1_NAME = ['디에이치', '아크로', '래미안', '자이', '힐스테이트', '푸르지오', '아이파크', '롯데캐슬', '더샵', '이편한세상', '써밋', '르엘', '트리마제'];
  var TIER2_NAME = ['sk뷰', '포레나', '데시앙', '한신더휴', '오티에르', '스위첸', '중흥s클래스', '해링턴', '두산위브', '위브', '베르디움', '어울림', '비발디', '리슈빌', '센트레빌', '우미린', '린'];
  function brandTier(meta, name) {
    var bd = norm(meta && meta.bd), nm = norm(name);
    for (var i = 0; i < TIER1.length; i++) if (bd && bd.indexOf(TIER1[i]) >= 0) return 1;
    for (var j = 0; j < TIER1_NAME.length; j++) if (nm.indexOf(TIER1_NAME[j]) >= 0) return 1;
    for (var k = 0; k < TIER2_NAME.length; k++) if (nm.indexOf(TIER2_NAME[k]) >= 0) return 2;
    return meta && meta.bd ? 3 : 0;   /* 0 = 시공사도 단지명 힌트도 없음 → unknown */
  }

  /* ══════════════════════════════════════════════════════════════════════
     조건 정의
       ladder : 완화 사다리. index 0 이 기본. 오른쪽으로 갈수록 느슨하다.
       test(c, lv, ctx) → { v:'pass'|'fail'|'unknown', fact:'사실 문구'|null }
       needs  : 어떤 데이터가 있어야 판정 가능한지 (화면에서 "곧 열려요" 표시용)
     ══════════════════════════════════════════════════════════════════════ */
  var CONDS = [
    {
      /* 면적은 칩이 아니라 제약이다 — 4인 가족에게 40㎡는 '조건'이 아니라 '불가능'이다.
         그래서 구름에 섞지 않고 제약 단계에서 따로 묻되, 완화 사다리는 같은 기계로 돌린다.
         "소형도 괜찮으세요?"를 숫자와 함께 묻게 된다: 84↑ → 59↑ +38곳 */
      key: 'size', icon: '📐', label: '면적',
      desc: '전용면적 최소 기준',
      ladder: [{ t: '100㎡ 이상', a: 100 }, { t: '84㎡ 이상', a: 84 }, { t: '59㎡ 이상', a: 59 }, { t: '상관없음', a: 0 }],
      needs: [], constraint: true,
      test: function (c, lv) {
        var a = c.area; if (!(a > 0)) return { v: 'unknown', fact: null };
        var need = this.ladder[lv].a;
        return { v: a >= need - 1 ? 'pass' : 'fail', fact: '전용 ' + a + '㎡ (' + Math.round(a / 3.3058) + '평)' };
      }
    },
    {
      key: 'community', icon: '🏊', label: '커뮤니티',
      desc: 'K-apt 공시 부대복리시설에 커뮤니티공간이 있는 곳',
      ladder: [{ t: '커뮤니티공간 보유', need: 'comm' }, { t: '주민공동시설 이상', need: 'pub' }],
      needs: ['meta'],
      test: function (c, lv) {
        var m = c.meta; if (!m || !m.fac) return { v: m ? 'fail' : 'unknown', fact: m ? '부대복리시설 공시 없음' : null };
        var need = this.ladder[lv].need;
        var ok = m.fac.indexOf('comm') >= 0 || (need === 'pub' && m.fac.indexOf('pub') >= 0);
        var names = { comm: '커뮤니티공간', pub: '주민공동시설', play: '어린이놀이터', senior: '노인정', care: '보육시설', kinder: '유치원', lib: '문고', rest: '휴게시설' };
        var have = m.fac.filter(function (f) { return names[f]; }).map(function (f) { return names[f]; });
        return { v: ok ? 'pass' : 'fail', fact: have.length ? have.slice(0, 4).join('·') + ' (K-apt 공시)' : '부대복리시설 공시 없음' };
      }
    },
    {
      key: 'newbuild', icon: '✨', label: '신축',
      desc: '준공 연차 기준',
      ladder: [{ t: '10년 이내', y: 10 }, { t: '15년 이내', y: 15 }, { t: '20년 이내', y: 20 }],
      needs: [],
      test: function (c, lv, ctx) {
        var y = c.buildYear || (c.meta && c.meta.yr);
        if (!y) return { v: 'unknown', fact: null };
        var age = ctx.thisYear - y;
        return { v: age <= this.ladder[lv].y ? 'pass' : 'fail', fact: y + '년 준공 · ' + age + '년차' };
      }
    },
    {
      key: 'brand', icon: '🏢', label: '브랜드',
      desc: '1군 시공사 (삼성물산·현대·GS·대우·DL·포스코·롯데·HDC…)',
      ladder: [{ t: '1군', max: 1 }, { t: '1~2군', max: 2 }],
      needs: [],
      test: function (c, lv) {
        var t = brandTier(c.meta, c.name);
        if (t === 0) return { v: 'unknown', fact: null };
        var fact = c.meta && c.meta.bd ? c.meta.bd + ' 시공' : '단지명 기준';
        return { v: t <= this.ladder[lv].max ? 'pass' : 'fail', fact: fact + (t <= 2 ? ' · ' + t + '군' : '') };
      }
    },
    {
      key: 'parking', icon: '🚗', label: '주차',
      desc: '세대당 주차대수',
      ladder: [{ t: '세대당 1.0대↑', pk: 1.0 }, { t: '0.8대↑', pk: 0.8 }, { t: '0.6대↑', pk: 0.6 }],
      needs: ['meta'],
      test: function (c, lv) {
        var m = c.meta; if (!m || m.pk == null) return { v: 'unknown', fact: null };
        return { v: m.pk >= this.ladder[lv].pk ? 'pass' : 'fail',
                 fact: '세대당 ' + m.pk.toFixed(1) + '대' + (m.pku != null ? ' · 지하 ' + Math.round(m.pku * 100) + '%' : '') };
      }
    },
    {
      key: 'asset', icon: '📈', label: '자산가치',
      desc: '정비사업·거래량·동네 시세로 봐요 — 상승을 약속하지 않아요',
      ladder: [{ t: '3가지 중 2개', n: 2 }, { t: '3가지 중 1개', n: 1 }],
      needs: [],
      test: function (c, lv, ctx) {
        var hits = [], why = [];
        var rd = ctx.redevOf ? ctx.redevOf(c) : null;
        if (rd && rd.n > 0) { hits.push('redev'); why.push(c.dong + ' 정비사업 ' + rd.n + '곳'); }
        var S = ctx.stats || {};
        if (S.dongPyTop && S.dongPyTop[c.dong]) { hits.push('prime'); why.push(c.dong + ' 평당가 구 상위 30%'); }
        if (S.liquidTop && S.liquidTop[c.name + '|' + c.dong]) { hits.push('liquid'); why.push('최근 1년 거래 상위 30%'); }
        return { v: hits.length >= this.ladder[lv].n ? 'pass' : 'fail', fact: why.length ? why.join(' · ') : '정비사업·시세·거래 어느 것도 해당 없음' };
      }
    },
    {
      key: 'subway', icon: '🚇', label: '역세권',
      desc: '가장 가까운 지하철역까지 도보',
      ladder: [{ t: '도보 10분', m: 10 }, { t: '15분', m: 15 }, { t: '20분', m: 20 }],
      needs: ['meta'],
      test: function (c, lv, ctx) {
        var m = c.meta; if (!m) return { v: 'unknown', fact: null };
        if (m.lat == null || !ctx.stations || !ctx.stations.length) {
          /* K-apt 공시의 '지하철역 도보 시간' 구간 — 좌표 없이도 판정된다. 구간 상한으로 본다 */
          if (m.sm == null) return { v: 'unknown', fact: null };
          return { v: m.sm <= this.ladder[lv].m ? 'pass' : 'fail',
                   fact: (m.st ? m.st + ' ' : '') + (m.sm >= 25 ? '도보 20분 초과' : '도보 ' + m.sm + '분 이내') + ' (K-apt 공시)' };
        }
        var best = null, bd = 1e12;
        for (var i = 0; i < ctx.stations.length; i++) { var s = ctx.stations[i]; var d = haversine(m.lat, m.lng, s.lat, s.lng); if (d < bd) { bd = d; best = s; } }
        var mins = walkMin(bd);
        return { v: mins <= this.ladder[lv].m ? 'pass' : 'fail', fact: (best.ln ? best.ln + ' ' : '') + best.nm + ' 약 ' + Math.round(bd / 10) * 10 + 'm · 도보 ' + mins + '분 (추정)' };
      }
    },
    {
      key: 'commute', icon: '💼', label: '직주근접',
      desc: '출퇴근지까지 대중교통 (거리 기반 추정)',
      ladder: [{ t: '30분 이내', m: 30 }, { t: '45분', m: 45 }, { t: '60분', m: 60 }],
      needs: ['geo'],   /* 출퇴근지는 이 조건을 켠 뒤에 묻는다 — 안 고르면 test 가 unknown 을 낸다 */
      test: function (c, lv, ctx) {
        var m = c.meta, w = ctx.work;
        if (!m || m.lat == null || !w || w.lat == null) return { v: 'unknown', fact: null };
        var km = haversine(m.lat, m.lng, w.lat, w.lng) / 1000;
        var t = Math.round(12 + km * 2.4);
        return { v: t <= this.ladder[lv].m ? 'pass' : 'fail', fact: w.name + '까지 직선 ' + km.toFixed(1) + 'km · 약 ' + t + '분 (추정)' };
      }
    },
    {
      key: 'school', icon: '🏫', label: '학군',
      desc: '초등은 통학 거리, 중고등은 둘레 중학교의 특목·자사고 진학률 (학급 과밀도 같이 봐요)',
      ladder: [{ t: '초 500m · 중 상위 30%', e: 500, p: 0.30 },
               { t: '초 800m · 중 상위 50%', e: 800, p: 0.50 }],
      needs: ['geo', 'schools'],
      test: function (c, lv, ctx) {
        var m = c.meta; if (!m || m.lat == null || !ctx.schools) return { v: 'unknown', fact: null };
        var L = this.ladder[lv];
        var elem = null, ed = 1e12;
        for (var i = 0; i < ctx.schools.length; i++) {
          var s = ctx.schools[i]; if (s.k !== 'e') continue;
          var d = haversine(m.lat, m.lng, s.lat, s.lng); if (d < ed) { ed = d; elem = s; }
        }
        var teen = ctx.kids === '중고등학생';
        if (!teen) {
          if (!elem) return { v: 'unknown', fact: null };
          return { v: ed <= L.e ? 'pass' : 'fail',
                   fact: elem.n + ' ' + Math.round(ed) + 'm' + (ed <= 300 ? ' · 초품아' : '') + crowdOf(elem) };
        }
        /* 중고등: 반경 1.5km 중학교들의 특목·자사고 진학률(학교알리미 공시)을
           졸업생 수로 가중평균한다. 작은 학교 한 곳이 동네를 대표하지 않도록. */
        var cut = ctx.progressCut ? ctx.progressCut(L.p) : null;
        if (ctx.progress && cut != null) {
          var num = 0, den = 0, near = 0, pick = null, pd = 1e12, pr = null;
          for (var j = 0; j < ctx.schools.length; j++) {
            var ms = ctx.schools[j]; if (ms.k !== 'm') continue;
            var mdist = haversine(m.lat, m.lng, ms.lat, ms.lng);
            if (mdist > 1500) continue;
            var p = ctx.progress[ms.c]; if (!p) continue;
            near++; num += p.r * p.g; den += p.g;
            /* 대표로 짚는 학교는 진학률 1등이 아니라 가장 가까운 곳 —
               실제로 배정될 가능성이 높은 학교라야 근거가 된다. */
            if (mdist < pd) { pd = mdist; pick = ms; pr = p; }
          }
          if (den > 0) {
            var avg = num / den;
            return {
              v: avg >= cut ? 'pass' : 'fail',
              fact: '둘레 중학교 ' + near + '곳 특목·자사고 진학률 ' + (avg * 100).toFixed(1) + '%'
                    + (pick ? ' · 가장 가까운 ' + pick.n + ' ' + (pr.r * 100).toFixed(1) + '%'
                              + crowdOf(pick) : '')
            };
          }
        }
        /* 진학 공시가 아직 안 붙은 지역이면 통학거리로만 본다.
           "학군이 좋다"고 말하지 않고 잰 것만 말한다. */
        var mid = null, md = 1e12;
        for (var q = 0; q < ctx.schools.length; q++) {
          var t = ctx.schools[q]; if (t.k !== 'm') continue;
          var dd = haversine(m.lat, m.lng, t.lat, t.lng); if (dd < md) { md = dd; mid = t; }
        }
        if (!mid) return { v: 'unknown', fact: null };
        return { v: md <= L.e ? 'pass' : 'fail',
                 fact: mid.n + ' ' + Math.round(md) + 'm' + crowdOf(mid) + ' (진학 실적은 아직 못 봐요)' };
      }
    },
    {
      key: 'park', icon: '🌳', label: '공원',
      desc: '가장 가까운 도시공원',
      ladder: [{ t: '500m 이내', m: 500 }, { t: '800m', m: 800 }, { t: '1.2km', m: 1200 }],
      needs: ['geo', 'parks'],
      test: function (c, lv, ctx) {
        var m = c.meta; if (!m || m.lat == null || !ctx.parks) return { v: 'unknown', fact: null };
        var best = null, bd = 1e12;
        for (var i = 0; i < ctx.parks.length; i++) { var p = ctx.parks[i]; var d = haversine(m.lat, m.lng, p.lat, p.lng); if (d < bd) { bd = d; best = p; } }
        if (!best) return { v: 'unknown', fact: null };
        return { v: bd <= this.ladder[lv].m ? 'pass' : 'fail', fact: best.nm + ' ' + Math.round(bd) + 'm' };
      }
    },
    {
      key: 'quiet', icon: '🤫', label: '조용함',
      desc: '반경 300m 유흥·단란주점',
      ladder: [{ t: '0곳', n: 0 }, { t: '2곳 이하', n: 2 }, { t: '5곳 이하', n: 5 }],
      needs: ['geo', 'noise'],
      test: function (c, lv, ctx) {
        var m = c.meta; if (!m || m.lat == null || !ctx.noise) return { v: 'unknown', fact: null };
        var n = 0;
        for (var i = 0; i < ctx.noise.length; i++) if (haversine(m.lat, m.lng, ctx.noise[i].lat, ctx.noise[i].lng) <= 300) n++;
        return { v: n <= this.ladder[lv].n ? 'pass' : 'fail', fact: '반경 300m 유흥·단란주점 ' + n + '곳 (인허가 등록 기준)' };
      }
    }
  ];
  var CMAP = {}; CONDS.forEach(function (c) { CMAP[c.key] = c; });

  /* ── 시군구 통계: 자산가치 조건의 ②동네 시세 ③거래량 ──────────────── */
  var PY = 3.3058;
  function buildStats(all) {
    var byDong = {}, byName = {};
    for (var i = 0; i < all.length; i++) {
      var d = all[i]; if (d.type !== 'apt' || !(d.area > 0)) continue;
      var g = byDong[d.dong] || (byDong[d.dong] = { sum: 0, n: 0 }); g.sum += d.price / (d.area / PY); g.n++;
      var k = d.name + '|' + d.dong; byName[k] = (byName[k] || 0) + 1;
    }
    function top(obj, fn, q) {
      var arr = Object.keys(obj).map(function (k) { return [k, fn(obj[k])]; }).sort(function (a, b) { return b[1] - a[1]; });
      var cut = Math.max(1, Math.ceil(arr.length * q)); var out = {};
      for (var i = 0; i < cut; i++) out[arr[i][0]] = true;
      return out;
    }
    return {
      dongPyTop: top(byDong, function (g) { return g.n ? g.sum / g.n : 0; }, 0.30),
      liquidTop: top(byName, function (n) { return n; }, 0.30)
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     실행
       input.cands   : 예산 필터를 통과한 후보 (여기서 예산을 완화하지 않는다)
       input.all     : 같은 지역 전체 실거래 (통계용)
       input.metaIndex : { metaKey → meta }  (없으면 모두 unknown)
       input.conds   : [{ key, level }]  level 생략 = 0
       input.ctx     : { thisYear, kids, work, stations, schools, parks, noise, progress, progressCut, redevOf }
     ══════════════════════════════════════════════════════════════════════ */
  function run(input) {
    var allConds = (input.conds || []).map(function (x) { return { key: x.key, level: x.level || 0, def: CMAP[x.key] }; })
                                       .filter(function (x) { return x.def; });
    /* 면적은 단지로 접기 전에 행 단위로 건다. 한 단지에 25㎡행과 84㎡행이 같이 있을 때
       대표 행이 25㎡라서 84㎡가 있는데도 탈락하는 일을 막는다. */
    var sizeC = null;
    var conds = allConds.filter(function (x) { if (x.key === 'size') { sizeC = x; return false; } return true; });
    var rowsAt = function (lv) {
      if (!sizeC) return input.cands || [];
      var need = sizeC.def.ladder[lv].a;
      return (input.cands || []).filter(function (d) { return d.area > 0 && d.area >= need - 1; });
    };
    var cands = rowsAt(sizeC ? sizeC.level : 0);
    var ctx = Object.assign({ thisYear: new Date().getFullYear() }, input.ctx || {});
    if (!ctx.stats) ctx.stats = buildStats(input.all && input.all.length ? input.all : cands);
    var metaIndex = input.metaIndex || {};

    /* 단지 단위로 접기 — listings 는 단지×면적대 1행이라 같은 단지가 여러 번 온다 */
    var byKey = {}, order = [];
    for (var i = 0; i < cands.length; i++) {
      var d = cands[i]; var k = metaKey(d.dong, d.name);
      var u = byKey[k];
      if (!u) { u = byKey[k] = { key: k, name: d.name, dong: d.dong, sgg: d.sgg, sggCode: d.sggCode, sido: d.sido, buildYear: d.buildYear, rows: [], meta: metaIndex[k] || null }; order.push(u); }
      u.rows.push(d);
    }
    /* 대표 거래: 예산에 가장 가까운 것 */
    var budget = input.budget || 0;
    order.forEach(function (u) {
      u.rows.sort(function (a, b) { return Math.abs(a.price - budget) - Math.abs(b.price - budget); });
      var r = u.rows[0]; u.price = r.price; u.area = r.area; u.dealYm = r.dealYm; u.floor = r.floor; u.id = r.id;
      if (!u.buildYear) u.buildYear = r.buildYear;
    });

    /* 판정 */
    var full = [], relaxable = [], unknown = [], excluded = 0;
    var relaxCount = {};   /* key → { level+1 로 내렸을 때 새로 들어오는 수 } */
    conds.forEach(function (x) { relaxCount[x.key] = 0; });

    order.forEach(function (u) {
      u.verdict = {}; var fails = [], unks = [];
      conds.forEach(function (x) {
        var r = x.def.test(u, x.level, ctx) || { v: 'unknown', fact: null };
        u.verdict[x.key] = { v: r.v, fact: r.fact, level: x.level };
        if (r.v === 'fail') fails.push(x); else if (r.v === 'unknown') unks.push(x);
      });
      if (!fails.length && !unks.length) full.push(u);
      else if (fails.length === 1 && !unks.length) {
        var x = fails[0];
        var nextLv = x.level + 1;
        if (nextLv < x.def.ladder.length) {
          var r2 = x.def.test(u, nextLv, ctx);
          if (r2 && r2.v === 'pass') { relaxCount[x.key]++; u.relaxKey = x.key; relaxable.push(u); return; }
        }
        excluded++;
      }
      else if (!fails.length && unks.length) unknown.push(u);
      else excluded++;
    });

    /* 줄 세우기: 예산 근접순 */
    var near = function (a, b) { return Math.abs(a.price - budget) - Math.abs(b.price - budget); };
    full.sort(near); unknown.sort(near); relaxable.sort(near);

    var relax = conds.filter(function (x) { return x.level + 1 < x.def.ladder.length; }).map(function (x) {
      return { key: x.key, icon: x.def.icon, label: x.def.label,
               from: x.def.ladder[x.level].t, to: x.def.ladder[x.level + 1].t, add: relaxCount[x.key] };
    }).sort(function (a, b) { return b.add - a.add; });

    /* 면적 완화: 다음 칸으로 한 번 더 돌려서 '전부 충족'이 얼마나 느는지 */
    if (sizeC && sizeC.level + 1 < sizeC.def.ladder.length && !input._noSizeRelax) {
      var again = run(Object.assign({}, input, {
        _noSizeRelax: true,
        conds: input.conds.map(function (x) { return x.key === 'size' ? { key: 'size', level: sizeC.level + 1 } : x; })
      }));
      relax.push({ key: 'size', icon: sizeC.def.icon, label: sizeC.def.label,
                   from: sizeC.def.ladder[sizeC.level].t, to: sizeC.def.ladder[sizeC.level + 1].t,
                   add: Math.max(0, again.counts.full - full.length) });
      relax.sort(function (a, b) { return b.add - a.add; });
    }
    var condOut = allConds.map(function (x) { return { key: x.key, level: x.level, icon: x.def.icon, label: x.def.label, threshold: x.def.ladder[x.level].t, constraint: !!x.def.constraint }; });

    /* 조건이 하나도 없으면 전부 'full' — 예산 내 전체 */
    return {
      conds: condOut, stats: ctx.stats,
      full: full, relax: relax, relaxable: relaxable, unknown: unknown,
      counts: { units: order.length, full: full.length, unknown: unknown.length, excluded: excluded },
      metaCoverage: order.length ? order.filter(function (u) { return u.meta; }).length / order.length : 0
    };
  }

  /* 단지 하나에 조건 하나 — 칩 미리보기('켜면 N곳')는 run 을 칩마다 다시 돌리지 않고
     현재 결과의 full 목록에 이 함수를 한 번씩만 건다. 5,700단지 × 10칩이 1초를 넘던 것이 수십 ms 로 준다. */
  function test(u, key, level, ctx) {
    var def = CMAP[key]; if (!def) return { v: 'unknown', fact: null };
    return def.test(u, level || 0, ctx) || { v: 'unknown', fact: null };
  }

  /* 칩 미리보기용 — 조건 집합별 '전부 충족' 수만 빠르게 */
  function countFull(input) { return run(input).counts.full; }

  /* 어떤 조건이 지금 데이터로 판정 가능한지 (화면에서 "곧 열려요" 표시) */
  function availability(ctx, metaCoverage) {
    return CONDS.map(function (c) {
      var ok = c.needs.every(function (n) {
        if (n === 'meta') return metaCoverage > 0;
        if (n === 'geo') return ctx.hasGeo;
        if (n === 'work') return !!(ctx.work && ctx.work.lat != null);
        return !!(ctx[n] && ctx[n].length);
      });
      return { key: c.key, icon: c.icon, label: c.label, desc: c.desc, ready: ok, needs: c.needs, ladder: c.ladder.map(function (l) { return l.t; }) };
    });
  }

  root.BoobiMatch = { CONDS: CONDS, run: run, countFull: countFull, availability: availability,
                      buildStats: buildStats, metaKey: metaKey, norm: norm, dongKey: dongKey, indexMeta: indexMeta, test: test };
})(typeof window !== 'undefined' ? window : globalThis);
