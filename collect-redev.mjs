/*
 * 부비 서울 정비사업 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: 서울열린데이터광장 오픈API "서울특별시 도시정비사업 통계"에서
 *          서울 전역 정비사업(재개발·재건축) 추진현황을 받아
 *          data/redev-seoul.json 을 갱신한다. redevelopment-map.html 이 이 파일을 읽는다.
 *
 * 데이터셋 : OA-22856 / 서비스명 TbSeoulRedevStatus
 *            제공: 서울특별시 주택실 건축기획관 주거정비과 · 갱신주기 분기
 *            라이선스: 공공누리 제1유형(출처표시) — 상업적 이용·변경 가능
 * 엔드포인트: http://openapi.seoul.go.kr:8088/{KEY}/json/TbSeoulRedevStatus/{start}/{end}/
 *
 * 환경변수(GitHub Secrets):
 *   SEOUL_OPENAPI_KEY : 서울열린데이터광장 인증키 (필수)
 *                       발급: https://data.seoul.go.kr → 나의화면 → 인증키 신청 (무료)
 *
 * 실행: node collect-redev.mjs   → data/redev-seoul.json 제자리 갱신
 *       (변경 없으면 파일을 건드리지 않아 불필요한 커밋이 생기지 않는다)
 * ------------------------------------------------------------
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const OUT = "data/redev-seoul.json";
const SERVICE = "TbSeoulRedevStatus";
const PAGE = 1000; // 서울 오픈API 1회 최대 건수
const HOST = "http://openapi.seoul.go.kr:8088";

/* 저장 순서 — 페이지(redevelopment-map.html)의 FIELDS와 반드시 일치해야 한다 */
const FIELDS = [
  "gu", "nm", "addr", "pub", "pro", "type", "stage",
  "exist", "tot", "sale", "rent",
  "zoneInit", "zoneLast", "promo", "assoc", "arch",
  "impInit", "impLast", "mgmtInit", "mgmtLast",
  "migStart", "migEnd", "conStart",
];

/* API 응답 필드 → 저장 순서 매핑 */
const API_KEYS = [
  "DISTRICT", "ZONE_NM", "JIBUN_ADDR",
  "BIZ_METHOD_PUBLIC_PRIVATE", "BIZ_METHOD_GENERAL_PROMOTED", "BIZ_TYPE", "BIZ_STAGE",
  "EXISTING_HOUSEHOLDS", "TOT_BUILT_HOUSEHOLDS", "SALE_BUILT_HOUSEHOLDS", "RENT_BUILT_HOUSEHOLDS",
  "ZONE_DESIGNATION_INIT_YMD", "ZONE_DESIGNATION_LAST_YMD",
  "PROMOTION_COMMITTEE_YMD", "ASSOCIATION_ESTABLISHMENT_YMD", "ARCHITECTURAL_REVIEW_YMD",
  "BIZ_IMPLEMENTATION_INIT_YMD", "BIZ_IMPLEMENTATION_LAST_YMD",
  "MGMT_DISPOSITION_INIT_YMD", "MGMT_DISPOSITION_LAST_YMD",
  "MIGRATION_START_YMD", "MIGRATION_END_YMD", "CONSTRUCTION_START_YMD",
];

/* 숫자로 저장할 열(기존/건립 세대수) */
const NUM_IDX = new Set([7, 8, 9, 10]);

/* 날짜 YYYY-MM-DD / YYYYMMDD → YYMMDD (파일 크기 절감, 페이지에서 되돌려 표시) */
function shortDate(v) {
  if (v == null) return "";
  const s = String(v).trim().replace(/[-.\/]/g, "");
  if (/^\d{8}$/.test(s)) return s.slice(2);
  return String(v).trim(); // '이주중' 같은 예외 표기는 그대로 둔다
}
function clean(v) {
  if (v == null) return "";
  return String(v).replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}
function toNum(v) {
  const s = String(v ?? "").replace(/[^0-9-]/g, "");
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}
function todayKST() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

async function fetchPage(key, start, end) {
  const url = `${HOST}/${encodeURIComponent(key)}/json/${SERVICE}/${start}/${end}/`;
  const res = await fetch(url, { headers: { "User-Agent": "boobi-redev-collector/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${start}~${end})`);
  const json = await res.json();
  const body = json?.[SERVICE];
  if (!body) {
    /* 인증키 오류 등은 최상위 RESULT 로 온다 */
    const r = json?.RESULT;
    throw new Error(`응답에 ${SERVICE} 없음 — ${r?.CODE ?? "?"} ${r?.MESSAGE ?? JSON.stringify(json).slice(0, 200)}`);
  }
  const code = body?.RESULT?.CODE;
  if (code && code !== "INFO-000") throw new Error(`API ${code} ${body?.RESULT?.MESSAGE ?? ""}`);
  return { total: Number(body.list_total_count) || 0, rows: body.row ?? [] };
}

async function main() {
  const key = process.env.SEOUL_OPENAPI_KEY;
  if (!key) {
    console.error("[redev] SEOUL_OPENAPI_KEY 없음 — 수집을 건너뜁니다 (기존 파일 유지)");
    process.exit(0);
  }

  const first = await fetchPage(key, 1, PAGE);
  let rows = first.rows.slice();
  const total = first.total;
  for (let s = PAGE + 1; s <= total; s += PAGE) {
    const p = await fetchPage(key, s, Math.min(s + PAGE - 1, total));
    rows = rows.concat(p.rows);
  }
  if (!rows.length) throw new Error("수집된 행이 0건 — 기존 파일을 덮어쓰지 않습니다");
  if (rows.length < total * 0.9) throw new Error(`수집 누락 의심 (${rows.length}/${total})`);

  const out = rows.map((r) =>
    API_KEYS.map((k, i) => {
      if (NUM_IDX.has(i)) return toNum(r[k]);
      if (i >= 11) return shortDate(r[k]);
      return clean(r[k]);
    })
  );
  /* 자치구 → 구역명 순 정렬로 diff 를 안정화한다 */
  out.sort((a, b) => (a[0] || "").localeCompare(b[0] || "", "ko") || (a[1] || "").localeCompare(b[1] || "", "ko"));

  const doc = {
    source: `서울열린데이터광장 · 서울특별시 도시정비사업 통계 (${SERVICE}, OA-22856)`,
    provider: "서울특별시 주택실 건축기획관 주거정비과",
    license: "공공누리 제1유형(출처표시) — 상업적 이용·변경 가능",
    cycle: "분기",
    fetched: todayKST(),
    count: out.length,
    fields: FIELDS,
    rows: out,
  };

  /* fetched(수집일)만 바뀐 경우엔 커밋하지 않는다 */
  let prev = null;
  try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch { /* 최초 실행 */ }
  if (prev && JSON.stringify(prev.rows) === JSON.stringify(doc.rows)) {
    console.log(`[redev] 변경 없음 (${out.length}건) — 파일 유지`);
    return;
  }

  await mkdir("data", { recursive: true });
  await writeFile(OUT, JSON.stringify(doc), "utf8");
  console.log(`[redev] 갱신 완료 — ${out.length}건 (이전 ${prev?.count ?? 0}건)`);
}

main().catch((e) => {
  console.error("[redev] 실패:", e.message);
  process.exit(1);
});
