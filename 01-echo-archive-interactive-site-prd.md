# ECHO ARCHIVE 인터랙티브 멀티페이지 사이트 PRD

> 문서 상태: Rev.2 — 관리자 이미지 연동 요구 반영 / 구현 전 검토본  
> 대상 저장소: `마을 살리기/eco-archive-gpu/`  
> 구현 방식: 순수 HTML/CSS/JavaScript ES Modules + Web Components  
> 배포 대상: `https://eco-archive-gpu.progen-web.workers.dev`  
> 기준 문서: `CLAUDE.md`, `00-echo-archive-brand-brief.md`, `eco-archive-gpu/AGENTS.md`, `eco-archive-gpu/README.md`

### Rev.2 변경 요약

- GPU팀 공개 홈의 TV 이미지를 정적 캠페인 파일이 아니라 **관리자에서 저장한 제품 대표 이미지**와 연결한다.
- 관리자가 이미지 수정·교체·순서 변경 후 저장하면 홈 TV도 같은 `products.json`의 `images[0]`을 사용한다.
- 대기 상태에서는 네 TV 모두 제품 정지 사진만 유지하고 자동 슬라이드·자동 전환·가짜 영상 재생을 하지 않는다.
- TV 선택 모션을 레트로 신호 탐색 → 화면 흡입 → 프레임 고정 → 단발 점멸 → 제품 상세 이동의 단계로 구체화한다.
- 관리자 인증 정보는 PRD, 공개 코드, 정적 에셋, 클라이언트 저장소 어디에도 기록하지 않는다.

---

## 1. 제품 정의

ECHO ARCHIVE 웹사이트를 단순 제품 카탈로그가 아니라, 방문자가 현실에서 브랜드의 아카이브 세계로 진입해 시즌별 신호를 탐색하는 인터랙티브 패션 전시로 재구축한다.

이번 시즌의 핵심은 **음(陰)과 양(陽)의 조화**이며, 네 개의 출시 제품을 두 쌍의 대립·공명 구조로 표현한다.

- CAT_404 ↔ DOG_404: 검정과 흰색, 음과 양, 고양이와 강아지
- DEVIL_666 ↔ ANGEL_777: 악마와 천사, 어둠과 빛
- 브랜드 문장: **Every Identity Echoes**
- 브랜드 관점: 서브컬처를 복제하지 않고 기억·감정·상징을 패션으로 재해석한다.

### 핵심 사용자

- 10~20대 여성 중심
- 애니메이션, 음악, 게임 등 서브컬처 취향 보유
- 자신의 정체성과 취향을 패션으로 표현하고 싶어 함
- 일반 쇼핑몰보다 탐색·발견·세계관 경험에 반응함

### 핵심 가치

1. 첫 화면에서 브랜드의 세계관을 즉시 인식한다.
2. 네 개의 대형 TV에서 관리자에 등록된 출시 제품의 최신 대표 이미지를 발견한다.
3. TV를 선택하면 화면 속으로 빨려 들어가는 듯한 전환 후 실제 제품 상세페이지로 이동한다.
4. 시각 효과가 강해도 모바일, 키보드, 저사양 환경에서 제품 접근이 막히지 않는다.
5. 브랜드 담당자가 관리자에서 대표 이미지를 수정하면 공개 홈을 다시 코딩하지 않아도 TV 화면이 갱신된다.

---

## 2. 정책과 구현 경계

### 반드시 유지할 정책

- React, Vue, 빌드 도구, 패키지 매니저를 추가하지 않는다.
- 공개 사이트는 순수 HTML/CSS/JS만 사용한다.
- 모바일 우선으로 작성하고 `@media (min-width: 720px)`에서 확장한다.
- 기존 5페이지 구조를 유지한다: 홈, 브랜드 소개, 제품, 포트폴리오, 문의.
- 결제·장바구니 기능을 만들지 않는다. 가격은 `문의`로 표현한다.
- `products.json`과 `portfolio.json`의 데이터 구조를 변경하지 않는다.
- 제품 공개 여부, 제품 상세 내용, 포트폴리오 내용은 기존 관리자 흐름을 사용한다.
- 외부 구매 링크가 없으면 구매 버튼을 만들지 않는다.
- 공통 헤더·푸터 내용은 모든 공개 페이지에서 동일하게 유지한다.
- ZZZ의 로고, 캐릭터, 아이콘, 고유 폰트, 화면 그래픽을 복제하지 않는다. 여러 화면, 신호 선택, 비대칭 구성, 레트로 방송 질감이라는 추상 원리만 재해석한다.

### 수정 금지 파일

다음 파일은 구현 과정에서 수정·이동·삭제하지 않는다.

```text
.github/**
AGENTS.md
STUDENT_GUIDE.md
RULES.md
.assetsignore
wrangler.jsonc
wrangler.admin.jsonc
worker.js
products.json
portfolio.json
admin-config.json
brand-config.js
admin.html
admin.css
admin.js
catalog.js
portfolio.js
```

### 수정 허용 범위

```text
index.html
about.html
products.html
product.html
portfolio.html
contact.html
style.css
script.js
rich-content.css
images/** 신규 파일
scripts/** 신규 파일
```

`product.html`과 `products.html`에서는 기존 `ProductCatalog` 보안 함수를 계속 사용한다. 안전한 URL 검사나 리치 텍스트 정제를 중복 구현하거나 우회하지 않는다.

---

## 3. 제공 자료와 에셋 매핑

### 안정적인 원본 위치

임시 클립보드 경로가 아니라 현재 폴더에 있는 다음 파일을 원본으로 사용한다.

| 용도 | 원본 | 저장소 내 복사 대상 |
|---|---|---|
| 브랜드 로고 | `ECHO_ARCHIVE_LOGO.png` | `eco-archive-gpu/images/brand/echo-archive-logo.png` |
| CAT_404 초기 등록·fallback 원본 | `assets/001 — CAT_404.png` | `eco-archive-gpu/images/capsule/cat-404.png` |
| DOG_404 초기 등록·fallback 원본 | `assets/002 — DOG_404.png` | `eco-archive-gpu/images/capsule/dog-404.png` |
| DEVIL_666 초기 등록·fallback 원본 | `assets/003 — DEVIL_666.png` | `eco-archive-gpu/images/capsule/devil-666.png` |
| ANGEL_777 초기 등록·fallback 원본 | `assets/004 — ANGEL_777.png` | `eco-archive-gpu/images/capsule/angel-777.png` |

제공된 네 이미지는 관리자에 출시품을 처음 등록할 때 쓰는 원본이자 네트워크/미등록 상태의 시각 fallback이다. 정상 운영 상태에서 TV 화면의 단일 진실 공급원은 `products.json`에 저장된 각 제품의 `images[0]`이다. 제품 이미지는 세로형 패션 도식 또는 브랜드가 나중에 교체한 사진일 수 있으므로 기본값은 `object-fit: contain`으로 하며, 관리자 이미지의 신체나 의상 디테일을 임의로 자르지 않는다.

### 영상 준비 전 원칙

- 현재는 동영상 파일을 생성하거나 가짜 AI 영상을 사용하지 않는다.
- 대기 중에는 관리자에 등록된 네 제품의 대표 사진을 각 TV에 정지 상태로 표시한다.
- 대기 중 제품 사진 자동 교체, 자동 carousel, 자동 확대, 자동 페이지 이동을 하지 않는다.
- 제품 이미지 위의 미세한 CRT 광량 변화, 신호 노이즈, 스캔라인은 허용하되 제품 실루엣이 계속 움직이는 것처럼 보이는 패닝은 사용하지 않는다.
- 향후 외주 영상이 전달되면 구성 데이터에 `videoWebm`, `videoMp4`, `poster`를 추가할 수 있는 자리를 준비하되, 현재는 빈 영상 URL을 요청하지 않는다.
- 외주 영상의 권장 속성은 `muted`, `loop`, `playsinline`, `preload="metadata"`다. 소리는 사용자 동의 없이 재생하지 않는다.

---

## 4. 정보 구조

### 4.1 홈 — `index.html`

홈은 하나의 긴 랜딩 페이지가 아니라 다음 장면이 이어지는 진입 경험으로 구성한다.

1. **Reality Gate**
   - Soft White 배경에 실제 로고가 얇게 나타난다.
   - `Every Identity Echoes`와 `ENTER THE ARCHIVE`가 표시된다.
   - 첫 방문 시 짧은 신호 감지 연출 후 TV Wall로 이어진다.
   - 재방문과 `prefers-reduced-motion` 환경에서는 긴 연출을 생략한다.

2. **Capsule 01 — Yin / Yang TV Wall**
   - 네 개의 커다랗고 서로 다른 레트로 TV를 비대칭으로 배치한다.
   - 검정 계열 CAT/DEVIL과 흰색 계열 DOG/ANGEL이 화면 안에서 균형을 이룬다.
   - 중앙 카피: `CAPSULE 01`, `陰 / 陽`, `Every Identity Echoes`.
   - TV마다 제품명, 신호 번호, Yin/Yang 분류와 관리자 대표 이미지 `images[0]`을 표시한다.
   - 사용자가 클릭하지 않고 대기하면 네 TV의 제품 사진은 그대로 유지된다.

3. **제품 선택 전환**
   - TV 선택 시 선택된 CRT의 전원이 강해지고 주변 신호가 약해진다.
   - 선택 TV 화면을 기준으로 카메라가 빠르게 가까워지며 뷰포트 중앙으로 흡입된다.
   - 주변 TV와 페이지 UI는 원근감 있게 밀려나고 어두워진다.
   - 화면이 뷰포트를 채우면 스캔라인과 잡음이 순간 정지해 마지막 제품 프레임이 고정된다.
   - 짧은 단발 흑백 점멸과 신호 절단 후 같은 제품의 `product.html?id=...`로 이동한다.
   - 이 모션은 ZZZ Signal Search의 속도감과 레트로 방송 문법만 참고하며 고유 그래픽·문구·뽑기 결과 연출은 복제하지 않는다.

4. **Brand Manifesto**
   - “서브컬처의 영감을 복제하지 않고 새로운 기억으로 기록한다”는 메시지를 짧게 보여준다.
   - 브랜드 소개 페이지로 연결한다.

5. **Three Values**
   - 서브컬처 재해석 / 하나의 세계관 / 소량 제작을 표시한다.

### 4.2 브랜드 소개 — `about.html`

- 예시 문구 `BRAND`, `브랜드 이름`, `○○○`을 모두 제거한다.
- 실제 브랜드 스토리와 한 줄 소개를 사용한다.
- 키워드는 `SUBCULTURE`, `REINTERPRETATION`, `CAPSULE`, `IDENTITY`, `ECHO`로 구성한다.
- 사람·공간 사진이 없으므로 가짜 인물 사진을 만들지 않는다.
- 대신 CAT/DOG, DEVIL/ANGEL의 대칭 도식과 타이포그래피를 활용한 `DUALITY INDEX` 섹션으로 대체한다.

### 4.3 제품 목록 — `products.html`

- 데이터 원본은 계속 `ProductCatalog.loadVisibleProducts()`다.
- 제품 카드의 구조와 스타일만 시즌 아카이브 방식으로 바꾼다.
- 제품 ID, 이름, 공개 여부, 이미지, 상세 본문을 HTML에 직접 하드코딩하지 않는다.
- 공개 제품이 없거나 출시품 4종이 아직 관리자에 등록되지 않은 경우 명확한 준비 상태를 표시한다.
- 기존 데이터에 다른 샘플 제품이 있더라도 코드에서 임의 삭제·변조하지 않는다.

### 4.4 제품 상세 — `product.html?id=...`

- 기존 쿼리 파라미터와 `ProductCatalog` 로딩 알고리즘을 유지한다.
- 이미지 캐러셀, 키워드, 가격 문의, 상세 리치 텍스트를 시즌 전시 스타일로 재디자인한다.
- 안전한 링크 검사와 `sanitizeRichText()` 호출을 유지한다.
- 홈에서 넘어왔을 때 첫 화면이 동일한 TV 화면의 연장처럼 느껴지도록 CRT 잔상 인트로를 1회 표시할 수 있다.

### 4.5 포트폴리오 — `portfolio.html`

- `#portfolioContent`와 `portfolio.js` 연결을 유지한다.
- 포트폴리오 내용이 없으면 `TRANSMISSION PENDING`이라는 브랜드형 빈 상태를 보여준다.
- 관리자에서 내용이 저장되면 `rich-content.css`에 의해 자동으로 동일한 세계관으로 표현된다.

### 4.6 문의 — `contact.html`

- Instagram: `echo_archive`
- 이메일: `echo_archive@gmail.com`
- 운영 시간: 평일 10:00–18:00
- 지도는 표시하지 않는다.
- 결제나 주문 폼을 만들지 않는다.

### 4.7 공통 페이지 셸 계약

모든 공개 페이지는 아래 구성요소와 조건을 공통으로 만족해야 한다.

| 구성요소 | 필수 내용 | 조건 |
|---|---|---|
| 건너뛰기 링크 | `본문으로 건너뛰기` | 키보드 포커스 시 보이고 각 페이지의 `<main>` 또는 주 콘텐츠 ID로 이동 |
| 헤더 | 실제 로고, 홈·브랜드 소개·제품·포트폴리오·문의 링크, 모바일 메뉴 버튼 | 모든 페이지에서 링크 순서와 문구 동일, 현재 페이지에 `aria-current="page"`, 로고는 홈 링크 |
| 모바일 내비게이션 | 열기/닫기 버튼과 메뉴 | `aria-expanded`, `aria-controls` 동기화, Escape로 닫기, 메뉴가 닫혀 있을 때 숨은 링크로 포커스 이동 금지 |
| 페이지 본문 | 페이지별 고유 `<main id="mainContent">` | 문서당 `<main>` 하나, 제목 계층은 `h1 → h2 → h3` 순서 유지 |
| 푸터 | ECHO ARCHIVE 로고 또는 워드마크, `ECHO ARCHIVE / 방려명`, Instagram, 이메일, 저작권 | 미제공 사업자번호·주소를 만들지 않으며 모든 페이지에서 동일 |
| 전환 레이어 | 홈 TV 선택 시 사용하는 전체 화면 overlay | 기본적으로 숨김, 포커스 차단 금지, 전환 종료 또는 `pageshow`에서 완전히 초기화 |
| 메타데이터 | 고유 `<title>`, 실제 설명, viewport, favicon | `브랜드 이름` 같은 예시 문구 금지, 페이지 목적에 맞는 description |
| 오류 복구 | 깨진 이미지·데이터 실패 상태 | 핵심 링크와 텍스트는 남아야 하며 콘솔 오류만 표시하고 빈 화면으로 만들지 않음 |

공통 헤더와 푸터는 JavaScript가 실행되지 않아도 보여야 한다. Web Component로 통째로 대체하지 말고 정적 HTML을 유지하며, `script.js`는 내비게이션 같은 공통 동작만 점진적으로 향상한다.

### 4.8 페이지별 구성요소·조건 계약

#### A. 홈 — `index.html`

필수 구성요소:

1. 공통 헤더
2. `Reality Gate` 진입 섹션
   - 실제 로고 이미지
   - `Every Identity Echoes`
   - `당신의 취향을 하나의 세계로`
   - `ENTER THE ARCHIVE` 진입 링크 또는 버튼
3. `Capsule 01 — 陰 / 陽` 소개
   - 시즌명과 짧은 안내
   - TV 탐색 방법을 설명하는 접근 가능한 문장
4. `<echo-tv-wall>`
   - CAT_404, DOG_404, DEVIL_666, ANGEL_777 TV 네 개
   - 제품명, `YIN`/`YANG`, 신호 번호, 관리자 대표 이미지, 링크 상태
   - 현재 선택 위치와 모바일 페이지 수 표시
5. 브랜드 선언문
6. 세 가지 강점
7. 브랜드 소개·전체 제품으로 이동하는 보조 CTA
8. 공통 푸터
9. `<signal-transition>`

필수 조건:

- 홈의 네 fallback 이미지는 캠페인 초기 자산일 뿐 운영 제품 데이터의 대체 저장소가 아니다.
- TV의 정상 이미지와 실제 상세 링크는 모두 한 번의 `ProductCatalog.loadVisibleProducts()` 결과에서 가져온다.
- 출시품 이름을 정규화해 CAT_404, DOG_404, DEVIL_666, ANGEL_777 순서로 슬롯에 연결한다.
- 각 TV 화면은 연결된 제품의 `images[0]`을 사용한다. 관리자가 이미지 순서를 바꾸면 새 첫 이미지가 TV 대표 화면이 된다.
- 제품을 찾지 못하면 `ARCHIVE SYNCING`을 표시하고 `products.html`로 이동한다.
- 제품은 찾았지만 이미지가 없으면 제품명·YIN/YANG이 있는 CSS 신호 화면을 표시하고 상세 링크는 유지한다.
- 첫 진입 연출은 콘텐츠 접근을 1.5초 이상 막지 않는다.
- 이미 같은 세션에서 진입 연출을 본 경우 반복하지 않거나 축소한다.
- TV 링크는 JavaScript 없이도 `products.html`로 이동할 수 있어야 한다.
- 데스크톱은 비대칭 TV Wall, 모바일은 snap carousel 또는 세로 목록이어야 한다.
- TV 선택 전환 도중에도 새 탭 열기와 보조키 클릭을 방해하지 않는다.
- 장식용 CRT 노이즈는 `aria-hidden="true"`이며 스크린리더에 중복 낭독되지 않는다.

#### B. 브랜드 소개 — `about.html`

필수 구성요소:

1. 공통 헤더
2. 페이지 헤드: `ECHO ARCHIVE`와 한 줄 소개
3. 브랜드 스토리
4. 브랜드 키워드 목록
5. 브랜드 철학: 복제가 아닌 재해석, Capsule 세계관, 정체성의 공명
6. `DUALITY INDEX`
   - CAT_404 ↔ DOG_404
   - DEVIL_666 ↔ ANGEL_777
   - 각 쌍의 YIN/YANG 관계를 텍스트와 제품 도식으로 설명
7. 세 가지 브랜드 강점
8. 제품 전시로 이동하는 CTA
9. 공통 푸터

필수 조건:

- 스토리와 강점은 브랜드 브리프 원문 의미를 바꾸지 않는다.
- 사람·공간 사진이 없으므로 가짜 대표자·작업실·제작 현장 사진을 추가하지 않는다.
- 제품 이미지는 서사를 설명하는 자료로만 사용하고 제품 상세 데이터는 `products.json`에서 읽는다.
- 키워드는 단순 장식 `<span>` 묶음이어도 읽는 순서가 자연스러워야 한다.
- 음과 양을 선악의 우열로 표현하지 않고 공존·균형 관계로 설명한다.

#### C. 제품 목록 — `products.html`

필수 구성요소:

1. 공통 헤더
2. 페이지 헤드: `CAPSULE ARCHIVE`와 제품 탐색 안내
3. 로딩 상태
4. 공개 제품 grid/list 컨테이너
5. 제품 카드
   - 대표 이미지
   - label 또는 category
   - 제품명
   - 짧은 설명
   - 가격이 있으면 가격, 없으면 불필요한 빈 자리 없음
   - 실제 `product.html?id=` 링크
6. 공개 제품 없음 상태
7. 데이터 오류 및 재시도 상태
8. 공통 푸터

필수 조건:

- 데이터는 반드시 `ProductCatalog.loadVisibleProducts()`로 읽는다.
- `published === false` 제품을 표시하지 않는다.
- 렌더링 전 텍스트는 `ProductCatalog.escapeHtml()`, 이미지는 `safeImageUrl()`을 사용한다.
- 제품명·ID·설명·가격·운영 이미지를 HTML이나 새 JS 배열에 복제하지 않는다.
- 현재 샘플 제품을 코드로 숨기거나 출시품으로 위장하지 않는다.
- 이미지가 없어도 제품명과 상세 링크가 남는다.
- 빈 상태와 오류 상태를 구분한다.

#### D. 제품 상세 — `product.html?id=...`

필수 구성요소:

1. 공통 헤더
2. 상세 로딩 상태
3. 제품 hero
   - 대표·갤러리 이미지 carousel
   - label/category, 제품명, 요약, 가격, 키워드
   - 조건부 구매/문의 CTA
4. 상세 리치 콘텐츠 영역
5. 이미지 이전·다음·dot 컨트롤
6. 구매 안내 dialog가 필요한 경우 기존 dialog
7. 제품 없음 또는 잘못된 ID 상태
8. 제품 목록으로 돌아가기 링크
9. 공통 푸터

필수 조건:

- `new URLSearchParams(location.search).get("id")` 방식과 공개 제품 검색을 유지한다.
- 상세 제품도 `loadVisibleProducts()` 결과에서만 찾는다.
- 제품 이미지는 `safeImageUrl()`, 텍스트는 `escapeHtml()`, 리치 본문은 `sanitizeRichText()`를 거친다.
- `buyLink`가 안전한 HTTP(S)일 때만 외부 링크 CTA를 표시한다.
- 구매 링크가 없고 `buyNotice`가 있을 때만 안내 dialog 버튼을 표시한다.
- 구매 링크와 안내가 모두 없으면 CTA를 표시하지 않는다.
- carousel은 버튼, 방향키, touch swipe를 지원하고 현재 slide의 `aria-hidden` 상태를 갱신한다.
- 잘못된 ID와 비공개 제품은 동일한 안전한 “제품을 찾을 수 없음” 상태로 처리한다.
- 홈에서 진입했는지와 무관하게 상세 URL 직접 접속이 정상 동작해야 한다.

#### E. 포트폴리오 — `portfolio.html`

필수 구성요소:

1. 공통 헤더
2. 페이지 헤드: `ARCHIVE TRANSMISSION`
3. 로딩 상태
4. 기존 `<article id="portfolioContent" class="portfolio-content">`
5. 빈 상태: `TRANSMISSION PENDING`
6. 오류 상태
7. 공통 푸터

필수 조건:

- `#portfolioContent` ID와 `portfolio-content` class를 유지한다.
- `catalog.js → portfolio.js → script.js`의 기능 의존성이 깨지지 않게 한다.
- `portfolio.js`를 수정하지 않는다.
- 관리자에서 작성한 제목·문단·목록·인용·표·이미지·갤러리·영상이 모바일에서도 넘치지 않아야 한다.
- 빈 상태는 포트폴리오가 없다는 사실을 숨기지 않으며 가짜 프로젝트를 생성하지 않는다.
- 리치 콘텐츠 내부 iframe과 video는 반응형 컨테이너 안에 표시한다.

#### F. 문의 — `contact.html`

필수 구성요소:

1. 공통 헤더
2. 페이지 헤드: `CONTACT / OPEN CHANNEL`
3. Instagram 링크
4. 이메일 `mailto:` 링크
5. 운영 시간
6. 문의 전 안내 문장
7. 공통 푸터

필수 조건:

- Instagram 표시는 `@echo_archive`로 하고 실제 프로필 HTTPS 링크를 사용한다.
- 이메일은 `echo_archive@gmail.com`과 일치해야 한다.
- 운영 시간은 `평일 10:00–18:00`으로 표시한다.
- 연락처 전화번호, 주소, 지도, 주문·결제 폼을 임의로 추가하지 않는다.
- 문의 수집 서버가 없으므로 작동하지 않는 폼을 만들지 않는다.
- 외부 링크는 새 탭을 사용할 경우 `rel="noopener noreferrer"`를 지정한다.

### 4.9 페이지 상태 최소 세트

| 페이지 | Loading | Empty | Error | Success |
|---|---:|---:|---:|---:|
| 홈 TV Wall | 제품 링크 확인 중 | 4종 미등록 상태 | 카탈로그 로딩 실패 | 상세 링크 연결된 TV Wall |
| 브랜드 소개 | 불필요 | 미제공 사람·공간 대체 구성 | 이미지 fallback | 실제 스토리와 DUALITY INDEX |
| 제품 목록 | 필수 | 필수 | 필수 | 공개 제품 카드 |
| 제품 상세 | 필수 | 잘못된/비공개 ID | 데이터 로딩 실패 | 제품 hero와 상세 본문 |
| 포트폴리오 | 필수 | 필수 | 필수 | 정제된 리치 콘텐츠 |
| 문의 | 불필요 | 불필요 | 외부 링크 기본 fallback | 연락 채널 표시 |

---

## 5. 비주얼 시스템

### 디자인 토큰

모든 핵심 색상은 `style.css` 최상단 `:root`에만 정의한다.

```css
:root {
  --bg: #fafafa;
  --ink: #121212;
  --surface: #efefec;
  --line: rgba(18, 18, 18, 0.2);
  --signal: #e5ff32;
  --echo-violet: #765cff;
}
```

- Soft White와 Black이 전체 면적의 대부분을 차지한다.
- `--signal`은 TV 전원, 포커스, 작은 상태등에만 사용한다.
- `--echo-violet`은 화면 잔상이나 링크 포커스에 제한적으로 사용한다.
- 제품 도식의 흑백 대비를 방해하는 컬러 오버레이를 과도하게 사용하지 않는다.

### 타이포그래피

- 로고는 제공된 이미지가 유일한 워드마크다.
- 영문 레이블은 응축된 시스템 산세리프 계열과 넓은 자간을 사용한다.
- 한글 본문은 `system-ui`, `Apple SD Gothic Neo`, `Noto Sans KR`, sans-serif 순으로 구성한다.
- 외부 폰트 CDN은 필수로 만들지 않는다.

### TV 표현

- TV 케이스는 CSS로 제작한다. 타사 게임의 화면 프레임을 이미지로 캡처해 사용하지 않는다.
- 서로 다른 모서리 반경, 노브, 스피커 구멍, 안테나 실루엣으로 네 개의 개성을 만든다.
- 화면 효과는 pseudo-element의 scanline, radial-gradient, low-opacity noise를 이용한다.
- 모든 TV는 실제 `<a>` 링크를 기반으로 하여 JavaScript가 실패해도 이동 가능해야 한다.

---

## 6. 컴포넌트와 파일 설계

```text
eco-archive-gpu/
├─ images/
│  ├─ brand/echo-archive-logo.png
│  └─ capsule/
│     ├─ cat-404.png
│     ├─ dog-404.png
│     ├─ devil-666.png
│     └─ angel-777.png
├─ scripts/
│  ├─ capsule-data.js
│  ├─ home.js
│  ├─ motion.js
│  └─ components/
│     ├─ echo-tv-wall.js
│     └─ signal-transition.js
├─ index.html
├─ about.html
├─ products.html
├─ product.html
├─ portfolio.html
├─ contact.html
├─ style.css
├─ rich-content.css
└─ script.js
```

### `capsule-data.js`

홈 TV의 순서·신호 코드·YIN/YANG 관계와 로컬 fallback만 담는다. 운영 제품 이미지나 상세 데이터를 저장하지 않으며 `products.json`을 대체하지 않는다.

필드 예시:

```js
{
  code: "SIGNAL-001",
  productName: "CAT_404",
  polarity: "YIN",
  fallbackImage: "images/capsule/cat-404.png",
  fallbackHref: "products.html"
}
```

런타임에서 `ProductCatalog.loadVisibleProducts()`를 **한 번만 호출**해 공개 제품을 불러온다. `trim → 대문자화 → 공백을 underscore로 통일`한 제품명이 `productName`과 일치하면 다음 값을 모두 같은 제품 객체에서 가져온다.

```text
TV 이미지 = ProductCatalog.safeImageUrl(product.images?.[0])
TV 제품명 = product.name
상세 링크 = product.html?id=encodeURIComponent(product.id)
```

제품이 관리자에 아직 등록되지 않았다면 `fallbackImage`를 표시하되 `ARCHIVE SYNCING` 상태를 함께 표시하고 `fallbackHref`로 이동한다. 운영 제품이 연결된 뒤에는 fallback 이미지가 관리자 이미지를 덮어쓰면 안 된다.

### Web Components 원칙

- `<echo-tv-wall>`: 제품 로딩, 네 TV 렌더링, 포커스 이동을 조정한다.
- `<signal-transition>`: 선택한 TV의 확대·고정·점멸·페이지 이동을 담당한다.
- Shadow DOM은 사용하지 않는다. 기존 `style.css`와 접근성 검증을 그대로 활용하는 Light DOM 방식으로 구현한다.
- 헤더와 푸터는 JavaScript 실패 시에도 보이도록 현재의 정적 HTML을 유지하되, 내용과 구조를 모든 페이지에 동일하게 반영한다.

---

## 7. TV 선택 전환 알고리즘

### 참고 범위

ZZZ의 캐릭터 Signal Search/가챠 UI에서 참고하는 것은 다음 네 가지 추상 원리뿐이다.

- 여러 개의 레트로 화면 중 하나를 고르는 선택성
- 선택 순간 주변 정보가 약해지고 목표 화면이 강해지는 초점 이동
- 짧고 빠른 신호 전환과 강한 프레임 고정
- 다음 장면으로 빨려 들어가는 전진감

게임의 캐릭터, 로고, 티켓, 확률, 버튼 문구, 결과 등급, 음원, 고유 애니메이션 프레임은 사용하지 않는다. 이 사이트의 모션은 “가챠 결과 공개”가 아니라 “아카이브 채널 진입”으로 설계한다.

### 상태

```text
BOOT → IDLE → FOCUSED → ZOOMING → LOCKED → FLASH → NAVIGATING
```

### 대기 상태 규칙

```text
IDLE = 4대 TV 모두 켜짐 + 각 제품 대표 사진 1장 고정 + 약한 CRT 질감만 활성
```

- 사용자가 아무것도 하지 않으면 제품 사진을 교체하지 않는다.
- 임의의 TV를 자동 선택하거나 자동 확대하지 않는다.
- hover가 없는 모바일에서도 네 제품이 즉시 식별되어야 한다.
- 영상 placeholder, 로딩 spinner, 무의미한 테스트 패턴이 제품 사진을 가리지 않는다.
- 정지 화면 위 scanline은 낮은 투명도로 유지하고 제품 윤곽과 텍스트 대비를 해치지 않는다.

### 처리 순서와 타이밍

1. 사용자가 TV 링크를 클릭하거나 키보드로 Enter를 누른다.
2. 일반 좌클릭이고 보조키가 없을 때만 전환 효과를 가로챈다. 새 탭 열기, 우클릭, 브라우저 기본 동작은 유지한다.
3. `0~120ms`: 중복 실행을 막고 문서에 `aria-busy="true"`를 설정한다. 선택 TV의 전원등과 테두리를 강화한다.
4. 선택한 TV의 `getBoundingClientRect()`를 읽는다.
5. 선택 TV의 현재 관리자 제품 이미지와 동일한 화면 복제본을 fixed overlay에 생성한다.
6. 뷰포트 중앙까지의 이동량과 화면을 덮는 배율을 계산한다.

```text
scale = max(viewportWidth / tvWidth, viewportHeight / tvHeight) × 1.08
translateX = viewportCenterX - tvCenterX
translateY = viewportCenterY - tvCenterY
```

7. `120~760ms`: 다음 animation frame에서 transform을 적용한다. 주변 TV는 반대 방향으로 약하게 밀리고 선택 화면은 중앙으로 빠르게 전진한다.
8. `760~900ms`: 화면 가장자리에 radial distortion과 짧은 chromatic echo를 적용해 흡입감을 만든다. Canvas/WebGL 없이 CSS transform, filter, pseudo-element만 사용한다.
9. `900~1040ms`: 화면이 뷰포트를 채우면 제품 프레임을 고정하고 scanline과 잡음의 움직임을 멈춘다.
10. `1040~1160ms`: 흑백 또는 signal 색을 한 번만 점멸한다.
11. 늦어도 `1200ms` 안에 원래 링크의 `href`로 이동한다.
12. `pagehide`, `pageshow`에서 overlay, `aria-busy`, body class를 정리해 뒤로가기를 망가뜨리지 않는다.

### 접근성 대체

- `prefers-reduced-motion: reduce`에서는 확대·흡입·왜곡 없이 100ms 이하의 단순 fade 후 이동한다.
- JavaScript가 실패하면 원래 `<a href>`가 즉시 작동한다.
- 포커스 표시를 제거하지 않는다.
- 화면 흔들림, 빠른 반복 점멸, 지속적인 글리치 효과를 사용하지 않는다.
- 점멸은 광과민성 위험을 피하도록 짧고 단발성으로 제한한다.

---

## 8. 반응형·성능 요구사항

### 모바일 360~390px

- 네 TV를 한 화면에 억지로 축소하지 않는다.
- 가로 snap carousel 또는 세로 채널 목록으로 한 TV씩 탐색한다.
- 현재 TV 번호와 전체 개수를 표시한다.
- 터치 영역은 최소 44×44px로 한다.
- 가로 스크롤은 TV carousel 내부에서만 발생하며 문서 전체는 넘치지 않는다.

### 데스크톱 720px 이상

- 네 TV를 비대칭 wall로 배치한다.
- 키보드 방향키로 인접 TV를 탐색할 수 있게 한다.
- fine pointer 환경에서만 미세한 커서 echo 효과를 허용한다.

### 성능

- 현재는 영상이 없으므로 `products.json`에 연결된 대표 이미지와 미등록 fallback PNG만 로드한다.
- 네 TV가 첫 핵심 화면에 함께 보이므로 첫 번째 두 이미지는 eager, 나머지는 lazy 또는 낮은 우선순위로 로드한다.
- 애니메이션은 주로 `transform`과 `opacity`를 사용한다.
- scroll 이벤트를 프레임마다 직접 처리하지 않는다.
- `requestAnimationFrame`, `IntersectionObserver`, `matchMedia`를 활용한다.
- 저사양 환경에서도 제품 링크와 본문은 항상 접근 가능해야 한다.

---

## 9. 운영 관리자 이미지 연동 계약

### 관리자와 공개 GPU 사이트의 책임 분리

- 관리자 주소는 `https://eco-archive-admin.progen-web.workers.dev/admin`이다.
- 브랜드 담당자는 관리자에서 제품 등록·공개·이미지 업로드·이미지 편집·이미지 순서 변경을 수행한다.
- 공개 GPU 사이트는 관리자 로그인이나 비밀번호를 알지 못하며 관리자 API에 인증을 시도하지 않는다.
- 공개 GPU 사이트는 기존 `ProductCatalog.loadVisibleProducts()`를 통해 공개 제품만 읽는다.
- 로그인 비밀번호, 세션 쿠키, GitHub 토큰을 PRD·소스코드·클라이언트 저장소·분석 이벤트에 넣지 않는다.

### 이미지 변경 전파 알고리즘

```text
브랜드 담당자가 관리자에서 제품 이미지 수정·교체
→ 편집된 이미지가 새 고유 경로로 GitHub 저장소에 업로드
→ 제품의 images 배열에서 새 경로와 순서 저장
→ products.json이 GPU·아우라 저장소 main에 동기화
→ Cloudflare 자동 배포 시작
→ GPU 홈이 no-store 조건으로 공개 제품 다시 로드
→ 네 제품 중 연결된 product.images[0]을 각 TV에 표시
```

관리자에서 첫 이미지는 대표 이미지다. 따라서 이미지 수정 기능으로 첫 이미지를 교체하거나 이미지 순서를 변경하고 최종 저장하면 TV 화면도 새 `images[0]`을 사용해야 한다. 홈페이지 전용 이미지 경로를 별도로 고정하거나 기존 이미지를 CSS background에 하드코딩하면 안 된다.

정상 반영 예상은 기존 운영 정책과 동일하게 저장·자동 배포 후 보통 1~2분이다. 배포 전 또는 네트워크 장애 동안에는 마지막 정상 이미지나 로컬 fallback을 유지하며 깨진 화면을 보여주지 않는다.

### GPU팀 선택

- 공개 링크와 제품 상세 이동 대상은 GPU 사이트인 `https://eco-archive-gpu.progen-web.workers.dev`다.
- 대표 관리자가 두 팀 저장소를 동기화하더라도 이 PRD의 UI 구현 대상은 `eco-archive-gpu` 저장소다.
- 홈 TV 링크는 상대 URL `product.html?id=...`을 사용해 현재 GPU origin 안에서 이동한다.

### 출시 데이터 등록 의존성

현재 `products.json`에는 출시품 4종이 아니라 기존 샘플 제품 3종이 들어 있다. 정책상 코드 작업자가 이 파일을 직접 교체하면 안 된다.

따라서 최종 공개 전에 브랜드 담당자가 기존 `/admin`에서 다음 작업을 수행해야 한다.

1. 기존 샘플 제품의 공개를 끈다.
2. 다음 네 제품을 이름 그대로 등록한다.
3. 해당 제품 이미지를 각각 업로드한다.
4. 가격은 `문의`로 입력한다.
5. 구매 링크는 비워 둔다.
6. 상세 설명을 입력하고 `사이트 공개`를 켠다.

| 제품명 | 분류 | 설명 |
|---|---|---|
| CAT_404 | YIN | 고양이가 연상되는 음(陰) 원피스·케이프 |
| DOG_404 | YANG | 강아지가 연상되는 양(陽) 원피스·케이프 |
| DEVIL_666 | YIN | 악마가 연상되는 음(陰) 원피스·크롭 자켓 |
| ANGEL_777 | YANG | 천사가 연상되는 양(陽) 원피스·크롭 자켓 |

이 등록이 완료되면 홈의 TV 컴포넌트가 제품명을 기준으로 실제 제품 ID와 최신 `images[0]`을 찾아 상세페이지 링크와 TV 화면을 동시에 연결한다. 등록 전에도 fallback 이미지로 네 TV의 형태는 확인할 수 있어야 하지만, 관리자 이미지 연동과 제품별 상세 이동은 완료 조건으로 간주하지 않는다.

---

## 10. 오류·빈 상태

- 제품 JSON 로딩 실패: `SIGNAL LOST — 제품 기록을 불러오지 못했습니다.`와 제품 목록 재시도 링크 표시
- 제품 미등록: 해당 TV에 `ARCHIVE SYNCING` 표시, 제품 목록으로 이동
- 관리자 이미지 반영 대기: 마지막 정상 이미지 또는 해당 제품의 로컬 fallback 유지
- 등록 제품에 이미지 없음: 제품명·YIN/YANG·신호 번호가 보이는 CSS 화면 표시, 상세 링크 유지
- 이미지 로딩 실패: 제품명과 polarity가 있는 CSS 화면으로 대체
- 포트폴리오 비어 있음: `TRANSMISSION PENDING`
- JavaScript 비활성: 정적 헤더·본문·제품 목록 링크가 읽을 수 있는 순서로 남아 있어야 함

---

## 11. 분석 이벤트 인터페이스

현재 분석 도구는 추가하지 않는다. 추후 연결할 수 있도록 다음 이름의 `CustomEvent`만 `window`에 발생시킨다. 개인 식별 정보는 포함하지 않는다.

```text
echo:tv-focus   { productName, polarity }
echo:tv-select  { productName, destination }
echo:transition-complete { productName }
```

분석 서비스나 외부 스크립트를 임의로 설치하지 않는다.

---

## 12. 완료 조건

### 디자인·콘텐츠

- 모든 공개 페이지에서 `BRAND`, `브랜드 이름`, `○○○` 예시 문구가 제거된다.
- 실제 ECHO ARCHIVE 로고가 헤더와 주요 진입 화면에 사용된다.
- 브랜드 브리프의 실제 소개, 스토리, 강점, 연락처가 반영된다.
- 홈에 네 개 출시품 이미지가 모두 보인다.
- 정상 운영 상태의 네 TV 이미지는 관리자 제품 데이터의 각 `images[0]`에서 온다.
- 음/양 및 CAT/DOG, DEVIL/ANGEL의 쌍 구조가 시각적으로 이해된다.
- 타사 게임의 보호 자산이나 화면 캡처가 포함되지 않는다.

### 기능

- TV를 클릭하면 확대 → 고정 → 단발 점멸 → 링크 이동이 수행된다.
- 클릭하지 않고 대기하면 네 TV는 각 제품의 정지 대표 사진만 계속 표시한다.
- 관리자에서 대표 이미지 수정·교체·순서 변경 후 저장하면 배포 완료 뒤 TV 화면이 같은 이미지로 갱신된다.
- 키보드 Enter로도 동일하게 동작한다.
- 새 탭 열기와 보조키 클릭을 방해하지 않는다.
- 출시 제품이 관리자에 등록된 경우 정확한 `product.html?id=`로 이동한다.
- 미등록·네트워크 실패·이미지 실패 상태에서도 사이트가 깨지지 않는다.
- 제품·포트폴리오 관리자 저장과 공개 렌더링 기능이 회귀하지 않는다.

### 모바일·접근성

- 360px, 390px, 720px, 1024px, 1440px에서 가로 문서 스크롤이 없다.
- 모든 인터랙션에 키보드 포커스가 보인다.
- 의미 있는 이미지에 대체 텍스트가 있다.
- `prefers-reduced-motion`에서 줌과 글리치가 축소된다.
- 대비와 터치 목표 크기가 확보된다.

### 기술·정책

- 보호 파일 변경이 0개다.
- 프레임워크, 번들러, npm 의존성이 추가되지 않는다.
- 브라우저 콘솔 오류가 없다.
- HTML 링크와 로컬 이미지 경로가 유효하다.
- JSON과 JavaScript 문법 검사를 통과한다.
- 로컬 정적 서버에서 전체 페이지를 확인한다.
- 사용자가 명시적으로 `배포해`라고 하기 전에는 commit, push, PR, 배포를 수행하지 않는다.

---

## 13. 구현 단계

### Phase 1 — 기반과 실제 브랜드 적용

- 에셋을 안정적인 ASCII 경로로 복사
- 디자인 토큰 설정
- 모든 페이지 로고·헤더·푸터·메타데이터 통일
- 소개·문의 실제 콘텐츠 적용

### Phase 2 — 홈 TV 경험

- 캡슐 전시 데이터 모듈
- `<echo-tv-wall>` 구현
- 공개 제품 4종과 관리자 `images[0]` 연결
- 정지 사진 대기 상태와 미등록 fallback 구현
- 선택 TV 줌·고정·점멸 전환 구현
- 모바일 carousel과 reduced-motion 대체 구현

### Phase 3 — 제품·포트폴리오 UI 통합

- 기존 제품 로더를 유지한 목록·상세 UI 재디자인
- 포트폴리오 rich content 스타일 정리
- 오류·빈 상태 적용

### Phase 4 — 검증

- 보호 파일 diff 검사
- 문법·링크·이미지 검사
- 데스크톱·모바일 브라우저 검증
- 키보드·reduced-motion·뒤로가기 검증

---

## 14. 비목표

- 실제 뽑기·확률·재화 시스템
- 장바구니, 주문, 결제
- 로그인 사용자별 개인화
- ZZZ 화면 또는 캐릭터 복제
- 운영 관리자 재개발
- 제품 JSON 수동 수정
- 외주 영상이 오기 전 임의 영상 생성
- WebGL 또는 무거운 3D 엔진 도입
