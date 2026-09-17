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

test("이미지 위 TV 링크마다 화면을 보지 않아도 알 수 있는 이름이 있다", () => {
  for (const role of ["portfolio", "bgm", "yang", "about", "yin"]) {
    assert.match(extractTag(indexHtml, role), /aria-label="[^"]+"/);
  }
});

test("화면 안에 금지된 가시 텍스트 문구가 없다", () => {
  // 큰 홍보 문구는 제거하고, 선택한 TV의 간단한 기능 안내만 허용합니다.
  const stageMatch = indexHtml.match(/<div class="tv-wall archive-hotspots"[\s\S]*?<\/div>/);
  assert.ok(stageMatch, "TV 클릭 영역을 찾을 수 없다");
  const stageHtml = stageMatch[0];
  const forbidden = ["TOUCH THE", "SCREEN!", "2026 F/W", "BGM OFF", "YANG LOOK", "ABOUT ECHO", "YIN LOOK", "SIGNAL-00"];
  for (const phrase of forbidden) {
    assert.ok(!stageHtml.includes(phrase), `"${phrase}" 문구가 화면 마크업에 남아있으면 안 된다`);
  }
});

test("화면 내부 메타 텍스트 클래스가 없다", () => {
  assert.ok(!/class="tv-name"/.test(indexHtml), "tv-name 클래스가 남아있으면 안 된다");
  assert.ok(!/class="tv-screen-meta"/.test(indexHtml), "tv-screen-meta 클래스가 남아있으면 안 된다");
});

test("장식 요소는 접근성 트리와 포인터 입력에서 제외된다", () => {
  const decorTags = indexHtml.match(/<span class="archive-screen"[^>]*>/g) || [];
  assert.equal(decorTags.length, 5, "화면 효과는 5개 TV에만 붙습니다");
  for (const tag of decorTags) {
    assert.match(tag, /aria-hidden="true"/, "장식 요소는 aria-hidden=true여야 한다: " + tag);
  }
  const cssPath = path.join(repoRoot, "home.css");
  const css = fs.readFileSync(cssPath, "utf8");
  assert.match(css, /\.archive-screen\s*\{[^}]*pointer-events:\s*none/s, "빛 효과가 TV 클릭을 가로채면 안 됩니다");
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

test("BGM: 25초에 도달하면 무음 구간 전에 반복한다", () => {
  assert.equal(homeLogic.shouldRestartBgm(24.99, 25), false);
  assert.equal(homeLogic.shouldRestartBgm(25, 25), true);
  assert.equal(homeLogic.shouldRestartBgm(25.2, 25), true);
});

test("BGM: 홈에 승인된 로컬 음원이 연결되어 있다", () => {
  assert.match(indexHtml, /<audio\b[^>]*id="bgmAudio"[^>]*src="audio\/velvet-shoreline\.mp3"/s);
  assert.equal(fs.existsSync(path.join(repoRoot, "audio", "velvet-shoreline.mp3")), true);
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
