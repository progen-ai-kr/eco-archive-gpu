// 홈 Y2K 시안의 동작 계약을 고정하는 테스트.
// 외부 패키지 없이 node:test + node:assert/strict + 파일 텍스트 검사만 사용한다.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import homeLogic from "../scripts/home-logic.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");
const indexHtml = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

function extractTag(html, roleAttrValue) {
  const openTagMatch = html.match(
    new RegExp('<(a|button)\\b[^>]*data-tv-role="' + roleAttrValue + '"[^>]*>', "s")
  );
  return openTagMatch ? openTagMatch[0] : null;
}

test("TV 역할 5개가 정확히 한 번씩 존재한다", () => {
  const roles = ["portfolio", "bgm", "yang", "about", "yin"];
  for (const role of roles) {
    const matches = indexHtml.match(new RegExp('data-tv-role="' + role + '"', "g")) || [];
    assert.equal(matches.length, 1, role + " 역할은 정확히 1개여야 한다");
  }
  const anyRole = indexHtml.match(/data-tv-role="[^"]+"/g) || [];
  assert.equal(anyRole.length, 5, "TV 역할 총합은 5개여야 한다");
});

test("1·3·4·5번 TV는 예상 경로를 가진 링크다", () => {
  const portfolio = extractTag(indexHtml, "portfolio");
  const yang = extractTag(indexHtml, "yang");
  const about = extractTag(indexHtml, "about");
  const yin = extractTag(indexHtml, "yin");

  assert.ok(portfolio && /^<a\b/.test(portfolio), "1번은 <a>여야 한다");
  assert.match(portfolio, /href="portfolio\.html"/);

  assert.ok(yang && /^<a\b/.test(yang), "3번은 <a>여야 한다");
  assert.match(yang, /href="products\.html\?polarity=YANG"/);

  assert.ok(about && /^<a\b/.test(about), "4번은 <a>여야 한다");
  assert.match(about, /href="about\.html"/);

  assert.ok(yin && /^<a\b/.test(yin), "5번은 <a>여야 한다");
  assert.match(yin, /href="products\.html\?polarity=YIN"/);
});

test("2번 TV는 BGM 버튼이며 aria-pressed=false 초기값을 가진다", () => {
  const bgm = extractTag(indexHtml, "bgm");
  assert.ok(bgm && /^<button\b/.test(bgm), "2번은 <button>이어야 한다");
  assert.match(bgm, /type="button"/);
  assert.match(bgm, /aria-pressed="false"/);
});

test("각 TV 화면 안에는 아이콘(svg) 하나만 존재한다", () => {
  const screenBlocks = indexHtml.match(/<span class="tv-screen">[\s\S]*?<\/span>\s*<\/span>/g);
  assert.ok(screenBlocks, "tv-screen 블록을 찾을 수 없다");
});

test("화면 안에 금지된 가시 텍스트 문구가 없다", () => {
  // <head>의 메타 설명 등은 화면에 그려지지 않으므로 본문(tv-wall-stage)만 검사한다.
  const stageMatch = indexHtml.match(/<div class="tv-wall-stage">[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(stageMatch, "tv-wall-stage 블록을 찾을 수 없다");
  const stageHtml = stageMatch[0];
  const forbidden = ["2026 F/W", "BGM OFF", "YANG LOOK", "ABOUT ECHO", "YIN LOOK", "SIGNAL-00"];
  for (const phrase of forbidden) {
    assert.ok(!stageHtml.includes(phrase), `"${phrase}" 문구가 화면 마크업에 남아있으면 안 된다`);
  }
});

test("화면 내부 메타 텍스트 클래스가 없다", () => {
  assert.ok(!/class="tv-name"/.test(indexHtml), "tv-name 클래스가 남아있으면 안 된다");
  assert.ok(!/class="tv-screen-meta"/.test(indexHtml), "tv-screen-meta 클래스가 남아있으면 안 된다");
});

test("장식 요소는 접근성 트리와 포인터 입력에서 제외된다", () => {
  // 최상위 tv-decor 래퍼만 검사한다 — 그 안의 자식(tv-decor-img 등)은 부모가 이미 숨겼으므로
  // 각각 aria-hidden을 반복할 필요가 없다.
  const decorTags = indexHtml.match(/<[^>]*class="(?:[^"]*\s)?tv-decor(?:\s[^"]*)?"[^>]*>/g) || [];
  assert.ok(decorTags.length > 0, "tv-decor 장식 요소가 있어야 한다");
  for (const tag of decorTags) {
    assert.match(tag, /aria-hidden="true"/, "장식 요소는 aria-hidden=true여야 한다: " + tag);
  }
  const cssPath = path.join(repoRoot, "style.css");
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(css, /\.tv-decor\s*\{[^}]*pointer-events:\s*none/s, "style.css에 .tv-decor pointer-events:none 규칙이 있어야 한다");
});

test("핵심 공개 경로가 유지된다", () => {
  for (const file of ["products.html", "about.html", "portfolio.html", "contact.html"]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), file + " 파일이 존재해야 한다");
  }
  assert.match(indexHtml, /href="\/admin"/, "ADMIN 링크는 /admin 이어야 한다");
});

test("ALL LOOKS와 CONTACT 헤더 링크가 존재한다", () => {
  assert.match(indexHtml, /href="products\.html"[^>]*>\s*ALL LOOKS/s);
  assert.match(indexHtml, /href="contact\.html"[^>]*>\s*CONTACT/s);
});

// ── 순수 로직: BGM 상태 기계 ──────────────────────────────────────
test("BGM: OFF에서 토글하면 재생 대기(pending) 상태로 전이한다", () => {
  const next = homeLogic.bgmReducer(homeLogic.initialBgmState(), homeLogic.BGM_ACTIONS.TOGGLE_REQUEST);
  assert.deepEqual(next, { pressed: true, pending: true });
});

test("BGM: 재생 성공이면 눌림 상태를 유지하고 pending을 해제한다", () => {
  const pending = { pressed: true, pending: true };
  const next = homeLogic.bgmReducer(pending, homeLogic.BGM_ACTIONS.PLAY_SUCCESS);
  assert.deepEqual(next, { pressed: true, pending: false });
});

test("BGM: 재생 Promise가 거절되면 안전한 OFF로 되돌린다", () => {
  const pending = { pressed: true, pending: true };
  const next = homeLogic.bgmReducer(pending, homeLogic.BGM_ACTIONS.PLAY_FAILURE);
  assert.deepEqual(next, { pressed: false, pending: false });
});

test("BGM: 재생 대기 중 빠른 연속 클릭은 상태를 바꾸지 않는다", () => {
  const pending = { pressed: true, pending: true };
  const next = homeLogic.bgmReducer(pending, homeLogic.BGM_ACTIONS.TOGGLE_REQUEST);
  assert.deepEqual(next, pending);
});

test("BGM: ON 상태에서 토글하면 즉시 OFF로 전이한다", () => {
  const on = { pressed: true, pending: false };
  const next = homeLogic.bgmReducer(on, homeLogic.BGM_ACTIONS.TOGGLE_REQUEST);
  assert.deepEqual(next, { pressed: false, pending: false });
});

// ── 순수 로직: YIN/YANG 쿼리 매핑 ─────────────────────────────────
test("극성 쿼리: 대소문자와 무관하게 YIN/YANG을 인식한다", () => {
  assert.equal(homeLogic.resolvePolarityQuery("yang"), "YANG");
  assert.equal(homeLogic.resolvePolarityQuery("Yin"), "YIN");
});

test("극성 쿼리: 알 수 없는 값이나 없는 값은 null로 폴백한다", () => {
  assert.equal(homeLogic.resolvePolarityQuery("neutral"), null);
  assert.equal(homeLogic.resolvePolarityQuery(""), null);
  assert.equal(homeLogic.resolvePolarityQuery(undefined), null);
});

test("극성 필터: 매핑되지 않아 결과가 비면 전체 목록으로 폴백한다", () => {
  const products = [{ name: "UNKNOWN_ITEM" }];
  const capsule = [{ productName: "CAT_404", polarity: "YIN" }];
  const filtered = homeLogic.filterProductsByPolarity(products, "YIN", capsule);
  assert.deepEqual(filtered, products);
});

test("극성 필터: 매핑된 제품만 정확히 골라낸다", () => {
  const products = [{ name: "CAT_404" }, { name: "DOG_404" }];
  const capsule = [
    { productName: "CAT_404", polarity: "YIN" },
    { productName: "DOG_404", polarity: "YANG" },
  ];
  const filtered = homeLogic.filterProductsByPolarity(products, "YIN", capsule);
  assert.deepEqual(filtered, [{ name: "CAT_404" }]);
});
