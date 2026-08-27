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


def fetch(url: str, params: dict) -> str:
    last = None
    for attempt in range(RETRIES):
        try:
            r = requests.get(url, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            return r.text
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
"""


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
            xml = fetch(LIST_SVC, {"serviceKey": key, "sigunguCode": code,
                                   "pageNo": page, "numOfRows": 1000})
            root = ET.fromstring(xml)
            check(root)
            items = list(root.iterfind(".//item"))
            for it in items:
                kc = text(it, "kaptCode", "KAPT_CODE")
                if not kc:
                    continue
                rows.append((
                    kc, code,
                    text(it, "kaptName", "KAPT_NAME", "kaptNm"),
                    text(it, "as1"), text(it, "as2"), text(it, "as3"), text(it, "as4"),
                    text(it, "bjdCode", "BJD_CODE"),
                ))
            total = to_int(text(root, "./body/totalCount"))
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
            xml = fetch(url, {"serviceKey": key, "kaptCode": kc})
            root = ET.fromstring(xml)
            check(root)
            item = root.find(".//item")
            with lock:
                # 응답이 비어도 done 처리한다. 안 그러면 폐지된 단지에 매일 예산을 태운다.
                if item is not None:
                    apply_row(kc, item)
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

    def apply_bass(kc: str, it: ET.Element) -> None:
        con.execute(
            "UPDATE complex SET households=?,dong_cnt=?,use_date=?,road_addr=?,"
            "builder=?,hall_type=?,sale_type=? WHERE kapt_code=?",
            (to_int(text(it, "kaptdaCnt", "kaptDaCnt", "hoCnt")),
             to_int(text(it, "kaptDongCnt")),
             text(it, "kaptUsedate", "kaptUseDate"),
             text(it, "doroJuso", "kaptAddr"),
             text(it, "kaptBcompany"),
             text(it, "codeHallNm"),
             text(it, "codeSaleNm"),
             kc))

    def apply_dtl(kc: str, it: ET.Element) -> None:
        con.execute(
            "UPDATE complex SET subway_line=?,subway_stn=?,subway_min=?,bus_min=?,"
            "edu=?,park_cnt=?,cctv_cnt=? WHERE kapt_code=?",
            (text(it, "subwayLine"),
             text(it, "subwayStation"),
             text(it, "kaptdWtimesub"),
             text(it, "kaptdWtimebus"),
             text(it, "educationFacility"),
             to_int(text(it, "kaptdPcnt")) + to_int(text(it, "kaptdPcntu")),
             to_int(text(it, "kaptdCccnt")),
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
            "SELECT name,umd,households,use_date,subway_stn,subway_min,bus_min,"
            "park_cnt,builder,dong_cnt FROM complex"
            " WHERE sgg_code=? AND bass_done=1", (sgg,)
        ):
            (name, umd, hh, use, stn, smin, bmin, park, builder, dong) = r
            if not name:
                continue
            rec = {"n": name, "d": umd or ""}
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
            out.append(rec)
        if not out:
            continue
        path = os.path.join(OUT_DIR, f"{sgg}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        total += len(out)
    print(f"[산출] {len(sggs)}개 시군구 · 단지 {total:,}개 → {OUT_DIR}", flush=True)


# ── 진단 ────────────────────────────────────────────────────────────────────
def probe(key: str) -> None:
    """인증키가 살아있는지, 필드명이 코드와 맞는지 원시 XML로 확인한다."""
    print("=" * 70)
    print("① 시군구 아파트 목록 (11110 종로구)")
    xml = fetch(LIST_SVC, {"serviceKey": key, "sigunguCode": "11110",
                           "pageNo": 1, "numOfRows": 3})
    print(xml[:2000])
    root = ET.fromstring(xml)
    check(root)
    it = root.find(".//item")
    if it is None:
        sys.exit("목록이 비었습니다 — 인증키 승인 여부를 확인하세요.")
    kc = text(it, "kaptCode", "KAPT_CODE")
    print(f"\n첫 단지코드: {kc}")

    for label, url in (("② 기본 정보조회", BASS_SVC), ("③ 상세 정보조회", DTL_SVC)):
        print("=" * 70)
        print(f"{label}  kaptCode={kc}")
        print(fetch(url, {"serviceKey": key, "kaptCode": kc})[:3000])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.environ.get("APT_KEY", ""))
    ap.add_argument("--stage", choices=["list", "info"])
    ap.add_argument("--budget", type=int, default=4800,
                    help="상세기능당 이번 실행에서 쓸 호출 수 (일일 한도 5,000)")
    ap.add_argument("--sgg", nargs="*", help="특정 시군구코드만")
    ap.add_argument("--emit", action="store_true")
    ap.add_argument("--probe", action="store_true")
    a = ap.parse_args()

    if not a.key and (a.stage or a.probe):
        sys.exit("인증키가 없습니다. --key 또는 APT_KEY 환경변수를 지정하세요.")

    if a.probe:
        probe(a.key)
        return

    con = db_open()
    if a.stage == "list":
        stage_list(con, a.key, a.sgg)
    elif a.stage == "info":
        stage_info(con, a.key, a.budget)
    if a.emit:
        emit(con)
    if not (a.stage or a.emit):
        ap.print_help()


if __name__ == "__main__":
    main()
