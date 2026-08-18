/*
 * 부비 전국 정비사업 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: 지역별 공식 오픈API에서 재개발·재건축 추진현황을 받아
 *          data/redev-<지역>.json 을 갱신하고, data/redev-index.json 의
 *          수록 건수·기준일을 함께 맞춘다. redevelopment-map.html 이 이 파일들을 읽는다.
 *
 * 수록 지역과 출처
 *  - 서울 : 서울열린데이터광장 「서울특별시 도시정비사업 통계」
 *           OA-22856 / TbSeoulRedevStatus · 공공누리 1유형 · 분기 갱신
 *  - 부산 : 공공데이터포털 「부산광역시_정비사업 정보」
 *           3069406 / MaintenanceBusinessStatus1 · 이용허락범위 제한 없음
 *  - 인천 : 공공데이터포털 「인천광역시_도시 및 주거환경 정비사업 추진현황」
 *           15055212 파일데이터 자동변환 API(odcloud) · 이용허락범위 제한 없음 · 월간 갱신
 *
 * 환경변수(GitHub Secrets)
 *   SEOUL_OPENAPI_KEY : 서울열린데이터광장 인증키   → 없으면 서울만 건너뜀
 *   DATA_GO_KR_KEY    : 공공데이터포털 일반 인증키   → 없으면 부산·인천만 건너뜀
 *                       (Decoding 키를 넣어주세요. Encoding 키를 넣어도 자동 보정합니다)
 *
 * 설계 원칙
 *   - 한 지역이 실패해도 나머지는 계속 간다. 실패한 지역은 기존 파일을 그대로 둔다.
 *   - 내용이 그대로면 파일을 건드리지 않는다(불필요한 커밋 방지).
 *   - 지역마다 항목이 다르므로 공통 항목 + 지역별 추가 항목 구조로 저장한다.
 *
 * 실행: node collect-redev.mjs
 * ------------------------------------------------------------
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const DATA_DIR = "data";
const INDEX = `${DATA_DIR}/redev-index.json`;
const UA = "boobi-redev-collector/2.0";

/* 페이지(redevelopment-map.html)가 아는 공통 항목 — 순서 고정 */
const BASE_FIELDS = [
  "gu", "nm", "addr", "pub", "pro", "type", "stage",
  "exist", "tot", "sale", "rent",
  "zoneInit", "zoneLast", "promo", "assoc", "arch",
  "impInit", "impLast", "mgmtInit", "mgmtLast",
  "migStart", "migEnd", "conStart",
];

/* ───────── 공통 유틸 ───────── */
const txt = (v) => (v == null ? "" : String(v).replace(/\|/g, "/").replace(/\s+/g, " ").trim());
const int = (v) => {
  const s = String(v ?? "").replace(/[^0-9-]/g, "");
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};
const dec = (v) => {
  const s = String(v ?? "").replace(/[^0-9.]/g, "");
  if (s === "" || s === ".") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
};
/* 날짜 → YYMMDD (파일 크기 절감, 페이지에서 되돌려 표시). 숫자 8자리가 아니면 원문 유지 */
function shortDate(v) {
  if (v == null) return "";
  const s = String(v).trim().replace(/[-.\/]/g, "");
  return /^\d{8}$/.test(s) ? s.slice(2) : String(v).trim();
}
function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
/* Encoding 키(%2B 등)가 들어와도 동작하도록 한 번 디코드해 둔다 */
function normalizeKey(k) {
  if (!k) return k;
  try { return /%[0-9A-Fa-f]{2}/.test(k) ? decodeURIComponent(k) : k; } catch { return k; }
}
async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${body.slice(0, 160)}`);
  try { return JSON.parse(body); }
  catch { throw new Error(`JSON 아님 — ${body.slice(0, 160)}`); }
}
/* 컬럼명이 지자체마다 미묘하게 달라서(공백·괄호) 느슨하게 찾는다 */
function loose(row, ...cands) {
  const keys = Object.keys(row);
  for (const c of cands) {
    const want = c.replace(/\s/g, "");
    const hit = keys.find((k) => k.replace(/\s/g, "") === want);
    if (hit) return row[hit];
  }
  for (const c of cands) {
    const want = c.replace(/\s/g, "");
    const hit = keys.find((k) => k.replace(/\s/g, "").includes(want));
    if (hit) return row[hit];
  }
  return null;
}
/* 지자체마다 제각각인 단계 표기를 페이지의 7단계로 맞춘다 */
const STAGE_ORDER = ["구역지정", "추진위", "조합설립", "건축심의", "사업시행", "관리처분", "착공"];
function normStage(v) {
  const s = txt(v);
  if (!s) return "";
  if (/준공|입주|완료/.test(s)) return "착공";
  if (/착공|이주|철거/.test(s)) return "착공";
  if (/관리처분/.test(s)) return "관리처분";
  if (/사업시행/.test(s)) return "사업시행";
  if (/건축심의|심의/.test(s)) return "건축심의";
  if (/조합설립|조합/.test(s)) return "조합설립";
  if (/추진위|준비위/.test(s)) return "추진위";
  if (/구역\s*지정|정비구역|후보지|예정구역/.test(s)) return "구역지정";
  return s; // 못 맞추면 원문 유지 — 페이지가 그대로 보여준다
}
function normType(v) {
  const s = txt(v);
  if (!s) return "";
  if (/주거환경/.test(s)) return "주거환경개선";
  if (/도시정비형|도시환경/.test(s)) return "도시정비형재개발";
  if (/소규모재건축/.test(s)) return "소규모재건축";
  if (/재건축/.test(s)) return "재건축";
  if (/재개발/.test(s)) return "재개발";
  return s;
}

/* ───────── 서울 ───────── */
const SEOUL_SERVICE = "TbSeoulRedevStatus";
const SEOUL_API_KEYS = [
  "DISTRICT", "ZONE_NM", "JIBUN_ADDR",
  "BIZ_METHOD_PUBLIC_PRIVATE", "BIZ_METHOD_GENERAL_PROMOTED", "BIZ_TYPE", "BIZ_STAGE",
  "EXISTING_HOUSEHOLDS", "TOT_BUILT_HOUSEHOLDS", "SALE_BUILT_HOUSEHOLDS", "RENT_BUILT_HOUSEHOLDS",
  "ZONE_DESIGNATION_INIT_YMD", "ZONE_DESIGNATION_LAST_YMD",
  "PROMOTION_COMMITTEE_YMD", "ASSOCIATION_ESTABLISHMENT_YMD", "ARCHITECTURAL_REVIEW_YMD",
  "BIZ_IMPLEMENTATION_INIT_YMD", "BIZ_IMPLEMENTATION_LAST_YMD",
  "MGMT_DISPOSITION_INIT_YMD", "MGMT_DISPOSITION_LAST_YMD",
  "MIGRATION_START_YMD", "MIGRATION_END_YMD", "CONSTRUCTION_START_YMD",
];
const NUM_IDX = new Set([7, 8, 9, 10]);

async function collectSeoul() {
  const key = normalizeKey(process.env.SEOUL_OPENAPI_KEY);
  if (!key) throw new Error("SEOUL_OPENAPI_KEY 없음");
  const PAGE = 1000;
  const call = async (s, e) => {
    const j = await getJson(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/${SEOUL_SERVICE}/${s}/${e}/`);
    const b = j?.[SEOUL_SERVICE];
    if (!b) throw new Error(`응답 이상 — ${j?.RESULT?.CODE ?? ""} ${j?.RESULT?.MESSAGE ?? ""}`);
    const code = b?.RESULT?.CODE;
    if (code && code !== "INFO-000") throw new Error(`${code} ${b?.RESULT?.MESSAGE ?? ""}`);
    return { total: Number(b.list_total_count) || 0, rows: b.row ?? [] };
  };
  const first = await call(1, PAGE);
  let rows = first.rows.slice();
  for (let s = PAGE + 1; s <= first.total; s += PAGE) {
    rows = rows.concat((await call(s, Math.min(s + PAGE - 1, first.total))).rows);
  }
  if (rows.length < first.total * 0.9) throw new Error(`수집 누락 의심 (${rows.length}/${first.total})`);
  const out = rows.map((r) =>
    SEOUL_API_KEYS.map((k, i) => (NUM_IDX.has(i) ? int(r[k]) : i >= 11 ? shortDate(r[k]) : txt(r[k])))
  );
  return {
    slug: "seoul",
    fields: BASE_FIELDS,
    rows: out,
    meta: {
      source: `서울열린데이터광장 · 서울특별시 도시정비사업 통계 (${SEOUL_SERVICE}, OA-22856)`,
      provider: "서울특별시 주택실 건축기획관 주거정비과",
      license: "공공누리 제1유형(출처표시) — 상업적 이용·변경 가능",
      cycle: "분기",
    },
  };
}

/* ───────── 부산 ───────── */
/* 자치구 항목이 없어서 위치(동)만 제공된다. 구 단위 그룹은 비워 두고 전체 목록으로 보여준다. */
const BUSAN_EXTRA = ["scale", "dong", "builder", "supervisor", "designer", "members", "far", "bcr", "area", "owner", "tel"];

async function collectBusan() {
  const key = normalizeKey(process.env.DATA_GO_KR_KEY);
  if (!key) throw new Error("DATA_GO_KR_KEY 없음");
  const base = "https://apis.data.go.kr/6260000/MaintenanceBusinessStatus1/getMaintenanceBusiness1";
  const call = async (page, rows) => {
    const u = `${base}?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${rows}&resultType=json`;
    const j = await getJson(u);
    const body = j?.getMaintenanceBusiness1 ?? j?.response?.body ?? j;
    const head = body?.header ?? j?.getMaintenanceBusiness1?.header;
    const code = head?.resultCode ?? body?.resultCode;
    if (code && String(code) !== "00" && String(code) !== "INFO-000") {
      throw new Error(`${code} ${head?.resultMsg ?? body?.resultMsg ?? ""}`);
    }
    const item = body?.body?.items?.item ?? body?.item ?? body?.items?.item ?? [];
    const total = Number(body?.body?.totalCount ?? body?.totalCount ?? head?.totalCount ?? 0) || 0;
    return { total, rows: Array.isArray(item) ? item : item ? [item] : [] };
  };
  const first = await call(1, 500);
  let items = first.rows.slice();
  const total = first.total || items.length;
  for (let p = 2; items.length < total && p <= 20; p++) {
    const next = await call(p, 500);
    if (!next.rows.length) break;
    items = items.concat(next.rows);
  }
  if (!items.length) throw new Error("수집된 행이 0건");

  const fields = BASE_FIELDS.concat(BUSAN_EXTRA);
  const out = items.map((r) => {
    const base = [
      "", txt(r.areaName), txt(r.location), "", "",
      normType(r.areaName + " " + (r.step ?? "")), normStage(r.step),
      null, int(r.generationJoo), null, null,
      "", "", "", "", "", "", "", "", "", "", "", "",
    ];
    return base.concat([
      txt(r.scale), int(r.wingNum), txt(r.contractor), txt(r.engineer), txt(r.architect),
      int(r.guildMemNum), dec(r.gage), dec(r.longPyeyul), dec(r.areaUnit),
      txt(r.businessEntities), txt(r.telNo ?? r.phone),
    ]);
  });
  return {
    slug: "busan",
    fields,
    rows: out,
    meta: {
      source: "공공데이터포털 · 부산광역시_정비사업 정보 (MaintenanceBusinessStatus1)",
      provider: "부산광역시 도시정비과",
      license: "이용허락범위 제한 없음",
      cycle: "수시",
    },
  };
}

/* ───────── 인천 ───────── */
const INCHEON_PK = "15055212";
const INCHEON_UDDI = "uddi:f8141fd0-9f4d-4608-b5b4-fea1493a2ca1";

async function collectIncheon() {
  const key = normalizeKey(process.env.DATA_GO_KR_KEY);
  if (!key) throw new Error("DATA_GO_KR_KEY 없음");
  const call = async (page) => {
    const u = `https://api.odcloud.kr/api/${INCHEON_PK}/v1/${INCHEON_UDDI}` +
      `?page=${page}&perPage=500&returnType=JSON&serviceKey=${encodeURIComponent(key)}`;
    const j = await getJson(u);
    return { total: Number(j.totalCount) || 0, rows: j.data ?? [] };
  };
  const first = await call(1);
  let rows = first.rows.slice();
  for (let p = 2; rows.length < first.total && p <= 20; p++) {
    const next = await call(p);
    if (!next.rows.length) break;
    rows = rows.concat(next.rows);
  }
  if (!rows.length) throw new Error("수집된 행이 0건");

  const fields = BASE_FIELDS.concat(["area"]);
  const out = rows.map((r) => {
    const gu = txt(loose(r, "구명", "군구", "자치구"));
    const nm = txt(loose(r, "구역명"));
    const addr = txt(loose(r, "위치", "소재지"));
    const type = normType(loose(r, "사업유형", "유형"));
    const stage = normStage(loose(r, "진행단계", "추진단계", "단계"));
    const area = dec(loose(r, "면적(제곱미터)", "면적", "구역면적"));
    return [
      gu, nm, addr, "", "", type, stage,
      null, null, null, null,
      "", "", "", "", "", "", "", "", "", "", "", "",
      area,
    ];
  });
  return {
    slug: "incheon",
    fields,
    rows: out,
    meta: {
      source: "공공데이터포털 · 인천광역시_도시 및 주거환경 정비사업 추진현황",
      provider: "인천광역시 주거정비과",
      license: "이용허락범위 제한 없음",
      cycle: "월간",
    },
  };
}

/* ───────── 실행 ───────── */
const TASKS = [
  { name: "서울특별시", file: "/data/redev-seoul.json", run: collectSeoul },
  { name: "부산광역시", file: "/data/redev-busan.json", run: collectBusan },
  { name: "인천광역시", file: "/data/redev-incheon.json", run: collectIncheon },
];

async function writeIfChanged(path, doc) {
  let prev = null;
  try { prev = JSON.parse(await readFile(path, "utf8")); } catch { /* 최초 */ }
  if (prev && JSON.stringify(prev.rows) === JSON.stringify(doc.rows) && JSON.stringify(prev.fields) === JSON.stringify(doc.fields)) {
    return false;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(doc), "utf8");
  return true;
}

async function main() {
  const today = todayKST();
  const results = {};
  for (const t of TASKS) {
    try {
      const r = await t.run();
      /* 정렬로 diff 안정화 */
      r.rows.sort((a, b) => (a[0] || "").localeCompare(b[0] || "", "ko") || (a[1] || "").localeCompare(b[1] || "", "ko"));
      const doc = { ...r.meta, fetched: today, count: r.rows.length, fields: r.fields, rows: r.rows };
      const changed = await writeIfChanged(`${DATA_DIR}/redev-${r.slug}.json`, doc);
      results[t.name] = { count: r.rows.length, file: t.file };
      console.log(`[redev] ${t.name} ${r.rows.length}건 ${changed ? "갱신" : "변경 없음"}`);
    } catch (e) {
      console.warn(`[redev] ${t.name} 건너뜀 — ${e.message}`);
    }
  }

  /* 인덱스의 수록 건수·파일 경로 반영 (실패한 지역은 기존 값 유지) */
  try {
    const idx = JSON.parse(await readFile(INDEX, "utf8"));
    let touched = false;
    for (const r of idx.regions) {
      const got = results[r.name];
      if (!got) continue;
      if (r.count !== got.count || r.file !== got.file) {
        r.count = got.count; r.file = got.file; touched = true;
      }
    }
    if (touched || idx.updated !== today) {
      idx.updated = today;
      await writeFile(INDEX, JSON.stringify(idx), "utf8");
      console.log("[redev] 인덱스 갱신");
    }
  } catch (e) {
    console.warn("[redev] 인덱스 갱신 실패 —", e.message);
  }

  if (!Object.keys(results).length) {
    console.error("[redev] 수집된 지역이 하나도 없습니다 (인증키 확인 필요)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[redev] 실패:", e.message);
  process.exit(1);
});
