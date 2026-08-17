/* ===== 부비 — 가입자·기대 설문 집계 리포트 (수동 실행용) =====
 * GitHub Actions(workflow_dispatch)로 실행. FIREBASE_SA_JSON 시크릿 필요.
 * 출력: 총 가입자 수(Firebase Auth), members 설문(expectations) 분포, 알림 구독 현황. 로그로만 출력, 아무것도 수정하지 않음. */
import crypto from 'node:crypto';

const SA = JSON.parse(process.env.FIREBASE_SA_JSON || '{}');
if (!SA.project_id) { console.log('FIREBASE_SA_JSON 시크릿 없음 — 건너뜀'); process.exit(0); }

function b64url(x){ return Buffer.from(x).toString('base64url'); }
async function token(scope){
  const iat=Math.floor(Date.now()/1000);
  const body=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64url(JSON.stringify({iss:SA.client_email,scope,aud:'https://oauth2.googleapis.com/token',iat,exp:iat+3600}));
  const sig=crypto.createSign('RSA-SHA256').update(body).sign(SA.private_key,'base64url');
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:body+'.'+sig})});
  const j=await r.json(); if(!j.access_token) throw new Error('token 실패: '+JSON.stringify(j).slice(0,200)); return j.access_token;
}
function fv(v){ if(v.stringValue!==undefined)return v.stringValue; if(v.booleanValue!==undefined)return v.booleanValue; if(v.integerValue!==undefined)return +v.integerValue; if(v.arrayValue!==undefined)return (v.arrayValue.values||[]).map(fv); return null; }

const tk = await token('https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform');

/* 1) 총 가입자 수 (Firebase Auth) */
try {
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${SA.project_id}/accounts:query`,{
    method:'POST',headers:{authorization:'Bearer '+tk,'content-type':'application/json'},
    body:JSON.stringify({returnUserInfo:false})});
  const j=await r.json();
  console.log('=== 총 가입자 수: '+(j.recordsCount ?? '조회실패 '+JSON.stringify(j).slice(0,150))+'명 ===');
} catch(e){ console.log('가입자 수 조회 실패:', e.message); }

/* 2) 기대 설문 집계 (members.expectations) */
async function runQuery(coll){
  const r=await fetch(`https://firestore.googleapis.com/v1/projects/${SA.project_id}/databases/(default)/documents:runQuery`,{
    method:'POST',headers:{authorization:'Bearer '+tk,'content-type':'application/json'},
    body:JSON.stringify({structuredQuery:{from:[{collectionId:coll}],limit:2000}})});
  const rows=await r.json();
  if(!Array.isArray(rows)) throw new Error(coll+' 조회 실패: '+JSON.stringify(rows).slice(0,200));
  return rows.filter(x=>x.document).map(x=>{const f=x.document.fields||{};const o={};for(const k of Object.keys(f))o[k]=fv(f[k]);return o;});
}
const members = await runQuery('members');
const answered = members.filter(m=>Array.isArray(m.expectations));
const counts = {};
answered.forEach(m=>m.expectations.forEach(e=>{counts[e]=(counts[e]||0)+1;}));
console.log(`\n=== 기대 설문: members 문서 ${members.length}건 중 응답 ${answered.length}건 ===`);
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${String(v).padStart(3)}명 | ${k}`));
const notes = answered.map(m=>m.expectationsNote).filter(Boolean);
if(notes.length){ console.log('--- 기타 자유입력 ---'); notes.forEach(n=>console.log('  · '+String(n).slice(0,120))); }

/* 3) 공고 알림 구독 현황 (보너스) */
try {
  const subs = await runQuery('noticeAlerts');
  const act = subs.filter(s=>s.status==='active');
  console.log(`\n=== 청약 알림 구독: 활성 ${act.length}건 (유니크 유저 ${new Set(act.map(s=>s.uid)).size}명) ===`);
  act.slice(0,20).forEach(s=>console.log('  · '+(s.name||'').slice(0,40)+' | 접수 '+s.rcritStart));
} catch(e){ console.log('알림 구독 조회 실패:', e.message); }
