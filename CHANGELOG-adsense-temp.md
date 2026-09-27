# 애드센스 재심사 대비 변경 기록

**기준 커밋 (작업 시작 시점 main):** `1a9d5e3016ed76b87c2f55f3e5cb17e9474956ae`
**작업일:** 2026-09-27
**거절 사유:** ① 복제된 콘텐츠가 있는 화면에 Google 게재 광고 ② 가치가 별로 없는 콘텐츠

승인이 확인되면 이 문서를 보고 **`[adsense-temp]` 커밋만** 되돌린다.
`[adsense-keep]` 커밋과 그 사이에 들어간 자동 커밋(`chore: auto update …`, `청약 공고 자동 갱신 …`)은 **되돌리지 않는다.**
되돌리기 전에 사용자에게 한 번 더 확인할 것.

---

## 커밋 목록

| 커밋 | 제목 | 처리 |
|---|---|---|
| `d494523` | `[adsense-temp]` 임대공고 게시판을 자동 갱신으로 + 유형 해설·FAQ | 부분 복구 (아래 표 참조) |
| `c5c5298` | `[adsense-temp]` 캘린더 본문을 320자에서 19,000자로 | 부분 복구 |
| `136896c` | `[adsense-temp]` 계산기 8개에 계산 근거·예시 2개·FAQ 추가 | **전부 복구 대상** |
| (아래) | `[adsense-keep]` 중복 파일 index_1.html·sitemap_1.xml 삭제 | **유지** |

> 주의: `d494523`과 `c5c5298`은 한 커밋 안에 복구 대상과 유지 대상이 섞여 있다.
> `git revert` 로 통째로 되돌리면 안 되고, 아래 파일별 표대로 손으로 골라내야 한다.

---

## 파일별 변경 내역

### 1. `rental-board.html` — 복구 대상 / 유지 **혼재**

| 변경 | 전 | 후 | 처리 |
|---|---|---|---|
| 손으로 박아둔 공고 12건 | HTML에 하드코딩, 대부분 마감됨, `[신규]` 표시 잔존 | 삭제. 목록은 `rental-data.json`에서만 렌더 | **유지** |
| "마지막 업데이트" | `2026년 8월 31일` 고정 문자열 | `#rbUpdated` — 수집기가 찍고, 화면에서도 `updatedAt`을 읽어 분 단위 표시 | **유지** |
| 마감 공고 처리 | 없음 (마감돼도 그대로 노출) | 수집기가 1차로 거르고, 남으면 회색 `접수 마감` 배지로 목록 맨 아래 분리 | **유지** |
| JSON-LD `dateModified` | `2026-08-31` 고정 | 수집기가 갱신 | **유지** |
| 상시 접수 3건 | 마감 공고들 사이에 섞여 있음 | `연중 상시 접수` 섹션으로 분리 | **유지** |
| 공공임대 6유형 설명 섹션 | 없음 | 행복주택·국민임대·영구임대·통합공공임대·매입임대·전세임대 각 문단 | **복구 대상** |
| 공고 카드별 유형 해설 | 없음 | `TIP` 객체 + 자격판정 링크 (렌더 스크립트 내) | **복구 대상** |
| FAQ | 없음 | `<details class="faq">` 6개 | **복구 대상** |
| JSON-LD `description` | 기존 문구 | 확장 문구 | **복구 대상** |

> 복구 시: `<!-- adsense-temp:types-start ~ end -->`, `<!-- adsense-temp:faq-start ~ end -->` 블록을 지우고,
> 렌더 스크립트의 `TIP` / `LINK` 상수와 카드 템플릿의 `(tip? … :'')` 줄만 제거하면 된다.
> **`#rbUpdated` 관련 로직과 마감 분리 로직은 절대 지우지 말 것.**

### 2. `collect-rental.mjs` — **유지**

`stampBoard(count)` 함수 추가. 수집이 끝나면 `rental-board.html`의 JSON-LD `dateModified`와
`#rbUpdated` 문구를 그날 날짜·건수로 찍는다. 이게 없으면 "마지막 업데이트" 날짜가 다시 낡는다.

### 3. `hwon-ui.js` — **유지** (버그 수정)

`initReveal()`의 IntersectionObserver `threshold: 0.08` → `threshold: [0, 0.08]`.
화면보다 큰 블록은 8%가 한 번에 보일 수 없어 `isIntersecting`이 영원히 false였고,
그 블록은 `opacity:0`인 채로 남았다. 공고 82건이 들어간 28,000px 박스가 통째로 안 보였다.
**애드센스와 무관한 실제 버그 수정이므로 되돌리면 안 된다.**

### 4. `calendar.html` — 복구 대상 / 유지 **혼재**

| 변경 | 전 | 후 | 처리 |
|---|---|---|---|
| 크롤러가 읽는 본문 | 320자 | 19,105자 | — |
| `<!-- cal-static -->` 블록 | 없음 | 이번 달·다음 달 일정을 정적 HTML로 (2026-09-27 기준 235건) | **유지** |
| `.cal-static` CSS | 없음 | 추가 | **유지** (위 블록이 쓰는 스타일) |
| JSON-LD `dateModified` | **없었음** | 추가, 빌드 시 갱신 | **유지** |
| `이 캘린더에 뭐가 들어가나요` 해설 | 없음 | 청약/임대/금리/세금/공휴일 5개 문단 | **복구 대상** |
| FAQ | 없음 | 5개 | **복구 대상** |
| JSON-LD `description` | 짧은 문구 | 확장 문구 | **복구 대상** |

> 복구 시: `<!-- adsense-temp:cal-guide-start ~ end -->` 블록만 지운다.
> **`<!-- cal-static start ~ end -->`와 `.cal-static` CSS는 남겨둘 것.**

### 5. `build-cheongyak-static.mjs` — **유지**

`buildCalendar()` 함수 추가. `calendar-events.json` · `cheongyak-data.json` ·
`cheongyak-featured.json` · `rental-data.json`에서 이번 달·다음 달 일정을 모아
`calendar.html`의 `cal-static` 블록과 `dateModified`를 갱신한다.
`cheongyak-extra` 워크플로가 하루 두 번(KST 07:00 / 22:00) 실행한다.

### 6. `cheongyak-board.html` — **유지** (자동 생성 결과물)

위 스크립트를 돌리면서 `cy-static` 블록이 그날 데이터로 다시 찍혔다. 내용 변경이 아니라 갱신이다.

### 7. 계산기 8개 — **전부 복구 대상**

각 파일에 `<!-- adsense-temp:basis-start ~ end -->`(계산 근거 + 예시 2개)와
`<!-- adsense-temp:faq-start ~ end -->`(FAQ 3개) 블록을 삽입했다. 그 두 블록만 지우면 원상복구된다.
계산 로직·입력폼·기존 문구는 **한 줄도 건드리지 않았다.**

| 파일 | 본문 전 | 본문 후 | 추가한 것 |
|---|---|---|---|
| `brokerage-calculator.html` | 1,363자 | 3,234자 | 공인중개사법 시행규칙 별표1 요율표 2개, 월세 환산보증금 식, 예시 2, FAQ 3 |
| `loan-calculator.html` | 1,696자 | 3,885자 | 상환 3방식 수식, DSR 40/50%, 스트레스 DSR 미반영 고지, 예시 2, FAQ 3 |
| `jeonse-monthly.html` | 1,342자 | 3,196자 | 주임법 제7조의2·시행령 제9조, 갱신 5% 상한, 예시 2, FAQ 3 |
| `yield-calculator.html` | 1,470자 | 3,563자 | 표면/실질 수식, 기타비용 항목, 예시 2, FAQ 3 |
| `housing-pension.html` | 1,076자 | 2,873자 | HF 2026.3 연령별 지급표, 가입 요건, 예시 2, FAQ 3 |
| `downsizing-tax.html` | 631자 | 3,016자 | 소득세법 시행령 제154조, 장특공제 표2, 양도세 누진표, 예시 2, FAQ 3 |
| `seller-financing-calc.html` | 844자 | 3,122자 | 상증세법 제41조의4, 무이자 한도 2.17억, 예시 2, FAQ 3 |
| `auction-yield.html` | 564자 | 3,088자 | 취득가액·보유비용 분해, 단기 양도세 70%, 예시 2, FAQ 3 |

### 8. `index_1.html` · `sitemap_1.xml` 삭제 — **유지**

| 파일 | 정체 | 처리 |
|---|---|---|
| `index_1.html` | `index.html`과 본문 **99.2% 동일**한 홈페이지 복사본. canonical은 `https://boobi.ai.kr/`를 가리키는데 **애드센스 스크립트가 그대로 박혀 있었다.** 사이트맵·robots·내부 링크 어디에서도 참조되지 않는 고아 파일 | **삭제 · 유지** |
| `sitemap_1.xml` | 2026-09-06 기준 옛 사이트맵 복사본(117 URL). `robots.txt`는 `sitemap.xml`만 가리킴 | **삭제 · 유지** |

> **이게 거절 사유 ①에 직접 해당한다.** 복제된 홈페이지에 광고가 실려 있었다.
> 승인 후에도 절대 되살리지 말 것.

---

## 되돌리는 방법

```bash
# 1) 이 문서의 '복구 대상' 표대로 블록 주석을 찾아 제거
grep -rn "adsense-temp:" --include='*.html' .

# 2) 계산기 8개는 블록 두 개씩만 지우면 끝
#    <!-- adsense-temp:basis-start --> ~ <!-- adsense-temp:basis-end -->
#    <!-- adsense-temp:faq-start -->   ~ <!-- adsense-temp:faq-end -->

# 3) rental-board.html · calendar.html 은 위 파일별 표를 보고 골라낼 것
#    (cal-static / rbUpdated / 마감 분리 / stampBoard 는 남긴다)

# 4) 이 문서 자체도 함께 삭제
```

## 사이트맵 제외

`CHANGELOG-adsense-temp.md`는 `sitemap.xml`에 넣지 않는다. 내부 기록이고 색인 대상이 아니다.
