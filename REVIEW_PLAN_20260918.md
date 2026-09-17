# 코드리뷰 · UI/UX 점검 · 배포 전 수정 계획

작성일 2026-09-18 · 검사 범위: 공개 6개 페이지, `scripts/**`, CSS 8종, 배포 설정
검사 방법: 코드 정독 + 헤드리스 Chrome(CDP) 실측 + 테스트 36개 (현재 전부 통과)

---

## 0. 요약 — 배포 전 반드시 처리할 것

| # | 항목 | 심각도 | 근거 |
|---|---|---|---|
| 1 | 내부 문서·PDF가 공개 배포됨 | **치명** | `CLAUDE.md` 등 HTTP 200 확인 |
| 2 | 모바일 홈 히어로 5.2MB PNG | **높음** | 3G 13초, 메모리 24MB |
| 3 | BGM 음원 731KB 강제 다운로드 | **높음** | `preload="none"`을 JS가 덮어씀 |
| 4 | YANG/YIN 필터 무동작 + 안내 없음 | **높음** | 세 URL 결과 동일(4개) 실측 |
| 5 | `products.json`이 보호 파일인데 변경됨 | **높음** | CI가 PR 거부 |
| 6 | 워프 중 키보드 잠김, Escape 없음 | 중간 | 최대 1.9초 입력 차단 |
| 7 | 미사용 자산 88.7MB / 레거시 스크립트 | 중간 | 배포 용량 136MB |

---

## 1. 배포 유의점 (가장 시급)

### 1-1. 내부 문서가 공개 웹에 노출됨 ⚠️ 치명

`.assetsignore`가 일부 파일만 제외해, 나머지가 **그대로 공개 배포**됩니다. 로컬 서버에서 HTTP 200으로 확인했습니다:

```
CLAUDE.md                                200   ← 내부 아키텍처 문서
SITE_AUDIT_REPORT.md                     200
01-echo-archive-interactive-site-prd.md  200   ← 기획서
```

추가로 노출되는 파일:
- `프로젠_학생가이드.pdf` (10.5MB), `학생용_팀_웹사이트_협업_가이드.pdf` (1.5MB)
- `1차 미팅 ppt(에코아카이브_방려명).pdf` (10.1MB) — **클라이언트 미팅 자료**
- `1차 미팅 정리.md`, `클라이언트 요청 기반 웹사이트 제작 방안.md`
- `ABOUT_REDESIGN_SPEC.md`, `CLAUDE_CODE_Y2K_TDD_PLAN.md`, `TV_에셋_제작_프롬프트.md`

**수정**: `.assetsignore`에 아래를 추가합니다. `.assetsignore`는 보호 파일 목록에 없어 수정 가능합니다.

```
*.md
*.pdf
*.txt
tests/**
scripts/**/*.test.*
detail-page-demo.png
TV.png
```

> ⚠️ `*.md` 전체 제외 시 공개 페이지가 md를 참조하지 않는지 먼저 확인 (현재 참조 없음 확인 완료).

### 1-2. `products.json` 보호 파일 충돌

CI(`validate_site.py`)의 `PROTECTED_FILES`에 `products.json`이 있는데, 09-17 23:40에 변경되었습니다. 관리자가 정상 편집한 운영 데이터지만 **PR에 포함되면 `validate-site`가 거부**합니다.

**수정**: 커밋에서 `products.json`을 제외합니다 (관리자 워커가 별도 커밋으로 반영). 스테이징 전 `git status`로 반드시 확인하세요.

### 1-3. 배포 용량 136MB / 미사용 이미지 88.7MB

`images/` 104MB 중 **88.7MB가 어디에서도 참조되지 않습니다**. 상위:

| 용량 | 파일 |
|---|---|
| 3.15MB | `images/portfolio/capsule-01/echo-archive-2026-fw-portfolio-1x5-v2.png` |
| 2.48MB | `images/products/capsule-01/cat-404/03-feature-details.png` |
| 2.33MB | `images/products/capsule-01/devil-666/03-feature-details.png` |

**주의**: `images/products/**`, `images/portfolio/**`는 관리자가 업로드하고 워커가 GitHub에서 실시간 프록시하는 **운영 데이터**입니다. 정적 참조가 없다고 삭제하면 안 됩니다. 삭제 대상은 아래 확실한 것만:

- `images/home/echo-desktop.png` (1.7MB), `echo-desktop-clean-v2.png` (1.4MB), `echo-mobile.png` (2.0MB) — home.css/index.html 어디서도 참조 없음
- 단, `echo-desktop.png`는 **테스트가 SHA-256을 고정**하므로 삭제하려면 `tests/home-assets.test.mjs`도 함께 수정해야 합니다. **이번 범위에서는 보류 권장.**

---

## 2. 성능 (UX에 직결)

### 2-1. 모바일 히어로 이미지 5.2MB ⚠️

실측 결과:

```
heroSrc : echo-mobile-hd-v4.png
natural : 2048x3072   (실제 표시: 390x585)
```

- **5.2배 과잉 해상도**, 디코딩 메모리 24MB
- 4G 3.3초 / 3G 13.0초 — LCP 직격
- 데스크톱도 `echo-desktop-hd-v4.png` 6.6MB (4344×1448)
- 페이지 총량 실측: **모바일 7.14MB / 데스크톱 7.32MB**

**수정 (우선순위 순)**:

1. **WebP 변환 + `<source type>` 추가** — 통상 70~85% 절감, 약 1.1MB 예상
2. **해상도 단계화** — `srcset`으로 1024w(모바일) / 2048w(레티나) 분리
3. `fetchpriority="high"`는 이미 적용됨 (유지)

```html
<picture class="archive-artwork">
  <source media="(min-width: 720px)" type="image/webp"
          srcset="images/home/echo-desktop-hd-v4.webp" width="4344" height="1448" />
  <source media="(min-width: 720px)" srcset="images/home/echo-desktop-hd-v4.png" ... />
  <source type="image/webp"
          srcset="images/home/echo-mobile-1024.webp 1024w, images/home/echo-mobile-hd-v4.webp 2048w"
          sizes="100vw" />
  <img src="images/home/echo-mobile-hd-v4.png" ... />
</picture>
```

> 이미지 변환 도구(ImageMagick/sharp/PIL)가 이 환경에 없습니다. PowerShell + .NET `System.Drawing`으로 리사이즈는 가능하나 **WebP 인코딩은 불가**합니다. WebP는 별도 도구나 온라인 변환이 필요하며, 우선 **PNG 리사이즈(1024w)만으로도 약 60% 절감**이 가능합니다.

### 2-2. BGM 음원 731KB 강제 다운로드 🐛

`index.html:87`은 `preload="none"`인데 [scripts/home.js:120](scripts/home.js#L120)이 `audio.preload = "auto"`로 **덮어씁니다**. 실측에서 음악을 켜지 않아도 731KB가 내려옵니다.

**수정**: `home.js`에서 `preload = "auto"` 줄을 제거하고, 첫 클릭 시점에만 로드하도록 변경.

```js
// 변경 전
audio.preload = "auto";

// 변경 후 — HTML의 preload="none"을 존중하고, 켤 때 로드합니다.
// (첫 재생이 약간 늦어지지만 방문자 전원의 731KB를 아낍니다)
```

클릭 핸들러의 `audio.play()` 직전에 `if (audio.preload === "none") audio.load();` 추가.

---

## 3. 기능 버그

### 3-1. YANG/YIN 필터가 동작하지 않고 안내도 없음 🐛

브라우저 실측:

```
(필터없음)        4개  ["Yin","Yang","Yin","Yang"]
?polarity=YANG   4개  ["Yin","Yang","Yin","Yang"]   ← 동일
?polarity=YIN    4개  ["Yin","Yang","Yin","Yang"]   ← 동일
```

원인: `capsule-data.js`는 `CAT_404`/`DOG_404`/`DEVIL_666`/`ANGEL_777`로 매칭하는데, 실제 `products.json`의 이름은 `Yin`/`Yang`입니다. 이름이 하나도 안 맞아 `filterProductsByPolarity`가 전체 목록으로 폴백합니다.

더 큰 문제: CLAUDE.md는 "`#polarityBanner`가 폴백을 알린다"고 하지만 **배너가 products.html에서 제거되어** 실측상 `null`입니다. 홈에서 YANG TV를 눌러도 YIN 상품이 그대로 보이고, 아무 설명이 없습니다.

**수정 (택1)**:

- **(A) 권장 — 실제 극성으로 필터**: 제품명이 이미 `Yin`/`Yang`이므로 `capsule-data.js` 매핑 대신 제품명을 직접 비교. 코드가 단순해지고 관리자가 이름만 맞추면 동작.
- **(B) 매핑 갱신**: `capsule-data.js`의 `productName`을 현재 제품명에 맞춤. 단, 관리자가 이름을 바꾸면 다시 깨짐.
- **(C) 최소 조치**: 폴백 시 안내 문구 복구 ("전체 상품을 표시합니다").

어느 쪽이든 `tests/subpage-contract.test.mjs`의 극성 테스트를 함께 확인해야 합니다.

### 3-2. 워프 전환 중 키보드 잠김, 탈출 불가 ♿

[tv-warp.js:333-338](scripts/components/tv-warp.js#L333-L338)이 `Tab`/`Enter`/`Space`/방향키를 **캡처 단계에서 전면 차단**합니다. 그런데:

- `Escape` 취소 경로가 **없음** (`grep Escape` → 0건)
- 강제 `finish()`까지 `720×2+450 = 1890ms`
- 통신 실패 시 복구 타임아웃 **12초**

키보드·스크린리더 사용자가 최대 12초간 아무것도 못 합니다.

**수정**:
```js
document.addEventListener("keydown", event => {
  if (!active) return;
  // 사용자가 언제든 전환을 취소하고 페이지로 돌아올 수 있게 합니다.
  if (event.key === "Escape") { reset(); return; }
  if ([...].includes(event.key)) { ... }
}, true);
```
추가로 `TIME_SCALE = 2`를 1로 되돌려 1.9초 → 1.2초로 단축 검토 (연출 의도 확인 필요).

---

## 4. 코드 품질

### 4-1. 레거시 파일 정리

| 파일 | 상태 |
|---|---|
| `scripts/components/signal-transition.js` | **어느 HTML도 참조 안 함** (tv-warp.js로 대체됨) |
| `scripts/components/echo-tv-wall.js` | 이전 확인 시 미참조 (CLAUDE.md도 명시) |

**수정**: 두 파일 삭제. 단 CI가 모든 `.js`에 `node --check`를 돌리므로 삭제해도 무해합니다.

### 4-2. `transition-entry.js` 누락 페이지

`product.html`, `contact.html`에 도착 덮개 스크립트가 없습니다. 현재 홈 TV는 이 두 페이지로 직접 링크하지 않아 **잠재 이슈**지만, 나중에 링크가 추가되면 흰 화면 깜빡임이 발생합니다.

**수정**: 두 페이지에도 `transition-entry.js`를 추가하거나, 링크 추가 시 함께 넣도록 주석 명시.

### 4-3. 문서와 코드 불일치

`CLAUDE.md`가 현재 상태와 어긋납니다 (이번 리뷰에서 확인):
- "`BGM_SRC = null`" → 실제로는 `"audio/velvet-shoreline.mp3"`
- "홈은 CSS/SVG로 TV를 그린다" → 실제로는 이미지 기반 + 핫스팟
- "`#polarityBanner`가 폴백을 알린다" → 배너 제거됨

**수정**: `CLAUDE.md`의 홈 섹션·BGM 설명 갱신.

---

## 5. UI / 접근성

### 5-1. 실측 결과 (양호)

| 항목 | 모바일 | 데스크톱 |
|---|---|---|
| 가로 스크롤 | 없음 ✓ | 없음 ✓ |
| `alt` 누락 이미지 | 0개 ✓ | 0개 ✓ |
| 콘솔 오류 | 없음 ✓ | 없음 ✓ |
| 44px 미만 탭 타깃 | 0~1개 ✓ | 7~8개 |

### 5-2. 데스크톱 터치 타깃 (경미)

데스크톱에서 nav 링크가 37px, 푸터 링크가 16px입니다. 포인터 정밀도가 높은 데스크톱이라 우선순위는 낮지만, WCAG 2.5.8(최소 24px)은 푸터 링크(16px)가 미달입니다.

**수정**: 푸터 링크에 `padding-block: 6px` 정도만 추가해 24px 이상 확보.

---

## 6. 작업 순서 (권장)

**1단계 — 배포 차단 요소 (반드시)**
1. `.assetsignore` 확장 → 문서·PDF 비공개 (§1-1)
2. `products.json` 커밋 제외 확인 (§1-2)

**2단계 — 체감 성능**
3. BGM `preload` 수정 → 731KB 절감 (§2-2, 가장 쉬움)
4. 히어로 이미지 리사이즈/WebP (§2-1, 가장 효과 큼)

**3단계 — 기능·접근성**
5. YANG/YIN 필터 수정 또는 안내 복구 (§3-1)
6. 워프 Escape 탈출 추가 (§3-2)

**4단계 — 정리**
7. 레거시 스크립트 삭제 (§4-1)
8. `CLAUDE.md` 갱신 (§4-3)
9. 푸터 링크 패딩 (§5-2)

---

## 7. 검증 방법

```bash
node --test tests/*.test.mjs          # 36개 유지되어야 함
node --check <수정한 js>
```

브라우저 확인 (로컬 서버 http://127.0.0.1:4174 가동 중):
- **모바일 390×844**: 홈 총 전송량이 7.1MB에서 줄었는지 (DevTools Network)
- 음악을 켜지 않았을 때 `velvet-shoreline.mp3` 요청이 **없는지**
- `products.html?polarity=YANG`이 YANG만 보이거나, 최소한 안내 문구가 뜨는지
- 워프 중 `Escape`로 취소되는지
- **데스크톱 1440×900**: 기존과 시각적으로 동일한지 (회귀 확인)

배포 전 최종:
```bash
curl -I https://<배포주소>/CLAUDE.md     # 404여야 함
```

---

## 8. 범위에서 제외한 것

- `worker.js`, `catalog.js`, `admin.js`, `portfolio.js` — **CI 보호 파일**. 수정 시 `validate-site`가 PR을 거부합니다. 이전 리뷰에서 발견한 `admin.js`의 `safeEditorImageUrl` 검증 불일치도 같은 이유로 손대지 않았습니다(escape 처리로 악용은 불가, 운영진 승인 필요).
- `images/products/**`, `images/portfolio/**` — 관리자 업로드 운영 데이터. 정적 참조가 없어도 삭제 금지.
- `echo-desktop.png` 삭제 — 테스트가 SHA-256을 고정하고 있어 테스트 동반 수정 필요. 이번 범위 제외 권장.
