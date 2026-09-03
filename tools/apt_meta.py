#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
부비 · 단지 메타데이터 수집기 (국토교통부 공동주택관리정보시스템 / K-apt)

실거래가에는 단지명·면적·가격밖에 없다. "왜 이 단지인가"를 말하려면
세대수·연식·역세권 같은 사실이 필요한데, 그걸 이 세 API에서 가져온다.

  AptListService4/getSigunguAptList4   시군구 → 단지코드 목록
  AptBasisInfoServiceV5/getAphusBassInfoV5   단지코드 → 세대수·사용승인일·주소
  AptBasisInfoServiceV5/getAphusDtlInfoV5    단지코드 → 지하철역·거리·교육시설·주차

일일 트래픽이 상세기능당 5,000건이라 전국(약 3만 단지)을 하루에 다 못 받는다.
그래서 진행상황을 SQLite에 남기고, 매일 예산만큼만 받아 이어붙인다.
며칠에 걸쳐 채워지고, 한 번 채우고 나면 신축만 따라잡으면 된다.

  python apt_meta.py --probe                 인증키 확인 + 원시 응답 1건 출력
  python apt_meta.py --stage list            1단계: 단지코드 목록 (가벼움)
  python apt_meta.py --stage info --budget 4800   2·3단계: 단지별 상세
  python apt_meta.py --emit                  data/apt-meta/*.json 생성
  python apt_meta.py --import-csv 단지_기본정보.csv   K-apt 엑셀(CSV 저장)로 부대복리시설·승강기·최고층 등 보강
  KAKAO_REST_KEY=… python apt_meta.py --geocode --budget 20000   도로명주소 → 좌표 (카카오 로컬)

API에 없는 것(부대복리시설·승강기·최고층·지하주차·좌표)은 extra 테이블에 따로 두고
emit 때 합친다. 단지코드(kapt_code)로 정확히 붙으므로 이름 매칭이 필요 없다.

산출물
  apt_meta.db            SQLite. 단지 원본 + 수집 진행상황
  data/apt-meta/{시군구코드}.json   앱/웹이 읽는 단지 메타
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from urllib.parse import unquote

try:
    import requests
except ImportError:
    sys.exit("requests가 필요합니다:  pip install requests")

BASE = "https://apis.data.go.kr/1613000"
LIST_SVC = f"{BASE}/AptListService4/getSigunguAptList4"
BASS_SVC = f"{BASE}/AptBasisInfoServiceV5/getAphusBassInfoV5"
DTL_SVC = f"{BASE}/AptBasisInfoServiceV5/getAphusDtlInfoV5"

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REGIONS_PATH = os.path.join(ROOT, "data", "regions.json")
DB_PATH = os.path.join(HERE, "apt_meta.db")
OUT_DIR = os.path.join(ROOT, "data", "apt-meta")

TIMEOUT = 20
RETRIES = 3


# ── XML 헬퍼 ────────────────────────────────────────────────────────────────
# 스펙 개정으로 필드명이 바뀌어도 조용히 0이 되지 않도록 후보를 여러 개 둔다.
def text(node: ET.Element, *keys: str) -> str:
    for k in keys:
        el = node.find(k)
        if el is not None and el.text and el.text.strip():
            return el.text.strip()
    return ""


def to_int(s: str, default: int = 0) -> int:
    s = (s or "").replace(",", "").replace(" ", "")
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return default


class ApiError(RuntimeError):
    pass


def clean_key(raw: str) -> str:
    """인증키를 그대로 믿지 않는다.

    - 시크릿에 붙여넣을 때 끝에 줄바꿈이 딸려오면 %0A로 전송돼 403이 난다.
    - data.go.kr은 Encoding/Decoding 두 형태를 주는데, Encoding 키를 requests에
      그대로 넘기면 '%'가 다시 인코딩돼(%2B → %252B) 역시 403이 난다.
      그래서 한 번 풀어서 넘기고, 인코딩은 requests에게 딱 한 번만 맡긴다.
    """
    k = (raw or "").strip()
    if "%" in k:
        k = unquote(k)
    return k


def fetch(url: str, params: dict) -> str:
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params, timeout=TIMEOUT)
            if 400 <= r.status_code < 500:
                # 4xx는 재시도해봐야 똑같다. 포털이 본문에 실제 사유를 담아주므로 같이 올린다.
                raise ApiError(f"HTTP {r.status_code} — {r.text.strip()[:300]}")
            r.raise_for_status()
            return r.text
        except ApiError:
            raise
        except Exception as e:      # 네트워크·5xx는 잠깐 쉬고 재시도
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise ApiError(f"{url} 요청 실패: {last}")


def check(root: ET.Element) -> None:
    code = text(root, "./header/resultCode", "./cmmMsgHeader/returnReasonCode")
    if code and code not in ("00", "000"):
        msg = text(root, "./header/resultMsg", "./cmmMsgHeader/returnAuthMsg",
                   "./cmmMsgHeader/errMsg")
        raise ApiError(f"[{code}] {msg or '알 수 없는 오류'}")


def pick(d: dict, *keys: str) -> str:
    """항목 하나에서 값 꺼내기. 스펙이 바뀌어도 조용히 빈 값이 되지 않도록 후보를 여러 개 둔다."""
    for k in keys:
        v = d.get(k)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def call(url: str, params: dict) -> tuple[list[dict], int]:
    """API 한 번 호출 → (항목 리스트, totalCount)

    AptListService4는 JSON, 구세대 서비스는 XML을 준다. 어느 쪽이 오든 같은 모양으로
    돌려줘서 호출부가 응답 형식을 몰라도 되게 한다.
    """
    body = fetch(url, params)
    s = body.lstrip()

    if s.startswith("{") or s.startswith("["):
        d = json.loads(body)
        resp = d.get("response", d) if isinstance(d, dict) else {}
        head = resp.get("header") or {}
        code = str(head.get("resultCode") or "")
        if code and code not in ("00", "000"):
            raise ApiError(f"[{code}] {head.get('resultMsg') or '알 수 없는 오류'}")
        b = resp.get("body") or {}
        # 목록 조회는 body.items(복수), 단건 조회는 body.item(단수)로 온다.
        # items가 {"item": ...}로 한 겹 더 싸여 오는 서비스도 있다.
        items = b.get("items")
        if isinstance(items, dict):
            items = items.get("item")
        if items is None:
            items = b.get("item")
        if items is None:
            items = []
        if isinstance(items, dict):          # 단건이면 dict 하나로 온다
            items = [items]
        return items, to_int(str(b.get("totalCount") or 0))

    root = ET.fromstring(body)
    check(root)
    items = [{c.tag: (c.text or "") for c in it} for it in root.iterfind(".//item")]
    return items, to_int(text(root, "./body/totalCount"))


# ── DB ──────────────────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS complex (
  kapt_code   TEXT PRIMARY KEY,
  sgg_code    TEXT NOT NULL,
  name        TEXT,
  sido        TEXT,
  sgg         TEXT,
  umd         TEXT,
  ri          TEXT,
  bjd_code    TEXT,
  -- 기본정보
  households  INTEGER,          -- 세대수
  dong_cnt    INTEGER,          -- 동수
  use_date    TEXT,             -- 사용승인일 YYYYMMDD
  road_addr   TEXT,
  builder     TEXT,             -- 시공사
  hall_type   TEXT,             -- 복도유형
  sale_type   TEXT,             -- 분양형태
  bass_done   INTEGER DEFAULT 0,
  -- 상세정보
  subway_line TEXT,
  subway_stn  TEXT,
  subway_min  TEXT,             -- 지하철역 거리(도보 분)
  bus_min     TEXT,
  edu         TEXT,             -- 교육시설
  park_cnt    INTEGER,          -- 주차대수(지상+지하)
  cctv_cnt    INTEGER,
  dtl_done    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_complex_sgg ON complex(sgg_code);
CREATE INDEX IF NOT EXISTS ix_complex_bass ON complex(bass_done);
CREATE INDEX IF NOT EXISTS ix_complex_dtl ON complex(dtl_done);
CREATE TABLE IF NOT EXISTS listed (sgg_code TEXT PRIMARY KEY, n INTEGER, at TEXT);
-- API가 안 주는 것들. K-apt 엑셀(주 1회 갱신) 또는 지오코딩으로 채운다.
CREATE TABLE IF NOT EXISTS extra (
  kapt_code   TEXT PRIMARY KEY,
  fac         TEXT,             -- 부대복리시설 코드(쉼표): comm,pub,play,senior,care,kinder,lib,rest,bike
  heat        TEXT,             -- 난방방식
  ev          INTEGER,          -- 승객용 승강기 수
  top         INTEGER,          -- 최고층
  park_u      INTEGER,          -- 지하주차대수
  lat         REAL,
  lng         REAL,
  csv_at      TEXT,
  geo_at      TEXT
);
"""

# K-apt는 부대복리시설을 자유 텍스트가 아니라 코드값 11종으로 준다. 짧은 코드로 바꿔 싣는다.
FAC_MAP = [("커뮤니티공간", "comm"), ("주민공동시설", "pub"), ("어린이놀이터", "play"), ("노인정", "senior"),
           ("보육시설", "care"), ("유치원", "kinder"), ("문고", "lib"), ("휴게시설", "rest"), ("자전거보관소", "bike")]


def fac_codes(v: str) -> str:
    v = v or ""
    return ",".join(code for ko, code in FAC_MAP if ko in v)


def db_open() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.executescript(SCHEMA)
    return con


# ── 1단계: 시군구 → 단지코드 목록 ───────────────────────────────────────────
def stage_list(con: sqlite3.Connection, key: str, only: list[str] | None) -> None:
    regions = json.load(open(REGIONS_PATH, encoding="utf-8"))
    todo = [(s["code"], s["name"], sido)
            for sido, lst in regions.items() for s in lst]
    if only:
        todo = [t for t in todo if t[0] in only]

    done = {r[0] for r in con.execute("SELECT sgg_code FROM listed")}
    todo = [t for t in todo if t[0] not in done]
    print(f"[목록] 대상 시군구 {len(todo)}개 (이미 받은 곳 {len(done)}개는 건너뜀)", flush=True)

    lock = Lock()

    def one(code: str, name: str, sido: str) -> tuple[str, int]:
        rows, page = [], 1
        while True:
            items, total = call(LIST_SVC, {"serviceKey": key, "sigunguCode": code,
                                           "pageNo": page, "numOfRows": 1000})
            for it in items:
                kc = pick(it, "kaptCode", "KAPT_CODE")
                if not kc:
                    continue
                rows.append((
                    kc, code,
                    pick(it, "kaptName", "KAPT_NAME", "kaptNm"),
                    pick(it, "as1"), pick(it, "as2"), pick(it, "as3"), pick(it, "as4"),
                    pick(it, "bjdCode", "BJD_CODE"),
                ))
            if not items or page * 1000 >= total:
                break
            page += 1
        with lock:
            con.executemany(
                "INSERT OR IGNORE INTO complex"
                "(kapt_code,sgg_code,name,sido,sgg,umd,ri,bjd_code)"
                " VALUES (?,?,?,?,?,?,?,?)", rows)
            con.execute("INSERT OR REPLACE INTO listed VALUES (?,?,datetime('now'))",
                        (code, len(rows)))
            con.commit()
        return name, len(rows)

    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(one, c, n, s): n for c, n, s in todo}
        for i, f in enumerate(as_completed(futs), 1):
            try:
                nm, n = f.result()
                print(f"  {i}/{len(todo)} {nm} — {n}개", flush=True)
            except Exception as e:
                print(f"  ! {futs[f]} 실패: {e}", file=sys.stderr, flush=True)

    n = con.execute("SELECT COUNT(*) FROM complex").fetchone()[0]
    print(f"[목록] 누적 단지 {n:,}개", flush=True)


# ── 2·3단계: 단지코드 → 기본/상세 정보 ──────────────────────────────────────
def stage_info(con: sqlite3.Connection, key: str, budget: int) -> None:
    lock = Lock()

    def run(kind: str, url: str, flag: str, apply_row) -> None:
        rows = con.execute(
            f"SELECT kapt_code FROM complex WHERE {flag}=0 LIMIT ?", (budget,)
        ).fetchall()
        if not rows:
            print(f"[{kind}] 남은 단지 없음 — 완료", flush=True)
            return
        left = con.execute(f"SELECT COUNT(*) FROM complex WHERE {flag}=0").fetchone()[0]
        print(f"[{kind}] 이번 실행 {len(rows):,}개 / 남은 {left:,}개", flush=True)

        def one(kc: str):
            items, _ = call(url, {"serviceKey": key, "kaptCode": kc})
            with lock:
                # 응답이 비어도 done 처리한다. 안 그러면 폐지된 단지에 매일 예산을 태운다.
                if items:
                    apply_row(kc, items[0])
                con.execute(f"UPDATE complex SET {flag}=1 WHERE kapt_code=?", (kc,))

        ok = err = 0
        with ThreadPoolExecutor(max_workers=6) as ex:
            futs = [ex.submit(one, r[0]) for r in rows]
            for i, f in enumerate(as_completed(futs), 1):
                try:
                    f.result()
                    ok += 1
                except Exception as e:
                    err += 1
                    if err <= 5:
                        print(f"  ! {e}", file=sys.stderr, flush=True)
                if i % 500 == 0:
                    with lock:
                        con.commit()
                    print(f"  {i}/{len(rows)}", flush=True)
        con.commit()
        print(f"[{kind}] 성공 {ok:,} / 실패 {err:,}", flush=True)

    def apply_bass(kc: str, it: dict) -> None:
        con.execute(
            "UPDATE complex SET households=?,dong_cnt=?,use_date=?,road_addr=?,"
            "builder=?,hall_type=?,sale_type=? WHERE kapt_code=?",
            (to_int(pick(it, "kaptdaCnt", "kaptDaCnt", "hoCnt")),
             to_int(pick(it, "kaptDongCnt")),
             pick(it, "kaptUsedate", "kaptUseDate"),
             pick(it, "doroJuso", "kaptAddr"),
             pick(it, "kaptBcompany"),
             pick(it, "codeHallNm"),
             pick(it, "codeSaleNm"),
             kc))

    def apply_dtl(kc: str, it: dict) -> None:
        con.execute(
            "UPDATE complex SET subway_line=?,subway_stn=?,subway_min=?,bus_min=?,"
            "edu=?,park_cnt=?,cctv_cnt=? WHERE kapt_code=?",
            (pick(it, "subwayLine"),
             pick(it, "subwayStation"),
             pick(it, "kaptdWtimesub"),
             pick(it, "kaptdWtimebus"),
             pick(it, "educationFacility"),
             to_int(pick(it, "kaptdPcnt")) + to_int(pick(it, "kaptdPcntu")),
             to_int(pick(it, "kaptdCccnt")),
             kc))

    run("기본정보", BASS_SVC, "bass_done", apply_bass)
    run("상세정보", DTL_SVC, "dtl_done", apply_dtl)


# ── 산출 ────────────────────────────────────────────────────────────────────
def emit(con: sqlite3.Connection) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    sggs = [r[0] for r in con.execute("SELECT DISTINCT sgg_code FROM complex")]
    total = 0
    for sgg in sggs:
        out = []
        for r in con.execute(
            "SELECT c.name,c.umd,c.households,c.use_date,c.subway_stn,c.subway_min,c.bus_min,"
            "c.park_cnt,c.builder,c.dong_cnt,c.kapt_code,c.hall_type,"
            "x.fac,x.heat,x.ev,x.top,x.park_u,x.lat,x.lng"
            " FROM complex c LEFT JOIN extra x ON x.kapt_code=c.kapt_code"
            " WHERE c.sgg_code=? AND c.bass_done=1", (sgg,)
        ):
            (name, umd, hh, use, stn, smin, bmin, park, builder, dong,
             kc, hall, fac, heat, ev, top, park_u, lat, lng) = r
            if not name:
                continue
            rec = {"c": kc, "n": name, "d": umd or ""}
            if hh:
                rec["hh"] = hh                       # 세대수
            if use and len(use) >= 4:
                rec["y"] = to_int(use[:4])           # 준공연도
            if stn:
                rec["st"] = stn                      # 지하철역명
            if smin:
                rec["sm"] = smin                     # 역까지 도보 분
            if bmin:
                rec["bm"] = bmin
            if park:
                rec["pk"] = park
            if dong:
                rec["dc"] = dong
            if builder:
                rec["bd"] = builder                  # 시공사
            if hall and hall not in ("기타", ""):
                rec["cor"] = hall                    # 복도유형 (계단식·복도식·혼합식)
            # ── extra (K-apt 엑셀·지오코딩) ──
            if fac:
                rec["fac"] = fac.split(",")
            if heat:
                rec["heat"] = heat
            if ev:
                rec["ev"] = ev
            if top:
                rec["top"] = top
            if park_u and park:
                rec["pku"] = round(min(park_u / park, 1.0), 2)   # 지하주차 비율
            if lat and lng:
                rec["lat"], rec["lng"] = round(lat, 6), round(lng, 6)
            out.append(rec)
        if not out:
            continue
        path = os.path.join(OUT_DIR, f"{sgg}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        total += len(out)
    print(f"[산출] {len(sggs)}개 시군구 · 단지 {total:,}개 → {OUT_DIR}", flush=True)


# ── K-apt 엑셀 보강 ───────────────────────────────────────────────────────────
def import_csv(con: sqlite3.Connection, path: str) -> None:
    """K-apt '단지 기본정보' 엑셀을 CSV로 저장한 파일. 1행 안내문, 2행 헤더.
    단지코드로 붙이므로 이름 매칭이 없다 — API 목록과 같은 의무관리대상 단지 집합이다."""
    import csv
    raw = open(path, "rb").read()
    try:
        txt = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        txt = raw.decode("cp949")
    rows = list(csv.reader(txt.splitlines()))
    # 헤더 = 값이 든 칸이 가장 많은 행 (안내문 행은 칸은 많아도 값은 하나뿐)
    hi = max(range(min(5, len(rows))), key=lambda i: sum(1 for c in rows[i] if c.strip()))
    hdr = [h.strip() for h in rows[hi]]

    def col(*names: str) -> int:
        for n in names:
            if n in hdr:
                return hdr.index(n)
        return -1
    ic, ifac, iheat, iev, itop, ipu = (col("단지코드"), col("부대복리시설"), col("난방방식"),
                                       col("승강기(승객용)"), col("최고층수"), col("지하주차대수"))
    if ic < 0:
        sys.exit(f"'단지코드' 열이 없습니다. 헤더: {hdr[:12]}")
    known = {r[0] for r in con.execute("SELECT kapt_code FROM complex")}
    today = time.strftime("%Y-%m-%d")
    n = hit = 0

    def cell(r: list[str], i: int) -> str:
        return r[i].strip() if 0 <= i < len(r) else ""
    for r in rows[hi + 1:]:
        kc = cell(r, ic)
        if not kc:
            continue
        n += 1
        if kc in known:
            hit += 1
        con.execute(
            "INSERT INTO extra(kapt_code,fac,heat,ev,top,park_u,csv_at) VALUES(?,?,?,?,?,?,?)"
            " ON CONFLICT(kapt_code) DO UPDATE SET fac=excluded.fac,heat=excluded.heat,"
            " ev=excluded.ev,top=excluded.top,park_u=excluded.park_u,csv_at=excluded.csv_at",
            (kc, fac_codes(cell(r, ifac)), cell(r, iheat), to_int(cell(r, iev)),
             to_int(cell(r, itop)), to_int(cell(r, ipu)), today))
    con.commit()
    print(f"[엑셀] {n:,}개 단지 읽음 · API 목록과 일치 {hit:,}개 → extra", flush=True)


def geocode(con: sqlite3.Connection, key: str, budget: int) -> None:
    """도로명주소 → 위경도 (카카오 로컬). 이미 좌표 있는 단지는 건너뛴다."""
    rows = con.execute(
        "SELECT c.kapt_code, c.road_addr FROM complex c LEFT JOIN extra x ON x.kapt_code=c.kapt_code"
        " WHERE c.road_addr!='' AND (x.lat IS NULL)").fetchall()
    print(f"[좌표] 대상 {len(rows):,}개 · 이번 실행 {min(budget, len(rows)):,}개", flush=True)
    today = time.strftime("%Y-%m-%d")
    ok = miss = 0
    for i, (kc, addr) in enumerate(rows[:budget], 1):
        r = requests.get("https://dapi.kakao.com/v2/local/search/address.json",
                         params={"query": addr}, headers={"Authorization": "KakaoAK " + key}, timeout=TIMEOUT)
        if r.status_code == 429:
            time.sleep(2)
            continue
        if r.status_code != 200:
            sys.exit(f"카카오 {r.status_code}: {r.text[:200]}")
        docs = r.json().get("documents") or []
        if docs:
            lat, lng = float(docs[0]["y"]), float(docs[0]["x"])   # x가 경도, y가 위도
            con.execute("INSERT INTO extra(kapt_code,lat,lng,geo_at) VALUES(?,?,?,?)"
                        " ON CONFLICT(kapt_code) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,geo_at=excluded.geo_at",
                        (kc, lat, lng, today))
            ok += 1
        else:
            miss += 1
        if i % 500 == 0:
            con.commit()
            print(f"  {i}/{min(budget, len(rows))}", flush=True)
        time.sleep(0.03)
    con.commit()
    print(f"[좌표] 성공 {ok:,} · 주소 못 찾음 {miss:,}", flush=True)


# ── 진단 ────────────────────────────────────────────────────────────────────
def probe(key: str) -> None:
    """인증키가 살아있는지, 필드명이 코드와 맞는지 원시 XML로 확인한다."""
    # 키 자체는 절대 찍지 않는다. 모양만 알려줘도 403의 원인은 대부분 가려진다.
    print(f"[키] 길이 {len(key)}자 · 끝 3자 …{key[-3:]} · 공백/개행 없음: {key == key.strip()}")
    print("=" * 70)
    p = {"serviceKey": key, "sigunguCode": "11110", "pageNo": 1, "numOfRows": 3}
    print("① 시군구 아파트 목록 (11110 종로구)")
    print(fetch(LIST_SVC, p)[:2000])
    items, total = call(LIST_SVC, p)
    if not items:
        sys.exit("목록이 비었습니다 — 인증키 승인 여부를 확인하세요.")
    kc = pick(items[0], "kaptCode", "KAPT_CODE")
    print(f"\n파싱 OK · 항목 {len(items)}개 · totalCount {total} · 첫 단지코드 {kc}")

    # 코드가 읽는 필드가 응답에 실제로 있는지 확인한다. 이름이 어긋나면 수집은
    # 조용히 성공하면서 값만 전부 비는데, 3만 건을 다 받고 나서야 알게 된다.
    # 그래서 여기서 시끄럽게 실패시킨다.
    NEEDED = {
        "② 기본 정보조회": (BASS_SVC, {
            "세대수": ("kaptdaCnt", "kaptDaCnt", "hoCnt"),
            "사용승인일": ("kaptUsedate", "kaptUseDate"),
            "동수": ("kaptDongCnt",),
            "도로명주소": ("doroJuso", "kaptAddr"),
        }),
        "③ 상세 정보조회": (DTL_SVC, {
            "지하철역명": ("subwayStation",),
            "역 도보거리": ("kaptdWtimesub",),
            "교육시설": ("educationFacility",),
            "주차대수": ("kaptdPcnt",),
        }),
    }

    missing: list[str] = []
    for label, (url, needed) in NEEDED.items():
        print("=" * 70)
        print(f"{label}  kaptCode={kc}")
        q = {"serviceKey": key, "kaptCode": kc}
        print(fetch(url, q)[:3000])
        got, _ = call(url, q)
        if not got:
            missing.append(f"{label}: 응답이 비었음")
            continue
        keys = set(got[0])
        print(f"\n파싱 OK · 필드 {len(keys)}개")
        for ko, cands in needed.items():
            hit = next((c for c in cands if c in keys), None)
            print(f"  {'OK ' if hit else '없음'} {ko:<8} {hit or ' / '.join(cands)}")
            if not hit:
                missing.append(f"{label} {ko} — 후보 {cands} 중 없음")
        if missing:
            print("\n실제 응답 필드 전체:")
            print("  " + ", ".join(sorted(keys)))

    if missing:
        sys.exit("필드명 불일치:\n  - " + "\n  - ".join(missing))
    print("=" * 70)
    print("필드 확인 완료 — 본 수집(stage: daily)을 돌려도 됩니다.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.environ.get("APT_KEY", ""))
    ap.add_argument("--stage", choices=["list", "info"])
    ap.add_argument("--budget", type=int, default=4800,
                    help="상세기능당 이번 실행에서 쓸 호출 수 (일일 한도 5,000)")
    ap.add_argument("--sgg", nargs="*", help="특정 시군구코드만")
    ap.add_argument("--emit", action="store_true")
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--import-csv", metavar="FILE", help="K-apt 단지 기본정보 CSV로 extra 보강")
    ap.add_argument("--geocode", action="store_true", help="도로명주소 지오코딩 (KAKAO_REST_KEY)")
    a = ap.parse_args()

    if not a.key and (a.stage or a.probe):
        sys.exit("인증키가 없습니다. --key 또는 APT_KEY 환경변수를 지정하세요.")
    a.key = clean_key(a.key)

    if a.probe:
        probe(a.key)
        return

    con = db_open()
    if a.import_csv:
        import_csv(con, a.import_csv)
    if a.geocode:
        kk = os.environ.get("KAKAO_REST_KEY", "").strip()
        if not kk:
            sys.exit("KAKAO_REST_KEY 환경변수가 없습니다.")
        geocode(con, kk, a.budget)
    if a.stage == "list":
        stage_list(con, a.key, a.sgg)
    elif a.stage == "info":
        stage_info(con, a.key, a.budget)
    if a.emit:
        emit(con)
    if not (a.stage or a.emit or a.import_csv or a.geocode):
        ap.print_help()


if __name__ == "__main__":
    main()
