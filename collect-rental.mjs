/*
 * 부비 임대공고 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: HUG 든든전세·LH 공식 오픈API에서 임대 공고를 받아
 *          rental-data.json 을 갱신한다. 수동으로 넣은 큐레이션 항목은 보존.
 *          LH는 "임대주택 계열"만 채택(토지·상가·분양·공공분양·취소공고 제외),
 *          접수 마감(rcritEnd)이 지난 공고는 전 소스 공통으로 제외, _raw 미저장(슬림화).
 * 환경변수(GitHub Secrets):
 *   HUG_SERVICE_KEY : 주택도시보증공사 든든전세 모집공고 서비스키(필수)
 *   LH_API_KEY      : (선택) data.go.kr LH 분양임대공고문 서비스키
 *   SH_API_KEY      : (준비) 서울열린데이터광장(data.seoul.go.kr) 키 — 아래 fetchSH 참고
 * 실행: node collect-rental.mjs   → rental-data.json 을 제자리 갱신
 * ------------------------------------------------------------
 */
import { readFile, writeFile } from "node:fs/promises";

const FILE = "rental-data.json";
const UA = "boobi-rental-collector/1.0";
const HUG_URL = "https://www.khug.or.kr/SelectListInfo.do";

/* 여러 후보 키 중 처음 존재하는 값을 꺼낸다(응답 필드명 방어) */
function pick(o, keys) {
  for (const k of keys) {
    if (o && o[k] != null && String(o[k]).trim() !== "") return String(o[k]).trim();
  }
  return null;
}
/* 다양한 날짜 표기 → YYYY-MM-DD */
function toDate(v) {
  if (!v) return null;
  const s = String(v).replace(/[.\/]/g, "-").replace(/\s/g, "").replace(/-+$/,"");
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  const m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}
function toNum(v) { if (v == null) return null; const n = parseInt(String(v).replace(/[^0-9]/g,""),10); return isNaN(n)?null:n; }
/* KST 기준 오늘 YYYY-MM-DD */
function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
  try { return JSON.parse(text); } catch { throw new Error("JSON 파싱 실패: " + text.slice(0,200)); }
}

/* ---------- HUG 든든전세 ---------- */
async function fetchHUG(key) {
  if (!key) { console.log("[HUG] 키 없음 → 이전 수집분 유지"); return null; } // null = 이전 데이터 유지
  const url = `${HUG_URL}?serviceKey=${encodeURIComponent(key)}&pageNo=1&numOfRows=200`;
  let data;
  try { data = await fetchJSON(url); }
  catch (e) { console.log("[HUG] 요청 실패:", e.message); return null; } // null = 실패(이전 데이터 유지)

  const rows = Array.isArray(data) ? data : (data.items || data.data || []);
  // 모집 없음 신호: [] 또는 [{ERROR_CODE:"03"...}]
  if (!rows.length || (rows[0] && (rows[0].ERROR_CODE || rows[0].errorCode))) {
    console.log("[HUG] 현재 표출 중인 든든전세 공고 없음(NO_DATA).");
    return [];
  }
  console.log(`[HUG] ${rows.length}건 수신`);
  return rows.map((r, i) => {
    const name = pick(r, ["공고명","pblancNm","noticeNm","title","bsnsNm","PBLANC_NM"]) || `HUG 든든전세 공고 ${i+1}`;
    const start = toDate(pick(r, ["접수시작일","접수시작","rceptBgnde","reqStartDt","START_DT","접수기간시작"]));
    const end   = toDate(pick(r, ["접수마감일","접수종료","rceptEndde","reqEndDt","END_DT","접수기간종료"]));
    const win   = toDate(pick(r, ["당첨자발표일","발표일","przwnerPresnatnDe","WINNER_DT"]));
    const url2  = pick(r, ["공고url","상세url","noticeUrl","detailUrl","link","URL"]) || "https://www.khug.or.kr/jeonse/web/s07/s070301.jsp";
    const region= pick(r, ["지역","공급지역","areaNm","REGION","시도"]) || "전국";
    const units = toNum(pick(r, ["공급호수","세대수","공급세대","suplyHshldco","UNITS"]));
    const id    = "HUG-donden-" + (pick(r,["공고번호","pblancNo","noticeNo","seq","ID"]) || (start||"") + "-" + i);
    return {
      id, provider: "HUG", ltype: "든든전세", name, region, units,
      target: "무주택자 · HUG 매입주택을 전세로 재임대",
      rcritStart: start, rcritEnd: end, winnerDate: win, url: url2,
      note: pick(r, ["비고","note","rem"]) || null,
      _src: "hug-api"
    };
  });
}

/* ---------- (선택) LH 분양임대공고문 ---------- */
function lhRows(data) {
  if (Array.isArray(data)) {
    for (const el of data) { if (el && Array.isArray(el.dsList)) return el.dsList; }
    if (data.length && typeof data[0] === "object" && !("resHeader" in data[0])) return data;
    return [];
  }
  if (data && Array.isArray(data.dsList)) return data.dsList;
  if (data && data.response && data.response.body) {
    const it = data.response.body.items;
    if (Array.isArray(it)) return it;
    if (it && it.item) return Array.isArray(it.item) ? it.item : [it.item];
  }
  return [];
}
/* LH 공고 중 "임대주택 계열"만 채택하기 위한 판별.
 * ltype(AIS_TP_CD_NM) 예: 매입임대/행복주택/영구임대/국민임대/공공임대/통합공공임대/행복주택(신혼희망) → 채택
 *                        토지/임대상가(추첨)/분양주택/공공분양(신혼희망)/분양ㆍ(구)임대상가(입찰) → 제외 */
function isLhRental(it, raw) {
  if (/취소|취하/.test(it.name || "")) return false;                       // 취소·취하 공고 제외
  if (/운영기관|운영\s*기관|사업자\s*모집|위탁/.test(it.name || "")) return false; // 개인 입주자용이 아닌 공고 제외
  if (/토지|상가|분양주택|공공분양|매각/.test(it.ltype || "")) return false; // 비주거·분양 제외
  if (/임대|행복주택|전세|주거복지/.test(it.ltype || "")) return true;       // 임대주택 계열 채택
  const upp = String((raw && raw.UPP_AIS_TP_NM) || "");                    // 상위유형으로 한 번 더 방어
  return upp === "임대주택" || upp === "주거복지";
}
async function fetchLH(key) {
  if (!key) { console.log("[LH] 키 없음 → 이전 수집분 유지"); return null; } // null = 이전 데이터 유지
  const base = "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
  // 키가 이미 URL 인코딩(%2F 등)돼 있으면 그대로, 아니면 인코딩
  const sk = /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key);
  const url = `${base}?serviceKey=${sk}&PG_SZ=100&PAGE=1`;
  let data;
  try { data = await fetchJSON(url); }
  catch (e) { console.log("[LH] 요청 실패:", e.message); return null; } // null = 실패(이전 데이터 유지)
  const rows = lhRows(data);
  if (!rows.length) { console.log("[LH] 표출 공고 없음 또는 응답 구조 상이:", JSON.stringify(data).slice(0,300)); return []; }
  console.log("[LH] " + rows.length + "건 수신. 첫 행 필드확인:", JSON.stringify(rows[0]).slice(0,500));
  const out = rows.map((r, i) => {
    const name = pick(r, ["PAN_NM","공고명","panNm","noticeNm","BLK_NM","PAN_NM_NM"]);
    const region = pick(r, ["CNP_CD_NM","AREA_NM","지역","cnpCdNm","시도"]) || "전국";
    const ltype = pick(r, ["AIS_TP_CD_NM","UPP_AIS_TP_NM","임대유형","aisTpNm"]) || "임대";
    const start = toDate(pick(r, ["SUBSCRPT_RCEPT_BGNDE","RCRIT_PBLANC_DE","접수시작","rceptBgnde","CLSG_BGNDE"]));
    const end   = toDate(pick(r, ["SUBSCRPT_RCEPT_ENDDE","CLSG_DT","접수마감","rceptEndde","CLSG_ENDDE"]));
    const win   = toDate(pick(r, ["PRZWNER_PRESNATN_DE","당첨자발표","przwnerPresnatnDe","WINNER_DE"]));
    const url2  = pick(r, ["DTL_URL","상세URL","dtlUrl","PAN_URL"]) || "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancList.do?mi=1026";
    const id    = "LH-" + (pick(r, ["PAN_ID","panId","공고번호","PBLANC_NO"]) || ((start||"") + "-" + i));
    return { it: { id, provider: "LH", ltype,
      name: name || ("LH 임대공고 " + (i+1)), region, units: toNum(pick(r,["SUPLY_HSHLDCO","공급호수"])),
      target: "무주택 등 · 자격은 공고문 확인", rcritStart: start, rcritEnd: end, winnerDate: win, url: url2,
      note: null, _src: "lh-api" }, raw: r };
  })
  // 안전장치: 이름과 (마감 or 발표) 날짜가 있는 유효 공고만 (매핑 오류 시 화면에 안 뜨게)
  .filter(x => x.it.name && (x.it.rcritEnd || x.it.winnerDate))
  // 임대주택 계열만 + 접수 마감 지난 공고 제외
  .filter(x => isLhRental(x.it, x.raw))
  .filter(x => !x.it.rcritEnd || x.it.rcritEnd >= todayKST())
  .map(x => x.it);
  console.log("[LH] 임대주택 유효 공고 " + out.length + "건 채택 (토지·상가·분양·취소·마감 제외)");
  return out;
}

/* ---------- (준비) SH 서울주택도시공사 ----------
 * data.go.kr에는 SH 실시간 모집공고 API가 없고, i-sh.co.kr은 서버 환경에 따라 차단(HTTP 000)된다.
 * 당분간 rental-data.json의 수동 큐레이션(provider:"SH", _src:"manual-*") 항목으로 노출하고,
 * 서울열린데이터광장(data.seoul.go.kr) 키(SH_API_KEY)를 확보하면 여기서 자동화한다. */
async function fetchSH(key) {
  if (!key) return [];
  try {
    // TODO: 서울열린데이터광장에서 SH 모집공고 데이터셋 확정 후 구현
    // 예: http://openapi.seoul.go.kr:8088/{key}/json/{SERVICE}/1/100/
    console.log("[SH] SH_API_KEY 감지 — 데이터셋 미확정으로 아직 수집하지 않음(수동 큐레이션 유지)");
    return [];
  } catch (e) { console.log("[SH] 요청 실패:", e.message); return []; }
}

const DEFAULT_SCHEMA = {
  id: "고유 id (provider+식별자)",
  provider: "HUG | LH | SH | GH | BMC | ETC",
  ltype: "든든전세 | 행복주택 | 청년매입임대 | 전세임대 | 청년안심주택 | 국민임대 | 기타",
  name: "공고명", region: "지역", units: "공급 호수(숫자, 미상 null)",
  target: "대상 요약", rcritStart: "접수 시작 YYYY-MM-DD", rcritEnd: "접수 마감 YYYY-MM-DD",
  winnerDate: "당첨자 발표 YYYY-MM-DD", url: "공식 링크", note: "비고(선택)"
};

async function main() {
  let cur;
  try { cur = JSON.parse(await readFile(FILE, "utf8")); }
  catch { console.log("rental-data.json 없음 → 새로 생성"); cur = { items: [], schema: DEFAULT_SCHEMA }; }
  const prev   = cur.items || [];
  const manual = prev.filter(it => it._src !== "hug-api" && it._src !== "lh-api");
  const prevHug = prev.filter(it => it._src === "hug-api");
  const prevLh  = prev.filter(it => it._src === "lh-api");

  // fetch 실패(null)면 이전 수집분을 유지(어차피 아래 공통 필터로 마감건은 걸러짐)
  const hug = (await fetchHUG(process.env.HUG_SERVICE_KEY)) ?? prevHug;
  const lh  = (await fetchLH(process.env.LH_API_KEY)) ?? prevLh;
  const sh  = (await fetchSH(process.env.SH_API_KEY)) ?? [];

  // 자동 수집분 + 수동 큐레이션분 합치고 중복(id) 제거
  const byId = new Map();
  for (const it of [...manual, ...hug, ...lh, ...sh]) byId.set(it.id, it);
  const today = todayKST();
  const items = [...byId.values()]
    // 전역 공통: 접수 마감이 지난 공고 제외(마감일 없는 상시 공고는 유지) + _raw 제거(슬림화)
    .filter(it => !it.rcritEnd || it.rcritEnd >= today)
    .map(({ _raw, ...it }) => it)
    .sort((a,b) => (a.rcritEnd||"9999").localeCompare(b.rcritEnd||"9999"));

  const out = {
    updatedAt: new Date().toISOString(),
    source: "collect-rental.mjs (HUG 든든전세·LH 공식 API + SH 등 수동 큐레이션)",
    count: items.length,
    schema: cur.schema || DEFAULT_SCHEMA,
    items
  };
  await writeFile(FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`완료: 총 ${items.length}건 (HUG ${hug.length} / LH ${lh.length} / SH ${sh.length} / 수동 ${manual.length})`);
}

main().catch(e => { console.error("수집 실패:", e); process.exit(1); });
