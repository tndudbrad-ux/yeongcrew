/*
 * 부비 임대공고 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: HUG 든든전세·LH 공식 오픈API + SH 공고 게시판에서 임대 공고를 받아
 *          rental-data.json 을 갱신한다. 수동으로 넣은 큐레이션 항목은 보존.
 *          LH는 "임대주택 계열"만 채택(토지·상가·분양·공공분양·취소공고 제외),
 *          접수 마감(rcritEnd)이 지난 공고는 전 소스 공통으로 제외, _raw 미저장(슬림화).
 * 환경변수(GitHub Secrets):
 *   HUG_SERVICE_KEY : 주택도시보증공사 든든전세 모집공고 서비스키(필수)
 *   LH_API_KEY      : (선택) data.go.kr LH 분양임대공고문 서비스키
 *   (SH는 키 없이 i-sh.co.kr 공고 게시판을 직접 읽는다 — fetchSH 참고)
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

/* ---------- SH 서울주택도시공사 (i-sh.co.kr 공고 게시판) ----------
 * data.go.kr·서울열린데이터광장에는 SH '실시간 모집공고' 데이터셋이 없다.
 * (있는 건 주택관리현황·공급계획 같은 정적 통계뿐)
 * 대신 SH 청약시스템 공고 게시판이 서버 렌더링 HTML이라 그대로 읽을 수 있고,
 * 상세 페이지 본문에 접수일·신청자격·공급호수가 텍스트로 들어 있다.
 *
 * 반환값 규약: 배열 = 수집 성공 / null = 접근 실패(이전 수집분 유지) */
const SH_BOARD = "https://www.i-sh.co.kr/app/lay2/program/S48T1581C563/www/brd/m_247/";
/* 게시판이 봇 UA를 막을 수 있어 SH 요청만 브라우저 UA를 쓴다 */
const SH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function shGet(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": SH_UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9" },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}
const stripTags = h => String(h).replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/[ \t]+/g, " ");

/* 목록 HTML → [{seq, title, dept, posted}] */
function parseShList(html) {
  const out = [], seen = new Set();
  const re = /<tr[\s\S]{0,3000}?getDetailView\(\s*['"](\d+)['"][\s\S]*?<\/tr>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const seq = m[1];
    if (seen.has(seq)) continue;
    seen.add(seq);
    const cells = m[0].split(/<\/t[dh]>/i).map(c => stripTags(c).replace(/\s+/g, " ").trim()).filter(Boolean);
    const title  = cells.find(c => c.length > 6 && !/^\d+$/.test(c) && !/^\d{4}-\d{2}-\d{2}$/.test(c)) || "";
    const posted = (m[0].match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
    if (title) out.push({ seq, title: title.replace(/^NEW\s*/i, "").trim(), posted });
  }
  return out;
}

/* 모집공고만 추린다 — 계약결과·설문·재계약 안내 같은 공지는 캘린더에 올릴 게 아니다 */
function isShRecruit(t) {
  if (!/모집/.test(t)) return false;
  if (/계약결과|재계약|설문|만족도|입주안내|결과|최종|취소|중단|연기|평가위원회|채용/.test(t)) return false;
  return /입주자\s*모집|예비입주자\s*모집|예비자\s*모집|추가\s*모집|수시\s*모집|모집\s*공고/.test(t);
}

function shLtype(t) {
  const map = [["행복주택","행복주택"],["장기전세","장기전세"],["국민임대","국민임대"],["영구임대","영구임대"],
    ["통합공공임대","통합공공임대"],["청년안심주택","청년안심주택"],["전세임대","전세임대"],
    ["기숙사","공공기숙사"],["매입임대","매입임대"],["공공임대","공공임대"],["재개발임대","재개발임대"]];
  for (const [k, v] of map) if (t.includes(k)) return v;
  return "기타";
}

/* "2026. 9. 9.(수) 10:00 ~ 9. 11.(금) 17:00" — 끝 날짜에는 연도가 없다.
   콜론(:)을 반드시 요구한다. 안 그러면 제목의 공고일 "(2026. 8. 21.)"을 접수일로 잘못 집는다. */
function shPeriod(text) {
  let m = text.match(/(?:인터넷|온라인|방문|청약)?\s*접수(?:\s*일|\s*기간|\s*일정)?\s*[:：]\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?[^~\n]{0,25}~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})/);
  if (m) {
    const y1 = +m[1], mo1 = +m[2];
    const y2 = m[4] ? +m[4] : (+m[5] < mo1 ? y1 + 1 : y1);   /* 해를 넘겨 마감하는 접수 */
    return [toDate(`${y1}-${mo1}-${+m[3]}`), toDate(`${y2}-${+m[5]}-${+m[6]}`)];
  }
  m = text.match(/접수(?:\s*일|\s*기간|\s*일정)\s*[:：]\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (m) { const d = toDate(`${m[1]}-${m[2]}-${m[3]}`); return [d, d]; }
  return [null, null];   /* 접수일이 첨부 PDF에만 있는 공고도 있다 — 그때는 날짜 없이 목록에만 노출 */
}

/* 본문에 '신청자격'이 여러 번 나온다(메뉴·안내문구). 자격 단어가 실제로 들어간 줄을 고른다. */
function shQual(text) {
  const all = [...text.matchAll(/신청\s*자격\s*[:：]?\s*([^\n]{4,90})/g)].map(x => x[1].trim());
  return all.find(x => /대학생|청년|신혼|고령|수급|무주택|세대|신생아|자녀|장애/.test(x)) || null;
}

function shDetailToItem(row, html) {
  const text = stripTags(html).replace(/\s*\n\s*/g, "\n");
  const [start, end] = shPeriod(text);
  const w = text.match(/(?:서류심사대상자|당첨자|당첨\s*자)\s*발표\s*[:：]?\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  const qual = shQual(text);
  /* "신규공급 154호, 재공급 1,330호" → 1484 */
  const unitLine = (text.match(/공급\s*호수\s*[:：]?\s*([^\n]{0,80})/) || [])[1] || "";
  const nums = (unitLine.match(/([0-9,]+)\s*호/g) || []).map(x => toNum(x)).filter(Boolean);
  const units = nums.length ? nums.reduce((a, b) => a + b, 0) : null;

  return {
    id: "SH-" + row.seq,
    provider: "SH",
    ltype: shLtype(row.title),
    name: row.title,
    region: "서울",
    units,
    target: qual ? qual.replace(/\s*,\s*/g, ", ") : "자세한 자격은 공고문 확인",
    rcritStart: start,
    rcritEnd: end,
    winnerDate: w ? toDate(`${w[1]}-${w[2]}-${w[3]}`) : null,
    url: SH_BOARD + "view.do?seq=" + row.seq,
    note: row.posted ? `공고 ${row.posted}` : null,
    _src: "sh-web"
  };
}

async function fetchSH() {
  /* 게시판은 한 페이지 10여 건뿐이라 하루 이틀이면 밀려난다.
     공고일과 접수 시작 사이가 2주쯤 뜨는 경우가 많아 4페이지(약 40건)까지 훑는다. */
  const rows = [], seen = new Set();
  for (let page = 1; page <= 4; page++) {
    let html;
    try { html = await shGet(SH_BOARD + "list.do" + (page > 1 ? "?page=" + page : "")); }
    catch (e) {
      if (page === 1) { console.log("[SH] 목록을 못 읽음:", e.message, "— 이전 수집분 유지"); return null; }
      console.log("[SH] " + page + "페이지 실패:", e.message); break;
    }
    const got = parseShList(html).filter(r => !seen.has(r.seq));
    got.forEach(r => seen.add(r.seq));
    rows.push(...got);
    if (!got.length) break;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!rows.length) { console.log("[SH] 목록 파싱 0건 — 게시판 구조가 바뀌었는지 확인 필요"); return null; }

  const targets = rows.filter(r => isShRecruit(r.title)).slice(0, 20);
  console.log(`[SH] 목록 ${rows.length}건 중 모집공고 ${targets.length}건`);

  const out = [];
  for (const r of targets) {
    try {
      const it = shDetailToItem(r, await shGet(SH_BOARD + "view.do?seq=" + r.seq));
      out.push(it);
      console.log(`[SH]   ${it.ltype} | ${it.rcritStart || "-"}~${it.rcritEnd || "-"} | ${it.units || "-"}호 | ${it.name.slice(0, 38)}`);
    } catch (e) {
      console.log("[SH]   상세 실패", r.seq, e.message);
    }
    await new Promise(r2 => setTimeout(r2, 400));   /* 게시판에 부담 주지 않기 */
  }
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
  const prev   = cur.items || [];
  const AUTO = ["hug-api", "lh-api", "sh-web"];
  const manual  = prev.filter(it => !AUTO.includes(it._src));
  const prevHug = prev.filter(it => it._src === "hug-api");
  const prevLh  = prev.filter(it => it._src === "lh-api");
  const prevSh  = prev.filter(it => it._src === "sh-web");

  // fetch 실패(null)면 이전 수집분을 유지(어차피 아래 공통 필터로 마감건은 걸러짐)
  const hug = (await fetchHUG(process.env.HUG_SERVICE_KEY)) ?? prevHug;
  const lh  = (await fetchLH(process.env.LH_API_KEY)) ?? prevLh;
  const sh  = (await fetchSH()) ?? prevSh;

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
    source: "collect-rental.mjs (HUG 든든전세·LH 공식 API + SH 공고 게시판 + 수동 큐레이션)",
    count: items.length,
    schema: cur.schema || DEFAULT_SCHEMA,
    items
  };
  await writeFile(FILE, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`완료: 총 ${items.length}건 (HUG ${hug.length} / LH ${lh.length} / SH ${sh.length} / 수동 ${manual.length})`);
}

main().catch(e => { console.error("수집 실패:", e); process.exit(1); });
