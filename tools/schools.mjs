#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════════
   학교알리미 OpenAPI → data/schools/{시군구코드}.json
   ────────────────────────────────────────────────────────────────────────
   학교 기본정보에 좌표(LTTUD/LGTUD)와 고교유형(HS_KND_SC_NM)이 들어 있어서
   학교 위치 표준데이터를 따로 받을 필요가 없다. 단지 좌표만 있으면
   초품아(가장 가까운 초등학교 거리)·특목고 근접·학원가를 바로 잴 수 있다.

   API 메모 (2026-08 확인)
     URL      https://www.schoolinfo.go.kr/openApi.do
     파라미터  apiKey · apiType=0 · sidoCode · sggCode(필수) · schulKndCode(02초 03중 04고)
     응답     { resultCode, resultMsg, list:[...] }  JSON
     코드     sggCode는 행정표준코드 5자리 — data/regions.json과 같은 체계
     제한     요청횟수 제한 없음. 2026년부터 sggCode 없이 시도 전체 조회는 거부됨
     주의     진로 현황(특목고 진학 등)은 이 API에 없다. 학교 목록·좌표·유형까지만.

   쓰는 법
     SCHOOLINFO_KEY=xxx node tools/schools.mjs fetch            # 전국
     SCHOOLINFO_KEY=xxx node tools/schools.mjs fetch 서울특별시 경기도
     node tools/schools.mjs split schools-capital.json         # 브라우저로 긁은 묶음을 쪼갬

   인증키는 저장소에 절대 넣지 않는다 (공개 저장소).
   ══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join('data', 'schools');
const SIDO_CODE = {
  '서울특별시': '11', '부산광역시': '26', '대구광역시': '27', '인천광역시': '28',
  '전남광주통합특별시': '12', '대전광역시': '30', '울산광역시': '31', '세종특별자치시': '36',
  '경기도': '41', '강원특별자치도': '51', '충청북도': '43', '충청남도': '44',
  '전북특별자치도': '52', '경상북도': '47', '경상남도': '48', '제주특별자치도': '50',
};
const KIND = { '02': 'e', '03': 'm', '04': 'h' };
const TYPE = { '일반고등학교': 'g', '자율고등학교': 'a', '특수목적고등학교': 's', '특성화고등학교': 'v' };
const FIELDS = { c: '학교코드', n: '학교명', k: '학교급(e초 m중 h고)', t: '고교유형(g일반 a자율 s특목 v특성화)', p: '1=사립', x: '1=폐교예정', lat: '위도', lng: '경도' };

function compact(o, kind) {
  const rec = { c: o.SCHUL_CODE, n: o.SCHUL_NM, k: KIND[kind], lat: +(+o.LTTUD).toFixed(6), lng: +(+o.LGTUD).toFixed(6) };
  if (kind === '04' && o.HS_KND_SC_NM) rec.t = TYPE[o.HS_KND_SC_NM] || o.HS_KND_SC_NM;
  if (o.FOND_SC_CODE === '사립') rec.p = 1;
  if (o.ABSCH_YN === 'Y') rec.x = 1;
  return rec;
}

function writeSgg(code, arr, fetched, source) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const by = { e: 0, m: 0, h: 0 };
  for (const s of arr) by[s.k] = (by[s.k] || 0) + 1;
  fs.writeFileSync(path.join(OUT_DIR, code + '.json'),
    JSON.stringify({ code, fetched, source, fields: FIELDS, count: arr.length, by, list: arr }));
  return by;
}

async function cmdFetch(sidos) {
  const key = process.env.SCHOOLINFO_KEY;
  if (!key) { console.error('SCHOOLINFO_KEY 환경변수가 없습니다.'); process.exit(1); }
  const regions = JSON.parse(fs.readFileSync(path.join('data', 'regions.json'), 'utf8'));
  const targets = sidos.length ? sidos : Object.keys(regions);
  const fetched = new Date().toISOString().slice(0, 10);
  let total = 0; const fails = [];
  for (const sido of targets) {
    const sc = SIDO_CODE[sido];
    if (!sc || !regions[sido]) { console.warn('건너뜀(시도코드 없음):', sido); continue; }
    let n = 0;
    for (const g of regions[sido]) {
      const arr = [];
      for (const k of ['02', '03', '04']) {
        const url = `https://www.schoolinfo.go.kr/openApi.do?apiKey=${key}&apiType=0&sidoCode=${sc}&sggCode=${g.code}&schulKndCode=${k}`;
        try {
          const j = await (await fetch(url)).json();
          if (j.resultCode !== 'success') { fails.push(`${g.code}/${k}: ${j.resultMsg}`); continue; }
          for (const o of j.list || []) if (o.CLOSE_YN !== 'Y') arr.push(compact(o, k));
        } catch (e) { fails.push(`${g.code}/${k}: ${e.message}`); }
        await new Promise(r => setTimeout(r, 60));
      }
      writeSgg(g.code, arr, fetched, '학교알리미 OpenAPI');
      n += arr.length;
    }
    console.log(`${sido.padEnd(10)} ${regions[sido].length}개 시군구 · ${n.toLocaleString()}개교`);
    total += n;
  }
  console.log(`\n합계 ${total.toLocaleString()}개교 · 실패 ${fails.length}건`);
  fails.slice(0, 10).forEach(f => console.log('   ', f));
}

function cmdSplit(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const by = doc.bySgg || doc;
  let total = 0; const rows = [];
  for (const [code, arr] of Object.entries(by)) {
    const b = writeSgg(code, arr, doc.fetched || new Date().toISOString().slice(0, 10), doc.source || '학교알리미 OpenAPI');
    total += arr.length; rows.push([code, arr.length, b]);
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`${rows.length}개 시군구 · ${total.toLocaleString()}개교 → ${OUT_DIR}/`);
  for (const [c, n, b] of rows.slice(0, 6)) console.log(`   ${c}  ${String(n).padStart(4)}교  초${b.e} 중${b.m} 고${b.h}`);
  if (rows.length > 6) console.log('   …');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'fetch') cmdFetch(rest).catch(e => { console.error(e); process.exit(1); });
else if (cmd === 'split' && rest[0]) cmdSplit(rest[0]);
else { console.error('사용법:\n  SCHOOLINFO_KEY=xxx node tools/schools.mjs fetch [시도명...]\n  node tools/schools.mjs split <묶음.json>'); process.exit(1); }
