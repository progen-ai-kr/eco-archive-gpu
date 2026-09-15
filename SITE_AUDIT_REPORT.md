# ECHO ARCHIVE 사이트 전체 감사 리포트

작성일: 2026-09-16
감사 대상: `main` @ `bd0c3bb` (PR #20 products 룩북, #21 About 모션, #22 product 안정화 반영 후)
방법: Playwright로 6개 페이지 × 390 / 768 / 1440px 실측 + 원본 CSS/JS 정적 분석 + 레퍼런스 사이트 원본 코드 분석
중점: **UI / UX**

---

## 0. 요약 — 가장 중요한 문제 10가지

| # | 심각도 | 문제 | 영향 | 이번 PR 처리 |
|---|---|---|---|---|
| 1 | **Critical** | `--stage-ink-faint` 명암비 **2.09:1** (WCAG AA 4.5:1 미달) | 6개 페이지 전부, 페이지당 2~7건 | ✅ 수정 |
| 2 | **Critical** | 홈 모바일에서 About·Portfolio **도달 불가** | 사이트 절반이 모바일에서 사실상 비노출 | ✅ 수정 |
| 3 | **High** | 푸터 링크 터치 타깃 **23px** (44px 미달) | 6개 페이지 전부 | ✅ 수정 |
| 4 | **High** | products.html 헤딩 `h1 → h3` 건너뛰기 | 스크린리더 위계 붕괴 | ✅ 수정 |
| 5 | **High** | product.html 관련 제품 `h3`에 상위 `h2` 없음 | 동일 | ✅ 수정 |
| 6 | **Medium** | 홈 nav 링크 터치 타깃 12~16px | 모바일 오터치 | ✅ 수정 |
| 7 | **Medium** | 홈 TV 장식(꼬리·날개)이 뷰포트 밖으로 잘림 | 모바일 462px / 태블릿 935px | ✅ 수정 |
| 8 | **Low** | contact 장식 화살표가 태블릿에서 어정쩡하게 남음 | 768px 한정 | ✅ 수정 |
| 9 | **Low** | `scripts/components/echo-tv-wall.js` 죽은 코드 | 유지보수 혼란 | ✅ 삭제 |
| 10 | **—** | `products.json`에 "치킨" 더미 데이터가 EP.01로 노출 | 브랜드 신뢰도 | ❌ 보호 파일 — CMS 작업 필요 |

---

## 1. 페이지별 피드백

### 1-1. `index.html` — 홈 (TV 월)

**좋은 점**
- TV 4개 + BGM 버튼을 CSS 그라데이션과 인라인 SVG만으로 그려 자산 의존이 없고, 클릭·호버·`aria-pressed`에 반응할 수 있는 구조. 이미지 합성본을 쓰지 않은 결정이 옳다.
- 모바일에서 BGM을 그리드에서 빼 우하단 고정 원형 버튼으로 돌린 처리가 명확하다.
- `overflow-x: hidden`으로 장식 오버플로가 가로 스크롤로 이어지지 않게 막아둔 점.

**문제**
1. **(Critical) 모바일 내비게이션 누락** — `.home-nav`에 `ALL LOOKS`·`CONTACT` 2개만 하드코딩돼 있었다. 데스크톱은 TV 화면을 눌러 About/Portfolio로 갈 수 있지만, 모바일에서는 TV가 2×2로 재배치되며 그 경로가 좁아져 **두 페이지에 도달할 방법이 사실상 없었다.** 홈에는 서브페이지의 `.nav-toggle`(☰)도 없어 내비게이션 방식 자체가 어긋난다.
   → 4개 링크를 모두 노출하도록 수정. 클릭 테스트로 `about.html` 이동 확인.
2. **(Medium) 장식 오버플로** — `.tv-decor-tail`이 `left: 96.29%; width: 54.64%`, `.tv-decor-wing-back`이 `left: -62.57%; width: 65.71%`로 자기 TV 밖으로 폭의 절반 이상 뻗는다. 데스크톱 1586×992 캔버스에서는 여유가 있지만 2×2 그리드에서는 뷰포트를 넘어 **잘려 보인다**(390px→462px, 768px→935px).
   → 좁은 화면에서 안쪽으로 당김(`left: 82%/-34%`, `width: 34%/40%`). 390px에서 402px로 개선.
3. **(Medium) nav 터치 타깃** — `font: clamp(9px,.82cqw,12px)`에 패딩이 없어 실제 높이가 12~16px. → `min-height: 44px`.
4. **(Low) 푸터 아래 빈 공간** — 모바일에서 푸터와 BGM 버튼 사이에 큰 여백이 남는다. 미수정(레이아웃 재설계 범위).
5. **(정보) 헤딩이 `<h1>` 하나뿐** — TV 4개가 링크지만 접근성 트리에 구조적 맥락이 없다. `aria-label`은 있으므로 치명적이지 않으나, 향후 TV 월을 `<nav>` 또는 목록으로 감싸면 스크린리더 탐색이 나아진다.

---

### 1-2. `about.html` — 브랜드 서사 (스크롤 연출)

**좋은 점**
- 헤딩 위계가 6개 페이지 중 가장 정확하다(`h1` 1개 + `h2` 5개, 순서 정상).
- CSS `animation-timeline: view()`를 쓴 스크롤 연출이 **컴포지터 스레드에서 실행**돼 2026 기준에 부합한다(§3 참조). GSAP 없이 구현한 것이 정책상·성능상 모두 옳다.
- `prefers-reduced-motion: reduce`에서 전 장면이 `opacity: 1 / filter: none`으로 즉시 정상화됨을 실측 확인. 이 대응이 실제로 작동하는 페이지는 여기뿐이다.
- 가로 스크롤 없음, 콘솔 에러 0.

**문제**
1. **(Low) 진행 인디케이터 터치 타깃** — `01/05` 세로 인덱스 링크가 20px. 미수정(About 전용 컴포넌트라 다른 세션 작업과 충돌 위험).

**⚠️ 오판 주의 — 버그가 아닌 것**
`fullPage: true` 스크린샷에서 `.about-archive-card`가 **1835px까지 뻗고 본문 대부분이 흐리게** 찍힌다. 이것을 오버플로 버그 + 모션 고장으로 판단하기 쉽지만, **실제 휠 스크롤에서는 재현되지 않는다**:
- `document.documentElement.scrollWidth` = **1440** (뷰포트와 동일)
- 카드 실제 위치: `left: 43px, right: 473px`
- 실제 스크롤 후 전 장면: `opacity: 1.00, filter: none`

원인은 `animation-timeline: view()`가 **프로그래매틱 캡처(`fullPage`, `window.scrollTo`)에서 갱신되지 않는** 것이다. 스크롤 진행도 기반이라 실제 스크롤 이벤트가 필요하다. 향후 검증 시 `page.mouse.wheel()`을 쓸 것.

---

### 1-3. `products.html` — 제품 목록 (룩북)

**좋은 점**
- PR #20의 세로형 룩북 전환이 잘 반영됐다. 사진 3:4 통일 + `object-fit: cover`로 같은 줄 카드 높이가 정확히 일치(774/774/774px).
- `aspect-ratio`로 이미지 로드 전 높이가 확정돼 CLS가 없다.
- 카테고리 필터 칩이 동작하고 `aria-pressed`로 상태를 노출한다.
- 이미지 전체를 깨뜨려도 레이아웃이 유지된다(실측 확인).

**문제**
1. **(High) 헤딩 건너뛰기** — 카드 제목이 `h3`인데 중간 `h2`가 없어 `h1 → h3`로 뛴다.
   → 목록 섹션에 `<h2 class="sr-only">제품 목록</h2>` 추가. 화면에는 이미 "ALL LOOKS" 헤드가 있어 중복이므로 스크린리더 전용으로 처리. 결과: `h1 → h2 → h3 ×4`.
2. **(Critical, 공통) 라벨 명암비** — `FILTER`(10px), `NEW`·`WOMEN · CARDIGAN`·`MEN · KNIT`·`WOMEN · JACKET`(11px) 전부 2.09:1. 가장 실패 건수가 많은 페이지(7건).
   → 토큰 수정으로 해소.
3. **(외부 데이터) "치킨" 더미 제품** — `products.json`에 `{ name: "치킨", summary: "맛잇", price: 20000 }`이 EP.01로 첫 카드에 노출 중이다. 패션 브랜드 룩북 첫 칸에 치킨 사진이 있는 상태.
   → **`products.json`은 보호 파일이라 코드로 수정 불가.** 관리자 CMS(`/admin`)에서 삭제하거나 비공개 처리해야 한다. **가장 눈에 띄는 브랜드 신뢰도 이슈이므로 우선 처리 권장.**

---

### 1-4. `product.html` — 제품 상세

**좋은 점**
- 캐러셀·구매 다이얼로그가 `[data-*]` 속성 계약으로 분리돼 있어 스타일 변경에 안전하다.
- PR #22로 null 가드가 보강됐다.
- `.tv-frame` 금색 프레임이 상세 페이지에서는 제품 사진을 액자처럼 감싸 목적이 분명하다(목록에서는 제거했지만 여기서는 유지가 맞다).

**문제**
1. **(High) 헤딩 위계** — 관련 제품 카드가 `h3`인데 그 섹션의 제목이 `<p class="eyebrow">다음 신호</p>`였다. `h1 → h3`로 건너뛴다.
   → `<h2 class="eyebrow related-episodes-title">`로 변경. `.section h2`의 대형 이탤릭 스타일이 덮어쓰지 않도록 `.section h2.related-episodes-title`로 되돌리는 규칙 추가(시각적 변화 없음). 결과: `h1 → h2 → h3 ×2`.
2. **(Critical, 공통) 10~11px 텍스트 명암비** — `WOMEN · CARDIGAN`, 소재 정보(`아이보리 · 그레이 · 네이비 · 울 블렌딩`), `PREV/NEXT EPISODE`. → 토큰 수정으로 해소.
3. **(정보) `구매 안내` h2는 위계 위반이 아님** — 감사 초기에 `h1→h3→h3→h2` 역전으로 보였으나, 이 `h2`는 `<dialog>` 내부라 별도 접근성 컨텍스트다. 수정 불필요.

---

### 1-5. `portfolio.html` — 포트폴리오

**좋은 점**
- 6개 페이지 중 구조가 가장 단순하고 안정적이다(`h1` + `h2`, 콘솔 에러 0, 오버플로 없음).
- `portfolio.json`의 리치 텍스트를 `catalog.js`의 `sanitizeRichText`로 정화해 렌더하므로 XSS 경로가 차단돼 있다.
- 빈 상태(`.portfolio-content.is-empty`)가 별도 처리돼 있다.

**문제**
1. **(Critical, 공통) `NEXT SIGNAL` 라벨 명암비** — 2.09:1. → 토큰 수정으로 해소. (이 페이지는 실패가 3건으로 가장 적었다.)
2. **(정보) 콘텐츠 의존도가 높다** — 페이지 품질이 `portfolio.json` 내용에 거의 전적으로 달려 있다. 코드 측면에서 더 손댈 것은 많지 않다.

---

### 1-6. `contact.html` — 문의

**좋은 점**
- PR #18 개편이 잘 반영됐다. 불필요한 텍스트(시즌 표기, 3카드 창구 안내)를 걷어내고 정보 목록만 남긴 판단이 옳다 — 실제로 이메일 하나로만 받는데 여러 창구가 있는 것처럼 안내하지 않는다.
- `Channel Info`를 목록 폭에 맞춰 중앙 정렬한 처리가 깔끔하다.
- 미니멀 구분선 리스트가 알약 카드보다 브랜드 톤에 맞는다.

**문제**
1. **(Low) 장식 화살표 브레이크포인트** — `.contact-arrow`가 `max-width: 719px`에서만 숨겨져 **768px(태블릿)에서는 남는다.** 링크가 아닌 순수 장식인데 라벨/값 간격이 좁아진 태블릿에서 잡음이 된다.
   → 숨김 기준을 `max-width: 899px`로 올림.
2. **(Critical, 공통) 화살표·푸터 명암비** — → 토큰 수정으로 해소.

---

## 2. 이번 PR에서 수정한 내역

### 2-1. 명암비 토큰 (Critical → 해소)

```css
/* style.css :root */
- --stage-ink-faint: rgba(18, 18, 18, 0.32);   /* 2.09:1 — AA 미달 */
+ --stage-ink-faint: rgba(18, 18, 18, 0.58);   /* 약 4.6:1 — AA 통과 */
```

이 토큰의 **13개 사용처가 전부 실제 텍스트**임을 확인한 뒤 전역 수정했다(순수 장식 용도가 하나도 없었다): `.channel-code`, `.channel-stamp`, `.section .eyebrow`, `.k`, `.filter-rail-label`, `.card-placeholder h3`, `.product-info .k`, `.product-keywords`, `.product-carousel-count`, `.purchase-dialog-eyebrow`, `.portfolio-status`, `.contact-arrow`, `.footer`, `.home-footer`.

**결과: 6개 페이지 × 3개 뷰포트 = 18개 조합에서 명암비 실패 0건** (수정 전 페이지당 2~7건).
시각적 위계가 무너지지 않았는지 전수 스크린샷으로 확인 — 라벨이 제품명보다 여전히 명확히 부차적으로 보인다.

### 2-2. 홈 모바일 내비게이션 (Critical → 해소)

`index.html`의 `.home-nav`에 `ABOUT`·`PORTFOLIO` 링크 추가(기존 2개 → 4개). 모바일에서 실제 클릭 → `about.html` 이동 확인.

### 2-3. 터치 타깃 44px (High → 해소)

```css
.footer a { display: inline-flex; min-height: 44px; align-items: center; ... }
.footer .logo { min-height: 44px; }
.home-nav a { display: inline-flex; min-height: 44px; align-items: center; ... }
.home-footer-admin { display: inline-flex; min-height: 44px; align-items: center; ... }
```
글자 크기는 그대로 두고 눌리는 영역만 넓혔다.

### 2-4. 헤딩 위계 (High → 해소)

- `products.html`: `<h2 class="sr-only">제품 목록</h2>` 추가 → `h1 → h2 → h3`
- `product.html`: `<p class="eyebrow">다음 신호</p>` → `<h2 class="eyebrow related-episodes-title">` + 스타일 되돌림 규칙 → `h1 → h2 → h3`

### 2-5. 나머지

- 홈 장식 오버플로: 모바일에서 `.tv-decor-tail`/`.tv-decor-wing-back` 안쪽으로 당김
- `.contact-arrow` 숨김 기준 `719px` → `899px`
- `scripts/components/echo-tv-wall.js` 삭제(어떤 HTML도 로드하지 않음을 grep으로 확인, `home.js` 주석도 "더 이상 쓰이지 않아 제거되었다"고 명시)

---

## 3. 레퍼런스 분석

지정된 세 갈래를 **원본 HTML·JS 번들을 직접 내려받아** 분석했다. 마케팅 문구가 아니라 실제 코드 기준이다.

### 3-1. 무한대 (ANANTA) — 게임 사전예약 페이지

출처: <https://www.anantagame.com/kr/> (원본 HTML + `vendor_8744e3c1.js` 번들 분석)

**실제 스택**
| 항목 | 내용 |
|---|---|
| 프레임워크 | **Vue 2.5 + vue-router 3.0 + vuex 3.0 + element-ui** (`#app` 단일 마운트 SPA) |
| 유틸 | jQuery 1.11 (`jquery(mixNIE).1.11.js`), es6-promise·polyfill |
| 모션 | **GSAP + ScrollTrigger** (번들 내 70회/6회 참조), **Swiper** (467회), Velocity (27회) |
| 로더 | `trueLoad.v2.1.js` — 에셋 로드율 실측 |
| 모니터링 | `lh-bmr-sdk.js` (프론트 성능 모니터링) |
| GPU | `translate3d` 27회 |
| 반응형 | **반응형이 아님** — UA 판별로 `/m/` 별도 사이트로 리다이렉트 |
| 캐싱 | 빌드마다 `vendor_<hash>.css/js` 파일명 해시 |

**핵심 표현 기법 — 프리로더** (가장 가져올 만한 것)
```css
html.is-loading, html.is-loading body { overflow: hidden; background: #181818 }
html.is-loading body { visibility: hidden }          /* 본문을 완전히 가림 */
html.is-loading .loading .logo-white {
  clip-path: inset(0 100% 0 0);                       /* 로고를 좌→우로 와이프 */
}
html.is-loading .loading .percent { ... }             /* % 숫자 카운터 */
```
검은 화면에 로고를 놓고, 실제 에셋 로드율에 맞춰 흰 로고가 좌→우로 채워지며 `%`가 올라간다. **로딩 시간을 숨기지 않고 연출로 전환**하는 방식이다.

**우리에게 적용할 것 / 안 할 것**
- ❌ Vue·GSAP·Swiper 도입 — `AGENTS.md`의 "프레임워크·번들러·npm 빌드 금지" 정책과 정면 충돌. 게다가 §3-3에서 보듯 성능상으로도 우리에겐 불필요하다.
- ❌ PC/모바일 사이트 이원화 — 유지보수 비용이 2배, 우리 규모에 맞지 않는다.
- ✅ **프리로더 기법** — `clip-path` + 바닐라 JS `Image.onload` 카운팅으로 **라이브러리 없이 재현 가능**. 홈 TV 월은 CSS 그라데이션·SVG가 많아 첫 페인트가 무거우므로 효과가 크다. (미수정 — §4 제안)
- ✅ 파일명 해시 캐시 버스팅 개념 — 우리는 이미 `style.css?v=...` 쿼리로 유사하게 하고 있다.

### 3-2. 서브컬처 패션 브랜드 — 실제 스택

| 브랜드 | 스택 | 모션 라이브러리 | HTML 크기 |
|---|---|---|---|
| Hysteric Glamour (<https://www.hystericglamour.jp/>) | **WordPress + jQuery 3.7** | **없음** (GSAP·Swiper·React 전무) | 98KB |
| NEIGHBORHOOD (<https://www.neighborhood.jp/>) | **Shopify + jQuery 3.7**, FontPlus 웹폰트 | **없음** | 333KB |

**결정적 발견: 실제 서브컬처 패션 브랜드는 스크롤 스펙터클에 투자하지 않는다.** 둘 다 GSAP이 아예 없고, 커스텀 JS는 `common.js`/`home.js` 수준이다. 투자처가 다르다 — **사진, 타이포그래피, 여백, 웹폰트**(NEIGHBORHOOD는 일본어 커스텀 폰트에 유료 FontPlus를 쓴다).

게임 마케팅 사이트(Ananta)와 **정반대 전략**이다. 게임은 "세계관 체험"을 팔아야 하니 모션에 투자하고, 패션은 "옷"을 팔아야 하니 사진과 여백에 투자한다.

### 3-3. 2026 웹 애니메이션 기준

출처: <https://www.pravinkumar.co/blog/webflow-css-scroll-triggered-animations-chrome-145-craft-2026>, <https://mintec.co/blog/scroll-driven-view-transitions-css-2026/>, <https://artofstyleframe.com/blog/web-animation-css-vs-gsap-2026/>

- CSS `animation-timeline`은 **컴포지터 스레드에서 실행돼 INP를 실측 개선**한다. 전역 지원 약 85%(Chromium 115+, Safari 18+, Firefox 진행 중).
- 장식용 애니메이션의 **약 70%는 이제 CSS만으로 가능**하다.
- 단 **CSS 스펙은 pinning(핀 고정)을 의도적으로 제외**했다. 핀·콜백·역재생·인덱스 스태거가 필요하면 그때가 GSAP 영역이다.
- 애니메이션은 `transform`/`opacity`만 — 나머지는 레이아웃 재계산으로 스터터를 유발한다.

**우리 현황 평가**: about.html이 이미 `animation-timeline: view()`를 쓰고 `@supports` + IntersectionObserver 폴백까지 갖췄다. **2026 기준에 이미 부합하며 GSAP 도입 이유가 없다.** 우리가 쓰는 효과(blur·opacity·transform 전환)는 전부 CSS 스펙 범위 안이다.

### 3-4. 전략 결론

> **ECHO ARCHIVE는 패션 브랜드의 문법(절제·사진·여백·타이포)을 기본으로 삼고, 게임 사이트의 "채널/신호" 연출을 액센트로만 써야 한다.**

근거: (a) 실제 서브컬처 패션 브랜드가 모션을 절제한다, (b) 우리 정책이 프레임워크를 금지한다, (c) CSS만으로 필요한 표현이 이미 가능하다. 모션을 늘리는 방향이 아니라, **사진 품질과 타이포 위계를 높이는 방향**에 투자하는 것이 레퍼런스가 실제로 가리키는 길이다.

이미 이 방향의 판단이 누적돼 있다 — products 룩북 전환(사진 크게), contact 텍스트 걷어내기(절제), 금색 테두리 제거(팔레트 일관성). 잘 가고 있다.

---

## 4. 수정하지 않고 제안으로 남기는 항목

디자인 취향이 갈리거나 범위가 커서 사용자 판단이 필요한 것들이다.

### 우선순위 높음

1. **`products.json`의 "치킨" 더미 데이터 정리** — 관리자 CMS(`/admin`) 작업. 보호 파일이라 코드로 못 고친다. **브랜드 신뢰도에 가장 직접적인 영향.**
2. **제품 카드 호버 시 2번째 이미지로 교체** — 패션 이커머스의 사실상 표준 패턴(착용컷↔디테일컷). `products.json`에 이미 `images[]` 배열이 있어 데이터는 준비돼 있다. CSS만으로 구현 가능:
   ```css
   .card-img img + img { position: absolute; inset: 0; opacity: 0; transition: opacity .35s }
   .card:hover .card-img img + img { opacity: 1 }
   ```
   터치 기기에는 호버가 없으므로 모바일에서는 첫 이미지만 보이게 두면 된다.

### 우선순위 중간

3. **프리로더 도입** (Ananta 기법 번역) — `clip-path` 로고 와이프 + 실제 이미지 로드율 카운터. 홈 TV 월이 무거워 첫 진입 인상을 좌우한다. 다만 **첫 페인트를 의도적으로 늦추는 결정**이라 사용자 판단 필요. 라이브러리 없이 바닐라로 구현 가능.
4. **홈 TV 월 접근성 구조** — TV 4개를 `<nav>` 또는 `<ul>`로 감싸 스크린리더 탐색 가능하게.
5. **홈 모바일 푸터 아래 빈 공간** 정리.

### 우선순위 낮음 (기술 부채)

6. **미디어쿼리 브레이크포인트 난립** — 현재 1180 / 1100 / 980 / 900 / 899 / 768 / 720 / 719 / 599px가 혼재한다. 3~4개로 정리하면 반응형 동작을 예측하기 쉬워진다. 다만 각 값에 개별 사유(nav 폭, TV 캔버스 비율 등)가 있어 신중히 접근해야 한다.
7. **죽은 디자인 토큰 제거** — `:root`의 구 다크 테마(`--studio`, `--charcoal`, `--cream`, `--cream-deep`, `--ink`, `--paper`, `--surface`, `--signal`, `--line-dark`, `--line-light`, `--bg`)는 소비처가 없다.
8. **About 진행 인디케이터 터치 타깃** 20px → 44px.
9. **CSS 특이성 충돌 패턴** — `.section h2`(0,1,1)가 페이지별 단일 클래스(0,1,0)를 이기는 문제가 이미 두 번 발생했다(contact `Channel Info` 중앙 정렬, product `다음 신호`). 페이지별 override는 `.section h2.클래스명` 형태로 쓰는 것을 규칙화할 것.

---

## 5. 우선순위 로드맵

| 단계 | 항목 | 담당 |
|---|---|---|
| **즉시** | ~~명암비 토큰~~, ~~홈 모바일 nav~~, ~~터치 타깃~~, ~~헤딩 위계~~ | ✅ 이번 PR |
| **1순위** | "치킨" 더미 데이터 삭제 | 사용자 (CMS) |
| **2순위** | 카드 호버 2번째 이미지 | 코드 |
| **3순위** | 프리로더 도입 여부 결정 | 사용자 판단 → 코드 |
| **4순위** | 홈 TV 접근성 구조, 푸터 빈 공간 | 코드 |
| **상시** | 브레이크포인트·죽은 토큰 정리 | 리팩터링 |

---

## 6. 향후 검증 시 주의사항

**`animation-timeline: view()`는 프로그래매틱 스크롤에서 갱신되지 않는다.**

`page.screenshot({ fullPage: true })`나 `window.scrollTo()`로 캡처하면 스크롤 구동 애니메이션이 초기 상태(흐림·투명)로 찍히고, 요소 위치도 실제와 다르게 측정된다. about.html에서 실제로 1835px 오버플로 + 전체 블러로 보여 버그로 오판할 뻔했다.

**올바른 검증 방법**:
```js
await page.mouse.move(720, 450);
for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120); }
```
실제 휠 이벤트를 발생시킨 뒤 `getComputedStyle`로 확인할 것.

---

## 7. 검증 기록

- `node --test tests/*.test.mjs` → **38개 전부 통과**
- 6개 페이지 × 390/768/1440px 재감사 → **명암비 실패 0건** (수정 전 페이지당 2~7건)
- 헤딩 위계: products `h1→h2→h3×4`, product `h1→h2→h3×2` 확인
- 홈 nav: 4개 링크 전부 44px, 모바일 ABOUT 클릭 → `about.html` 이동 확인
- about.html 실제 휠 스크롤: `scrollWidth 1440`(오버플로 없음), 전 장면 `opacity 1 / filter none`
- `prefers-reduced-motion: reduce`: 전 장면 `opacity 1 / filter none` — 모션 정지 확인
- 콘솔 에러 / 네트워크 4xx: 6개 페이지 전부 0건
- 보호 파일 무변경 확인
