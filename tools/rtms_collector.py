#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
부비 · 예산별 아파트 — 국토교통부 실거래가 수집기

아파트 / 연립·다세대 / 오피스텔 매매 실거래가 3종 API를 전국 시군구 단위로 수집해서
"예산별 매물 리스트" 기능이 바로 조회할 수 있는 형태로 집계한다.

  python rtms_collector.py --key "<디코딩 인증키>" --months 12
  python rtms_collector.py --key "$RTMS_KEY" --months 6 --sido 서울특별시 경기도
  python rtms_collector.py --self-test          # 인증키 없이 파서/집계 로직만 검증

산출물
  rtms.db        SQLite. 원본 거래 + 수집 진행상황(재실행 시 이어받기)
  listings.json  단지 × 면적대별 최근 실거래가 집계 — 앱/서버가 서빙하는 데이터
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
from dataclasses import dataclass, asdict
from datetime import date
from threading import Lock

try:
    import requests
except ImportError:
    sys.exit("requests가 필요합니다:  pip install requests")

BASE = "https://apis.data.go.kr/1613000"

# ── 3종 API 정의 ────────────────────────────────────────────────────────────
# name_fields: 단지명이 담기는 필드. API마다 이름이 달라서 순서대로 탐색한다.
#              (문서/스펙이 개정돼도 깨지지 않도록 fallback 을 둔다)
SERVICES = {
    "apt": {
        "label": "아파트",
        "path": "RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev",
        "name_fields": ["aptNm", "aptName", "아파트"],
    },
    "rh": {
        "label": "연립·다세대",
        "path": "RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
        "name_fields": ["mhouseNm", "연립다세대"],
    },
    "offi": {
        "label": "오피스텔",
        "path": "RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",
        "name_fields": ["offiNm", "offiName", "단지"],
    },
}

HERE = os.path.dirname(os.path.abspath(__file__))
REGIONS_PATH = os.path.join(HERE, "regions.json")
DB_PATH = os.path.join(HERE, "rtms.db")
OUT_PATH = os.path.join(HERE, "listings.json")


# ── 정규화된 거래 레코드 ────────────────────────────────────────────────────
@dataclass
class Deal:
    htype: str        # apt / rh / offi
    sgg_code: str     # 법정동 시군구 5자리 (LAWD_CD)
    sido: str
    sgg: str
    umd: str          # 법정동명
    name: str         # 단지명
    area: float       # 전용면적 ㎡
    floor: int
    price: int        # 거래금액 (만원)
    deal_ymd: str     # YYYY-MM-DD
    build_year: int


def text(item: ET.Element, *keys: str) -> str:
    for k in keys:
        el = item.find(k)
        if el is not None and el.text and el.text.strip():
            return el.text.strip()
    return ""


def to_int(s: str, default: int = 0) -> int:
    s = (s or "").replace(",", "").replace(" ", "")
    try:
        return int(float(s))
    except ValueError:
        return default


def to_float(s: str, default: float = 0.0) -> float:
    s = (s or "").replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return default


class ApiError(RuntimeError):
    pass


def parse_page(xml_text: str, htype: str, sgg_code: str, sido: str, sgg: str) -> tuple[list[Deal], int, int]:
    """XML 한 페이지 → (유효 거래 리스트, totalCount, 이 페이지의 원본 item 수)

    원본 item 수를 따로 돌려주는 이유: 해제거래·금액0 건을 걸러내고 나면 len(deals) < item 수가
    되는데, 이걸 페이지 진행 기준으로 쓰면 totalCount에 영원히 도달하지 못해 무한 루프가 난다.
    """
    root = ET.fromstring(xml_text)

    code = text(root, "./header/resultCode", "./cmmMsgHeader/returnReasonCode")
    if code and code not in ("00", "000"):
        msg = text(root, "./header/resultMsg", "./cmmMsgHeader/returnAuthMsg", "./cmmMsgHeader/errMsg")
        raise ApiError(f"[{code}] {msg or '알 수 없는 오류'}")

    total = to_int(text(root, "./body/totalCount"), 0)
    name_keys = SERVICES[htype]["name_fields"]
    out: list[Deal] = []
    raw = 0

    for item in root.iterfind(".//item"):
        raw += 1
        # 해제된 거래는 제외 (cdealType == 'O')
        if text(item, "cdealType") == "O":
            continue

        price = to_int(text(item, "dealAmount", "거래금액"))
        if price <= 0:
            continue

        y = to_int(text(item, "dealYear", "년"))
        m = to_int(text(item, "dealMonth", "월"))
        d = to_int(text(item, "dealDay", "일"), 1)
        if not (y and m):
            continue

        out.append(Deal(
            htype=htype,
            sgg_code=sgg_code,
            sido=sido,
            sgg=sgg,
            umd=text(item, "umdNm", "법정동"),
            name=text(item, *name_keys) or "(단지명 없음)",
            area=to_float(text(item, "excluUseAr", "전용면적")),
            floor=to_int(text(item, "floor", "층")),
            price=price,
            deal_ymd=f"{y:04d}-{m:02d}-{min(max(d, 1), 31):02d}",
            build_year=to_int(text(item, "buildYear", "건축년도")),
        ))
    return out, total, raw


# ── 수집 ────────────────────────────────────────────────────────────────────
class Collector:
    def __init__(self, key: str, db: sqlite3.Connection, workers: int = 6,
                 timeout: int = 20, retries: int = 5, qps: float = 3.0):
        self.key = key
        self.db = db
        self.workers = workers
        self.timeout = timeout
        self.retries = retries
        self.min_interval = 1.0 / qps if qps > 0 else 0.0
        self.session = requests.Session()
        self._lock = Lock()
        self._last_call = 0.0
        self.stats = {"pages": 0, "deals": 0, "errors": 0}

    def _throttle(self):
        if self.min_interval <= 0:
            return
        with self._lock:
            wait = self._last_call + self.min_interval - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()

    def fetch(self, htype: str, lawd: str, ym: str, page: int = 1, rows: int = 1000) -> str:
        url = f"{BASE}/{SERVICES[htype]['path']}"
        params = {
            "serviceKey": self.key,      # 디코딩 키 — requests가 알아서 인코딩한다
            "LAWD_CD": lawd,
            "DEAL_YMD": ym,
            "pageNo": page,
            "numOfRows": rows,
        }
        last = None
        for attempt in range(self.retries):
            self._throttle()
            try:
                r = self.session.get(url, params=params, timeout=self.timeout)
                if r.status_code == 429 or "PER_SECOND" in r.text[:400]:
                    # 초당 요청제한(코드 23). 일일 쿼터와 무관하니 기다렸다 다시 친다.
                    time.sleep(0.8 * (attempt + 1))
                    last = "초당 요청제한 — 재시도"
                    continue
                if r.status_code in (401, 403):
                    # 인증키 문제 — 재시도해도 소용없으니 즉시 중단
                    raise ApiError(f"인증 거부 (HTTP {r.status_code}). "
                                   f"디코딩 키인지, 해당 API 활용신청이 승인됐는지 확인하세요.")
                r.raise_for_status()
                return r.text
            except ApiError:
                raise
            except Exception as e:                      # noqa: BLE001
                last = self._redact(e)
                time.sleep(1.5 * (attempt + 1))         # 지수 백오프
        raise ApiError(f"요청 실패 ({htype} {lawd} {ym}): {last}")

    def _redact(self, e: Exception) -> str:
        """오류 메시지에 인증키가 그대로 찍히지 않게 가린다 (로그 유출 방지)."""
        s = str(e)
        if self.key:
            s = s.replace(self.key, "***").replace(requests.utils.quote(self.key, safe=""), "***")
        return s

    def collect_one(self, htype: str, region: dict, ym: str) -> int:
        """(유형, 시군구, 연월) 하나를 전부 수집해 DB에 저장. 저장 건수 반환."""
        lawd, sido, sgg = region["code"], region["sido"], region["name"]
        deals, page, seen = [], 1, 0

        # 페이지 수를 numOfRows로 계산하지 않는다 — 서버가 rows를 임의로 축소해도
        # 데이터를 조용히 누락하지 않도록, 실제로 받은 건수로만 진행한다.
        while True:
            body = self.fetch(htype, lawd, ym, page=page)
            got, total, raw = parse_page(body, htype, lawd, sido, sgg)
            deals.extend(got)
            seen += raw
            self.stats["pages"] += 1
            if raw == 0 or seen >= total or page >= 200:
                break
            page += 1

        if deals:
            self.db.executemany(
                """INSERT OR REPLACE INTO deals
                   (htype,sgg_code,sido,sgg,umd,name,area,floor,price,deal_ymd,build_year)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                [(d.htype, d.sgg_code, d.sido, d.sgg, d.umd, d.name, d.area,
                  d.floor, d.price, d.deal_ymd, d.build_year) for d in deals],
            )
        self.db.execute("INSERT OR REPLACE INTO progress(htype,lawd,ym,n) VALUES (?,?,?,?)",
                        (htype, lawd, ym, len(deals)))
        self.db.commit()
        self.stats["deals"] += len(deals)
        return len(deals)

    def run(self, regions: list[dict], months: list[str], htypes: list[str]):
        done = {(h, l, y) for h, l, y in
                self.db.execute("SELECT htype,lawd,ym FROM progress")}
        jobs = [(h, r, ym)
                for h in htypes for r in regions for ym in months
                if (h, r["code"], ym) not in done]

        if not jobs:
            print("이미 모두 수집됨 — 집계 단계로 넘어갑니다.")
            return

        print(f"수집 대상 {len(jobs):,}건 "
              f"(유형 {len(htypes)} × 시군구 {len(regions)} × {len(months)}개월, "
              f"기수집 {len(done):,}건 제외)")

        t0 = time.time()
        with ThreadPoolExecutor(max_workers=self.workers) as ex:
            futs = {ex.submit(self.collect_one, h, r, ym): (h, r, ym) for h, r, ym in jobs}
            for i, fut in enumerate(as_completed(futs), 1):
                h, r, ym = futs[fut]
                try:
                    fut.result()
                except Exception as e:                  # noqa: BLE001
                    self.stats["errors"] += 1
                    print(f"  ! {SERVICES[h]['label']} {r['name']} {ym}: {e}", file=sys.stderr)
                if i % 50 == 0 or i == len(jobs):
                    el = time.time() - t0
                    eta = el / i * (len(jobs) - i)
                    print(f"  {i:,}/{len(jobs):,}  거래 {self.stats['deals']:,}건  "
                          f"오류 {self.stats['errors']}  ETA {eta/60:.1f}분")


# ── 집계 ────────────────────────────────────────────────────────────────────
AREA_BANDS = [(0, 40), (40, 60), (60, 85), (85, 102), (102, 135), (135, 200), (200, 10_000)]
AREA_LABELS = ["~40㎡", "40~60㎡", "60~85㎡", "85~102㎡", "102~135㎡", "135~200㎡", "200㎡~"]


def area_band(area: float) -> str:
    for (lo, hi), label in zip(AREA_BANDS, AREA_LABELS):
        if lo <= area < hi:
            return label
    return AREA_LABELS[-1]


def aggregate(db: sqlite3.Connection, out_path: str) -> int:
    """단지 × 면적대별 '가장 최근 거래' 한 건으로 압축한다.

    예산 슬라이더는 가격 하나에 매칭되므로, 같은 단지라도 면적대가 다르면
    다른 매물로 취급해야 한다 (예: 한남더힐 59㎡ 25억 vs 240㎡ 115억).
    """
    rows = db.execute("""
        SELECT htype, sgg_code, sido, sgg, umd, name, area, floor, price, deal_ymd, build_year
        FROM deals ORDER BY deal_ymd ASC
    """)

    best: dict[tuple, dict] = {}
    for (htype, sgg_code, sido, sgg, umd, name, area, floor, price, ymd, by) in rows:
        key = (htype, sgg_code, name, area_band(area))
        # deal_ymd 오름차순이라 뒤에 오는 값이 항상 더 최근 → 그대로 덮어쓰면 최신이 남는다
        best[key] = {
            "type": htype, "sggCode": sgg_code, "sido": sido, "sgg": sgg, "dong": umd,
            "name": name, "areaBand": area_band(area), "area": round(area, 1),
            "floor": floor, "price": price, "dealYm": ymd[:7], "buildYear": by,
        }

    listings = sorted(best.values(), key=lambda x: -x["price"])
    for i, it in enumerate(listings, 1):
        it["id"] = i

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(listings, f, ensure_ascii=False, separators=(",", ":"))
    return len(listings)


# ── 부속 ────────────────────────────────────────────────────────────────────
def init_db(path: str) -> sqlite3.Connection:
    db = sqlite3.connect(path, check_same_thread=False)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""CREATE TABLE IF NOT EXISTS deals(
        htype TEXT, sgg_code TEXT, sido TEXT, sgg TEXT, umd TEXT, name TEXT,
        area REAL, floor INTEGER, price INTEGER, deal_ymd TEXT, build_year INTEGER,
        PRIMARY KEY (htype, sgg_code, name, area, floor, price, deal_ymd))""")
    db.execute("""CREATE TABLE IF NOT EXISTS progress(
        htype TEXT, lawd TEXT, ym TEXT, n INTEGER, PRIMARY KEY (htype, lawd, ym))""")
    db.execute("CREATE INDEX IF NOT EXISTS idx_price ON deals(price)")
    db.commit()
    return db


def load_regions(sido_filter: list[str] | None, path: str = REGIONS_PATH) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    out = []
    for sido, items in data.items():
        if sido_filter and not any(s in sido for s in sido_filter):
            continue
        for it in items:
            out.append({"code": it["code"], "name": it["name"], "sido": sido})
    return out


def recent_months(n: int) -> list[str]:
    today = date.today()
    y, m, out = today.year, today.month, []
    for _ in range(n):
        out.append(f"{y:04d}{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return sorted(out)


SELF_TEST_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
<body><items>
<item><aptNm>래미안 원베일리</aptNm><dealAmount> 600,000</dealAmount><dealYear>2026</dealYear>
<dealMonth>6</dealMonth><dealDay>12</dealDay><excluUseAr>84.9</excluUseAr><floor>18</floor>
<umdNm>반포동</umdNm><buildYear>2023</buildYear></item>
<item><aptNm>래미안 원베일리</aptNm><dealAmount> 455,000</dealAmount><dealYear>2026</dealYear>
<dealMonth>5</dealMonth><dealDay>3</dealDay><excluUseAr>59.9</excluUseAr><floor>22</floor>
<umdNm>반포동</umdNm><buildYear>2023</buildYear></item>
<item><aptNm>해제된거래</aptNm><dealAmount>999,999</dealAmount><dealYear>2026</dealYear>
<dealMonth>4</dealMonth><dealDay>1</dealDay><excluUseAr>84.9</excluUseAr><floor>3</floor>
<umdNm>반포동</umdNm><cdealType>O</cdealType></item>
</items><totalCount>3</totalCount></body></response>"""


def self_test() -> int:
    deals, total, raw = parse_page(SELF_TEST_XML, "apt", "11650", "서울특별시", "서초구")
    assert total == 3 and raw == 3, (total, raw)
    assert len(deals) == 2, f"해제 거래가 걸러지지 않음: {len(deals)}"
    assert deals[0].price == 600000, deals[0].price          # " 600,000" 파싱
    assert deals[0].deal_ymd == "2026-06-12", deals[0].deal_ymd
    assert area_band(84.9) == "60~85㎡" and area_band(59.9) == "40~60㎡"

    db = init_db(":memory:")
    db.executemany("""INSERT OR REPLACE INTO deals VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                   [(d.htype, d.sgg_code, d.sido, d.sgg, d.umd, d.name, d.area,
                     d.floor, d.price, d.deal_ymd, d.build_year) for d in deals])
    # 같은 단지·같은 면적대의 과거 거래는 최신 것으로 덮여야 한다
    db.execute("""INSERT OR REPLACE INTO deals VALUES
                  ('apt','11650','서울특별시','서초구','반포동','래미안 원베일리',
                   84.9,5,520000,'2025-01-10',2023)""")
    db.commit()
    out = os.path.join(HERE, "_selftest_listings.json")
    n = aggregate(db, out)
    got = {(x["name"], x["areaBand"]): x["price"] for x in json.load(open(out, encoding="utf-8"))}
    os.remove(out)
    assert n == 2, n
    assert got[("래미안 원베일리", "60~85㎡")] == 600000, got   # 최신 거래가 남았는지
    assert got[("래미안 원베일리", "40~60㎡")] == 455000, got

    err = "<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED ERROR</resultMsg></header></response>"
    try:
        parse_page(err, "apt", "11110", "서울특별시", "종로구")
    except ApiError as e:
        assert "30" in str(e)
    else:
        raise AssertionError("인증키 오류가 감지되지 않음")

    print("self-test 통과 — 파싱 / 해제거래 제외 / 면적대 분리 / 최신거래 집계 / 오류감지 OK")
    return 0


def shard(listings: list[dict], out_dir: str) -> int:
    """시군구별 파일 + index.json 으로 쪼갠다.
       한 파일이 통째로 8MB면 모바일에서 못 쓴다. 지역당 평균 70KB로 나눈다."""
    import collections, shutil
    os.makedirs(out_dir, exist_ok=True)
    for old in glob_json(out_dir):
        os.remove(old)
    buckets: dict[str, list[dict]] = collections.defaultdict(list)
    for it in listings:
        buckets[it["sggCode"]].append({"t": it["type"], "n": it["name"], "d": it["dong"],
                                       "a": it["area"], "f": it["floor"], "p": it["price"], "m": it["dealYm"],
                                       # 건축년도는 실거래 API가 이미 주는 값이다. 추천의 '연식' 요소가
                                       # 이걸 쓰므로 버리지 말 것 (없는 건은 키를 빼서 용량을 아낀다).
                                       **({"y": it["buildYear"]} if it.get("buildYear") else {})})
    index = {}
    for code, items in buckets.items():
        items.sort(key=lambda x: -x["p"])
        with open(os.path.join(out_dir, f"{code}.json"), "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, separators=(",", ":"))
        src = next(x for x in listings if x["sggCode"] == code)
        index[code] = {"sido": src["sido"], "sgg": src["sgg"], "n": len(items)}
    with open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"updated": date.today().isoformat(), "months": 12,
                   "source": "국토교통부 실거래가 (아파트·연립다세대·오피스텔 매매)",
                   "regions": index}, f, ensure_ascii=False, separators=(",", ":"))
    return len(index)


def glob_json(d: str) -> list[str]:
    import glob as _g
    return _g.glob(os.path.join(d, "*.json"))


def main() -> int:
    p = argparse.ArgumentParser(description="국토부 실거래가 3종 수집기 (아파트/연립다세대/오피스텔)")
    p.add_argument("--key", default=os.environ.get("RTMS_KEY"), help="공공데이터포털 디코딩 인증키")
    p.add_argument("--months", type=int, default=12, help="최근 N개월 (기본 12)")
    p.add_argument("--sido", nargs="*", help="시도 필터 (예: 서울특별시 경기도). 생략 시 전국")
    p.add_argument("--types", nargs="*", default=list(SERVICES), choices=list(SERVICES))
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--qps", type=float, default=3.0, help="초당 요청 상한 (초당 제한이 빡빡해 3 이하 권장)")
    p.add_argument("--out", default=OUT_PATH)
    p.add_argument("--regions", default=REGIONS_PATH, help="시군구 코드표 경로")
    p.add_argument("--shard-dir", help="지정하면 시군구별 파일로 쪼개 저장 (예: data/listings)")
    p.add_argument("--db", default=DB_PATH)
    p.add_argument("--aggregate-only", action="store_true", help="수집 없이 집계만")
    p.add_argument("--self-test", action="store_true", help="인증키 없이 로직만 검증")
    a = p.parse_args()

    if a.self_test:
        return self_test()

    # 포털에는 Encoding 키와 Decoding 키가 나란히 있고, 눈으로는 구분이 잘 안 된다.
    # requests가 params를 다시 인코딩하므로 Encoding 키를 그대로 넣으면 이중 인코딩돼 403이 난다.
    # '%'가 보이면 Encoding 키로 보고 한 번 풀어준다.
    if a.key and "%" in a.key:
        from urllib.parse import unquote
        a.key = unquote(a.key)
        print("· Encoding 키로 판단해 자동 디코딩했습니다.")

    db = init_db(a.db)

    if not a.aggregate_only:
        if not a.key:
            print("인증키가 필요합니다.  --key 또는 환경변수 RTMS_KEY\n"
                  "  발급: https://www.data.go.kr  →  '아파트 매매 실거래가 상세 자료' 등 3종 활용신청",
                  file=sys.stderr)
            return 2
        regions = load_regions(a.sido, a.regions)
        months = recent_months(a.months)
        print(f"시군구 {len(regions)}곳 × {len(months)}개월 × 유형 {len(a.types)}종")
        Collector(a.key, db, workers=a.workers, qps=a.qps).run(regions, months, a.types)

    n = aggregate(db, a.out)
    if a.shard_dir:
        with open(a.out, encoding="utf-8") as f:
            regions_n = shard(json.load(f), a.shard_dir)
        print(f"· 시군구별 {regions_n}개 파일로 분할 → {a.shard_dir}/")
    total = db.execute("SELECT COUNT(*) FROM deals").fetchone()[0]
    print(f"\n원본 거래 {total:,}건 → 단지×면적대 {n:,}건 집계 → {a.out}")
    for h, label in [(k, v["label"]) for k, v in SERVICES.items()]:
        c = db.execute("SELECT COUNT(*) FROM deals WHERE htype=?", (h,)).fetchone()[0]
        print(f"  {label:<8} {c:,}건")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
