/* ===== 등기부 판독 공용 모듈 =====
 * 등기부등본 PDF를 브라우저 안에서만 읽어 위험등기·채권최고액·최선순위 담보권 설정일을 뽑는다.
 * 파일은 서버로 보내지 않는다 (pdf.js가 로컬에서 텍스트만 추출).
 *
 * 원본은 jeonse-safety-check.html 안에 있던 로직이다. 집 종합 리포트에서도 같은 판독이
 * 필요해져서 공용으로 뺐다. 전세사기 진단 페이지는 그대로 두었으므로(사용자 지시),
 * 두 곳의 판독 규칙이 갈라지지 않게 고칠 때는 양쪽을 같이 볼 것.
 *
 * 사용법:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
 *   <script src="/boobi-deunggi.js" defer></script>
 *   var text = await bbDeunggi.extract(file);
 *   var a    = bbDeunggi.analyze(text);
 */
(function () {
if (window.bbDeunggi) return;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* PDF → 텍스트. 스캔본(이미지)이면 빈 문자열에 가까운 값이 나온다. */
async function extract(file) {
  if (!window.pdfjsLib) throw new Error('PDF 판독기를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var text = '';
  for (var p = 1; p <= pdf.numPages; p++) {
    var pg = await pdf.getPage(p);
    var tc = await pg.getTextContent();
    text += tc.items.map(function (it) { return it.str; }).join(' ') + '\n';
  }
  return text;
}

/* "2021년 3월 15일" / "2021.03.15" 둘 다 받는다 */
function parseDates(str) {
  var out = [], m;
  var re1 = /(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
  while ((m = re1.exec(str)) !== null) out.push(new Date(+m[1], +m[2] - 1, +m[3]));
  var re2 = /(20\d{2})[.\-](\d{1,2})[.\-](\d{1,2})/g;
  while ((m = re2.exec(str)) !== null) out.push(new Date(+m[1], +m[2] - 1, +m[3]));
  return out;
}

/* 등기부 본문이 맞는지 확인 — 엉뚱한 PDF를 올렸을 때 조용히 '위험 없음'이 뜨는 걸 막는다 */
function squish(text) { return String(text || '').replace(/\s+/g, ''); }

function looksLikeRegistry(text) {
  var t = squish(text);
  if (t.length < 150) return false;      // 스캔본(이미지)이면 글자가 거의 안 나온다
  var hits = 0;
  [/등기사항/, /표제부/, /갑구/, /을구/, /등기부/, /소유권/, /등기목적/].forEach(function (re) {
    if (re.test(t)) hits++;
  });
  return hits >= 2;
}

function analyze(text) {
  /* PDF에서 글자가 한 자씩 떨어져 나오는 경우가 흔하다 ("경 매 개 시 결 정").
     공백을 하나로 줄이는 정도로는 키워드가 안 잡히므로, 판독은 공백을 전부 없앤
     문자열에서 한다. 금액의 자릿수 콤마와 날짜 숫자는 공백을 지워도 붙어 있다. */
  var t = squish(text);
  var flags = [], own = {};
  function has(re) { return re.test(t); }

  if (has(/신탁/)) flags.push(['high', '🏦 신탁 등기', '소유자가 신탁회사일 수 있어요. 위탁자(집주인)와 그냥 계약하면 무효가 될 수 있으니, 신탁원부로 처분 권한과 신탁사·우선수익자 동의를 반드시 확인하세요.']);
  if (has(/경매개시결정|임의경매|강제경매/)) flags.push(['high', '⚖️ 경매개시 등기', '경매 절차 이력이 있어요. 현재 유효하면 계약하지 마세요.']);
  if (has(/(^|[^가])압류/) && !has(/가압류/)) flags.push(['high', '🚨 압류', '세금 체납 등으로 인한 압류예요. 체납 세금은 다른 채권보다 먼저 배당돼 매우 위험해요.']);
  if (has(/가압류/)) flags.push(['high', '🚨 가압류', '채권자가 재산을 묶어둔 상태예요. 소유자 재정이 위험하다는 신호예요.']);
  if (has(/가처분/)) flags.push(['high', '⚠️ 가처분', '소유권 분쟁 가능성이 있어요. 말소 여부와 사유를 확인하세요.']);
  if (has(/임차권등기/)) flags.push(['high', '🏠 임차권등기명령', '앞 세입자가 보증금을 못 받아 등기한 이력이에요. 같은 일이 반복될 위험이 커요.']);
  if (has(/가등기/)) flags.push(['mid', '📌 가등기', '소유권이전청구권 가등기면 나중에 소유자가 바뀔 수 있어요. 담보가등기면 근저당처럼 선순위가 돼요.']);
  if (has(/전세권설정/)) flags.push(['mid', '📌 선순위 전세권', '전세권이 앞서 있으면 순위가 밀려요. 금액과 말소 여부를 확인하세요.']);
  if (has(/지상권/)) flags.push(['info', '🌳 지상권', '토지 이용 관련 권리가 설정돼 있어요. 통상 직접 관련은 적지만 확인해두세요.']);

  own.joint = /공유자|지분\d+분의\d+|각지분/.test(t);
  own.trust = /신탁/.test(t);

  /* 근저당 채권최고액 합 (원 단위) */
  var sum = 0, cnt = 0, m, re = /채권최고액금?([0-9,]+)원/g;
  while ((m = re.exec(t)) !== null) { sum += parseInt(m[1].replace(/,/g, ''), 10); cnt++; }

  /* 말소기준권리 최선순위 설정일 */
  var seniorDate = null, kw = /(근저당권설정|압류|가압류|담보가등기|경매개시결정)/g, km;
  while ((km = kw.exec(t)) !== null) {
    var ds = parseDates(t.slice(km.index, km.index + 30));
    if (ds.length) {
      var d = ds[0];
      if (d && d.getFullYear() >= 1990 && d <= new Date() && (!seniorDate || d < seniorDate)) seniorDate = d;
    }
  }

  return {
    valid: looksLikeRegistry(text),
    flags: flags,
    mortSum: sum,                 /* 원 */
    mortMan: Math.round(sum / 10000), /* 만원 */
    mortCnt: cnt,
    seniorDate: seniorDate,
    own: own,
    hasMalso: /말소사항\s*포함/.test(t) || /주말/.test(t)
  };
}

/* 가장 높은 위험 등급 — 'high' | 'mid' | 'info' | 'none' */
function level(a) {
  if (!a || !a.flags || !a.flags.length) return 'none';
  if (a.flags.some(function (f) { return f[0] === 'high'; })) return 'high';
  if (a.flags.some(function (f) { return f[0] === 'mid'; })) return 'mid';
  return 'info';
}

window.bbDeunggi = { extract: extract, analyze: analyze, level: level, parseDates: parseDates, looksLikeRegistry: looksLikeRegistry, squish: squish };
})();
