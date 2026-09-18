/* ═══════════════════════════════════════════════════════════════════════════
   부비 · 수도권 입지 사다리 (갈아타기 참고용)
   ───────────────────────────────────────────────────────────────────────────
   갈아타기는 "지금보다 좋은 데"가 아니라 "지금보다 한 칸 위"로 간다.
   두 칸을 건너뛰면 대출이 안 나오거나, 나와도 원리금에 깔린다.
   그래서 후보지를 낼 때 등급을 한 칸씩만 올려 보여준다.

   ⚠️ 이 표는 시세·선호도에 대한 통념을 4단계로 옮긴 참고 자료다.
      국토부·지자체 공시 같은 사실이 아니라 편집된 분류이고, 화면에서도
      그렇게 밝힌다. 예측도 투자 권유도 아니다.

   등급   4 회색  → 3 검정  → 2 금색  → 1 주황
   사다리 회색에서 검정, 검정에서 금색, 금색에서 주황. 순서대로만 올린다.

   판정 순서
     ① dongs 가 지정된 권역을 먼저 본다 (동 이름 앞부분 일치)
        — 같은 시군구에 등급이 다른 권역이 섞여 있다.
          강서구: 마곡(2) / 가양(3),  수원 영통구: 광교(3) / 영통(4),
          고양 덕양구: 지축(3) / 창릉(4),  하남시: 위례(3) / 미사(3)
     ② 없으면 시군구 전체로 본다
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  if (root.BoobiTier) return;

  function nm(s) { return String(s || '').replace(/\s+/g, ''); }

  /* t: 등급(1이 가장 위) · n: 권역 이름 · dongs: 있으면 그 동만, 없으면 시군구 전체 */
  var AREAS = [
    /* ── 1 · 주황 ───────────────────────────────────────────────────── */
    { t: 1, n: '서초', sido: '서울특별시', sgg: '서초구' },
    { t: 1, n: '강남', sido: '서울특별시', sgg: '강남구' },
    { t: 1, n: '송파', sido: '서울특별시', sgg: '송파구' },

    /* ── 2 · 금색 ───────────────────────────────────────────────────── */
    { t: 2, n: '이촌', sido: '서울특별시', sgg: '용산구', dongs: ['이촌동'] },
    { t: 2, n: '여의도', sido: '서울특별시', sgg: '영등포구', dongs: ['여의도동'] },
    { t: 2, n: '당산', sido: '서울특별시', sgg: '영등포구', dongs: ['당산동', '양평동'] },
    { t: 2, n: '공덕', sido: '서울특별시', sgg: '마포구', dongs: ['공덕동', '신공덕동', '아현동', '염리동', '도화동', '용강동'] },
    { t: 2, n: '마곡', sido: '서울특별시', sgg: '강서구', dongs: ['마곡동'] },
    { t: 2, n: '노량진', sido: '서울특별시', sgg: '동작구', dongs: ['노량진동', '본동'] },
    { t: 2, n: '흑석', sido: '서울특별시', sgg: '동작구', dongs: ['흑석동'] },
    { t: 2, n: '옥수', sido: '서울특별시', sgg: '성동구', dongs: ['옥수동', '금호동', '응봉동'] },
    { t: 2, n: '성수', sido: '서울특별시', sgg: '성동구', dongs: ['성수동'] },
    { t: 2, n: '광장', sido: '서울특별시', sgg: '광진구', dongs: ['광장동', '자양동'] },
    { t: 2, n: '고덕', sido: '서울특별시', sgg: '강동구', dongs: ['고덕동', '상일동', '명일동'] },
    { t: 2, n: '과천', sido: '경기도', sgg: '과천시' },
    { t: 2, n: '평촌', sido: '경기도', sgg: '안양시 동안구' },
    { t: 2, n: '판교', sido: '경기도', sgg: '성남시 분당구', dongs: ['판교동', '백현동', '삼평동', '운중동', '대장동', '석운동'] },
    { t: 2, n: '분당', sido: '경기도', sgg: '성남시 분당구' },

    /* ── 3 · 검정 ───────────────────────────────────────────────────── */
    { t: 3, n: 'DMC', sido: '서울특별시', sgg: '마포구', dongs: ['상암동'] },
    { t: 3, n: '가양', sido: '서울특별시', sgg: '강서구' },
    { t: 3, n: '목동', sido: '서울특별시', sgg: '양천구' },
    { t: 3, n: '신도림', sido: '서울특별시', sgg: '구로구' },
    { t: 3, n: '중계', sido: '서울특별시', sgg: '노원구' },
    { t: 3, n: '길음·장위', sido: '서울특별시', sgg: '성북구' },
    { t: 3, n: '청량리', sido: '서울특별시', sgg: '동대문구' },
    { t: 3, n: '지축', sido: '경기도', sgg: '고양시 덕양구', dongs: ['지축동', '삼송동', '원흥동', '향동동', '도내동'] },
    { t: 3, n: '철산', sido: '경기도', sgg: '광명시' },
    { t: 3, n: '구리', sido: '경기도', sgg: '구리시' },
    { t: 3, n: '다산', sido: '경기도', sgg: '남양주시', dongs: ['다산동', '지금동', '도농동', '별내동'] },
    { t: 3, n: '위례', sido: '경기도', sgg: '성남시 수정구', dongs: ['창곡동'] },
    { t: 3, n: '위례', sido: '경기도', sgg: '하남시', dongs: ['학암동', '감이동'] },
    { t: 3, n: '미사', sido: '경기도', sgg: '하남시' },
    { t: 3, n: '산성', sido: '경기도', sgg: '성남시 수정구' },
    { t: 3, n: '산본', sido: '경기도', sgg: '군포시' },
    { t: 3, n: '수지', sido: '경기도', sgg: '용인시 수지구' },
    { t: 3, n: '광교', sido: '경기도', sgg: '수원시 영통구', dongs: ['광교동', '이의동', '하동', '원천동'] },
    { t: 3, n: '동탄', sido: '경기도', sgg: '화성시 동탄구' },

    /* ── 4 · 회색 ───────────────────────────────────────────────────── */
    { t: 4, n: '창릉', sido: '경기도', sgg: '고양시 덕양구' },
    { t: 4, n: '중동', sido: '경기도', sgg: '부천시 원미구' },
    { t: 4, n: '고잔', sido: '경기도', sgg: '안산시 단원구' },
    { t: 4, n: '영통', sido: '경기도', sgg: '수원시 영통구' },
    { t: 4, n: '파주', sido: '경기도', sgg: '파주시' }
  ];

  var TIER = {
    1: { n: '최상위', c: '#F97316', bg: '#FFF2E6', dot: '🟠' },
    2: { n: '상급지', c: '#C8930A', bg: '#FDF6E0', dot: '🟡' },
    3: { n: '중상급지', c: '#1F2937', bg: '#EDEFF2', dot: '⚫' },
    4: { n: '기반', c: '#8A95A1', bg: '#F1F3F5', dot: '⚪' }
  };

  /* 동 지정이 있는 항목을 먼저 — 같은 시군구 안에서 좁은 쪽이 이긴다 */
  var ORDERED = AREAS.slice().sort(function (a, b) {
    return (b.dongs ? 1 : 0) - (a.dongs ? 1 : 0);
  });

  function hit(a, sido, sgg, dong) {
    if (nm(a.sido) !== nm(sido) || nm(a.sgg) !== nm(sgg)) return false;
    if (!a.dongs) return true;
    var d = nm(dong); if (!d) return false;
    for (var i = 0; i < a.dongs.length; i++) if (d.indexOf(nm(a.dongs[i])) === 0) return true;
    return false;
  }

  /* 한 곳이 어느 등급인지. 표에 없으면 null — 모르는 걸 4등급으로 치지 않는다. */
  function of(sido, sgg, dong) {
    for (var i = 0; i < ORDERED.length; i++) if (hit(ORDERED[i], sido, sgg, dong)) return ORDERED[i];
    return null;
  }

  /* 시군구만 아는 경우 (동을 모를 때) — 그 시군구에서 가장 높은 등급으로 본다 */
  function ofSgg(sido, sgg) {
    var best = null;
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      if (nm(a.sido) !== nm(sido) || nm(a.sgg) !== nm(sgg)) continue;
      if (!best || a.t < best.t) best = a;
    }
    return best;
  }

  function at(t) { return AREAS.filter(function (a) { return a.t === t; }); }

  /* 갈아타기 목적지 — 한 칸 위만. 맨 위(1등급)면 빈 배열. */
  function up(t) { return t > 1 ? at(t - 1) : []; }

  /* 같은 권역이 시군구 둘에 걸쳐 있으면(위례) 이름으로 묶어서 보여준다 */
  function groupByName(list) {
    var seen = {}, out = [];
    list.forEach(function (a) {
      if (seen[a.n]) { seen[a.n].parts.push(a); return; }
      seen[a.n] = { n: a.n, t: a.t, parts: [a] }; out.push(seen[a.n]);
    });
    return out;
  }

  root.BoobiTier = {
    AREAS: AREAS, TIER: TIER,
    of: of, ofSgg: ofSgg, at: at, up: up, groupByName: groupByName,
    label: function (t) { return (TIER[t] || {}).n || ''; },
    note: '입지 등급은 시세·선호도에 대한 통념을 4단계로 옮긴 부비의 참고 분류예요. '
        + '공시 자료가 아니라 편집된 기준이고, 같은 권역 안에서도 단지마다 크게 달라요.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
