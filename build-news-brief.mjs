// 부비 브리핑 — 매일 아침 생성.
//
// 설계 원칙 (애드센스 정책 대응):
//  1) 숫자는 전부 부비 자체 데이터(실거래·청약공고·정비구역·캘린더)에서만 뽑는다.
//     뉴스에서 숫자를 가져오면 남의 기사 요약이 되고, 틀릴 위험도 커진다.
//  2) 뉴스는 "오늘 어떤 주제가 많이 다뤄졌는지"를 서술하는 데만 쓴다. 단정·전망 금지.
//  3) 생성 결과는 index.html에 정적으로 구워 넣는다. 크롤러가 JS를 실행하지 않아도 읽혀야 한다.
//  4) 실패하면 기존 브리핑을 그대로 둔다. 절대 빈 칸으로 만들지 않는다.
import fs from 'node:fs';

const WORKER = 'https://hwon-boobi.tndud-brad.workers.dev/chat';
const NEWS = 'https://hwon-rtms.vercel.app/api/news?q=';
const OUT_JSON = 'news-brief.json';
const HTML = 'index.html';
const START = '<!-- boobi-brief start -->';
const END = '<!-- boobi-brief end -->';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
};

const kstNow = () => new Date(Date.now() + 9 * 3600 * 1000);
const iso = (d) => d.toISOString().slice(0, 10);

// ---------- 1. 부비 자체 데이터 ----------
function boobiFacts() {
  const f = {};
  const today = iso(kstNow());
  f.today = today;

  const cy = readJson('cheongyak-data.json');
  if (cy?.items) {
    const it = cy.items;
    f.noticeTotal = it.length;
    f.open = it.filter((x) => x.rcritStart <= today && today <= x.rcritEnd).length;
    f.upcoming = it.filter((x) => x.rcritStart > today).length;
    f.remainder = it.filter((x) => x.type === '무순위').length;
    const soon = it
      .filter((x) => x.rcritStart >= today)
      .sort((a, b) => String(a.rcritStart).localeCompare(String(b.rcritStart)))
      .slice(0, 3)
      .map((x) => `${x.name}(${x.region}, 접수 ${x.rcritStart})`);
    f.soon = soon;
  }

  const feat = readJson('cheongyak-featured.json');
  if (feat?.items?.length) {
    f.featured = feat.items.slice(0, 2).map((x) => `${x.name}${x.margin ? ' — ' + x.margin : ''}`);
  }

  const idx = readJson('data/listings/index.json');
  if (idx?.regions) {
    f.listingUpdated = idx.updated;
    f.complexCount = Object.values(idx.regions).reduce((a, r) => a + (r.n || 0), 0);
    f.regionCount = Object.keys(idx.regions).length;
  }

  const redev = readJson('data/redev-index.json');
  if (redev) {
    const arr = Array.isArray(redev) ? redev : redev.items || [];
    if (arr.length) f.redevCount = arr.length;
  }

  const cal = readJson('calendar-events.json');
  if (cal?.events) {
    const d14 = iso(new Date(kstNow().getTime() + 14 * 86400000));
    f.calendar = cal.events
      .filter((e) => e.date >= today && e.date <= d14)
      .slice(0, 5)
      .map((e) => `${e.date} ${e.title}`);
  }
  return f;
}

// ---------- 2. 오늘의 뉴스 제목 ----------
async function newsTitles() {
  const topics = ['부동산', '아파트 청약', '주택담보대출 금리', '전세 월세'];
  const seen = new Set();
  const out = [];
  for (const t of topics) {
    try {
      const r = await fetch(NEWS + encodeURIComponent(t) + '&cb=' + Date.now());
      if (!r.ok) continue;
      const d = await r.json();
      for (const it of (d.items || []).slice(0, 6)) {
        if (it?.title && !seen.has(it.title)) { seen.add(it.title); out.push(it.title); }
      }
    } catch { /* 한 주제 실패는 무시 */ }
  }
  return out;
}

// ---------- 3. 프롬프트 ----------
function buildPrompt(f, titles) {
  const facts = [
    f.complexCount ? `전국 실거래 수록 단지 ${f.complexCount.toLocaleString('ko-KR')}개 (${f.regionCount}개 시군구, ${f.listingUpdated} 갱신)` : '',
    f.redevCount ? `정비구역 ${f.redevCount}곳 수록` : '',
    f.noticeTotal ? `청약·분양 공고 ${f.noticeTotal}건 (접수 중 ${f.open}건, 접수 예정 ${f.upcoming}건, 무순위 ${f.remainder}건)` : '',
    f.soon?.length ? `임박 공고: ${f.soon.join(' / ')}` : '',
    f.featured?.length ? `부비 주목 공고: ${f.featured.join(' / ')}` : '',
    f.calendar?.length ? `2주 내 일정: ${f.calendar.join(' / ')}` : '',
  ].filter(Boolean).join('\n');

  return `당신은 부동산 정보 서비스 '부비'의 편집자입니다. 오늘(${f.today}) 홈 화면에 실릴 브리핑을 씁니다.

[부비 자체 데이터 — 숫자는 반드시 여기서만 인용]
${facts}

[오늘 수집된 부동산 기사 제목 ${titles.length}건 — 흐름 파악용]
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

[작성 규칙]
- 3문장. 각 문장 60~90자. 존댓말 평서문.
- 첫 문장: 기사 제목들에서 읽히는 오늘의 관심사를 서술. "~한다"가 아니라 "~라는 이야기가 많았습니다" 같은 서술로. 시세·금리 전망을 단정하지 마세요.
- 둘째 문장: 부비 데이터의 청약 공고 현황을 숫자와 함께.
- 셋째 문장: 2주 내 일정이나 임박 공고 중 독자가 챙길 것 하나.
- 매체 이름, 기사 제목, 기자 이름을 그대로 옮기지 마세요.
- 투자 권유, 매수·매도 조언, 특정 단지 추천 금지.
- 데이터에 없는 수치는 절대 만들지 마세요.
- 마크다운 없이 본문 3문장만 출력하세요.`;
}

// ---------- 4. 워커 호출 ----------
async function askWorker(prompt) {
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(WORKER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (d?.reply) return String(d.reply).trim();
      throw new Error('empty reply');
    } catch (e) {
      console.error(`worker 시도 ${i + 1} 실패: ${e.message}`);
      await new Promise((res) => setTimeout(res, 4000 * (i + 1)));
    }
  }
  return null;
}

// ---------- 5. 검수 ----------
function sane(text, f) {
  if (!text) return '응답 없음';
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 80 || t.length > 700) return `길이 이상(${t.length}자)`;
  if (/^(죄송|미안|I'm|As an)/i.test(t)) return '거절 응답';
  if (/https?:\/\//.test(t)) return '링크 포함';
  // 부비 데이터에 없는 큰 숫자를 지어내지 않았는지 대략 확인
  const allowed = new Set(
    [f.complexCount, f.regionCount, f.redevCount, f.noticeTotal, f.open, f.upcoming, f.remainder]
      .filter((n) => typeof n === 'number')
      .map(String)
  );
  const nums = (t.match(/\d[\d,]{2,}/g) || []).map((s) => s.replace(/,/g, ''));
  for (const n of nums) {
    if (!allowed.has(n) && !/^20\d\d$/.test(n)) return `근거 없는 수치 ${n}`;
  }
  return null;
}

// ---------- 6. HTML 주입 ----------
function renderBlock(b) {
  // 러너가 UTC라 Date의 지역시간 getter를 쓰면 하루가 밀린다. 문자열을 그대로 쪼갠다.
  const [yy, mm, dd] = b.date.split('-').map(Number);
  const label = `${yy}년 ${mm}월 ${dd}일`;
  const sents = b.brief.split(/(?<=다\.)\s+/).filter(Boolean);
  return (
    `${START}\n` +
    `<article class="brief">\n` +
    `<div class="briefHead"><span class="briefTag">부비 브리핑</span><span class="briefDate">${esc(label)}</span></div>\n` +
    `<p class="briefBody">${sents.map(esc).join(' ')}</p>\n` +
    `<p class="briefNote">숫자는 부비 실거래·청약 공고 데이터 기준이고, 흐름은 오늘 수집한 기사` +
    `${b.newsCount ? ' ' + b.newsCount + '건' : ''}에서 읽은 것입니다. ` +
    `부비가 매일 아침 자동으로 정리하며, 투자 판단의 근거로 쓰기에는 충분하지 않습니다.</p>\n` +
    `</article>\n${END}`
  );
}

function inject(b) {
  let html = fs.readFileSync(HTML, 'utf-8');
  const block = renderBlock(b);
  if (html.includes(START) && html.includes(END)) {
    const i = html.indexOf(START);
    const j = html.indexOf(END) + END.length;
    html = html.slice(0, i) + block + html.slice(j);
  } else {
    const anchor = '<div class="newsChips" id="newsChips">';
    if (!html.includes(anchor)) throw new Error('newsChips 앵커를 찾지 못했습니다');
    html = html.replace(anchor, block + '\n' + anchor);
  }
  fs.writeFileSync(HTML, html);
}

// ---------- main ----------
const prev = readJson(OUT_JSON);
const f = boobiFacts();
const titles = await newsTitles();

if (!titles.length) {
  console.error('뉴스를 하나도 못 받았습니다 — 기존 브리핑 유지');
  if (prev) inject(prev);
  process.exit(0);
}

const reply = await askWorker(buildPrompt(f, titles));
const bad = sane(reply, f);

if (bad) {
  console.error(`브리핑 검수 실패(${bad}) — 기존 브리핑 유지`);
  if (prev) inject(prev);
  process.exit(0);
}

const brief = {
  date: f.today,
  brief: reply.replace(/\s+/g, ' ').trim(),
  newsCount: titles.length,
  facts: {
    noticeTotal: f.noticeTotal ?? null,
    open: f.open ?? null,
    upcoming: f.upcoming ?? null,
    remainder: f.remainder ?? null,
    complexCount: f.complexCount ?? null,
  },
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(OUT_JSON, JSON.stringify(brief, null, 2) + '\n');
inject(brief);
console.log(`브리핑 갱신 완료 (${brief.date}, 기사 ${brief.newsCount}건)\n${brief.brief}`);
