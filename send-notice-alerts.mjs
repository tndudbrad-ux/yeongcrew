/* ===== 부비 — 공고별 청약일 알림 발송 (GitHub Actions 크론) =====
 * 실행: 매일 KST 18:00(전날 알림, sentD1) · KST 08:00(당일 알림, sentD0) — .github/workflows/notice-alerts.yml
 * 데이터: Firestore `noticeAlerts` (boobi-notice-alert.js가 저장) — status=active인 구독 중
 *   전날 저녁 실행 → rcritStart가 '내일'인 건 발송 / 당일 아침 실행 → rcritStart가 '오늘'인 건 발송
 * 발송: 솔라피(Solapi) 알림톡(ATA) — SEND_MODE=sms면 순수 문자(LMS)로 발송 (템플릿 승인 전 임시 운용)
 * 다른 대행사(알리고/NHN 등)로 바꾸려면 sendMessages() 함수만 교체하면 됨
 *
 * 필요 시크릿(GitHub Actions secrets):
 *   FIREBASE_SA_JSON      Firebase 서비스 계정 키 JSON 전체 (콘솔→프로젝트 설정→서비스 계정→새 비공개 키)
 *   SOLAPI_API_KEY / SOLAPI_API_SECRET
 *   SENDER_PHONE          솔라피에 등록된 발신번호 (예: 0212345678)
 *   KAKAO_PF_ID           솔라피에 연동한 카카오채널 pfId        (알림톡 모드)
 *   ALIMTALK_TEMPLATE_ID  승인된 템플릿 ID                       (알림톡 모드)
 *   SEND_MODE             'ata'(기본, 알림톡) | 'sms'(문자로 발송)
 * 옵션: DRY_RUN=1(발송 없이 대상만 출력), FORCE_SLOT=morning|evening, FORCE_DATE=YYYY-MM-DD
 */
import crypto from 'node:crypto';

const SA = JSON.parse(process.env.FIREBASE_SA_JSON || '{}');
const SOLAPI_KEY = process.env.SOLAPI_API_KEY || '';
const SOLAPI_SECRET = process.env.SOLAPI_API_SECRET || '';
const FROM = (process.env.SENDER_PHONE || '').replace(/[^0-9]/g, '');
const PF_ID = process.env.KAKAO_PF_ID || '';
const TEMPLATE_ID = process.env.ALIMTALK_TEMPLATE_ID || '';
const SEND_MODE = (process.env.SEND_MODE || 'ata').toLowerCase();
const DRY = process.env.DRY_RUN === '1';

if (!SA.project_id) { console.error('FIREBASE_SA_JSON 시크릿이 없거나 잘못됐어요.'); process.exit(1); }

/* ---------- KST 날짜/슬롯 ---------- */
const kstNow = new Date(Date.now() + 9 * 3600 * 1000);
const kstHour = kstNow.getUTCHours();
const slot = process.env.FORCE_SLOT || (kstHour >= 12 ? 'evening' : 'morning'); // 18시 실행→evening, 8시 실행→morning
function ymd(d) { return d.toISOString().slice(0, 10); }
const todayKST = ymd(kstNow);
const tomorrowKST = ymd(new Date(kstNow.getTime() + 86400000));
const targetDate = process.env.FORCE_DATE || (slot === 'evening' ? tomorrowKST : todayKST);
const flagField = slot === 'evening' ? 'sentD1' : 'sentD0';
const whenText = slot === 'evening' ? `내일(${+targetDate.slice(5, 7)}/${+targetDate.slice(8, 10)})` : '오늘';
console.log(`[notice-alerts] slot=${slot} target=${targetDate} flag=${flagField} mode=${SEND_MODE}${DRY ? ' DRY_RUN' : ''}`);

/* ---------- Google OAuth (서비스 계정 JWT) ---------- */
function b64url(x) { return Buffer.from(x).toString('base64url'); }
async function googleToken() {
  const iat = Math.floor(Date.now() / 1000);
  const jwtBody = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({
    iss: SA.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600
  }));
  const sig = crypto.createSign('RSA-SHA256').update(jwtBody).sign(SA.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwtBody + '.' + sig })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('google token 실패: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

/* ---------- Firestore REST ---------- */
const FS = `https://firestore.googleapis.com/v1/projects/${SA.project_id}/databases/(default)/documents`;
function fv(v) { // Firestore value → JS
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return +v.integerValue;
  return null;
}
async function fetchSubs(token) {
  const r = await fetch(FS + ':runQuery', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'noticeAlerts' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'active' } } }
    } })
  });
  const rows = await r.json();
  if (!Array.isArray(rows)) throw new Error('firestore query 실패: ' + JSON.stringify(rows).slice(0, 300));
  return rows.filter(x => x.document).map(x => {
    const f = x.document.fields || {};
    const o = { _name: x.document.name };
    for (const k of Object.keys(f)) o[k] = fv(f[k]);
    return o;
  });
}
async function markSent(token, docName) {
  const field = flagField;
  await fetch(`https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=${field}&updateMask.fieldPaths=${field}At`, {
    method: 'PATCH', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { [field]: { booleanValue: true }, [field + 'At']: { stringValue: new Date().toISOString() } } })
  });
}

/* ---------- 솔라피 발송 (다른 대행사로 바꾸려면 이 함수만 교체) ---------- */
function solapiAuthHeader() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', SOLAPI_SECRET).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
}
function buildMessage(sub) {
  const period = (sub.rcritStart || '') + (sub.rcritEnd ? ' ~ ' + sub.rcritEnd : '');
  const fallbackText = `[부비] 청약 알림\n${sub.name}\n${whenText} 청약(접수)이 시작돼요!\n접수기간: ${period}\n공고 확인: https://boobi.ai.kr/cheongyak-board.html`;
  if (SEND_MODE === 'sms') return { to: sub.phone, from: FROM, subject: '[부비] 청약 알림', text: fallbackText };
  return {
    to: sub.phone, from: FROM, text: fallbackText, // 알림톡 실패 시 문자 대체발송용
    kakaoOptions: {
      pfId: PF_ID, templateId: TEMPLATE_ID, disableSms: false,
      variables: { '#{name}': sub.name || '', '#{when}': whenText, '#{period}': period }
    }
  };
}
async function sendMessages(messages) {
  const r = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
    method: 'POST', headers: { authorization: solapiAuthHeader(), 'content-type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  const j = await r.json();
  if (!r.ok) throw new Error('solapi 실패: ' + JSON.stringify(j).slice(0, 400));
  return j;
}

/* ---------- 메인 ---------- */
const token = await googleToken();
const subs = await fetchSubs(token);
const targets = subs.filter(s => s.rcritStart === targetDate && !s[flagField] && s.phone);
console.log(`구독 ${subs.length}건 중 발송 대상 ${targets.length}건`);
if (!targets.length) { console.log('발송할 알림이 없어요.'); process.exit(0); }

for (const t of targets) console.log(` → ${t.phone.slice(0, 3)}****${t.phone.slice(-2)} | ${t.name} | ${t.rcritStart}`);
if (DRY) { console.log('DRY_RUN — 발송 생략'); process.exit(0); }

/* 100건씩 배치 발송 → 성공 시 플래그 기록 */
let sent = 0, failed = 0;
for (let i = 0; i < targets.length; i += 100) {
  const batch = targets.slice(i, i + 100);
  try {
    const res = await sendMessages(batch.map(buildMessage));
    const failList = (res.failedMessageList || []).map(f => f.to);
    for (const t of batch) {
      if (failList.includes(t.phone)) { failed++; console.error(`발송 실패: ${t.name} → ${t.phone.slice(0,3)}****`); continue; }
      await markSent(token, t._name); sent++;
    }
  } catch (e) {
    failed += batch.length;
    console.error('배치 발송 오류:', e.message);
  }
}
console.log(`완료 — 성공 ${sent}건, 실패 ${failed}건`);
if (failed && !sent) process.exit(1);
