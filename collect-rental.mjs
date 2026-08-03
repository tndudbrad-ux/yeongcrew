/*
 * 부비 임대공고 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: HUG 든든전세 공식 오픈API(+추후 LH)에서 임대 공고를 받아
 *          rental-data.json 을 갱신한다. 수동으로 넣은 큐레이션 항목은 보존.
 * 환경변수(GitHub Secrets):
 *   HUG_SERVICE_KEY : 주택도시보증공사 든든전세 모집공고 서비스키(필수)
 *   LH_API_KEY      : (선택) data.go.kr LH 분양임대공고문 서비스키
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

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
  try { return JSON.parse(text); } catch { throw new Error("JSON 파싱 실패: " + text.slice(0,200)); }
}

/* ---------- HUG 든든전세 ---------- */
async function fetchHUG(key) {
  if (!key) return [];
  const url = `${HUG_URL}?serviceKey=${encodeURIComponent(key)}&pageNo=1&numOfRows=200`;
  let data;
  try { data = await fetchJSON(url); }
  catch (e) { console.log("[HUG] 요청 실패:", e.message); return []; }

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
      _src: "hug-api", _raw: r
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
async function fetchLH(key) {
  if (!key) return [];
  const base = "https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1";
  // 키가 이미 URL 인코딩(%2F 등)돼 있으면 그대로, 아니면 인코딩
  const sk = /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key);
  const url = `${base}?serviceKey=${sk}&PG_SZ=100&PAGE=1`;
  let data;
  try { data = await fetchJSON(url); }
  catch (e) { console.log("[LH] 요청 실패:", e.message); return []; }
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
    return { id, provider: "LH", ltype,
      name: name || ("LH 임대공고 " + (i+1)), region, units: toNum(pick(r,["SUPLY_HSHLDCO","공급호수"])),
      target: "무주택 등 · 자격은 공고문 확인", rcritStart: start, rcritEnd: end, winnerDate: win, url: url2,
      note: null, _src: "lh-api", _raw: r };
  })
  // 안전장치: 이름과 (마감 or 발표) 날짜가 있는 유효 공고만 (매핑 오류 시 화면에 안 뜨게)
  .filter(it => it.name && (it.rcritEnd || it.winnerDate));
  console.log("[LH] 유효 공고 " + out.length + "건 채택");
  return out;
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
  const manual = (cur.items || []).filter(it => it._src !== "hug-api" && it._src !== "lh-api");

  const hug = await fetchHUG(process.env.HUG_SERVICE_KEY);
  const lh  = await fetchLH(process.env.LH_API_KEY);

  // 자동 수집분 + 수동 큐레이션분 합치고 중복(id) 제거
  const byId = new Map();
  for (const it of [...manual, ...hug, ...lh]) byId.set(it.id, it);
  const items = [...byId.values()].sort((a,b) => (a.rcritEnd||"9999").localeCompare(b.rcritEnd||"9999"));

  const out = {
    updatedAt: new Date().toISOString(),
    source: "collect-rental.mjs (HUG 든든전세 공식 API + 수동 큐레이션)",
    count: items.length,
    schema: cur.schema || DEFAULT_SCHEMA,
    items
  };
  await writeFile(FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`완료: 총 ${items.length}건 (자동 ${hug.length+lh.length} / 수동 ${manual.length})`);
}

main().catch(e => { console.error("수집 실패:", e); process.exit(1); });
