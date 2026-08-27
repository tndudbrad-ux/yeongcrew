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
