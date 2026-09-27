// cheongyak-board.html 의 초기 목록(#list)을 cheongyak-data.json / cheongyak-featured.json 으로
// 정적 렌더링한다. JS가 로드되면 같은 데이터로 다시 그리므로 사용자에게 보이는 내용은 동일하고,
// JS를 실행하지 않는 크롤러도 공고 요약을 읽을 수 있다.
// cheongyak-data.json 이 갱신될 때마다 워크플로에서 함께 실행한다.
import fs from 'node:fs';

const HTML = 'cheongyak-board.html';
const START = '<!-- cy-static start -->';
const END = '<!-- cy-static end -->';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const md = (s) => {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])}/${Number(m[3])}` : String(s);
};

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

const data = readJson('cheongyak-data.json') || { items: [] };
const feat = readJson('cheongyak-featured.json') || { items: [] };

const today = new Date().toISOString().slice(0, 10);
const status = (it) => {
  if (it.rcritStart && today < it.rcritStart) return '접수예정';
  if (it.rcritEnd && today > it.rcritEnd) return '마감';
  if (it.rcritStart && it.rcritEnd) return '접수중';
  return '공고';
};

const rows = [];

for (const it of feat.items || []) {
  const bits = [
    it.margin ? `<b>${esc(it.margin)}</b>` : '',
    it.note ? esc(it.note) : '',
  ].filter(Boolean);
  rows.push(
    `<li><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)}</a>` +
      ` <span class="cy-tag">${esc(it.type)}·${esc(status(it))}</span><br>` +
      `<span class="cy-meta">${esc(it.region)} · 공고 ${md(it.noticeDate)} · 접수 ${md(it.rcritStart)}~${md(it.rcritEnd)} · 발표 ${md(it.winnerDate)}` +
      (it.units ? ` · ${esc(it.units)}세대` : '') +
      `</span>` +
      (bits.length ? `<br><span class="cy-note">${bits.join(' · ')}</span>` : '') +
      `</li>`
  );
}

const seen = new Set((feat.items || []).map((i) => i.name));
const sorted = (data.items || [])
  .filter((i) => !seen.has(i.name))
  .sort((a, b) => String(b.noticeDate || '').localeCompare(String(a.noticeDate || '')));

for (const it of sorted) {
  rows.push(
    `<li><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)}</a>` +
      ` <span class="cy-tag">${esc(it.type)}·${esc(status(it))}</span><br>` +
      `<span class="cy-meta">${esc(it.region)} · ${esc(it.addr)} · 공고 ${md(it.noticeDate)} · 접수 ${md(it.rcritStart)}~${md(it.rcritEnd)} · 발표 ${md(it.winnerDate)}` +
      (it.units ? ` · ${esc(it.units)}세대` : '') +
      `</span></li>`
  );
}

const upd = (data.updatedAt || '').slice(0, 10);
const block =
  `${START}\n` +
  `<div class="cy-static">\n` +
  `<p class="cy-lead">아래는 ${esc(upd)} 기준으로 부비가 모은 청약·분양 공고 ${rows.length}건입니다. ` +
  `자료 출처는 ${esc(data.source || '한국부동산원 청약홈')}이며, 확정차익·주목 공고의 안전마진 표시는 부비 자체 판단입니다. ` +
  `필터를 쓰면 지역·유형·접수 상태별로 좁혀 볼 수 있어요.</p>\n` +
  `<ul class="cy-list">\n${rows.join('\n')}\n</ul>\n` +
  `</div>\n${END}`;

let html = fs.readFileSync(HTML, 'utf-8');
if (html.includes(START) && html.includes(END)) {
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block);
} else {
  html = html.replace(
    /<div id="list">[\s\S]*?<\/div>/,
    `<div id="list">\n${block}\n</div>`
  );
}
fs.writeFileSync(HTML, html);
console.log(`cy-static: ${rows.length} notices written`);

/* ══════════════════════════════════════════════════════════════════════
   calendar.html 의 '이번 달 일정'을 정적으로도 한 번 찍는다
   ────────────────────────────────────────────────────────────────────
   캘린더는 달력 격자와 목록을 전부 자바스크립트로 그린다. 그래서 크롤러가
   읽는 본문이 320자뿐이었다 — 페이지에 실제로 담긴 정보는 수백 건인데
   구글에는 "일 월 화 수 목 금 토"만 보인다.

   같은 데이터를 HTML 에도 한 번 써둔다. JS 가 돌면 같은 내용으로 다시
   그리므로 사람이 보는 화면은 그대로다. 워크플로가 이 스크립트를 하루 두 번
   돌리니 날짜도 같이 최신으로 유지된다.
   ══════════════════════════════════════════════════════════════════════ */
function buildCalendar() {
  const CAL = 'calendar.html';
  const S = '<!-- cal-static start -->';
  const E = '<!-- cal-static end -->';
  let html;
  try { html = fs.readFileSync(CAL, 'utf-8'); } catch { console.log('cal-static: calendar.html 없음'); return; }
  if (!html.includes(S) || !html.includes(E)) { console.log('cal-static: 표식 없음 — 건너뜀'); return; }

  const cal    = readJson('calendar-events.json') || { events: [] };
  const rental = readJson('rental-data.json') || { items: [] };

  const now = new Date(Date.now() + 9 * 3600 * 1000);          /* KST */
  const ym  = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const nx  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const ym2 = `${nx.getUTCFullYear()}-${String(nx.getUTCMonth() + 1).padStart(2, '0')}`;

  const LABEL = { holiday: '공휴일', rate: '금리', tax: '세금', lease: '임대', cheongyak: '청약' };
  const rows = [];

  for (const e of cal.events || []) {
    if (!String(e.date || '').startsWith(ym) && !String(e.date || '').startsWith(ym2)) continue;
    rows.push({ d: e.date, k: LABEL[e.type] || '일정', t: e.title, s: e.desc || '' });
  }
  for (const it of [...(feat.items || []), ...(data.items || [])]) {
    for (const [d, what] of [[it.rcritStart, '청약 접수 시작'], [it.rcritEnd, '청약 접수 마감'], [it.winnerDate, '당첨자 발표']]) {
      if (!d || (!String(d).startsWith(ym) && !String(d).startsWith(ym2))) continue;
      rows.push({ d, k: '청약', t: `${it.name} ${what}`, s: [it.region, it.addr].filter(Boolean).join(' · ') });
    }
  }
  for (const it of rental.items || []) {
    for (const [d, what] of [[it.rcritStart, '접수 시작'], [it.rcritEnd, '접수 마감'], [it.winnerDate, '당첨자 발표']]) {
      if (!d || (!String(d).startsWith(ym) && !String(d).startsWith(ym2))) continue;
      rows.push({ d, k: '임대', t: `${it.name} ${what}`, s: [it.provider, it.ltype, it.region].filter(Boolean).join(' · ') });
    }
  }
  rows.sort((a, b) => a.d.localeCompare(b.d) || a.k.localeCompare(b.k));

  const dayOf = (d) => { const p = d.split('-'); return `${Number(p[1])}월 ${Number(p[2])}일`; };
  const li = rows.map((r) =>
    `<li><b>${esc(dayOf(r.d))}</b> <span class="cal-k">${esc(r.k)}</span> ${esc(r.t)}` +
    (r.s ? `<br><span class="cal-s">${esc(r.s)}</span>` : '') + `</li>`).join('\n');

  const mm = Number(ym.split('-')[1]), mm2 = Number(ym2.split('-')[1]);
  const block =
    `${S}\n<div class="cal-static">\n` +
    `<p class="cal-lead">${now.getUTCFullYear()}년 ${mm}월·${mm2}월에 잡혀 있는 부동산 일정 <b>${rows.length}건</b>이에요. ` +
    `청약 접수·당첨발표는 한국부동산원 청약홈, 임대 공고는 LH청약플러스·SH공사·HUG에서 부비가 하루 두 번 모읍니다. ` +
    `공휴일과 금리 결정일은 공식 발표 일정이고, 세금은 법정 납기 기준이에요. ` +
    `위 달력에서 지역·자격으로 좁혀 볼 수 있습니다.</p>\n` +
    (rows.length ? `<ul class="cal-list">\n${li}\n</ul>\n` : `<p class="cal-lead">이 두 달에는 확정된 일정이 아직 없어요.</p>\n`) +
    `</div>\n${E}`;

  html = html.replace(new RegExp(`${S}[\\s\\S]*?${E}`), () => block);
  html = html.replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/,
    `"dateModified": "${now.toISOString().slice(0, 10)}"`);
  fs.writeFileSync(CAL, html);
  console.log(`cal-static: ${rows.length} events written (${ym}, ${ym2})`);
}
buildCalendar();
