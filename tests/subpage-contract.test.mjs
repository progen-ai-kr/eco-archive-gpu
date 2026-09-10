// 서브페이지 5종(About/Products/Product/Portfolio/Contact)의 "SIGNAL SHEET" 공통 계약을 고정한다.
// 채널 헤드(신호 코드)·nav 채널 번호·h1 단일성·product.html DOM 속성 계약이 리디자인 중
// 드리프트되지 않도록 지키는 회귀 테스트다.
// 외부 패키지 없이 node:test + node:assert/strict + 파일 텍스트 검사만 사용한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");

function readPage(name) {
  return fs.readFileSync(path.join(repoRoot, name), "utf8");
}

const NAV_PAGES = ["about.html", "products.html", "product.html", "portfolio.html", "contact.html"];
const CHANNEL_HEAD_PAGES = ["about.html", "products.html", "portfolio.html", "contact.html"];
const NAV_CHANNELS = { "about.html": "01", "products.html": "02", "portfolio.html": "04", "contact.html": "05" };

test("서브페이지 5개 모두 nav에 CH.01/02/04/05 신호 코드가 붙어 있다", () => {
  for (const page of NAV_PAGES) {
    const html = readPage(page);
    for (const [href, ch] of Object.entries(NAV_CHANNELS)) {
      const pattern = new RegExp('<a href="' + href + '" data-ch="' + ch + '"');
      assert.match(html, pattern, page + "에 " + href + " → CH." + ch + " 링크가 있어야 한다");
    }
  }
});

test("정적 채널 헤드가 있는 페이지는 channel-code와 channel-stamp를 가진다", () => {
  for (const page of CHANNEL_HEAD_PAGES) {
    const html = readPage(page);
    assert.match(html, /class="channel-code"/, page + "에 channel-code가 있어야 한다");
    assert.match(html, /class="channel-stamp"/, page + "에 channel-stamp가 있어야 한다");
    assert.match(html, /CH\.0\d/, page + "의 channel-code에 CH.0X 형식 신호 코드가 있어야 한다");
  }
});

test("About/Portfolio/Contact 페이지는 h1이 정확히 1개다 (Products·Product는 카드/제품명이 h3·h1으로 동적 렌더)", () => {
  for (const page of ["about.html", "products.html", "portfolio.html", "contact.html"]) {
    const html = readPage(page);
    const count = (html.match(/<h1[\s>]/g) || []).length;
    assert.equal(count, 1, page + "에는 h1이 정확히 1개 있어야 한다(현재 " + count + "개)");
  }
});

test("product.html은 캐러셀·구매 다이얼로그 DOM 속성 계약 이름을 그대로 유지한다", () => {
  const html = readPage("product.html");
  const requiredTokens = [
    "data-product-carousel",
    "data-carousel-slide",
    "data-carousel-previous",
    "data-carousel-next",
    "data-carousel-index",
    "data-carousel-current",
    'id="purchaseDialog"',
    "data-purchase-dialog",
    "purchase-dialog-close",
  ];
  for (const token of requiredTokens) {
    assert.ok(html.includes(token), "product.html에 " + token + " 계약이 남아있어야 한다");
  }
});

test("product.html은 채널 코드(CH.03 SIG_EPISODE)와 이전/다음 에피소드 카드를 렌더한다", () => {
  const html = readPage("product.html");
  assert.match(html, /CH\.03/, "product.html 렌더 스크립트에 CH.03 채널 코드가 있어야 한다");
  assert.match(html, /related-episodes/, "product.html에 이전/다음 에피소드 섹션이 있어야 한다");
});

test("음양 룰(.yy-rule)은 섹션 구분선으로 존재하고 노드 요소를 가진다", () => {
  for (const page of ["about.html", "products.html", "portfolio.html"]) {
    const html = readPage(page);
    assert.match(html, /class="yy-rule"/, page + "에 yy-rule 구분선이 있어야 한다");
    assert.match(html, /class="yy-rule-node"/, page + "의 yy-rule에 yy-rule-node가 있어야 한다");
  }
});

test("products.html은 카테고리 필터 자리와 EP 배지를 위한 카드 구조를 갖는다", () => {
  const html = readPage("products.html");
  assert.match(html, /id="productFilterRail"/, "필터 레일 컨테이너가 있어야 한다");
  assert.match(html, /id="productFilterChips"/, "필터 칩 컨테이너가 있어야 한다");
  assert.match(html, /card-ep/, "카드에 EP 배지 클래스를 렌더하는 코드가 있어야 한다");
});

test("index.html이 아닌 서브페이지는 style.css의 채널 헤드/음양 룰 클래스를 정의에서 찾을 수 있다", () => {
  const css = fs.readFileSync(path.join(repoRoot, "style.css"), "utf8");
  for (const selector of [".channel-code", ".channel-stamp", ".yy-rule", ".yy-rule-node", ".card-ep", ".filter-chip"]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(css, new RegExp(escaped + "\\s*\\{|" + escaped + "[,:]"), "style.css에 " + selector + " 규칙이 있어야 한다");
  }
});
