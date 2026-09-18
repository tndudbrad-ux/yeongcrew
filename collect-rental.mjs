/*
 * 부비 임대공고 자동 수집기 (GitHub Actions 크론용, Node 20+)
 * ------------------------------------------------------------
 * 하는 일: HUG 든든전세·LH 공식 오픈API(+공고 상세 보강) + SH 공고 게시판에서 임대 공고를 받아
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

/* ---------- LH 공고 상세 보강 ----------
 * LH 목록 API(lhLeaseNoticeInfo1)는 마감일만 주고 접수 시작일을 안 준다.
 * 그래서 매입임대 공고가 캘린더에 '접수마감' 한 줄로만 남고, 접수 시작일에는 아무것도 안 떴다.
 * 그런데 LH청약플러스 공고 상세 페이지에는 '공급일정' 블록에 그대로 적혀 있다:
 *   접수기간 : 2026.09.28 10:00 ~ 2026.09.30 16:00
 *   당첨자발표일 : 2026.12.11
 * 공고문 PDF를 열 필요 없이 이 페이지만 읽으면 된다. 신청자격도 같이 가져와 target을 채운다. */
const LH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function lhGet(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": LH_UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9" },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}

function lhDetailParse(html) {
  const out = {};
  /* 접수기간은 화면에 JS로 채워 넣는다 — HTML의 <label id="sta_acpDt">는 비어 있다.
     대신 같은 페이지 인라인 스크립트에 원본 값이 있다:
       var sbscAcpStDt = '2026.09.28';  var sbscAcpClsgDt = '2026.09.30';
     이걸 1순위로 읽는다. (텍스트만 긁으면 바로 아래 '서류접수기간'을 접수일로 잘못 집는다) */
  const vs = html.match(/sbscAcpStDt\s*=\s*'(\d{4})\.(\d{2})\.(\d{2})'/);
  const ve = html.match(/sbscAcpClsgDt\s*=\s*'(\d{4})\.(\d{2})\.(\d{2})'/);
  if (vs) out.start = toDate(`${vs[1]}-${vs[2]}-${vs[3]}`);
  if (ve) out.end = toDate(`${ve[1]}-${ve[2]}-${ve[3]}`);

  const t = stripTags(html).replace(/\s*\n\s*/g, "\n");

  /* 스크립트 값이 없을 때만 본문에서 찾는다. '서류접수기간'은 접수일이 아니므로 제외 */
  if (!out.start) {
    const p = t.match(/(^|[^류])\s*접수\s*기간\s*[:：]\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})[^~\n]{0,14}~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})/);
    if (p) {
      out.start = toDate(`${p[2]}-${p[3]}-${p[4]}`);
      out.end   = toDate(`${p[5] || p[2]}-${p[6]}-${p[7]}`);
    }
  }

  const w = t.match(/당첨자\s*발표일?\s*[:：]\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (w) out.winner = toDate(`${w[1]}-${w[2]}-${w[3]}`);

  /* 신청자격: 표 헤더 안내문("구분, 세부자격요건에 대한 정보 제공" 등)이 같이 딸려 오므로
     '공통신청자격' 뒤부터 '1순위' 앞까지를 우선 쓴다. */
  let q = t.match(/공통\s*신청\s*자격([\s\S]{5,400}?)(?:1\s*순위|$)/);
  if (!q) q = t.match(/신청\s*자격\s*[:：]?([\s\S]{5,300})/);
  if (q) {
    const line = q[1].replace(/\s+/g, " ")
      .replace(/구분\s*,?\s*세부자격요건[^가-힣]{0,40}(정보\s*제공)?/g, " ")
      .replace(/^[\s:：·\-]+/, "").trim();
    if (/무주택|청년|신혼|고령|수급|자산|소득/.test(line)) out.target = line.slice(0, 160);
  }
  return out;
}

/* LH 공고 상세를 열어 접수기간·발표일·자격을 채운다 (순차 요청, 간격 350ms).
   '비어 있는 것만' 채우면 안 된다 — LH API가 실패해 이전 수집분을 재사용할 때
   한 번 잘못 들어간 날짜가 영영 고쳐지지 않는다. 값을 얻으면 항상 덮어쓴다. */
async function enrichLH(items) {
  const todo = items.filter(it => /panId=/.test(it.url || ""));
  if (!todo.length) { console.log("[LH] 상세 보강 대상 없음"); return; }
  let ok = 0, fail = 0, fixed = 0;
  for (const it of todo) {
    try {
      const d = lhDetailParse(await lhGet(it.url));
      if (d.start) {
        if (it.rcritStart !== d.start) fixed++;
        it.rcritStart = d.start;
        if (d.end) it.rcritEnd = d.end;   /* 목록의 마감일보다 상세가 정확하다 */
        ok++;
      }
      if (d.winner) it.winnerDate = d.winner;
      if (d.target) it.target = d.target;
    } catch (e) { fail++; }
    await new Promise(r => setTimeout(r, 350));
  }
  console.log(`[LH] 상세 보강 ${todo.length}건 시도 → 접수기간 확보 ${ok}건(값이 바뀐 것 ${fixed}건), 실패 ${fail}건`);
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
  .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&[a-zA-Z]+;/g, " ").replace(/[ \t]+/g, " ");

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
  if (/발표|당첨자|계약결과|재계약|설문|만족도|입주안내|결과|최종|취소|중단|연기|평가위원회|채용|일자리|참여자/.test(t)) return false;
  return /입주자\s*모집|예비입주자\s*모집|예비자\s*모집|추가\s*모집|수시\s*모집|일반모집|모집\s*공고/.test(t);
}

function shLtype(t) {
  const map = [["행복주택","행복주택"],["장기전세","장기전세"],["국민임대","국민임대"],["영구임대","영구임대"],
    ["통합공공임대","통합공공임대"],["청년안심주택","청년안심주택"],["전세임대","전세임대"],
    ["기숙사","공공기숙사"],["매입임대","매입임대"],["공공임대","공공임대"],["재개발임대","재개발임대"]];
  for (const [k, v] of map) if (t.includes(k)) return v;
  return "기타";
}

/* 접수일 표기가 공고마다 다르다.
     "○ 인터넷 접수 : 2026. 9. 9.( 수 ) 10:00 ~ 9. 11.( 금 ) 17:00"   (콜론형)
     "신청기간 | 1순위(선순위) | 2026. 9. 29.(화) 10:00 | ~ 2026. 10. 2.(금)"  (표형, 콜론 없음)
   그래서 콜론을 요구하지 않고, '접수/신청기간' 키워드 뒤 구간에서 '날짜 ~ 날짜'를 찾는다.
   범위(~)를 요구하므로 제목의 공고일 "(2026. 8. 28.)"은 걸리지 않는다.
   요일이 "( 수 )"처럼 띄어져 나오는 경우가 있어 날짜와 ~ 사이는 느슨하게 둔다. */
const SH_RANGE = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?[^~]{0,25}~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})/g;
const pad2 = n => String(n).padStart(2, "0");

function shPeriod(text) {
  const found = [];
  /* 표기가 공고마다 다르다: "접수일" / "신청기간" / "청약신청 일정" / "청약 일정".
     이 목록이 좁으면 앞쪽 진짜 접수일을 놓치고 뒤쪽 서류·계약 일정을 접수일로 집는다. */
  const kw = /(접수|신청\s*(?:기간|일정)|청약\s*(?:신청|기간|일정)|모집\s*(?:기간|일정))/g;
  let k;
  while ((k = kw.exec(text)) !== null) {
    const win = text.slice(k.index, k.index + 320);
    let m; SH_RANGE.lastIndex = 0;
    while ((m = SH_RANGE.exec(win)) !== null) {
      const y1 = +m[1], mo1 = +m[2];
      const y2 = m[4] ? +m[4] : (+m[5] < mo1 ? y1 + 1 : y1);   /* 해를 넘겨 마감하는 접수 */
      found.push([`${y1}-${pad2(mo1)}-${pad2(+m[3])}`, `${y2}-${pad2(+m[5])}-${pad2(+m[6])}`]);
    }
  }
  if (!found.length) return [null, null];   /* 접수일이 첨부 PDF에만 있는 공고도 많다 */
  found.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return found[0];   /* 가장 이른 구간 하나만 — 뒤따르는 서류제출·계약 기간을 끌어오지 않게 */
}

/* 본문에 '신청자격'이 여러 번 나온다(메뉴·안내문구). 자격 단어가 실제로 들어간 줄을 고른다. */
function shQual(text) {
  const all = [...text.matchAll(/신청\s*자격\s*[:：]?\s*([^\n]{4,90})/g)].map(x => x[1].trim());
  return all.find(x => /대학생|청년|신혼|고령|수급|무주택|세대|신생아|자녀|장애/.test(x)) || null;
}

function shDetailToItem(row, html) {
  const text = stripTags(html).replace(/\s*\n\s*/g, "\n");
  const [start, end] = shPeriod(text);
  const w = text.match(/(?:서류심사대상자|당첨자|당첨)\s*(?:및[^\n]{0,12})?\s*발표\s*[:：]?\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  const qual = shQual(text);
  /* "신규공급 154호, 재공급 1,330호" → 1484 */
  const unitLine = (text.match(/공급\s*호수\s*[:：]?\s*([^\n]{0,80})/) || [])[1] || "";
  const nums = (unitLine.match(/([0-9,]+)\s*(?:호|세대)/g) || []).map(x => toNum(x)).filter(Boolean);
  const units = nums.length ? nums.reduce((a, b) => a + b, 0) : null;

  return {
    id: "SH-" + row.seq,
    provider: "SH",
    ltype: shLtype(row.title),
    name: row.title,
    region: "서울",
    units,
    target: qual ? qual.replace(/^[○●■▶·\-]\s*/, "").replace(/\s*,\s*/g, ", ").slice(0, 120) : "자세한 자격은 공고문 확인",
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
     공고일과 접수 시작 사이가 2~3주 벌어지는 경우가 많아 8페이지(약 80건, 약 3주치)까지 훑는다.
     실제로 '26년 2차 행복주택'은 8/28 공고 / 9/9 접수라 6페이지에 있었다. */
  const rows = [], seen = new Set();
  for (let page = 1; page <= 8; page++) {
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
  await enrichLH(lh);   /* 목록 API에 없는 접수 시작일을 공고 상세에서 채운다 */
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
