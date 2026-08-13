/* ===== 부비 — 청약홈 무순위·재공급 보완 수집기 =====
 * 목적: 기존 자동 갱신이 놓치는 '불법행위 재공급', '취소후 재공급' 등 무순위 특수 유형을
 *       청약홈 API(getRemndrLttotPblancDetail)에서 받아 cheongyak-data.json에 "병합"한다 (덮어쓰지 않음).
 * 중복 방지: ① id(HOUSE_MANAGE_NO) 기준 — 기존 자동 수집분과 충돌 없음
 *            ② cheongyak-featured.json에 수동 등록된 공고는 이름 정규화 매칭으로 제외 (게시판 이중 노출 방지)
 * 실행: .github/workflows/cheongyak-extra.yml (매일 KST 07:00·22:00 — 기존 갱신 이후)
 * 시크릿: CHEONGYAK_API_KEY (공공데이터포털 ApplyhomeInfoDetailSvc 인증키, URL 인코딩된 키 그대로 OK)
 */
import fs from 'node:fs';

const RAW_KEY = process.env.CHEONGYAK_API_KEY || '';
if (!RAW_KEY) { console.log('CHEONGYAK_API_KEY 시크릿이 아직 없어요 — 설정 전이라 이번 실행은 건너뜁니다.'); process.exit(0); }
// 키가 이미 URL 인코딩돼 있으면(%포함) 그대로, 아니면 인코딩
const KEY = RAW_KEY.includes('%') ? RAW_KEY : encodeURIComponent(RAW_KEY);

const kstNow = new Date(Date.now() + 9 * 3600 * 1000);
function ymd(d) { return d.toISOString().slice(0, 10); }
const fromDate = ymd(new Date(kstNow.getTime() - 30 * 86400000)); // 최근 30일 공고

const url = `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getRemndrLttotPblancDetail?page=1&perPage=500&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=${fromDate}&serviceKey=${KEY}`;

let rows;
if (process.env.TEST_FILE) {
  rows = JSON.parse(fs.readFileSync(process.env.TEST_FILE, 'utf8')).data;
} else {
  const r = await fetch(url);
  if (!r.ok) { console.error('청약홈 API 오류 HTTP ' + r.status + ': ' + (await r.text()).slice(0, 300)); process.exit(1); }
  const j = await r.json();
  rows = j.data || [];
}
console.log(`무순위 API 최근 30일 공고 ${rows.length}건 조회`);

const data = JSON.parse(fs.readFileSync('cheongyak-data.json', 'utf8'));
const featured = JSON.parse(fs.readFileSync('cheongyak-featured.json', 'utf8'));
const haveIds = new Set(data.items.map(it => String(it.id)));
// 이름 정규화: 공백·괄호부 제거 → featured 수동 등록분과 매칭
const norm = s => String(s || '').replace(/\(.*?\)/g, '').replace(/[\s ]/g, '');
const featNames = new Set(featured.items.map(it => norm(it.name)));

const added = [];
for (const r of rows) {
  const id = String(r.HOUSE_MANAGE_NO || r.PBLANC_NO || '');
  if (!id || haveIds.has(id)) continue;
  if (featNames.has(norm(r.HOUSE_NM))) { console.log(`  건너뜀(featured 수동 등록됨): ${(r.HOUSE_NM||'').trim()}`); continue; }
  const secd = (r.HOUSE_SECD_NM || '').trim();
  const name = (r.HOUSE_NM || '').trim() + (secd && !/무순위/.test(secd) ? ` (${secd})` : '');
  const starts = [r.SUBSCRPT_RCEPT_BGNDE, r.GNRL_RCEPT_BGNDE, r.SPSPLY_RCEPT_BGNDE].filter(Boolean).sort();
  const ends = [r.SUBSCRPT_RCEPT_ENDDE, r.GNRL_RCEPT_ENDDE, r.SPSPLY_RCEPT_ENDDE].filter(Boolean).sort();
  added.push({
    id, name,
    region: r.SUBSCRPT_AREA_CODE_NM || '',
    addr: r.HSSPLY_ADRES || '',
    noticeDate: r.RCRIT_PBLANC_DE || null,
    winnerDate: r.PRZWNER_PRESNATN_DE || null,
    units: r.TOT_SUPLY_HSHLDCO || null,
    url: r.PBLANC_URL || 'https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancListView.do',
    type: '무순위',
    rcritStart: starts[0] || null,
    rcritEnd: ends[ends.length - 1] || null
  });
}

if (!added.length) { console.log('추가할 공고 없음 — 기존 수집분과 모두 중복이거나 featured에 있음.'); process.exit(0); }
for (const a of added) console.log(`  + ${a.id} | ${a.name} | 접수 ${a.rcritStart}~${a.rcritEnd}`);

data.items = data.items.concat(added);
fs.writeFileSync('cheongyak-data.json', JSON.stringify(data, (k, v) => v, 0).replace('"items":[', '"items":[\n').replaceAll('},{', '},\n{').replace(']}', ']\n}') + '\n');
JSON.parse(fs.readFileSync('cheongyak-data.json', 'utf8')); // 유효성 재확인
console.log(`병합 완료 — ${added.length}건 추가, 총 ${data.items.length}건`);
