#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   경기도 일반 정비사업 추진현황 CSV → data/redev-gyeonggi.json
   ────────────────────────────────────────────────────────────────────────
   왜 수집기가 아니라 변환기인가
     경기데이터드림은 이 데이터셋에 OpenAPI를 제공하지 않는다(Sheet + Link만).
     서울(서울열린데이터)·부산·인천(공공데이터포털)처럼 API로 긁을 수가 없어서
     CSV를 받아 변환하는 방식으로 간다. 원본 갱신이 연 1회 수준(2025-07-21)이라
     월간 자동화가 꼭 필요하지도 않다.

   쓰는 법
     1) https://data.gg.go.kr 에서 "일반 정비 사업 추진 현황" 검색 → CSV 내려받기
     2) node tools/redev-gyeonggi.mjs <내려받은.csv>
     3) data/redev-gyeonggi.json 생성 + 컬럼 매핑 리포트 출력

   출력 스키마는 redev-seoul.json과 동일하다. 프론트(apt-score.js)가
   같은 fields 배열을 가정하고 있으므로 순서를 바꾸면 안 된다.
   ══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const FIELDS = ['gu','nm','addr','pub','pro','type','stage','exist','tot','sale','rent',
  'zoneInit','zoneLast','promo','assoc','arch','impInit','impLast','mgmtInit','mgmtLast',
  'migStart','migEnd','conStart'];

/* 원본 헤더가 판마다 조금씩 달라서 정확히 못 박지 않고 후보어로 느슨하게 잡는다.
   맨 앞 후보가 우선. 매핑 결과는 실행할 때마다 리포트로 찍어 눈으로 확인한다. */
const HINTS = {
  gu:        ['시군명','시군','시·군','지자체'],
  nm:        ['정비구역명','구역명','사업장명','정비사업명'],
  addr:      ['위치','소재지','대표지번','주소'],
  type:      ['사업구분','사업유형','정비사업종류','유형'],
  stage:     ['현추진상황','추진단계','진행단계','추진상황','단계'],
  exist:     ['기존세대수','기존 세대수','기존주택세대수'],
  tot:       ['계획세대수','건립세대수','총세대수','계획 세대수'],
  sale:      ['분양세대수','일반분양'],
  rent:      ['임대세대수','임대'],
  zoneLast:  ['정비구역지정','구역지정일','정비구역지정일','구역지정'],
  promo:     ['추진위원회승인','추진위승인','추진위원회'],
  assoc:     ['조합설립인가','조합설립'],
  arch:      ['건축심의'],
  impLast:   ['사업시행인가','사업시행계획인가','사업시행'],
  mgmtLast:  ['관리처분인가','관리처분계획인가','관리처분'],
  migStart:  ['이주','이주개시','이주시작'],
  conStart:  ['착공'],
};

const STAGES = ['준공','착공','이주','관리처분','사업시행','건축심의','조합설립','추진위','구역지정'];

/* ── CSV 파서 (따옴표·줄바꿈 포함 셀 처리) ── */
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i+1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim()));
}

/* 공공데이터 CSV는 EUC-KR인 경우가 많다. UTF-8로 읽어 깨지면 CP949로 다시 읽는다. */
function readText(file) {
  const buf = fs.readFileSync(file);
  let s = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  const garbled = (s.match(/�/g) || []).length;
  if (garbled > 5) {
    try { s = new TextDecoder('euc-kr').decode(buf); }
    catch { console.warn('  ⚠ euc-kr 디코딩 불가 — UTF-8 결과를 그대로 씁니다'); }
  }
  return s.replace(/^﻿/, '');
}

const squash = s => String(s || '').replace(/[\s()\[\]·.\-_/]/g, '');

function mapColumns(header) {
  const norm = header.map(squash);
  const map = {}; const report = [];
  for (const [field, hints] of Object.entries(HINTS)) {
    let idx = -1, why = null;
    for (const h of hints) {
      const hh = squash(h);
      idx = norm.findIndex(x => x === hh);            // 완전 일치 우선
      if (idx >= 0) { why = h + ' (일치)'; break; }
      idx = norm.findIndex(x => x.includes(hh));      // 부분 일치
      if (idx >= 0) { why = h + ' (부분)'; break; }
    }
    if (idx >= 0) { map[field] = idx; report.push([field, header[idx], why]); }
    else report.push([field, null, null]);
  }
  return { map, report };
}

/* 날짜 → 'YYMMDD' (스키마가 6자리 문자열을 쓴다) */
function ymd6(v) {
  const s = String(v || '').replace(/[^0-9]/g, '');
  if (s.length >= 8) return s.slice(2, 8);
  if (s.length === 6) return s;
  return '';
}
function normStage(v) {
  const s = String(v || '');
  for (const k of STAGES) if (s.includes(k)) return k;
  return s.trim() ? '구역지정' : '';
}
function normType(v) {
  const s = String(v || '');
  if (s.includes('재건축')) return s.includes('단독') ? '단독주택재건축' : '공동주택재건축';
  if (s.includes('재개발')) return s.includes('도시') ? '도시정비형재개발' : '주택정비형재개발';
  if (s.includes('주거환경')) return '주거환경개선';
  return s.trim() || '정비사업';
}
const txt = v => String(v ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const num = v => { const n = parseInt(String(v ?? '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0; };

function main() {
  const src = process.argv[2];
  if (!src) { console.error('사용법: node tools/redev-gyeonggi.mjs <경기도_정비사업.csv>'); process.exit(1); }

  const rows = parseCsv(readText(src));
  if (rows.length < 2) { console.error('행이 없습니다.'); process.exit(1); }

  /* 안내문이 1행에 온다. xlsx→CSV로 뽑으면 그 행도 빈 셀로 패딩돼 길이가 같아지므로
     '칸 수'가 아니라 '값이 든 칸 수'로 헤더를 골라야 한다. */
  const filled = r => r.filter(v => String(v).trim()).length;
  let hi = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) if (filled(rows[i]) > filled(rows[hi])) hi = i;
  const header = rows[hi].map(txt);
  const { map, report } = mapColumns(header);

  console.log(`\n원본 ${src}`);
  console.log(`  행 ${rows.length - hi - 1}개 · 열 ${header.length}개 (헤더 = ${hi + 1}행)\n`);
  console.log('컬럼 매핑');
  for (const [field, col, why] of report) {
    console.log(col ? `   ✅ ${field.padEnd(9)} ← ${col}   ${why}` : `   ⬜ ${field.padEnd(9)} (없음)`);
  }
  const unused = header.filter((h, i) => !Object.values(map).includes(i) && h);
  if (unused.length) console.log(`\n안 쓴 컬럼: ${unused.join(' · ')}`);

  const need = ['gu', 'nm', 'stage'];
  const missing = need.filter(f => map[f] == null);
  if (missing.length) {
    console.error(`\n❌ 필수 컬럼을 못 찾았습니다: ${missing.join(', ')}`);
    console.error('   HINTS에 실제 헤더 이름을 추가한 뒤 다시 실행하세요.');
    process.exit(1);
  }

  const DATE_FIELDS = new Set(['zoneInit','zoneLast','promo','assoc','arch','impInit','impLast','mgmtInit','mgmtLast','migStart','migEnd','conStart']);
  const NUM_FIELDS = new Set(['exist','tot','sale','rent']);
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = f => (map[f] == null ? '' : r[map[f]]);
    if (!txt(get('nm'))) continue;
    out.push(FIELDS.map(f => {
      if (f === 'type') return normType(get('type'));
      if (f === 'stage') return normStage(get('stage'));
      if (f === 'pub') return '민간';
      if (f === 'pro') return '일반';
      if (DATE_FIELDS.has(f)) return ymd6(get(f));
      if (NUM_FIELDS.has(f)) return num(get(f));
      return txt(get(f));
    }));
  }

  const stageCount = {};
  for (const r of out) stageCount[r[FIELDS.indexOf('stage')]] = (stageCount[r[FIELDS.indexOf('stage')]] || 0) + 1;
  const guCount = new Set(out.map(r => r[0])).size;

  const doc = {
    source: '경기데이터드림 · 일반 정비사업 추진현황',
    provider: '경기도',
    license: '이용허락범위 제한 없음',
    cycle: '연 1회(수동 변환)',
    fetched: new Date().toISOString().slice(0, 10),
    count: out.length,
    fields: FIELDS,
    rows: out,
  };
  const dest = path.join('data', 'redev-gyeonggi.json');
  fs.writeFileSync(dest, JSON.stringify(doc));
  console.log(`\n✅ ${dest} — ${out.length}개 구역 · ${guCount}개 시군`);
  console.log('   단계 분포:', Object.entries(stageCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));

  /* 지도가 redev-index.json의 file/count를 읽는다. 데이터를 만들었으면 같이 갱신해야
     "통합 작업 중"으로 남아 화면에서 빠지는 일이 없다. */
  const idxPath = path.join('data', 'redev-index.json');
  if (fs.existsSync(idxPath)) {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    const gg = (idx.regions || []).find(r => r.short === '경기');
    if (gg) {
      gg.file = '/data/redev-gyeonggi.json';
      gg.count = out.length;
      gg.note = `${guCount}개 시군 · 단계별 인가일 포함 (경기데이터드림 CSV 변환)`;
      idx.updated = doc.fetched;
      fs.writeFileSync(idxPath, JSON.stringify(idx, null, 0));
      console.log(`✅ ${idxPath} — 경기 항목 갱신 (file·count·note)`);
    } else {
      console.warn('⚠ redev-index.json에 경기 항목이 없어 갱신을 건너뜁니다');
    }
  }
}
main();
